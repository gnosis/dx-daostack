/* global artifacts, web3 */

const DxLockMgnForRepArtifact = artifacts.require('DxLockMgnForRep')
const DxLockEth4RepArtifact = artifacts.require('DxLockEth4Rep')
const DxLockWhitelisted4RepArtifact = artifacts.require('DxLockWhitelisted4Rep')
const DxGenAuction4RepArtifact = artifacts.require('DxGenAuction4Rep')
const DxDaoClaimRedeemHelperArtifact = artifacts.require('DxDaoClaimRedeemHelper')

const inquirer = require('inquirer');
const {
  streamline,
  makeBatchNumberTracker,
  makeProcessSlice,
  postprocessBatchRequest,
} = require('./utils/rx')

const Web3 = require('web3')
const HDWalletProvider = require('truffle-hdwallet-provider')
const fs = require('fs-extra')

const rxjs = require('rxjs')
const rxjsOps = require('rxjs/operators')
const { toBN, getTimestamp, getBlockNumber, getPastEventsRx } = require('./utils')(web3)

const {network2URL} = require('./utils/network2Url')

function createProvider(url, { pk, mnemonic }) {
  return new HDWalletProvider(
    pk ? [pk] : mnemonic,
    url,
  )
}

function createWeb3({ network }) {
  const provider = createProvider(network2URL[network], {
    mnemonic: process.env.MNEMONIC,
    pk: process.env.PK,
  })
  return { web3: new Web3(provider), provider }
}

// let AGREEMENT_HASH
const accounts = {
  MGN: [],
  ETH: [],
  Token: [],
  GEN: {
    bidders: [],
    auctionIds: [],
  },
}

const FromBlocks = {
  MGN: 0,
  ETH: 0,
  Token: 0,
  GEN: 0,
}

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

const getFname = ({ network, address, CTR_NAME }) => `./reports/${CTR_NAME}#${address}@${network}.json`

function readFileReport(options) {
  const fname = getFname(options)
  console.log(`Loading ${fname}`);
  return fs.readJSON(fname).catch(() => ({}))
}

const concatDistinct = (arr1, arr2) => {
  return Array.from(new Set(arr1.concat(arr2)))
}

async function writeFileReport({ lable, ...data }, options) {
  const fname = getFname(options)

  const json = await fs.readJSON(fname).catch(() => ({}))
  // console.log('json: ', json);

  const pastData = json[lable] || DefaultJson[lable]

  let newData
  if (lable === 'Redeemed') {
    newData = {
      block: data.block,
      accounts: concatDistinct(pastData.accounts, data.accounts),
    }
  } else if (lable === 'Locked') {
    newData = {
      fromBlock: pastData.fromBlock || data.fromBlock,
      toBlock: data.toBlock,
      accounts: concatDistinct(pastData.accounts, data.accounts),
    }
  } else {
    newData = data
  }

  Object.assign(json, { [lable]: newData })

  return fs.outputJSON(fname, json, { spaces: 2 })
}
async function writeFileReportGEN({ lable, ...data }, options) {
  const fname = getFname(options)

  const json = await fs.readJSON(fname).catch(() => ({}))
  // console.log('json: ', json);

  const pastData = json[lable] || DefaultJsonGEN[lable]

  let newData
  if (lable === 'Redeemed') {
    const [bidders, auctionIds] = removePairedDuplicates(
      pastData.accounts.bidders.concat(data.accounts.bidders),
      pastData.accounts.auctionIds.concat(data.accounts.auctionIds)
    )
    newData = {
      block: data.block,
      accounts: {
        bidders,
        auctionIds,
      },
    }
  } else if (lable === 'Bid') {
    const [bidders, auctionIds] = removePairedDuplicates(
      pastData.accounts.bidders.concat(data.accounts.bidders),
      pastData.accounts.auctionIds.concat(data.accounts.auctionIds)
    )
    newData = {
      fromBlock: pastData.fromBlock || data.fromBlock,
      toBlock: data.toBlock,
      accounts: {
        bidders,
        auctionIds,
      },
    }
  } else {
    newData = data
  }

  Object.assign(json, { [lable]: newData })

  return fs.outputJSON(fname, json, { spaces: 2 })
}

const DefaultJson = {
  Locked: {
    fromBlock: 0,
    toBlock: 0,
    accounts: [],
  },
  Redeemed: {
    block: 0,
    accounts: [],
  }
}
const DefaultJsonGEN = {
  Redeemed: {
    block: 0,
    accounts: {
      bidders: [],
      auctionIds: [],
    },
  },
  Bid: {
    fromBlock: 0,
    toBlock: 0,
    accounts: {
      bidders: [],
      auctionIds: [],
    },
  }
}
async function loadPreviousAccounts(options) {
  const json = await readFileReport(options)
  // console.log('json: ', json);
  const {
    Locked = DefaultJson.Locked,
    Redeemed = DefaultJson.Redeemed,
  } = json || {}

  console.group('Loaded previous accounts');
  console.log(`
    Locked:
      From block: ${Locked.fromBlock}
      To block: ${Locked.toBlock}
      Accounts: ${Locked.accounts.length}
  `);

  console.log(`
    Redeemed:
      At block ${Redeemed.block}
      Redeemed: ${Redeemed.accounts.length}
  `);

  console.groupEnd()

  const redeemedSet = new Set(Redeemed.accounts)

  const unredeemedAccounts = Locked.accounts.filter(acc => !redeemedSet.has(acc))

  return {
    oldFromBlock: Locked.fromBlock,
    oldToBlock: Locked.toBlock,
    newFromBlock: Locked.toBlock && Locked.toBlock + 1,
    lockedAccounts: Locked.accounts,
    unredeemedAccounts,
    redeemedAtBlock: Redeemed.block,
    redeemedAccounts: Redeemed.accounts
  }
}

