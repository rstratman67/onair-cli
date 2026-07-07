import axios, { AxiosRequestConfig } from 'axios';
import https from 'https';

const onAirHttpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

interface OnAirResponse<T> {
  Error?: string;
  Content?: T | T[];
}

export const getOnAirContent = async <T>(
  url: string,
  apiKey: string,
  notFoundMessage: string,
  requestData?: Record<string, unknown>
): Promise<T[]> => {
  try {
    const axiosConfig: AxiosRequestConfig = {
      headers: {
        'oa-apikey': apiKey,
        'Accept': 'application/json',
      },
      httpsAgent: onAirHttpsAgent,
    };

    if (typeof requestData !== 'undefined') {
      axiosConfig.params = requestData;
    }

    const response = await axios.get<OnAirResponse<T>>(url, axiosConfig);

    if (typeof response.data.Content === 'undefined') {
      throw new Error(response.data.Error ? response.data.Error : notFoundMessage);
    }

    return Array.isArray(response.data.Content) ? response.data.Content : [response.data.Content];
  } catch (e) {
    throw new Error(e.response?.status === 400 ? notFoundMessage : e.message);
  }
};
