/* global artifacts, web3 */

const DxLockMgnForRepArtifact = artifacts.require('DxLockMgnForRep')
const DxLockEth4RepArtifact = artifacts.require('DxLockEth4Rep')
const DxLockWhitelisted4RepArtifact = artifacts.require('DxLockWhitelisted4Rep')
const DxGenAuction4RepArtifact = artifacts.require('DxGenAuction4Rep')
const DxDaoClaimRedeemHelperArtifact = artifacts.require('DxDaoClaimRedeemHelper')

const { toBN, getTimestamp } = require('./utils')(web3)
const batchExecute = require('./utils/batch')

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
    .option('batchSize', {
      type: 'number',
      default: 50,
      describe: 'Set batch size'
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
    .option('toBlock', {
      type: 'number',
      default: null,
      describe: 'Set to which Block to check for events (latest by default)'
    })
    .option('blockBatchSize', {
      type: 'number',
      default: 50000, // a bit less than 10 days
      describe: 'Number of blocks for fetching the events'
    })
    .option('mgn', {
      type: 'boolean',
      default: true,
      describe: 'Redeem events for MGN Locks'
    })
    .option('eth', {
      type: 'boolean',
      default: true,
      describe: 'Redeem events for ETH Locks'
    })
    .option('whitelisted', {
      type: 'boolean',
      default: true,
      describe: 'Redeem events for Whitelisted Tokens Locks'
    })
    .option('gen', {
      type: 'boolean',
      default: true,
      describe: 'Redeem events for GEN Bids'
    })

    .help('help')
    .argv

  if (!argv._[0]) return argv.showHelp()

  const { dryRun, network, f, batchSize, fromBlock, toBlock, blockBatchSize, mgn, eth, whitelisted, gen } = argv

  console.log(`
    redeem_rep.js data:

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
    // const [dxLMR_Lock_Events, dxLER_Lock_Events, dxLWR_Lock_Events, dxGAR_Bid_Events] = await Promise.all([
    //   dxLMR.getPastEvents('Lock', { fromBlock }),
    //   dxLER.getPastEvents('Lock', { fromBlock }),
    //   dxLWR.getPastEvents('Lock', { fromBlock }),
    //   dxGAR.getPastEvents('Bid', { fromBlock })
    // ])

    const dxLMR_Lock_Events = mgn ? await getPastEvents(dxLMR, 'Lock', { fromBlock , toBlock, blockBatchSize}) : []
    const dxLER_Lock_Events = eth ? await getPastEvents(dxLER, 'Lock', { fromBlock , toBlock, blockBatchSize}) : []
    const dxLWR_Lock_Events = whitelisted ? await getPastEvents(dxLWR, 'Lock', { fromBlock , toBlock, blockBatchSize}) : []
    const dxGAR_Bid_Events = gen ? await getPastEvents(dxGAR, 'Bid', { fromBlock , toBlock, blockBatchSize}): []
    // const dxGAR_Bid_Events = []

    // eslint-disable-next-line no-inner-declarations
    function parseEventLog({returnValues}) {
      return Object.entries(returnValues).reduce((accum, [k,v]) => {
        if(Number.isNaN(+k))accum[k]=v
        return accum
        },{})
    }

    // eslint-disable-next-line no-inner-declarations
    async function getPastEvents(contract, eventName, { fromBlock = 0, toBlock, blockBatchSize = 30, ...rest} = {}) {
      if (!toBlock) ({number: toBlock} = await web3.eth.getBlock('latest'));

      try {
        console.log(`Fetching event ${eventName} from contract ${contract.constructor.contractName}`);
        const results = await contract.getPastEvents(eventName, { fromBlock, toBlock, ...rest})
        console.log('single batch: ', results.map(parseEventLog));
        return results
      } catch (error) {
        if (error.message.includes('query returned more than 1000 results')) {
          console.warn(error.message)
          console.log(`Will try getting events from ${blockBatchSize} blocks at a time`)

          const results = []

          let gotEvents = 0

          for (let i = fromBlock; i <= toBlock; i += blockBatchSize) {
            const toBlockBatch = Math.min(i + blockBatchSize - 1, toBlock)
            console.log(`\n  [Fetch event ${eventName} from block ${i} to ${toBlockBatch} from contract ${contract.constructor.contractName}]`)
            const batch = await retry(() => {
              return contract.getPastEvents(eventName, { fromBlock: i, toBlock: toBlockBatch, ...rest})
            })
            console.log('batch: ', batch.map(parseEventLog));

            results.push(...batch)
            gotEvents += batch.length
            if (gotEvents > 1000) {
              gotEvents = 0
              console.log('Got more than 1000 events. Trying fetching the rest in one bunch.');
              console.log(`\n  [Fetch event ${eventName} from block ${i + blockBatchSize} to ${toBlock} from contract ${contract.constructor.contractName}]`)
              try {
                const batch = await retry(() => {
                  return contract.getPastEvents(eventName, { fromBlock: i + blockBatchSize, toBlock, ...rest})
                })
                console.log('batch: ', batch.map(parseEventLog));
    
                results.push(...batch)
                return results
              } catch (error) {
                if (error.message.includes('query returned more than 1000 results')) {
                  console.warn(error.message)
                  console.log(`Continuing getting events from ${blockBatchSize} blocks at a time`)
                }
              }
            }
            // await wait(WAIT_TIME)
          }

          return results
        }

        throw error
      }
    }

    // Cache necessary addresses from events
    console.log('Removing addresses with zero score from LockEth4Rep')
    let dxLER_Lock_Lockers = await removeZeroScoreAddresses(dxLER_Lock_Events.map(event => event.returnValues._locker), dxLER, {batchSize})
    console.log('Removing addresses with zero score from LockMgn4Rep')
    let  dxLMR_Lock_Lockers = await removeZeroScoreAddresses(dxLMR_Lock_Events.map(event => event.returnValues._locker), dxLMR, {batchSize})
    console.log('Removing addresses with zero score from LockWhitelisted4Rep')
    let  dxLWR_Lock_Lockers = await removeZeroScoreAddresses(dxLWR_Lock_Events.map(event => event.returnValues._locker), dxLWR, {batchSize})
    console.log('Removing addresses with zero score from BidGenAuction')
    let  [dxGAR_Bid_Bidders, dxGAR_Bid_AuctionIDs] = await removeZeroBidsAddresses(dxGAR_Bid_Events.map(
        event => event.returnValues._bidder),
        dxGAR_Bid_Events.map(event => event.returnValues._auctionId),
        dxGAR, {batchSize}
      )

    // Throw if all addresses empty or non-redeemable
    if (!dxLER_Lock_Lockers.length && !dxLMR_Lock_Lockers.length && !dxLWR_Lock_Lockers.length && !dxGAR_Bid_Bidders.length) throw 'No workable data - all event address array empty. Aborting.'

    dxLER_Lock_Lockers = removeDuplicates(dxLER_Lock_Lockers);
    dxLMR_Lock_Lockers = removeDuplicates(dxLMR_Lock_Lockers);
    dxLWR_Lock_Lockers = removeDuplicates(dxLWR_Lock_Lockers);
    [dxGAR_Bid_Bidders, dxGAR_Bid_AuctionIDs] = removePairedDuplicates(dxGAR_Bid_Bidders, dxGAR_Bid_AuctionIDs);

    // console.log('dxLER_Lock_Lockers: ', dxLER_Lock_Lockers);
    // console.log('dxLMR_Lock_Lockers: ', dxLMR_Lock_Lockers);
    // console.log('dxLWR_Lock_Lockers: ', dxLWR_Lock_Lockers);
    // console.log('dxGAR_Bid_Bidders: ', dxGAR_Bid_Bidders);
    // console.log('dxGAR_Bid_AuctionIDs: ', dxGAR_Bid_AuctionIDs);

    const timing = await checkTiming(dxLMR)
    if (timing.error) {
      const { redeemStart, now, error } = timing
      throw new Error(`
      Redeeming can be done only after redeemEnableTime.
      redeemEnableTime: ${redeemStart};
      Now: ${now};
      ${error}
      `)
    }

    const redeemAllInBatches = (accountsToRedeem, mapIdx, call = true, txOptions) => {
      return batchExecute(
        accountsSlice => {
          return (call ? dxHelper.redeemAll.call : dxHelper.redeemAll)(accountsSlice, mapIdx, txOptions)
        },
        { batchSize, log: true },
        accountsToRedeem
      )
    }

    const redeemAllGARInBatches = (accountsToRedeem, auctionIDs, call = true, txOptions) => {
      return batchExecute(
        (accountsSlice, auctionIDsSlice) => {
          return (call ? dxHelper.redeemAllGAR.call : dxHelper.redeemAllGAR)(accountsSlice, auctionIDsSlice, txOptions)
        },
        { batchSize, log: true },
        accountsToRedeem,
        auctionIDs,
      )
    }

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
        redeemAllInBatches(dxLER_Lock_Lockers, 0),
        redeemAllInBatches(dxLMR_Lock_Lockers, 1),
        redeemAllInBatches(dxLWR_Lock_Lockers, 2),
      ])

      console.log('dxLER_Lockers redeemAll Responses = ', dxLER_Res.map(arrayBNtoNum))
      console.log('dxLMR_Lockers redeemAll Responses = ', dxLMR_Res.map(arrayBNtoNum))
      console.log('dxLWR_Lockers redeemAll Responses = ', dxLWR_Res.map(arrayBNtoNum))
      // dxGAR - redeemAllGAR
      const dxGAR_Res = await redeemAllGARInBatches(dxGAR_Bid_Bidders, dxGAR_Bid_AuctionIDs)
      console.log('dxGAR_Lockers redeemAllGAR Responses = ', dxGAR_Res.map(arrayBNtoNum))
    } else {
      console.log('Checking respective dxLXR contracts and redeeming if length . . .')
      let dxLER_Receipts, dxLMR_Receipts, dxLWR_Receipts, dxGAR_Receipts
      if (dxLER_Lock_Lockers.length) {
        const gas = await dxHelper.redeemAll.estimateGas(dxLER_Lock_Lockers.slice(0, batchSize), 0)
        // console.log('gas: ', gas);
        dxLER_Receipts = await redeemAllInBatches(dxLER_Lock_Lockers, 0, false, { gas })
      }

      if (dxLMR_Lock_Lockers.length) {
        const gas = await dxHelper.redeemAll.estimateGas(dxLMR_Lock_Lockers.slice(0, batchSize), 1)
        // console.log('dxLMRgas: ', gas);
        dxLMR_Receipts = await redeemAllInBatches(dxLMR_Lock_Lockers, 1, false, { gas })
      }

      if (dxLWR_Lock_Lockers.length) {
        const gas = await dxHelper.redeemAll.estimateGas(dxLWR_Lock_Lockers.slice(0, batchSize), 2)
        // console.log('dxLWRgas: ', gas);
        dxLWR_Receipts = await redeemAllInBatches(dxLWR_Lock_Lockers, 2, false, { gas })
      }

      // // dxGAR - redeemAllGAR
      if (dxGAR_Bid_Bidders.length) {
        const gas = await dxHelper.redeemAllGAR.estimateGas(dxGAR_Bid_Bidders.slice(0, batchSize), dxGAR_Bid_AuctionIDs.slice(0, batchSize))
        // console.log('dxGARgas: ', gas);
        dxGAR_Receipts = await redeemAllGARInBatches(dxGAR_Bid_Bidders, dxGAR_Bid_AuctionIDs, false, { gas })
      }

      dxLER_Receipts ? console.log('dxLER_Lockers redeemAll receipts = ', dxLER_Receipts) : console.log('No lockers to redeem for dxLER')
      dxLMR_Receipts ? console.log('dxLMR_Lockers redeemAll receipts = ', dxLMR_Receipts) : console.log('No lockers to redeem for dxLMR')
      dxLWR_Receipts ? console.log('dxLWR_Lockers redeemAll receipts = ', dxLWR_Receipts) : console.log('No lockers to redeem for dxLWR')
      dxGAR_Receipts ? console.log('dxGAR_Bidders redeemAllGAR receipts = ', dxGAR_Receipts) : console.log('No Bidders to redeem for dxGAR')
    }
  } catch (error) {
    console.error(error)
  }
}

async function retry(cb, attempt = 1, maxAttempts = 10) {
  try {
    return await cb()
  } catch (e) {
    // const waitTime = attempt * attempt * WAIT_TIME
    // console.error(`\nError claiming MGN. Retrying in ${waitTime / 1000} seconds. ${maxAttempts - attempt} remaining attempts\n`)
    console.error(`\nError redeeming. Retrying. ${maxAttempts - attempt} remaining attempts\n`)

    if (attempt >= maxAttempts) {
      console.log('Out of attempts')
      throw e
    } else {
      // await wait(waitTime)
      console.warn(e.message)
      return await retry(cb, attempt + 1, maxAttempts)
    }
  }
}

function arrayBNtoNum(arr) {
  return arr.map(bn => bn.toString())
}

async function removeZeroScoreAddresses(arr, contract, {batchSize}) {
  const hasScoreArrs = await batchExecute(
    accountsSlice => {
      return retry(() => Promise.all(accountsSlice.map(bene => contract.scores.call(bene))))
      // return Promise.all(accountsSlice.map(bene => contract.scores.call(bene)))
    },
    { batchSize, log: true },
    arr
  )
  const hasScore = [].concat(...hasScoreArrs)
  // const hasScore = await Promise.all(arr.map(bene => contract['scores'].call(bene)))
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

function removeDuplicates(arr) {
  return Array.from(new Set(arr))
}

function removePairedDuplicates(arr1, arr2) {
  const filled = {}

  const arr1Filtered = [], arr2Filtered = []

  for (let i = 0, len = arr1.length; i < len; ++i) {
    const arr1Value = arr1[i]
    const arr2Value = arr2[i]

    if (!filled[arr1Value]) filled[arr1Value] = new Set
    if (filled[arr1Value].has(arr2Value)) continue

    filled[arr1Value].add(arr2Value)
    arr1Filtered.push(arr1Value)
    arr2Filtered.push(arr2Value)
  }

  return [arr1Filtered, arr2Filtered]
}

async function checkTiming(redeemableCtr) {
  const [redeemStart, now] = await Promise.all([
    redeemableCtr.redeemEnableTime.call(),
    getTimestamp()
  ])

  const redeemStartUTC = new Date(redeemStart * 1000).toUTCString()
  const nowUTC = new Date(now * 1000).toUTCString()

  const res = {
    redeemStart: redeemStartUTC,
    now: nowUTC,
    error: null
  }

  const nowBN = toBN(now)

  if (redeemStart.gt(nowBN)) {
    res.error = 'Too early'
  }

  return res
}

module.exports = cb => main().then(() => cb(), cb)
