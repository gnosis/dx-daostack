const DEFAULT_GAS = 4712388
const daoServiceFactory = require('../../src/services/daoService/daoServiceFactory')
const dxServiceFactory = require('../../src/services/dxService/dxServiceFactory')

const getDaoStackContracts = require('../../src/repositories/daoStack/util/getDaoStackContracts')
const getDxContracts = require('../../src/repositories/dx/util/getDxContracts')

let web3, artifacts, accounts, daoService, dxService

async function setupDao ({
  // Optional params
  organizationName = 'testOrg',
  tokenName = 'TEST',
  tokenSymbol = 'TST',
  founders = null,
  controller = 0,
  cap = 0,
  schemes,  
  initialMgn = 0,
  lockedMgn = 0
}) {
  if (initialMgn > 0) {
    // Mint and lock some MGN
    const owner = accounts[0]
    const mgnAddress = await dxService.mintAndLockMgn({
      account: owner,
      mintAmount: initialMgn,
      lockAmount: lockedMgn
    })
  }

  // Setup Dao
  if (!founders && accounts) {
    founders = [{
      account: accounts[0],
      tokenAmount: 0,
      reputationAmount: 0
    }]
  }

  return daoService.createOrganization({
    organizationName,
    tokenName,
    tokenSymbol,
    founders,
    controller,
    cap,
    schemes
  })
}

async function getTimestampRangeFromDeltas ({
  startTimeDelta,
  endTimeDelta
}) {
  const now = await web3.eth.getBlock('latest').timestamp
  const lockingStartTime = now + startTimeDelta
  const lockingEndTime = now + endTimeDelta
  
  return [ lockingStartTime, lockingEndTime ]
}


module.exports = async ({
  artifacts: _artifacts,
  accounts: _accounts,
  web3: _web3
}) => {
  artifacts = _artifacts
  accounts = _accounts
  web3 = _web3

  const owner = accounts[0]
  daoService = await daoServiceFactory({
    provider: web3.currentProvider,
    transactionDefaults: {
      from: owner,
      gas: DEFAULT_GAS
    }
  })

  dxService = await dxServiceFactory({
    artifacts
  })

  // testHelper API
  return {
    // utils
    setupDao,
    getTimestampRangeFromDeltas,
    getDaoStackContracts,
    getDxContracts,

    // service
    daoService,
    dxService
  }
}


