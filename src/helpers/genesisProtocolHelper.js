const assert = require('assert')
const dateUtil = require('../helpers/dateUtil')
const votingConfs = require('../config/voting')
const {
  governanceStart: activationTime
} = require('../config/timePeriods')

// Object caching the hash of the GP params
let paramsHashes = {}

module.exports = ({ artifacts, web3 }) => {
  const getDaostackContract = require('../helpers/getDaostackContract')(web3, artifacts)

  async function setupGenesisProtocol() {
    // Configure Genesis Protocol voting machine
    const genesisProtocol = await getDaostackContract('GenesisProtocol')
    const genesisProtocolAddress = genesisProtocol.address

    assert(genesisProtocolAddress, 'genesisProtocolAddress is required')
    assert(votingConfs.dutchX, 'DutchX config for Genesis Protocol is required')
    assert(votingConfs.contributionReward, 'DutchX config for Contribution Reward is required')
    assert(votingConfs.admin, 'DutchX config for Admin is required')
    assert(genesisProtocolAddress, 'genesisProtocolAddress is required')

    console.log('Configure Genesis Protocol Params:')
    console.log('  - Address: ' + genesisProtocolAddress)
    console.log()

    // Setup the Genesis Protocol setups
    await _setParameters({
      name: 'dutchX',
      votingConf: votingConfs.dutchX,
      activationTime
    })
    await _setParameters({
      name: 'contributionReward',
      votingConf: votingConfs.contributionReward,
      activationTime
    })
    await _setParameters({
      name: 'admin',
      votingConf: votingConfs.admin,
      activationTime
    })
  }

  async function getParameterHash(name) {
    const genesisProtocol = await getDaostackContract('GenesisProtocol')
    const votingConf = votingConfs[name]
    const voteOnBehalf = votingConf.voteOnBehalf

    // Get params for Genesis Protocol config
    const parameters = _getParmeterArray({
      name,
      votingConf,
      activationTime
    })

    // Get hash
    let paramsHash = paramsHashes[name]
    if (!paramsHash) {
      paramsHash = await genesisProtocol.getParametersHash(parameters, voteOnBehalf)
      paramsHashes[name] = paramsHash
    }

    return paramsHash
  }

  async function setupAndGetGenesisProtocolData(name) {
    await _init()
    const genesisProtocol = await getDaostackContract('GenesisProtocol')

    assert(name, 'The name is required')
    const paramsHash = paramsHashes[name]
    assert(paramsHash, 'The paramsHash is required')

    return {
      paramsHash,
      address: genesisProtocol.address
    }
  }

  async function _init() {
    if (Object.keys(paramsHashes).length === 0) {
      await setupGenesisProtocol()
    }
  }

  async function _setParameters({
    name,
    votingConf,
    activationTime
  }) {
    const genesisProtocol = await getDaostackContract('GenesisProtocol')

    assert(name, 'The name is required')
    assert(votingConf, 'The votingConf is required')
    assert(activationTime, 'The activationTime is required')

    // Get params for Genesis Protocol config
    const parameters = _getParmeterArray({
      name,
      votingConf,
      activationTime
    })

    const voteOnBehalf = votingConf.voteOnBehalf
    assert(voteOnBehalf, 'The voteOnBehalf is required')

    // Set the 3 GP parameters
    const txResult = await genesisProtocol.setParameters(parameters, voteOnBehalf)
    console.log('  - Name: ' + name)
    console.log('  - Transaction: ' + txResult.tx)
    console.log('  - Gas used: ' + txResult.receipt.gasUsed)
    console.log()

    // Get the param hash and cache it
    const paramsHash = await genesisProtocol.getParametersHash(parameters, voteOnBehalf)
    paramsHashes[name] = paramsHash
    console.log('Configured a new Genesis Protocol set of params:')
    console.log('  - Name: ' + name)
    console.log('  - Hash: ' + paramsHash)
    console.log()
  }


  function _getParmeterArray({
    name,
    votingConf,
    activationTime
  }) {
    // Genesis Protocol params:
    //    https://github.com/daostack/infra/blob/master/contracts/VotingMachines/GenesisProtocol.sol#L27
    const GENESIS_PROTOCOL_PARAM_NAMES = [
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

    console.log(`Getting Genesis Protocol voting machine for "${name}":`)
    GENESIS_PROTOCOL_PARAM_NAMES.concat('voteOnBehalf').forEach(parameterName => {
      const parameter = votingConf[parameterName]
      console.log(`  - ${parameterName}: ${parameter}`)
      assert(parameter !== undefined, `The parameter ${parameterName} for genesisProtocol was not defined`)
    })
    console.log(` - activationTime: ${activationTime}`)

    const parameters = GENESIS_PROTOCOL_PARAM_NAMES
      .map(parameterName => votingConf[parameterName])

    parameters.push(dateUtil.toEthereumTimestamp(activationTime))

    return parameters
  }

  return {
    setupGenesisProtocol,
    setupAndGetGenesisProtocolData,
    getParameterHash
  }
}



