import chalk from 'chalk';

import { CompanyTradingGood } from '../api/getCompanyTradingGoods';
import { cliTable } from '../utils/cli-table';

const isIdKey = (key: string) => key.endsWith('Id');

const getReadableObjectValue = (value: unknown): string | undefined => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  const record = value as Record<string, unknown>;

  if (typeof record['DisplayName'] === 'string') {
    return `${record['DisplayName']}`;
  }

  if (typeof record['Identifier'] === 'string') {
    return `${record['Identifier']}`;
  }

  if (typeof record['Name'] === 'string') {
    return `${record['Name']}`;
  }

  if (typeof record['ICAO'] === 'string') {
    return `${record['ICAO']}`;
  }

  if (typeof record['AirlineCode'] === 'string') {
    return `${record['AirlineCode']}`;
  }

  return undefined;
};

const hasReadableIdReplacement = (items: CompanyTradingGood[], key: string) => {
  const relatedObjectKey = key.slice(0, -2);

  return items.some((item) => Boolean(getReadableObjectValue(item[relatedObjectKey])));
};

const formatHeading = (key: string): string => {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const getColumnHeading = (key: string, readableIds = false) => {
  if (readableIds && isIdKey(key)) {
    return formatHeading(key.slice(0, -2));
  }

  return formatHeading(key);
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

const getTradingGoodsKeys = (
  companyTradingGoods: CompanyTradingGood[],
  hideIds = false,
  readableIds = false
) => {
  const allKeys = Array.from(
    companyTradingGoods.reduce((acc, item) => {
      Object.keys(item).forEach((key) => acc.add(key));
      return acc;
    }, new Set<string>())
  );

  return allKeys.filter((key) => {
    if (hideIds && isIdKey(key)) {
      return false;
    }

    if (readableIds && isIdKey(key) && !hasReadableIdReplacement(companyTradingGoods, key)) {
      return false;
    }

    if (readableIds && !hideIds && !isIdKey(key)) {
      const relatedIdKey = `${key}Id`;
      if (allKeys.includes(relatedIdKey)) {
        return false;
      }
    }

    return true;
  });
};

const getColumnValue = (good: CompanyTradingGood, key: string, readableIds = false) => {
  if (key === 'InTransit') {
    return Boolean(good['CurrentAircraftId'] || good['CurrentAircraft']) ? 'Yes' : 'No';
  }

  if (readableIds && isIdKey(key)) {
    const relatedObjectKey = key.slice(0, -2);
    const readableValue = getReadableObjectValue(good[relatedObjectKey]);

    if (readableValue) {
      return readableValue;
    }
  }

  return formatValue(good[key]);
};

const getLocationLabel = (good: CompanyTradingGood) => {
  const currentAirport = getReadableObjectValue(good['CurrentAirport']);
  const currentAircraft = getReadableObjectValue(good['CurrentAircraft']);

  if (currentAirport) {
    return currentAirport;
  }

  if (currentAircraft) {
    return `Aircraft ${currentAircraft}`;
  }

  return '-';
};

export const logCompanyTradingGoodsSummary = (companyTradingGoods: CompanyTradingGood[]): void => {
  const groupedTradingGoods = Array.from(
    companyTradingGoods.reduce((acc, good) => {
      const merchandiseType = getReadableObjectValue(good['MerchandiseType']) || '-';
      const inTransit = Boolean(good['CurrentAircraftId'] || good['CurrentAircraft']) ? 'In Transit' : 'On Site';
      const location = getLocationLabel(good);
      const groupKey = `${location}__${merchandiseType}__${inTransit}`;
      const quantity = Number(good['Quantity']) || 0;
      const pricePerUnit = formatValue(good['PricePerUnit']) || '0';

      if (!acc.has(groupKey)) {
        acc.set(groupKey, {
          location,
          merchandiseType,
          inTransit,
          quantity: 0,
          prices: new Set<string>(),
        });
      }

      const existingGroup = acc.get(groupKey)!;
      existingGroup.quantity += quantity;
      existingGroup.prices.add(pricePerUnit);

      return acc;
    }, new Map<string, {
      location: string;
      merchandiseType: string;
      inTransit: string;
      quantity: number;
      prices: Set<string>;
    }>())
  ).map(([, group]) => group);

  const quantityWidth = groupedTradingGoods.reduce((maxWidth, group) => {
    return Math.max(maxWidth, `${group.quantity}`.length);
  }, 1);
  const locationWidth = groupedTradingGoods.reduce((maxWidth, group) => {
    return Math.max(maxWidth, group.location.length);
  }, 1);

  groupedTradingGoods.forEach((group) => {
    const location = group.location.padEnd(locationWidth, ' ');
    const quantity = `${group.quantity}`.padStart(quantityWidth, '0');
    const prices = Array.from(group.prices);
    const priceLabel = prices.length === 1 ? prices[0] : prices.join('/');

    console.log(`${location} | ${quantity} | ${group.merchandiseType} | ${group.inTransit} | Price ${priceLabel}`);
  });
};

export const logCompanyTradingGoods = (
  companyTradingGoods: CompanyTradingGood[],
  hideIds = false,
  readableIds = false
): void => {
  const keys = ['InTransit', ...getTradingGoodsKeys(companyTradingGoods, hideIds, readableIds)];

  const tradingGoodsTable = cliTable();
  tradingGoodsTable.push(keys.map((key) => chalk.green(getColumnHeading(key, readableIds))));

  companyTradingGoods.forEach((good) => {
    tradingGoodsTable.push(keys.map((key) => getColumnValue(good, key, readableIds)));
  });

  console.log(tradingGoodsTable.toString());
};
