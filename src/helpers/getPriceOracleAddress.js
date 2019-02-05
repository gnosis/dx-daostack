const networksFile = '@gnosis.pm/dx-price-oracle/networks.json'
const dxPriceOracleNetworks = require(networksFile)
const CONTRACT_NAME = 'DutchXPriceOracle'

module.exports = (web3, artifacts) => async () => {
  const networkId = await web3.eth.net.getId()

  // on local development network
  let address
  if (networkId > Date.now() / 10) {
    address = await _getAddressForLocalGanache({ artifacts })
  } else {
    address = await _getAddressFromNpmPackages({ networkId })
  }

  return address
}

async function _getAddressForLocalGanache({ artifacts }) {
  const priceOracle = await artifacts.require(CONTRACT_NAME).deployed()

  if (!priceOracle.address) {
    throw new Error(`${CONTRACT_NAME} hasn't been deployed yet`)
  }

  return priceOracle.address
}

async function _getAddressFromNpmPackages({ networkId }) {

  const Contract = dxPriceOracleNetworks[CONTRACT_NAME]
  if (!Contract) {
    throw new Error(`No ${CONTRACT_NAME} in ${networksFile}`)
  }

  const networkInfo = Contract[networkId]
  if (!networkInfo) {
    throw new Error(`No address for ${CONTRACT_NAME} on network ${networkId} in ${networksFile}`)
  }

  return networkInfo.address
}
