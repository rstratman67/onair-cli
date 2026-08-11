const assert = require('assert');

const {
  isPendingFboJob,
  matchesFboJobFilters,
} = require('../bin/utils/fboJobFilters');

const airport = (ICAO) => ({ ICAO });
const leg = (departure, arrival) => ({
  CurrentAirport: airport(departure),
  DestinationAirport: airport(arrival),
});
const job = (State, legs) => ({
  State,
  Cargos: legs,
  Charters: [],
});

const pendingJob = job(0, [
  leg('KJFK', 'KORD'),
  leg('KORD', 'KDEN'),
]);
const takenJob = job(1, [leg('KJFK', 'KORD')]);

assert.strictEqual(isPendingFboJob(pendingJob), true);
assert.strictEqual(isPendingFboJob(takenJob), false);
assert.strictEqual(matchesFboJobFilters(pendingJob, { pendingOnly: true }), true);
assert.strictEqual(matchesFboJobFilters(takenJob, { pendingOnly: true }), false);
assert.strictEqual(matchesFboJobFilters(pendingJob, { departureIcao: 'kjfk' }), true);
assert.strictEqual(matchesFboJobFilters(pendingJob, { arrivalIcao: 'kden' }), true);
assert.strictEqual(matchesFboJobFilters(pendingJob, {
  departureIcao: 'KJFK',
  arrivalIcao: 'KORD',
}), true);
assert.strictEqual(matchesFboJobFilters(pendingJob, {
  departureIcao: 'KJFK',
  arrivalIcao: 'KDEN',
}), false, 'departure and arrival must match the same leg');
assert.strictEqual(matchesFboJobFilters(pendingJob, { departureIcao: 'KLAX' }), false);

console.log('FBO job filter tests passed.');
