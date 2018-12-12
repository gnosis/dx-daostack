/* global artifacts */
/* eslint no-undef: "error" */
const daoConfig = require('../src/config/dao')

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

    const dxToken = await DxToken.deployed()
    const dxReputation = await DxReputation.deployed()
    for (var i = 0; i < founders.length; i++) {
      const founder = founders[i]
      console.log(`Minting tokens and REP for ${founder}:`)
      await mintTokens({
        account: founder,
        amount: foundersInitialTokens,
        dxToken
      })
      await mintReputation({
        account: founder,
        amount: foundersInitialRep,
        dxReputation
      })
    }
    // TODO: Should we mint for the Dao itself??
  } else {
    console.log('No need to mint tokens or REP')
  }
}

async function mintTokens ({
  account,
  amount,
  dxToken
}) {
  if (amount) {
    const txResult = await dxToken.mint(account, amount)
    console.log(`Token minted:
- Transaction: ${txResult.tx}
- Gas used: ${txResult.receipt.gasUsed}
`)
  }
}

async function mintReputation (account, amount, dxReputation) {
  if (amount) {
    const txResult = await dxReputation.mint(account, amount)
    console.log(`REP minted:
- Transaction: ${txResult.tx}
- Gas used: ${txResult.receipt.gasUsed}
`)
  }
}
