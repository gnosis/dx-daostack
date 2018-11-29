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

const genesisProtocolConf = require('../config/votingMachines/GenesisProtocol')
const { voteOnBehalf } = genesisProtocolConf

const parameters = parameterNames.map(parameterName => genesisProtocolConf[parameterName])

module.exports = artifacts => {
  const GenesisProtocol = artifacts.require('GenesisProtocol')

  async function getGenesisProtocolData() {
    const genesisProtocol = await GenesisProtocol.deployed()
    const genesisProtocolParamsHash = await genesisProtocol.getParametersHash(parameters, voteOnBehalf)

    return {
      genesisProtocolParamsHash,
      genesisProtocolAddress: genesisProtocol.address
    }
  }

  return {
    getGenesisProtocolData
  }
}
