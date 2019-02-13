// artifacts and web3 are available globally
const DxLockMgnForRepArtifact = artifacts.require('DxLockMgnForRep')
const DxLockEth4RepArtifact = artifacts.require('DxLockEth4Rep')
const DxLockWhitelisted4RepArtifact = artifacts.require('DxLockWhitelisted4Rep')
const DxGenAuction4RepArtifact = artifacts.require('DxGenAuction4Rep')
const DxDaoClaimRedeemHelperArtifact = artifacts.require('DxDaoClaimRedeemHelper')

const { toBN } = require('./utils')(web3)

/* ================================================================================================================================
 * To help console testing - sets contracts + prints vars + saves events for respective Events into dxLMR_Lock_Events etc:
 * ================================================================================================================================/
// const dxLMRAddress = await DxLockMgnForRep.address, dxLMR = await DxLockMgnForRep.at('0x6099974d7Ed074110db69C515EC748893df43f13'), dxLER = await DxLockEth4Rep.at('0x311814CAfb902C72e87aAbC2978751B7314646e6'), dxLWR = await DxLockWhitelisted4Rep.at('0x1f05d55Cf3FA74eA658D87E48c60C5199Bad4caF'), dxGAR = await DxGenAuction4Rep.at('0x2B19c60d6934E2f20515a8aECCaC4a5c58221BD4'), getPastEvents = async (contract, eventName = 'Lock', fromBlock = 0) => contract['getPastEvents'](eventName, { fromBlock }), dxLER_Lock_Events = await getPastEvents(dxLER, 'Lock', 0), dxLMR_Lock_Events = await getPastEvents(dxLMR, 'Lock', 0), dxLWR_Lock_Events = await getPastEvents(dxLWR, 'Lock', 0), dxGAR_Bid_Events = await getPastEvents(dxGAR, 'Bid', 0), dxLMR_Lock_Beneficiaries = dxLMR_Lock_Events.map(event => event.returnValues._locker), dxLER_Lock_Beneficiaries = dxLER_Lock_Events.map(event => event.returnValues._locker), dxLWR_Lock_Beneficiaries = dxLWR_Lock_Events.map(event => event.returnValues._locker), dxGAR_Bid_Bidders = dxGAR_Bid_Events.map(event => event.returnValues._bidder), dxGAR_Bid_AuctionIDs = dxGAR_Bid_Events.map(event => event.returnValues._auctionId), await dxLMR.lockingStartTime().then(bn => bn.toString() * 1000).then(timeString => console.log('LOCK START TIME', new Date(timeString))), await dxLMR.lockingEndTime().then(bn => bn.toString() * 1000).then(timeString => console.log('LOCK END TIME', new Date(timeString))), await dxLMR.redeemEnableTime().then(bn => bn.toString() * 1000).then(timeString => console.log('REDEEM ENABLE TIME', new Date(timeString)))

/**
   Solidity Contracts + Require statements
   dxLMR, dxLER, dxLWR all inherit LockingReputation.sol && ExternalLockingForReputation.sol

 * Requires:
 * contract.redeem(_beneficiary) =>

 1. require(block.timestamp > redeemEnableTime, "now > redeemEnableTime");
 2. require(scores[_beneficiary] > 0, "score should be > 0");
 3. require(
    ControllerInterface(
    avatar.owner())
    .mintReputation(reputation, _beneficiary, address(avatar)), 
    "mint reputation should succeed"
  );
 */

/* 
  SUMMARY:

  Same as claim_mgn, but
  look for Lock events in DxLockMgnForRep, DxLockEth4Rep, DxLockWhitelisted4Rep
  and Bid event in DxGenAuction4Rep
  contracts in ./networks-3rd-rinkeby-test.json should have those
  then call Contract.redeem(account) 
*/

/**
   * How best to run this for testing
   * 
   * Rinkeby:
   * [use flag -f 'networks-rinkeby-long-lock.json' for addresses]
   * [use flag --from-block 0]
   * 
   * Complete [ DRY-RUN ]: npx truffle exec src/scripts/redeem_rep.js --network rinkeby -f 'networks-rinkeby-long-lock.json' --from-block 0
   * Complete [ REAL-RUN ]: npx truffle exec src/scripts/redeem_rep.js --network rinkeby -f 'networks-rinkeby-long-lock.json' --from-block 750153 --dry-run false
   */

