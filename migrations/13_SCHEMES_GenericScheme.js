/* global artifacts, web3 */
/* eslint no-undef: "error" */

const { getGenesisProtocolData } = require('../src/helpers/genesisProtocolHelper')(artifacts)

const DxGenericScheme = artifacts.require('DxGenericScheme')
const DxAvatar = artifacts.require('DxAvatar')
const DxController = artifacts.require('DxController')

const registerScheme = require('./helpers/registerScheme')
const { SchemePermissions } = registerScheme
const getDXContractAddress = require('../src/helpers/getDXContractAddresses.js')(web3, artifacts)

module.exports = async function (deployer, network) {
  const dxAvatar = await DxAvatar.deployed()
  const dxController = await DxController.deployed()

  console.log('Deploy DxGenericScheme that inherits from GenericScheme')
  const dxGenericScheme = await deployer.deploy(DxGenericScheme)

  console.log('Configure DxGenericScheme')

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

  await dxGenericScheme.setParameters(...genericSchemeParams)

  const paramsHash = await dxGenericScheme.getParametersHash(...genericSchemeParams)

  await registerScheme({
    label: 'DxGenericScheme',
    paramsHash,
    permissions: SchemePermissions.GenericScheme,
    schemeAddress: dxGenericScheme.address,
    avatarAddress: dxAvatar.address,
    controller: dxController
  })
}
