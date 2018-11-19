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
  const DxGenesisProtocol = artifacts.require('DxGenesisProtocol')

  async function getGenesisProtocolData () {
    const dxGenesisProtocol = await DxGenesisProtocol.deployed()
    const genesisProtocolParamsHash = await dxGenesisProtocol.getParametersHash(parameters, voteOnBehalf)

    return {
      genesisProtocolParamsHash,
      genesisProtocolAddress: dxGenesisProtocol.address
    }
  }

  return {
    getGenesisProtocolData
  }
}
