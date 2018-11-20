/* global artifacts, web3 */
/* eslint no-undef: "error" */

const DxLockEth4Rep = artifacts.require('DxLockEth4Rep')
const DxAvatar = artifacts.require('DxAvatar')
const DxController = artifacts.require('DxController')

const dateUtil = require('../src/helpers/dateUtil')

const registerScheme = require('./helpers/registerScheme')

const {
  reputationReward,
  // TODO: update times, now in the past
  lockingStartTime: startTime,
  lockingEndTime: endTime,
  maxLockingPeriod
} = require('../src/config/schemes/old/lockingeth4reputationparams.json')

module.exports = async function (deployer) {
  const dxAvatar = await DxAvatar.deployed()
  const dxController = await DxController.deployed()
  console.log('Deploy DxLockEth4Rep that inherits from LockingEth4Reputation')
  const dxLockEth4Rep = await deployer.deploy(DxLockEth4Rep)

  console.log('Configure DxLockEth4Rep')

  // TODO: have real times in config, for now current time + from config
  // to ensure times are in the future
  const lockingStartTime = new Date(Date.now() + startTime * 1000)
  const lockingEndTime = new Date(Date.now() + endTime * 1000)

  const redeemEnableTime = lockingEndTime

  console.log('  - Avatar address:', dxAvatar.address)
  console.log('  - Reputation reward:', reputationReward)
  console.log('  - Locking start time:', dateUtil.formatDateTime(lockingStartTime))
  console.log('  - Locking end time:', dateUtil.formatDateTime(lockingEndTime))
  console.log('  - Redeem enable time:', dateUtil.formatDateTime(redeemEnableTime))
  console.log('  - max locking period:', maxLockingPeriod)

  await dxLockEth4Rep.initialize(
    dxAvatar.address,
    reputationReward,
    dateUtil.toEthereumTimestamp(lockingStartTime),
    dateUtil.toEthereumTimestamp(lockingEndTime),
    dateUtil.toEthereumTimestamp(redeemEnableTime),
    maxLockingPeriod
  )

  await registerScheme({
    label: 'DxLockEth4Rep',
    schemeAddress: dxLockEth4Rep.address,
    avatarAddress: dxAvatar.address,
    controller: dxController,
    web3
  })
}
