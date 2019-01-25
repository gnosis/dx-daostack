/* global artifacts, web3 */
/* eslint no-undef: "error" */

const assert = require('assert')
const genesisProtocolHelper = require('../src/helpers/genesisProtocolHelper')({ artifacts, web3 })

const DxAvatar = artifacts.require('DxAvatar')
const DxController = artifacts.require('DxController')

const { registerScheme, setParameters, SchemePermissions } = require('./helpers/schemeUtils')
const { REGISTER_SCHEMES, UPGRADE_CONTROLLER } = SchemePermissions

const getDaostackContract = require('../src/helpers/getDaostackContract')(web3, artifacts)


module.exports = async function (deployer) { // eslint-disable-line no-unused-vars
  const dxAvatar = await DxAvatar.deployed()
  const dxController = await DxController.deployed()

  const upgradeScheme = await getDaostackContract('UpgradeScheme')

  const {
    paramsHash: genesisProtocolParamsHash,
    address: genesisProtocolAddress
  } = await genesisProtocolHelper.getGenesisProtocolData('admin')

  assert(genesisProtocolParamsHash, `The parameter paramsHash was not defined`)
  assert(genesisProtocolAddress, `The parameter address was not defined`)

  console.log('Configure UpgradeScheme')

  // Set parameters
  const paramsHash = await setParameters({
    scheme: upgradeScheme,
    parameters: [{
      name: 'voteParams',
      value: genesisProtocolParamsHash
    }, {
      name: 'intVote',
      value: genesisProtocolAddress
    }]
  })

  await registerScheme({
    label: 'UpgradeScheme',
    paramsHash,
    permissions: REGISTER_SCHEMES | UPGRADE_CONTROLLER,
    schemeAddress: upgradeScheme.address,
    avatarAddress: dxAvatar.address,
    controller: dxController
  })
}
