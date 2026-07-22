import chalk from 'chalk';

import { CompanyWorkOrder } from '../types/CompanyWorkOrder';
import { cliTable } from '../utils/cli-table';

const toRecord = (value: unknown): Record<string, unknown> | undefined => {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : undefined;
};

const toStringValue = (value: unknown): string | undefined => {
  return typeof value === 'string' && value.trim().length ? value : undefined;
};

const toNumberValue = (value: unknown): number | undefined => {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
};

const pickFirstString = (values: unknown[]): string | undefined => {
  for (const value of values) {
    const str = toStringValue(value);
    if (str) {
      return str;
    }
  }

  return undefined;
};

const getAircraftRecord = (workOrder: CompanyWorkOrder) => toRecord(workOrder.Aircraft);
const getAircraftTypeRecord = (workOrder: CompanyWorkOrder) => {
  const aircraftRecord = getAircraftRecord(workOrder);
  return toRecord(aircraftRecord?.AircraftType) || toRecord(workOrder.AircraftType);
};

export const getWorkOrderAircraftDisplayName = (workOrder: CompanyWorkOrder) => {
  const aircraftType = getAircraftTypeRecord(workOrder);

  return pickFirstString([
    workOrder.AircraftDisplayName,
    aircraftType?.DisplayName,
    workOrder.AircraftName,
  ]);
};

export const getWorkOrderAircraftIcao = (workOrder: CompanyWorkOrder) => {
  const aircraftType = getAircraftTypeRecord(workOrder);

  return pickFirstString([
    workOrder.AircraftIcao,
    workOrder.AircraftICAO,
    aircraftType?.ICAO,
    aircraftType?.Icao,
    aircraftType?.IcaoCode,
  ]);
};

export const getWorkOrderAircraftIdentifier = (workOrder: CompanyWorkOrder) => {
  const aircraft = getAircraftRecord(workOrder);

  return pickFirstString([
    workOrder.AircraftIdentifier,
    aircraft?.Identifier,
  ]);
};

const toArray = (value: unknown): unknown[] => {
  return Array.isArray(value) ? value : [];
};

const hasActiveAction = (workOrder: CompanyWorkOrder) => {
  const actions = toArray(workOrder.Actions);

  return actions.some((actionValue) => {
    const action = toRecord(actionValue);
    const actionStatus = toNumberValue(action?.Status);

    return Boolean(
      action?.StartedTime
      || action?.FlightId
      || action?.CurrentFlightId
      || actionStatus === 1
    );
  });
};

const getWorkOrderStatus = (workOrder: CompanyWorkOrder) => {
  const numericStatus = toNumberValue(workOrder.Status);
  const aircraft = getAircraftRecord(workOrder);
  const aircraftStatus = toNumberValue(aircraft?.AircraftStatus);

  if (typeof numericStatus !== 'undefined') {
    if (
      numericStatus === 1
      && (
        hasActiveAction(workOrder)
        || workOrder.IsTicking === true
        || aircraftStatus === 3
      )
    ) {
      return 'In Progress';
    }

    const mappedStatus = ({
      0: 'Inactive',
      1: 'Pending',
      2: 'Finished',
      3: 'Failed',
      4: 'Waiting',
    } as Record<number, string>)[numericStatus];

    return mappedStatus || `UNKNOWN (${numericStatus})`;
  }

  return pickFirstString([
    workOrder.CurrentStatus,
    workOrder.WorkOrderStatus,
    workOrder.State,
  ]) || 'UNKNOWN';
};

const getWorkOrderSummary = (workOrder: CompanyWorkOrder) => {
  return pickFirstString([
    workOrder.Description,
    workOrder.Name,
    workOrder.Title,
    workOrder.Category,
  ]);
};

const getCrewDisplayName = (value: unknown): string | undefined => {
  if (typeof value === 'string' && value.trim().length) {
    return value;
  }

  const record = toRecord(value);

  if (!record) {
    return undefined;
  }

  const nestedEmployee = toRecord(record.Employee)
    || toRecord(record.CrewMember)
    || toRecord(record.Person)
    || toRecord(record.People);
  const firstName = pickFirstString([record.FirstName, nestedEmployee?.FirstName]);
  const lastName = pickFirstString([record.LastName, nestedEmployee?.LastName]);
  const combinedName = [firstName, lastName].filter((part): part is string => Boolean(part)).join(' ');

  if (combinedName) {
    return combinedName;
  }

  return pickFirstString([
    record.DisplayName,
    record.Name,
    record.Nickname,
    record.Pseudo,
    record.InitialPseudo,
    nestedEmployee?.DisplayName,
    nestedEmployee?.Name,
    nestedEmployee?.Nickname,
    nestedEmployee?.Pseudo,
    nestedEmployee?.InitialPseudo,
  ]);
};

const getCrewRoleName = (value: unknown) => {
  const record = toRecord(value);
  const role = toNumberValue(record?.Role);

  if (typeof role === 'undefined') {
    return undefined;
  }

  return ({
    0: 'Pilot',
    1: 'Copilot',
    2: 'Cabin Crew',
  } as Record<number, string>)[role] || `Role ${role}`;
};

export const getWorkOrderAssignedCrew = (workOrder: CompanyWorkOrder) => {
  const crewValues = [
    ...toArray(workOrder.AssignedCrew),
    ...toArray(workOrder.AssignedCrews),
    ...toArray(workOrder.Crew),
    ...toArray(workOrder.Crews),
    ...toArray(workOrder.Employees),
  ];

  const crewNames = crewValues
    .map((crewValue) => {
      const crewName = getCrewDisplayName(crewValue);
      if (!crewName) {
        return undefined;
      }

      const crewRole = getCrewRoleName(crewValue);
      return crewRole ? `${crewName} (${crewRole})` : crewName;
    })
    .filter((name): name is string => Boolean(name));

  return crewNames.length ? crewNames.join(' / ') : undefined;
};

export const logCompanyWorkOrders = (
  workOrders: CompanyWorkOrder[],
  showCrewAssigned = false,
  showWorkOrderId = false
) => {
  const workOrderTable = cliTable();

  const headerRow = [
    chalk.green('Aircraft'),
    chalk.green('Ident'),
    chalk.green('Status'),
    chalk.green('Summary'),
  ];

  if (showCrewAssigned) {
    headerRow.push(chalk.green('Crew Assigned'));
  }

  if (showWorkOrderId) {
    headerRow.push(chalk.green('Work Order ID'));
  }

  workOrderTable.push(headerRow);

  workOrders.forEach((workOrder) => {
    const row = [
      getWorkOrderAircraftDisplayName(workOrder) || '-',
      getWorkOrderAircraftIdentifier(workOrder) || '-',
      getWorkOrderStatus(workOrder) || '-',
      getWorkOrderSummary(workOrder) || '-',
    ];

    if (showCrewAssigned) {
      row.push(getWorkOrderAssignedCrew(workOrder) || '-');
    }

    if (showWorkOrderId) {
      row.push(workOrder.Id || '-');
    }

    workOrderTable.push(row);
  });

  console.log(workOrderTable.toString());
};
