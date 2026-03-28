import yargs, { BuilderCallback, CommandModule } from 'yargs';
import chalk from 'chalk';
import OnAirApi, { OnAirApiConfig, Company, Aircraft, Flight, Fbo, Job, People } from 'onair-api';

import { CommonConfig } from '../utils/commonTypes';
import { logFlights } from '../loggers/logFlights';
import { logCompany } from '../loggers/logCompany';
import { logCompanyFleet } from '../loggers/logCompanyFleet';
import { logCompanyFbos } from '../loggers/logCompanyFbos';
import { logCompanyJobs } from '../loggers/logCompanyJobs';
import { logCompanyEmployees } from '../loggers/logCompanyEmployees';
import { CompanyTradingGood, getCompanyTradingGoods } from '../api/getCompanyTradingGoods';
import { logCompanyTradingGoods } from '../loggers/logCompanyTradingGoods';
import { CompanyWorkOrder, getCompanyWorkOrders } from '../api/getCompanyWorkOrders';
import { buildEmployeesById, getCompanyWorkOrderRows, logCompanyWorkOrders } from '../loggers/logCompanyWorkOrders';
import { keyValueRows, writeCsvSections } from '../utils/csv';

const log = console.log;

// Read nested properties safely from API responses whose shape can vary.
const getNestedStringValue = (value: unknown, path: string[]): string | undefined => {
  let current: unknown = value;

  for (const segment of path) {
    if (typeof current !== 'object' || current === null || !(segment in current)) {
      return undefined;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return typeof current === 'string' ? current : undefined;
};

// Trading goods are filtered client-side because the endpoint is fetched as one list.
const filterTradingGoods = (tradingGoods: CompanyTradingGood[], merchandiseTypeName?: string): CompanyTradingGood[] => {
  if (!merchandiseTypeName) {
    return tradingGoods;
  }

  const filterValue = merchandiseTypeName.toLocaleLowerCase();

  return tradingGoods.filter((good) => {
    const name = getNestedStringValue(good, ['MerchandiseType', 'Name']);
    return typeof name === 'string' && name.toLocaleLowerCase().includes(filterValue);
  });
};

// Airports without an ICAO are pushed to the end to keep the visible rows stable.
const sortTradingGoodsByAirportIcao = <T extends Record<string, unknown>>(tradingGoods: T[]): T[] => {
  return [...tradingGoods].sort((left, right) => {
    const leftIcao = getNestedStringValue(left, ['CurrentAirport', 'ICAO']) || '';
    const rightIcao = getNestedStringValue(right, ['CurrentAirport', 'ICAO']) || '';

    if (!leftIcao && !rightIcao) {
      return 0;
    }

    if (!leftIcao) {
      return 1;
    }

    if (!rightIcao) {
      return -1;
    }

    return leftIcao.localeCompare(rightIcao);
  });
};

const filterWorkOrdersByAircraft = (workOrders: CompanyWorkOrder[], aircraftId?: string): CompanyWorkOrder[] => {
  if (!aircraftId) {
    return workOrders;
  }

  const filterValue = aircraftId.toLocaleLowerCase();

  return workOrders.filter((workOrder) => {
    const directAircraftId = getNestedStringValue(workOrder, ['AircraftId']);
    const nestedAircraftId = getNestedStringValue(workOrder, ['Aircraft', 'Id']);
    const nestedIdentifier = getNestedStringValue(workOrder, ['Aircraft', 'Identifier']);

    return [directAircraftId, nestedAircraftId, nestedIdentifier]
      .filter((value): value is string => typeof value === 'string')
      .some((value) => value.toLocaleLowerCase().includes(filterValue));
  });
};

const filterEmployeesByType = (employees: People[], employeeType?: string): People[] => {
  if (!employeeType) {
    return employees;
  }

  const filterValue = employeeType.toLocaleLowerCase();

  return employees.filter((employee) => {
    const categoryName =
      employee.Category === 0 ? 'pilot' :
      employee.Category === 1 ? 'attendant' :
      employee.Category === 2 ? 'mechanic' :
      employee.Category === 3 ? 'pilot' :
      `${employee.Category}`;

    return categoryName.includes(filterValue) || `${employee.Category}` === filterValue;
  });
};

const builder = (yargs: yargs.Argv<CommonConfig>) => {
  return yargs
    .positional('action', {
      describe: 'Optional info to lookup from your company',
      type: 'string',
      choices: ['fleet', 'flights', 'fbos', 'jobs', 'employees', 'trading-goods', 'trading_goods', 'workorders', 'work-orders', 'work_orders'],
    })
    .option('page', {
      'describe': 'Page number (flights only)',
      'type': 'number',
      'alias': 'p',
    })
    .option('merchandiseType', {
      describe: 'Filter trading goods by MerchandiseType.Name',
      type: 'string',
      alias: 'm',
    })
    .option('aircraftId', {
      describe: 'Filter work orders by aircraft ID or identifier',
      type: 'string',
      alias: 'a',
    })
    .option('hideIds', {
      describe: 'Hide raw ID fields when displaying work orders',
      type: 'boolean',
      default: false,
    })
    .option('crews', {
      describe: 'Show only work order names plus one human-readable column per crew',
      type: 'boolean',
      default: false,
    })
    .option('employeeType', {
      describe: 'Filter company employees by Category/type',
      type: 'string',
      alias: 't',
    })
    .example('$0 company','Get summary information for your company')
    .example('$0 company fleet','List your aircraft')
    .example('$0 company flights','List your flights')
    .example('$0 company flights -p=2','List your flights, showing page 2')
    .example('$0 company fbos', 'List your FBOs')
    .example('$0 company jobs', 'List your pending jobs')
    .example('$0 company employees', 'List your company employees')
    .example('$0 company employees --employeeType=pilot', 'Filter company employees by type')
    .example('$0 company employees --employeeType=mechanic', 'Filter company employees by mechanic/attendant/pilot')
    .example('$0 company trading-goods', 'List your trading goods')
    .example('$0 company trading-goods --merchandiseType=Water', 'Filter trading goods by merchandise type name')
    .example('$0 company workorders', 'List your company work orders')
    .example('$0 company workorders --aircraftId=N123AB', 'Filter work orders by aircraft')
    .example('$0 company workorders --hideIds', 'Hide raw ID fields in work order output')
    .example('$0 company workorders --crews', 'Show work order names and crew columns only');
}

type CompanyCommand = (typeof builder) extends BuilderCallback<CommonConfig, infer R> ? CommandModule<CommonConfig, R> : never;

export const companyCommand: CompanyCommand = {
  command: 'company [action]',
  describe: 'Get information on your company, aircraft, flights and FBOs',
  builder,
  handler: async (argv) => {
    try {
      if (typeof argv['apiKey'] === 'undefined' || typeof argv['world'] === 'undefined' || typeof argv['companyId'] === 'undefined') {
        throw new Error('Credentials missing or not provided');
      }

      const config: OnAirApiConfig = { apiKey: argv['apiKey'], world: argv['world'], companyId: argv['companyId'] };
      const api = new OnAirApi(config);

      if (typeof argv['action'] === 'undefined') {
        const company: Company = await api.getCompany();
        logCompany(company);

        if (argv['csv']) {
          const files = writeCsvSections(argv['csv'], [
            { name: 'company', rows: keyValueRows(company as unknown as Record<string, unknown>) }
          ]);
          files.forEach((file) => log(`CSV written: ${file}`));
        }
      } else {
        switch (argv['action']) {
          case 'fleet': {
            const companyFleet: Aircraft[] = await api.getCompanyFleet();
            if (companyFleet.length) {
              log(chalk.greenBright.bold('Your fleet of aircraft\n'));
              
              logCompanyFleet(companyFleet);
              
              log(`\nSuggested command: ${argv['$0']} aircraft <aircraftId>`);
              log(`Suggested command: ${argv['$0']} flights <aircraftId>`);

              if (argv['csv']) {
                const files = writeCsvSections(argv['csv'], [
                  { name: 'company_fleet', rows: companyFleet as unknown as Record<string, unknown>[] }
                ]);
                files.forEach((file) => log(`CSV written: ${file}`));
              }
            } else {
              log('Dude, where\'s your aircraft?! ' + chalk.magentaBright('✈'));
            }
            break;
          } 
          case 'flights': {
            const page = typeof argv['page'] === 'undefined' || argv['page'] < 1 ? 1 : argv['page'];
            const limit = 20;
            const companyFlights: Flight[] = await api.getCompanyFlights(page, limit);
            if (companyFlights.length) {
              log(chalk.greenBright.bold(`Your flights (Page ${page}, ${limit} per page)\n`));
              
              logFlights(companyFlights);
              
              console.log('');
              if (companyFlights.length === limit) {
                log(`Suggested command: ${argv['$0']} company ${argv['action']} -p=${page+1}`);
              }
              log(`Suggested command: ${argv['$0']} airport <ICAO>`); 
              log(`Suggested command: ${argv['$0']} flight <flightId> (Completed only)`);

              if (argv['csv']) {
                const files = writeCsvSections(argv['csv'], [
                  { name: 'company_flights', rows: companyFlights as unknown as Record<string, unknown>[] }
                ]);
                files.forEach((file) => log(`CSV written: ${file}`));
              }
            } else {
              log('I feel the need... the need for speed! ' + chalk.magentaBright('✈'));
            }
            break;
          }

          case 'fbos': {
            const companyFbos: Fbo[] = await api.getCompanyFbos();
            
            if (companyFbos.length) {
              log(chalk.greenBright.bold('Your FBOs\n'));
              logCompanyFbos(companyFbos);

              if (argv['csv']) {
                const files = writeCsvSections(argv['csv'], [
                  { name: 'company_fbos', rows: companyFbos as unknown as Record<string, unknown>[] }
                ]);
                files.forEach((file) => log(`CSV written: ${file}`));
              }
            } else {
              log('No FBO... no 100LL! ' + chalk.magentaBright('✈'))
            }
            break;  
          }

          case 'jobs': {
            const companyJobs: Job[] = await api.getCompanyJobs();

            if (companyJobs.length) {
              log(chalk.greenBright.bold('Your Pending Jobs\n'));
              logCompanyJobs(companyJobs);

              if (argv['csv']) {
                const files = writeCsvSections(argv['csv'], [
                  { name: 'company_jobs', rows: companyJobs as unknown as Record<string, unknown>[] }
                ]);
                files.forEach((file) => log(`CSV written: ${file}`));
              }
            } else {
              log('No pending jobs! ' + chalk.magentaBright('✈'))
            }
            break;
          }

          case 'employees': {
            const companyEmployees: People[] = await api.getCompanyEmployees();
            const filteredEmployees = filterEmployeesByType(companyEmployees, argv['employeeType']);

            if (filteredEmployees.length) {
              log(chalk.greenBright.bold('Your Employees\n'));
              logCompanyEmployees(filteredEmployees);

              if (argv['csv']) {
                const files = writeCsvSections(argv['csv'], [
                  { name: 'company_employees', rows: filteredEmployees as unknown as Record<string, unknown>[] }
                ]);
                files.forEach((file) => log(`CSV written: ${file}`));
              }
            } else {
              log(
                argv['employeeType']
                  ? `No employees found for type "${argv['employeeType']}" ` + chalk.magentaBright('✈')
                  : 'No employees found ' + chalk.magentaBright('✈')
              )
            }
            break;
          }

          case 'trading-goods':
          case 'trading_goods': {
            const companyTradingGoods = await getCompanyTradingGoods(argv['companyId'], argv['apiKey']);
            const filteredTradingGoods = filterTradingGoods(companyTradingGoods, argv['merchandiseType']);
            const sortedTradingGoods = sortTradingGoodsByAirportIcao(filteredTradingGoods);

            if (sortedTradingGoods.length) {
              log(chalk.greenBright.bold('Your Trading Goods\n'));
              logCompanyTradingGoods(sortedTradingGoods);

              if (argv['csv']) {
                const files = writeCsvSections(argv['csv'], [
                  { name: 'company_trading_goods', rows: sortedTradingGoods as unknown as Record<string, unknown>[] }
                ]);
                files.forEach((file) => log(`CSV written: ${file}`));
              }
            } else {
              log(
                argv['merchandiseType']
                  ? `No trading goods found for merchandise type "${argv['merchandiseType']}" ` + chalk.magentaBright('✈')
                  : 'No trading goods found ' + chalk.magentaBright('✈')
              );
            }
            break;
          }

          case 'workorders':
          case 'work-orders':
          case 'work_orders': {
            const companyWorkOrders = await getCompanyWorkOrders(argv['companyId'], argv['apiKey'], argv['aircraftId']);
            const filteredWorkOrders = filterWorkOrdersByAircraft(companyWorkOrders, argv['aircraftId']);
            const employeesById = argv['crews']
              ? buildEmployeesById(await api.getCompanyEmployees() as People[])
              : {};

            if (filteredWorkOrders.length) {
              log(chalk.greenBright.bold('Your Work Orders\n'));
              logCompanyWorkOrders(filteredWorkOrders, {
                crews: argv['crews'],
                hideIds: argv['hideIds'],
                employeesById,
              });

              if (argv['csv']) {
                const workOrderRows = getCompanyWorkOrderRows(filteredWorkOrders, {
                  crews: argv['crews'],
                  hideIds: argv['hideIds'],
                  employeesById,
                });
                const files = writeCsvSections(argv['csv'], [
                  { name: 'company_workorders', rows: workOrderRows }
                ]);
                files.forEach((file) => log(`CSV written: ${file}`));
              }
            } else {
              log(
                argv['aircraftId']
                  ? `No work orders found for aircraft "${argv['aircraftId']}" ` + chalk.magentaBright('✈')
                  : 'No work orders found ' + chalk.magentaBright('✈')
              );
            }
            break;
          }
        }
      }

      log(chalk.grey('\nGood Day'));
    } catch (e) {
      console.error(chalk.bold.red(e.message))
    }
  }
}
