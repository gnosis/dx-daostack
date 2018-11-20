/* global artifacts */
/* eslint no-undef: "error" */

module.exports = async (deployer, network, accounts) => {
  // TODO: Make sure we will deploy the controller. If we save gas on each transaction seems to be a good idea. The controller deploymemt is not expensive (0.00072912 ETH - 15 cents)
  const DxController = artifacts.require('DxController')
  const DxAvatar = artifacts.require('DxAvatar')
  const SchemeRegistrar = artifacts.require('SchemeRegistrar')

  // Get contract instances
  const dxController = DxController.deployed()
  const dxAvatar = DxAvatar.deployed()
  const schemeRegistrar = SchemeRegistrar.deployed()
  const avatarAddress = dxAvatar.address

  // Setup scheme
  await schemeRegistrar.setParameters(
    genesisProtocolParamsHash,
    genesisProtocolParamsHash,
    genesisProtocolInstance.address,
    options
  )
  const params = await schemeRegistrar.getParametersHash(
    genesisProtocolParamsHash,
    genesisProtocolParamsHash,
    genesisProtocolInstance.address,
    options
  )

  // Deploy
  registerScheme({
    label: 'SchemeRegistrar',
    description: 'Used for registering and unregistering schemes at organizations',
    schemeAddress: '0x0',
    params,
    permisions: 0,
    avatarAddress,
    dxController
  })

  // var schemesArray = [
  //   schemeRegistrarInst.address,
  //   globalConstraintRegistrarInst.address,
  //   upgradeSchemeInst.address,
  //   contributionRewardInst.address,
  //   genesisProtocolInstance.address,
  //   externalLocking4ReputationInst.address,
  //   auction4ReputationInst.address,
  //   lockingEth4ReputationInst.address,
  //   lockingToken4ReputationInst.address,
  //   fixedReputationAllocationInst.address,
  //   genericSchemeInst.address
  // ]
  // const paramsArray = [
  //   schemeRegisterParams,
  //   schemeGCRegisterParams,
  //   schemeUpgradeParams,
  //   contributionRewardParams,
  //   genesisProtocolParamsHash,
  //   0,
  //   0,
  //   0,
  //   0,
  //   0,
  //   genericSchemeParamsHash
  // ]
  // const permissionArray = [
  //   '0x0000001F',
  //   '0x00000005',
  //   '0x0000000a',
  //   '0x00000001',
  //   '0x00000001',
  //   '0x00000001',
  //   '0x00000001',
  //   '0x00000001',
  //   '0x00000001',
  //   '0x00000001',
  //   '0x00000010' // genericScheme permission
  // ]

  await deployer.deploy(DxController, dxAvatar.address)
}

async function registerScheme ({
  label,
  description,
  schemeAddress,
  params,
  permisions,
  avatarAddress,
  dxController
}) {
  console.log('Register "' + label + '" scheme in the controller:')
  console.log('  - Description: ' + description)
  console.log('  - Controller address: ' + dxController.address)
  console.log('  - Scheme address: ' + schemeAddress)
  console.log('  - Params: ' + params)
  console.log('  - Permissions: ' + permisions)
  console.log('  - Avatar address: ' + avatarAddress)
  dxController.registerScheme(schemeAddress, params, permisions, avatarAddress)
}
