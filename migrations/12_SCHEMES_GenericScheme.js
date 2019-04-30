/* global artifacts, web3 */
/* eslint no-undef: "error" */

const assert = require('assert')
const genesisProtocolHelper = require('../src/helpers/genesisProtocolHelper')({ artifacts, web3 })
const DxAvatar = artifacts.require('DxAvatar')
const DxController = artifacts.require('DxController')

const { registerScheme, setParameters, SchemePermissions } = require('./helpers/schemeUtils')
const { CALL_DELEGATECALL } = SchemePermissions
const getDXContractAddress = require('../src/helpers/getDXContractAddresses')(web3, artifacts)
const getDaostackContract = require('../src/helpers/getDaostackContract')(web3, artifacts)

module.exports = async function (deployer) { // eslint-disable-line no-unused-vars
  const dxAvatar = await DxAvatar.deployed()
  const dxController = await DxController.deployed()

  const genericScheme = await getDaostackContract('GenericScheme')

  console.log('Configure GenericScheme')

  const {
    paramsHash: genesisProtocolParamsHash,
    address: genesisProtocolAddress
  } = await genesisProtocolHelper.setupAndGetGenesisProtocolData('dutchX')

  // DutchX address
  let dutchXContractAddress
  if (process.env.USE_MOCK_DX) {
    if (web3.utils.isAddress(process.env.USE_MOCK_DX)) {
      dutchXContractAddress = process.env.USE_MOCK_DX
      console.log(`DutchExchange address provided directly: ${dutchXContractAddress}`);
    } else {
      console.log('Using Wallet.sol in place of DutchExchange');
      const Wallet = artifacts.require('Wallet')
      const WalletDeployed = await Wallet.deployed()
      dutchXContractAddress = WalletDeployed.address
    }
  } else {
    dutchXContractAddress = await getDXContractAddress('DutchExchangeProxy')
  }

  assert(genesisProtocolParamsHash, `The parameter paramsHash was not defined`)
  assert(genesisProtocolAddress, `The parameter address was not defined`)
  assert(dutchXContractAddress, `The parameter dutchXContractAddress was not defined`)

  // Set parameters
  const paramsHash = await setParameters({
    scheme: genericScheme,
    parameters: [{
      name: 'voteParams',
      value: genesisProtocolParamsHash
    }, {
      name: 'intVote',
      value: genesisProtocolAddress
    }, {
      name: 'contractToCall',
      value: dutchXContractAddress
    }
    ]
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
