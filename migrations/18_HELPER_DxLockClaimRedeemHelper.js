/* // Deploy DxLockMgnForRepHelper
console.log('Deploying DxLockMgnForRepHelper helper')
console.log('  - Helper that allows to batch claim all MGN')
await deployer.deploy(DxDaoClaimRedeemHelper, dxLockMgn.address) */

/* global artifacts, web3 */
/* eslint no-undef: "error" */
const assert = require('assert')
const dateUtil = require('../src/helpers/dateUtil')
const { registerScheme } = require('./helpers/schemeUtils')

const {
    getLockedMgnSignature
} = require('../src/config/bootstrap')

// TODO: Once we use the latest contracts, we should use all this dates.

module.exports = async function (deployer) {
    const DxLockMgnForRep = artifacts.require('DxLockMgnForRep')
    const DxLockEth4Rep = artifacts.require('DxLockEth4Rep')
    const DxLockWhitelisted4Rep = artifacts.require('DxLockWhitelisted4Rep')
    const DxGenAuction4Rep = artifacts.require('DxGenAuction4Rep')
    const DxDaoClaimRedeemHelper = artifacts.require('DxDaoClaimRedeemHelper')

    // Get DxLockMgnForRep
    const [dxLMR, dxLER, dxLWR, dxGAR] = await Promise.all([
        DxLockMgnForRep.deployed(),
        DxLockEth4Rep.deployed(),
        DxLockWhitelisted4Rep.deployed(),
        DxGenAuction4Rep.deployed(),
    ])

    console.log('TCL: dxLMR, dxLER, dxLWR, dxGAR', dxLMR.address, dxLER.address, dxLWR.address, dxGAR.address)

    return deployer.deploy(DxDaoClaimRedeemHelper, dxLER.address, dxLMR.address, dxLWR.address, dxGAR.address)
}
