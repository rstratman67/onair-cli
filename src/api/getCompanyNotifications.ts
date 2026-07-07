import axios from 'axios';

export interface CompanyNotification {
  Id: string;
  AircraftId?: string;
  PeopleId?: string;
  CompanyId: string;
  IsRead: boolean;
  IsNotification: boolean;
  ZuluEventTime: string;
  Category: number;
  Action: number;
  Description: string;
  Amount: number;
}

interface CompanyNotificationsResponse {
  Error: string;
  Content?: CompanyNotification[] | CompanyNotification;
}

export const getCompanyNotifications = async (
  companyId: string,
  apiKey: string,
  startIndex = 0,
  limit = 20
): Promise<CompanyNotification[]> => {
  try {
    const response = await axios.get<CompanyNotificationsResponse>(
      `https://server1.onair.company/api/v1/company/${companyId}/notifications`,
      {
        headers: {
          'oa-apikey': apiKey,
          'Accept': 'application/json',
        },
        params: {
          startIndex,
          limit,
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
