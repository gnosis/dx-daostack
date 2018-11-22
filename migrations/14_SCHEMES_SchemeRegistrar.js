/* global artifacts, web3 */
/* eslint no-undef: "error" */

const { getGenesisProtocolData } = require('../src/helpers/genesisProtocolHelper')(artifacts)

const DxAvatar = artifacts.require('DxAvatar')
const DxController = artifacts.require('DxController')

const registerScheme = require('./helpers/registerScheme')
const { SchemePermissions: {
  REGISTERED,
  REGISTER_SCHEMES,
  ADD_REMOVE_GLOBAL_CONSTRAINTS,
  UPGRADE_CONTROLLER,
  CALL_DELEGATECALL
} } = registerScheme

const getDaostackContract = require('../src/helpers/getDaostackContract')(web3, artifacts)


module.exports = async function (deployer) {
  const dxAvatar = await DxAvatar.deployed()
  const dxController = await DxController.deployed()

  const schemeRegistrar = await getDaostackContract('SchemeRegistrar')

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
    permissions: REGISTERED | REGISTER_SCHEMES | ADD_REMOVE_GLOBAL_CONSTRAINTS |
      UPGRADE_CONTROLLER | CALL_DELEGATECALL,
    schemeAddress: schemeRegistrar.address,
    avatarAddress: dxAvatar.address,
    controller: dxController
  })
}
