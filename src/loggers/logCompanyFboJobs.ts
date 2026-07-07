import chalk from 'chalk';
import { Cargo, Charter, Fbo, Job } from 'onair-api';

import { cliTable } from '../utils/cli-table';

export interface CompanyFboJobs {
  fbo: Fbo;
  jobs: Job[];
}

type JobWithAirports = Job & {
  BaseAirport?: { ICAO?: string };
  MainAirport?: { ICAO?: string };
  FBOLogisticQueryId?: string;
};

interface RouteGroup {
  current: string;
  destination: string;
  distance: number;
  heading: number;
  cargoWeight: number;
  ecoPax: number;
  businessPax: number;
  firstPax: number;
  descriptions: string[];
  humanOnly: boolean;
}

const PAX_WEIGHT = 190;

const getExpiresIn = (dateStr: string): string => {
  const dueDate = new Date(dateStr).getTime();
  if (Number.isNaN(dueDate)) {
    return '-';
  }

  const now = Date.now();
  const diffInMinutes = Math.round((dueDate - now) / 60000);

  if (diffInMinutes <= 0) {
    return chalk.red(`${diffInMinutes}m`);
  }

  if (diffInMinutes <= 240) {
    return chalk.yellow(`${diffInMinutes}m`);
  }

  const diffInHours = Math.round(diffInMinutes / 60);
  return chalk.green(`${diffInHours}h`);
};

const getLegs = (job: Job): Array<Cargo | Charter> => {
  return [...job.Cargos, ...job.Charters];
};

const formatNumber = (value: number): string => {
  return Math.round(value).toLocaleString('en-GB');
};

const formatPay = (value: number): string => {
  return Math.round(value).toLocaleString('en-GB');
};

const truncate = (value: string, maxLength: number): string => {
  return value.length > maxLength ? `${value.slice(0, maxLength - 3)}...` : value;
};

const formatShortId = (id: string | undefined): string => {
  return id ? id.slice(0, 5) : '-----';
};

const getPaxCount = (charter: Charter): number => {
  return charter.PassengersNumber || 0;
};

const addPaxToGroup = (group: RouteGroup, charter: Charter): void => {
  const paxCount = getPaxCount(charter);

  switch (charter.MinPAXSeatConf) {
    case 2:
      group.firstPax += paxCount;
      break;
    case 1:
      group.businessPax += paxCount;
      break;
    default:
      group.ecoPax += paxCount;
      break;
  }
};

const getRouteKey = (leg: Cargo | Charter): string => {
  return [
    leg.CurrentAirport?.ICAO || '',
    leg.DestinationAirport?.ICAO || '',
    Math.round(leg.Heading || 0),
    Math.round(leg.Distance || 0),
  ].join('|');
};

const createRouteGroup = (leg: Cargo | Charter): RouteGroup => {
  return {
    current: leg.CurrentAirport?.ICAO || '',
    destination: leg.DestinationAirport?.ICAO || '',
    distance: leg.Distance || 0,
    heading: leg.Heading || 0,
    cargoWeight: 0,
    ecoPax: 0,
    businessPax: 0,
    firstPax: 0,
    descriptions: [],
    humanOnly: false,
  };
};

const getRouteGroups = (job: Job): RouteGroup[] => {
  const routeGroups: Record<string, RouteGroup> = {};

  getLegs(job).forEach((leg) => {
    const routeKey = getRouteKey(leg);
    const routeGroup = routeGroups[routeKey] || createRouteGroup(leg);

    if ('Weight' in leg) {
      routeGroup.cargoWeight += leg.Weight || 0;
    } else {
      addPaxToGroup(routeGroup, leg);
    }

    routeGroup.humanOnly = routeGroup.humanOnly || leg.HumanOnly;
    if (leg.Description && !routeGroup.descriptions.includes(leg.Description)) {
      routeGroup.descriptions.push(leg.Description);
    }

    routeGroups[routeKey] = routeGroup;
  });

  return Object.values(routeGroups);
};

const getTotalPax = (group: RouteGroup): number => {
  return group.ecoPax + group.businessPax + group.firstPax;
};

const getTotalWeight = (group: RouteGroup): number => {
  return group.cargoWeight + (getTotalPax(group) * PAX_WEIGHT);
};

