import chalk from 'chalk';
import { People } from 'onair-api';

import { CompanyWorkOrder } from '../api/getCompanyWorkOrders';
import { cliTable } from '../utils/cli-table';

interface WorkOrderDisplayOptions {
  crews?: boolean;
  hideIds?: boolean;
  employeesById?: Record<string, string>;
}

const normalizeId = (value: string): string => {
  return value.trim().toLocaleLowerCase();
};

const formatHeading = (key: string): string => {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const formatValue = (value: unknown): string => {
  if (value === null || typeof value === 'undefined') {
    return '';
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return `${value}`;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => formatValue(entry)).join(', ');
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;

    if (typeof record['DisplayName'] === 'string') {
      return `${record['DisplayName']}`;
    }

    if (typeof record['Name'] === 'string') {
      return `${record['Name']}`;
    }

    if (typeof record['Identifier'] === 'string') {
      return `${record['Identifier']}`;
    }

    if (typeof record['ICAO'] === 'string') {
      return `${record['ICAO']}`;
    }

    if (typeof record['FirstName'] === 'string' || typeof record['LastName'] === 'string') {
      return [record['FirstName'], record['LastName']].filter((part) => typeof part === 'string' && part.length > 0).join(' ');
    }

    if (typeof record['Id'] === 'string') {
      return `${record['Id']}`;
    }

    return JSON.stringify(value);
  }

  return `${value}`;
};

const isIdField = (key: string): boolean => {
  return /(?:^|_|\.)ids?$/i.test(key) || /Id$/i.test(key);
};

const isCrewField = (key: string): boolean => {
  return /crew/i.test(key);
};

const getCrewDisplayValue = (value: unknown, employeesById: Record<string, string>): string[] => {
  if (value === null || typeof value === 'undefined') {
    return [];
  }

  if (Array.isArray(value)) {
    return value.reduce((entries, item) => entries.concat(getCrewDisplayValue(item, employeesById)), [] as string[]);
  }

  if (typeof value === 'string') {
    const normalizedValue = normalizeId(value);
    return [employeesById[normalizedValue] || value];
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return [`${value}`];
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    // Work order crew entries are not consistent, so try the common employee-id keys first.
    const possibleIds = [
      record['Id'],
      record['PeopleId'],
      record['EmployeeId'],
      record['CrewId'],
    ].filter((entry): entry is string => typeof entry === 'string');

    for (const possibleId of possibleIds) {
      const normalizedValue = normalizeId(possibleId);

      if (employeesById[normalizedValue]) {
        return [employeesById[normalizedValue]];
      }
    }

    const formattedValue = formatValue(value);
    return formattedValue ? [formattedValue] : [];
  }

  return [];
};

const getCrewMembers = (workOrder: CompanyWorkOrder, employeesById: Record<string, string>): string[] => {
  return Object.entries(workOrder).reduce((crewMembers, [key, value]) => {
    if (!isCrewField(key)) {
      return crewMembers;
    }

    return crewMembers.concat(getCrewDisplayValue(value, employeesById));
  }, [] as string[]);
};

const getWorkOrderName = (workOrder: CompanyWorkOrder): string => {
  const name = workOrder['Name'] || workOrder['DisplayName'] || workOrder['Description'];
  return formatValue(name);
};

const toCrewRows = (companyWorkOrders: CompanyWorkOrder[], employeesById: Record<string, string>): Record<string, unknown>[] => {
  const maxCrewCount = companyWorkOrders.reduce((maxCount, workOrder) => Math.max(maxCount, getCrewMembers(workOrder, employeesById).length), 0);

  return companyWorkOrders.map((workOrder) => {
    const row: Record<string, unknown> = { Name: getWorkOrderName(workOrder) };
    const crewMembers = getCrewMembers(workOrder, employeesById);

    for (let index = 0; index < maxCrewCount; index += 1) {
      row[`Crew ${index + 1}`] = crewMembers[index] || '';
    }

    return row;
  });
};

export const getCompanyWorkOrderRows = (
  companyWorkOrders: CompanyWorkOrder[],
  { crews = false, hideIds = false, employeesById = {} }: WorkOrderDisplayOptions = {}
): Record<string, unknown>[] => {
  if (crews) {
    return toCrewRows(companyWorkOrders, employeesById);
  }

  return companyWorkOrders.map((workOrder) => {
    return Object.entries(workOrder).reduce((row, [key, value]) => {
      if (isCrewField(key)) {
        return row;
      }

      if (hideIds && isIdField(key)) {
        return row;
      }

      row[key] = value;
      return row;
    }, {} as Record<string, unknown>);
  });
};

export const logCompanyWorkOrders = (
  companyWorkOrders: CompanyWorkOrder[],
  options: WorkOrderDisplayOptions = {}
): void => {
  const rows = getCompanyWorkOrderRows(companyWorkOrders, options);
  const keys = Array.from(
    rows.reduce((acc, item) => {
      Object.keys(item).forEach((key) => acc.add(key));
      return acc;
    }, new Set<string>())
  );

  const workOrdersTable = cliTable();
  workOrdersTable.push(keys.map((key) => chalk.green(formatHeading(key))));

  rows.forEach((row) => {
    workOrdersTable.push(keys.map((key) => formatValue(row[key])));
  });

  console.log(workOrdersTable.toString());
};

export const buildEmployeesById = (employees: People[]): Record<string, string> => {
  return employees.reduce((map, employee) => {
    map[normalizeId(employee.Id)] = employee.Pseudo;
    return map;
  }, {} as Record<string, string>);
};
