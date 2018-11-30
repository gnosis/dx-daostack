/* global artifacts, Promise, web3 */
/* eslint no-undef: "error" */

const FixedPriceOracle = artifacts.require('FixedPriceOracle')
const path = require('path')
const dateUtil = require('../helpers/dateUtil')
const Fraction = require('fractional').Fraction
// const BN = web3.utils.BN
// const assert = require('assert')

const GAS = 16e5

// How many prices we update at once
const DEFAULT_BATCH = 50

// Usage example:
//  yarn yarn update-price-oracle -h
//  yarn update-price-oracle -f ./src/resources/token-prices/priceOracle-prices-mainnet.json --network rinkeby  --dry-run

const argv = require('yargs')
  .usage('Usage: yarn update-price-oracle [--network name]')
  .option('network', {
    type: 'string',
    describe: 'One of the ethereum networks defined in truffle config'
  })
  .demandOption([
    'network',
    'f'
  ])
  .option('f', {
    type: 'string',
    demandOption: true,
    describe: 'File with the that will be set to the price oracle'
  })
  .option('dryRun', {
    type: 'boolean',
    default: false,
    describe: 'Dry run. Do not update the price oracle, do just the validations.'
  })
  .option('batchSize', {
    type: 'integer',
    default: DEFAULT_BATCH,
    describe: 'How many prices are approved at once'
  })
  .help('h')
  .strict()
  .argv

async function main () {
  const { f, network, dryRun, batchSize } = argv
  const pricesFile = path.join('../..', f)
  const { tokens, lastCheck } = require(pricesFile)

  console.log('\n **************  Update price oracle  **************\n')
  console.log(`Data:
    Network: ${network}
    Prices file: ${f}
    Prices date: ${dateUtil.formatDateTime(lastCheck)}
    Number of tokens: ${tokens.length}

    Dry run: ${dryRun ? 'Yes' : 'No'}
    Batch size: ${batchSize}
`)

  const fixedPriceOracle = await FixedPriceOracle.deployed()

  // Get the actual prices for the tokens in the smart contract
  const actualPricePromises = tokens.map(async token => {
    const { price: priceDecimal, ...tokenFields } = token

    // Get current price
    const { 
      0: numeratorBn,
      1: denominatorBn 
    } = await fixedPriceOracle.getPriceValue(token.address) // { 0: 389, 1: 2500 }
    const numerator = numeratorBn.toNumber()
    let denominator = denominatorBn.toNumber()
    
    if (numerator === 0 && denominator === 0) {
       // A 0/0 means it's not initialized, so we assign the fraction 0/1 = 0
       denominator = 1
    }
    const priceContract = new Fraction(
      numerator,
      denominator
    )

    // Get actual price
    const price = new Fraction(priceDecimal)

    return {
      ...tokenFields,
      priceDecimal,
      price,
      priceContract
    }
  })

  // Wait for all the prices of the tokens
  const actualPrices = await Promise.all(actualPricePromises)

  const { tokensAlreadyUpdated, tokensToUpdate } = actualPrices.reduce((acc, token) => {
    if (token.price.equals(token.priceContract)) {
      acc.tokensAlreadyUpdated.push(token)
    } else {
      acc.tokensToUpdate.push(token)
    }
    return acc
  }, {
    tokensAlreadyUpdated: [],
    tokensToUpdate: []
  })

  if (tokensAlreadyUpdated.length > 0) {
    console.log(
      '%d tokens are already updated:\n%s',
      tokensAlreadyUpdated.length,
      tokensAlreadyUpdated.map(token => token.symbol).join(', ')
    )
  } else {
    console.log('All tokens need to be updated')
  }

  if (tokensToUpdate.length > 0) {
    console.log(
      '\n%d tokens need to be updated:\n%s',
      tokensToUpdate.length,
      tokensToUpdate.map(token => token.symbol).join(', ')
    )
  } else {
    console.log('All tokens are already updated')
  }
  
  tokensToUpdate.slice(0, 5).forEach(({
    address,
    name, 
    symbol,
    priceContract,
    price
  }) => {
    console.log('  %s (%s)', name, symbol)
    console.log('    - address: %s', address)
    console.log('    - contract price: %s', priceContract)
    console.log('    - price: %s', price)
  })
}

module.exports = callback => {
  main().then(callback).catch(callback)
}
