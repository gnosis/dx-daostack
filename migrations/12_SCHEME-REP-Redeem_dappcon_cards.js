/* global artifacts, web3 */
/* eslint no-undef: "error" */

const DxRedeemDappconCards = artifacts.require('DxRedeemDappconCards')
const DxAvatar = artifacts.require('DxAvatar')
const DxController = artifacts.require('DxController')

const dateUtil = require('../src/helpers/dateUtil')

const registerScheme = require('./helpers/registerScheme')

const {
  reputationReward,
  redeemEnableTime: redeemTime
} = require('../src/config/schemes/old/fixreputationallocationparams.json')

module.exports = async function (deployer) {
  const dxAvatar = await DxAvatar.deployed()
  const dxController = await DxController.deployed()

  console.log('Deploy DxRedeemDappconCards that inherits from FixedReputationAllocation')
  const dxRedeemDappconCards = await deployer.deploy(DxRedeemDappconCards)

  console.log('Configure DxRedeemDappconCards')

  // TODO: have real times in config, for now current time + from config
  // to ensure times are in the future
  const redeemEnableTime = new Date(Date.now() + redeemTime * 1000)

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
