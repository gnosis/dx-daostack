/* global artifacts, web3 */
/* eslint no-undef: "error" */

const { getGenesisProtocolData } = require('../src/helpers/genesisProtocolHelper')(artifacts)

const DxAvatar = artifacts.require('DxAvatar')
const DxController = artifacts.require('DxController')

const registerScheme = require('./helpers/registerScheme')
const { SchemePermissions: { REGISTERED, ADD_REMOVE_GLOBAL_CONSTRAINTS } } = registerScheme

const getDaostackContract = require('../src/helpers/getDaostackContract')(web3, artifacts)

module.exports = async function (deployer) {
  const dxAvatar = await DxAvatar.deployed()
  const dxController = await DxController.deployed()

  const globalConstraintRegistrar = await getDaostackContract('GlobalConstraintRegistrar')

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
