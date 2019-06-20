/* global artifacts, web3 */

const inquirer = require('inquirer');
const {
  streamline,
  makeBatchNumberTracker,
  makeProcessSlice,
  postprocessBatchRequest,
  flattenArray,
} = require('./utils/rx')

const Web3 = require('web3')
const HDWalletProvider = require('truffle-hdwallet-provider')
const fs = require('fs-extra')

const rxjs = require('rxjs')
const rxjsOps = require('rxjs/operators')
const { toBN, getTimestamp, getBlockNumber, getPastEventsRx, getPastEventsBinary } = require('./utils')(web3)
const batchExecute = require('./utils/batch')
const ZERO = toBN(0)

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

const DxLockMgnForRepArtifact = artifacts.require('DxLockMgnForRep')
const DxDaoClaimRedeemHelperArtifact = artifacts.require('DxDaoClaimRedeemHelper')
const TokenMGN = artifacts.require('TokenFRT')

// artifacts and web3 are available globally
const main = async () => {

  /**
   * How best to run this for testing @ Rinkeby
   * 
   * Rinkeby:
   * [use flag --mock-mgn to use mocked ExternalLocking contract allowing testing w/LockedMGNBalance
   * [use flag -f 'networks-rinkeby-long-lock.json' for addresses]
   * [use flag --from-block 0]
   * 
   * Complete [ DRY-RUN ]: 
   *    yarn claim_mgn --network rinkeby -f 'networks-rinkeby-long-lock.json' --mock-mgn --from-block 0
   * Complete [ REAL-RUN ]: 
   *    yarn claim_mgn --network rinkeby -f 'networks-rinkeby-long-lock.json' --mock-mgn --from-block 0 --dry-run false
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

  // const { dryRun, network, batchSize, fromBlock } = argv

  const { web3: wa3 } = createWeb3(argv)
  console.log('web3 version: ', web3.version);
  console.log('wa3 version: ', wa3.version);
  let { network, fromBlock, useHelper, batchSize, maxConcurrent, dryRun } = argv

  // const isDev = network === 'development'
  const networkId = await web3.eth.net.getId()

  console.log(`
      Claim MGN data:
      
      ====================================================================
      Dry run: ${dryRun}
      Network: ${network}
      Batch size: ${batchSize}
      Searching Events from block: ${fromBlock}
      ====================================================================
  `)

  if (fromBlock === 0 || fromBlock < 7185000) {
    console.warn(`
      =================================================================================================================
      WARNING: You are checking for Register events from either Block 0 or from a block further back than 15 hours ago.
      Script may hang or fail unexpectedly on Mainnet as filter array length size is too large.

      Please explicitly set the [--from-block <number>] flag if necessary.
      =================================================================================================================
      `)
  }

  // Get contracts and main data
  const dxLockMgnForRep = await (argv.l ? DxLockMgnForRepArtifact.at(argv.l) : DxLockMgnForRepArtifact.deployed())
  const mgnAddress = await dxLockMgnForRep.externalLockingContract.call()
  const claimRedeemHelper = await (argv.h ? DxDaoClaimRedeemHelperArtifact.at(argv.h) : DxDaoClaimRedeemHelperArtifact.deployed())
  const mgn = await TokenMGN.at(mgnAddress)
  // TODO: Get dates from dxLockMgnForRep contract

  if (!fromBlock) fromBlock = (await web3.eth.getTransaction(DxLockMgnForRepArtifact.transactionHash)).blockNumber

  const contracts = {
    DxLockMGN: dxLockMgnForRep,
    MGN: dxLockMgnForRep,
    ClaimHelper: claimRedeemHelper,
  }

  AGREEMENT_HASH = await dxLockMgnForRep.getAgreementHash()

  console.log(`
    Addresses
        MGN: ${mgnAddress}
        DxLockMgnForRep: ${dxLockMgnForRep.address}
        DxDaoClaimRedeemHelperArtifact: ${claimRedeemHelper.address}
  `)

  const choices = [
    'Print current account selection',
    'Print available Register events',
    'Gather new Register events',
    'Filter users that have not been claimed for',
    'Filter users that have locked MGN balance available',
    'Filter users claim would revert for',
    'Dry run MGN claiming',
    'Real MGN claiming',
    'Print accounts & locked MGN',
    'Print registered accounts without locked MGN',
    'Print all accounts that have claimed/locked MGN',
    new inquirer.Separator(),
    'Refresh time',
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
    // console.log('answ: ', answ);
    cont = await act(answ.action, { web3, wa3, master, contracts, mgn, batchSize, maxConcurrent, fromBlock })
  } while (cont)

  // Get all registered accounts
//   const registeredAccounts = await getAllRegisteredAccounts({
//     dxLockMgnForRep,
//     fromBlock
//   })

//   if (!registeredAccounts.length) {
//     console.log("\nThere's are no registered users. There's nothing to do")
//     return
//   }

//   // Filter out the accounts that already claimed
//   const {
//     claimed: claimedAccounts,
//     unclaimed: unclaimedAccounts
//   } = await getClaimStatusByAccount({
//     accounts: registeredAccounts,
//     dxLockMgnForRep
//   })

//   console.log('    Claiming status')
//   console.log(`        Total registered accounts: ${registeredAccounts.length}`)
//   if (claimedAccounts.length) {
//     console.log(`        ${claimedAccounts.length} accounts already claimed: ${claimedAccounts.join(', ')}`)
//   } else {
//     console.log('        No one has claimed yet')
//   }

//   if (unclaimedAccounts.length) {
//     console.log(`        Unclaimed (${unclaimedAccounts.length}): ${unclaimedAccounts.join(', ')}`)
//   } else {
//     console.log('\nNo one needs to be claimed')
//     return
//   }

//   // Get users with and with/without balance 
//   const {
//     withBalance: unclaimedAccountsWithBalance,
//     withoutBalance: unclaimedAccountsWithoutBalance
//   } = await getBalanceStatusByAccount({
//     mgn,
//     accounts: unclaimedAccounts
//   })

//   if (unclaimedAccountsWithoutBalance.length) {
//     const accounts = unclaimedAccountsWithoutBalance.map(({ address }) => address)
//     console.log(`        Accounts without MGN balance (${accounts.length}): ${accounts.join(', ')}`)
//   }

//   if (!unclaimedAccountsWithBalance.length) {
//     console.log("\nAll the accounts are unclaimable, because they don't have MGN balance. Nothing to do")
//     return
//   }

//   const timing = await checkTiming(dxLockMgnForRep)
//   if (timing.error) {
//     const { period, now, error } = timing
//     throw new Error(`
//     Claiming can be done only during claiming period.
//     Claiming period: ${period};
//     Now: ${now};
//     ${error}
//     `)
//   }

//   // Extract only addresses w/MGN locked balance into array
//   let accountsToClaim = unclaimedAccountsWithBalance.map(({ address }) => address)

//   // Filter out 
//   // This is a Fix, not sure why it's needed. 
//   // TODO: Review!
//   accountsToClaim = await filterAccountsFix({
//     accounts: accountsToClaim,
//     dxLockMgnForRep
//   })
//   if (!accountsToClaim.length) {
//     throw new Error(`No accounts are claimbale from the ${unclaimedAccountsWithBalance.length} unclaimed ones`)
//   }

//   if (dryRun) {
//     console.warn(`
//       ============================================================================
      
//       DRY-RUN ENABLED - Call values returned, no actual blockchain state affected. 
//       To actually change state, please run without [--dry-run false].

//       ============================================================================
//       `)

//     // TODO: fix this
//     // Workaround as failing bytes32[] call return doesn't properly throw and returns
//     // consistent 'overflow' error(seems to be Truffle5 + Ethers.js issue)
//     // 1 = dxLMR
//     await batchExecute(
//       accountsSlice => {
//         return claimRedeemHelper.claimAll.estimateGas(accountsSlice, 1)
//       },
//       { batchSize, log: true },
//       accountsToClaim
//     )
//     console.log('\nPreparing claimAll call...')
//     // 1 = dxLMR
//     const lockingIdsArray = await batchExecute(
//       accountsSlice => {
//         return claimRedeemHelper.claimAll.call(accountsSlice, 1)
//       },
//       { batchSize, log: true },
//       accountsToClaim
//     )
//     console.log('\nLocking IDs Array', JSON.stringify(lockingIdsArray, undefined, 2))
//   } else {
//     console.log('\nPreparing actual claimAll - this WILL affect blockchain state...')
//     const claimAllReceipts = await batchExecute(
//       accountsSlice => {
//         return claimRedeemHelper.claimAll(accountsSlice, 1)
//       },
//       { batchSize, log: true },
//       accountsToClaim
//     )
//     console.log('ClaimAll Receipt(s)', claimAllReceipts)
//   }

//   console.log()
}

async function act(action, options) {
  const { web3, wa3, master, contracts, tokens, mgn, tvalue, gen, batchSize, maxConcurrent, fromBlock } = options
  const { DxLockMGN, ClaimHelper, MGN } = contracts
  switch (action) {
    case 'Quit':
      return false;
    case 'Print current account selection':
      console.log('  ' + accounts.join('\n  '));
      console.log('accounts.length: ', accounts.length);
      break;
    case 'Print available Register events':
      break;
    case 'Gather new Register events':
      {
        const toBlock = await web3.eth.getBlockNumber()
        console.log('currentBlock: ', toBlock);
        const events = await getPastEventsRx(DxLockMGN, 'Register', { fromBlock, toBlock })
        console.log('events: ', events);
        const registeredSet = new Set(events.map(ev => ev.returnValues._beneficiary))
        accounts = Array.from(registeredSet)
        console.log('accounts: ', accounts);
        console.log('accounts.length: ', accounts.length);
      }
      break;
    case 'Filter users claim would revert for':
      {
        const { claimable } = await getUnclaimableAccounts(accounts, { ...options, web3: wa3 })
        const claimableSet = new Set(claimable)
        accounts = accounts.filter(acc => claimableSet.has(acc))
        console.log('accounts: ', accounts);
      }
      break;
    case 'Filter users that have not been claimed for':
      {
        const { notClaimed } = await getExternaLockersUsers(accounts, { ...options, web3: wa3 })

        const haveNotClaimedAlready = new Set(notClaimed)
        accounts = accounts.filter(acc => haveNotClaimedAlready.has(acc))
        console.log('accounts: ', accounts);
      }
      break;
    case 'Filter users that have locked MGN balance available':
      {
        const { withBalance, withoutBalance } = await getTokenBalances([MGN], accounts, { web3: wa3, fname: 'lockedTokenBalances', batchSize, maxConcurrent })
        const withBalanceArr = Object.keys(withBalance)
        console.log(`${withBalanceArr.length} accounts with locked MGN balances`)

        console.log(`${withoutBalance.length} accounts don't have locked MGN`)

        const haveLockedMGNbalance = new Set(withBalanceArr)
        accounts = accounts.filter(acc => haveLockedMGNbalance.has(acc))
        console.log('accounts: ', accounts);
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
        const { withBalance, withoutBalance } = await getTokenBalances([MGN], accounts, { web3: wa3, fname: 'lockedTokenBalances', batchSize, maxConcurrent })
        // const { withBalance: acc2bals, withoutBalance } = await getTokenBalances([mgn], accs, { web3: wa3, fname: 'lockedTokenBalances', batchSize, maxConcurrent })



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
    case 'Print all accounts that have claimed/locked MGN':
      {
        const toBlock = await web3.eth.getBlockNumber()
        console.log('currentBlock: ', toBlock);
        const events = await getPastEventsRx(DxLockMGN, 'Lock', { fromBlock, toBlock })
        console.log('events: ', events);

        const lockedSet = new Set(events.map(ev => ev.returnValues._locker))
        const accountsLeftUnclaimed = accounts.filter(acc => !lockedSet.has(acc))
        console.log('accountsLeftUnclaimed: ', accountsLeftUnclaimed);
        console.log('accountsLeftUnclaimed.length: ', accountsLeftUnclaimed.length);
      }
      break;
    case 'Refresh Time':
      return true;
    default:
      break;
  }
  console.log('\n');

  // continue?
  return true
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

  console.log('results: ', results);
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

  const postprocess = rxjs.pipe(
    postprocessBatchRequest,
    rxjsOps.map(claimResults => claimResults.reduce((accum, claimHex, i) => {
      console.log('accs[i]: ', accounts[i]);
      console.log('claimHex: ', claimHex);
      const { claimable, unclaimable } = accum
      if (claimHex !== '0x08c379a000000000000000000000000000000000000000000000000000000000') claimable.push(accounts[i])
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

  console.log(`${claimable.length} accounts have been claimed for`);
  // accounts.forEach((acc, i) => {
  //   if (claimable[i]) console.log(acc);
  // })
  // console.log(`${claimable.length} accounts claimable`);
  console.log(`${unclaimable.length} accounts have not been claimed for`);
  unclaimable.forEach((acc) => {
    console.log(acc);
  })

  return {
    unclaimable,
    claimable,
  }


  // console.log('\n-------- TODO: Review and fix this -------------')
  // const agrHash = await dxLockMgnForRep.getAgreementHash()

  // // Below is required as Solidity loop function claimAll inside DxLockMgnForRepHelper.claimAll is NOT reverting when looping and
  // // calling individual DxLockMgnForRep.claim method on passed in beneficiary addresses
  // // Lines 268 - 277 filter out bad responses and leave claimable addresses to batch
  // const individualClaimCallReturn = await Promise.all(
  //   accounts.map(beneAddr => dxLockMgnForRep.claim.call(beneAddr, agrHash))
  // )
  // console.log('DxLockMgnForRep.claim on each acct call result: ', individualClaimCallReturn)
  // console.log('Filtering out 0x08c379a000000000000000000000000000000000000000000000000000000000 values...')

  // const accountsClaimable = individualClaimCallReturn.reduce((acc, account, index) => {
  //   if (account === '0x08c379a000000000000000000000000000000000000000000000000000000000') {
  //     console.warn(`[WARN] Discarding account ${accounts[index]}`)
  //     return acc
  //   }

  //   acc.push(accounts[index])
  //   return acc
  // }, [])
  // console.log('Final Filtered Values', accountsClaimable)
  // console.log('-------------------------\n')

  // return accountsClaimable
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
  // accounts.forEach((acc, i) => {
  //   if (externalLockers[i]) console.log(acc);
  // })
  // console.log(`${externalLockers.length} accounts externalLockers`);
  console.log(`${externalLockersFalse.length} accounts have not been claimed for`);

  return {
    claimed: externalLockersFalse,
    notClaimed: externalLockers,
  }
}

async function getTokenBalances(tokens, accounts, { web3, fname = 'balanceOf', batchSize, maxConcurrent } = {}) {

  const trackBatch = makeBatchNumberTracker()

  const getBalanceReq = (token, acc) => {
    const data = token.contract.methods[fname](acc).encodeABI()
    // const request = token.contract.methods[fname](acc).call.request(() => {})
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

  console.log('tokens.length: ', tokens.length);
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
    rxjsOps.tap(v => console.log('accounts:', Object.keys(v).length)),
  )

  const acc2bal = await streamline(accounts, {
    batchSize,
    maxConcurrent,
    processSlice,
    postprocess,
  })

  console.log('acc2bal: ', acc2bal);
  return acc2bal
}

async function getAllRegisteredAccounts({
  dxLockMgnForRep,
  fromBlock
}) {
  /**
   * allPastRegisterEvents
   * @summary Promise for all past Register events fromBlock flag or 7185000
   * @type { [] } - Array of Event objects
  */
  const { number: blockNumber } = await web3.eth.getBlock('latest')

  const events = await dxLockMgnForRep.getPastEvents('Register', { fromBlock })

  /**
   * allFromandBeneficiaries
   * @summary Array with OBJECT items { from: '0x...', beneficiary: '0x...' }
   * @type { string[] }
  */
  return events.map(({ returnValues }) => returnValues._beneficiary)
}

