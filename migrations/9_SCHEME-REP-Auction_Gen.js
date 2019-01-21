/* global artifacts, web3 */
/* eslint no-undef: "error" */
const assert = require('assert')

const DxGenAuction4Rep = artifacts.require('DxGenAuction4Rep')
const DxAvatar = artifacts.require('DxAvatar')
const DxController = artifacts.require('DxController')

const dateUtil = require('../src/helpers/dateUtil')

const { registerScheme } = require('./helpers/schemeUtils')
const getDaostackContract = require('../src/helpers/getDaostackContract')(web3, artifacts)

const {
  numberOfGenAuctions
} = require('../src/config/bootstrap')

const {
  initialDistributionStart,
  initialDistributionEnd,
  redeemStart
} = require('../src/config/timePeriods')

const {
  genReward: reputationReward
} = require('../src/config/initalRepDistribution')

module.exports = async function (deployer) {
  // TODO: get address from config/networks/GenesisProtocol.stakingToken()
  const genToken = await getDaostackContract('GenToken')
  const dxAvatar = await DxAvatar.deployed()
  const dxController = await DxController.deployed()

  assert(initialDistributionStart, `The parameter initialDistributionStart was not defined`)
  assert(initialDistributionEnd, `The parameter initialDistributionEnd was not defined`)
  assert(redeemStart, `The parameter redeemStart was not defined`)
  assert(numberOfGenAuctions, `The parameter numberOfGenAuctions was not defined`)
  

  console.log('Deploy DxGenAuction4Rep that inherits from Auction4Reputation')
  const dxGenAuction4Rep = await deployer.deploy(DxGenAuction4Rep)
  console.log('  - Scheme for conducting ERC20 Tokens auctions for reputation')

  console.log('Configure DxGenAuction4Rep')

  const auctionPeriod = Math.floor(
    (dateUtil.toEthereumTimestamp(initialDistributionEnd) - dateUtil.toEthereumTimestamp(initialDistributionStart))
    / numberOfGenAuctions
  )

  const reputationRewardPerAuction = Math.floor(reputationReward / numberOfGenAuctions)

  const walletAddress = dxAvatar.address
  console.log('  - Avatar address:', dxAvatar.address)
  console.log('  - Reputation reward:', reputationReward)
  console.log('  - Reputation reward per auction:', reputationRewardPerAuction)
  console.log('  - Auction start time:', dateUtil.formatDateTime(initialDistributionStart))
  console.log('  - Auction end time:', dateUtil.formatDateTime(initialDistributionEnd))
  console.log('  - Redeem enable time:', dateUtil.formatDateTime(redeemStart))
  console.log('  - Number of auctions:', numberOfGenAuctions)
  console.log('  - Auction period (end - start)/number of auctions:', auctionPeriod)
  // QUESTION: is GEN token - staking token?
  console.log('  - Staking token address (GEN):', genToken.address)
  console.log('  - wallet address (DxAvatar.address): ', walletAddress)

  await dxGenAuction4Rep.initialize(
    dxAvatar.address,
    reputationRewardPerAuction,
    dateUtil.toEthereumTimestamp(initialDistributionStart),
    auctionPeriod,
    numberOfGenAuctions,
    dateUtil.toEthereumTimestamp(redeemStart),
    genToken.address,
    walletAddress
  )

  await registerScheme({
    label: 'DxGenAuction4Rep',
    schemeAddress: dxGenAuction4Rep.address,
    avatarAddress: dxAvatar.address,
    controller: dxController,
    web3
  })
}
