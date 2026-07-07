import chalk from "chalk";

import { CompanyNotification } from "../api/getCompanyNotifications";
import { cliTable } from "../utils/cli-table";

const formatDate = (dateStr: string): string => {
  const date = new Date(Date.parse(dateStr));

  return Number.isNaN(date.getTime()) ? dateStr : date.toLocaleString('en-GB');
};

const formatAmount = (amount: number): string => {
  if (amount === 0) {
    return '-';
  }

  const formattedAmount = amount.toLocaleString('en-GB');
  return amount < 0 ? chalk.red(formattedAmount) : chalk.green(formattedAmount);
};

export const logCompanyNotifications = (notifications: CompanyNotification[]): void => {
  const notificationTable = cliTable();

  notificationTable.push([
    chalk.green('Date'),
    chalk.green('Read'),
    chalk.green('Category'),
    chalk.green('Action'),
    chalk.green('Amount'),
    chalk.green('Description'),
  ]);

  notifications.forEach((notification) => {
    notificationTable.push([
      formatDate(notification.ZuluEventTime),
      notification.IsRead ? 'Yes' : 'No',
      notification.Category,
      notification.Action,
      formatAmount(notification.Amount),
      notification.Description,
    ]);
  });

  console.log(notificationTable.toString());
};
