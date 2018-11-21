/* global artifacts */
/* eslint no-undef: "error" */

const { getGenesisProtocolData } = require('../src/helpers/genesisProtocolHelper')(artifacts)

const ContributionReward = artifacts.require('ContributionReward')
const DxAvatar = artifacts.require('DxAvatar')
const DxController = artifacts.require('DxController')

const registerScheme = require('./helpers/registerScheme')

const { submissionFee } = require('../src/config/schemes/DxContributionReward')

module.exports = async function (deployer) {
  const dxAvatar = await DxAvatar.deployed()
  const dxController = await DxController.deployed()

  const contributionReward = await ContributionReward.deployed()

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
