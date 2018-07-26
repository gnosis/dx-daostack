const contract = require('truffle-contract')

const CONTRACTS = [
  // Contract constructor helpers
  'DaoCreator',
  'ControllerCreator',

  // Main contracts
  'Avatar',
  'DAOToken',
  'Reputation',

  // Schemes
  'ExternalLocking4Reputation'
]

async function getDaoStackContracts ({
  provider,
  defaults 
}) {
  return CONTRACTS.reduce((acc, contractName) => {
    const contractUrl = `@daostack/arc/build/contracts/${contractName}`
    // console.log(`Load contract: ${contractUrl}`)
    const truffleContract = contract(require(contractUrl))
    truffleContract.setProvider(provider)
    truffleContract.defaults(defaults)
    acc[contractName] = truffleContract

    return acc
  }, {})
}

module.exports = getDaoStackContracts
