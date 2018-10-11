/* global artifacts, web3 */
/* eslint no-undef: "error" */
const assert = require('assert')

module.exports = async function (deployer) {
  const GenesisProtocol = artifacts.require('GenesisProtocol')
  const GenToken = artifacts.require('GenToken')

  // Deploy Genesis Protocol voting machine
  await deployGenesisProtocol(GenesisProtocol, GenToken, deployer)

  // Configure Genesis Protocol voting machine
  await configureGenesisProtocol(GenesisProtocol)
}

async function deployGenesisProtocol (GenesisProtocol, GenToken, deployer) {
  // Get instances
  const genToken = await GenToken.deployed()

  // Get token symbol
  const symbol = await genToken.symbol.call()

  // TODO: Are we staking using GEN? (review this part)
  console.log('Deploying GenesisProtocol voting machine')
  console.log("  - GenesisProtocol implementation. An organization's voting machine scheme.")

  console.log('  - Using ' + symbol + ' Token for staking')
  console.log('  - Token address: ' + genToken.address)
  await deployer.deploy(GenesisProtocol, genToken.address)
}

async function configureGenesisProtocol (GenesisProtocol) {
  const genesisProtocolConf = require('../src/config/votingMachines/GenesisProtocol')
  const genesisProtocol = await GenesisProtocol.deployed()

  // Genesis Protocol params:
  //    https://github.com/daostack/infra/blob/master/contracts/VotingMachines/GenesisProtocol.sol#L27
  const parameterNames = [
    'preBoostedVoteRequiredPercentage',
    'preBoostedVotePeriodLimit',
    'boostedVotePeriodLimit',
    'thresholdConstA',
    'thresholdConstB',
    'minimumStakingFee',
    'quietEndingPeriod',
    'proposingRepRewardConstA',
    'proposingRepRewardConstB',
    'stakerFeeRatioForVoters',
    'votersReputationLossRatio',
    'votersGainRepRatioFromLostRep',
    'daoBountyConst',
    'daoBountyLimit'
  ]

  console.log('Configure Genesis Protocol voting machine:')
  parameterNames.forEach(parameterName => {
    const parameter = genesisProtocolConf[parameterName]
    assert(parameter !== undefined, `The parameter ${parameterName} for genesisProtocol was not defined`)
    console.log(`  - ${parameterName}: ${parameter}`)
  })

  const parameters = parameterNames
    .map(parameterName => genesisProtocolConf[parameterName])
  genesisProtocol.setParameters(parameters)
}
