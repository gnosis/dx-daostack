const USE_DEV_CONTRACTS = process.env.USE_DEV_CONTRACTS

const gnoNetworksJSON = require('@gnosis.pm/gno-token/networks.json')

module.exports = (web3, artifacts) => async (ContractName, dev = USE_DEV_CONTRACTS) => {
  const networkId = await web3.eth.net.getId()

  // on local development network
  let address
  if (networkId > Date.now() / 10) {
    address = await _getAddressForLocalGanache({
      ContractName,
      artifacts
    })
  } else {
    address = await _getAddressFromNpmPachages({
      ContractName,
      dev,
      networkId
    })
  }

  return address
}

async function _getAddressForLocalGanache ({ ContractName, artifacts }) {
  const { address } = await artifacts.require(ContractName).deployed()
  if (!address) {
    throw new Error(`${ContractName} hasn't been deployed yet`)
  }

  return address
}

async function _getAddressFromNpmPachages ({ ContractName, dev, networkId }) {
  const networksFile = dev
    ? '@gnosis.pm/dx-contracts/networks-dev.json'
    : '@gnosis.pm/dx-contracts/networks.json'

  const networksJSON = Object.assign(require(networksFile), gnoNetworksJSON)

  const Contract = networksJSON[ContractName]
  if (!Contract) {
    throw new Error(`No ${ContractName} in ${networksFile}`)
  }

  const networkInfo = Contract[networkId]
  if (!networkInfo) {
    throw new Error(`No address for ${ContractName} on network ${networkId} in ${networksFile}`)
  }

  return networkInfo.address
}
