import chalk from "chalk";
import { CashFlow, CashFlowEntry } from "onair-api";

import { cliTable } from "../utils/cli-table";

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

export const logCompanyCashFlow = (cashFlow: CashFlow): void => {
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
    chalk.green('Amount'),
    chalk.green('Carry Forward'),
  ]);

  cashFlow.Entries.forEach((entry) => {
    cashFlowTable.push([
      formatDate(entry.CreationDate),
      entry.Description,
      formatMoney(entry.Amount),
      getCarryForward(entry),
    ]);
  });

  console.log(cashFlowTable.toString());
};
