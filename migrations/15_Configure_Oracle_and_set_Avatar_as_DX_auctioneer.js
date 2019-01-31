
/* global artifacts */
/* eslint no-undef: "error" */

module.exports = async function (deployer, network) { // eslint-disable-line no-unused-vars
  console.log('network: ', network);

  if (process.env.USE_FIXED_PRICE_ORACLE) {
    const FixedPriceOracle = artifacts.require('FixedPriceOracle')

    const PriceOracle = await FixedPriceOracle.deployed()

    let whitelistedTokens
    if (network === 'rinkeby') {
      // Add some test tokens for Rinkeby    
      whitelistedTokens = {
        WETH: '0xc778417e063141139fce010982780140aa0cd5ab',
        RDN: '0x3615757011112560521536258c1e7325ae3b48ae',
        OMG: '0x00df91984582e6e96288307e9c2f20b38c8fece9',
        testGEN: '0xa1f34744c80e7a9019a5cd2bf697f13df00f9773',
        GEN: '0x543ff227f64aa17ea132bf9886cab5db55dcaddf'
      }
    } else if (network.startsWith('mainnet')) {
      whitelistedTokens = {
        GNO: '0x6810e776880C02933D47DB1b9fc05908e5386b96',
        GEN: '0x543ff227f64aa17ea132bf9886cab5db55dcaddf'
      }
    }
    console.log('\nSetting price for tokens on FixedPriceOracle: ')
    let tokens = [], nums = [], dens = []
    Object.keys(whitelistedTokens).forEach((tokenName, i) => {
      const address = whitelistedTokens[tokenName]
      console.log('  - %s: %s', tokenName, address, `to 1/${i+1}`)

      tokens.push(address)
      nums.push(1)
      dens.push(i + 1)
    })

    if (tokens.length > 0) {
      await PriceOracle.setPrices(tokens, nums, dens)
    }
  }

  if (process.env.USE_MOCK_DX) {
    const Wallet = artifacts.require('Wallet')
    const WalletDeployed = await Wallet.deployed()

    const DxAvatar = artifacts.require('DxAvatar')
    const dxAvatar = await DxAvatar.deployed()

    console.log('Setting Avatar at address', dxAvatar.address, 'as Wallet\'s owner');
    await WalletDeployed.transferOwnership(dxAvatar.address)

    console.log('Wallet\'s owner is now:', await WalletDeployed.owner());
  }
}
