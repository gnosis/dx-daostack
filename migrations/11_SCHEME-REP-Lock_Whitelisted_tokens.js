/* global artifacts, web3 */
/* eslint no-undef: "error" */
const assert = require('assert')
const DxLockWhitelisted4Rep = artifacts.require('DxLockWhitelisted4Rep')
const FixedPriceOracle = artifacts.require('FixedPriceOracle')
const DxAvatar = artifacts.require('DxAvatar')
const DxController = artifacts.require('DxController')
const BasicTokenWhitelist = artifacts.require('BasicTokenWhitelist')

const getDXContractAddress = require('../src/helpers/getDXContractAddresses.js')(web3, artifacts)
const getPriceOracleAddress = require('../src/helpers/getPriceOracleAddress.js')(web3, artifacts)
const dateUtil = require('../src/helpers/dateUtil')
const { registerScheme } = require('./helpers/schemeUtils')

const {
  maxLockingWhitelistedTokensPeriod
} = require('../src/config/bootstrap')

const {
  whitelistedTokensReward
} = require('../src/config/initalRepDistribution')

const {
  initialDistributionStart,
  initialDistributionEnd,
  redeemStart
} = require('../src/config/timePeriods')

module.exports = async function (deployer, network) {
  const dxAvatar = await DxAvatar.deployed()
  const dxController = await DxController.deployed()

  let priceOracleAddress
  if (process.env.USE_FIXED_PRICE_ORACLE === 'true') {
    // Deploy Fixed Price Oracle
    console.log('Using Fixed Price Oracle')
    const fixedPriceOracle = await deployFixedPriceOracle(deployer, network)
    priceOracleAddress = fixedPriceOracle.address
  } else {
    // Get price oracle address
    console.log('Using Price Oracle')
    priceOracleAddress = await getPriceOracleAddress()
  }

  // Deploy DxLockWhitelisted4Rep scheme
  console.log('Deploy DxLockWhitelisted4Rep that inherits from LockingToken4Reputation') // TODO:
  const dxLockWhitelisted4Rep = await deployer.deploy(DxLockWhitelisted4Rep)

  console.log('Configure DxLockWhitelisted4Rep')
  assert(whitelistedTokensReward, `The parameter whitelistedTokensReward was not defined`)
  assert(initialDistributionStart, `The parameter initialDistributionStart was not defined`)
  assert(initialDistributionEnd, `The parameter initialDistributionEnd was not defined`)

  assert(redeemStart, `The parameter redeemStart was not defined`)
  assert(maxLockingWhitelistedTokensPeriod, `The parameter maxLockingWhitelistedTokensPeriod was not defined`)

  console.log('  - Avatar address:', dxAvatar.address)
  console.log('  - Reputation reward:', whitelistedTokensReward)
  console.log('  - Locking start time:', dateUtil.formatDateTime(initialDistributionStart))
  console.log('  - Locking end time:', dateUtil.formatDateTime(initialDistributionEnd))
  console.log('  - Redeem enable time:', dateUtil.formatDateTime(redeemStart))
  console.log('  - max locking period:', maxLockingWhitelistedTokensPeriod)
  console.log('  - Price Oracle address:', priceOracleAddress)

  await dxLockWhitelisted4Rep.initialize(
    dxAvatar.address,
    whitelistedTokensReward,
    dateUtil.toEthereumTimestamp(initialDistributionStart),
    dateUtil.toEthereumTimestamp(initialDistributionEnd),
    dateUtil.toEthereumTimestamp(redeemStart),
    maxLockingWhitelistedTokensPeriod,
    priceOracleAddress
  )

  await registerScheme({
    label: 'DxLockWhitelisted4Rep',
    schemeAddress: dxLockWhitelisted4Rep.address,
    avatarAddress: dxAvatar.address,
    controller: dxController,
    web3
  })
}


async function deployFixedPriceOracle(deployer, network) {
  let tokenWhitelistAddress, whiteListAddressMsg

  if (network === 'rinkeby') {
    console.log('Deploy BasicTokenWhitelist for testing in Rinkeby:')
    const basicTokenWhitelist = await deployer.deploy(BasicTokenWhitelist)
    whiteListAddressMsg = 'Token White List Address (BasicTokenWhitelist, only for testing): ' + tokenWhitelistAddress

    // Add some test tokens for Rinkeby    
    const whitelistedTokens = {
      WETH: '0xc778417e063141139fce010982780140aa0cd5ab',
      RDN: '0x3615757011112560521536258c1e7325ae3b48ae',
      OMG: '0x00df91984582e6e96288307e9c2f20b38c8fece9',
      testGEN: '0xa1f34744c80e7a9019a5cd2bf697f13df00f9773',
      GEN: '0x543ff227f64aa17ea132bf9886cab5db55dcaddf'
    }
    console.log('\nWhite list the tokens: ')
    Object.keys(whitelistedTokens).forEach(tokenName => {
      console.log('  - %s: %s', tokenName, whitelistedTokens[tokenName])
    })
    await basicTokenWhitelist.updateApprovalOfToken(Object.values(whitelistedTokens), true)
    tokenWhitelistAddress = basicTokenWhitelist.address
  } else {
    tokenWhitelistAddress = await getDXContractAddress('DutchExchangeProxy')
    whiteListAddressMsg = 'Token White List Address (DutchX): ' + tokenWhitelistAddress
  }

  console.log('\nDeploy FixedPriceOracle: for setting the prices for the tokens')
  console.log('  - ' + whiteListAddressMsg)
  const fixedPriceOracle = await deployer.deploy(FixedPriceOracle, tokenWhitelistAddress)

  return fixedPriceOracle
}
