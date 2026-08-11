export type ApiData = unknown[] | Record<string, unknown>;

const baseUrl = '/api';

const request = async (path: string) => {
  const response = await fetch(`${baseUrl}${path}`);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Request failed');
  }
  return response.json();
};

export const getCompany = async () => request('/company');
export const getFbos = async () => request('/company/fbos');
export const getJobs = async () => request('/company/jobs');
export const getWorkOrders = async (icao?: string) => request(`/company/work-orders${icao ? `?aircraftIcao=${encodeURIComponent(icao)}` : ''}`);
export const getFlights = async (page = 1) => request(`/company/flights?page=${page}`);
export const getTradingGoods = async () => request('/company/trading-goods');
