const dateUtil = require('../helpers/dateUtil')
const {
  governanceStart
} = require('../config/timePeriods')



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

const votingConf = require('../config/voting')
const { voteOnBehalf } = votingConf

const parameters = parameterNames.map(parameterName => votingConf[parameterName])
const activationTime = governanceStart
parameters.push(dateUtil.toEthereumTimestamp(activationTime))

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
