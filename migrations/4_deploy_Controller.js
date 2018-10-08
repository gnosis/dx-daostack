/* global artifacts */
/* eslint no-undef: "error" */

module.exports = async (deployer, network, accounts) => {
  const DxController = artifacts.require('DxController')
  // const Avatar = artifacts.require('Avatar')
  const DxAvatar = artifacts.require('DxAvatar')

  // const dxAvatar = Avatar.at(DxAvatar.address)
  const dxAvatar = await DxAvatar.deployed()
  console.log(`
Deploying DutchX Dao Controller:
  - Avatar: ${dxAvatar.address}
`)
  await deployer.deploy(DxController, dxAvatar.address)
  // const dxController = await DxController.deployed()
  // dxController.registerScheme(
  //   owner,
  //   0,
  //   bytes4(0x1F),
  //   address(_avatar)
  // )
  // dxController.unregisterScheme(this, address(_avatar));

  // Controller controller = new Controller(_avatar);
  //       controller.registerScheme(msg.sender,bytes32(0),bytes4(0x1F),address(_avatar));
  //       controller.unregisterScheme(this,address(_avatar));
  //       return address(controller);
}
