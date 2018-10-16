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

module.exports = async function (deployer) {
  const DxLockMgnForRep = artifacts.require('DxLockMgnForRep')
  const MgnToken = artifacts.require('MgnToken')
  const DxAvatar = artifacts.require('DxAvatar')
  const DxController = artifacts.require('DxController')

  // Get instances
  const mgnToken = await MgnToken.deployed()
  const dxAvatar = await DxAvatar.deployed()
  const dxController = await DxController.deployed()

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

  console.log('  - Avatar address: ' + dxAvatar.address)
  console.log('  - Reputation reward: %dK', mgnReward / 1000)
  console.log('  - Locking start time (UTC): ' + dateUtil.formatDateTime(lockingStartTime))
  console.log('  - Locking end time (UTC): ' + dateUtil.formatDateTime(lockingEndTime))
  console.log('  - MGN address (external locking contract): ' + mgnToken.address)
  console.log('  - Get balance function signature: ' + getBalanceFuncSignature)

  let txResult = await dxLockMgnForRep.initialize(
    dxAvatar.address,
    mgnReward,
    dateUtil.toEthereumTimestamp(lockingStartTime),
    dateUtil.toEthereumTimestamp(lockingEndTime),
    mgnToken.address,
    getBalanceFuncSignature
  )
  console.log('  - Transaction: ' + txResult.tx)
  console.log('  - Gas used: ' + txResult.receipt.gasUsed)
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