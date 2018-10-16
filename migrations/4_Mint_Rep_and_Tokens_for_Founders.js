/* global artifacts */
/* eslint no-undef: "error" */
const daoConfig = require('../src/config/DutchX-dao')
const batchTransactions = require('../src/helpers/batchTransactions')(web3)

module.exports = async (deployer, network, accounts) => {
  const { founders, foundersInitialTokens, foundersInitialRep } = daoConfig
  /*
  const { founders: foundersAux, foundersInitialTokens, foundersInitialRep } = daoConfig
  if (foundersAux) {
    founders = foundersAux
  } else {
    // If no founders were specified, using the deployer as sole founder
    foundersMsg = ' (using defauls, the deployer is the sole founder)'
    foundersMsg = ''
    founders = [ accounts[0] ]
  }
  */
  if (founders && founders.length > 0) {
    mintTokensAndRepoForFounders(
      founders,
      foundersInitialTokens,
      foundersInitialRep
    )
  } else {
    console.log("The DAO doesn't have founders with initial Tokens and REP.")
  }
}

async function mintTokensAndRepoForFounders (
  founders,
  foundersInitialTokens,
  foundersInitialRep) {
  console.log(`
Minting tokens and REP for ${founders.length} founders:
  - Founders: ${founders.join(', ')}
  - Tokens: ${foundersInitialTokens} 
  - Reputation: ${foundersInitialRep}
`)
  if (foundersInitialTokens > 0 || foundersInitialRep > 0) {
    const DxToken = artifacts.require('DxToken')
    const DxReputation = artifacts.require('DxReputation')

    // construct txs for batch request
    const txConstructs = founders.reduce((accum, founder) => {
      // will call DxToken.mint(founder, foundersInitialTokens)
      const MintDxToken = {
        artifact: DxToken,
        method: 'mint',
        args: [founder, foundersInitialTokens]
      }

      // will call DxRep.mint(founder, foundersInitialRep)
      const MintDxRep = {
        artifact: DxReputation,
        method: 'mint',
        args: [founder, foundersInitialRep]
      }

      accum.push(MintDxToken, MintDxRep)
      return accum
    }, [])

    console.log('Batch sending transactions\n')
    const txHashes = await batchTransactions(txConstructs)
    console.log('Tx hashes:\n ', txHashes.join('\n  '))

    // TODO: Should we mint for the Dao itself??
  } else {
    console.log('No need to mint tokens or REP')
  }
}
