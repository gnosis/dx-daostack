// web3 and artifacts available globalls
const { toBN, mapToString } = require('../utils')(web3)

// const ExternalTokenLockerMock = artifacts.require('ExternalTokenLockerMock')
const DxGenAuction4Rep = artifacts.require('DxGenAuction4Rep')
const GenToken = artifacts.require('GenToken')
// const TokenFRTArtifact = artifacts.require('TokenFRT')
// const TokenFRTProxyArtifact = artifacts.require('TokenFRTProxy')

const AMOUNT_TO_APPROVE = web3.utils.toWei(toBN(200000))

module.exports = async () => {
    try {
        const network = await web3.eth.net.getId()
        if (network <= 1) throw 'Must be on local network or Rinkeby.'
        
        // const externalTokenLockerMock = await ExternalTokenLockerMock.deployed()
        const dxGenAuction4Rep = await DxGenAuction4Rep.deployed()
        const genToken = await GenToken.deployed()

        // Get Accts
        const accts = await web3.eth.getAccounts()
        console.log('Script running for accounts: ', accts)
        
        // Set Allowance to ${AMOUNT_TO_APPROVE}
        await Promise.all(accts.map(acct => genToken.approve(dxGenAuction4Rep.address, AMOUNT_TO_APPROVE, { from: acct })))

        await Promise.all(accts.map(acct => genToken.transfer(acct, web3.utils.toWei(toBN(1000)), { from: accts[0] })))

        const balances = await Promise.all(accts.map(acct => genToken.balanceOf(acct)))
		console.log('TCL: GEN Balances: ', mapToString(balances))

        // Loop through local accts and lock 100 MGN from each
        const BidReceipts = await Promise.all(accts.map(acct => dxGenAuction4Rep.bid(web3.utils.toWei(toBN(100)), { from: acct })))
		console.log('dxGenAuction4Rep BidReceipts: ', BidReceipts)
    } catch (error) {
        console.error(error)
    } finally {
        process.exit()
    }
}
