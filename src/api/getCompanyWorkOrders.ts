import axios, { AxiosRequestConfig } from 'axios';

import { CompanyWorkOrder } from '../types/CompanyWorkOrder';

interface CompanyWorkOrderResponse {
  Error?: string;
  Content?: CompanyWorkOrder[];
}

const endpointCandidates = [
  'workorders',
  'work-orders',
  'workOrders',
];

export const getCompanyWorkOrders = async (companyId: string, apiKey: string) => {
  const axiosConfig: AxiosRequestConfig = {
    headers: {
      'oa-apikey': apiKey,
      'Accept': 'application/json',
      'User-Agent': `onair-cli v${process.env.npm_package_version || 'dev'}`
    },
  };

  let lastError: Error | undefined;

  for (const endpoint of endpointCandidates) {
    try {
      const response = await axios.get<CompanyWorkOrderResponse>(
        `https://server1.onair.company/api/v1/company/${companyId}/${endpoint}`,
        axiosConfig
      );

      if (typeof response.data.Content !== 'undefined') {
        return response.data.Content;
      }

      throw new Error(response.data.Error || 'Work orders were not returned by the API');
    } catch (e) {
      lastError = e as Error;
    }
  }

  throw lastError || new Error(`Company Id "${companyId}" not found`);
};
