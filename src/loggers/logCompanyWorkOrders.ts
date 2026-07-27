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

    if (typeof actionStatus !== 'undefined') {
      return actionStatus === 1;
    }

    const hasFinished = Boolean(action?.EndedTime || action?.FailedTime);
    return !hasFinished && Boolean(
      action?.StartedTime
      || action?.FlightId
      || action?.CurrentFlightId
    );
  });
};

export const getWorkOrderStatus = (workOrder: CompanyWorkOrder) => {
  const numericStatus = toNumberValue(workOrder.Status);

  if (typeof numericStatus !== 'undefined') {
    if (
      numericStatus === 1
      && (
        hasActiveAction(workOrder)
        || workOrder.IsTicking === true
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

const formatDateValue = (value: unknown): string | undefined => {
  const dateString = toStringValue(value);

  if (!dateString) {
    return undefined;
  }

  const date = new Date(dateString);
  return Number.isNaN(date.getTime()) ? dateString : date.toLocaleString('en-GB');
};

export const getWorkOrderExpectedStart = (workOrder: CompanyWorkOrder): string | undefined => {
  return getWorkOrderStatus(workOrder) === 'Pending'
    ? formatDateValue(workOrder.StartDate)
    : undefined;
};

const formatNumberValue = (value: unknown, suffix = ''): string | undefined => {
  const number = toNumberValue(value);
  return typeof number === 'undefined' ? undefined : `${number.toLocaleString('en-GB')}${suffix}`;
};

const getAirportDisplay = (value: unknown, fallbackId: unknown): string | undefined => {
  const airport = toRecord(value);

  return pickFirstString([
    airport?.ICAO,
    airport?.Icao,
    airport?.Name,
    fallbackId,
  ]);
};

const getActionStatus = (action: Record<string, unknown>): string | undefined => {
  const displayStatus = pickFirstString([action.StatusDisplay, action.CurrentStatus, action.State]);

  if (displayStatus) {
    return displayStatus;
  }

  const status = toNumberValue(action.Status);

  if (typeof status === 'undefined') {
    return undefined;
  }

  return ({
    0: 'Pending',
    1: 'In Progress',
    2: 'Finished',
    3: 'Failed',
  } as Record<number, string>)[status] || `UNKNOWN (${status})`;
};

const getActionStep = (action: Record<string, unknown>): string | undefined => {
  const step = toNumberValue(action.Step);
  return typeof step === 'undefined' ? undefined : `Step ${step}`;
};

const getActionLoadDisplay = (value: unknown): string | undefined => {
  const load = toRecord(value);

  if (!load) {
    return undefined;
  }

  const cargo = toRecord(load.Cargo);
  const charter = toRecord(load.Charter);
  const description = pickFirstString([
    cargo?.Description,
    charter?.Description,
    load.CargoId,
    load.CharterId,
  ]);
  const cargoWeight = formatNumberValue(load.CargoWeight, ' lb');
  const passengerCount = formatNumberValue(load.PassengerNumber, ' PAX');
  const required = load.Required === true ? 'required' : undefined;
  const parts = [description, cargoWeight, passengerCount, required]
    .filter((part): part is string => typeof part === 'string');

  return parts.length ? parts.join(', ') : undefined;
};

const getActionPassengerDisplay = (value: unknown): string | undefined => {
  const passenger = toRecord(value);

  if (!passenger) {
    return undefined;
  }

  return getCrewDisplayName(passenger.People) || pickFirstString([passenger.PeopleId]);
};

const getActionFlags = (action: Record<string, unknown>): string | undefined => {
  const flags = [
    action.DontLoadFuel === true ? 'Do not load fuel' : undefined,
    action.WaitingForCargoPAX === true ? 'Waiting for cargo/PAX' : undefined,
    action.FinishedAtAlternate === true ? 'Finished at alternate' : undefined,
    action.ForceCrewToRestAtEnd === true ? 'Crew rests at end' : undefined,
  ].filter((flag): flag is string => typeof flag === 'string');

  return flags.length ? flags.join(' / ') : undefined;
};

const pushDetailRow = (table: ReturnType<typeof cliTable>, label: string, value: unknown) => {
  const displayValue = typeof value === 'string' && value.length ? value : '-';
  table.push([chalk.green(label), displayValue]);
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
  const showExpectedStart = workOrders.some((workOrder) => getWorkOrderStatus(workOrder) === 'Pending');

  const headerRow = [
    chalk.green('Aircraft'),
    chalk.green('Ident'),
    chalk.green('Status'),
  ];

  if (showExpectedStart) {
    headerRow.push(chalk.green('Expected Start'));
  }

  headerRow.push(chalk.green('Summary'));

  if (showCrewAssigned) {
    headerRow.push(chalk.green('Crew Assigned'));
  }

  if (showWorkOrderId) {
    headerRow.push(chalk.green('Work Order ID'));
  }

  workOrderTable.push(headerRow);

  workOrders.forEach((workOrder) => {
    const status = getWorkOrderStatus(workOrder);
    const row = [
      getWorkOrderAircraftDisplayName(workOrder) || '-',
      getWorkOrderAircraftIdentifier(workOrder) || '-',
      status || '-',
    ];

    if (showExpectedStart) {
      row.push(getWorkOrderExpectedStart(workOrder) || '-');
    }

    row.push(getWorkOrderSummary(workOrder) || '-');

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

export const logCompanyWorkOrderDetails = (workOrder: CompanyWorkOrder) => {
  console.log(chalk.greenBright.bold('Work order details\n'));

  const detailsTable = cliTable();
  pushDetailRow(detailsTable, 'Work Order ID', workOrder.Id);
  pushDetailRow(detailsTable, 'Aircraft', getWorkOrderAircraftDisplayName(workOrder));
  pushDetailRow(detailsTable, 'Ident', getWorkOrderAircraftIdentifier(workOrder));
  pushDetailRow(detailsTable, 'Aircraft ICAO', getWorkOrderAircraftIcao(workOrder));
  pushDetailRow(detailsTable, 'Status', getWorkOrderStatus(workOrder));
  pushDetailRow(detailsTable, 'Summary', getWorkOrderSummary(workOrder));
  pushDetailRow(detailsTable, 'Start Date', formatDateValue(workOrder.StartDate));
  pushDetailRow(
    detailsTable,
    'Departure Airport',
    getAirportDisplay(workOrder.DepartureAirport, workOrder.DepartureAirportId)
  );
  pushDetailRow(detailsTable, 'Crew Assigned', getWorkOrderAssignedCrew(workOrder));
  pushDetailRow(detailsTable, 'Processing', workOrder.IsTicking === true ? 'Active' : 'Inactive');
  console.log(detailsTable.toString());

  const actions = toArray(workOrder.Actions);

  if (!actions.length) {
    console.log('\nNo actions found for this work order.');
    return;
  }

  actions.forEach((actionValue, index) => {
    const action = toRecord(actionValue);

    if (!action) {
      return;
    }

    const actionNumber = index + 1;
    const actionName = pickFirstString([action.Name]) || `Action ${actionNumber}`;
    console.log(chalk.whiteBright.bold(`\n${actionNumber}. ${actionName}`));

    const actionTable = cliTable();
    pushDetailRow(actionTable, 'Action ID', pickFirstString([action.Id]));
    pushDetailRow(actionTable, 'Status', getActionStatus(action));
    pushDetailRow(actionTable, 'Step', getActionStep(action));
    pushDetailRow(
      actionTable,
      'Destination',
      getAirportDisplay(action.FlyDestinationAirport, action.FlyDestinationAirportId)
    );
    pushDetailRow(
      actionTable,
      'Alternate',
      getAirportDisplay(action.FlyAlternateAirport, action.FlyAlternateAirportId)
    );
    pushDetailRow(actionTable, 'Flight ID', pickFirstString([action.FlightId, action.CurrentFlightId]));
    pushDetailRow(actionTable, 'Fuel to Load', formatNumberValue(action.FuelToLoadGallons, ' gal'));
    pushDetailRow(
      actionTable,
      'FOB Before Refuel',
      formatNumberValue(action.ActualFOBAtDepartureBeforeRefuel, ' gal')
    );
    pushDetailRow(actionTable, 'Started', formatDateValue(action.StartedTime));
    pushDetailRow(actionTable, 'Failed', formatDateValue(action.FailedTime));
    pushDetailRow(actionTable, 'Ended', formatDateValue(action.EndedTime));

    const loads = toArray(action.Loads)
      .map(getActionLoadDisplay)
      .filter((load): load is string => typeof load === 'string');
    const passengers = toArray(action.Passengers)
      .map(getActionPassengerDisplay)
      .filter((passenger): passenger is string => typeof passenger === 'string');
    pushDetailRow(actionTable, 'Loads', loads.length ? loads.join(' / ') : undefined);
    pushDetailRow(actionTable, 'Passengers', passengers.length ? passengers.join(' / ') : undefined);
    pushDetailRow(actionTable, 'Flags', getActionFlags(action));
    console.log(actionTable.toString());
  });
};
