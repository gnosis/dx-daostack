/* global artifacts, web3 */
/* eslint no-undef: "error" */
const assert = require('assert')
const dateUtil = require('../src/helpers/dateUtil')
const { registerScheme } = require('./helpers/schemeUtils')

const {
  getLockedMgnSignature,
  agreementHash
} = require('../src/config/bootstrap')

// TODO: Once we use the latest contracts, we should use all this dates.
const {
  // initialDistributionStart,
  // initialDistributionEnd,
  claimingMgnStart,
  claimingMgnEnd,
  redeemStart
} = require('../src/config/timePeriods')

const {
  mgnReward
} = require('../src/config/initialRepDistribution')(web3)

const getDXContractAddresses = require('../src/helpers/getDXContractAddresses')(web3, artifacts)

module.exports = async function (deployer) {
  const DxLockMgnForRep = artifacts.require('DxLockMgnForRep')
  const DxAvatar = artifacts.require('DxAvatar')
  const DxController = artifacts.require('DxController')

  // Get instances
  const dxAvatar = await DxAvatar.deployed()
  const dxController = await DxController.deployed()

  const mgnImpl = process.env.MGN_IMPL || 'TokenFRTProxy'
  let mgnTokenAddress
  if (mgnImpl === 'TokenFRTProxy') {
    console.log('Use DutchX real MGN')
    mgnTokenAddress = await getDXContractAddresses('TokenFRTProxy')
  } else {
    console.log('Use MGN implentation: ', mgnImpl)
    const MgnContract = artifacts.require(mgnImpl)
    const mgnContract = await deployer.deploy(MgnContract)
    mgnTokenAddress = mgnContract.address

    if (mgnImpl === 'MgnOwnableMock' && process.env.MGN_IMPL_OWNER) {
      console.log('Transferring MgnOwnableMock ownership to', process.env.MGN_IMPL_OWNER);

      await mgnContract.transferOwnership(process.env.MGN_IMPL_OWNER)
    }
    console.log();
  }

  // Deploy DxLockMgnForRep
  console.log('Deploying DxLockMgnForRep scheme')
  console.log('  - Scheme that allows to get GEN by locking MGN')
  await deployer.deploy(DxLockMgnForRep)

  // Initialize DxLockMgnForRep
  const dxLockMgnForRep = await DxLockMgnForRep.deployed()
  console.log('Configure DxLockMgnForRep scheme:')
  assert(mgnReward, `The parameter reputationReward was not defined`)
  // assert(initialDistributionStart, `The parameter initialDistributionStart was not defined`)
  // assert(initialDistributionEnd, `The parameter initialDistributionEnd was not defined`)
  assert(claimingMgnStart, `The parameter claimingMgnStart was not defined`)
  assert(claimingMgnEnd, `The parameter claimingMgnEnd was not defined`)
  assert(redeemStart, `The parameter redeemStart was not defined`)
  assert(getLockedMgnSignature, `The parameter getBalanceFuncSignature was not defined`)
  assert(agreementHash, `The parameter agreementHash was not defined`)

  console.log('  - Avatar address: ' + dxAvatar.address)
  console.log('  - Register period: Register period: Currently any time, but only makes sense before the claiming period ends ' + dateUtil.formatDateTime(claimingMgnEnd))
  // console.log('  - Register start time: ' + dateUtil.formatDateTime(initialDistributionStart))
  // console.log('  - Register end time: ' + dateUtil.formatDateTime(initialDistributionEnd))
  console.log('  - Claim start time (24h period, actual locking): ' + dateUtil.formatDateTime(claimingMgnStart))
  console.log('  - Claim end time (24h period, actual locking): ' + dateUtil.formatDateTime(claimingMgnEnd))
  console.log('  - Redeem enable time: ' + dateUtil.formatDateTime(redeemStart))

  console.log('  - MGN implementation: ' + mgnImpl)
  console.log('  - MGN address (external locking contract): ' + mgnTokenAddress)
  console.log('  - Get balance function signature: ' + getLockedMgnSignature)
  console.log('  - Agreement IPFS hash:', agreementHash)

  let txResult = await dxLockMgnForRep.initialize(
    dxAvatar.address,
    mgnReward,
    // Register period: Currently any time
    // The contract claiming, is the locking period for the contract (24h period)
    dateUtil.toEthereumTimestamp(claimingMgnStart),
    dateUtil.toEthereumTimestamp(claimingMgnEnd),
    // Redeem period    
    dateUtil.toEthereumTimestamp(redeemStart),
    mgnTokenAddress,
    getLockedMgnSignature,
    agreementHash
  )

  console.log('  - Transaction: ' + txResult.tx)
  console.log('  - Gas used: ' + txResult.receipt.gasUsed)
  console.log(`(*) Dates use ${dateUtil.timeZone} time zone`)
  console.log()

  // Register scheme DxLockMgnForRep
  await registerScheme({
    label: 'DxLockMgnForRep',
    schemeAddress: dxLockMgnForRep.address,
    avatarAddress: dxAvatar.address,
    controller: dxController,
    web3
  })
}
