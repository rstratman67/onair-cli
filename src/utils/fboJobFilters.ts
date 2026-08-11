import { Cargo, Charter, Job } from 'onair-api';

export interface FboJobFilters {
  pendingOnly?: boolean;
  departureIcao?: string;
  arrivalIcao?: string;
}

const getJobLegs = (job: Job): Array<Cargo | Charter> => {
  return [...job.Cargos, ...job.Charters];
};

const normalizeIcao = (icao: string | undefined): string | undefined => {
  const normalizedIcao = icao?.trim().toLocaleUpperCase();
  return normalizedIcao || undefined;
};

export const isPendingFboJob = (job: Job): boolean => {
  return job.State === 0;
};

export const matchesFboJobFilters = (job: Job, filters: FboJobFilters): boolean => {
  if (filters.pendingOnly && !isPendingFboJob(job)) {
    return false;
  }

  const departureIcao = normalizeIcao(filters.departureIcao);
  const arrivalIcao = normalizeIcao(filters.arrivalIcao);

  if (!departureIcao && !arrivalIcao) {
    return true;
  }

  return getJobLegs(job).some((leg) => {
    const matchesDeparture = departureIcao
      ? leg.CurrentAirport?.ICAO?.toLocaleUpperCase() === departureIcao
      : true;
    const matchesArrival = arrivalIcao
      ? leg.DestinationAirport?.ICAO?.toLocaleUpperCase() === arrivalIcao
      : true;

    return matchesDeparture && matchesArrival;
  });
};
