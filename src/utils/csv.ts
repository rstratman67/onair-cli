import fs from 'fs';
import path from 'path';

export interface CsvSection {
  name: string;
  rows: Record<string, unknown>[];
}

const sanitizeFilePart = (value: string): string => {
  return value.replace(/[^a-z0-9_-]/gi, '_');
};

const toCellValue = (value: unknown): string => {
  if (value === null || typeof value === 'undefined') {
    return '';
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return `${value}`;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => toCellValue(entry))
      .filter((entry) => entry.length > 0)
      .join(' | ');
  }

  return JSON.stringify(value);
};

// Flatten nested API objects so Excel gets simple dotted-column headers.
const flattenRecord = (value: Record<string, unknown>, prefix = ''): Record<string, string> => {
  const flattened: Record<string, string> = {};

  Object.entries(value).forEach(([key, entry]) => {
    const nextKey = prefix ? `${prefix}.${key}` : key;

    if (
      entry !== null &&
      typeof entry === 'object' &&
      !Array.isArray(entry) &&
      !(entry instanceof Date)
    ) {
      const nested = flattenRecord(entry as Record<string, unknown>, nextKey);

      if (Object.keys(nested).length) {
        Object.assign(flattened, nested);
      } else {
        flattened[nextKey] = '';
      }
    } else {
      flattened[nextKey] = toCellValue(entry);
    }
  });

  return flattened;
};

const escapeCsvCell = (value: string): string => {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
};

const buildCsv = (rows: Record<string, unknown>[]): string => {
  const flattenedRows = rows.map((row) => flattenRecord(row));
  const headers = Array.from(
    flattenedRows.reduce((acc, row) => {
      Object.keys(row).forEach((key) => acc.add(key));
      return acc;
    }, new Set<string>())
  );

  const csvRows = [headers.join(',')];

  flattenedRows.forEach((row) => {
    csvRows.push(headers.map((header) => escapeCsvCell(row[header] || '')).join(','));
  });

  return csvRows.join('\n');
};

const getOutputPath = (basePath: string, sectionName: string, multipleSections: boolean): string => {
  const parsed = path.parse(basePath);
  const ext = parsed.ext || '.csv';
  const baseName = parsed.name || 'export';
  const suffix = multipleSections ? `.${sanitizeFilePart(sectionName)}` : '';

  return path.join(parsed.dir, `${baseName}${suffix}${ext}`);
};

// Commands with multiple logical sections write one CSV per section.
export const writeCsvSections = (basePath: string, sections: CsvSection[]): string[] => {
  const nonEmptySections = sections.filter((section) => section.rows.length > 0);

  if (!nonEmptySections.length) {
    return [];
  }

  return nonEmptySections.map((section) => {
    const outputPath = getOutputPath(basePath, section.name, nonEmptySections.length > 1);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, buildCsv(section.rows), 'utf8');
    return outputPath;
  });
};

// Summary-style commands export neatly as Field/Value rows.
export const keyValueRows = (record: Record<string, unknown>): Record<string, unknown>[] => {
  return Object.entries(flattenRecord(record)).map(([field, value]) => ({
    Field: field,
    Value: value,
  }));
};
