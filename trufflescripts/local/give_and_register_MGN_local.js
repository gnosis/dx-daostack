// web3 and artifacts available globalls
const { toBN, mapToString } = require('../utils')(web3)

const ExternalTokenLockerMock = artifacts.require('ExternalTokenLockerMock')
const DxLockMgnForRepArtifact = artifacts.require('DxLockMgnForRep')
const TokenFRTArtifact = artifacts.require('TokenFRT')
// const TokenFRTProxyArtifact = artifacts.require('TokenFRTProxy')

module.exports = async () => {
    try {
        const network = await web3.eth.net.getId()
        if (network < 100) throw 'Must be on local network'
        
        const externalTokenLockerMock = await ExternalTokenLockerMock.deployed()
        const dxLockMgnForRep = await DxLockMgnForRepArtifact.deployed()
        const tokenMgn = await TokenFRTArtifact.at(externalTokenLockerMock.address)

        // Get Accts
        const accts = await web3.eth.getAccounts()
        
        // Loop through local accts and lock 100 MGN from each
        const LockReceipts = await Promise.all(accts.map(acct => externalTokenLockerMock.lock(toBN(100), { from: acct })))
		console.log('ExternalTokenLockerMock LockReceipts: ', LockReceipts)

        // Loop through local accts and register accts
        const RegisterReceipts = await Promise.all(accts.map(acct => dxLockMgnForRep.register({ from: acct })))
        console.log('DxLockMgnForRep RegisterReceipts: ', RegisterReceipts)
        
        // show balances of mgn
        const mgnBalances = await Promise.all(accts.map(acct => tokenMgn.lockedTokenBalances.call(acct)))
		console.log('MGN Locked Balances After', mapToString(mgnBalances))
    } catch (error) {
        console.error(error)
    } finally {
        process.exit()
    }
}
