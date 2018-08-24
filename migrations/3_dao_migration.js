/* global artifacts, web3  */
/* eslint no-undef: "error" */

// this migration file is used only for testing purpose
var constants = require('@daostack/arc/test/constants')

var getDaoStackContracts = require('../src/repositories/daostack/util/getDaoStackContracts')
var genesisProtocolParamsJson = require('../src/config/genesisprotocolparams.json')
var externalLocking4ReputationParamsJson = require('../src/config/externallocking4reputationparams.json')
var auction4ReputationParamsJson = require('../src/config/auction4reputationparams.json')
var lockingEth4ReputationParamsJson = require('../src/config/lockingeth4reputationparams.json')
var lockingToken4ReputationParamsJson = require('../src/config/lockingtoken4reputationparams.json')
var fixedReputationAllocationParamsJson = require('../src/config/fixreputationallocationparams.json')

// DUTCHEX ORG parameters:
const orgName = 'DUTCHEX'
const tokenName = 'DUTCHEX_DAO_TOKEN'
const tokenSymbol = 'XXX'
const founders = [web3.eth.accounts[0]]
const initRep = 0
const initRepInWei = [web3.toWei(initRep)]
const initToken = 0
const initTokenInWei = [web3.toWei(initToken)]
const cap = 0

const options = {gas: constants.ARC_GAS_LIMIT, from: web3.eth.accounts[0]}

const genesisProtocolParams = [
  genesisProtocolParamsJson.preBoostedVoteRequiredPercentage,
  genesisProtocolParamsJson.preBoostedVotePeriodLimit,
  genesisProtocolParamsJson.boostedVotePeriodLimit,
  genesisProtocolParamsJson.thresholdConstA,
  genesisProtocolParamsJson.thresholdConstB,
  genesisProtocolParamsJson.minimumStakingFee,
  genesisProtocolParamsJson.quietEndingPeriod,
  genesisProtocolParamsJson.proposingRepRewardConstA,
  genesisProtocolParamsJson.proposingRepRewardConstB,
  genesisProtocolParamsJson.stakerFeeRatioForVoters,
  genesisProtocolParamsJson.votersReputationLossRatio,
  genesisProtocolParamsJson.votersGainRepRatioFromLostRep,
  genesisProtocolParamsJson.daoBountyConst,
  genesisProtocolParamsJson.daoBountyLimit
]

