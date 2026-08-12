const assert = require('assert');

const {
  getAircraftLocation,
  getAircraftStatusName,
  isAircraftInFlight,
  logCompanyFleet,
  requiresAircraftMaintenance,
  sortCompanyFleet,
} = require('../bin/loggers/logCompanyFleet');

const aircraft = (overrides = {}) => ({
  Id: 'aircraft-1',
  Identifier: 'N100AA',
  AircraftType: { DisplayName: 'Zulu Airplane' },
  CurrentAirport: { ICAO: 'KJFK' },
  AircraftStatus: 0,
  AircraftStatusName: 'Idle',
  airframeHours: 123.456,
  airframeCondition: 0.95678,
  HoursBefore100HInspection: 12.345,
  GroundSpeed: 245.678,
  Altitude: 32100.456,
  Engines: [{
    Number: 1,
    Condition: 0.91234,
    EngineHours: 456.789,
  }],
  MustDoMaintenance: false,
  MustDoMaintenanceSoon: false,
  ...overrides,
});

const inFlightAircraft = aircraft({
  AircraftStatus: 3,
  AircraftStatusName: undefined,
});
const maintenanceAircraft = aircraft({ MustDoMaintenance: true });
const maintenanceSoonAircraft = aircraft({ MustDoMaintenanceSoon: true });

assert.strictEqual(isAircraftInFlight(inFlightAircraft), true);
assert.strictEqual(isAircraftInFlight(aircraft()), false);
assert.strictEqual(getAircraftLocation(inFlightAircraft), 'InFlight');
assert.strictEqual(getAircraftLocation(aircraft()), 'KJFK');
assert.strictEqual(getAircraftStatusName(inFlightAircraft), 'InFlight');
assert.strictEqual(requiresAircraftMaintenance(maintenanceAircraft), true);
assert.strictEqual(requiresAircraftMaintenance(maintenanceSoonAircraft), true);
assert.strictEqual(requiresAircraftMaintenance(aircraft()), false);

const sortedFleet = sortCompanyFleet([
  aircraft({ Identifier: 'N200ZZ', AircraftType: { DisplayName: 'Zulu Airplane' } }),
  aircraft({ Identifier: 'N200BB', AircraftType: { DisplayName: 'Alpha Airplane' } }),
  aircraft({ Identifier: 'N100AA', AircraftType: { DisplayName: 'Alpha Airplane' } }),
]);
assert.deepStrictEqual(sortedFleet.map(({ Identifier }) => Identifier), [
  'N100AA',
  'N200BB',
  'N200ZZ',
]);

const captureFleetOutput = (options) => {
  let output = '';
  const originalConsoleLog = console.log;

  try {
    console.log = (value) => {
      output = String(value);
    };
    logCompanyFleet([inFlightAircraft], options);
  } finally {
    console.log = originalConsoleLog;
  }

  return output;
};

const defaultOutput = captureFleetOutput();
assert.doesNotMatch(defaultOutput, /Aircraft ID/);
assert.doesNotMatch(defaultOutput, /aircraft-1/);
assert.match(defaultOutput, /InFlight/);

const maintenanceOutput = captureFleetOutput({ maintenance: true });
assert.doesNotMatch(maintenanceOutput, /Aircraft ID/);
assert.match(maintenanceOutput, /Airframe Hours/);
assert.match(maintenanceOutput, /123\.46/);
assert.match(maintenanceOutput, /95\.68%/);
assert.match(maintenanceOutput, /12\.35/);

const detailOutput = captureFleetOutput({ detail: true });
assert.match(detailOutput, /Engines \(Hours \/ Condition\)/);
assert.match(detailOutput, /#1: 456\.79h \/ 91\.23%/);
assert.match(detailOutput, /Aircraft ID/);
assert.match(detailOutput, /aircraft-1/);
assert.ok(detailOutput.lastIndexOf('aircraft-1') > detailOutput.lastIndexOf('91.23%'));

const inFlightOutput = captureFleetOutput({ inFlight: true });
assert.match(inFlightOutput, /Speed/);
assert.match(inFlightOutput, /Altitude/);
assert.match(inFlightOutput, /245\.68 kts/);
assert.match(inFlightOutput, /32100\.46 ft/);

console.log('Company fleet display, filter, and sorting tests passed.');
