/* global artifacts, web3 */
/* eslint no-undef: "error" */

const assert = require('assert')
const { getGenesisProtocolData } = require('../src/helpers/genesisProtocolHelper')(artifacts)

const DxAvatar = artifacts.require('DxAvatar')
const DxController = artifacts.require('DxController')

const { registerScheme, setParameters, SchemePermissions } = require('./helpers/schemeUtils')
const { REGISTER_SCHEMES, UPGRADE_CONTROLLER } = SchemePermissions

const getDaostackContract = require('../src/helpers/getDaostackContract')(web3, artifacts)


module.exports = async function () {
  const dxAvatar = await DxAvatar.deployed()
  const dxController = await DxController.deployed()

  const upgradeScheme = await getDaostackContract('UpgradeScheme')

  const {
    genesisProtocolParamsHash,
    genesisProtocolAddress
  } = await getGenesisProtocolData()

  assert(genesisProtocolParamsHash, `The parameter genesisProtocolParamsHash was not defined`)
  assert(genesisProtocolAddress, `The parameter genesisProtocolAddress was not defined`)

  console.log('Configure UpgradeScheme')
  
  // Set parameters
  const paramsHash = await setParameters({
    scheme: upgradeScheme,
    parameters: {
      voteParams: genesisProtocolParamsHash,
      intVote: genesisProtocolAddress
    }
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
