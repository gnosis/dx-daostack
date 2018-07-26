const DEFAULT_GAS = 4712388
const daoServiceFactory = require('../../src/services/daoService/daoServiceFactory')
const dxServiceFactory = require('../../src/services/dxService/dxServiceFactory')

let web3, artifacts, accounts, daoService, dxService

async function setupDao ({
  organizationName = 'testOrg',
  tokenName = 'TEST',
  tokenSymbol = 'TST',
  founders,
  controller = 0,
  cap = 0,
  schemes
}) {
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
    getTimestampRangeFromDeltas,
    setupDao,

    // service
    daoService,
    dxService
  }
}


