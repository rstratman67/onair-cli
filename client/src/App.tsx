import { useEffect, useMemo, useState } from 'react';
import {
  getCompany,
  getFbos,
  getJobs,
  getWorkOrders,
  getFlights,
  getTradingGoods,
} from './api';
import { ApiData, DataRow } from './types';

const tabs = [
  'Company',
  'FBOs',
  'Jobs',
  'Work Orders',
  'Flights',
  'Trading Goods',
] as const;

type Tab = (typeof tabs)[number];

const normalizeRows = (data: ApiData): DataRow[] => {
  if (Array.isArray(data)) {
    return data.map((row) => ({
      id: row.Id || row.id || row.Name || row.name || JSON.stringify(row),
      record: row,
    }));
  }

  return [{ id: '0', record: data }];
};

const objectKeys = (rows: DataRow[]): string[] => {
  const keys = new Set<string>();
  rows.forEach((row) => {
    if (row.record && typeof row.record === 'object' && !Array.isArray(row.record)) {
      Object.keys(row.record).forEach((key) => keys.add(key));
    }
  });
  return Array.from(keys);
};

const renderCell = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
};

const App = () => {
  const [activeTab, setActiveTab] = useState<Tab>('Company');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ApiData>([]);
  const [icaoFilter, setIcaoFilter] = useState('');
  const [flightPage, setFlightPage] = useState(1);

  const rows = useMemo(() => normalizeRows(data), [data]);
  const columns = useMemo(() => objectKeys(rows), [rows]);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const fetchData = async () => {
      try {
        switch (activeTab) {
          case 'Company':
            setData(await getCompany());
            break;
          case 'FBOs':
            setData(await getFbos());
            break;
          case 'Jobs':
            setData(await getJobs());
            break;
          case 'Work Orders':
            setData(await getWorkOrders(icaoFilter));
            break;
          case 'Flights':
            setData(await getFlights(flightPage));
            break;
          case 'Trading Goods':
            setData(await getTradingGoods());
            break;
        }
      } catch (err) {
        setError((err as Error).message || 'Unable to load data');
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [activeTab, icaoFilter, flightPage]);

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>OnAir Dashboard</h1>
          <p className="subtitle">Browse flights, FBOs, jobs, work orders, and trading goods.</p>
        </div>
        <div className="status">
          <span className="badge">API v1</span>
          <span className="badge">{activeTab}</span>
        </div>
      </header>

      <nav className="tabs">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={tab === activeTab ? 'tab active' : 'tab'}
            onClick={() => {
              setActiveTab(tab);
              setError(null);
              setFlightPage(1);
            }}
          >
            {tab}
          </button>
        ))}
      </nav>

      <section className="controls">
        {activeTab === 'Work Orders' && (
          <label>
            Filter ICAO:
            <input
              value={icaoFilter}
              onChange={(e) => setIcaoFilter(e.target.value.toUpperCase())}
              placeholder="C172"
            />
          </label>
        )}

        {activeTab === 'Flights' && (
          <div className="pagination">
            <button onClick={() => setFlightPage((page) => Math.max(page - 1, 1))} disabled={flightPage <= 1}>
              Prev
            </button>
            <span>Page {flightPage}</span>
            <button onClick={() => setFlightPage((page) => page + 1)}>Next</button>
          </div>
        )}
      </section>

      <section className="content">
        {loading && <div className="notice">Loading {activeTab}...</div>}
        {error && <div className="error">{error}</div>}
        {!loading && !error && columns.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  {columns.map((column) => (
                    <th key={column}>{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.id ?? index}>
                    <td>{index + 1}</td>
                    {columns.map((column) => (
                      <td key={`${row.id}-${column}`}>
                        <pre>{renderCell((row.record as any)[column])}</pre>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && !error && columns.length === 0 && <div className="notice">No data found for this view.</div>}
      </section>
    </div>
  );
};

export default App;