async function loadPreviousAccountsGEN(options) {
  const json = await readFileReport(options)
  // console.log('json: ', json);
  const {
    Redeemed = DefaultJsonGEN.Redeemed,
    Bid = DefaultJsonGEN.Bid,
  } = json || {}

  console.group('Loaded previous accounts');

  console.log(`
    Bid:
      From block: ${Bid.fromBlock}
      To block: ${Bid.toBlock}
      Account-AuctionId pairs: ${Bid.accounts.bidders.length}
  `);


  console.log(`
    Redeemed:
      At block ${Redeemed.block}
      Redeemed pairs: ${Redeemed.accounts.bidders.length}
  `);

  console.groupEnd()

  const filtered = filterBidPairs({
    toFilter: Bid.accounts,
    filterAgainst: Redeemed.accounts
  })

  return {
    oldFromBlock: Bid.fromBlock,
    oldToBlock: Bid.toBlock,
    newFromBlock: Bid.toBlock && Bid.toBlock + 1,
    redeemedPairs: Redeemed.accounts,
    unredeemedPairs: filtered,
    redeemedAtBlock: Redeemed.block,
  }
}

function filterBidPairs({
  toFilter,
  filterAgainst
}) {
  const filterSet = new Set(filterAgainst.bidders.map((bidder, i) => {
    return `${bidder}@${filterAgainst.auctionIds[i]}`
  }))

  const { bidders, auctionIds } = toFilter.bidders.reduce((accum, bidder, i) => {
    const auctionId = toFilter.auctionIds[i]
    const hash = `${bidder}@${auctionId}`

    if (!filterSet.has(hash)) {
      accum.bidders.push(bidder)
      accum.auctionIds.push(auctionId)
    }

    return accum
  }, { bidders: [], auctionIds: [] })

  return { bidders, auctionIds }
}

const MGNchoices = [
  'Print current account selection for LockMgn4Rep',
  'Gather new Lock MGN events (W)',
  'Filter out users that have been Redeemed for LockMgn4Rep (W)',
  'Filter out users redeeming would revert for LockMgn4Rep',
  'Dry run MGN redeeming',
  'Real MGN redeeming',
  'Reload MGN accounts from saved file',
]

const ETHchoices = [
  'Print current account selection for LockEth4Rep',
  'Gather new Lock ETH events (W)',
  'Filter out users that have been Redeemed for LockEth4Rep (W)',
  'Filter out users redeeming would revert for LockEth4Rep',
  'Dry run ETH redeeming',
  'Real ETH redeeming',
  'Reload ETH accounts from saved file',
]

const TokenChoices = [
  'Print current account selection for LockWhitelisted4Rep',
  'Gather new Lock Token events (W)',
  'Filter out users that have been Redeemed for LockWhitelisted4Rep (W)',
  'Filter out users redeeming would revert for LockWhitelisted4Rep',
  'Dry run Token redeeming',
  'Real Token redeeming',
  'Reload Token accounts from saved file',
]

