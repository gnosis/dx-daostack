/* global artifacts, web3 */
/* eslint no-undef: "error" */
const assert = require('assert')

module.exports = async function (deployer) {
  const DxGenesisProtocol = artifacts.require('DxGenesisProtocol')
  const GenToken = artifacts.require('GenToken')

  // Deploy Genesis Protocol voting machine
  await deployGenesisProtocol(DxGenesisProtocol, GenToken, deployer)

  // Configure Genesis Protocol voting machine
  await configureGenesisProtocol(DxGenesisProtocol)
}

async function deployGenesisProtocol (DxGenesisProtocol, GenToken, deployer) {
  // Get instances
  const genToken = await GenToken.deployed()

  // Get token symbol
  const symbol = await genToken.symbol.call()

  // TODO: Are we staking using GEN? (review this part)
  console.log('Deploying DxGenesisProtocol voting machine')
  console.log("  - GenesisProtocol implementation. An organization's voting machine scheme.")

  console.log('  - Using ' + symbol + ' Token for staking')
  console.log('  - Token address: ' + genToken.address)
  await deployer.deploy(DxGenesisProtocol, genToken.address)
}

async function configureGenesisProtocol (DxGenesisProtocol) {
  const genesisProtocolConf = require('../src/config/votingMachines/GenesisProtocol')
  const genesisProtocol = await DxGenesisProtocol.deployed()

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
    console.log(`  - ${parameterName}: ${parameter}`)
    assert(parameter !== undefined, `The parameter ${parameterName} for genesisProtocol was not defined`)
  })

  const { voteOnBehalf } = genesisProtocolConf
  console.log('  - voteOnBehalf: ' + voteOnBehalf)
  assert(voteOnBehalf !== undefined, 'The parameter voteOnBehalf for genesisProtocol was not defined')

  const parameters = parameterNames
    .map(parameterName => genesisProtocolConf[parameterName])

  const txResult = await genesisProtocol.setParameters(parameters, voteOnBehalf)
  console.log('  - Transaction: ' + txResult.tx)
  console.log('  - Gas used: ' + txResult.receipt.gasUsed)
  console.log()
}
