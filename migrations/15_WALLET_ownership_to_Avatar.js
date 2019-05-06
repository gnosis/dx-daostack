
/* global artifacts */

module.exports = async function (deployer) { // eslint-disable-line no-unused-vars
  if (process.env.USE_MOCK_DX && !web3.utils.isAddress(process.env.USE_MOCK_DX)) {
    const Wallet = artifacts.require('Wallet')
    const wallet = await Wallet.deployed()

    const DxAvatar = artifacts.require('DxAvatar')
    const dxAvatar = await DxAvatar.deployed()

    console.log('Setting Avatar at address', dxAvatar.address, 'as Wallet\'s owner');
    await wallet.transferOwnership(dxAvatar.address)

    console.log('Wallet\'s owner is now:', await wallet.owner());
  }
}
