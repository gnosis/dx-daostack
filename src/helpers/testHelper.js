const debug = require('debug')('test:helper');
const DEFAULT_GAS = 4712388;
const daoServiceFactory = require('../../src/services/daoService/daoServiceFactory');
const dxServiceFactory = require('../../src/services/dxService/dxServiceFactory');

const getDaoStackContracts = require('../../src/repositories/daostack/util/getDaoStackContracts');
const getDxContracts = require('../../src/repositories/dx/util/getDxContracts');

let web3, artifacts, accounts, daoService, dxService;

async function setupDao ({
  // Optional params
  organizationName = 'testOrg',
  tokenName = 'TEST',
  tokenSymbol = 'TST',
  founders = null,
  controller = 0,
  cap = 0,
  schemes
}) {
  // Setup Dao
  if (!founders && accounts) {
    founders = [{
      account: accounts[0],
      tokenAmount: 0,
      reputationAmount: 0
    }];
    debug('Using default founders: %o', founders);
  } else {
    debug('Using the provided founders: %o', founders);
  }

  debug('Creating organization %s with %d schemes', organizationName, schemes.length);
  return daoService.createOrganization({
    organizationName,
    tokenName,
    tokenSymbol,
    founders,
    controller,
    cap,
    schemes
  });
}

async function getTimestampRangeFromDeltas ({
  startTimeDelta,
  endTimeDelta
}) {
  const now = await web3.eth.getBlock('latest').timestamp;
  const lockingStartTime = now + startTimeDelta;
  const lockingEndTime = now + endTimeDelta;

  return [ lockingStartTime, lockingEndTime ];
}

const makeSnapshotFactory = (web3) => () => {
  return web3.currentProvider.send({
    jsonrpc: '2.0',
    method: 'evm_snapshot'
  }).result;
};

const revertSnapshotFactory = (web3) => snapshotId => {
  web3.currentProvider.send({
    jsonrpc: '2.0',
    method: 'evm_revert',
    params: [snapshotId]
  });
};

module.exports = async ({
  artifacts: _artifacts,
  accounts: _accounts,
  web3: _web3
}) => {
  artifacts = _artifacts;
  accounts = _accounts;
  web3 = _web3;

  const owner = accounts[0];
  daoService = await daoServiceFactory({
    provider: web3.currentProvider,
    transactionDefaults: {
      from: owner,
      gas: DEFAULT_GAS
    }
  });

  dxService = await dxServiceFactory({
    artifacts
  });

  // testHelper API
  return {
    // utils
    setupDao,
    getTimestampRangeFromDeltas,
    getDaoStackContracts,
    getDxContracts,
    makeSnapshot: makeSnapshotFactory(web3),
    revertSnapshot: revertSnapshotFactory(web3),

    // service
    daoService,
    dxService
  };
};
