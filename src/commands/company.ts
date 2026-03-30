import yargs, { BuilderCallback, CommandModule } from 'yargs';
import chalk from 'chalk';
import OnAirApi, { OnAirApiConfig, Company, Aircraft, Flight, Fbo, Job, IncomeStatement } from 'onair-api';

import { CompanyTradingGood, getCompanyTradingGoods } from '../api/getCompanyTradingGoods';
import { getCompanyWorkOrders } from '../api/getCompanyWorkOrders';
import { logCompanyTradingGoods } from '../loggers/logCompanyTradingGoods';
import { logCompanyWorkOrders, getWorkOrderAircraftIcao } from '../loggers/logCompanyWorkOrders';
import { CompanyWorkOrder } from '../types/CompanyWorkOrder';
import { CommonConfig } from '../utils/commonTypes';
import { logFlights } from '../loggers/logFlights';
import { logCompany } from '../loggers/logCompany';
import { logCompanyFleet } from '../loggers/logCompanyFleet';
import { logCompanyFbos } from '../loggers/logCompanyFbos';
import { logCompanyJobs } from '../loggers/logCompanyJobs';
import { logCompanyIncome } from '../loggers/logCompanyIncome';

const log = console.log;

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

const filterTradingGoodsByAirportIcao = (tradingGoods: CompanyTradingGood[], airportIcao?: string): CompanyTradingGood[] => {
  if (!airportIcao) {
    return tradingGoods;
  }

  const filterValue = airportIcao.toLocaleUpperCase();

  return tradingGoods.filter((good) => {
    const icao = getNestedStringValue(good, ['CurrentAirport', 'ICAO']);
    return typeof icao === 'string' && icao.toLocaleUpperCase() === filterValue;
  });
};

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

