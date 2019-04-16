/* global artifacts, web3 */
/* eslint no-undef: "error" */
const assert = require('assert')
const ADDRESS_0 = '0x0000000000000000000000000000000000000000'


// Example: Propose setting the 2000$ as the threshold for initiating a new auction
//  rinkeby:
//    ENV_PATH=env_vars/19-02-04__rinkeby_test.conf yarn make-proposal -f ./test/resources/proposals/test-proposals.js --network rinkeby --dry-run
//  mainnet:
//    ENV_PATH=env_vars/19-02-07__mainnet_test.conf yarn make-proposal -f ./test/resources/proposals/test-proposals.js --network mainnet --dry-run

const DutchExchange = artifacts.require('DutchExchange')
// const ERC20 = artifacts.require('ERC20')

const genesisProtocolHelper = require('../helpers/genesisProtocolHelper')({ artifacts, web3 })
const getDaostackContract = require('../helpers/getDaostackContract')(web3, artifacts)

const DxAvatar = artifacts.require('DxAvatar')
const path = require('path')

// when proposal is executed it can also send ETH (like {value} in transaction) to the underlyiung contract
const ETH_TO_SEND_WITH_CALL = 0

// Usage example:
//  yarn make-proposal -h
//  yarn make-proposal --network rinkeby --dry-run

const argv = require('yargs')
  .usage('Usage: yarn make-proposal [--network name]')
  .option('network', {
    type: 'string',
    describe: 'One of the ethereum networks defined in truffle config'
  })
  .option('f', {
    type: 'string',
    demandOption: true,
    describe: 'File with the list of proposals'
  })
  .demandOption([
    'network',
    'f'
  ])
  .option('dryRun', {
    type: 'boolean',
    default: false,
    describe: 'Dry run. Do not make the proposal, do just the validations.'
  })
  .help('h')
  .strict()
  .argv

async function main() {
  const { network, dryRun, f } = argv
  const proposalsFile = path.join('../..', f)
  const dxAvatar = await DxAvatar.deployed()
  const avatarAddress = dxAvatar.address

  console.log('\n **************  Make a proposal in DutchX  **************\n')
  console.log('Data:')
  console.log(`    Network: ${network}`)
  console.log(`    Dry run: ${dryRun ? 'Yes' : 'No'}`)
  console.log(`    Proposals file: ${f}`)
  console.log(`    Avatar: ${avatarAddress}\n`)
  const proposals = require(proposalsFile)

  const {
    genericScheme,
    contributionReward,
    genesisProtocol,
    genesisProtocolParamsHash
  } = await getGenesisProtocolInfo(network)
  console.log('\nGenesis protocol info:')
  console.log(`     GenericScheme: ${genericScheme.address}`)
  console.log(`     ContributionReward: ${contributionReward.address}`)
  console.log(`     GenesisProtocol: ${genesisProtocol.address}`)
  console.log(`     DutchX GP hash:`)
  console.log(`          - DutchX (GenericScheme): ${genesisProtocolParamsHash.dutchX}`)
  console.log(`          - Contribution Reward: ${genesisProtocolParamsHash.contributionReward}`)

  assert(proposals && proposals.length > 0, 'The list of proposals is empty')
  console.log('\n%d Proposals:', proposals.length)

  for (let i = 0; i < proposals.length; i++) {
    const proposal = proposals[i]
    const proposalNumber = i + 1

    // Extract common param for all proposals
    const { type, description = '', ...data } = proposal

    assert(type, '"type" is mandatory for every proposal')
    console.log('\nProposal %d - %s: ', proposalNumber, type, description ? description : 'No description')
    console.log('    - data: %o', data)

    // Get parameters for the proposal
    let genericSchemeData, contributionRewardData
    switch (type) {
      case 'CHANGE-THRESHOLD-NEW-AUCTION':
        genericSchemeData = {
          abiEncodedCall: changeThresholdNewAuctionEncoded(proposal),
          description
        }
        break;
      case 'CHANGE-THRESHOLD-NEW-TOKEN-PAIR':
        genericSchemeData = {
          abiEncodedCall: changeThresholdNewTokenPairEncoded(proposal),
          description
        }
        break;
      case 'UPDATE-AUCTIONEER':
        genericSchemeData = {
          abiEncodedCall: updateAuctioneerEncoded(proposal),
          description
        }
        break;
      case 'UPGRADE-MASTER-CONTRACT':
        genericSchemeData = {
          abiEncodedCall: upgradeMasterContractEncoded(proposal),
          description
        }
        break;
      case 'UPDATE-ETH-USD-ORACLE':
        genericSchemeData = {
          abiEncodedCall: updateEthUsdOracleEncoded(proposal),
          description
        }
        break;
      case 'UPDATE-APPROVED_TOKENS':
        genericSchemeData = {
          abiEncodedCall: updateApprovedTokensEncoded(proposal),
          description
        }
        break;
      case 'SEND-TOKENS':
        contributionRewardData = getContributionRewardData({
          beneficiary: proposal.toAddress,
          tokenAddress: proposal.tokenAddress,
          tokenReward: proposal.amount,
          periodLength: 0,
          numberOfPeriod: 1
        })
        break;
      case 'SEND-ETHER':
        contributionRewardData = getContributionRewardData({
          beneficiary: proposal.toAddress,
          etherReward: proposal.amount,
          periodLength: 0,
          numberOfPeriod: 1
        })
        break;
      case 'CHANGE-REPUTATION':
        contributionRewardData = getContributionRewardData({
          beneficiary: proposal.toAddress,
          reputationChange: proposal.changeAmount,
          periodLength: 0,
          numberOfPeriod: 1
        })
        break;
      case 'CONTRIBUTION-REWARD':
        contributionRewardData = getContributionRewardData(proposal)
        break;
      default:
        throw new Error('Unknown proposal type: ' + type)
    }

    // Get parameters
    const params = getProposalParams({
      avatarAddress,
      description,
      genericSchemeData,
      contributionRewardData
    })


    // console.log(encodedMethod)
    if (genericSchemeData) {
      console.log('    - Generic Scheme Abi Call: %s', genericSchemeData.abiEncodedCall)
    }

    // console.log(encodedMethod)
    if (contributionRewardData) {
      console.log('    - Contribution Reward Params: %s', params)
    }

    if (dryRun) {
      if (genericSchemeData) {
        genericScheme.proposeCall.call(...params)
      } else if (contributionRewardData) {
        contributionReward.proposeContributionReward.call(...params)
      } else {
        throw new Error('Error getting proposal params')
      }

      console.log('    - Dry run Success!')
    } else {
      let makeProposalResult
      if (genericSchemeData) {
        makeProposalResult = await genericScheme.proposeCall(...params)
      } else if (contributionRewardData) {
        makeProposalResult = await contributionReward.proposeContributionReward(...params)
      } else {
        throw new Error('Error getting proposal params')
      }

      console.log('    - Success! The proposal was made. Transaction: %s', makeProposalResult.tx)
    }
  }

  console.log('\n ****************************\n')
}

