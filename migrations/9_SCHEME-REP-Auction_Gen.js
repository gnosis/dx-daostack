/* global artifacts, web3 */
/* eslint no-undef: "error" */
const DxAuction4Rep = artifacts.require('DxAuction4Rep')
const DxAvatar = artifacts.require('DxAvatar')
const DxController = artifacts.require('DxController')
const GenToken = artifacts.require('GenToken')

const dateUtil = require('../src/helpers/dateUtil')

const registerScheme = require('./helpers/registerScheme')

const {
  reputationReward,
  // TODO: update times, now in the past
  lockingStartTime,
  lockingEndTime,
  numberOfAuctions,
  wallet
} = require('../src/config/schemes/old/auction4reputationparams.json')

module.exports = async function (deployer) {
  const genToken = await GenToken.deployed()
  const dxAvatar = await DxAvatar.deployed()
  const dxController = await DxController.deployed()

  console.log('Deploy DxAuction4Rep that inherits from Auction4Reputation')
  const dxAuction4Rep = await deployer.deploy(DxAuction4Rep)
  console.log('  - Scheme for conducting ERC20 Tokens auctions for reputation')

  console.log('Configure DxAuction4Rep')

  // TODO: have real times in config, for now current time + from config
  // to ensure times are in the future
  const auctionStartTime = new Date(Date.now() + lockingStartTime * 1000)
  const auctionEndTime = new Date(Date.now() + lockingEndTime * 1000)

  const redeemEnableTime = auctionEndTime

  // TODO: have a real address in config
  const walletAddress = web3.utils.isAddress(wallet)
    ? wallet : (await web3.eth.getAccounts())[0]

  console.log('  - Avatar address:', dxAvatar.address)
  console.log('  - Reputation reward:', reputationReward)
  console.log('  - Auction start time:', dateUtil.formatDateTime(auctionStartTime))
  console.log('  - Auction end time:', dateUtil.formatDateTime(auctionEndTime))
  console.log('  - Redeem enable time:', dateUtil.formatDateTime(redeemEnableTime))
  console.log('  - number of auctions:', numberOfAuctions)
  // QUESTION: is GEN token - staking token?
  console.log('  - Staking token address (GEN):', genToken.address)
  console.log('  - wallet address: ', walletAddress)

  await dxAuction4Rep.initialize(
    dxAvatar.address,
    reputationReward,
    dateUtil.toEthereumTimestamp(auctionStartTime),
    dateUtil.toEthereumTimestamp(auctionEndTime),
    numberOfAuctions,
    dateUtil.toEthereumTimestamp(redeemEnableTime),
    genToken.address,
    walletAddress
  )

  await registerScheme({
    label: 'DxAuction4Rep',
    schemeAddress: dxAuction4Rep.address,
    avatarAddress: dxAvatar.address,
    controller: dxController,
    web3
  })
}
