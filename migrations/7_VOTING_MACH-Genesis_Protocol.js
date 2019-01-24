/* global artifacts, web3 */
/* eslint no-undef: "error" */
/*eslint no-unused-vars: ["error", {"args": "after-used"}]*/

const assert = require('assert')

const dateUtil = require('../src/helpers/dateUtil')
const getDaostackContract = require('../src/helpers/getDaostackContract')(web3, artifacts)
const {
  governanceStart
} = require('../src/config/timePeriods')


module.exports = async function (deployer) { // eslint-disable-line no-unused-vars
  // Configure Genesis Protocol voting machine
  const votingConf = require('../src/config/voting')
  // reuse GenesisProtocol if available on the network
  const genesisProtocol = await getDaostackContract('GenesisProtocol')

  // Genesis Protocol params:
  //    https://github.com/daostack/infra/blob/master/contracts/VotingMachines/GenesisProtocol.sol#L27
  const parameterNames = [
    'queuedVoteRequiredPercentage',
    'queuedVotePeriodLimit',
    'boostedVotePeriodLimit',
    'preBoostedVotePeriodLimit',
    'thresholdConst',
    'quietEndingPeriod',
    'proposingRepReward',
    'votersReputationLossRatio',
    'minimumDaoBounty',
    'daoBountyConst'
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

  const activationTime = governanceStart
  parameters.push(dateUtil.toEthereumTimestamp(activationTime))
  console.log(` - governanceStart: ${governanceStart}`)

  // Set the 3 GP parameters set
  const txResult = await genesisProtocol.setParameters(parameters, voteOnBehalf)
  console.log('  - Transaction: ' + txResult.tx)
  console.log('  - Gas used: ' + txResult.receipt.gasUsed)
  console.log()
}
