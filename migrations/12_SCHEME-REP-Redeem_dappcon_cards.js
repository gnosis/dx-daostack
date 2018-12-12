/* global artifacts, web3 */
/* eslint no-undef: "error" */
const assert = require('assert')

const DxRedeemDappconCards = artifacts.require('DxRedeemDappconCards')
const DxAvatar = artifacts.require('DxAvatar')
const DxController = artifacts.require('DxController')

const dateUtil = require('../src/helpers/dateUtil')

const registerScheme = require('./helpers/registerScheme')

const {
  dappConReward: reputationReward
} = require('../src/config/initalRepDistribution')

const {
  redeemReputationStart
} = require('../src/config/timePeriods')

module.exports = async function (deployer) {
  const dxAvatar = await DxAvatar.deployed()
  const dxController = await DxController.deployed()

  assert(redeemReputationStart, `The parameter redeemReputationStart was not defined`)

  console.log('Deploy DxRedeemDappconCards that inherits from FixedReputationAllocation')
  const dxRedeemDappconCards = await deployer.deploy(DxRedeemDappconCards)

  console.log('Configure DxRedeemDappconCards')

  console.log('  - Avatar address:', dxAvatar.address)
  console.log('  - Reputation reward:', reputationReward)
  console.log('  - Redeem enable time:', dateUtil.formatDateTime(redeemReputationStart))

  await dxRedeemDappconCards.initialize(
    dxAvatar.address,
    reputationReward,
    dateUtil.toEthereumTimestamp(redeemReputationStart)
  )

  await registerScheme({
    label: 'DxRedeemDappconCards',
    schemeAddress: dxRedeemDappconCards.address,
    avatarAddress: dxAvatar.address,
    controller: dxController,
    web3
  })
}
