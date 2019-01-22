/* global artifacts, web3 */
/* eslint no-undef: "error" */
const assert = require('assert')
const DxLockEth4Rep = artifacts.require('DxLockEth4Rep')
const DxAvatar = artifacts.require('DxAvatar')
const DxController = artifacts.require('DxController')

const dateUtil = require('../src/helpers/dateUtil')

const { registerScheme } = require('./helpers/schemeUtils')

const {
  maxLockingEthPeriod
} = require('../src/config/bootstrap')

const {
  initialDistributionStart,
  initialDistributionEnd,
  redeemStart
} = require('../src/config/timePeriods')

const {
  ethReward
} = require('../src/config/initialRepDistribution')(web3)

module.exports = async function (deployer) {
  const dxAvatar = await DxAvatar.deployed()
  const dxController = await DxController.deployed()
  console.log('Deploy DxLockEth4Rep that inherits from LockingEth4Reputation')
  const dxLockEth4Rep = await deployer.deploy(DxLockEth4Rep)

  assert(ethReward, `The parameter ethReward was not defined`)
  assert(initialDistributionStart, `The parameter initialDistributionStart was not defined`)
  assert(initialDistributionEnd, `The parameter initialDistributionEnd was not defined`)
  assert(maxLockingEthPeriod, `The parameter maxLockingEthPeriod was not defined`)

  console.log('Configure DxLockEth4Rep')

  console.log('  - Avatar address:', dxAvatar.address)
  console.log('  - Reputation reward:', ethReward)
  console.log('  - Locking start time:', dateUtil.formatDateTime(initialDistributionStart))
  console.log('  - Locking end time:', dateUtil.formatDateTime(initialDistributionEnd))
  console.log('  - Redeem enable time:', dateUtil.formatDateTime(redeemStart))
  console.log('  - max locking period:', maxLockingEthPeriod)

  await dxLockEth4Rep.initialize(
    dxAvatar.address,
    ethReward,
    dateUtil.toEthereumTimestamp(initialDistributionStart),
    dateUtil.toEthereumTimestamp(initialDistributionEnd),
    dateUtil.toEthereumTimestamp(redeemStart),
    maxLockingEthPeriod
  )

  await registerScheme({
    label: 'DxLockEth4Rep',
    schemeAddress: dxLockEth4Rep.address,
    avatarAddress: dxAvatar.address,
    controller: dxController,
    web3
  })
}
