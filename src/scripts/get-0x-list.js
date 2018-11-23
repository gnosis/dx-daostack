/* global artifacts, Promise */
/* eslint no-undef: "error" */

const fs = require('fs-extra')
const path = require('path')
const OUTPUT_DIR = path.join(__dirname, '../resources/0x-whitelist')

// Usage example:
//  yarn yarn get-0x-list -h
//  yarn get-0x-list

var argv = require('yargs')
  .usage('Usage: yarn get-0x-list [--network name]')  
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

async function main () {
  if (!argv._[0]) {
    argv.showHelp()
  } else {
    const network = argv.network
    const TokenRegistry = artifacts.require('TokenRegistry')
    const tokenRegisty = await TokenRegistry.deployed()

    console.log('\n **************  Get tokens from 0x  **************\n')
    console.log(`Data:
    Network: ${network}
    0x TokenRegistry address: ${tokenRegisty.address}
`)

    console.log('Getting tokens...')
    const addresses = await tokenRegisty.getTokenAddresses()
    console.log('The contract has %d tokens', addresses.length)

    console.log('Getting metadata...')
    const tokenInfoPromises = addresses.map(async address => {
      const {
        1: name,
        2: symbol,
        3: decimals,
        4: ipfsHash,
        5: swarmHash
      } = await tokenRegisty.getTokenMetaData(address)

      return {
        address: address,
        name,
        symbol,
        decimals,
        ipfsHash,
        swarmHash
      }
    })

    // Wait for all the metadata
    const tokens = await Promise.all(tokenInfoPromises)
    console.log('All token info has been fetched')
    
    const filePath = path.join(OUTPUT_DIR, `info0xList-${network}.json`)
    console.log('Writting file %s', filePath)
    const info0xList = {
      network,
      address: tokenRegisty.address,
      tokens
    }

    await fs.ensureDir(OUTPUT_DIR)
    await fs.writeJson(
      filePath,
      info0xList, {
        spaces: 2
    })

    // if (addresses.length > 0) {
    //   addresses.forEach(address => console.log('  %s', address))
    //   console.log('\n  Total: %d', addresses.length)
    // } else {
    //   console.log('  There are no addresses yet')
    // }
    console.log('\n **************************************************\n')
  }
}

module.exports = callback => {
  main().then(callback).catch(callback)
}
