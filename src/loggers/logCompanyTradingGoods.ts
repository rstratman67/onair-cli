import chalk from 'chalk';

import { CompanyTradingGood } from '../api/getCompanyTradingGoods';
import { cliTable } from '../utils/cli-table';

interface TradingGoodsDisplayOptions {
  hideIds?: boolean;
}

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

export const getCompanyTradingGoodsRows = (
  companyTradingGoods: CompanyTradingGood[],
  { hideIds = false }: TradingGoodsDisplayOptions = {}
): Record<string, unknown>[] => {
  return companyTradingGoods.map((good) => {
    return Object.entries(good).reduce((row, [key, value]) => {
      if (hideIds && isIdField(key)) {
        return row;
      }

      row[key] = value;
      return row;
    }, {} as Record<string, unknown>);
  });
};

export const logCompanyTradingGoods = (
  companyTradingGoods: CompanyTradingGood[],
  options: TradingGoodsDisplayOptions = {}
): void => {
  const rows = getCompanyTradingGoodsRows(companyTradingGoods, options);
  const keys = Array.from(
    rows.reduce((acc, item) => {
      Object.keys(item).forEach((key) => acc.add(key));
      return acc;
    }, new Set<string>())
  );

  const tradingGoodsTable = cliTable();
  tradingGoodsTable.push(keys.map((key) => chalk.green(formatHeading(key))));

  rows.forEach((row) => {
    tradingGoodsTable.push(keys.map((key) => formatValue(row[key])));
  });

  console.log(tradingGoodsTable.toString());
};
