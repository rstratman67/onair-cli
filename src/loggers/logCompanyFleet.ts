import chalk from 'chalk';
import { Aircraft, aircraftStatuses } from 'onair-api';

import { cliTable } from '../utils/cli-table';

export interface CompanyFleetLogOptions {
  detail?: boolean;
  inFlight?: boolean;
  maintenance?: boolean;
}

export const isAircraftInFlight = (aircraft: Aircraft): boolean => {
  return aircraft.AircraftStatus === 3;
};

export const requiresAircraftMaintenance = (aircraft: Aircraft): boolean => {
  const maintenanceAircraft = aircraft as Aircraft & { MustDoMaintenanceSoon?: boolean };
  return Boolean(aircraft.MustDoMaintenance || maintenanceAircraft.MustDoMaintenanceSoon);
};

export const getAircraftLocation = (aircraft: Aircraft): string => {
  return isAircraftInFlight(aircraft) ? 'InFlight' : aircraft.CurrentAirport?.ICAO || '-';
};

export const getAircraftStatusName = (aircraft: Aircraft): string => {
  return aircraft.AircraftStatusName || aircraftStatuses[aircraft.AircraftStatus] || String(aircraft.AircraftStatus);
};

export const sortCompanyFleet = (companyFleet: Aircraft[]): Aircraft[] => {
  return [...companyFleet].sort((a, b) => {
    const typeSort = a.AircraftType.DisplayName.localeCompare(b.AircraftType.DisplayName);
    return typeSort !== 0 ? typeSort : a.Identifier.localeCompare(b.Identifier);
  });
};

const formatHours = (hours: number): string => hours.toFixed(2);

const formatCondition = (condition: number): string => `${(condition * 100).toFixed(2)}%`;

const formatMeasurement = (value: number | string | undefined, unit: string): string => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? `${numericValue.toFixed(2)} ${unit}` : '-';
};

const formatEngines = (aircraft: Aircraft): string => {
  const engines = aircraft.Engines as Array<{
    Condition?: number;
    EngineHours?: number;
    Number?: number;
  }>;

  return [...engines]
    .sort((a, b) => (a.Number || 0) - (b.Number || 0))
    .map((engine) => {
      const engineNumber = engine.Number ?? '-';
      const engineHours = typeof engine.EngineHours === 'number' ? formatHours(engine.EngineHours) : '-';
      const engineCondition = typeof engine.Condition === 'number' ? formatCondition(engine.Condition) : '-';
      return `#${engineNumber}: ${engineHours}h / ${engineCondition}`;
    })
    .join('; ') || '-';
};

export const logCompanyFleet = (
  companyFleet: Aircraft[],
  options: CompanyFleetLogOptions = {},
): void => {
  const aircraftTable = cliTable();
  const showMaintenance = Boolean(options.maintenance || options.detail);
  const showInFlightDetails = Boolean(options.inFlight);

  aircraftTable.push([
    chalk.green('Name'),
    chalk.green('Ident'),
    chalk.green('Airport'),
    chalk.green('Status'),
    ...(showInFlightDetails ? [
      chalk.green('Speed'),
      chalk.green('Altitude'),
    ] : []),
    ...(showMaintenance ? [
      chalk.green('Airframe Hours'),
      chalk.green('Airframe Condition'),
      chalk.green('Hours Before Inspection'),
    ] : []),
    ...(options.detail ? [
      chalk.green('Engines (Hours / Condition)'),
      chalk.green('Aircraft ID'),
    ] : []),
  ]);

  companyFleet.forEach((aircraft) => {
    aircraftTable.push([
      chalk.whiteBright(aircraft.AircraftType.DisplayName),
      aircraft.Identifier,
      getAircraftLocation(aircraft),
      getAircraftStatusName(aircraft),
      ...(showInFlightDetails ? (() => {
        const telemetry = aircraft as unknown as {
          Altitude?: number | string;
          GroundSpeed?: number;
          IndicatedSpeed?: number;
        };
        return [
          formatMeasurement(telemetry.GroundSpeed ?? telemetry.IndicatedSpeed, 'kts'),
          formatMeasurement(telemetry.Altitude, 'ft'),
        ];
      })() : []),
      ...(showMaintenance ? [
        formatHours(aircraft.airframeHours),
        formatCondition(aircraft.airframeCondition),
        formatHours(aircraft.HoursBefore100HInspection),
      ] : []),
      ...(options.detail ? [formatEngines(aircraft), aircraft.Id] : []),
    ]);
  });

  console.log(aircraftTable.toString());
};
