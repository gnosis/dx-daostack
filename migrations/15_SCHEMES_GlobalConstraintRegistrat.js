/* global artifacts */
/* eslint no-undef: "error" */

const { getGenesisProtocolData } = require('../src/helpers/genesisProtocolHelper')(artifacts)

const GlobalConstraintRegistrar = artifacts.require('GlobalConstraintRegistrar')
const DxAvatar = artifacts.require('DxAvatar')
const DxController = artifacts.require('DxController')

const registerScheme = require('./helpers/registerScheme')
const { SchemePermissions: { REGISTERED, ADD_REMOVE_GLOBAL_CONSTRAINTS } } = registerScheme

module.exports = async function (deployer) {
  const dxAvatar = await DxAvatar.deployed()
  const dxController = await DxController.deployed()

  const globalConstraintRegistrar = await deployer.deploy(GlobalConstraintRegistrar)

  console.log('Configure GlobalConstraintRegistrar')

  const {
    genesisProtocolParamsHash,
    genesisProtocolAddress
  } = await getGenesisProtocolData()

  const globalConstraintRegistrarParams = [
    genesisProtocolParamsHash,
    genesisProtocolAddress
  ]

  await globalConstraintRegistrar.setParameters(...globalConstraintRegistrarParams)

  const paramsHash = await globalConstraintRegistrar.getParametersHash(...globalConstraintRegistrarParams)

  await registerScheme({
    label: 'GlobalConstraintRegistrar',
    paramsHash,
    permissions: REGISTERED | ADD_REMOVE_GLOBAL_CONSTRAINTS,
    schemeAddress: globalConstraintRegistrar.address,
    avatarAddress: dxAvatar.address,
    controller: dxController
  })
}