module.exports = async function (deployer, network, accounts, providers) {
  const {
    ControllerCreator,
    DaoCreator,
    Avatar,
    Controller,
    SchemeRegistrar,
    UpgradeScheme,
    GlobalConstraintRegistrar,
    ContributionReward,
    GenesisProtocol,
    StandardTokenMock,
    Auction4Reputation,
    FixedReputationAllocation,
    LockingEth4Reputation,
    LockingToken4Reputation,
    ExternalLocking4Reputation,
    GenericScheme
  } = await getDaoStackContracts({provider: web3.currentProvider})
  deployer.deploy(ControllerCreator, options).then(async function () {
    var controllerCreator = await ControllerCreator.deployed()

    await deployer.deploy(DaoCreator, controllerCreator.address, options)
    var daoCreatorInst = await DaoCreator.deployed(controllerCreator.address)

    // Create DAOstack:
    var returnedParams = await daoCreatorInst.forgeOrg(orgName, tokenName, tokenSymbol, founders,
      initTokenInWei, initRepInWei, 0, cap, options)
    var AvatarInst = await Avatar.at(returnedParams.logs[0].args._avatar)
    var ControllerInst = await Controller.at(await AvatarInst.owner())
    await ControllerInst.nativeReputation()
    // Deploy SchemeRegistrar:
    await deployer.deploy(SchemeRegistrar, options)
    var schemeRegistrarInst = await SchemeRegistrar.deployed()
    // Deploy UniversalUpgrade:
    await deployer.deploy(UpgradeScheme, options)
    var upgradeSchemeInst = await UpgradeScheme.deployed()
    // Deploy UniversalGCScheme register:
    await deployer.deploy(GlobalConstraintRegistrar, options)
    var globalConstraintRegistrarInst = await GlobalConstraintRegistrar.deployed()

    // deploy GenesisProtocol
    // gen token
    var stakingTokenAddress = '0x543Ff227F64Aa17eA132Bf9886cAb5DB55DCAddf'
    if (network === 'development') {
      await deployer.deploy(StandardTokenMock, options.from, 1000, options)
      var stakingToken = await StandardTokenMock.deployed()
      stakingTokenAddress = stakingToken.address
    }
    await deployer.deploy(GenesisProtocol, stakingTokenAddress, options)
    var genesisProtocolInstance = await GenesisProtocol.deployed()

    await genesisProtocolInstance.setParameters(genesisProtocolParams, options)
    var genesisProtocolParamsHash = await genesisProtocolInstance.getParametersHash(genesisProtocolParams, options)

    var externalLockingContract = externalLocking4ReputationParamsJson.externalLockingContract
    if (network === 'development') {
      const TokenFRT = artifacts.require('TokenFRT')
      const tokenFRT = await TokenFRT.deployed()
      externalLockingContract = tokenFRT.address
    }

    // reputation schemes
    await deployer.deploy(ExternalLocking4Reputation,
      AvatarInst.address,
      externalLocking4ReputationParamsJson.reputationReward,
      externalLocking4ReputationParamsJson.lockingStartTime,
      externalLocking4ReputationParamsJson.lockingEndTime,
      externalLockingContract,
      externalLocking4ReputationParamsJson.getBalanceFuncSignature,
      options)
    var externalLocking4ReputationInst = await ExternalLocking4Reputation.deployed()

    await deployer.deploy(Auction4Reputation,
      AvatarInst.address,
      auction4ReputationParamsJson.reputationReward,
      auction4ReputationParamsJson.lockingStartTime,
      auction4ReputationParamsJson.lockingEndTime,
      auction4ReputationParamsJson.numberOfAuctions,
      stakingTokenAddress,
      auction4ReputationParamsJson.wallet,
      options)
    var auction4ReputationInst = await Auction4Reputation.deployed()

    await deployer.deploy(LockingEth4Reputation,
      AvatarInst.address,
      lockingEth4ReputationParamsJson.reputationReward,
      lockingEth4ReputationParamsJson.lockingStartTime,
      lockingEth4ReputationParamsJson.lockingEndTime,
      lockingEth4ReputationParamsJson.maxLockingPeriod,
      options)
    var lockingEth4ReputationInst = await LockingEth4Reputation.deployed()

    await deployer.deploy(LockingToken4Reputation,
      AvatarInst.address,
      lockingToken4ReputationParamsJson.reputationReward,
      lockingToken4ReputationParamsJson.lockingStartTime,
      lockingToken4ReputationParamsJson.lockingEndTime,
      lockingToken4ReputationParamsJson.maxLockingPeriod,
      lockingToken4ReputationParamsJson.token, // GNO token
      options)
    var lockingToken4ReputationInst = await LockingToken4Reputation.deployed()

    await deployer.deploy(FixedReputationAllocation,
      AvatarInst.address,
      fixedReputationAllocationParamsJson.reputationReward,
      options)
    var fixedReputationAllocationInst = await FixedReputationAllocation.deployed()

    await deployer.deploy(
      GenericScheme,
      options
    )
    var genericSchemeInst = await GenericScheme.deployed()
    var dutchexContractAddress = '0xabcd'
    await genericSchemeInst.setParameters(
      genesisProtocolParamsHash,
      genesisProtocolInstance.address,
      dutchexContractAddress,
      options
    )
    var genericSchemeParamsHash = await genericSchemeInst.getParametersHash(
      genesisProtocolParamsHash,
      genesisProtocolInstance.address,
      dutchexContractAddress,
      options
    )

    await deployer.deploy(ContributionReward, options)
    var contributionRewardInst = await ContributionReward.deployed()

    await schemeRegistrarInst.setParameters(genesisProtocolParamsHash, genesisProtocolParamsHash, genesisProtocolInstance.address, options)
    var schemeRegisterParams = await schemeRegistrarInst.getParametersHash(genesisProtocolParamsHash, genesisProtocolParamsHash, genesisProtocolInstance.address, options)

    await globalConstraintRegistrarInst.setParameters(genesisProtocolParamsHash, genesisProtocolInstance.address, options)
    var schemeGCRegisterParams = await globalConstraintRegistrarInst.getParametersHash(genesisProtocolParamsHash, genesisProtocolInstance.address, options)

    await upgradeSchemeInst.setParameters(genesisProtocolParamsHash, genesisProtocolInstance.address, options)
    var schemeUpgradeParams = await upgradeSchemeInst.getParametersHash(genesisProtocolParamsHash, genesisProtocolInstance.address, options)

    await contributionRewardInst.setParameters(0, genesisProtocolParamsHash, genesisProtocolInstance.address, options)
    var contributionRewardParams = await contributionRewardInst.getParametersHash(0, genesisProtocolParamsHash, genesisProtocolInstance.address, options)

    var schemesArray = [
      schemeRegistrarInst.address,
      globalConstraintRegistrarInst.address,
      upgradeSchemeInst.address,
      contributionRewardInst.address,
      genesisProtocolInstance.address,
      externalLocking4ReputationInst.address,
      auction4ReputationInst.address,
      lockingEth4ReputationInst.address,
      lockingToken4ReputationInst.address,
      fixedReputationAllocationInst.address,
      genericSchemeInst.address
    ]
    const paramsArray = [
      schemeRegisterParams,
      schemeGCRegisterParams,
      schemeUpgradeParams,
      contributionRewardParams,
      genesisProtocolParamsHash,
      0,
      0,
      0,
      0,
      0,
      genericSchemeParamsHash
    ]
    const permissionArray = [
      '0x0000001F',
      '0x00000005',
      '0x0000000a',
      '0x00000001',
      '0x00000001',
      '0x00000001',
      '0x00000001',
      '0x00000001',
      '0x00000001',
      '0x00000001',
      '0x00000010' // genericScheme permission
    ]

    // set DAO initial schemes:
    await daoCreatorInst.setSchemes(
      AvatarInst.address,
      schemesArray,
      paramsArray,
      permissionArray, options)
  })
}
