/* global artifacts, web3 */
/* eslint no-undef: "error" */
/*eslint no-unused-vars: ["error", {"args": "after-used"}]*/

const assert = require('assert')

const getDaostackContract = require('../src/helpers/getDaostackContract')(web3, artifacts)


module.exports = async function (deployer) { // eslint-disable-line no-unused-vars
  // Configure Genesis Protocol voting machine
  const votingConf = require('../src/config/voting')
  // reuse GenesisProtocol if available on the network
  const genesisProtocol = await getDaostackContract('GenesisProtocol')

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

  const { voteOnBehalf } = votingConf

  console.log('Configure Genesis Protocol voting machine:')
  parameterNames.concat('voteOnBehalf').forEach(parameterName => {
    const parameter = votingConf[parameterName]
    console.log(`  - ${parameterName}: ${parameter}`)
    assert(parameter !== undefined, `The parameter ${parameterName} for genesisProtocol was not defined`)
  })

  const parameters = parameterNames
    .map(parameterName => votingConf[parameterName])

  const txResult = await genesisProtocol.setParameters(parameters, voteOnBehalf)
  console.log('  - Transaction: ' + txResult.tx)
  console.log('  - Gas used: ' + txResult.receipt.gasUsed)
  console.log()
}
