import chalk from 'chalk';
import { Airport, Cargo, Charter, Fbo, Job } from 'onair-api';

import { cliTable } from '../utils/cli-table';

const getAirportIfMatchesBase = (airport: Airport | undefined, baseAirportId: string): Airport | undefined => {
  return airport?.Id === baseAirportId ? airport : undefined;
};

const getJobBaseAirport = (job: Job): Airport | undefined => {
  let baseAirport: Airport | undefined = (job as Job & { BaseAirport?: Airport }).BaseAirport;

  if (!baseAirport && job.Cargos.length > 0) {
    job.Cargos.find((cargo) => {
      baseAirport =
        getAirportIfMatchesBase(cargo.DepartureAirport, job.BaseAirportId)
        || getAirportIfMatchesBase(cargo.CurrentAirport, job.BaseAirportId)
        || getAirportIfMatchesBase(cargo.DestinationAirport, job.BaseAirportId);

      return Boolean(baseAirport);
    });
  }

  if (!baseAirport && job.Charters.length > 0) {
    job.Charters.find((charter) => {
      baseAirport =
        getAirportIfMatchesBase(charter.DepartureAirport, job.BaseAirportId)
        || getAirportIfMatchesBase(charter.CurrentAirport, job.BaseAirportId)
        || getAirportIfMatchesBase(charter.DestinationAirport, job.BaseAirportId);

      return Boolean(baseAirport);
    });
  }

  return baseAirport;
};

const getExpiresIn = (dateStr: string): string => {
  const dueDate = new Date(dateStr).getTime();
  const now = Date.now();
  const diffInMinutes = Math.round((dueDate - now) / 60000);

  if (diffInMinutes <= 0) {
    return chalk.red(`${diffInMinutes} mins`);
  }

  if (diffInMinutes <= 240) {
    return chalk.yellow(`${diffInMinutes} mins`);
  }

  return chalk.green(`${diffInMinutes} mins`);
};

const getLegs = (job: Job): Array<Cargo | Charter> => {
  return [...job.Cargos, ...job.Charters];
};

const formatHumanOnly = (leg: Cargo | Charter): string => {
  return leg.HumanOnly ? 'Yes' : 'No';
};

export const logCompanyFboJobs = (companyFbos: Fbo[], companyJobs: Job[]): void => {
  companyFbos.forEach((fbo, index) => {
    const matchingJobs = companyJobs.filter((job) => {
      if (job.BaseAirportId === fbo.AirportId) {
        return true;
      }

      return getJobBaseAirport(job)?.Id === fbo.AirportId;
    });

    console.log(chalk.whiteBright.bold(`${fbo.Airport.ICAO} - ${fbo.Name}`));

    if (!matchingJobs.length) {
      console.log(chalk.grey('No pending jobs.\n'));
      return;
    }

    const jobTable = cliTable();

    jobTable.push([
      chalk.green('Job Type'),
      chalk.green('Description'),
      chalk.green('Legs'),
      chalk.green('Current'),
      chalk.green('Dest'),
      chalk.green('Distance'),
      chalk.green('Human Req.'),
      chalk.green('Expires'),
      chalk.green('Pay'),
      chalk.green('XP'),
    ]);

    matchingJobs.forEach((job) => {
      const legs = getLegs(job);

      jobTable.push([
        job.MissionType.ShortName,
        job.Description || null,
        `${legs.length} legs`,
        null,
        null,
        `${Math.round(job.TotalDistance)} mi`,
        null,
        getExpiresIn(job.ExpirationDate),
        `${job.Pay}`,
        `+${job.XP}`,
      ]);

      legs.forEach((leg) => {
        jobTable.push([
          null,
          leg.Description,
          null,
          leg.CurrentAirport?.ICAO || null,
          leg.DestinationAirport?.ICAO || null,
          `${leg.Distance} mi`,
          formatHumanOnly(leg),
          null,
          null,
          null,
        ]);
      });
    });

    console.log(jobTable.toString());

    if (index < companyFbos.length - 1) {
      console.log('');
    }
  });
};
