/* global artifacts, web3 */

const { toBN, mapToString, getTimestamp } = require('../utils')(web3)

// const MgnBasicMock = artifacts.require('MgnBasicMock')
const DxGenAuction4Rep = artifacts.require('DxGenAuction4Rep')
const GenToken = artifacts.require('GenToken')
// const TokenFRTArtifact = artifacts.require('TokenFRT')
// const TokenFRTProxyArtifact = artifacts.require('TokenFRTProxy')

const AMOUNT_TO_APPROVE = web3.utils.toWei(toBN(200000))

module.exports = async () => {
  try {
    const network = await web3.eth.net.getId()
    if (network <= 1) throw 'Must be on local network or Rinkeby.'

    // const mgnBasicMock = await MgnBasicMock.deployed()
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

    const now = await getTimestamp()
    const auctionsStartTime = await dxGenAuction4Rep.auctionsStartTime()
    const auctionPeriod = await dxGenAuction4Rep.auctionPeriod()

    // auctionId = (now - auctionsStartTime) / auctionPeriod
    const currentAuctionId = toBN(now).sub(auctionsStartTime).div(auctionPeriod)

    const agreementHash = await dxGenAuction4Rep.getAgreementHash()

    // Loop through local accts and lock 100 MGN from each
    const BidReceipts = await Promise.all(
      accts.map(acct => dxGenAuction4Rep.bid(web3.utils.toWei(toBN(100)), currentAuctionId, agreementHash, { from: acct }))
    )
    console.log('dxGenAuction4Rep BidReceipts: ', BidReceipts)
  } catch (error) {
    console.error(error)
  } finally {
    process.exit()
  }
}
