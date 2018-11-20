const contract = require('truffle-contract')
const fs = require('fs')

var constants = require('@daostack/arc/test/constants')
let contractInstances
const DAO_STACK_BUILD_CONTRACTS_DIR = '@daostack/arc/build/contracts'

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
  'GenericScheme',
  'ZeroXDutchXValidateAndCall'
];

async function getDaoStackContracts ({
  contracts = CONTRACTS,
  provider,
  transactionDefaults,
  gas = constants.ARC_GAS_LIMIT
} = {}) {
  if (!contractInstances) {
    contractInstances = contracts.reduce((acc, contractName) => {
      let contractUrl = `${DAO_STACK_BUILD_CONTRACTS_DIR}/${contractName}`
      if (contractName === 'ZeroXDutchXValidateAndCall') {
        contractUrl = `../../../../build/contracts/${contractName}`;
      }
      // console.log(`Load contract: ${contractUrl}`)
      const contractJson = require(contractUrl)
      const truffleContract = contract(contractJson)
      truffleContract.setProvider(provider)
      truffleContract.defaults(transactionDefaults)
      
      contractUrl = './node_modules/' + contractUrl + '.json'
      truffleContract.saveArtifact = async () => {
        if (truffleContract.address) {
          console.log(`Saving artifact ${contractName}...`)
          contractJson.networks[truffleContract.network_id] = {
            address: truffleContract.address
          }
          const jsonContent = JSON.stringify(contractJson, null, 2)
          // console.log(jsonContent)
          fs.writeFileSync(contractUrl, jsonContent)
          console.log(`Artifact ${contractName} was saved in ${contractUrl}`)
        } else {
          console.log(`No need to save artifact ${contractName}, it doesn't have deployed address`)
        }
      }
      acc[contractName] = truffleContract

      return acc
    }, {})
  }

  // console.log('contractInstances: ', Object.keys(contractInstances))

  return contractInstances;
};

module.exports = getDaoStackContracts;
