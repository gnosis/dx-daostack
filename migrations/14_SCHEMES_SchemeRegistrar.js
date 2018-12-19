/* global artifacts, web3 */
/* eslint no-undef: "error" */
const assert = require('assert')
const { getGenesisProtocolData } = require('../src/helpers/genesisProtocolHelper')(artifacts)

const DxAvatar = artifacts.require('DxAvatar')
const DxController = artifacts.require('DxController')

const { registerScheme, setParameters, SchemePermissions } = require('./helpers/schemeUtils')
const {
  REGISTERED,
  REGISTER_SCHEMES,
  ADD_REMOVE_GLOBAL_CONSTRAINTS,
  UPGRADE_CONTROLLER,
  CALL_DELEGATECALL
} = SchemePermissions

const getDaostackContract = require('../src/helpers/getDaostackContract')(web3, artifacts)


module.exports = async function (deployer) { // eslint-disable-line no-unused-vars
  const dxAvatar = await DxAvatar.deployed()
  const dxController = await DxController.deployed()

  const schemeRegistrar = await getDaostackContract('SchemeRegistrar')

  console.log('Configure SchemeRegistrar')

  const {
    genesisProtocolParamsHash,
    genesisProtocolAddress
  } = await getGenesisProtocolData()

  assert(genesisProtocolParamsHash, `The parameter genesisProtocolParamsHash was not defined`)
  assert(genesisProtocolAddress, `The parameter genesisProtocolAddress was not defined`)

  // Set parameters
  const paramsHash = await setParameters({
    scheme: schemeRegistrar,
    parameters: {
      voteRegisterParams: genesisProtocolParamsHash,
      voteRemoveParams: genesisProtocolParamsHash,
      intVoteAddress: genesisProtocolAddress
    }
  })
  
  await registerScheme({
    label: 'SchemeRegistrar',
    schemeAddress: schemeRegistrar.address,
    avatarAddress: dxAvatar.address,
    controller: dxController,
    permissions: REGISTERED | REGISTER_SCHEMES | ADD_REMOVE_GLOBAL_CONSTRAINTS |
      UPGRADE_CONTROLLER | CALL_DELEGATECALL,
    
    paramsHash,
  })
}
