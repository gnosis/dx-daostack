const networksFile = '@gnosis.pm/dx-price-oracle/networks.json'
const dxPriceOracleNetworks = require(networksFile)


module.exports = (web3, artifacts) => async (contractName) => {
  const networkId = await web3.eth.net.getId()

  // on local development network
  let address
  if (networkId > Date.now() / 10) {
    address = await _getAddressForLocalGanache({ contractName, artifacts })
  } else {
    address = await _getAddressFromNpmPackages({ contractName, networkId })
  }

  return address
}

async function _getAddressForLocalGanache({ contractName, artifacts }) {
  const priceOracle = await artifacts.require(contractName).deployed()

  if (!priceOracle.address) {
    throw new Error(`${contractName} hasn't been deployed yet`)
  }

  return priceOracle.address
}

async function _getAddressFromNpmPackages({ contractName, networkId }) {
  console.log('_getAddressFromNpmPackages ', { contractName, networkId })

  const Contract = dxPriceOracleNetworks[contractName]
  if (!Contract) {
    throw new Error(`No ${contractName} in ${networksFile}`)
  }

  const networkInfo = Contract[networkId]
  if (!networkInfo) {
    throw new Error(`No address for ${contractName} on network ${networkId} in ${networksFile}`)
  }

  return networkInfo.address
}
