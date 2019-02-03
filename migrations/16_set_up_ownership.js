
/* global artifacts */
/* eslint no-undef: "error" */
// Multisig address on mainnet
const MULTISIG_MAIN = '0x851b7F3Ab81bd8dF354F0D7640EFcD7288553419'

module.exports = async function (deployer, network) { // eslint-disable-line no-unused-vars
  if (process.env.USE_MOCK_DX) {
    const Wallet = artifacts.require('Wallet')
    const WalletDeployed = await Wallet.deployed()

    const DxAvatar = artifacts.require('DxAvatar')
    const dxAvatar = await DxAvatar.deployed()

    console.log('Setting Avatar at address', dxAvatar.address, 'as Wallet\'s owner');
    await WalletDeployed.transferOwnership(dxAvatar.address)

    console.log('Wallet\'s owner is now:', await WalletDeployed.owner());
  }

  if (network.startsWith('mainnet')) {
    const ExternalTokenLockerMock = artifacts.require('ExternalTokenLockerMock')
    const externalTokenLockerMock = await ExternalTokenLockerMock.deployed()

    const PriceOracleMock = artifacts.require('PriceOracleMock')
    const priceOracleMock = await PriceOracleMock.deployed()

    // give ownership of ExternalTokenLockerMock and PriceOracleMock to multisig
    console.log('Transferring ownership of ExternalTokenLockerMock to', MULTISIG_MAIN);

    await externalTokenLockerMock.transferOwnership(MULTISIG_MAIN)

    console.log('Transferring ownership of PriceOracleMock to', MULTISIG_MAIN);

    await priceOracleMock.transferOwnership(MULTISIG_MAIN)
  }
}
