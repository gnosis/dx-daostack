/* global artifacts */
/* eslint no-undef: "error" */

const { getGenesisProtocolData } = require('../src/helpers/genesisProtocolHelper')(artifacts)

const SchemeRegistrar = artifacts.require('SchemeRegistrar')
const DxAvatar = artifacts.require('DxAvatar')
const DxController = artifacts.require('DxController')

const registerScheme = require('./helpers/registerScheme')
const { SchemePermissions } = registerScheme

module.exports = async function (deployer) {
  const dxAvatar = await DxAvatar.deployed()
  const dxController = await DxController.deployed()

  const schemeRegistrar = await deployer.deploy(SchemeRegistrar)

  console.log('Configure SchemeRegistrar')

  const {
    genesisProtocolParamsHash,
    genesisProtocolAddress
  } = await getGenesisProtocolData()

  const schemeRegistrarParams = [
    genesisProtocolParamsHash,
    genesisProtocolParamsHash,
    genesisProtocolAddress
  ]

  await schemeRegistrar.setParameters(...schemeRegistrarParams)

  const paramsHash = await schemeRegistrar.getParametersHash(...schemeRegistrarParams)

  await registerScheme({
    label: 'SchemeRegistrar',
    paramsHash,
    permissions: SchemePermissions.SchemeRegistar,
    schemeAddress: schemeRegistrar.address,
    avatarAddress: dxAvatar.address,
    controller: dxController
  })
}
