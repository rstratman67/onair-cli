import 'dotenv/config';
import express from 'express';
import path from 'path';
import OnAirApi, { OnAirApiConfig, Company, Flight, Fbo, Job } from 'onair-api';

import { getCompanyWorkOrders } from './api/getCompanyWorkOrders';

const app = express();
const port = process.env.PORT ? Number(process.env.PORT) : 8081;

const getOnAirConfig = (): OnAirApiConfig => {
  const apiKey = process.env.ONAIR_API_KEY;
  const world = process.env.ONAIR_WORLD;
  const companyId = process.env.COMPANY_ID;
  const vaId = process.env.ONAIR_VA_ID;

  if (!apiKey || !world || !companyId) {
    throw new Error('Missing required environment variables: ONAIR_API_KEY, ONAIR_WORLD, COMPANY_ID');
  }

  const normalizedWorld = world.toLowerCase();
  if (!['cumulus', 'stratus', 'thunder'].includes(normalizedWorld)) {
    throw new Error('ONAIR_WORLD must be one of cumulus, stratus, thunder');
  }

  return {
    apiKey,
    world: normalizedWorld as 'cumulus' | 'stratus' | 'thunder',
    companyId,
    vaId,
  };
};

const createApi = () => new OnAirApi(getOnAirConfig());

const buildPath = path.resolve(__dirname, '../dist');
app.use(express.static(buildPath));

app.get('/api/company', async (_req, res) => {
  try {
    const api = createApi();
    const company: Company = await api.getCompany();
    res.json(company);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/api/company/fbos', async (_req, res) => {
  try {
    const api = createApi();
    const companyFbos: Fbo[] = await api.getCompanyFbos();
    res.json(companyFbos);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/api/company/jobs', async (_req, res) => {
  try {
    const api = createApi();
    const companyJobs: Job[] = await api.getCompanyJobs();
    res.json(companyJobs);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/api/company/work-orders', async (req, res) => {
  try {
    const apiConfig = getOnAirConfig();
    const workOrders = await getCompanyWorkOrders(apiConfig.companyId!, apiConfig.apiKey!);
    const filterIcao = typeof req.query.aircraftIcao === 'string' ? req.query.aircraftIcao.toUpperCase() : undefined;
    const filtered = filterIcao
      ? workOrders.filter((item) => {
          const aircraft = item.Aircraft as Record<string, unknown> | undefined;
          return typeof aircraft?.ICAO === 'string' && aircraft.ICAO.toUpperCase() === filterIcao;
        })
      : workOrders;
    res.json(filtered);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/api/company/flights', async (req, res) => {
  try {
    const api = createApi();
    const page = Number(req.query.page) > 0 ? Number(req.query.page) : 1;
    const limit = 20;
    const companyFlights: Flight[] = await api.getCompanyFlights(page, limit);
    res.json(companyFlights);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get('/api/company/trading-goods', async (_req, res) => {
  try {
    const api = createApi();
    const tradingGoodsFunc = (api as any).getCompanyTradingGoods;
    if (typeof tradingGoodsFunc !== 'function') {
      res.status(501).json({ error: 'Trading goods is not available through the current onair-api package.' });
      return;
    }

    const tradingGoods = await tradingGoodsFunc.call(api);
    res.json(tradingGoods);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(buildPath, 'index.html'));
});

app.listen(port, () => {
  console.log(`OnAir web dashboard listening on http://localhost:${port}`);
});
