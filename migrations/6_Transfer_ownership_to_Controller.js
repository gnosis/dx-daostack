/* global artifacts */
/* eslint no-undef: "error" */

module.exports = async (deployer, network, accounts) => {
  const DxController = artifacts.require('DxController')
  const DxAvatar = artifacts.require('DxAvatar')
  const DxToken = artifacts.require('DxToken')
  const DxReputation = artifacts.require('DxReputation')

  // Get contract instances
  const dxController = await DxController.deployed()
  const dxAvatar = await DxAvatar.deployed()
  const dxToken = await DxToken.deployed()
  const dxReputation = await DxReputation.deployed()

  // Transfer ownership of Avatar, Token and Rep to the controller
  const controllerAddress = dxController.address
  await transferOwnership('Avatar', dxAvatar, controllerAddress)
  await transferOwnership('Token', dxToken, controllerAddress)
  await transferOwnership('Reputation', dxReputation, controllerAddress)
}

async function transferOwnership (label, ownableContract, controllerAddress) {
  console.log('Transfer ownership of the ' + label + ' to the Controller:')
  console.log('  - ' + label + ' address: ' + ownableContract.address)
  console.log('  - Controller address: ' + controllerAddress)
  const txResult = await ownableContract.transferOwnership(controllerAddress)
  console.log('  - Transaction: ' + txResult.tx)
  console.log('  - Gas used: ' + txResult.receipt.gasUsed)
  console.log()
}
