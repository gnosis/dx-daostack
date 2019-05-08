const { toBN, getTimestamp } = require('./utils')(web3)
const batchExecute = require('./utils/batch')
const ZERO = toBN(0)

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
      type: 'string',
      default: 50,
      describe: 'Set batch size'
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

  const { dryRun, network, batchSize, fromBlock } = argv

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

  console.log(`
    Addresses
        MGN: ${mgnAddress}
        DxLockMgnForRep: ${dxLockMgnForRep.address}
        DxDaoClaimRedeemHelperArtifact: ${claimRedeemHelper.address}
  `)

  // Get all registered accounts
  const registeredAccounts = await getAllRegisteredAccounts({
    dxLockMgnForRep,
    fromBlock
  })

  if (!registeredAccounts.length) {
    console.log("\nThere's are no registered users. There's nothing to do")
    return
  }

  // Filter out the accounts that already claimed
  const {
    claimed: claimedAccounts,
    unclaimed: unclaimedAccounts
  } = await getClaimStatusByAccount({
    accounts: registeredAccounts,
    dxLockMgnForRep
  })

  console.log('    Claiming status')
  console.log(`        Total registered accounts: ${registeredAccounts.length}`)
  if (claimedAccounts.length) {
    console.log(`        ${claimedAccounts.length} accounts already claimed: ${claimedAccounts.join(', ')}`)
  } else {
    console.log('        No one has claimed yet')
  }

  if (unclaimedAccounts.length) {
    console.log(`        Unclaimed (${unclaimedAccounts.length}): ${unclaimedAccounts.join(', ')}`)
  } else {
    console.log('\nNo one needs to be claimed')
    return
  }

  // Get users with and with/without balance 
  const {
    withBalance: unclaimedAccountsWithBalance,
    withoutBalance: unclaimedAccountsWithoutBalance
  } = await getBalanceStatusByAccount({
    mgn,
    accounts: unclaimedAccounts
  })

  if (unclaimedAccountsWithoutBalance.length) {
    const accounts = unclaimedAccountsWithoutBalance.map(({ address }) => address)
    console.log(`        Accounts without MGN balance (${accounts.length}): ${accounts.join(', ')}`)
  }

  if (!unclaimedAccountsWithBalance.length) {
    console.log("\nAll the accounts are unclaimable, because they don't have MGN balance. Nothing to do")
    return
  }

  const timing = await checkTiming(dxLockMgnForRep)
  if (timing.error) {
    const { period, now, error } = timing
    throw new Error(`
    Claiming can be done only during claiming period.
    Claiming period: ${period};
    Now: ${now};
    ${error}
    `)
  }

  // Extract only addresses w/MGN locked balance into array
  let accountsToClaim = unclaimedAccountsWithBalance.map(({ address }) => address)

  // Filter out 
  // This is a Fix, not sure why it's needed. 
  // TODO: Review!
  accountsToClaim = await filterAccountsFix({
    accounts: accountsToClaim,
    dxLockMgnForRep
  })
  if (!accountsToClaim.length) {
    throw new Error(`No accounts are claimbale from the ${unclaimedAccountsWithBalance.length} unclaimed ones`)
  }

  if (dryRun) {
    console.warn(`
      ============================================================================
      
      DRY-RUN ENABLED - Call values returned, no actual blockchain state affected. 
      To actually change state, please run without [--dry-run false].

      ============================================================================
      `)

    // TODO: fix this
    // Workaround as failing bytes32[] call return doesn't properly throw and returns
    // consistent 'overflow' error(seems to be Truffle5 + Ethers.js issue)
    // 1 = dxLMR
    let bN = 0
    await batchExecute(
      accountsSlice => {
        console.log(`Batch ${bN + 1}-${bN + accountsSlice.length} from ${accountsToClaim.length}`)
        bN += accountsSlice.length - 1
        return claimRedeemHelper.claimAll.estimateGas(accountsSlice, 1)
      },
      { batchSize },
      accountsToClaim
    )
    console.log('\nPreparing claimAll call...')
    // 1 = dxLMR
    bN = 0
    const lockingIdsArray = await batchExecute(
      accountsSlice => {
        console.log(`Batch ${bN + 1}-${bN + accountsSlice.length} from ${accountsToClaim.length}`)
        bN += accountsSlice.length - 1
        return claimRedeemHelper.claimAll.call(accountsSlice, 1)
      },
      { batchSize },
      accountsToClaim
    )
    console.log('\nLocking IDs Array', JSON.stringify(lockingIdsArray, undefined, 2))
  } else {
    console.log('\nPreparing actual claimAll - this WILL affect blockchain state...')
    let bN = 0
    const claimAllReceipts = await batchExecute(
      accountsSlice => {
        console.log(`Batch ${bN + 1}-${bN + accountsSlice.length} from ${accountsToClaim.length}`)
        bN += accountsSlice.length - 1
        return claimRedeemHelper.claimAll(accountsSlice, 1)
      },
      { batchSize },
      accountsToClaim
    )
    console.log('ClaimAll Receipt(s)', claimAllReceipts)
  }

  console.log()
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
      console.warn(`[WARN] Discarding account ${account}`)
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

module.exports = cb => main().then(() => cb(), cb)
