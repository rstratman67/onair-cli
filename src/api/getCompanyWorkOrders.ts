import axios from 'axios';

export interface CompanyWorkOrder {
  [key: string]: unknown;
}

interface CompanyWorkOrdersResponse {
  Error: string;
  Content?: CompanyWorkOrder[] | CompanyWorkOrder;
}

const getCompanyWorkOrdersUrl = (companyId: string, aircraftId?: string): string => {
  return aircraftId
    ? `https://server1.onair.company/api/v1/company/${companyId}/workorders/${aircraftId}`
    : `https://server1.onair.company/api/v1/company/${companyId}/workorders`;
};

export const getCompanyWorkOrders = async (companyId: string, apiKey: string, aircraftId?: string): Promise<CompanyWorkOrder[]> => {
  try {
    const response = await axios.get<CompanyWorkOrdersResponse>(
      getCompanyWorkOrdersUrl(companyId, aircraftId),
      {
        headers: {
          'oa-apikey': apiKey,
          'Accept': 'application/json',
        },
      }
    );

    if (typeof response.data.Content === 'undefined') {
      throw new Error(response.data.Error ? response.data.Error : `Company Id "${companyId}" not found`);
    }

    return Array.isArray(response.data.Content) ? response.data.Content : [response.data.Content];
  } catch (e) {
    throw new Error(e.response?.status === 400 ? `Company Id "${companyId}" not found` : e.message);
  }
};
