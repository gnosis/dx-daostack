/* global artifacts, web3 */
/* eslint no-undef: "error" */
const assert = require('assert')
const dateUtil = require('../src/helpers/dateUtil')
const { registerScheme } = require('./helpers/schemeUtils')

const {
  getLockedMgnSignature
} = require('../src/config/bootstrap')

// TODO: Once we use the latest contracts, we should use all this dates.
const {
  initialDistributionStart,
  initialDistributionEnd,
  claimingMgnStart,
  claimingMgnEnd,
  redeemStart
} = require('../src/config/timePeriods')

const {
  mgnReward
} = require('../src/config/initalRepDistribution')

const getDXContractAddresses = require('../src/helpers/getDXContractAddresses')(web3, artifacts)

module.exports = async function (deployer) {
  const DxLockMgnForRep = artifacts.require('DxLockMgnForRep')
  const DxAvatar = artifacts.require('DxAvatar')
  const DxController = artifacts.require('DxController')

  // Get instances
  const dxAvatar = await DxAvatar.deployed()
  const dxController = await DxController.deployed()

  const mgnTokenAddress = await getDXContractAddresses('TokenFRT')

  // Deploy DxLockMgnForRep
  console.log('Deploying DxLockMgnForRep scheme')
  console.log('  - Scheme that allows to get GEN by locking MGN')
  await deployer.deploy(DxLockMgnForRep)

  // Initialize DxLockMgnForRep
  const dxLockMgnForRep = await DxLockMgnForRep.deployed()
  console.log('Configure DxLockMgnForRep scheme:')
  assert(mgnReward, `The parameter reputationReward was not defined`)
  assert(initialDistributionStart, `The parameter initialDistributionStart was not defined`)
  assert(initialDistributionEnd, `The parameter initialDistributionEnd was not defined`)
  assert(claimingMgnStart, `The parameter claimingMgnStart was not defined`)
  assert(claimingMgnEnd, `The parameter claimingMgnEnd was not defined`)
  assert(redeemStart, `The parameter redeemStart was not defined`)
  assert(getLockedMgnSignature, `The parameter getBalanceFuncSignature was not defined`)

  console.log('  - Avatar address: ' + dxAvatar.address)
  console.log('  - Reputation reward: %dK', mgnReward / 1000)
  console.log('  - Opt in start time: ' + dateUtil.formatDateTime(initialDistributionStart))
  console.log('  - Opt in end time: ' + dateUtil.formatDateTime(initialDistributionEnd))
  console.log('  - Claim start time: ' + dateUtil.formatDateTime(claimingMgnStart))
  console.log('  - Claim end time: ' + dateUtil.formatDateTime(claimingMgnEnd))  
  console.log('  - Redeem enable time: ' + dateUtil.formatDateTime(redeemStart))
  console.log('  - MGN address (external locking contract): ' + mgnTokenAddress)
  console.log('  - Get balance function signature: ' + getLockedMgnSignature)

  let txResult = await dxLockMgnForRep.initialize(
    dxAvatar.address,
    mgnReward,
    dateUtil.toEthereumTimestamp(initialDistributionStart),
    dateUtil.toEthereumTimestamp(initialDistributionEnd),
    // TODO: Add claiming times
    dateUtil.toEthereumTimestamp(redeemStart),
    mgnTokenAddress,
    getLockedMgnSignature
  )
  console.log('  - Transaction: ' + txResult.tx)
  console.log('  - Gas used: ' + txResult.receipt.gasUsed)
  console.log(`(*) Dates use ${dateUtil.timeZone} time zone`)
  console.log()

  // Register scheme DxLockMgnForRep
  await registerScheme({
    label: 'DxLockMgnForRep',
    schemeAddress: dxLockMgnForRep.address,
    avatarAddress: dxAvatar.address,
    controller: dxController,
    web3
  })
}