function getContributionRewardData(proposal) {
  const {
    reputationChange = 0,
    nativeTokensReward = 0,
    etherReward = 0,
    tokenAddress = ADDRESS_0,
    tokenReward = 0,
    periodLength = 0,
    numberOfPeriod = 0,
    beneficiary
  } = proposal

  assert(beneficiary, '"beneficiary" is mandatory for contribution reward')

  if (tokenReward) {
    assert(tokenAddress, '"tokenAddress" is mandatory for contribution reward when proposing a tokenReward')
  }

  if (tokenAddress !== ADDRESS_0) {
    assert(tokenReward, '"tokenReward" is mandatory for contribution reward when proposing a tokenAddress')
  }

  if (etherReward || tokenReward || nativeTokensReward) {
    assert(numberOfPeriod > 0, '"numberOfPeriod" should be greater than 0 when proposing a reward')
  }

  return {
    reputationChange,
    nativeTokensReward,
    etherReward,
    tokenAddress,
    tokenReward,
    periodLength,
    numberOfPeriod,
    beneficiary
  }
}

function getProposalParams({
  avatarAddress,
  description,
  genericSchemeData, // only for generic scheme proposals
  contributionRewardData // only for generic contribution reward data
}) {
  if (genericSchemeData) {
    const {
      abiEncodedCall
    } = genericSchemeData
    return [avatarAddress, abiEncodedCall, ETH_TO_SEND_WITH_CALL, description]

  } else if (contributionRewardData) {
    const {
      reputationChange = 0,
      nativeTokensReward = 0,
      etherReward = 0,
      tokenAddress = 0,
      tokenReward = 0,
      periodLength = 0,
      numberOfPeriod = 1,
      description = '',
      beneficiary
    } = contributionRewardData
    return [
      avatarAddress,
      description,
      reputationChange, [
        nativeTokensReward, // Amount of tokens requested per period
        etherReward, // Amount of ETH requested per period
        tokenReward, // Amount of external tokens requested per period
        periodLength, // Period length - if set to zero it allows immediate redeeming after execution.
        numberOfPeriod // Number of periods
      ],
      tokenAddress,
      beneficiary
    ]
  } else {
    throw new Error('Error getting proposal params')
  }
}


function changeThresholdNewAuctionEncoded(proposal) {
  const { newThresholdInUsd } = proposal
  assert(newThresholdInUsd, '"newThreshold" is required for a changing the threshold to start an auction')
  console.log('    - Change threshold to start a new auction to $' + newThresholdInUsd)
  const abi = getDxFunctionAbi('updateThresholdNewAuction')

  return web3.eth.abi.encodeFunctionCall(
    abi, [web3.utils.toWei(newThresholdInUsd.toString())]
  )
}

