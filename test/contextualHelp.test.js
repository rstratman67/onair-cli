const assert = require('assert');
const { execFileSync } = require('child_process');
const path = require('path');

const cliPath = path.resolve(__dirname, '..', 'bin', 'index.js');

const getHelp = (args) => execFileSync(process.execPath, [cliPath, ...args], {
  encoding: 'utf8',
});

const workOrdersHelp = getHelp([
  'company',
  'work-orders',
  '--show-crew',
  '--aircraft-ident=N167NZ',
  '--help',
]);

assert.match(workOrdersHelp, /company work-orders \[options\]/);
assert.match(workOrdersHelp, /--aircraft-ident/);
assert.match(workOrdersHelp, /--show-crew/);
assert.doesNotMatch(workOrdersHelp, /--merchandiseType/);
assert.doesNotMatch(workOrdersHelp, /--need-fuel/);
assert.doesNotMatch(workOrdersHelp, /company notifications/);

const tradingGoodsAliasHelp = getHelp(['company', 'trading_goods', '--help']);

assert.match(tradingGoodsAliasHelp, /company trading-goods \[options\]/);
assert.match(tradingGoodsAliasHelp, /--merchandiseType/);
assert.match(tradingGoodsAliasHelp, /--summary/);
assert.doesNotMatch(tradingGoodsAliasHelp, /--show-crew/);

console.log('contextualHelp tests passed');
