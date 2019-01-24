/* global artifacts */
/* eslint no-undef: "error" */

const DxController = artifacts.require('DxController')
const DxAvatar = artifacts.require('DxAvatar')

module.exports = async function (deployer, networks, accounts) { // eslint-disable-line no-unused-vars
  const dxController = await DxController.deployed()
  const dxAvatar = await DxAvatar.deployed()

  console.log('Unregister the deployer as a controller scheme')

  // Copied from daoCreator, not sure if it's required
  const [account] = accounts
  await dxController.unregisterScheme(account, dxAvatar.address)
}