async function getClaimStatusByAccount({
  accounts,
  dxLockMgnForRep
}) {
  /* 
    VALIDATION - REMOVE UN-CLAIMABLE USER ADDRESSES
  */

  // Make sure that beneficiaries inside allBeneficiaries have NOT already claimed  
  const accountsClaimFlags = await Promise.all(
    accounts.map(account => dxLockMgnForRep.externalLockers.call(account))
  )
  const claimStatusByAccount = accounts.reduce((acc, account, idx) => {
    if (accountsClaimFlags[idx]) {
      acc.claimed.push(account)
    } else {
      acc.unclaimed.push(account)
    }

    return acc
  }, { claimed: [], unclaimed: [] })

  return claimStatusByAccount
}

async function getBalanceStatusByAccount({
  mgn,
  accounts
}) {
  // Get accounts' MGN locked balance (since there's no point in claiming 0 balance MGN...)
  const balances = await Promise.all(
    accounts.map(account => mgn.lockedTokenBalances.call(account))
  )

  const balanceStatusByAccount = accounts.reduce((acc, account, idx) => {
    const balance = balances[idx]
    const info = {
      address: account,
      balance
    }

    if (balance.gt(ZERO)) {
      acc.withBalance.push(info)
    } else {
      acc.withoutBalance.push(info)
    }

    return acc
  }, { withBalance: [], withoutBalance: [] })

  return balanceStatusByAccount
}