const formatPax = (ecoPax: number, businessPax: number, firstPax: number): string => {
  return `${ecoPax}/${businessPax}/${firstPax}`;
};

const formatRoutePax = (group: RouteGroup): string => {
  const totalPax = getTotalPax(group);
  return totalPax ? `${formatPax(group.ecoPax, group.businessPax, group.firstPax)} (${totalPax})` : '-';
};

const formatHeadDistance = (heading: number, distance: number): string => {
  return `${Math.round(heading)}deg/${Math.round(distance)} NM`;
};

const getBaseAirportIcao = (job: JobWithAirports, fbo: Fbo): string => {
  return job.BaseAirport?.ICAO || fbo.Airport?.ICAO || '';
};

const getMainAirportIcao = (job: JobWithAirports, routeGroups: RouteGroup[]): string => {
  return job.MainAirport?.ICAO || routeGroups[0]?.destination || '';
};

const getPayloadDescription = (routeGroups: RouteGroup[]): string => {
  return routeGroups
    .flatMap((group) => group.descriptions)
    .filter((description, index, descriptions) => descriptions.indexOf(description) === index)
    .join(', ');
};

export const logCompanyFboJobs = (companyFboJobs: CompanyFboJobs[]): void => {
  companyFboJobs.forEach(({ fbo, jobs }, index) => {
    console.log(chalk.whiteBright.bold(`${fbo.Airport.ICAO} - ${fbo.Name}`));

    if (!jobs.length) {
      console.log(chalk.grey('No pending jobs.\n'));
      return;
    }

    jobs.forEach((job) => {
      const jobWithAirports = job as JobWithAirports;
      const routeGroups = getRouteGroups(job);
      const totalCargoWeight = routeGroups.reduce((total, group) => total + group.cargoWeight, 0);
      const totalEcoPax = routeGroups.reduce((total, group) => total + group.ecoPax, 0);
      const totalBusinessPax = routeGroups.reduce((total, group) => total + group.businessPax, 0);
      const totalFirstPax = routeGroups.reduce((total, group) => total + group.firstPax, 0);
      const totalWeight = routeGroups.reduce((total, group) => total + getTotalWeight(group), 0);
      const summaryTable = cliTable();

      summaryTable.push([
        chalk.green('Base'),
        chalk.green('Main'),
        chalk.green('Hd'),
        chalk.green('Dist.'),
        chalk.green('Cargo'),
        chalk.green('Pax E/B/F'),
        chalk.green('Payload'),
        chalk.green('Total W.'),
        chalk.green('Exp'),
        chalk.green('Pay'),
      ]);

      summaryTable.push([
        getBaseAirportIcao(jobWithAirports, fbo),
        getMainAirportIcao(jobWithAirports, routeGroups),
        routeGroups[0] ? `${Math.round(routeGroups[0].heading)}deg` : '-',
        routeGroups[0] ? formatNumber(routeGroups[0].distance) : '-',
        formatNumber(totalCargoWeight),
        formatPax(totalEcoPax, totalBusinessPax, totalFirstPax),
        truncate(getPayloadDescription(routeGroups), 72),
        formatNumber(totalWeight),
        getExpiresIn(job.ExpirationDate),
        formatPay(job.Pay),
      ]);

      console.log(summaryTable.toString());

      const detailTable = cliTable();
      detailTable.push([
        chalk.green('Actions'),
        chalk.green('Current'),
        chalk.green('To'),
        chalk.green(`Logistic Query (${formatShortId(jobWithAirports.Id)})`),
        chalk.green('Cargo'),
        chalk.green('Pax'),
        chalk.green('Total W.'),
        chalk.green('Head/Dist.'),
        chalk.green('POIs'),
      ]);

      routeGroups.forEach((group) => {
        detailTable.push([
          'F',
          group.current,
          group.destination,
          truncate(group.descriptions.join(', '), 72),
          group.cargoWeight ? formatNumber(group.cargoWeight) : '-',
          formatRoutePax(group),
          formatNumber(getTotalWeight(group)),
          formatHeadDistance(group.heading, group.distance),
          '-',
        ]);
      });

      console.log(detailTable.toString());
      console.log('');
    });

    if (index < companyFboJobs.length - 1) {
      console.log('');
    }
  });
};
