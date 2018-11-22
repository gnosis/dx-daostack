const USE_DEV_CONTRACTS = process.env.USE_DEV_CONTRACTS

const gnoNetworksJSON = require('@gnosis.pm/gno-token/networks.json')

module.exports = (web3, artifacts) => async (ContractName, dev = USE_DEV_CONTRACTS) => {
  const networkId = await web3.eth.net.getId()

  // on local development network
  if (networkId > Date.now() / 10) {
    const { address } = await artifacts.require(ContractName).deployed()
    if (!address) throw new Error(`${ContractName} hasn't been deployed yet`)

    return address
  }

  const networksFile = dev
    ? '@gnosis.pm/dx-contracts/networks-dev.json'
    : '@gnosis.pm/dx-contracts/networks.json'

  const networksJSON = Object.assign(require(networksFile), gnoNetworksJSON)

  const Contract = networksJSON[ContractName]
  if (!Contract) throw new Error(`No ${ContractName} in ${networksFile}`)

  const address = Contract[networkId]
  if (!address) throw new Error(`No address for ${ContractName} on network ${networkId} in ${networksFile}`)

  return address
}
