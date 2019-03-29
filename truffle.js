const assert = require('assert')
const HDWalletProvider = require('truffle-hdwallet-provider')

const DEFAULT_MNEMONIC = 'candy maple cake sugar pudding cream honey rich smooth crumble sweet treat'
const SECRET_ENV_VARS = ['PK', 'MNEMNONIC', 'CRYPTO_COMPARE_API_KEY']

// Load env vars
const envPath = process.env.ENV_PATH
const { error, parsed } = require('dotenv').config(envPath && { path: envPath })
if (envPath && error) {
  console.error('Error configuring ENV vars')
  throw error
}

if (envPath) {
  console.log(`
  ==========================================
    Overriding defaults with ENV file: ${envPath}
  ==========================================
`)
} else {
  console.log(`
  ==========================================
    Not using any ENV file: Using defaults
  ==========================================
`)
}

if (parsed) {
  console.log('Overrided config using ENV vars: ')
  for (key in parsed) {
    if (SECRET_ENV_VARS.includes(key)) {
      console.log('  %s: %s', key, `<SECRET-${key}>`)
    } else {
      console.log('  %s: %s', key, parsed[key])
    }
  }
} else {
  console.log('No ENV vars were detected')
  if (envPath) {
    throw new Error('No ENV var was detected in the file: ' + envPath)
  }
}


console.log(`
  ==========================================
    Truffle config
  ==========================================
`)
const GAS_PRICE_GWEI = process.env.GAS_PRICE_GWEI || 10
const GAS_LIMIT = 6.5e6

// Get the mnemonic
const privateKey = process.env.PK
let mnemonic = process.env.MNEMONIC
if (!privateKey && !mnemonic) {
  mnemonic = DEFAULT_MNEMONIC
}

function truffleConfig({
  mnemonic = DEFAULT_MNEMONIC,
  privateKey,
  gasPriceGWei = GAS_PRICE_GWEI,
  gas = GAS_LIMIT,
  optimizedEnabled = true,
  urlRinkeby = 'https://rinkeby.infura.io/v3/9408f47dedf04716a03ef994182cf150',
  urlKovan = 'https://kovan.infura.io/v3/9408f47dedf04716a03ef994182cf150',
  urlMainnet = 'https://mainnet.infura.io/v3/9408f47dedf04716a03ef994182cf150',
  urlDevelopment = 'localhost',
  portDevelopment = 8545
} = {}) {
  assert(mnemonic, 'The mnemonic has not been provided');
  console.log(`Using gas limit: ${gas / 1000} K`);
  console.log(`Using gas price: ${gasPriceGWei} Gwei`);
  console.log(`Optimizer enabled: ${optimizedEnabled}`);
  console.log('Using default mnemonic: %s', mnemonic === DEFAULT_MNEMONIC);
  const gasPrice = gasPriceGWei * 1e9;

  let _getProvider
  if (privateKey) {
    console.log('Using private key')
    _getProvider = url => {
      return () => {
        return new HDWalletProvider([privateKey], url)
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
      },
      kovan: {
        provider: _getProvider(urlKovan),
        network_id: '42',
        gas,
        gasPrice
      },
    },
    compilers: {
      solc: {
        version: '0.5.4',
        docker: process.env.SOLC_USE_DOCKER === 'true' || false,
        settings: {
          optimizer: {
            enabled: optimizedEnabled, // Default: false
            runs: 200
          }
          // evmVersion: "byzantium"  // Default: "byzantium". Others:  "homestead", ...
        }
      }
    }
  };
}

module.exports = truffleConfig({
  optimizedEnabled: true,
  mnemonic,
  privateKey
})