const builder = (yargs: yargs.Argv<CommonConfig>) => {
  return yargs
    .positional('action', {
      describe: 'Optional info to lookup from your company',
      type: 'string',
      choices: ['fleet', 'flights', 'fbos', 'jobs', 'income', 'work-orders', 'trading-goods', 'trading_goods'],
    })
    .option('page', {
      'describe': 'Page number (flights only)',
      'type': 'number',
      'alias': 'p',
    })
    .option('days', {
      'describe': 'Days to display (Income statement only)',
      'type': 'number',
    })
    .option('aircraft-type', {
      'describe': 'Filter fleet by aircraft type name (fleet only)',
      'type': 'string',
    })
    .option('airport-icao', {
      'describe': 'Filter fleet by current airport ICAO (fleet only)',
      'type': 'string',
    })
    .option('sort', {
      'describe': 'Sort fleet results',
      'type': 'string',
      'choices': ['aircraft-type'],
    })
    .option('aircraft-icao', {
      'describe': 'Filter work orders by aircraft ICAO (work-orders only)',
      'type': 'string',
    })
    .option('show-crew', {
      'describe': 'Display assigned crew for work orders',
      'type': 'boolean',
      'default': false,
    })
    .option('work-order-id', {
      'describe': 'Display work order IDs',
      'type': 'boolean',
      'default': false,
    })
    .option('merchandiseType', {
      describe: 'Filter trading goods by MerchandiseType.Name',
      type: 'string',
      alias: 'm',
    })
    .option('trading-airport-icao', {
      describe: 'Filter trading goods by CurrentAirport.ICAO',
      type: 'string',
    })
    .example('$0 company','Get summary information for your company')
    .example('$0 company fleet','List your aircraft')
    .example('$0 company fleet --aircraft-type=airbus', 'List only matching aircraft types')
    .example('$0 company fleet --airport-icao=KJFK', 'List only aircraft at an airport')
    .example('$0 company fleet --sort=aircraft-type', 'Sort fleet by aircraft type')
    .example('$0 company flights','List your flights')
    .example('$0 company flights -p=2','List your flights, showing page 2')
    .example('$0 company fbos', 'List your FBOs')
    .example('$0 company jobs', 'List your pending jobs')
    .example('$0 company income', 'Display your company income statement summary')
    .example('$0 company income --days=30', 'Display your statement summary for the last 30 days')
    .example('$0 company work-orders', 'List your company work orders')
    .example('$0 company work-orders --aircraft-icao=C172', 'List work orders for one aircraft ICAO')
    .example('$0 company work-orders --show-crew', 'List work orders with assigned crew names')
    .example('$0 company work-orders --work-order-id', 'List work orders including the work order ID')
    .example('$0 company trading-goods', 'List your trading goods')
    .example('$0 company trading_goods --merchandiseType=Water', 'Filter trading goods by merchandise type name')
    .example('$0 company trading_goods --trading-airport-icao=KJFK', 'Filter trading goods by airport ICAO');
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
      } else {
        switch (argv['action']) {
          case 'fleet': {
            const companyFleet: Aircraft[] = await api.getCompanyFleet();
            const aircraftTypeFilter = typeof argv['aircraft-type'] === 'string'
              ? argv['aircraft-type'].trim().toLocaleLowerCase()
              : undefined;
            const airportIcaoFilter = typeof argv['airport-icao'] === 'string'
              ? argv['airport-icao'].trim().toLocaleUpperCase()
              : undefined;

            let filteredFleet = companyFleet.filter((aircraft) => {
              const matchesAircraftType = aircraftTypeFilter
                ? aircraft.AircraftType.DisplayName.toLocaleLowerCase().includes(aircraftTypeFilter)
                : true;
              const matchesAirportIcao = airportIcaoFilter
                ? aircraft.CurrentAirport?.ICAO?.toLocaleUpperCase() === airportIcaoFilter
                : true;

              return matchesAircraftType && matchesAirportIcao;
            });

            if (argv['sort'] === 'aircraft-type') {
              filteredFleet = [...filteredFleet].sort((a, b) => {
                const typeSort = a.AircraftType.DisplayName.localeCompare(b.AircraftType.DisplayName);
                return typeSort !== 0 ? typeSort : a.Identifier.localeCompare(b.Identifier);
              });
            }

            if (filteredFleet.length) {
              log(chalk.greenBright.bold('Your fleet of aircraft\n'));
              
              logCompanyFleet(filteredFleet);
              
              log(`\nSuggested command: ${argv['$0']} aircraft <aircraftId>`);
              log(`Suggested command: ${argv['$0']} flights <aircraftId>`);
            } else {
              log(companyFleet.length
                ? 'No aircraft matched your fleet filters.'
                : 'Dude, where\'s your aircraft?! ' + chalk.magentaBright('✈'));
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
            } else {
              log('No pending jobs! ' + chalk.magentaBright('✈'))
            }
            break;
          }

          case 'income': {
            const daysToDisplay = 
              typeof argv['days'] === 'undefined' || argv['days'] < 1 || argv['days'] > 30 
              ? 7 : argv['days'];
            const currentDate = new Date();
            const currentDateStr = currentDate.toISOString();
            const priorDate = new Date().setDate(currentDate.getDate() - daysToDisplay);
            const priorDateStr = new Date(priorDate).toISOString();
            const income: IncomeStatement = await api.getCompanyIncomeStatement(priorDateStr, currentDateStr);    
            logCompanyIncome(income, daysToDisplay);
            break;
          }

          case 'work-orders': {
            const workOrders: CompanyWorkOrder[] = await getCompanyWorkOrders(argv['companyId'], argv['apiKey']);
            const aircraftIcaoFilter = typeof argv['aircraft-icao'] === 'string'
              ? argv['aircraft-icao'].trim().toLocaleUpperCase()
              : undefined;

            const filteredWorkOrders = workOrders.filter((workOrder) => {
              if (!aircraftIcaoFilter) {
                return true;
              }

              return getWorkOrderAircraftIcao(workOrder)?.toLocaleUpperCase() === aircraftIcaoFilter;
            });

            if (filteredWorkOrders.length) {
              log(chalk.greenBright.bold('Your work orders\n'));
              logCompanyWorkOrders(filteredWorkOrders, argv['show-crew'], argv['work-order-id']);
            } else {
              log(workOrders.length
                ? 'No work orders matched your aircraft ICAO filter.'
                : 'No work orders found.');
            }
            break;
          }

          case 'trading-goods':
          case 'trading_goods': {
            const companyTradingGoods = await getCompanyTradingGoods(argv['companyId'], argv['apiKey']);
            const filteredTradingGoodsByMerchandiseType = filterTradingGoods(companyTradingGoods, argv['merchandiseType']);
            const filteredTradingGoods = filterTradingGoodsByAirportIcao(
              filteredTradingGoodsByMerchandiseType,
              typeof argv['trading-airport-icao'] === 'string'
                ? argv['trading-airport-icao'].trim()
                : undefined
            );
            const sortedTradingGoods = sortTradingGoodsByAirportIcao(filteredTradingGoods);

            if (sortedTradingGoods.length) {
              log(chalk.greenBright.bold('Your Trading Goods\n'));
              logCompanyTradingGoods(sortedTradingGoods);
            } else {
              log(
                argv['merchandiseType'] || argv['trading-airport-icao']
                  ? 'No trading goods found for the supplied filters.'
                  : 'No trading goods found.'
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
