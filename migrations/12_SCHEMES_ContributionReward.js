
/* global artifacts, web3 */
/* eslint no-undef: "error" */

const { getGenesisProtocolData } = require('../src/helpers/genesisProtocolHelper')(artifacts)

const DxAvatar = artifacts.require('DxAvatar')
const DxController = artifacts.require('DxController')

const { registerScheme, setParameters } = require('./helpers/schemeUtils')

const getDaostackContract = require('../src/helpers/getDaostackContract')(web3, artifacts)

const { contributionRewardSubmissionFee } = require('../src/config/schemes')

module.exports = async function (deployer) { // eslint-disable-line no-unused-vars
  const dxAvatar = await DxAvatar.deployed()
  const dxController = await DxController.deployed()

  const contributionReward = await getDaostackContract('ContributionReward')

  console.log('Configure ContributionReward')

  const {
    genesisProtocolParamsHash,
    genesisProtocolAddress
  } = await getGenesisProtocolData()

  // Set parameters
  const paramsHash = await setParameters({
    scheme: contributionReward,
    parameters: [{
      name: 'orgNativeTokenFee',
      value: contributionRewardSubmissionFee
    }, {
      name: 'voteApproveParams',
      value: genesisProtocolParamsHash
    }, {
      name: 'intVote',
      value: genesisProtocolAddress
    }
  ]})

  await registerScheme({
    label: 'ContributionReward',
    paramsHash,
    schemeAddress: contributionReward.address,
    avatarAddress: dxAvatar.address,
    controller: dxController
  })
}
