import { Job } from 'onair-api';

import { getOnAirContent } from './onAirRequest';

export const getFboJobs = async (fboId: string, apiKey: string): Promise<Job[]> => {
  return getOnAirContent<Job>(
    `https://server1.onair.company/api/v1/fbo/${fboId}/jobs`,
    apiKey,
    `FBO Id "${fboId}" not found`
  );
};
