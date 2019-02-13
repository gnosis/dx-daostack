/* global artifacts, web3 */
/* eslint no-undef: "error" */
const assert = require('assert')

// Example: Propose setting the 2000$ as the threshold for initiating a new auction
//  rinkeby:
//    ENV_PATH=env_vars/19-02-04__rinkeby_test.conf yarn make-proposal -f ./test/resources/proposals/test-proposals.js --network rinkeby --dry-run
//  mainnet:
//    ENV_PATH=env_vars/19-02-07__mainnet_test.conf yarn make-proposal -f ./test/resources/proposals/test-proposals.js --network mainnet --dry-run

const DutchExchange = artifacts.require('DutchExchange')

const genesisProtocolHelper = require('../helpers/genesisProtocolHelper')({ artifacts, web3 })
const getDaostackContract = require('../helpers/getDaostackContract')(web3, artifacts)

const DxAvatar = artifacts.require('DxAvatar')
const path = require('path')

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
    genesisProtocol,
    genesisProtocolParamsHash
  } = await getGenesisProtocolInfo(network)
  console.log('\nGenesis protocol info:')
  console.log(`     GenericScheme: ${genericScheme.address}`)
  console.log(`     GenesisProtocol: ${genesisProtocol.address}`)
  console.log(`     DutchX GP hash: ${genesisProtocolParamsHash}`)

  assert(proposals && proposals.length > 0, 'The list of proposals is empty')
  console.log('\n%d Proposals:', proposals.length)

  for (let i = 0; i < proposals.length; i++) {
    const proposal = proposals[i]
    const proposalNumber = i + 1
    const { type, description, ...data } = proposal
    assert(type, '"type" is mandatory for every proposal')
    console.log('\nProposal %d - %s: ', proposalNumber, type, description ? description : 'No description')
    console.log('    - data: %o', data)

    // Get parameters for the proposal
    let abiEncodedCall
    switch (type) {
      case 'CHANGE-THRESHOLD-NEW-AUCTION':
        abiEncodedCall = changeThresholdNewAuctionEncoded(proposal)
        break;
      case 'CHANGE-THRESHOLD-NEW-TOKEN-PAIR':
        abiEncodedCall = changeThresholdNewTokenPairEncoded(proposal)
        break;
      case 'UPDATE-AUCTIONEER':
        abiEncodedCall = updateAuctioneerEncoded(proposal)
        break;
      case 'UPGRADE-MASTER-CONTRACT':
        abiEncodedCall = upgradeMasterContractEncoded(proposal)
        break;
      case 'UPDATE-ETH-USD-ORACLE':
        abiEncodedCall = updateEthUsdOracleEncoded(proposal)
        break;
      case 'UPDATE-APPROVED_TOKENS':
        abiEncodedCall = updateApprovedTokensEncoded(proposal)
        break;
      default:
        throw new Error('Unknown proposal type: ' + type)
    }

    // console.log(encodedMethod)
    console.log('    - abi encoded call: %s', abiEncodedCall)

    if (dryRun) {
      genericScheme.proposeCall.call(avatarAddress, abiEncodedCall, description || '')
      console.log('    - Dry run Success!')
    } else {
      const makeProposalResult = await genericScheme.proposeCall(avatarAddress, abiEncodedCall, description || '')
      console.log('    - Success! The proposal was made. Transaction: %s', makeProposalResult.tx)
    }
  }

  console.log('\n ****************************\n')
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


function getDxFunctionAbi(name) {
  const abi = DutchExchange.abi.find(def => {
    return def.name === name && def.type === 'function'
  })
  assert(abi, `The DutchX abi doesn't have any function called ${name}`)

  return abi
}


async function getGenesisProtocolInfo(network) {
  // Get contracts  
  const genericScheme = await getDaostackContract('GenericScheme')
  const genesisProtocol = await getDaostackContract('GenesisProtocol')

  const genesisProtocolParamsHash = await genesisProtocolHelper.getParameterHash('dutchX')

  const actualParams = await genesisProtocol.parameters.call(genesisProtocolParamsHash)

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
  assert(!unknownParameters, `The hash ${genesisProtocolParamsHash} is unknown in GP ${genesisProtocol.address}.

GP returned params with all 0x0 for ${genesisProtocolParamsHash}:
${JSON.stringify(actualParams, null, 2)}

Review the Genesis Protocol Params, and ensure they were set in the GP of the current network (${network})
`)

  return {
    genericScheme,
    genesisProtocol,
    genesisProtocolParamsHash
  }
}

module.exports = callback => {
  main().then(callback).catch(callback)
}