const main = async () => {

  const argv = require('yargs')
    .usage('Usage: MNEMONIC="evil cat kills man ... " npm run claimMGN -- -f [string] --network [name] --dry-run --batch-size [number]')
    .option('f', {
      type: 'string',
      describe: 'Networks JSON file name'
    })
    .option('network', {
      type: 'string',
      default: 'development',
      describe: 'Blockchain network to operate on'
    })
    .option('dryRun', {
      type: 'boolean',
      default: true,
      describe: 'Run contract functions via [.call]'
    })
    .option('fromBlock', {
      type: 'number',
      default: 7185000,
      describe: 'Set from which Block to check for events'
    })
    .help('help')
    .argv

  if (!argv._[0]) return argv.showHelp()

  const { dryRun, network, f, batchSize, fromBlock } = argv

  console.log(`
    claim_mgn.js data:

    Dry run: ${dryRun}
    Network: ${network}
    Network file: ${f}
    Batch size: ${batchSize}
  `)

  try {
    let dxLMR, dxLER, dxLWR, dxGAR, dxHelper

    if (dryRun) {
      console.warn(`
      ============================================================================
      
      DRY-RUN ENABLED - Call values returned, no actual blockchain state affected. 
      To actually change state, please run without [--dry-run false].

      ============================================================================
      `)
    } else {
      console.warn(`
      =================================================================================================================
      WARNING DRY-RUN NOT ENABLED - Blockchain WILL be affected.

      If you're looking for a dry run, please remove the [--dry-run=false] flag 
      =================================================================================================================
      `)
    }

    if (f) {
      const fs = require('fs')
      const contractNetworksMap = JSON.parse(fs.readFileSync(f))
      const netID = await web3.eth.net.getId();

      ([dxLMR, dxLER, dxLWR, dxGAR, dxHelper] = await Promise.all([
        DxLockMgnForRepArtifact.at(contractNetworksMap['DxLockMgnForRep'][netID].address),
        DxLockEth4RepArtifact.at(contractNetworksMap['DxLockEth4Rep'][netID].address),
        DxLockWhitelisted4RepArtifact.at(contractNetworksMap['DxLockWhitelisted4Rep'][netID].address),
        DxGenAuction4RepArtifact.at(contractNetworksMap['DxGenAuction4Rep'][netID].address),
        DxDaoClaimRedeemHelperArtifact.at(contractNetworksMap['DxDaoClaimRedeemHelper'][netID].address)
      ]))
    } else {
      ([dxLMR, dxLER, dxLWR, dxGAR, dxHelper] = await Promise.all([
        DxLockMgnForRepArtifact.deployed(),
        DxLockEth4RepArtifact.deployed(),
        // DxLockEth4RepArtifact.at(contractNetworksMap['DxLockEth4Rep'][netID].address),
        DxLockWhitelisted4RepArtifact.deployed(),
        DxGenAuction4RepArtifact.deployed(),
        DxDaoClaimRedeemHelperArtifact.deployed(),
      ]))
    }

    if (fromBlock === 0 || fromBlock < 7185000) {
      console.warn(`
      =================================================================================================================
      WARNING: You are checking for Register events from either Block 0 or from a block further back than 15 hours ago.
      Script may hang or fail unexpectedly on Mainnet as filter array length size is too large.

      Please explicitly set the [--from-block <number>] flag if necessary.
      =================================================================================================================
      `)
    }

    // 1. Check all Lock events for dxLockMGNForRep, dxLockETHForRep, and dxLockWhitelistForRep
    //TODO: should this be 1 array? Does it matter if it's split?
    const [dxLMR_Lock_Events, dxLER_Lock_Events, dxLWR_Lock_Events, dxGAR_Bid_Events] = await Promise.all([
      dxLMR.getPastEvents('Lock', { fromBlock }),
      dxLER.getPastEvents('Lock', { fromBlock }),
      dxLWR.getPastEvents('Lock', { fromBlock }),
      dxGAR.getPastEvents('Bid', { fromBlock })
    ])

    // Cache necessary addresses from events
    const dxLER_Lock_Lockers = await removeZeroScoreAddresses(dxLER_Lock_Events.map(event => event.returnValues._locker), dxLER),
      dxLMR_Lock_Lockers = await removeZeroScoreAddresses(dxLMR_Lock_Events.map(event => event.returnValues._locker), dxLMR),
      dxLWR_Lock_Lockers = await removeZeroScoreAddresses(dxLWR_Lock_Events.map(event => event.returnValues._locker), dxLWR),
      [dxGAR_Bid_Bidders, dxGAR_Bid_AuctionIDs] = await removeZeroBidsAddresses(dxGAR_Bid_Events.map(
        event => event.returnValues._bidder),
        dxGAR_Bid_Events.map(event => event.returnValues._auctionId),
        dxGAR
      )

    // Throw if all addresses empty or non-redeemable
    if (!dxLER_Lock_Lockers.length && !dxLMR_Lock_Lockers.length && !dxLWR_Lock_Lockers.length && !dxGAR_Bid_Bidders.length) throw 'No workable data - all event address array empty. Aborting.'

    // ?. Dry Run - call redeem on all contracts
    if (dryRun) {
      /* 
        DxDaoClaimRedeemHelper uses an enum for the different dxDao lock, register, claim, redeem functionality
        regarding DxLockMgn, DxLockEth, and DxLockWhitelisted for Rep.
        0 = DxLockEth
        1 = DxLockMgn
        2 = DxLockWhitelisted
        3 = DxGenAuction4Rep (not used)
      */
      const [dxLER_Res, dxLMR_Res, dxLWR_Res] = await Promise.all([
        dxHelper.redeemAll.call(dxLER_Lock_Lockers, 0),
        dxHelper.redeemAll.call(dxLMR_Lock_Lockers, 1),
        dxHelper.redeemAll.call(dxLWR_Lock_Lockers, 2),
      ])

      console.log('dxLER_Lockers redeemAll Response = ', dxLER_Res)
      console.log('dxLMR_Lockers redeemAll Response = ', dxLMR_Res)
      console.log('dxLWR_Lockers redeemAll Response = ', dxLWR_Res)
      // dxGAR - redeemAllGAR
      const dxGAR_Res = await dxHelper.redeemAllGAR.call(dxGAR_Bid_Bidders, dxGAR_Bid_AuctionIDs)
      console.log('dxGAR_Lockers redeemAllGAR Response = ', dxGAR_Res)
    } else {
      console.log('Checking respective dxLXR contracts and redeeming if length . . .')
      const dxLER_Receipt = dxLER_Lock_Lockers.length && await dxHelper.redeemAll(dxLER_Lock_Lockers, 0)
      const dxLMR_Receipt = dxLMR_Lock_Lockers.length && await dxHelper.redeemAll(dxLMR_Lock_Lockers, 1)
      const dxLWR_Receipt = dxLWR_Lock_Lockers.length && await dxHelper.redeemAll(dxLWR_Lock_Lockers, 2)

      // dxGAR - redeemAllGAR
      const dxGAR_Receipt = dxGAR_Bid_Bidders.length && await dxHelper.redeemAllGAR(dxGAR_Bid_Bidders, dxGAR_Bid_AuctionIDs)

      dxLER_Receipt ? console.log('dxLER_Lockers redeemAll receipt = ', dxLER_Receipt) : console.log('No lockers to redeem for dxLER')
      dxLMR_Receipt ? console.log('dxLMR_Lockers redeemAll receipt = ', dxLMR_Receipt) : console.log('No lockers to redeem for dxLMR')
      dxLWR_Receipt ? console.log('dxLWR_Lockers redeemAll receipt = ', dxLWR_Receipt) : console.log('No lockers to redeem for dxLWR')
      dxGAR_Receipt ? console.log('dxGAR_Bidders redeemAllGAR receipt = ', dxGAR_Receipt) : console.log('No Bidders to redeem for dxGAR')
    }
  } catch (error) {
    console.error(error)
  }
}

async function removeZeroScoreAddresses(arr, contract) {
  const hasScore = await Promise.all(arr.map(bene => contract['scores'].call(bene)))
  const reducedArr = arr.reduce((acc, bene, idx) => {
    // REMOVE bene if they have 0 score
    if (hasScore[idx].lte(toBN(0))) return acc

    acc.push(bene)
    return acc
  }, [])
  return reducedArr
}

async function removeZeroBidsAddresses(bidders, auctionIds, contract) {
  const hasBidAmount = await Promise.all(auctionIds.map((id, idx) => contract.getBid.call(bidders[idx], id)))
  const reducedArr = bidders.reduce((acc, bene, idx) => {
    // REMOVE bene if they have 0 score
    if (hasBidAmount[idx].lte(toBN(0))) return acc

    acc.push({ bene, id: auctionIds[idx] })
    return acc
  }, [])
  return [reducedArr.map(({ bene }) => bene), reducedArr.map(({ id }) => id)]
}

module.exports = cb => main().then(() => cb(), cb)
