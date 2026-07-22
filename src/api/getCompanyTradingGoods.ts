import axios from 'axios';

export interface CompanyTradingGood {
  [key: string]: unknown;
}

interface CompanyTradingGoodsResponse {
  Error: string;
  Content?: CompanyTradingGood[] | CompanyTradingGood;
}

export const getCompanyTradingGoods = async (companyId: string, apiKey: string): Promise<CompanyTradingGood[]> => {
  try {
    const response = await axios.get<CompanyTradingGoodsResponse>(
      `https://server1.onair.company/api/v1/company/${companyId}/trading_goods`,
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
