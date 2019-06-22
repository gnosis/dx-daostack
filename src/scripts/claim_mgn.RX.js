/* global artifacts, web3 */

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

const network2URL = {
  mainnet: 'https://mainnet.infura.io/v3/9408f47dedf04716a03ef994182cf150',
  ropsten: 'https://ropsten.infura.io/v3/9408f47dedf04716a03ef994182cf150',
  rinkeby: 'https://rinkeby.infura.io/v3/9408f47dedf04716a03ef994182cf150',
  kovan: 'https://kovan.infura.io/v3/9408f47dedf04716a03ef994182cf150',
  development: 'http://localhost:8545'
};
const network2Id = {
  mainnet: 1,
  ropsten: 3,
  rinkeby: 4,
  kovan: 42
};

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

let AGREEMENT_HASH
let accounts = []
let From_Block = 0
let Original_From_Block = 0

const DxLockMgnForRepArtifact = artifacts.require('DxLockMgnForRep')
const DxDaoClaimRedeemHelperArtifact = artifacts.require('DxDaoClaimRedeemHelper')
const TokenMGN = artifacts.require('TokenFRT')

const getFname = ({ network, address }) => `./reports/MGN_LOCK#${address}@${network}.json`

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
  if (lable === 'Claimed') {
    newData = {
      block: data.block,
      accounts: concatDistinct(pastData.accounts, data.accounts),
    }
  } else if (lable === 'Registered') {
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

const DefaultJson = {
  Registered: {
    fromBlock: 0,
    toBlock: 0,
    accounts: [],
  },
  Claimed: {
    block: 0,
    accounts: [],
  }
}
async function loadPreviousAccounts(options) {
  const json = await readFileReport(options)
  // console.log('json: ', json);
  const { Registered = DefaultJson.Registered, Claimed = DefaultJson.Claimed } = json || {}

  console.group('Loaded previous accounts');
  console.log(`
  Registered:
    From block: ${Registered.fromBlock}
    To block: ${Registered.toBlock}
    Accounts: ${Registered.accounts.length}
  `);

  console.log(`
  Claimed:
    At block ${Claimed.block}
    Claimed: ${Claimed.accounts.length}
  `);

  console.groupEnd()

  const claimedSet = new Set(Claimed.accounts)

  const unclaimedAccounts = Registered.accounts.filter(acc => !claimedSet.has(acc))

  return {
    oldFromBlock: Registered.fromBlock,
    oldToBlock: Registered.toBlock,
    newFromBlock: Registered.toBlock && Registered.toBlock + 1,
    registeredAccounts: Registered.accounts,
    unclaimedAccounts,
    claimedAtBlock: Claimed.block,
    claimedAccounts: Claimed.accounts
  }
}

// artifacts and web3 are available globally
const main = async () => {

  /**
   * How best to run this for testing @ Rinkeby
   * 
   * Rinkeby:
   * [use flag --from-block 0]
   * 
   * yarn claim_mgn --network rinkeby --from-block 0
   */
  const argv = require('yargs')
    .usage('Usage: MNEMONIC="evil cat kills man ... " yarn claim_mgn --network [name] --dry-run --batch-size [number]')
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
    .option('lock-address', {
      type: 'string',
      alias: 'l',
      describe: 'Address for DxLockMgnForRep'
    })
    .option('helper-address', {
      type: 'string',
      alias: 'h',
      describe: 'Address for DxDaoClaimRedeemHelper'
    })
    .help('help')
    .argv

  if (!argv._[0]) return argv.showHelp()


  const { web3: wa3 } = createWeb3(argv)
  console.log('web3 version: ', web3.version);
  console.log('wa3 version: ', wa3.version);
  let { network, fromBlock, batchSize, maxConcurrent } = argv

  // const isDev = network === 'development'
  // const networkId = await web3.eth.net.getId()

  console.log(`
      Claim MGN data:
      
      ====================================================================
      Network: ${network}
      Batch size: ${batchSize}
      Max concurrent: ${maxConcurrent}
      Searching Events from block: ${fromBlock}
      ====================================================================
  `)

  // Get contracts and main data
  const dxLockMgnForRep = await (argv.l ? DxLockMgnForRepArtifact.at(argv.l) : DxLockMgnForRepArtifact.deployed())
  const mgnAddress = await dxLockMgnForRep.externalLockingContract.call()
  const claimRedeemHelper = await (argv.h ? DxDaoClaimRedeemHelperArtifact.at(argv.h) : DxDaoClaimRedeemHelperArtifact.deployed())
  const mgn = await TokenMGN.at(mgnAddress)
  // TODO: Get dates from dxLockMgnForRep contract

  mgn.name = 'Magnolia'
  mgn.symbol = 'MGN'
  mgn.decimals = 18

  const contracts = {
    DxLockMGN: dxLockMgnForRep,
    MGN: mgn,
    ClaimHelper: claimRedeemHelper,
  }

  AGREEMENT_HASH = await dxLockMgnForRep.getAgreementHash()

  console.log(`
    Addresses
        MGN: ${mgnAddress}
        DxLockMgnForRep: ${dxLockMgnForRep.address}
        DxDaoClaimRedeemHelperArtifact: ${claimRedeemHelper.address}
    AGREEMENT_HASH: ${AGREEMENT_HASH}
  `)

  const { unclaimedAccounts, newFromBlock, oldFromBlock } = await loadPreviousAccounts({ ...argv, address: dxLockMgnForRep.address })
  console.log('newFromBlock: ', newFromBlock);

  if (unclaimedAccounts.length) {
    console.log('Will operate on loaded unclaimed accounts');
    accounts = unclaimedAccounts
  }

  if (newFromBlock) {
    fromBlock = newFromBlock
  }

  console.log('fromBlock: ', fromBlock);
  if (!fromBlock) {
    console.log(`--from-block wasn't specified. Assuming the block DxLockMgnForRep was deployed at`);
    fromBlock = (await web3.eth.getTransaction(DxLockMgnForRepArtifact.transactionHash)).blockNumber
    console.log('fromBlock: ', fromBlock);
  }

  From_Block = Original_From_Block = fromBlock

  const choices = [
    'Print current account selection',
    'Gather new Register events (W)',
    new inquirer.Separator(),
    'Filter out users that have been claimed for (W)',
    'Filter out users that have no locked MGN balance available',
    'Filter out users claim would revert for',
    new inquirer.Separator(),
    'Dry run MGN claiming',
    'Real MGN claiming',
    new inquirer.Separator(),
    'Print accounts & locked MGN',
    'Print all accounts that have not been claimed for yet',
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

  const updateHeader = async (str = getTimesStr({ DxLockMgn: dxLockMgnForRep })) => {
    console.log(await str)
  }

  const [master] = await web3.eth.getAccounts()
  console.log('master: ', master);


  let cont, answ = {}
  do {
    await updateHeader()
    answ = await inquire(answ.action)
    cont = await act(answ.action, { network, web3, wa3, master, contracts, mgn, batchSize, maxConcurrent, oldFromBlock })
  } while (cont)
}

async function act(action, options) {
  const { web3, wa3, contracts, batchSize, maxConcurrent } = options
  const { DxLockMGN, MGN } = contracts
  switch (action) {
    case 'Quit':
      return false;
    case 'Reload accounts from saved file':
      {
        const { unclaimedAccounts } = await loadPreviousAccounts({ ...options, address: DxLockMGN.address })

        if (unclaimedAccounts.length) {
          console.log('Will operate on loaded unclaimed accounts');
          accounts = unclaimedAccounts
        }
      }
      break;
    case 'Print current account selection':
      console.log('  ' + accounts.join('\n  '));
      console.log('accounts.length: ', accounts.length);
      break;
    case 'Gather new Register events (W)':
      {
        const fromBlock = From_Block
        console.log('fromBlock: ', fromBlock);

        const toBlock = await web3.eth.getBlockNumber()
        console.log('currentBlock: ', toBlock);

        if (fromBlock > toBlock) {
          console.log('Events already up to current block. Wait for a new one')
          return true
        }

        const events = await getPastEventsRx(DxLockMGN, 'Register', { fromBlock, toBlock })
        // console.log('events: ', events);
        const registeredSet = new Set(events.map(ev => ev.returnValues._beneficiary))
        const newFetched = registeredSet.size

        const newLockedSet = new Set([...accounts,...registeredSet])
        
        accounts = Array.from(newLockedSet)

        // accounts.forEach(acc => registeredSet.add(acc))

        // accounts = Array.from(registeredSet)
        console.log('accounts: ', accounts);
        console.log('new accounts fetched', newFetched);
        console.log('accounts.length: ', accounts.length, 'at block', toBlock);

        await writeFileReport({ lable: 'Registered', fromBlock, toBlock, accounts }, { ...options, address: DxLockMGN.address })

        From_Block = toBlock + 1
      }
      break;
    case 'Filter out users claim would revert for':
      {
        const { claimable, unclaimable } = await getUnclaimableAccounts(accounts, { ...options, web3: wa3 })
        // console.log('claimable: ', claimable);

        reportNumbers({ accounts, claimable, unclaimable })

        const claimableSet = new Set(claimable)
        accounts = accounts.filter(acc => claimableSet.has(acc))
        // console.log('accounts: ', accounts);
      }
      break;
    case 'Filter out users that have been claimed for (W)':
      {
        const currentBlock = await web3.eth.getBlockNumber()

        const { notClaimed, claimed } = await getExternaLockersUsers(accounts, { ...options, web3: wa3 })
        console.log('notClaimed: ', notClaimed);

        reportNumbers({ accounts, claimed, notClaimed })

        const haveNotClaimedAlready = new Set(notClaimed)
        accounts = accounts.filter(acc => haveNotClaimedAlready.has(acc))

        await writeFileReport({ lable: 'Claimed', block: currentBlock, accounts: claimed }, { ...options, address: DxLockMGN.address })

        // console.log('accounts: ', accounts);
      }
      break;
    case 'Filter out users that have no locked MGN balance available':
      {
        const { withBalance, withoutBalance } = await getTokenBalances(
          [MGN],
          accounts,
          { web3: wa3, fname: 'lockedTokenBalances', batchSize, maxConcurrent }
        )
        const withBalanceArr = Object.keys(withBalance)
        console.log(`${withBalanceArr.length} accounts with locked MGN balances`)

        console.log(`${withoutBalance.length} accounts don't have locked MGN`)

        reportNumbers({ accounts, withLockedMGN: withBalanceArr, withoutLockedMGN: withoutBalance })

        const haveLockedMGNbalance = new Set(withBalanceArr)
        accounts = accounts.filter(acc => haveLockedMGNbalance.has(acc))
        // console.log('accounts: ', accounts);
      }
      break;
    case 'Dry run MGN claiming':
      {
        const lockingIds = await claimAllMGNCall(accounts, options)
        console.log('lockingIds: ', lockingIds);
      }
      break;
    case 'Real MGN claiming':
      {
        const timing = await checkTiming(DxLockMGN)
        if (timing.error) {
          const { period, now, error } = timing
          console.warn(`
            Claiming can be done only during claiming period.
            Claiming period: ${period};
            Now: ${now};
            ${error}
          `)
          return true
        }

        const receipts = await claimAllMGNSend(accounts, options)
        console.log('receipts: ', receipts);
      }
      break;
    case 'Print accounts & locked MGN':
      {
        const { withBalance, withoutBalance } = await getTokenBalances(
          [MGN],
          accounts,
          { web3: wa3, fname: 'lockedTokenBalances', batchSize, maxConcurrent }
        )

        if (Object.keys(withBalance).length === 0) {
          console.log('No account has locked MGN Tokens');
          break;
        }
        printNestedKV(withBalance, `${Object.keys(withBalance).length} accounts with locked MGN balances`)
        console.log(`${Object.keys(withBalance).length} accounts with locked MGN balances`)

        if (withoutBalance.length) {
          console.log(`${withoutBalance.length} accounts don't have locked MGN`)
          console.log('  ' + accounts.join('\n  '));
        }
      }
      break;
    case 'Print all accounts that have not been claimed for yet':
      {
        const fromBlock = Original_From_Block
        console.log('fromBlock: ', fromBlock);

        const toBlock = await web3.eth.getBlockNumber()
        console.log('currentBlock: ', toBlock);
        const events = await getPastEventsRx(DxLockMGN, 'Lock', { fromBlock, toBlock })
        console.log('events: ', events);

        const lockedSet = new Set(events.map(ev => ev.returnValues._locker))
        const accountsLeftUnclaimed = accounts.filter(acc => !lockedSet.has(acc))
        console.log('accountsLeftUnclaimed: ', accountsLeftUnclaimed);
        console.log('accountsLeftUnclaimed.length: ', accountsLeftUnclaimed.length);

        reportNumbers({ accounts, locked: lockedSet, leftUnclaimed: accountsLeftUnclaimed })
      }
      break;
    case 'Refresh Time':
      return true;
    default:
      break;
  }

  console.log('After current action');
  reportNumbers({ accounts })
  console.log('\n');

  // continue?
  return true
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

async function claimAllMGNCall(accounts, { batchSize, maxConcurrent, contracts, master } = {}) {
  const { ClaimHelper } = contracts

  const trackBatch = makeBatchNumberTracker()

  const makeBatch = accsSlice => {
    console.log('accsSlice: ', accsSlice.length);
    const { from, to } = trackBatch(accsSlice)
    const name = `${from}--${to} from ${accounts.length}`

    const execute = () => ClaimHelper.claimAll.call(accsSlice, 1, {
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

  console.log('results: ', results);
  return results
}

async function claimAllMGNSend(accounts, { batchSize, maxConcurrent, contracts, master } = {}) {
  const { ClaimHelper } = contracts

  const trackBatch = makeBatchNumberTracker()

  const makeBatch = accsSlice => {
    const { from, to } = trackBatch(accsSlice)
    const name = `${from}--${to} from ${accounts.length}`

    const execute = () => ClaimHelper.claimAll(accsSlice, 1, {
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

  return results
}

async function getUnclaimableAccounts(accounts, { web3, batchSize, maxConcurrent, contracts } = {}) {
  const { DxLockMGN } = contracts
  const trackBatch = makeBatchNumberTracker()

  const makeRequest = acc => web3.eth.call.request({
    from: acc,
    data: DxLockMGN.contract.methods.claim(acc, AGREEMENT_HASH).encodeABI(),
    to: DxLockMGN.address
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
    rxjsOps.map(claimResults => claimResults.reduce((accum, claimHex, i) => {
      // console.log('accs[i]: ', accounts[i]);
      // console.log('claimHex: ', claimHex);
      const { claimable, unclaimable } = accum
      const claimBytes32 = web3.eth.abi.decodeParameter('bytes32', claimHex)
      if (claimBytes32 !== BAD_BYTES) claimable.push(accounts[i])
      else unclaimable.push(accounts[i])
      return accum
    }, { claimable: [], unclaimable: [] }))
  )

  const { claimable, unclaimable } = await streamline(accounts, {
    batchSize,
    maxConcurrent,
    processSlice,
    postprocess,
  })

  console.log(`${claimable.length} accounts can be claimed for`);

  console.log(`${unclaimable.length} accounts can not been claimed for`);
  unclaimable.forEach((acc) => {
    console.log(acc);
  })

  return {
    unclaimable,
    claimable,
  }
}

async function getExternaLockersUsers(accounts, { web3, batchSize, maxConcurrent, contracts } = {}) {
  const { DxLockMGN } = contracts
  const trackBatch = makeBatchNumberTracker()

  const makeRequest = acc => web3.eth.call.request({
    from: acc,
    data: DxLockMGN.contract.methods.externalLockers(acc).encodeABI(),
    to: DxLockMGN.address
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

  const postprocess = rxjs.pipe(
    postprocessBatchRequest,
    rxjsOps.map(externalLockersBools => externalLockersBools.reduce((accum, externalLockersHex, i) => {
      console.log('accs[i]: ', accounts[i]);
      console.log('externalLockersHex: ', externalLockersHex);
      const externalLockersBool = web3.eth.abi.decodeParameter('bool', externalLockersHex)
      console.log('externalLockersBool: ', externalLockersBool);
      const { externalLockers, externalLockersFalse } = accum
      if (externalLockersBool) externalLockers.push(accounts[i])
      else externalLockersFalse.push(accounts[i])
      return accum
    }, { externalLockers: [], externalLockersFalse: [] }))
  )

  const { externalLockers, externalLockersFalse } = await streamline(accounts, {
    batchSize,
    maxConcurrent,
    processSlice,
    postprocess,
  })

  console.log(`${externalLockers.length} accounts have been claimed for`);

  console.log(`${externalLockersFalse.length} accounts have not been claimed for`);

  return {
    claimed: externalLockers,
    notClaimed: externalLockersFalse,
  }
}

async function getTokenBalances(tokens, accounts, { web3, fname = 'balanceOf', batchSize, maxConcurrent } = {}) {

  const trackBatch = makeBatchNumberTracker()

  const getBalanceReq = (token, acc) => {
    const data = token.contract.methods[fname](acc).encodeABI()
    const request = web3.eth.call.request({
      from: accounts[0],
      data,
      to: token.address
    }, () => { })
    return request
  }
  const makeBatch = accsSlice => {
    // console.log('accsSlice: ', accsSlice);
    const { from, to } = trackBatch(accsSlice)
    const batch = new web3.BatchRequest()
    batch.name = `${from}--${to} from ${accounts.length}`
    accsSlice.forEach(acc => {
      tokens.forEach(token => batch.add(getBalanceReq(token, acc)))
    })
    return batch
  }

  const postprocessBatchResponse = rxjs.pipe(
    rxjsOps.pluck('response'),
    rxjsOps.concatAll(),
    rxjsOps.bufferCount(tokens.length),
    rxjsOps.map(balanceBatch => balanceBatch.reduce((accum, bal, i) => {
      const balance = web3.eth.abi.decodeParameter('uint', bal)
      if (!balance.isZero()) {
        const token = tokens[i]
        accum[token.symbol] = balance.toString() / (10 ** token.decimals)
      }
      return accum
    }, {})),
    rxjsOps.toArray()
  )

  const processSlice = makeProcessSlice({
    makeBatch,
    postprocess: postprocessBatchResponse,
    timeout: 20000,
    retry: 15,
  })

  const postprocess = rxjs.pipe(
    rxjsOps.concatAll(),
    // rxjsOps.tap(console.log),
    rxjsOps.reduce((accum, bals, i) => {
      const account = accounts[i]
      if (Object.keys(bals).length) {
        accum.withBalance[account] = bals
      } else {
        accum.withoutBalance.push(account)
      }
      // console.log(`accounts[${i}]: `, accounts[i]);

      return accum
    }, { withBalance: {}, withoutBalance: [] }),
    // rxjsOps.tap(v => console.log('accounts:', Object.keys(v).length)),
  )

  const acc2bal = await streamline(accounts, {
    batchSize,
    maxConcurrent,
    processSlice,
    postprocess,
  })

  // console.log('acc2bal: ', acc2bal);
  return acc2bal
}

async function checkTiming(dxLockMgnForRep) {
  const [start, end, now] = await Promise.all([
    dxLockMgnForRep.lockingStartTime.call(),
    dxLockMgnForRep.lockingEndTime.call(),
    getTimestamp()
  ])

  const period = `${new Date(start * 1000).toUTCString()} -- ${new Date(end * 1000).toUTCString()}`
  const nowUTC = new Date(now * 1000).toUTCString()

  const res = {
    period,
    now: nowUTC,
    error: null
  }

  const nowBN = toBN(now)

  if (end.lte(nowBN)) {
    res.error = 'Too late'
  } else if (start.gt(nowBN)) {
    res.error = 'Too early'
  }

  return res
}

async function getTimesStr({
  DxLockMgn,
}) {
  const [
    mgnStart,
    mgnEnd,
    mgnRedeem,

    now,
  ] = (await Promise.all([
    DxLockMgn.lockingStartTime.call(),
    DxLockMgn.lockingEndTime.call(),
    DxLockMgn.redeemEnableTime.call(),
    getTimestamp(),
  ])).map(d => new Date(d * 1000))

  const blockNumber = await getBlockNumber()

  let mgnPeriod
  if (now < mgnStart) mgnPeriod = 'REGISTERING'
  else if (now < mgnEnd) mgnPeriod = 'LOCKING'
  else if (now >= mgnRedeem) mgnPeriod = 'REDEEMING'
  else mgnPeriod = '?'

  return `
  Now: ${now.toUTCString()} \t current block: ${blockNumber}
  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  DxLockMgn:
  lock start: ${mgnStart.toUTCString()}
  lock end: ${mgnEnd.toUTCString()}
  redeem: ${mgnRedeem.toUTCString()}
  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  period: ${mgnPeriod}
  `
}

const passThrough = v => v
function printKV(obj, label, { keytansform = passThrough, valTransform = passThrough } = {}) {
  if (!obj) return

  console.group(label)
  Object.entries(obj).forEach(([k, v]) => {
    // console.log(`${keytansform(k)}: ${valTransform(v)}`)
    let str = ''
    const key = keytansform(k, v) || ''
    str += key
    const val = valTransform(v, k) || ''
    str += val && `: ${val}`
    if (str) console.log(str);
  })
  console.groupEnd()
}

function printNestedKV(obj, label) {
  printKV(obj, label, {
    keytansform: () => void 0,
    valTransform: (v, k) => Object.keys(v).length && printKV(v, k),
  })
}

module.exports = cb => main().then(() => cb(), cb)
