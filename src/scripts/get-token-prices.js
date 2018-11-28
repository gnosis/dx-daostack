/* global artifacts, Promise */
/* eslint no-undef: "error" */

const path = require('path')
const fs = require('fs-extra')

// const assert = require('assert')
const WHITELIST_DIR = path.join(__dirname, '../resources/0x-whitelist')
const OUTPUT_DIR = path.join(__dirname, '../resources/token-prices')

// Price feeds
const kyberPriceFeed = require('./helpers/kyberPriceFeed')
const zeroXPriceFeed = require('./helpers/zeroXPriceFeed')
const cryptoComparePriceFeed = require('./helpers/cryptoComparePriceFeed')

const USE_CRYPTO_COMPARE = true
const USE_KYBER = true
const USE_0X = true

// Usage example:
//  yarn yarn get-token-prices -h
//  yarn get-token-prices

const argv = require('yargs')
  .usage('Usage: yarn get-token-prices [--network name]')
  .option('network', {
    type: 'string',
    describe: 'One of the ethereum networks defined in truffle config'
  })
  .demandOption([
    'network'
  ])
  .help('h')
  .strict()
  .argv

console.log(argv)

async function main () {
  const network = argv.network
  const { tokens } = require(path.join(WHITELIST_DIR, `info0xList-${network}.json`))

  console.log('\n **************  Get tokens prices  **************\n')
  console.log(`Data:
    Network: ${network}
    Number of tokens: ${tokens.length}
`)


  console.log('Getting prices...')
  let kyberPrices, zeroXPrices, cryptoComparePrices

  if (USE_KYBER) {
    kyberPrices = await kyberPriceFeed.getPrices({
      tokens
    })
    console.log('Kyber has %d prices', Object.keys(kyberPrices).length)
  }
  if (USE_0X) {
    const etherPriceInUsd = await cryptoComparePriceFeed.getEtherPrice('USD')

    zeroXPrices = await zeroXPriceFeed.getPrices({
      tokens,
      etherPriceInUsd
    })
    console.log('Ox has %d prices', Object.keys(zeroXPrices).length)
  }
  if (USE_CRYPTO_COMPARE) {
    cryptoComparePrices = await cryptoComparePriceFeed.getPrices({
      tokens
    })
    console.log('Crypto Compare has %d prices', Object.keys(cryptoComparePrices).length)
  }


  
  const tokenInfoPromises = tokens.map(async token => {
    const { address, name, symbol } = token
    const addressLowercase = address.toLowerCase()
    // Get Crypto Compare prices
    let priceInfoCryptoCompare
    if (cryptoComparePrices) {
      priceInfoCryptoCompare = cryptoComparePrices[addressLowercase] || null
    }

    // Get kyber prices
    let priceInfoKyber
    if (kyberPrices) {
      priceInfoKyber = kyberPrices[addressLowercase] || null
    }

    // Get 0x prices
    let priceInfo0x
    if (zeroXPrices) {
      priceInfo0x = zeroXPrices[addressLowercase] || null
    }
    
    let priceSource = null
    let price = null
    if (priceInfoCryptoCompare && priceInfoCryptoCompare.price) {
      priceSource = 'crypto compare'
      price = priceInfoCryptoCompare.price
    } else if (priceInfoKyber && priceInfoKyber.currentPrice) {
      priceSource = 'kyber'
      price = priceInfoKyber.currentPrice
    } else if (priceInfo0x && priceInfo0x.lastPrice) {
      priceSource = '0x'
      price = priceInfo0x.lastPrice
    }
    
    return {
      address,
      name,
      symbol,
      priceSource,
      price,
      details: {
        kyber: priceInfoKyber,
        zeroX: priceInfo0x,
        cryptoCompare: priceInfoCryptoCompare
      }
    }
  })

  // Wait for all the metadata
  const tokensPricesInfo = await Promise.all(tokenInfoPromises)
  
  const filePath = path.join(OUTPUT_DIR, `prices-${network}.json`)
  console.log('Writting file %s', filePath)
  const tokenPrices = {
    network,
    lastCheck: (new Date()).toISOString(),
    tokens: tokensPricesInfo
  }
  
  const numTokensWithPrice = tokensPricesInfo.reduce((total, tokenPriceInfo) => {
    if (tokenPriceInfo.price) {
      total++
    }
    return total
  }, 0)
  console.log(
    '\nFound %d prices out of %d tokens: %d%',
    numTokensWithPrice,
    tokens.length,
    Math.round(100 * numTokensWithPrice / tokens.length)
  )

  await fs.ensureDir(OUTPUT_DIR)
  await fs.writeJson(
    filePath,
    tokenPrices, {
      spaces: 2
  })
}

// module.exports = callback => {
//   main().then(callback).catch(callback)
// }

main().catch(console.error)
