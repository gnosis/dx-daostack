/* global artifacts */
/* eslint no-undef: "error" */

const { getGenesisProtocolData } = require('../src/helpers/genesisProtocolHelper')(artifacts)

const SchemeRegistrar = artifacts.require('SchemeRegistrar')
const DxAvatar = artifacts.require('DxAvatar')
const DxController = artifacts.require('DxController')

const registerScheme = require('./helpers/registerScheme')

module.exports = async function (deployer) {
  const dxAvatar = await DxAvatar.deployed()
  const dxController = await DxController.deployed()

  const schemeRegistrar = await deployer.deploy(SchemeRegistrar)

  console.log('Configure SchemeRegistrar')

  const {
    genesisProtocolParamsHash,
    genesisProtocolAddress
  } = await getGenesisProtocolData()

  const genericSchemeParams = [
    genesisProtocolParamsHash,
    genesisProtocolParamsHash,
    genesisProtocolAddress
  ]

  await schemeRegistrar.setParameters(...genericSchemeParams)

  const paramsHash = await schemeRegistrar.getParametersHash(...genericSchemeParams)

  await registerScheme({
    label: 'SchemeRegistrar',
    paramsHash,
    permissions: '0x0000001F',
    schemeAddress: schemeRegistrar.address,
    avatarAddress: dxAvatar.address,
    controller: dxController
  })
}