function changeThresholdNewTokenPairEncoded(proposal) {
  const { newThresholdInUsd } = proposal
  assert(newThresholdInUsd, '"newThreshold" is required for a changing the threshold to add a token pair')
  console.log('    - Change threshold to add a token pair to $' + newThresholdInUsd)
  const abi = getDxFunctionAbi('updateThresholdNewTokenPair')

  return web3.eth.abi.encodeFunctionCall(
    abi, [web3.utils.toWei(newThresholdInUsd.toString())]
  )
}

function updateAuctioneerEncoded(proposal) {
  const { newAuctioneer } = proposal
  assert(newAuctioneer, '"newAuctioneer" is required for changing the auctioneer')
  console.log('    - Change auctioneer to ' + newAuctioneer)
  const abi = getDxFunctionAbi('updateAuctioneer')

  return web3.eth.abi.encodeFunctionCall(
    abi, [newAuctioneer]
  )
}

function upgradeMasterContractEncoded(proposal) {
  const { newMasterContract } = proposal
  assert(newMasterContract, '"newMasterContract" is required to update the master contract')
  console.log('    - Change master contract to ' + newMasterContract)
  const abi = getDxFunctionAbi('startMasterCopyCountdown')

  return web3.eth.abi.encodeFunctionCall(
    abi, [newMasterContract]
  )
}

function updateEthUsdOracleEncoded(proposal) {
  const { oracleAddress } = proposal
  assert(oracleAddress, '"oracleAddress" is required for changing the oracle')
  console.log('    - Change ETH-USD oracle to ' + oracleAddress)
  const abi = getDxFunctionAbi('initiateEthUsdOracleUpdate')

  return web3.eth.abi.encodeFunctionCall(
    abi, [oracleAddress]
  )
}

function updateApprovedTokensEncoded(proposal) {
  const { tokens, approve } = proposal
  assert(tokens, '"tokens" is required for updating the approved tokens')
  assert(tokens.length > 0, 'At least one token is mandatory')
  assert(approve !== undefined, '"approve" is required for updating the approved tokens')
  console.log('    - %s %d tokens:', (approve ? 'Approve' : 'Disapprove'), tokens.length, tokens.join(', '))
  const abi = getDxFunctionAbi('updateApprovalOfToken')
  return web3.eth.abi.encodeFunctionCall(
    abi, [tokens, approve]
  )
}

// function sendTokensEncoded(proposal) {
//   const { tokenAddress, toAddress, amount } = proposal
//   assert(tokenAddress, '"tokenAddress" is required for sending tokens')
//   assert(toAddress, '"toAddress" is required for sending tokens')
//   assert(amount, '"amount" is required for sending tokens')

//   console.log('    - Send tokens (%s): %d', tokenAddress, amount)
//   const abi = getERC20FunctionAbi('transfer')
//   return web3.eth.abi.encodeFunctionCall(
//     abi, [toAddress, web3.utils.toWei(amount.toString())]
//   )
// }


function getDxFunctionAbi(name) {
  const abi = getAbi('DutchX', DutchExchange, name)

  return abi
}

// function getERC20FunctionAbi(name) {
//   const abi = getAbi('ERC20', ERC20, name)

//   return abi
// }

function getAbi(label, contract, functionName) {
  const abi = contract.abi.find(def => {
    return def.name === functionName && def.type === 'function'
  })
  assert(abi, `The ${label} abi doesn't have any function called ${functionName}`)

  return abi
}


async function getGenesisProtocolInfo(network) {
  // Get contracts  
  const genericScheme = await getDaostackContract('GenericScheme')
  const contributionReward = await getDaostackContract('ContributionReward')
  const genesisProtocol = await getDaostackContract('GenesisProtocol')

  const gpDxParamsHash = await genesisProtocolHelper.getParameterHash('dutchX')
  const gpContributionRewardParamsHash = await genesisProtocolHelper.getParameterHash('contributionReward')

  verifyParamHash(gpDxParamsHash, genesisProtocol, network)
  verifyParamHash(gpContributionRewardParamsHash, genesisProtocol, network)

  return {
    genericScheme,
    contributionReward,
    genesisProtocol,
    genesisProtocolParamsHash: {
      dutchX: gpDxParamsHash,
      contributionReward: gpContributionRewardParamsHash
    }
  }
}

async function verifyParamHash(genesisProtocol, paramsHash, network) {
  const actualParams = await genesisProtocol.parameters.call(paramsHash)

  // Check if the parameters are unknown in Genesis Protocol
  const unknownParameters = Object.keys(actualParams).every(prop => {
    const value = actualParams[prop]
    // console.log(prop, value, typeof value)
    if (typeof value === 'string') {
      return parseInt(value) === 0
    } else {
      return value.isZero()
    }
  })
  assert(!unknownParameters, `The hash ${paramsHash} is unknown in GP ${genesisProtocol.address}.

GP returned params with all 0x0 for ${paramsHash}:
${JSON.stringify(actualParams, null, 2)}

Review the Genesis Protocol Params, and ensure they were set in the GP of the current network (${network})
`)
}

module.exports = callback => {
  main().then(callback).catch(callback)
}
