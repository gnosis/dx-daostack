/* global artifacts, web3 */
/* eslint no-undef: "error" */

const { getGenesisProtocolData } = require('../src/helpers/genesisProtocolHelper')(artifacts)

const GenericScheme = artifacts.require('GenericScheme')
const DxAvatar = artifacts.require('DxAvatar')
const DxController = artifacts.require('DxController')

const registerScheme = require('./helpers/registerScheme')
const { SchemePermissions: { CALL_DELEGATECALL } } = registerScheme
const getDXContractAddress = require('../src/helpers/getDXContractAddresses.js')(web3, artifacts)

module.exports = async function (deployer, network) {
  const dxAvatar = await DxAvatar.deployed()
  const dxController = await DxController.deployed()

  const genericScheme = await GenericScheme.deployed()

  console.log('Configure GenericScheme')

  const {
    genesisProtocolParamsHash,
    genesisProtocolAddress
  } = await getGenesisProtocolData()

  // TODO: deploy DX and DXProxy locally
  let dutchXContractAddress
  // For now substitute a valid address, otherwise breaks
  if (network === 'development') dutchXContractAddress = '0x039fb002d21c1c5eeb400612aef3d64d49eb0d94'
  else dutchXContractAddress = await getDXContractAddress('DutchExchangeProxy')

  const genericSchemeParams = [
    genesisProtocolParamsHash,
    genesisProtocolAddress,
    dutchXContractAddress
  ]

  await genericScheme.setParameters(...genericSchemeParams)

  const paramsHash = await genericScheme.getParametersHash(...genericSchemeParams)

  await registerScheme({
    label: 'GenericScheme',
    paramsHash,
    permissions: CALL_DELEGATECALL,
    schemeAddress: genericScheme.address,
    avatarAddress: dxAvatar.address,
    controller: dxController
  })
}