const GENchoices = [
  'Print current account selection for BidGenAuction',
  'Print current account-auctionId pairs selection for BidGenAuction',
  'Gather new Bid GEN events (W)',
  'Filter out account-auctionId pairs that have been Redeemed for BidGenAuction (W)',
  'Filter out account-auctionId pairs redeeming would revert for BidGenAuction',
  'Dry run GEN auction redeeming',
  'Real GEN auction redeeming',
  'Reload GEN account-auctionId pairs from saved file',
]

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
    .option('maxConcurrent', {
      type: 'number',
      default: 1,
      describe: 'Set number of concurrent batches'
    })
    .option('fromBlock', {
      type: 'number',
      default: 0,
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

  let { network, batchSize, maxConcurrent, fromBlock } = argv

  const { web3: wa3 } = createWeb3(argv)
  console.log('web3 version: ', web3.version);
  console.log('wa3 version: ', wa3.version);

  console.log(`
    redeem_rep.js data:

    Network: ${network}
    Batch size: ${batchSize}
    Max concurrent: ${maxConcurrent}
    Searching Events from block: ${fromBlock}
  `)


  const [dxLMR, dxLER, dxLWR, dxGAR, dxHelper] = await Promise.all([
    DxLockMgnForRepArtifact.deployed(),
    DxLockEth4RepArtifact.deployed(),
    DxLockWhitelisted4RepArtifact.deployed(),
    DxGenAuction4RepArtifact.deployed(),
    DxDaoClaimRedeemHelperArtifact.deployed(),
  ])


  if (fromBlock === 0 || fromBlock < 7185000) {
    console.warn(`
      =================================================================================================================
      WARNING: You are checking for Register events from either Block 0 or from a block further back than 15 hours ago.
      Script may hang or fail unexpectedly on Mainnet as filter array length size is too large.

      Please explicitly set the [--from-block <number>] flag if necessary.
      =================================================================================================================
      `)
  }

  const contracts = {
    DxLockMGN: dxLMR,
    DxLockETH: dxLER,
    DxLockToken: dxLWR,
    DxGENauction: dxGAR,
    ClaimHelper: dxHelper,
  }

  // AGREEMENT_HASH = await dxLMR.getAgreementHash()

  console.log('fromBlock: ', fromBlock);
  if (!fromBlock) {
    console.log(`--from-block wasn't specified. Assuming the earliest block any of the contracts was deployed at`);
    const fromBlocks = (await Promise.all([
      web3.eth.getTransaction(DxLockMgnForRepArtifact.transactionHash),
      web3.eth.getTransaction(DxLockEth4RepArtifact.transactionHash),
      web3.eth.getTransaction(DxLockWhitelisted4RepArtifact.transactionHash),
      web3.eth.getTransaction(DxDaoClaimRedeemHelperArtifact.transactionHash),
    ])).map(rc => rc.blockNumber)
    const earliestBlock = Math.min(...fromBlocks)
    console.log('fromBlocks: ', fromBlocks);
    console.log('earliestBlock: ', earliestBlock);
    fromBlock = earliestBlock
    console.log('fromBlock: ', fromBlock);
    FromBlocks.MGN = FromBlocks.ETH = FromBlocks.Token = FromBlocks.GEN = fromBlock
  }

  const choices = [
    new inquirer.Separator('--------MGN--------'),
    ...MGNchoices,
    new inquirer.Separator('--------ETH--------'),
    ...ETHchoices,
    new inquirer.Separator('--------Token--------'),
    ...TokenChoices,
    new inquirer.Separator('--------GEN-auction--------'),
    ...GENchoices,
    new inquirer.Separator(),
    'Refresh time',
    'Reload accounts from saved file',
    new inquirer.Separator(),
    'Quit'
  ]



  const inquire = (def) => inquirer.prompt({
    type: 'list',
    name: 'action',
    message: 'Choose action',
    pageSize: 20,
    default: def,
    choices
  })

  const updateHeader = async (str = getTimesStr(contracts)) => {
    console.log(await str)
  }

  const [master] = await web3.eth.getAccounts()
  console.log('master: ', master);

  await act('Reload accounts from saved file', { network, web3, wa3, master, contracts, batchSize, maxConcurrent, fromBlock })

  let cont, answ = {}
  do {
    await updateHeader()
    answ = await inquire(answ.action)
    cont = await act(answ.action, { network, web3, wa3, master, contracts, batchSize, maxConcurrent, fromBlock })
  } while (cont)


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
}

const whichContract = str => {
  const [, EVENT_NAME, CTR_NAME] = /(Lock|Bid)\s+(\w+)/.exec(str)
  return { EVENT_NAME, CTR_NAME }
}

async function act(action, options) {
  const { web3, wa3, contracts, fromBlock } = options
  const {
    DxGENauction,
    DxLockETH,
    DxLockMGN,
    DxLockToken
  } = contracts

  const shortContracts = {
    MGN: DxLockMGN,
    ETH: DxLockETH,
    Token: DxLockToken,
    GEN: DxGENauction,
  }

  const short2idx = {
    ETH: 0,
    MGN: 1,
    Token: 2,
  }

  const unsafeToTx = async () => {
    const timing = await checkTiming(DxLockMGN)
    if (timing.error) {
      const { period, now, error } = timing
      console.warn(`
            Redeeming can be done only during redeeming period.
            Redeeming period: ${period};
            Now: ${now};
            ${error}
          `)
      return true
    }
  }

  switch (action) {
    case 'Quit':
      return false;
    case 'Reload accounts from saved file':
      {
        ///////////MGN
        let { unredeemedAccounts, newFromBlock } = await loadPreviousAccounts({
          ...options, address: DxLockMGN.address, CTR_NAME: 'MGN'
        })

        if (unredeemedAccounts.length) {
          console.log('MGN will operate on loaded unredeemed accounts');
          accounts.MGN = unredeemedAccounts
        }
        FromBlocks.MGN = newFromBlock || fromBlock;

        ///////////ETH
        ({ unredeemedAccounts, newFromBlock } = await loadPreviousAccounts({
          ...options, address: DxLockETH.address, CTR_NAME: 'ETH'
        }))

        if (unredeemedAccounts.length) {
          console.log('ETH will operate on loaded unredeemed accounts');
          accounts.ETH = unredeemedAccounts
        }
        FromBlocks.ETH = newFromBlock || fromBlock;

        ///////////Token
        ({ unredeemedAccounts, newFromBlock } = await loadPreviousAccounts({
          ...options, address: DxLockToken.address, CTR_NAME: 'Token'
        }))

        if (unredeemedAccounts.length) {
          console.log('Token will operate on loaded unredeemed accounts');
          accounts.Token = unredeemedAccounts
        }
        FromBlocks.Token = newFromBlock || fromBlock;

        ///////////GEN
        let unredeemedPairs;
        ({unredeemedPairs , newFromBlock } = await loadPreviousAccountsGEN({
          ...options, address: DxGENauction.address, CTR_NAME: 'GEN'
        }))

        if (unredeemedPairs.bidders.length) {
          console.log('GEN will operate on loaded unredeemed account-auctionId pairs');
          accounts.GEN = unredeemedPairs
        }
        FromBlocks.GEN = newFromBlock || fromBlock;
        console.log('FromBlocks: ', FromBlocks);
      }
      break;
    case 'Reload MGN accounts from saved file':
      {
        const { unredeemedAccounts, newFromBlock } = await loadPreviousAccounts({
          ...options, address: DxLockMGN.address, CTR_NAME: 'MGN'
        })

        if (unredeemedAccounts.length) {
          console.log('MGN will operate on loaded unclaimed accounts');
          accounts.MGN = unredeemedAccounts
        }
        FromBlocks.MGN = newFromBlock || fromBlock
      }
      break;
    case 'Reload ETH accounts from saved file':
      {
        const { unredeemedAccounts, newFromBlock } = await loadPreviousAccounts({
          ...options, address: DxLockETH.address, CTR_NAME: 'ETH'
        })

        if (unredeemedAccounts.length) {
          console.log('ETH will operate on loaded unclaimed accounts');
          accounts.ETH = unredeemedAccounts
        }
        FromBlocks.ETH = newFromBlock || fromBlock
      }
      break;
    case 'Reload Token accounts from saved file':
      {
        const { unredeemedAccounts, newFromBlock } = await loadPreviousAccounts({
          ...options, address: DxLockToken.address, CTR_NAME: 'Token'
        })

        if (unredeemedAccounts.length) {
          console.log('Token will operate on loaded unclaimed accounts');
          accounts.Token = unredeemedAccounts
        }
        FromBlocks.Token = newFromBlock || fromBlock
      }
      break;
    case 'Reload GEN account-auctionId pairs from saved file':
      {
        const { unredeemedPairs, newFromBlock } = await loadPreviousAccountsGEN({
          ...options, address: DxGENauction.address, CTR_NAME: 'GEN'
        })

        if (unredeemedPairs.bidders.length) {
          console.log('GEN will operate on loaded unclaimed accounts');
          accounts.GEN = unredeemedPairs
        }
        FromBlocks.GEN = newFromBlock || fromBlock
      }
      break;
    case 'Print current account selection for LockMgn4Rep':
      console.log('  ' + accounts.MGN.join('\n  '));
      console.log('accounts.length: ', accounts.MGN.length);
      break;
    case 'Print current account selection for LockEth4Rep':
      console.log('  ' + accounts.ETH.join('\n  '));
      console.log('accounts.length: ', accounts.ETH.length);
      break;
    case 'Print current account selection for LockWhitelisted4Rep':
      console.log('  ' + accounts.Token.join('\n  '));
      console.log('accounts.length: ', accounts.Token.length);
      break;
    case 'Print current account selection for BidGenAuction':
      {
        const undupedBidders = removeDuplicates(accounts.GEN.bidders)
        console.log('  ' + undupedBidders.join('\n  '));
        console.log('accounts.length: ', undupedBidders.length);
      }
      break;
    case 'Print current account-auctionId pairs selection for BidGenAuction':
      {
        const paired = accounts.GEN.bidders.map((bidder, i) => {
          return `${bidder} -- auction #${accounts.GEN.auctionIds[i]}`
        })
        console.log('  ' + paired.join('\n  '));
        console.log('account-auctionId pairs.length: ', paired.length);
      }
      break;
    case 'Gather new Lock MGN events (W)':
    case 'Gather new Lock ETH events (W)':
    case 'Gather new Lock Token events (W)':
      {
        const { CTR_NAME, EVENT_NAME } = whichContract(action)
        const CTR = shortContracts[CTR_NAME]

        const fromBlock = FromBlocks[CTR_NAME]
        console.log('fromBlock: ', fromBlock);

        const toBlock = await web3.eth.getBlockNumber()
        console.log('currentBlock: ', toBlock);
        if (fromBlock > toBlock) {
          console.log('Events already up to current block. Wait for a new one')
          return true
        }
        const events = await getPastEventsRx(CTR, EVENT_NAME, { fromBlock, toBlock })
        // console.log('events: ', events);

        const lockedSet = new Set(events.map(ev => ev.returnValues._locker))
        const newFetched = lockedSet.size

        const newLockedSet = new Set([...accounts[CTR_NAME],...lockedSet])
        
        accounts[CTR_NAME] = Array.from(newLockedSet)
        console.log('accounts: ', accounts[CTR_NAME]);
        console.log('new accounts fetched', newFetched);
        console.log('accounts.length: ', accounts[CTR_NAME].length, 'at block', toBlock);

        await writeFileReport({
          lable: 'Locked',
          fromBlock, toBlock,
          accounts: accounts[CTR_NAME]
        }, { ...options, CTR_NAME, address: CTR.address }
        )

        FromBlocks[CTR_NAME] = toBlock + 1
      }
      break;
    case 'Gather new Bid GEN events (W)':
      {
        const { CTR_NAME, EVENT_NAME } = whichContract(action)
        const CTR = shortContracts[CTR_NAME]

        const fromBlock = FromBlocks[CTR_NAME]
        console.log('fromBlock: ', fromBlock);

        
        const toBlock = await web3.eth.getBlockNumber()
        console.log('currentBlock: ', toBlock);
        if (fromBlock > toBlock) {
          console.log('Events already up to current block. Wait for a new one')
          return true
        }
        const events = await getPastEventsRx(CTR, EVENT_NAME, { fromBlock, toBlock })
        // console.log('events: ', events);


        const bidPairs = [
          events.map(ev => ev.returnValues._bidder),
          events.map(ev => ev.returnValues._auctionId),
        ]

        // const [bidders, auctionIds] = removePairedDuplicates(...bidPairs)

        const [bidders, auctionIds] = removePairedDuplicates(
          accounts[CTR_NAME].bidders.concat(bidPairs[0]),
          accounts[CTR_NAME].auctionIds.concat(bidPairs[1])
        )

        accounts[CTR_NAME].bidders = bidders
        accounts[CTR_NAME].auctionIds = auctionIds

        const undupedBidders = removeDuplicates(bidders)
        console.log('accounts: ', undupedBidders);
        console.log('new account-auctionId pairs fetched', bidPairs[0].length);
        console.log('account-auctionId pairs.length', bidders.length);
        console.log('accounts.length: ', undupedBidders.length, 'at block', toBlock);

        await writeFileReportGEN({
          lable: 'Bid',
          fromBlock, toBlock,
          accounts: accounts[CTR_NAME]
        }, { ...options, CTR_NAME, address: CTR.address }
        )

        FromBlocks[CTR_NAME] = toBlock + 1
      }
      break;

    case 'Filter out users that have been Redeemed for LockMgn4Rep (W)':
      {
        const currentBlock = await web3.eth.getBlockNumber()
        // after redeeming score == 0
        const { withScore, withoutScore } = await getScore(accounts.MGN, DxLockMGN, { ...options, web3: wa3 })
        console.log('withoutScore: ', withoutScore);

        const accsWithScore = Object.keys(withScore)

        reportNumbers({ accounts: accounts.MGN, notRedeemed: accsWithScore, redeemed: withoutScore })

        const haveNotRedeemedAlready = new Set(accsWithScore)
        accounts.MGN = accounts.MGN.filter(acc => haveNotRedeemedAlready.has(acc))

        await writeFileReport({
          lable: 'Redeemed',
          block: currentBlock,
          accounts: withoutScore
        },
          { ...options, address: DxLockMGN.address, CTR_NAME: 'MGN' }
        )
      }
      break;
    case 'Filter out users that have been Redeemed for LockEth4Rep (W)':
      {
        const currentBlock = await web3.eth.getBlockNumber()
        // after redeeming score == 0
        const { withScore, withoutScore } = await getScore(accounts.ETH, DxLockETH, { ...options, web3: wa3 })
        console.log('withoutScore: ', withoutScore);
        const accsWithScore = Object.keys(withScore)

        reportNumbers({ accounts: accounts.ETH, notRedeemed: accsWithScore, redeemed: withoutScore })

        const haveNotRedeemedAlready = new Set(accsWithScore)
        accounts.ETH = accounts.ETH.filter(acc => haveNotRedeemedAlready.has(acc))

        await writeFileReport({
          lable: 'Redeemed',
          block: currentBlock,
          accounts: withoutScore
        },
          { ...options, address: DxLockETH.address, CTR_NAME: 'ETH' }
        )
      }
      break;
    case 'Filter out users that have been Redeemed for LockWhitelisted4Rep (W)':
      {
        const currentBlock = await web3.eth.getBlockNumber()
        // after redeeming score == 0
        const { withScore, withoutScore } = await getScore(accounts.Token, DxLockToken, { ...options, web3: wa3 })
        console.log('withoutScore: ', withoutScore);
        const accsWithScore = Object.keys(withScore)

        reportNumbers({ accounts: accounts.Token, notRedeemed: accsWithScore, redeemed: withoutScore })

        const haveNotRedeemedAlready = new Set(accsWithScore)
        accounts.Token = accounts.Token.filter(acc => haveNotRedeemedAlready.has(acc))

        await writeFileReport({
          lable: 'Redeemed',
          block: currentBlock,
          accounts: withoutScore
        },
          { ...options, address: DxLockToken.address, CTR_NAME: 'Token' }
        )
      }
      break;
    case 'Filter out account-auctionId pairs that have been Redeemed for BidGenAuction (W)':
      {
        const currentBlock = await web3.eth.getBlockNumber()
        // after redeeming score == 0
        const { withBids, withoutBids } = await getScoreGEN(accounts.GEN, DxGENauction, { ...options, web3: wa3 })
        console.log('withoutBids: ', withoutBids);

        reportNumbers({ accounts: accounts.GEN.bidders, notRedeemedPairs: withBids.bidders, redeemedPairs: withoutBids.bidders })

        accounts.GEN = filterBidPairs({
          toFilter: accounts.GEN,
          filterAgainst: withoutBids,
        })

        await writeFileReportGEN({
          lable: 'Redeemed',
          block: currentBlock,
          accounts: withoutBids
        }, { ...options, address: DxGENauction.address, CTR_NAME: 'GEN' }
        )
      }
      break;
    case 'Filter out users redeeming would revert for LockMgn4Rep':
      {
        const { redeemable, unredeemable } = await getUnredeemableAccounts(accounts.MGN, DxLockMGN, { ...options, web3: wa3 })
        // console.log('redeemable: ', redeemable);

        reportNumbers({ accounts: accounts.MGN, redeemable, unredeemable })

        const redeemableSet = new Set(redeemable)
        accounts.MGN = accounts.MGN.filter(acc => redeemableSet.has(acc))
      }
      break;
    case 'Filter out users redeeming would revert for LockEth4Rep':
      {
        const { redeemable, unredeemable } = await getUnredeemableAccounts(accounts.ETH, DxLockETH, { ...options, web3: wa3 })
        // console.log('redeemable: ', redeemable);

        reportNumbers({ accounts: accounts.ETH, redeemable, unredeemable })

        const redeemableSet = new Set(redeemable)
        accounts.ETH = accounts.ETH.filter(acc => redeemableSet.has(acc))
      }
      break;
    case 'Filter out users redeeming would revert for LockWhitelisted4Rep':
      {
        const { redeemable, unredeemable } = await getUnredeemableAccounts(accounts.Token, DxLockToken, { ...options, web3: wa3 })
        // console.log('redeemable: ', redeemable);

        reportNumbers({ accounts: accounts.Token, redeemable, unredeemable })

        const redeemableSet = new Set(redeemable)
        accounts.Token = accounts.Token.filter(acc => redeemableSet.has(acc))
      }
      break;
    case 'Filter out account-auctionId pairs redeeming would revert for BidGenAuction':
      {
        const { redeemable, unredeemable } = await getUnredeemablePairsGEN(accounts.GEN, DxGENauction, { ...options, web3: wa3 })
        // console.log('redeemable: ', redeemable);

        reportNumbers({ accounts: accounts.GEN.bidders, redeemablePairs: redeemable.bidders, unredeemablePairs: unredeemable.bidders })

        accounts.GEN = filterBidPairs({
          toFilter: accounts.GEN,
          filterAgainst: unredeemable,
        })
      }
      break;
    case 'Dry run MGN redeeming':
      {
        const reputations = await redeemAllCall(accounts.MGN, short2idx.MGN, options)
        console.log('reputations: ', reputations.map(arrayBNtoNum));
      }
      break;
    case 'Dry run ETH redeeming':
      {
        const reputations = await redeemAllCall(accounts.ETH, short2idx.ETH, options)
        console.log('reputations: ', reputations.map(arrayBNtoNum));
      }
      break;
    case 'Dry run Token redeeming':
      {
        const reputations = await redeemAllCall(accounts.Token, short2idx.Token, options)
        console.log('reputations: ', reputations.map(arrayBNtoNum));
      }
      break;
    case 'Dry run GEN auction redeeming':
      {
        const reputations = await redeemAllCallGEN(accounts.GEN, options)
        console.log('reputations: ', reputations.map(arrayBNtoNum));
      }
      break;
    case 'Real MGN redeeming':
      {
        if (await unsafeToTx()) return true

        const receipts = await redeemAllSend(accounts.MGN, short2idx.MGN, options)
        console.log('receipts: ', receipts);
      }
      break;
    case 'Real ETH redeeming':
      {
        if (await unsafeToTx()) return true

        const receipts = await redeemAllSend(accounts.ETH, short2idx.ETH, options)
        console.log('receipts: ', receipts);
      }
      break;
    case 'Real Token redeeming':
      {
        if (await unsafeToTx()) return true

        const receipts = await redeemAllSend(accounts.Token, short2idx.Token, options)
        console.log('receipts: ', receipts);
      }
      break;
    case 'Real GEN auction redeeming':
      {
        if (await unsafeToTx()) return true

        const receipts = await redeemAllSendGEN(accounts.GEN, options)
        console.log('receipts: ', receipts);
      }
      break;
    case 'Refresh Time':
      return true;
    default:
      break;
  }

  if (action.includes('Print')) return true

  console.log('After current action');
  if (MGNchoices.includes(action)) reportNumbers({ accounts: accounts.MGN })
  else if (ETHchoices.includes(action)) reportNumbers({ accounts: accounts.ETH })
  else if (TokenChoices.includes(action)) reportNumbers({ accounts: accounts.Token })
  else if (GENchoices.includes(action)) {
    const unduped = removeDuplicates(accounts.GEN.bidders)
    reportNumbers({ accounts: unduped, 'account-auctionId_pairs': accounts.GEN.bidders })
  }

  console.log('\n');

  // continue?
  return true
}

async function redeemAllCall(accounts, mapIdx, { batchSize, maxConcurrent, contracts, master } = {}) {
  const { ClaimHelper } = contracts

  const trackBatch = makeBatchNumberTracker()

  const makeBatch = accsSlice => {
    // console.log('accsSlice: ', accsSlice.length);
    const { from, to } = trackBatch(accsSlice)
    const name = `${from}--${to} from ${accounts.length}`

    const execute = () => ClaimHelper.redeemAll.call(accsSlice, mapIdx, {
      from: master,
    })

    return { execute, name }
  }

  const processSlice = makeProcessSlice({
    makeBatch,
  })

  const postprocess = rxjsOps.toArray()

  const results = await streamline(accounts, {
    batchSize,
    maxConcurrent,
    processSlice,
    postprocess,
  })

  // console.log('results: ', results);
  return results
}
async function redeemAllSend(accounts, mapIdx, { batchSize, maxConcurrent, contracts, master } = {}) {
  const { ClaimHelper } = contracts

  const trackBatch = makeBatchNumberTracker()

  const makeBatch = accsSlice => {
    // console.log('accsSlice: ', accsSlice.length);
    const { from, to } = trackBatch(accsSlice)
    const name = `${from}--${to} from ${accounts.length}`

    const execute = () => ClaimHelper.redeemAll(accsSlice, mapIdx, {
      from: master,
    })

    return { execute, name }
  }

  const processSlice = makeProcessSlice({
    makeBatch,
  })

  const postprocess = rxjsOps.toArray()

  const results = await streamline(accounts, {
    batchSize,
    maxConcurrent,
    processSlice,
    postprocess,
  })

  // console.log('results: ', results);
  return results
}
async function redeemAllCallGEN({ bidders, auctionIds }, { batchSize, maxConcurrent, contracts, master } = {}) {
  const { ClaimHelper } = contracts

  const trackBatch = makeBatchNumberTracker()

  const makeBatch = pairsSlice => {
    // console.log('pairsSlice: ', pairsSlice.length);
    const { from, to } = trackBatch(pairsSlice)
    const name = `${from}--${to} from ${bidders.length}`

    const { biddersSlice, auctionIdsSlice } = pairsSlice.reduce((accum, [bidder, id]) => {
      accum.biddersSlice.push(bidder)
      accum.auctionIdsSlice.push(id)

      return accum
    }, { biddersSlice: [], auctionIdsSlice: [] })

    const execute = () => ClaimHelper.redeemAllGAR.call(biddersSlice, auctionIdsSlice, {
      from: master,
    })

    return { execute, name }
  }

  const processSlice = makeProcessSlice({
    makeBatch,
  })

  const postprocess = rxjsOps.toArray()

  const results = await streamline(rxjs.zip(rxjs.from(bidders), rxjs.from(auctionIds)), {
    batchSize,
    maxConcurrent,
    processSlice,
    postprocess,
  })

  // console.log('results: ', results);
  return results
}
async function redeemAllSendGEN({ bidders, auctionIds }, { batchSize, maxConcurrent, contracts, master } = {}) {
  const { ClaimHelper } = contracts

  const trackBatch = makeBatchNumberTracker()

  const makeBatch = pairsSlice => {
    // console.log('pairsSlice: ', pairsSlice.length);
    const { from, to } = trackBatch(pairsSlice)
    const name = `${from}--${to} from ${bidders.length}`

    const { biddersSlice, auctionIdsSlice } = pairsSlice.reduce((accum, [bidder, id]) => {
      accum.biddersSlice.push(bidder)
      accum.auctionIdsSlice.push(id)

      return accum
    }, { biddersSlice: [], auctionIdsSlice: [] })

    const execute = () => ClaimHelper.redeemAllGAR(biddersSlice, auctionIdsSlice, {
      from: master,
    })

    return { execute, name }
  }

  const processSlice = makeProcessSlice({
    makeBatch,
  })

  const postprocess = rxjsOps.toArray()

  const results = await streamline(rxjs.zip(rxjs.from(bidders), rxjs.from(auctionIds)), {
    batchSize,
    maxConcurrent,
    processSlice,
    postprocess,
  })

  // console.log('results: ', results);
  return results
}


async function getUnredeemableAccounts(accounts, contract, { web3, batchSize, maxConcurrent } = {}) {
  const trackBatch = makeBatchNumberTracker()

  const makeRequest = acc => web3.eth.call.request({
    from: acc,
    data: contract.contract.methods.redeem(acc).encodeABI(),
    to: contract.address
  }, () => { })

  const makeBatch = accsSlice => {
    const { from, to } = trackBatch(accsSlice)
    const name = `${from}--${to} from ${accounts.length}`

    const batch = new web3.BatchRequest()

    accsSlice.forEach(acc => batch.add(makeRequest(acc)))
    batch.name = name

    return batch
  }

  const processSlice = makeProcessSlice({
    makeBatch,
    timeout: 10000,
    retry: 15,
  })

  const BAD_BYTES = '0x08c379a000000000000000000000000000000000000000000000000000000000'

  const postprocess = rxjs.pipe(
    postprocessBatchRequest,
    rxjsOps.map(redeemResults => redeemResults.reduce((accum, redeemHex, i) => {
      // console.log('accs[i]: ', accounts[i]);
      // console.log('redeemHex: ', redeemHex);
      const { redeemable, unredeemable } = accum
      const redeemBytes32 = web3.eth.abi.decodeParameter('bytes32', redeemHex)
      if (redeemBytes32 !== BAD_BYTES) redeemable.push(accounts[i])
      else unredeemable.push(accounts[i])
      return accum
    }, { redeemable: [], unredeemable: [] }))
  )

  const { redeemable, unredeemable } = await streamline(accounts, {
    batchSize,
    maxConcurrent,
    processSlice,
    postprocess,
  })

  console.log(`${redeemable.length} accounts can be redeemed for`);

  console.log(`${unredeemable.length} accounts can not been redeemed for`);
  unredeemable.forEach((acc) => {
    console.log(acc);
  })

  return {
    unredeemable,
    redeemable,
  }
}

async function getUnredeemablePairsGEN({ bidders, auctionIds }, contract, { web3, batchSize, maxConcurrent } = {}) {
  const trackBatch = makeBatchNumberTracker()

  const makeRequest = (acc, id) => web3.eth.call.request({
    from: acc,
    data: contract.contract.methods.redeem(acc, id).encodeABI(),
    to: contract.address
  }, () => { })

  const makeBatch = (pairsSlice) => {
    const { from, to } = trackBatch(pairsSlice)
    const name = `${from}--${to} from ${bidders.length}`

    const batch = new web3.BatchRequest()

    pairsSlice.forEach(([acc, id]) => batch.add(makeRequest(acc, id)))
    batch.name = name

    return batch
  }

  const processSlice = makeProcessSlice({
    makeBatch,
    timeout: 10000,
    retry: 15,
  })

  const BAD_BYTES = '0x08c379a000000000000000000000000000000000000000000000000000000000'

  const postprocess = rxjs.pipe(
    postprocessBatchRequest,
    rxjsOps.map(redeemResults => redeemResults.reduce((accum, redeemHex, i) => {
      // console.log('accs[i]: ', accounts[i]);
      // console.log('redeemHex: ', redeemHex);
      const { redeemable, unredeemable } = accum
      const redeemBytes32 = web3.eth.abi.decodeParameter('bytes32', redeemHex)
      if (redeemBytes32 !== BAD_BYTES) {
        redeemable.bidders.push(bidders[i])
        redeemable.auctionIds.push(auctionIds[i])
      }
      else {
        unredeemable.bidders.push(bidders[i])
        unredeemable.auctionIds.push(auctionIds[i])
      }
      return accum
    }, { redeemable: { bidders: [], auctionIds: [] }, unredeemable: { bidders: [], auctionIds: [] } }))
  )

  const { redeemable, unredeemable } = await streamline(rxjs.zip(rxjs.from(bidders), rxjs.from(auctionIds)), {
    batchSize,
    maxConcurrent,
    processSlice,
    postprocess,
  })

  console.log(`${redeemable.bidders.length} accounts can be redeemed for`);

  console.log(`${unredeemable.bidders.length} accounts can not been redeemed for`);

  return {
    unredeemable,
    redeemable,
  }
}

async function getScore(accounts, contract, { web3, batchSize, maxConcurrent } = {}) {
  console.log('accounts.length: ', accounts.length);
  const trackBatch = makeBatchNumberTracker()

  const makeRequest = acc => web3.eth.call.request({
    from: acc,
    data: contract.contract.methods.scores(acc).encodeABI(),
    to: contract.address
  }, () => { })

  const makeBatch = accsSlice => {
    const { from, to } = trackBatch(accsSlice)
    console.log('accsSlice: ', accsSlice.length);
    const name = `${from}--${to} from ${accounts.length}`

    const batch = new web3.BatchRequest()

    accsSlice.forEach(acc => batch.add(makeRequest(acc)))
    batch.name = name

    return batch
  }

  const processSlice = makeProcessSlice({
    makeBatch,
    timeout: 10000,
    retry: 15,
  })

  const postprocess = rxjs.pipe(
    postprocessBatchRequest,
    rxjsOps.map(scores => scores.reduce((accum, scoreHex, i) => {
      // console.log('accs[i]: ', accs[i]);
      // console.log('scoreHex: ', scoreHex);
      const score = web3.eth.abi.decodeParameter('uint', scoreHex)
      // console.log('score: ', score);
      const { withScore, withoutScore } = accum
      if (!score.isZero()) withScore[accounts[i]] = score.toString()
      else withoutScore.push(accounts[i])
      return accum
    }, { withScore: {}, withoutScore: [] }))
  )

  const { withScore, withoutScore } = await streamline(accounts, {
    batchSize,
    maxConcurrent,
    processSlice,
    postprocess,
  })


  console.log(`${Object.keys(withScore).length} accounts with score`);
  console.log(`${withoutScore.length} accounts without score`);

  return { withScore, withoutScore }
}
async function getScoreGEN({ bidders, auctionIds }, contract, { web3, batchSize, maxConcurrent } = {}) {
  const trackBatch = makeBatchNumberTracker()

  const makeRequest = (acc, id) => web3.eth.call.request({
    from: acc,
    data: contract.contract.methods.getBid(acc, id).encodeABI(),
    to: contract.address
  }, () => { })

  const makeBatch = (pairsSlice) => {
    const { from, to } = trackBatch(pairsSlice)
    const name = `${from}--${to} from ${bidders.length}`

    const batch = new web3.BatchRequest()

    pairsSlice.forEach(([acc, id]) => batch.add(makeRequest(acc, id)))
    batch.name = name

    return batch
  }

  const processSlice = makeProcessSlice({
    makeBatch,
    timeout: 10000,
    retry: 15,
  })

  const postprocess = rxjs.pipe(
    postprocessBatchRequest,
    rxjsOps.map(bids => bids.reduce((accum, bidHex, i) => {
      // console.log('accs[i]: ', accs[i]);
      // console.log('bidHex: ', bidHex);
      const bid = web3.eth.abi.decodeParameter('uint', bidHex)
      // console.log('bid: ', bid);
      const { withBids, withoutBids } = accum
      if (!bid.isZero()) {
        withBids.bidders.push(bidders[i])
        withBids.auctionIds.push(auctionIds[i])
      }
      else {
        withoutBids.bidders.push(bidders[i])
        withoutBids.auctionIds.push(auctionIds[i])
      }
      return accum
    }, { withBids: { bidders: [], auctionIds: [] }, withoutBids: { bidders: [], auctionIds: [] } }))
  )

  const { withBids, withoutBids } = await streamline(rxjs.zip(rxjs.from(bidders), rxjs.from(auctionIds)), {
    batchSize,
    maxConcurrent,
    processSlice,
    postprocess,
  })


  console.log(`${withBids.bidders.length} pairs with score`);
  console.log(`${withoutBids.bidders.length} pairs without score`);

  return { withBids, withoutBids }
}

function reportNumbers({ accounts, ...rest }) {
  console.group(`Total accounts ${accounts.length}`);
  const entries = Object.entries(rest)
  if (entries.length) {
    console.log('Out of them:');
    Object.entries(rest).forEach(([k, v]) => {
      console.log(`${k}: ${v.length === undefined ? v.size : v.length}`);
    })
  }
  console.groupEnd()
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
  const period = `${redeemStartUTC} -->`
  const nowUTC = new Date(now * 1000).toUTCString()

  const res = {
    redeemStart: redeemStartUTC,
    period,
    now: nowUTC,
    error: null
  }

  const nowBN = toBN(now)

  if (redeemStart.gt(nowBN)) {
    res.error = 'Too early'
  }

  return res
}

async function getCurrentAuctionId(DxGenAuction) {
  const [auctionsStartTime, auctionPeriod, now] = (await Promise.all([
    DxGenAuction.auctionsStartTime.call(),
    DxGenAuction.auctionPeriod.call(),
    getTimestamp()
  ])).map(n => +n.toString())

  return Math.floor((now - auctionsStartTime) / auctionPeriod);
}

async function getTimesStr({
  DxGENauction,
  DxLockETH,
  DxLockMGN,
  DxLockToken
}) {
  const [
    mgnStart,
    mgnEnd,
    mgnRedeem,
    ethStart,
    ethEnd,
    ethRedeem,
    tokenStart,
    tokenEnd,
    tokenRedeem,
    auctionStart,
    auctionEnd,
    auctionRedeem,
    now,
  ] = (await Promise.all([
    DxLockMGN.lockingStartTime.call(),
    DxLockMGN.lockingEndTime.call(),
    DxLockMGN.redeemEnableTime.call(),
    DxLockETH.lockingStartTime.call(),
    DxLockETH.lockingEndTime.call(),
    DxLockETH.redeemEnableTime.call(),
    DxLockToken.lockingStartTime.call(),
    DxLockToken.lockingEndTime.call(),
    DxLockToken.redeemEnableTime.call(),
    DxGENauction.auctionsStartTime.call(),
    DxGENauction.auctionsEndTime.call(),
    DxGENauction.redeemEnableTime.call(),
    getTimestamp(),
  ])).map(d => new Date(d * 1000))

  const blockNumber = await getBlockNumber()

  let mgnPeriod
  if (now < mgnStart) mgnPeriod = 'REGISTERING'
  else if (now < mgnEnd) mgnPeriod = 'LOCKING'
  else if (now >= mgnRedeem) mgnPeriod = 'REDEEMING'
  else mgnPeriod = '?'

  let ethPeriod
  if (now < ethStart) ethPeriod = 'BEFORE'
  else if (now < ethEnd) ethPeriod = 'LOCKING'
  else if (now >= ethRedeem) ethPeriod = 'REDEEMING'
  else ethPeriod = '?'

  let tokenPeriod
  if (now < tokenStart) tokenPeriod = 'BEFORE'
  else if (now < tokenEnd) tokenPeriod = 'LOCKING'
  else if (now >= tokenRedeem) tokenPeriod = 'REDEEMING'
  else tokenPeriod = '?'

  let auctionPeriod
  if (now < auctionStart) auctionPeriod = 'BEFORE'
  else if (now < auctionEnd) auctionPeriod = 'ONGOING'
  else if (now >= auctionRedeem) auctionPeriod = 'REDEEMING'
  else auctionPeriod = '?'

  let auctionId
  if (auctionPeriod === 'ONGOING') {
    auctionId = await getCurrentAuctionId(DxGENauction);
  }

  return `
  Now: ${now.toUTCString()} \t current block: ${blockNumber}
  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  DxLockMGN:\t\t\t\t\t | DxLockETH:\t\t\t\t\t | DxLockToken:\t\t\t\t | DxGENauction:
  lock start: ${mgnStart.toUTCString()}\t | lock start: ${ethStart.toUTCString()}\t | lock start: ${tokenStart.toUTCString()}\t | auctions start: ${auctionStart.toUTCString()}
  lock end: ${mgnEnd.toUTCString()}\t | lock end: ${ethEnd.toUTCString()}\t | lock end: ${tokenEnd.toUTCString()}\t | auctions end: ${auctionEnd.toUTCString()}
  redeem: ${mgnRedeem.toUTCString()}\t\t | redeem: ${ethRedeem.toUTCString()}\t | redeem: ${tokenRedeem.toUTCString()}\t | redeem: ${auctionRedeem.toUTCString()}
  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  period: ${mgnPeriod}\t\t\t\t | period: ${ethPeriod}\t\t\t\t | period: ${tokenPeriod}\t\t\t\t | period: ${auctionPeriod}   ${auctionId !== undefined ? `auctionId: ${auctionId}` : ''}
  `
}

function arrayBNtoNum(arr) {
  if (!Array.isArray(arr)) return arr
  return arr.map(bn => bn.toString())
}

module.exports = cb => main().then(() => cb(), cb)
