/* global artifacts, Promise */
/* eslint no-undef: "error" */

const path = require('path')
const fs = require('fs-extra')
// const assert = require('assert')
const WHITELIST_DIR = path.join(__dirname, '../resources/0x-whitelist')
const OUTPUT_DIR = path.join(__dirname, '../resources/token-prices')

const kyberPriceFeed = require('./helpers/kyberPriceFeed')

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
  const kyberPrices = await kyberPriceFeed.getPrices()
  // console.log(kyberPrices)

  console.log('Kyber has %d prices', Object.keys(kyberPrices).length)

  
  const tokenInfoPromises = tokens.map(async token => {
    const { address, name, symbol } = token
    const priceSource = 'kyber'
    const priceInfo = kyberPrices[address.toLowerCase()] || {}
    const { currentPrice = null, ...details } = priceInfo
    
    return {
      address,
      name,
      symbol,
      priceSource,
      price: currentPrice,
      details
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
