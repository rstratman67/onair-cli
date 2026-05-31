import chalk from "chalk";
import { CashFlow, CashFlowEntry } from "onair-api";

import { cliTable } from "../utils/cli-table";

export interface CashFlowPaymentEntry extends CashFlowEntry {
  AircraftId?: string;
}

interface CashFlowAccount {
  Id: string;
  ShortName?: string;
  Name?: string;
}

interface CashFlowEntryWithAccount extends CashFlowEntry {
  Account?: CashFlowAccount | CashFlowAccount[];
}

export type AircraftLookup = Record<string, string>;
export type AccountLookup = Record<string, string>;

const formatMoney = (amount: number): string => {
  const formattedAmount = amount.toLocaleString('en-GB');

  return amount < 0
    ? chalk.red(formattedAmount)
    : chalk.green(formattedAmount);
};

const formatDate = (dateStr: string): string => {
  const date = new Date(Date.parse(dateStr));

  return Number.isNaN(date.getTime()) ? dateStr : date.toLocaleString('en-GB');
};

const getCarryForward = (entry: CashFlowEntry): string => {
  const cashFlowEntry = entry as CashFlowEntry & { CarryForward?: boolean; CarryFowarad?: boolean | string };
  const carryForward = typeof cashFlowEntry.CarryForward !== 'undefined'
    ? cashFlowEntry.CarryForward
    : cashFlowEntry.CarryFowarad;

  return carryForward ? 'Yes' : 'No';
};

const getPaymentType = (description: string): string => {
  const match = description.match(/^Payment for ([^(\\.]+)/i);

  return match ? match[1].trim() : 'Payment';
};

const getAircraftLabel = (entry: CashFlowPaymentEntry, aircraftLookup: AircraftLookup): string => {
  return entry.AircraftId ? aircraftLookup[entry.AircraftId] || entry.AircraftId : '-';
};

const getAccountLabel = (entry: CashFlowEntry, accountLookup: AccountLookup = {}): string => {
  const account = (entry as CashFlowEntryWithAccount).Account;
  const accountValue = Array.isArray(account) ? account[0] : account;

  if (accountValue?.Name && accountValue.ShortName) {
    return `${accountValue.Name} (${accountValue.ShortName})`;
  }

  if (accountValue?.Name) {
    return accountValue.Name;
  }

  if (accountValue?.ShortName) {
    return accountValue.ShortName;
  }

  return accountLookup[entry.AccountId] || entry.AccountId;
};

export const logCompanyCashFlow = (
  cashFlow: CashFlow,
  readableAccountIds = false,
  aircraftLookup: AircraftLookup = {},
  accountLookup: AccountLookup = {}
): void => {
  const summaryTable = cliTable();

  summaryTable.push([
    chalk.green('Current Cash'),
    formatMoney(cashFlow.CompanyCurrentCash),
    chalk.green('Last Report Amount'),
    formatMoney(cashFlow.LastReportAmount),
  ]);
  summaryTable.push([
    chalk.green('Last Report Date'),
    formatDate(cashFlow.LastReportDate),
    '',
    '',
  ]);

  console.log(summaryTable.toString() + '\n');

  const cashFlowTable = cliTable();
  cashFlowTable.push([
    chalk.green('Date'),
    chalk.green('Description'),
    ...(readableAccountIds ? [chalk.green('Aircraft')] : []),
    ...(readableAccountIds ? [chalk.green('Account')] : []),
    chalk.green('Amount'),
    chalk.green('Carry Forward'),
  ]);

  cashFlow.Entries.forEach((entry) => {
    cashFlowTable.push([
      formatDate(entry.CreationDate),
      entry.Description,
      ...(readableAccountIds ? [getAircraftLabel(entry as CashFlowPaymentEntry, aircraftLookup)] : []),
      ...(readableAccountIds ? [getAccountLabel(entry, accountLookup)] : []),
      formatMoney(entry.Amount),
      getCarryForward(entry),
    ]);
  });

  console.log(cashFlowTable.toString());
};

export const logCompanyCashFlowPayments = (
  entries: CashFlowPaymentEntry[],
  aircraftLookup: AircraftLookup = {},
  readableAccountIds = false,
  accountLookup: AccountLookup = {}
): void => {
  const paymentTable = cliTable();
  paymentTable.push([
    chalk.green('Creation Date'),
    chalk.green('Payment'),
    chalk.green('Aircraft'),
    ...(readableAccountIds ? [chalk.green('Account')] : []),
    chalk.green('Amount'),
  ]);

  entries.forEach((entry) => {
    paymentTable.push([
      formatDate(entry.CreationDate),
      getPaymentType(entry.Description),
      getAircraftLabel(entry, aircraftLookup),
      ...(readableAccountIds ? [getAccountLabel(entry, accountLookup)] : []),
      formatMoney(entry.Amount),
    ]);
  });

  console.log(paymentTable.toString());
};
