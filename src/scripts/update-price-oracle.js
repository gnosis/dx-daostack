/* global artifacts, Promise */
/* eslint no-undef: "error" */

const FixedPriceOracle = artifacts.require('FixedPriceOracle')
const path = require('path')
const dateUtil = require('../helpers/dateUtil')
const Fraction = require('fractional').Fraction
// const BN = web3.utils.BN
// const assert = require('assert')

// const GAS = 16e5

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

  // Get the subset of tokens that needs to be updated
  const tokensToUpdate = await getTokensToUpdate({
    fixedPriceOracle,
    tokens
  })

  // Get the subset of tokens that needs to be updated
  const tokenBatches = await getUpdateBatches(tokensToUpdate, batchSize)

  // Update the prices in batches
  for (let i=0; i< tokenBatches.length; i++) {
    const tokenBatch = tokenBatches[i]

    console.log('\n***********  update prices (%d/%d)  ************** ',
      (i + 1), tokenBatches.length)

    tokensToUpdate.slice(0, 5).forEach(({
      address,
      symbol,
      priceContract,
      price
    }) => {
      console.log('  - %s (%s) from %s to %s', symbol, address, priceContract, price)
    })

    const { tokens, numerators, denominators } = tokenBatch.reduce((acc, { address, price }) => {
      acc.tokens.push(address)
      acc.numerators.push(price.numerator)
      acc.denominators.push(price.denominator)

      return acc
    }, {
      tokens: [],
      numerators: [],
      denominators: []
    })


    // console.log('tokens', tokens)
    // console.log('numerators', numerators)
    // console.log('denominators', denominators)
    if (dryRun) {
      await fixedPriceOracle.setPrices.call(tokens, numerators, denominators)
      console.log('Dry run: %d token prices call succeed', tokenBatch.length)
    } else {
      const setPriceResult = await fixedPriceOracle.setPrices(tokens, numerators, denominators)
      console.log('%d token prices were updated. Transaction: %s', tokenBatch.length, setPriceResult.tx)
    }
  }

  console.log('\n **************  All prices were updated  **************\n')
}

async function getTokensToUpdate ({
  fixedPriceOracle,
  tokens
}) {
  // Get the actual prices for the tokens in the smart contract
  const actualPricePromises = tokens.map(async token => {
    const { price: priceDecimal, ...tokenFields } = token

    // Get price in the contract
    const priceContract = await getPriceValue({
      address: token.address,
      fixedPriceOracle
    })

    // Get price
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
    // console.log('%s: %s = %s? %s', token.symbol, token.price, token.priceContract, token.price.equals(token.priceContract))
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
      '%d tokens are already updated:\n  %s',
      tokensAlreadyUpdated.length,
      tokensAlreadyUpdated.map(token => token.symbol).join(', ')
    )
  } else {
    console.log('All tokens need to be updated')
  }

  if (tokensToUpdate.length > 0) {
    console.log(
      '\n%d tokens need to be updated:\n  %s',
      tokensToUpdate.length,
      tokensToUpdate.map(token => token.symbol).join(', ')
    )
  } else {
    console.log("\nThere's nothing to do")
  }

  return tokensToUpdate
}

async function getPriceValue({
  address,
  fixedPriceOracle
}) {
  let { 
    0: numerator,
    1: denominator 
  } = await fixedPriceOracle.getPriceValue(address) // { 0: 389, 1: 2500 }
  numerator = numerator.toNumber()
  denominator = denominator.toNumber()
  
  if (numerator === 0 && denominator === 0) {
     // A 0/0 means it's not initialized, so we assign the fraction 0/1 = 0
     denominator = 1
  }
  return new Fraction(
    numerator,
    denominator
  )
}

function getUpdateBatches(tokens, batchSize = DEFAULT_BATCH) {
  const batches = []

  for (let i=0; i < tokens.length; i += batchSize) {
      const batch = tokens.slice(i, i + batchSize)
      batches.push(batch)
  }

  return batches
}

module.exports = callback => {
  main().then(callback).catch(callback)
}
