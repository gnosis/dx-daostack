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

const votingConf = require('../config/voting')
const { voteOnBehalf } = votingConf

const parameters = parameterNames.map(parameterName => votingConf[parameterName])

module.exports = ({ artifacts, web3 }) => {
  let genesisProtocolData
  
  async function getGenesisProtocolData() {
    if (!genesisProtocolData) {
      const getDaostackContract = require('../helpers/getDaostackContract')(web3, artifacts)
      const genesisProtocol = await getDaostackContract('GenesisProtocol')
      const genesisProtocolParamsHash = await genesisProtocol.getParametersHash(parameters, voteOnBehalf)

      genesisProtocolData = {
        genesisProtocolParamsHash,
        genesisProtocolAddress: genesisProtocol.address
      }
    }

    return genesisProtocolData
  }

  return {
    getGenesisProtocolData
  }
}
