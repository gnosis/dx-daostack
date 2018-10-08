/* global artifacts */
/* eslint no-undef: "error" */
const daoConfig = require('../src/config/DutchX-dao')

module.exports = async (deployer, network, accounts) => {
  let founders, foundersMsg
  const { founders: foundersAux, foundersInitialTokens, foundersInitialRep } = daoConfig
  if (foundersAux) {
    founders = foundersAux
  } else {
    // If no founders were specified, using the deployer as sole founder
    foundersMsg = ' (using defauls, the deployer is the sole founder)'
    foundersMsg = ''
    founders = [ accounts[0] ]
  }
  console.log(`
Minting tokens and REP for ${founders.length} founders:
  - Founders: ${founders.join(', ') + foundersMsg}
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
      await mintFounderTokens(founder, dxToken, foundersInitialTokens)
      await mintFounderReputation(founder, dxReputation, foundersInitialRep)
    }
  } else {
    console.log('No need to mint tokens or REP')
  }
}

async function mintFounderTokens (founder, dxToken, foundersInitialTokens) {
  if (foundersInitialTokens) {
    const txResult = await dxToken.mint(founder, foundersInitialTokens)
    console.log(`Token minted:
- Transaction: ${txResult.tx}
- Gas used: ${txResult.receipt.gasUsed}
`)
  }
}

async function mintFounderReputation (founder, dxReputation, foundersInitialRep) {
  if (foundersInitialRep) {
    const txResult = await dxReputation.mint(founder, foundersInitialRep)
    console.log(`REP minted:
- Transaction: ${txResult.tx}
- Gas used: ${txResult.receipt.gasUsed}
`)
  }
}
