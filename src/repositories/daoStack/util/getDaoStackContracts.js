const contract = require('truffle-contract')
let contractInstances

const CONTRACTS = [
  // Contract constructor helpers
  'DaoCreator',
  'ControllerCreator',

  // Main contracts
  'Avatar',
  'DAOToken',
  'Reputation',
  'Controller',

  // Schemes
  'SchemeRegistrar',
  'GlobalConstraintRegistrar',
  'UpgradeScheme',
  'ContributionReward',
  'ExternalLocking4Reputation',
  'GenesisProtocol',
  'StandardTokenMock',
  'Auction4Reputation',
  'FixedReputationAllocation',
  'LockingEth4Reputation',
  'LockingToken4Reputation',
  'GenericScheme'
]

async function getDaoStackContracts ({
  provider,
  defaults
} = {}) {
  if (!contractInstances) {
    contractInstances = CONTRACTS.reduce((acc, contractName) => {
      const contractUrl = `@daostack/arc/build/contracts/${contractName}`
      // console.log(`Load contract: ${contractUrl}`)
      const truffleContract = contract(require(contractUrl))
      truffleContract.setProvider(provider)
      truffleContract.defaults(defaults)
      acc[contractName] = truffleContract
  
      return acc
    }, {})
  }

  // console.log('contractInstances: ', Object.keys(contractInstances))

  return contractInstances
}

module.exports = getDaoStackContracts