async function filterAccountsFix({
  accounts,
  dxLockMgnForRep
}) {
  console.log('\n-------- TODO: Review and fix this -------------')
  const agrHash = await dxLockMgnForRep.getAgreementHash()

  // Below is required as Solidity loop function claimAll inside DxLockMgnForRepHelper.claimAll is NOT reverting when looping and
  // calling individual DxLockMgnForRep.claim method on passed in beneficiary addresses
  // Lines 268 - 277 filter out bad responses and leave claimable addresses to batch
  const individualClaimCallReturn = await Promise.all(
    accounts.map(beneAddr => dxLockMgnForRep.claim.call(beneAddr, agrHash))
  )
  console.log('DxLockMgnForRep.claim on each acct call result: ', individualClaimCallReturn)
  console.log('Filtering out 0x08c379a000000000000000000000000000000000000000000000000000000000 values...')

  const accountsClaimable = individualClaimCallReturn.reduce((acc, account, index) => {
    if (account === '0x08c379a000000000000000000000000000000000000000000000000000000000') {
      console.warn(`[WARN] Discarding account ${accounts[index]}`)
      return acc
    }

    acc.push(accounts[index])
    return acc
  }, [])
  console.log('Final Filtered Values', accountsClaimable)
  console.log('-------------------------\n')

  return accountsClaimable
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
