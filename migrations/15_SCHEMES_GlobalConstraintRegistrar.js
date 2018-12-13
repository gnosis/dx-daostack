/* global artifacts, web3 */
/* eslint no-undef: "error" */

const { getGenesisProtocolData } = require('../src/helpers/genesisProtocolHelper')(artifacts)

const DxAvatar = artifacts.require('DxAvatar')
const DxController = artifacts.require('DxController')

const { registerScheme, setParameters, SchemePermissions } = require('./helpers/schemeUtils')
const { REGISTERED, ADD_REMOVE_GLOBAL_CONSTRAINTS } = SchemePermissions

const getDaostackContract = require('../src/helpers/getDaostackContract')(web3, artifacts)

module.exports = async function (deployer, network) {
  const dxAvatar = await DxAvatar.deployed()
  const dxController = await DxController.deployed()

  const globalConstraintRegistrar = await getDaostackContract('GlobalConstraintRegistrar')

  console.log('Configure GlobalConstraintRegistrar')

  const {
    genesisProtocolParamsHash,
    genesisProtocolAddress
  } = await getGenesisProtocolData()

  // Set parameters
  const paramsHash = await setParameters({
    scheme: globalConstraintRegistrar,
    parameters: {
      voteRegisterParams: genesisProtocolParamsHash,
      intVote: genesisProtocolAddress
    }
  })
  
  await registerScheme({
    label: 'GlobalConstraintRegistrar',
    paramsHash,
    permissions: REGISTERED | ADD_REMOVE_GLOBAL_CONSTRAINTS,
    schemeAddress: globalConstraintRegistrar.address,
    avatarAddress: dxAvatar.address,
    controller: dxController
  })
}
