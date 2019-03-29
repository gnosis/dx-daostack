/* global artifacts, web3 */
/* eslint no-undef: "error" */
const migrateDx = require('@gnosis.pm/dx-contracts/src/migrations-truffle-5')

const getDaostackContract = require('../src/helpers/getDaostackContract')(web3, artifacts)

// const assert = require('assert')
const BN = web3.utils.BN

module.exports = async function (deployer, network, accounts) {
  if (network === 'development') {
    console.log('Deploying some contracts into a local ganche-cli')
    const owner = accounts[0]

    // Deploy DutchX
    await migrateDx({
      artifacts,
      deployer,
      network,
      accounts,
      web3,
      thresholdNewTokenPairUsd: process.env.THRESHOLD_NEW_TOKEN_PAIR_USD,
      thresholdAuctionStartUsd: process.env.THRESHOLD_AUCTION_START_USD
    })

    // Deploy DxPriceFeed
    const priceOracleImpl = process.env.PRICE_ORACLE_IMPL
    if (priceOracleImpl && priceOracleImpl === 'FixedPriceOracle') {
      console.log("Using the fixed price oracle: It'll be deployed in migration 11")
    } else {
      console.log('Using a DutchX price oracle: ' + priceOracleImpl)
      await deployPriceFeed({
        deployer,
        priceOracleImpl,
        account: accounts[0]
      })
    }

    // // Deploy 0x Token Registry
    // const TokenRegistry = artifacts.require('TokenRegistry')
    // deployer.deploy(TokenRegistry)

    // deploy test GEN
    await deployGen(deployer, owner)

    // Deploy DaoStack Universal Controllers
    await deployUniversalControllers(deployer)

    // Deploy GenesisProtocol
    await deployGenesisProtocol(deployer)
    
  } else if (process.env.USE_MOCK_DX) {
    console.log('Deploying Wallet as Mock DutchX');
    const Wallet = artifacts.require('Wallet')
    await deployer.deploy(Wallet)
  } else {
    console.log('Not in development, so nothing to do. Current network is %s', network)
  }
}

async function deployPriceFeed({
  deployer,
  priceOracleImpl = 'DutchXPriceOracle',
  account
}) {
  const DutchExchangeProxy = artifacts.require('DutchExchangeProxy')
  const EtherToken = artifacts.require('EtherToken')

  const dxAddress = DutchExchangeProxy.address
  const wethAddress = EtherToken.address

  if (priceOracleImpl === 'DutchXPriceOracle') {
    const DutchXPriceOracle = artifacts.require('DutchXPriceOracle')
    console.log('Deploy DutchXPriceOracle (price oracle):')
    console.log('  dxAddress: ' + dxAddress)
    console.log('  wethAddress: ' + wethAddress)
    await deployer.deploy(DutchXPriceOracle, dxAddress, wethAddress)
  } else if (priceOracleImpl === 'WhitelistPriceOracle') {
    const WhitelistPriceOracle = artifacts.require('WhitelistPriceOracle')
    console.log('Deploy WhitelistPriceOracle (price oracle with custom Whitelist):')
    console.log('  dxAddress: ' + dxAddress)
    console.log('  wethAddress: ' + wethAddress)
    console.log('  auctioneer: ' + account)
    await deployer.deploy(WhitelistPriceOracle, dxAddress, wethAddress, account)
  } else {
    throw new Error('Unknown implementation for the PriceOracle: ' + priceOracleImpl)
  }
}

async function deployGen(deployer) {
  const GenToken = artifacts.require('GenToken') // GEN (Dao Stack)

  const initialBalance = 1e6 // 1M
  console.log('Create GEN with %dM as the initial balance for the deployer', initialBalance * 1e6)
  const initialBalanceWei = web3.utils.toWei(
    new BN(initialBalance),
    'ether'
  )
  await deployer.deploy(GenToken, initialBalanceWei)
}

async function deployUniversalControllers(deployer) {
  const SchemeRegistrar = artifacts.require('SchemeRegistrar')
  const UpgradeScheme = artifacts.require('UpgradeScheme')
  const GlobalConstraintRegistrar = artifacts.require('GlobalConstraintRegistrar')
  const ContributionReward = artifacts.require('ContributionReward')
  const GenericScheme = artifacts.require('GenericScheme')

  // Deploy some DaoStack Universal Controllers
  console.log('Scheme: Deploying SchemeRegistrar:')
  console.log('  - used for registering and unregistering schemes at organizations')
  await deployer.deploy(SchemeRegistrar)

  console.log('Scheme: Deploying UpgradeScheme:')
  console.log('  - upgrade the controller of an organization to a new controller')
  await deployer.deploy(UpgradeScheme)

  console.log('Scheme: Deploying GlobalConstraintRegistrar')
  console.log('  - register or remove new global constraints')
  await deployer.deploy(GlobalConstraintRegistrar)

  console.log('Scheme: Deploying ContributionReward')
  console.log('  - propose and rewarde contributions to an organization')
  await deployer.deploy(ContributionReward)

  console.log('Scheme: Deploying GenericScheme')
  console.log(`  - propose and execute calls to an arbitrary function
    on a specific contract on behalf of the organization avatar`
  )
  await deployer.deploy(GenericScheme)
}

async function deployGenesisProtocol(deployer) {
  const GenesisProtocol = artifacts.require('GenesisProtocol')
  // Get instances
  const genToken = await getDaostackContract('GenToken')

  // Get token symbol
  const symbol = await genToken.symbol.call()

  // TODO: Are we staking using GEN? (review this part)
  console.log('Deploying GenesisProtocol voting machine')
  console.log("  - GenesisProtocol implementation. An organization's voting machine scheme.")

  console.log('  - Using ' + symbol + ' Token for staking')
  console.log('  - Token address: ' + genToken.address)
  await deployer.deploy(GenesisProtocol, genToken.address)
}
