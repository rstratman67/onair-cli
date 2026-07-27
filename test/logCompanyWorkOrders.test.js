const assert = require('assert');

const {
  getWorkOrderExpectedStart,
  getWorkOrderStatus,
  logCompanyWorkOrders,
} = require('../bin/loggers/logCompanyWorkOrders');

const aircraft = {
  AircraftStatus: 3,
  Identifier: 'NTEST',
};

const cases = [
  {
    name: 'pending work order for an active aircraft',
    workOrder: { Status: 1, Aircraft: aircraft, Actions: [{ Status: 0 }] },
    expected: 'Pending',
  },
  {
    name: 'work order with an active action',
    workOrder: { Status: 1, Aircraft: aircraft, Actions: [{ Status: 1 }] },
    expected: 'In Progress',
  },
  {
    name: 'pending work order with a finished action lacking status',
    workOrder: {
      Status: 1,
      Aircraft: aircraft,
      Actions: [{
        StartedTime: '2026-07-27T10:00:00Z',
        EndedTime: '2026-07-27T11:00:00Z',
        FlightId: 'finished-flight',
      }],
    },
    expected: 'Pending',
  },
  {
    name: 'finished work order with historical activity',
    workOrder: {
      Status: 2,
      Aircraft: aircraft,
      Actions: [{
        Status: 2,
        StartedTime: '2026-07-27T10:00:00Z',
        EndedTime: '2026-07-27T11:00:00Z',
      }],
    },
    expected: 'Finished',
  },
  {
    name: 'waiting work order',
    workOrder: { Status: 4, Aircraft: aircraft, Actions: [{ Status: 0 }] },
    expected: 'Waiting',
  },
];

cases.forEach(({ name, workOrder, expected }) => {
  assert.strictEqual(getWorkOrderStatus(workOrder), expected, name);
});

const pendingWithStart = {
  Status: 1,
  StartDate: '2026-07-28T13:30:00',
  Aircraft: aircraft,
  Actions: [{ Status: 0 }],
};
const activeWithStart = {
  ...pendingWithStart,
  Actions: [{ Status: 1 }],
};

assert.match(getWorkOrderExpectedStart(pendingWithStart), /28\/07\/2026.*13:30:00/);
assert.strictEqual(getWorkOrderExpectedStart(activeWithStart), undefined);

let tableOutput = '';
const originalConsoleLog = console.log;

try {
  console.log = (value) => {
    tableOutput = String(value);
  };
  logCompanyWorkOrders([pendingWithStart, activeWithStart]);
} finally {
  console.log = originalConsoleLog;
}

assert.match(tableOutput, /Expected Start/);
assert.match(tableOutput, /28\/07\/2026.*13:30:00/);

console.log(`Passed ${cases.length} status cases and expected-start display cases.`);
