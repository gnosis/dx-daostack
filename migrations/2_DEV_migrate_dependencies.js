/* global artifacts, web3 */
/* eslint no-undef: "error" */

// const migrateDx = require('@gnosis.pm/dx-contracts/src/migrations')
const migrateDependencies = require('@gnosis.pm/dx-contracts/src/migrations/2_migrate_dependencies')
const deployPriceFeed = require('@gnosis.pm/dx-contracts/src/migrations/3_deploy_price_feed')
const deployFRT = require('@gnosis.pm/dx-contracts/src/migrations/4_deploy_FRT')
const deployDX = require('@gnosis.pm/dx-contracts/src/migrations/5_deploy_DX')
const setupDx = require('@gnosis.pm/dx-contracts/src/migrations/6_setup_DX')
// const setDxAsFrtMintern = require('@gnosis.pm/dx-contracts/src/migrations/7_set_DX_as_FRT_minter')

module.exports = function (deployer, network, accounts) {
  if (network === 'development') {
    const params = {
      artifacts,
      deployer,
      network,
      accounts,
      web3,
      thresholdNewTokenPairUsd: process.env.THRESHOLD_NEW_TOKEN_PAIR_USD,
      thresholdAuctionStartUsd: process.env.THRESHOLD_AUCTION_START_USD
    }

    // return migrateDx(params)
    const TokenFRT = artifacts.require('TokenFRT')
    const owner = accounts[0]

    return params.deployer
      .then(() => migrateDependencies(params))
      .then(() => deployPriceFeed(params))
      .then(() => deployFRT(params))
      .then(() => deployDX(params))
      .then(() => setupDx(params))
      .then(() => TokenFRT.deployed())
      .then(mgn => {
        // Setup the owner as a minter for ease testing
        mgn.updateMinter(owner)
      })
  } else {
    console.log('Not in development, so nothing to do. Current network is %s', network)
  }
}
