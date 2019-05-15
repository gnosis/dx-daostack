/* global artifacts, web3 */

const { toBN, mapToString } = require('../utils')(web3)

const MgnBasicMock = artifacts.require('MgnBasicMock')
const DxLockMgnForRepArtifact = artifacts.require('DxLockMgnForRep')
const TokenFRTArtifact = artifacts.require('TokenFRT')
// const TokenFRTProxyArtifact = artifacts.require('TokenFRTProxy')

module.exports = async () => {
  try {
    const network = await web3.eth.net.getId()
    if (network <= 1) throw 'Must be on local network or Rinkeby.'

    const mgnBasicMock = await MgnBasicMock.deployed()
    const dxLockMgnForRep = await DxLockMgnForRepArtifact.deployed()
    const tokenMgn = await TokenFRTArtifact.at(mgnBasicMock.address)

    // Get Accts
    const accts = await web3.eth.getAccounts()
    console.log('Script running for accounts: ', accts)

    // Loop through local accts and lock 100 MGN from each
    const LockReceipts = await Promise.all(accts.map(acct => mgnBasicMock.lock(toBN(100), { from: acct })))
    console.log('MgnBasicMock LockReceipts: ', LockReceipts)

    const agreementHash = await dxLockMgnForRep.getAgreementHash()

    // Loop through local accts and register accts
    const RegisterReceipts = await Promise.all(accts.map(acct => dxLockMgnForRep.register(agreementHash, { from: acct })))
    console.log('DxLockMgnForRep RegisterReceipts: ', RegisterReceipts)

    // show balances of mgn
    const mgnBalances = await Promise.all(accts.map(acct => tokenMgn.lockedTokenBalances(acct)))
    console.log('MGN Locked Balances After', mapToString(mgnBalances))
  } catch (error) {
    console.error(error)
  } finally {
    process.exit()
  }
}
