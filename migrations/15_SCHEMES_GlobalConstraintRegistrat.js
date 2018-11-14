/* global artifacts */
/* eslint no-undef: "error" */

const { getGenesisProtocolData } = require('../src/helpers/genesisProtocolHelper')(artifacts)

const GlobalConstraintRegistrar = artifacts.require('GlobalConstraintRegistrar')
const DxAvatar = artifacts.require('DxAvatar')
const DxController = artifacts.require('DxController')

const registerScheme = require('./helpers/registerScheme')

module.exports = async function (deployer) {
  const dxAvatar = await DxAvatar.deployed()
  const dxController = await DxController.deployed()

  const globalConstraintRegistrar = await deployer.deploy(GlobalConstraintRegistrar)

  console.log('Configure GlobalConstraintRegistrar')

  const {
    genesisProtocolParamsHash,
    genesisProtocolAddress
  } = await getGenesisProtocolData()

  const genericSchemeParams = [
    genesisProtocolParamsHash,
    genesisProtocolAddress
  ]

  await globalConstraintRegistrar.setParameters(...genericSchemeParams)

  const paramsHash = await globalConstraintRegistrar.getParametersHash(...genericSchemeParams)

  await registerScheme({
    label: 'GlobalConstraintRegistrar',
    paramsHash,
    permissions: '0x00000005',
    schemeAddress: globalConstraintRegistrar.address,
    avatarAddress: dxAvatar.address,
    controller: dxController
  })
}
