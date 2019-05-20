const networksFile = '@daostack/migration/migration.json'
const networksJSON = require(networksFile)
const { version: arcVersion } = require('@daostack/arc/package.json')

const genTokenNetworks = require('../config/genTokenAddress')

const Id2Network = {
  1: 'mainnet',
  2: 'morden',
  3: 'ropsten',
  4: 'rinkeby',
  42: 'kovan'
}
const getContract = (web3, artifacts) => async (ContractName) => {
  // on local development network
  const networkId = await web3.eth.net.getId()

  const Artifact = artifacts.require(ContractName)

  if (networkId > Date.now() / 10) {
    return Artifact.deployed()
  }

  if (ContractName === 'GenToken') {
    const { address } = genTokenNetworks[networkId]
    if (!address) throw new Error(`No address for GenToken} on network ${networkId} in src/config/gen-token`)
    return Artifact.at(address)
  }

  const network = Id2Network[networkId]
  if (!network) throw new Error(`Unknown ${networkId}. Unable to retrieve Daostack contract address`)

  const ContractsOnNetwork = networksJSON[network]
  if (!ContractsOnNetwork) throw new Error(`No deployed contracts on ${network}`)

  const ContractsForVersion = ContractsOnNetwork.base[arcVersion]
  if (!ContractsForVersion) throw new Error(`No deployed contracts on network ${network} in ${networksFile} for arc version ${arcVersion}`)

  const address = ContractsForVersion[ContractName]
  if (!address) throw new Error(`No address for ${ContractName} on network ${network} in ${networksFile}`)

  return Artifact.at(address)
}

getContract.getContractAddress = async ContractName => {
  const { address } = await getContract(ContractName)
  if (!address) throw new Error(`${ContractName} hasn't been deployed yet`)

  return address
}

module.exports = getContract
