const assert = require('assert')
const HDWalletProvider = require('truffle-hdwallet-provider')
const DEFAULT_GAS_PRICE_GWEI = 5
const GAS_LIMIT = 6.5e6
const DEFAULT_MNEMONIC = 'candy maple cake sugar pudding cream honey rich smooth crumble sweet treat'

// Get the mnemonic
const privateKey = process.env.PK
let mnemonic = process.env.MNEMONIC
if (!privateKey && !mnemonic) {
  mnemonic = DEFAULT_MNEMONIC
}

function truffleConfig ({
  mnemonic = DEFAULT_MNEMONIC,
  privateKey,
  gasPriceGWei = DEFAULT_GAS_PRICE_GWEI,
  gas = GAS_LIMIT,
  optimizedEnabled = true,
  urlRinkeby = 'https://rinkeby.infura.io/',
  urlMainnet = 'https://mainnet.infura.io',
  urlDevelopment = 'localhost',
  portDevelopment = 8545
} = {}) {
  assert(mnemonic, 'The mnemonic has not been provided')
  console.log(`Using gas limit: ${gas / 1000} K`)
  console.log(`Using gas price: ${gasPriceGWei} Gwei`)
  console.log(`Optimizer enabled: ${optimizedEnabled}`)
  console.log('Using default mnemonic: %s', mnemonic === DEFAULT_MNEMONIC)
  const gasPrice = gasPriceGWei * 1e9

  let _getProvider  
  if (privateKey) {
    console.log('Using private key')
    _getProvider = url => {
      return () => {
        return new HDWalletProvider([ privateKey ], url)
      }
    }
  } else {
    console.log(mnemonic === DEFAULT_MNEMONIC ? 'Using default mnemonic' : 'Using custom mnemonic')    
    _getProvider = url => {
      return () => {
        return new HDWalletProvider(mnemonic, url)
      }
    }
  }

  return {
    networks: {
      development: {
        host: urlDevelopment,
        port: portDevelopment,
        gas,
        gasPrice,
        network_id: '*'
      },
      mainnet: {
        provider: _getProvider(urlMainnet),
        network_id: '1',
        gas,
        gasPrice
      },
      rinkeby: {
        provider: _getProvider(urlRinkeby),
        network_id: '4',
        gas,
        gasPrice
      }
    },
    compilers: {
      solc: {
        version: '0.4.25',
        docker: true,
        settings: {
          optimizer: {
            enabled: optimizedEnabled, // Default: false
            runs: 200
          }
          // evmVersion: "byzantium"  // Default: "byzantium". Others:  "homestead", ...
        }
      }
    }
  }
}

module.exports = truffleConfig({
  optimizedEnabled: true,
  mnemonic,
  privateKey
})
