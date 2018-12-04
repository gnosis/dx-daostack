/* global artifacts, Promise */
/* eslint no-undef: "error" */

const path = require('path')
const fs = require('fs-extra')

// const assert = require('assert')
const OUTPUT_FILE = path.join(__dirname, '../resources/crypto-compare/tokens.json')

// Price feeds
const cryptoComparePriceFeed = require('./helpers/cryptoComparePriceFeed')

// Usage example:
//  yarn yarn get-cryptocompare-tokens -h
//  yarn get-cryptocompare-tokens

const argv = require('yargs')
  .usage('Usage: yarn get-cryptocompare-tokens')
  .help('h')
  .strict()
  .argv

async function main () {
  console.log('\n **************  Get tokens CryptoCompare tokens  **************\n')

  const { Data: coinList } = await cryptoComparePriceFeed.getCoinList()
  const tokens = Object
    // Get symbols
    .values(coinList)

    // Take only coins with address
    .filter(coin => coin.SmartContractAddress !== 'N/A')

  const tokensByAddres = tokens.reduce((acc, token) => {
    const { SmartContractAddress: address, ...details } = token
    acc[address.toLowerCase()] = {
      address,
      ...details
    }
    return acc
  }, {})

  console.log('Found %d tokens in Crypto Compare', tokens.length)
  console.log('Write file: %s', OUTPUT_FILE)
  await fs.writeJson(
    OUTPUT_FILE,
    tokensByAddres, {
      spaces: 2
  })
}

// module.exports = callback => {
//   main().then(callback).catch(callback)
// }

main().catch(console.error)
