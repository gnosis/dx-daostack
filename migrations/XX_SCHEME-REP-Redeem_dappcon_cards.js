/* global artifacts, web3 */
/* eslint no-undef: "error" */
const assert = require('assert')

const DxRedeemDappconCards = artifacts.require('DxRedeemDappconCards')
const DxAvatar = artifacts.require('DxAvatar')
const DxController = artifacts.require('DxController')

const dateUtil = require('../src/helpers/dateUtil')

const { registerScheme } = require('./helpers/schemeUtils')

const {
  contributorsReward: reputationReward
} = require('../src/config/initalRepDistribution')

const {
  redeemStart
} = require('../src/config/timePeriods')

module.exports = async function (deployer) {
  const dxAvatar = await DxAvatar.deployed()
  const dxController = await DxController.deployed()

  assert(reputationReward, `The parameter redeemStart was not defined`)
  assert(redeemStart, `The parameter redeemStart was not defined`)

  console.log('Deploy DxRedeemDappconCards that inherits from FixedReputationAllocation')
  const dxRedeemDappconCards = await deployer.deploy(DxRedeemDappconCards)

  console.log('Configure DxRedeemDappconCards')

  console.log('  - Avatar address:', dxAvatar.address)
  console.log('  - Reputation reward:', reputationReward)
  console.log('  - Redeem enable time:', dateUtil.formatDateTime(redeemStart))

  await dxRedeemDappconCards.initialize(
    dxAvatar.address,
    reputationReward,
    dateUtil.toEthereumTimestamp(redeemStart)
  )

  await registerScheme({
    label: 'DxRedeemDappconCards',
    schemeAddress: dxRedeemDappconCards.address,
    avatarAddress: dxAvatar.address,
    controller: dxController,
    web3
  })

  throw new Error('Dappcon cards are not used for REP')
}
