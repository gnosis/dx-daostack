/* global artifacts, web3 */
/* eslint no-undef: "error" */

const devLocalConfig = require('../src/config/dev-local')
const assert = require('assert')
const BN = web3.utils.BN

module.exports = async function (deployer, network, accounts) {
  if (network === 'development') {
    console.log('Deploying some contracts into a local ganche-cli')
    const owner = accounts[0]

    // deploy MGN (FRT), GEN, WETH
    await deployTokens(deployer, owner)

    // Deploy DaoStack Universal Controllers
    await deployUniversalControllers(deployer)
  } else {
    console.log('Not in development, so nothing to do. Current network is %s', network)
  }
}

async function deployTokens (deployer, owner) {
  const GenToken = artifacts.require('GenToken') // GEN (Dao Stack)
  const MgnToken = artifacts.require('MgnToken') // MGN (Token FRT)
  const WethToken = artifacts.require('WethToken') // (Wrapped Ether)

  const { testTokensInitialBalance: initialBalance } = devLocalConfig
  assert(initialBalance, 'testTokensInitialBalance is mandatory')

  console.log('Create GEN, MGN, WETH with %dM as the initial balance for the deployer', initialBalance * 1e6)
  const initialBalanceWei = web3.utils.toWei(
    new BN(initialBalance),
    'ether'
  )
  await deployer.deploy(GenToken, initialBalanceWei)
  await deployer.deploy(MgnToken, initialBalanceWei)
  await deployer.deploy(WethToken, initialBalanceWei)
}

async function deployUniversalControllers (deployer) {
  const SchemeRegistrar = artifacts.require('SchemeRegistrar')
  const UpgradeScheme = artifacts.require('UpgradeScheme')
  const GlobalConstraintRegistrar = artifacts.require('GlobalConstraintRegistrar')

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
}
