/* global artifacts, web3 */
/* eslint no-undef: "error" */

const { getGenesisProtocolData } = require('../src/helpers/genesisProtocolHelper')(artifacts)

const DxAvatar = artifacts.require('DxAvatar')
const DxController = artifacts.require('DxController')

const registerScheme = require('./helpers/registerScheme')

const getDaostackContract = require('../src/helpers/getDaostackContract')(web3, artifacts)

const { submissionFee } = require('../src/config/schemes/DxContributionReward')

module.exports = async function (deployer) {
  const dxAvatar = await DxAvatar.deployed()
  const dxController = await DxController.deployed()

  const contributionReward = await getDaostackContract('ContributionReward')

  console.log('Configure ContributionReward')

  const {
    genesisProtocolParamsHash,
    genesisProtocolAddress
  } = await getGenesisProtocolData()

  const contributionRewardParams = [
    // a fee (in the organization's token) that is to be paid for submitting a contribution
    submissionFee,
    genesisProtocolParamsHash,
    genesisProtocolAddress
  ]

  await contributionReward.setParameters(...contributionRewardParams)

  const paramsHash = await contributionReward.getParametersHash(...contributionRewardParams)

  await registerScheme({
    label: 'ContributionReward',
    paramsHash,
    schemeAddress: contributionReward.address,
    avatarAddress: dxAvatar.address,
    controller: dxController
  })
}
