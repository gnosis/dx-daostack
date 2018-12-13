/* global artifacts, web3 */
/* eslint no-undef: "error" */
const assert = require('assert')
const DxLockWhitelisted4Rep = artifacts.require('DxLockWhitelisted4Rep')
const FixedPriceOracle = artifacts.require('FixedPriceOracle')
const DxAvatar = artifacts.require('DxAvatar')
const DxController = artifacts.require('DxController')

const getDXContractAddress = require('../src/helpers/getDXContractAddresses.js')(web3, artifacts)
const dateUtil = require('../src/helpers/dateUtil')
const { registerScheme } = require('./helpers/schemeUtils')

const {
  maxLockingWhitelistedTokensPeriod
} = require('../src/config/bootstrap')

const {
  whitelistedTokensReward
} = require('../src/config/initalRepDistribution')

const getDXContractAddresses = require('../src/helpers/getDXContractAddresses')(web3, artifacts)

module.exports = async function (deployer) {
  const dxAvatar = await DxAvatar.deployed()
  const dxController = await DxController.deployed()

  const gnoAddress = await getDXContractAddresses('TokenGNO')

  const dutchXContractAddress = await getDXContractAddress('DutchExchangeProxy')
  console.log('Deploy FixedPriceOracle: for setting the prices for the tokens')
  console.log('  - DutchX address: %s', dutchXContractAddress)
  await deployer.deploy(FixedPriceOracle, dutchXContractAddress)
  
  console.log('Deploy DxLockWhitelisted4Rep that inherits from LockingToken4Reputation') // TODO:
  const dxLockWhitelisted4Rep = await deployer.deploy(DxLockWhitelisted4Rep)

  console.log('Configure DxLockGno4Rep')

  // TODO: have real times in config, for now current time + from config
  // to ensure times are in the future
  const lockingStartTime = new Date(Date.now() + startTime * 1000)
  const lockingEndTime = new Date(Date.now() + endTime * 1000)

  const redeemEnableTime = lockingEndTime

  assert(whitelistedTokensReward, `The parameter whitelistedTokensReward was not defined`)
  assert(lockingStartTime, `The parameter lockingStartTime was not defined`)
  assert(lockingEndTime, `The parameter lockingEndTime was not defined`)
  assert(redeemEnableTime, `The parameter redeemEnableTime was not defined`)
  assert(maxLockingWhitelistedTokensPeriod, `The parameter maxLockingWhitelistedTokensPeriod was not defined`)
  assert(gnoAddress, `The parameter gnoAddress was not defined`)

  console.log('  - Avatar address:', dxAvatar.address)
  console.log('  - Reputation reward:', whitelistedTokensReward)
  console.log('  - Locking start time:', dateUtil.formatDateTime(lockingStartTime))
  console.log('  - Locking end time:', dateUtil.formatDateTime(lockingEndTime))
  console.log('  - Redeem enable time:', dateUtil.formatDateTime(redeemEnableTime))
  console.log('  - max locking period:', maxLockingWhitelistedTokensPeriod)
  console.log('  - locking token address (GNO):', gnoAddress)

  await dxLockWhitelisted4Rep.initialize(
    dxAvatar.address,
    whitelistedTokensReward,
    dateUtil.toEthereumTimestamp(lockingStartTime),
    dateUtil.toEthereumTimestamp(lockingEndTime),
    dateUtil.toEthereumTimestamp(redeemEnableTime),
    maxLockingWhitelistedTokensPeriod,
    gnoAddress
  )

  await registerScheme({
    label: 'DxLockGno4Rep',
    schemeAddress: dxLockWhitelisted4Rep.address,
    avatarAddress: dxAvatar.address,
    controller: dxController,
    web3
  })
}
