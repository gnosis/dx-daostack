/* global artifacts */
/* eslint no-undef: "error" */

const { getGenesisProtocolData } = require('../src/helpers/genesisProtocolHelper')(artifacts)

const UpgradeScheme = artifacts.require('UpgradeScheme')
const DxAvatar = artifacts.require('DxAvatar')
const DxController = artifacts.require('DxController')

const registerScheme = require('./helpers/registerScheme')
const { SchemePermissions: { REGISTER_SCHEMES, UPGRADE_CONTROLLER } } = registerScheme

module.exports = async function (deployer) {
  const dxAvatar = await DxAvatar.deployed()
  const dxController = await DxController.deployed()

  const upgradeScheme = await deployer.deploy(UpgradeScheme)

  console.log('Configure UpgradeScheme')

  const {
    genesisProtocolParamsHash,
    genesisProtocolAddress
  } = await getGenesisProtocolData()

  const upgradeSchemeParams = [
    genesisProtocolParamsHash,
    genesisProtocolAddress
  ]

  await upgradeScheme.setParameters(...upgradeSchemeParams)

  const paramsHash = await upgradeScheme.getParametersHash(...upgradeSchemeParams)

  await registerScheme({
    label: 'UpgradeScheme',
    paramsHash,
    permissions: REGISTER_SCHEMES | UPGRADE_CONTROLLER,
    schemeAddress: upgradeScheme.address,
    avatarAddress: dxAvatar.address,
    controller: dxController
  })
}
