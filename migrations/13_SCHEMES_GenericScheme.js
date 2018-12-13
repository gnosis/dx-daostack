/* global artifacts, web3 */
/* eslint no-undef: "error" */

const assert = require('assert')
const { getGenesisProtocolData } = require('../src/helpers/genesisProtocolHelper')(artifacts)
const DxAvatar = artifacts.require('DxAvatar')
const DxController = artifacts.require('DxController')

const { registerScheme, setParameters, SchemePermissions } = require('./helpers/schemeUtils')
const { CALL_DELEGATECALL } = SchemePermissions
const getDXContractAddress = require('../src/helpers/getDXContractAddresses')(web3, artifacts)
const getDaostackContract = require('../src/helpers/getDaostackContract')(web3, artifacts)

module.exports = async function (deployer, network) {
  const dxAvatar = await DxAvatar.deployed()
  const dxController = await DxController.deployed()

  const genericScheme = await getDaostackContract('GenericScheme')

  console.log('Configure GenericScheme')

  const {
    genesisProtocolParamsHash,
    genesisProtocolAddress
  } = await getGenesisProtocolData()

  // DutchX address
  const dutchXContractAddress = await getDXContractAddress('DutchExchangeProxy')

  assert(genesisProtocolParamsHash, `The parameter genesisProtocolParamsHash was not defined`)
  assert(genesisProtocolAddress, `The parameter genesisProtocolAddress was not defined`)
  assert(dutchXContractAddress, `The parameter dutchXContractAddress was not defined`)

  // Set parameters
  const paramsHash = await setParameters({
    scheme: genericScheme,
    parameters: {
      voteParams: genesisProtocolParamsHash,
      intVote: genesisProtocolAddress,
      contractToCall: dutchXContractAddress
    }
  })

  await registerScheme({
    label: 'GenericScheme',
    paramsHash,
    permissions: CALL_DELEGATECALL,
    schemeAddress: genericScheme.address,
    avatarAddress: dxAvatar.address,
    controller: dxController
  })
}
