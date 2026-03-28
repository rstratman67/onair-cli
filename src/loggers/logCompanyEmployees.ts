import chalk from 'chalk';
import { People } from 'onair-api';

import { cliTable } from '../utils/cli-table';

// OnAir currently exposes employee type as a numeric category in the API payload.
const formatCategory = (category: number): string => {
  switch (category) {
    case 0:
      return 'Pilot';
    case 1:
      return 'Attendant';
    case 2:
      return 'Mechanic';
    case 3:
      return 'Pilot';
    default:
      return `${category}`;
  }
};

const formatStatus = (status: number): string => {
  switch (status) {
    case 0:
      return 'Idle';
    case 1:
      return 'Flying';
    case 2:
      return 'Resting';
    default:
      return `${status}`;
  }
};

export const logCompanyEmployees = (employees: People[]): void => {
  const employeesTable = cliTable();

  employeesTable.push([
    chalk.green('Name'),
    chalk.green('Type'),
    chalk.green('Status'),
    chalk.green('Home'),
    chalk.green('Current'),
    chalk.green('Hours'),
    chalk.green('Hired'),
    chalk.green('Employee ID'),
  ]);

  employees.forEach((employee) => {
    employeesTable.push([
      employee.Pseudo,
      formatCategory(employee.Category),
      formatStatus(employee.Status),
      employee.HomeAirport?.ICAO || '-',
      employee.CurrentAirportId && typeof employee.CurrentAirportId === 'object' && 'ICAO' in employee.CurrentAirportId
        ? `${employee.CurrentAirportId.ICAO}`
        : '-',
      `${Math.round(employee.FlightHoursGrandTotal)}`,
      new Date(employee.HiredSince).toLocaleDateString(),
      employee.Id,
    ]);
  });

  console.log(employeesTable.toString());
};
