import { Fbo } from 'onair-api';

import { getOnAirContent } from './onAirRequest';

export const getCompanyFbos = async (companyId: string, apiKey: string): Promise<Fbo[]> => {
  return getOnAirContent<Fbo>(
    `https://server1.onair.company/api/v1/company/${companyId}/fbos`,
    apiKey,
    `Company Id "${companyId}" not found`
  );
};
