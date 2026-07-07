import { Job } from 'onair-api';

import { getOnAirContent } from './onAirRequest';

export const getCompanyJobs = async (
  companyId: string,
  apiKey: string,
  completed = false
): Promise<Job[]> => {
  return getOnAirContent<Job>(
    `https://server1.onair.company/api/v1/company/${companyId}/jobs/${completed ? 'completed' : 'pending'}`,
    apiKey,
    `Company Id "${companyId}" not found`
  );
};
