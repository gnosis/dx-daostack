/* global artifacts */
/* eslint no-undef: "error" */

const { getGenesisProtocolData } = require('../src/helpers/genesisProtocolHelper')(artifacts)

const DxContributionReward = artifacts.require('DxContributionReward')
const DxAvatar = artifacts.require('DxAvatar')
const DxController = artifacts.require('DxController')

const registerScheme = require('./helpers/registerScheme')

const { submissionFee } = require('../src/config/schemes/DxContributionReward')

module.exports = async function (deployer) {
  const dxAvatar = await DxAvatar.deployed()
  const dxController = await DxController.deployed()

  console.log('Deploy DxContributionReward that inherits from ContributionReward')
  const dxContributionReward = await deployer.deploy(DxContributionReward)

  console.log('Configure DxContributionReward')

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

  await dxContributionReward.setParameters(...contributionRewardParams)

  const paramsHash = await dxContributionReward.getParametersHash(...contributionRewardParams)

  await registerScheme({
    label: 'DxContributionReward',
    paramsHash,
    schemeAddress: dxContributionReward.address,
    avatarAddress: dxAvatar.address,
    controller: dxController
  })
}
