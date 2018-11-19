const Network2Id = {
  mainnet: 1,
  morden: 2,
  ropsten: 3,
  rinkeby: 4,
  kovan: 42
}

const USE_DEV_CONTRACTS = process.env.USE_DEV_CONTRACTS

module.exports = (network, artifacts) => (ContractName, dev = USE_DEV_CONTRACTS) => {
  if (network === 'development') {
    const { address } = artifacts.require(ContractName)
    if (!address) throw new Error(`${ContractName} hasn't been deployed yet`)

    return address
  }

  const networkId = Network2Id[network]
  if (!networkId) throw new Error('Unknown network. Unable to retrieve DX contract address')

  const networksFile = dev
    ? '@gnosis.pm/dx-contracts/networks-dev.json'
    : '@gnosis.pm/dx-contracts/networks.json'

  const networksJSON = require(networksFile)

  const Contract = networksJSON[ContractName]
  if (!Contract) throw new Error(`No ${ContractName} in ${networksFile}`)

  const address = Contract[networkId]
  if (!address) throw new Error(`No address for ${ContractName} on ${network} network in ${networksFile}`)

  return address
}
