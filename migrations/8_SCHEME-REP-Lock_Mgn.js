/* global artifacts, web3 */
/* eslint no-undef: "error" */
const assert = require('assert')
const dateUtil = require('../src/helpers/dateUtil')
const registerScheme = require('./helpers/registerScheme')

const {
  getBalanceFuncSignature
} = require('../src/config/schemes/DxLockMgnForRep')

const {
  startDate: lockingStartTime,
  endDate: lockingEndTime
} = require('../src/config/timePeriods/initialLocking')

const {
  mgnReward
} = require('../src/config/rep/initalRepDistribution')

const getDXContractAddresses = require('../src/helpers/getDXContractAddresses.js')(web3, artifacts)

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
  assert(lockingStartTime, `The parameter lockingStartTime was not defined`)
  assert(lockingEndTime, `The parameter lockingEndTime was not defined`)
  assert(getBalanceFuncSignature, `The parameter getBalanceFuncSignature was not defined`)

  // TODO: Make sure that this is correct
  const redeemEnableTime = lockingEndTime

  console.log('  - Avatar address: ' + dxAvatar.address)
  console.log('  - Reputation reward: %dK', mgnReward / 1000)
  console.log('  - Locking start time: ' + dateUtil.formatDateTime(lockingStartTime))
  console.log('  - Locking end time: ' + dateUtil.formatDateTime(lockingEndTime))
  console.log('  - Redeem enable time: ' + dateUtil.formatDateTime(redeemEnableTime))
  console.log('  - MGN address (external locking contract): ' + mgnTokenAddress)
  console.log('  - Get balance function signature: ' + getBalanceFuncSignature)

  let txResult = await dxLockMgnForRep.initialize(
    dxAvatar.address,
    mgnReward,
    dateUtil.toEthereumTimestamp(lockingStartTime),
    dateUtil.toEthereumTimestamp(lockingEndTime),
    dateUtil.toEthereumTimestamp(redeemEnableTime),
    mgnTokenAddress,
    getBalanceFuncSignature
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
