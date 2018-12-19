/* global artifacts, web3 */
/* eslint no-undef: "error" */

const { getGenesisProtocolData } = require('../src/helpers/genesisProtocolHelper')(artifacts)

const DxAvatar = artifacts.require('DxAvatar')
const DxController = artifacts.require('DxController')

const registerScheme = require('./helpers/registerScheme')
const { SchemePermissions: { CALL_DELEGATECALL } } = registerScheme
const getDXContractAddress = require('../src/helpers/getDXContractAddresses')(web3, artifacts)
const getDaostackContract = require('../src/helpers/getDaostackContract')(web3, artifacts)

module.exports = async function (deployer) {
  const dxAvatar = await DxAvatar.deployed()
  const dxController = await DxController.deployed()

  const genericScheme = await getDaostackContract('GenericScheme')

  console.log('Configure GenericScheme')

  const {
    genesisProtocolParamsHash,
    genesisProtocolAddress
  } = await getGenesisProtocolData()

  const dutchXContractAddress = await getDXContractAddress('DutchExchangeProxy')

  const genericSchemeParams = [
    genesisProtocolParamsHash,
    genesisProtocolAddress,
    dutchXContractAddress
  ]
  console.log('dutchXContractAddress: ', dutchXContractAddress);
  console.log('dutchXContractAddress: ', artifacts.require('DutchExchangeProxy').address);

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
