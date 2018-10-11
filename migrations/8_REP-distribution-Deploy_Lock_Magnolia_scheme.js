/* global artifacts */
/* eslint no-undef: "error" */
const assert = require('assert')
const dateUtil = require('../src/helpers/dateUtil')

module.exports = async function (deployer) {
  const DxLockMgnForRep = artifacts.require('DxLockMgnForRep')
  const MgnToken = artifacts.require('MgnToken')
  const DxAvatar = artifacts.require('DxAvatar')

  // Get instances
  const mgnToken = await MgnToken.deployed()
  const dxAvatar = await DxAvatar.deployed()

  // Deploy DxLockMgnForRep
  console.log('Deploying DxLockMgnForRep scheme')
  console.log('  - Scheme that allows to get GEN by locking MGN')
  await deployer.deploy(DxLockMgnForRep)

  // Initialize DxLockMgnForRep
  const dxLockMgnForRep = await DxLockMgnForRep.deployed()
  const {
    reputationReward,
    lockingStartTime,
    lockingEndTime,
    getBalanceFuncSignature
  } = require('../src/config/schemes/DxLockMgnForRep')

  console.log('Configure DxLockMgnForRep scheme:')
  assert(reputationReward, `The parameter reputationReward was not defined`)
  assert(lockingStartTime, `The parameter lockingStartTime was not defined`)
  assert(lockingEndTime, `The parameter lockingEndTime was not defined`)
  assert(getBalanceFuncSignature, `The parameter getBalanceFuncSignature was not defined`)

  console.log('  - Avatar address: ' + dxAvatar.address)
  console.log('  - Reputation reward: ' + reputationReward)
  console.log('  - Locking start time (UTC): ' + lockingStartTime)
  console.log('  - Locking end time (UTC): ' + lockingEndTime)
  console.log('  - MGN address (external locking contract): ' + mgnToken.address)
  console.log('  - Get balance function signature: ' + getBalanceFuncSignature)

  const txResult = await dxLockMgnForRep.initialize(
    dxAvatar.address,
    reputationReward,
    dateUtil.toEthereumTimestamp(lockingStartTime),
    dateUtil.toEthereumTimestamp(lockingEndTime),
    mgnToken.address,
    getBalanceFuncSignature
  )
  console.log('  - Transaction: ' + txResult.tx)
  console.log('  - Gas used: ' + txResult.receipt.gasUsed)
  console.log()
}
