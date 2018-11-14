/* global artifacts */
/* eslint no-undef: "error" */

const { getGenesisProtocolData } = require('../src/helpers/genesisProtocolHelper')(artifacts)

const DxGenericScheme = artifacts.require('DxGenericScheme')
const DxAvatar = artifacts.require('DxAvatar')
const DxController = artifacts.require('DxController')

const registerScheme = require('./helpers/registerScheme')

module.exports = async function (deployer) {
  const dxAvatar = await DxAvatar.deployed()
  const dxController = await DxController.deployed()

  console.log('Deploy DxGenericScheme that inherits from GenericScheme')
  const dxGenericScheme = await deployer.deploy(DxGenericScheme)

  console.log('Configure DxGenericScheme')

  const {
    genesisProtocolParamsHash,
    genesisProtocolAddress
  } = await getGenesisProtocolData()

  // TODO: get locally deployed Dx address
  const dutchXContractAddress = '0x039fb002d21c1c5eeb400612aef3d64d49eb0d94'

  const genericSchemeParams = [
    // QUESTION: is it ok to just pass in hash, it expects bytes32, so a string works, but...
    genesisProtocolParamsHash,
    genesisProtocolAddress,
    dutchXContractAddress
  ]

  await dxGenericScheme.setParameters(...genericSchemeParams)

  const paramsHash = await dxGenericScheme.getParametersHash(...genericSchemeParams)

  await registerScheme({
    label: 'DxGenericScheme',
    paramsHash,
    permissions: '0x00000010',
    schemeAddress: dxGenericScheme.address,
    avatarAddress: dxAvatar.address,
    controller: dxController
  })
}
