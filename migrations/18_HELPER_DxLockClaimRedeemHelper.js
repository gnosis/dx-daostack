/* global artifacts, Promise */
/* eslint no-undef: "error" */

module.exports = async function (deployer) {
  const DxLockMgnForRep = artifacts.require('DxLockMgnForRep')
  const DxLockEth4Rep = artifacts.require('DxLockEth4Rep')
  const DxLockWhitelisted4Rep = artifacts.require('DxLockWhitelisted4Rep')
  const DxGenAuction4Rep = artifacts.require('DxGenAuction4Rep')
  const DxDaoClaimRedeemHelper = artifacts.require('DxDaoClaimRedeemHelper')

  // Get the locking contracts
  const [
    dxLockMgnForRep,
    dxLockEth4Rep,
    dxLockWhitelisted4Rep,
    dxGenAuction4Rep
  ] = await Promise.all([
    DxLockMgnForRep.deployed(),
    DxLockEth4Rep.deployed(),
    DxLockWhitelisted4Rep.deployed(),
    DxGenAuction4Rep.deployed(),
  ])

  // Deploy DxLockMgnForRepHelper
  console.log('Deploying DxDaoClaimRedeemHelper helper: Allows to batch claim all MGN')
  console.log('  - DxLockMgnForRep address: ' + dxLockMgnForRep.address)
  console.log('  - DxLockEth4Rep address: ' + dxLockEth4Rep.address)
  console.log('  - DxLockWhitelisted4Rep', dxLockWhitelisted4Rep.address)
  console.log('  - DxGenAuction4Rep', dxGenAuction4Rep.address)
  return deployer.deploy(
    DxDaoClaimRedeemHelper,
    dxLockEth4Rep.address,
    dxLockMgnForRep.address,
    dxLockWhitelisted4Rep.address,
    dxGenAuction4Rep.address
  )
}
