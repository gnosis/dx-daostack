/* global artifacts, web3 */
/* eslint no-undef: "error" */

const DxRedeemDappconCards = artifacts.require('DxRedeemDappconCards')
const DxAvatar = artifacts.require('DxAvatar')
const DxController = artifacts.require('DxController')

const dateUtil = require('../src/helpers/dateUtil')

const registerScheme = require('./helpers/registerScheme')

const {
  dappConReward: reputationReward
} = require('../src/config/rep/initalRepDistribution')

const {
  endDate: redeemEnableTime
} = require('../src/config/timePeriods/initialLocking')

module.exports = async function (deployer) {
  const dxAvatar = await DxAvatar.deployed()
  const dxController = await DxController.deployed()

  console.log('Deploy DxRedeemDappconCards that inherits from FixedReputationAllocation')
  const dxRedeemDappconCards = await deployer.deploy(DxRedeemDappconCards)

  console.log('Configure DxRedeemDappconCards')

  console.log('  - Avatar address:', dxAvatar.address)
  console.log('  - Reputation reward:', reputationReward)
  console.log('  - Redeem enable time:', dateUtil.formatDateTime(redeemEnableTime))

  await dxRedeemDappconCards.initialize(
    dxAvatar.address,
    reputationReward,
    dateUtil.toEthereumTimestamp(redeemEnableTime)
  )

  await registerScheme({
    label: 'DxRedeemDappconCards',
    schemeAddress: dxRedeemDappconCards.address,
    avatarAddress: dxAvatar.address,
    controller: dxController,
    web3
  })
}
