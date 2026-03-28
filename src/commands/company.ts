import yargs, { BuilderCallback, CommandModule } from 'yargs';
import chalk from 'chalk';
import OnAirApi, { OnAirApiConfig, Company, Aircraft, Flight, Fbo, Job } from 'onair-api';

import { CommonConfig } from '../utils/commonTypes';
import { logFlights } from '../loggers/logFlights';
import { logCompany } from '../loggers/logCompany';
import { logCompanyFleet } from '../loggers/logCompanyFleet';
import { logCompanyFbos } from '../loggers/logCompanyFbos';
import { logCompanyJobs } from '../loggers/logCompanyJobs';
import { CompanyTradingGood, getCompanyTradingGoods } from '../api/getCompanyTradingGoods';
import { logCompanyTradingGoods } from '../loggers/logCompanyTradingGoods';

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
      choices: ['fleet', 'flights', 'fbos', 'jobs', 'trading-goods', 'trading_goods'],
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
    .example('$0 company','Get summary information for your company')
    .example('$0 company fleet','List your aircraft')
    .example('$0 company flights','List your flights')
    .example('$0 company flights -p=2','List your flights, showing page 2')
    .example('$0 company fbos', 'List your FBOs')
    .example('$0 company jobs', 'List your pending jobs')
    .example('$0 company trading-goods', 'List your trading goods')
    .example('$0 company trading-goods --merchandiseType=Water', 'Filter trading goods by merchandise type name');
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
            if (companyFleet.length) {
              log(chalk.greenBright.bold('Your fleet of aircraft\n'));
              
              logCompanyFleet(companyFleet);
              
              log(`\nSuggested command: ${argv['$0']} aircraft <aircraftId>`);
              log(`Suggested command: ${argv['$0']} flights <aircraftId>`);
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

          case 'trading-goods':
          case 'trading_goods': {
            const companyTradingGoods = await getCompanyTradingGoods(argv['companyId'], argv['apiKey']);
            const filteredTradingGoods = filterTradingGoods(companyTradingGoods, argv['merchandiseType']);
            const sortedTradingGoods = sortTradingGoodsByAirportIcao(filteredTradingGoods);

            if (sortedTradingGoods.length) {
              log(chalk.greenBright.bold('Your Trading Goods\n'));
              logCompanyTradingGoods(sortedTradingGoods);
            } else {
              log(
                argv['merchandiseType']
                  ? `No trading goods found for merchandise type "${argv['merchandiseType']}" ` + chalk.magentaBright('✈')
                  : 'No trading goods found ' + chalk.magentaBright('✈')
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
