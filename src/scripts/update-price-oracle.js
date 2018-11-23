/* global artifacts, Promise */
/* eslint no-undef: "error" */

const path = require('path')
const fs = require('fs-extra')
// const assert = require('assert')
const PRICES_DIR = path.join(__dirname, '../resources/token-prices')

// Usage example:
//  yarn yarn update-price-oracle -h
//  yarn update-price-oracle

const argv = require('yargs')
  .usage('Usage: yarn update-price-oracle [--network name]')
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
  const { tokens } = require(path.join(PRICES_DIR, `prices-${network}.json`))
  const tokensWithPrices = tokens.filter(token => token.price !== null && token.price > 0)

  console.log('\n **************  Update price oracle  **************\n')
  console.log(`Data:
    Network: ${network}
    Number of tokens: ${tokens.length}
    Number of with prices: ${tokensWithPrices.length}
    Percentage of token with prices: ${Math.round(100 * tokensWithPrices.length / tokens.length)}%
`)

  tokensWithPrices.forEach(({
    address,
    name, 
    symbol, 
    priceSource, 
    price
  }) => {
    console.log('  %s (%s)', name, symbol)
    console.log('    - address: %s', address)
    console.log('    - price: %s', price)
    console.log('    - priceSource: %s', priceSource)
  })
}

// module.exports = callback => {
//   main().then(callback).catch(callback)
// }

main().catch(console.error)
