/* global artifacts */
/* eslint no-undef: "error" */

module.exports = async (deployer, network, accounts) => {
  // TODO: Make sure we will deploy the controller. If we save gas on each transaction seems to be a good idea. The controller deploymemt is not expensive (0.00072912 ETH - 15 cents)
  const DxController = artifacts.require('DxController')
  // const Avatar = artifacts.require('Avatar')
  const DxAvatar = artifacts.require('DxAvatar')

  // Get contract instances
  const dxAvatar = await DxAvatar.deployed()

  // Deploy the controller
  console.log('Deploying DutchX Dao Controller:')
  console.log('  - Avatar: ' + dxAvatar.address)
  await deployer.deploy(DxController, dxAvatar.address)
}
