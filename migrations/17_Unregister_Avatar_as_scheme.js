/* global artifacts */
/* eslint no-undef: "error" */

const DxController = artifacts.require('DxController')
const DxAvatar = artifacts.require('DxAvatar')

module.exports = async function (deployer) { // eslint-disable-line no-unused-vars
  const dxController = await DxController.deployed()
  const dxAvatar = await DxAvatar.deployed()

  console.log('Unregister avatar as a controller scheme')
  console.log('TODO: Not sure if it is needed')

  // Copied from daoCreator, not sure if it's required
  // Unregister self:
  await dxController.unregisterScheme(dxController.address, dxAvatar.address)
}
