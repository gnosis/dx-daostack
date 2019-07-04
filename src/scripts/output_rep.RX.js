/* global artifacts, web3 */

const DxLockMgnForRepArtifact = artifacts.require('DxLockMgnForRep')
const DxLockEth4RepArtifact = artifacts.require('DxLockEth4Rep')
const DxLockWhitelisted4RepArtifact = artifacts.require('DxLockWhitelisted4Rep')
const DxGenAuction4RepArtifact = artifacts.require('DxGenAuction4Rep')
const DxDaoClaimRedeemHelperArtifact = artifacts.require('DxDaoClaimRedeemHelper')
const DxReputation = artifacts.require('DxReputation')

const { Parser } = require('json2csv');

const inquirer = require('inquirer');

const Web3 = require('web3')
const HDWalletProvider = require('truffle-hdwallet-provider')
const fs = require('fs-extra')

const rxjs = require('rxjs')
const rxjsOps = require('rxjs/operators')
const { toBN, getTimestamp, getBlockNumber, getPastEventsRx } = require('./utils')(web3)

const BN_0 = web3.utils.toBN(0)

const { network2URL } = require('./utils/network2Url')

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
  GEN: [],
  TOTAL: [],
}
const totalREP = {
  MGN: BN_0,
  ETH: BN_0,
  Token: BN_0,
  GEN: BN_0,
  TOTAL: BN_0,
}
const unreleased = {
  ETH: [],
  Token: [],
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

// const getFname = ({ network, address, CTR_NAME }) => `./reports/REDEEMED_${CTR_NAME}#${address}@${network}.json`


const MGNchoices = [
  'Gather Redeem MGN events',
  'Gather claim data for Redeemed MGN users',
  'Print users and their MGN REP',
  'Output users and MGN REP to JSON (W)',
  'Output users and MGN REP to CSV (W)',
]

const ETHchoices = [
  'Gather Redeem ETH events',
  'Print users and their ETH REP',
  'Output users and ETH REP to JSON (W)',
  'Output users and ETH REP to CSV (W)',
  'Gather unreleased ETH locks',
  'Output unreleased ETH locks to JSON (W)',
  'Output unreleased ETH locks to CSV (W)',
]

const TokenChoices = [
  'Gather Redeem Token events',
  'Print users and their Token REP',
  'Output users and Token REP to JSON (W)',
  'Output users and Token REP to CSV (W)',
  'Gather unreleased Token locks',
  'Output unreleased Token locks to JSON (W)',
  'Output unreleased Token locks to CSV (W)',
]

const GENchoices = [
  'Gather Redeem GEN events',
  'Print users and their GEN REP',
  'Output users and GEN REP to JSON (W)',
  'Output users and GEN REP to CSV (W)',
]

const REPchoices = [
  'Concat all users and their total REP',
  'Check final REP and Total REP correctness against DxRep state',
  'Output users and REP with method to JSON (W)',
  'Output users and REP with method to CSV (W)',
  'Print all users and their total REP',
  'Output users and their total REP to JSON (W)',
  'Output users and their total REP to CSV (W)',
  'Output Total REP to JSON (W)',
  'Output Total REP to CSV (W)',
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
      default: 10,
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

    .help('help')
    .argv

  if (!argv._[0]) return argv.showHelp()

  let { network, batchSize, maxConcurrent, fromBlock } = argv

  const { web3: wa3 } = createWeb3(argv)
  console.log('web3 version: ', web3.version);
  console.log('wa3 version: ', wa3.version);

  console.log(`
    output_rep.js data:

    Network: ${network}
    Batch size: ${batchSize}
    Max concurrent: ${maxConcurrent}
    Searching Events from block: ${fromBlock}
  `)


  const [dxLMR, dxLER, dxLWR, dxGAR, dxHelper, dxREP] = await Promise.all([
    DxLockMgnForRepArtifact.deployed(),
    DxLockEth4RepArtifact.deployed(),
    DxLockWhitelisted4RepArtifact.deployed(),
    DxGenAuction4RepArtifact.deployed(),
    DxDaoClaimRedeemHelperArtifact.deployed(),
    DxReputation.deployed(),
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
    REP: dxREP,
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
    new inquirer.Separator('--------total-REP--------'),
    ...REPchoices,
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

  const updateHeader = async (str = getTimesStr(contracts)) => {
    console.log(await str)
  }

  const [master] = await web3.eth.getAccounts()
  console.log('master: ', master);

  // await act('Reload accounts from saved file', { network, web3, wa3, master, contracts, batchSize, maxConcurrent, fromBlock })

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

const whichContractRedeemEvent = str => {
  const [, EVENT_NAME, CTR_NAME] = /(Redeem)\s+(\w+)/.exec(str)
  return { EVENT_NAME, CTR_NAME }
}
const whichPrintREP = str => {
  const [, CTR_NAME] = /(\w+)\s+REP\b/.exec(str)
  return { CTR_NAME }
}

async function act(action, options) {
  const { web3, wa3, contracts, maxConcurrent } = options
  const {
    DxGENauction,
    DxLockETH,
    DxLockMGN,
    DxLockToken,
    REP,
  } = contracts

  const shortContracts = {
    MGN: DxLockMGN,
    ETH: DxLockETH,
    Token: DxLockToken,
    GEN: DxGENauction,
    REP,
  }

  switch (action) {
    case 'Quit':
      return false;
    case 'Gather Redeem MGN events':
    case 'Gather Redeem ETH events':
    case 'Gather Redeem Token events':
    case 'Gather Redeem GEN events':
      {
        const { CTR_NAME, EVENT_NAME } = whichContractRedeemEvent(action)
        const CTR = shortContracts[CTR_NAME]

        const fromBlock = FromBlocks[CTR_NAME]
        console.log('fromBlock: ', fromBlock);

        const toBlock = await web3.eth.getBlockNumber()
        console.log('currentBlock: ', toBlock);

        const events = await getPastEventsRx(CTR, EVENT_NAME, { fromBlock, toBlock })
        // console.log('events[0]: ', events[0]);

        const accNrep = await rxjs.from(events).pipe(

          rxjsOps.map(({ args, transactionHash }) => ({ account: args._beneficiary, REP: args._amount, tx: transactionHash, method: CTR_NAME })),
          rxjsOps.mergeMap(async ({ tx, ...rest }) => {
            const { from } = await rxjs.defer(() => wa3.eth.getTransaction(tx)).pipe(
              rxjsOps.timeout(5000),
              rxjsOps.tap(null, (e) => console.log('Error', e.message)),
              rxjsOps.retry(10)
            ).toPromise()

            return {
              ...rest,
              redeemedBy: from,
              redeemedByThemselves: from.toLowerCase() === rest.account.toLowerCase(),
            }
          }, Math.max(maxConcurrent, 30)),
          // rxjsOps.tap(console.log),
          rxjsOps.groupBy(p => p.account),
          rxjsOps.mergeMap(group => group.pipe(
            // rxjsOps.tap(console.log),
            rxjsOps.reduce((accum, cur) => {
              accum.redeemedBy.push(cur.redeemedBy)
              accum.redeemedByThemselves.push(cur.redeemedByThemselves)

              accum.method = cur.method
              accum.REP = accum.REP.add(cur.REP)
              return accum
            }, { account: group.key, REP: BN_0, redeemedBy: [], redeemedByThemselves: [] })
          )),
          rxjsOps.map(p => {
            const redeemedBy = new Set(p.redeemedBy).size === 1 ? p.redeemedBy[0] : p.redeemedBy
            const redeemedByThemselves = new Set(p.redeemedByThemselves).size === 1 ? p.redeemedByThemselves[0] : p.redeemedByThemselves

            return { ...p, redeemedBy, redeemedByThemselves }
          }),
          // rxjsOps.tap(console.log),
          rxjsOps.toArray()
        ).toPromise()
        console.log('accNrep', accNrep);

        const total = accNrep.reduce((sum, curr) => sum.add(curr.REP), BN_0)
        accNrep.forEach(p => {
          p.percentOfMethod = p.REP * 100 / total
        })

        accounts[CTR_NAME] = accNrep
        totalREP[CTR_NAME] = total
        console.log(accNrep.length, 'Redeem event instances for', CTR_NAME)
        console.log('Total REP from', CTR_NAME, 'method:', total.toString() / 1e18)
      }
      break;
    case 'Gather claim data for Redeemed MGN users':
      {
        const fromBlock = FromBlocks.MGN
        console.log('fromBlock: ', fromBlock);

        const toBlock = await web3.eth.getBlockNumber()
        console.log('currentBlock: ', toBlock);

        const events = await getPastEventsRx(DxLockMGN, 'Lock', { fromBlock, toBlock })
        // console.log('events[0]', events[0]);

        const acc2claim = await rxjs.from(events).pipe(

          rxjsOps.map(({ args, transactionHash }) => ({ account: args._locker, lockedMGN: args._amount, tx: transactionHash })),
          rxjsOps.mergeMap(async ({ tx, ...rest }) => {
            const { from } = await rxjs.defer(() => wa3.eth.getTransaction(tx)).pipe(
              rxjsOps.timeout(5000),
              rxjsOps.tap(null, (e) => console.log('Error', e.message)),
              rxjsOps.retry(10)
            ).toPromise()

            return {
              ...rest,
              claimedBy: from,
              claimedByThemselves: from.toLowerCase() === rest.account.toLowerCase(),
            }
          }, Math.max(maxConcurrent, 30)),
          // rxjsOps.tap(console.log),
          rxjsOps.groupBy(p => p.account),
          rxjsOps.mergeMap(group => group.pipe(
            // rxjsOps.tap(console.log),
            rxjsOps.reduce((accum, cur) => {
              accum.claimedBy.push(cur.claimedBy)
              accum.claimedByThemselves.push(cur.claimedByThemselves)
              accum.lockedMGN = accum.lockedMGN.add(cur.lockedMGN)

              return accum
            }, { account: group.key, lockedMGN: BN_0, claimedBy: [], claimedByThemselves: [] })
          )),
          rxjsOps.map(p => {
            const claimedBy = new Set(p.claimedBy).size === 1 ? p.claimedBy[0] : p.claimedBy
            const claimedByThemselves = new Set(p.claimedByThemselves).size === 1 ? p.claimedByThemselves[0] : p.claimedByThemselves

            return { ...p, claimedBy, claimedByThemselves }
          }),
          rxjsOps.reduce((accum, p) => {
            accum[p.account] = p
            return accum
          }, {}),
          // rxjsOps.tap(console.log),
        ).toPromise()
        console.log('acc2claim', acc2claim);
        console.log('Total Claim accounts fetched', Object.keys(acc2claim).length);

        accounts.MGN.forEach(p => {
          const claimData = acc2claim[p.account]
          if (claimData) {
            Object.assign(p, claimData)
          }
        })
      }
      break;
    case 'Print users and their MGN REP':
    case 'Print users and their ETH REP':
    case 'Print users and their Token REP':
    case 'Print users and their GEN REP':
      {
        const { CTR_NAME } = whichPrintREP(action)
        printUser2Rep(CTR_NAME, accounts[CTR_NAME])
        console.log('Total REP from', CTR_NAME, 'method:', totalREP[CTR_NAME].toString() / 1e18)
      }
      break;
    case 'Print all users and their total REP':
      {
        printUser2Rep('Total', accounts.TOTAL)
        console.log('totalREP', totalREP.TOTAL.toString() / 1e18);
      }
      break;
    case 'Concat all users and their total REP':
      {
        const allUserNrep = [].concat(accounts.MGN, accounts.ETH, accounts.Token, accounts.GEN)
        const accNrepTotal = await rxjs.from(allUserNrep).pipe(
          rxjsOps.groupBy(p => p.account),
          rxjsOps.mergeMap(group => group.pipe(
            rxjsOps.reduce((accum, cur) => {
              accum.REP = accum.REP.add(cur.REP)
              return accum
            }, { account: group.key, REP: BN_0 })
          )),
          rxjsOps.toArray()
        ).toPromise()

        console.log('accNrepTotal', accNrepTotal);

        const total = accNrepTotal.reduce((sum, curr) => sum.add(curr.REP), BN_0)
        accNrepTotal.forEach(p => {
          p.percentOfTotal = p.REP * 100 / total
        })

        accounts.TOTAL = accNrepTotal
        totalREP.TOTAL = total

        console.log(allUserNrep.length, 'Redeem event instances total')
        console.log(accNrepTotal.length, 'users had REP Redeemed for')
        console.log('Total REP from:', total.toString() / 1e18)
      }
      break;
    case 'Check final REP and Total REP correctness against DxRep state':
      {
        if (accounts.TOTAL.length && !totalREP.TOTAL.isZero()) {
          console.group('TOTAL REP')
          console.log('totalREP.TOTAL', totalREP.TOTAL.toString() / 1e18);
          const totalSupply = await REP.totalSupply()
          console.log('REP.totalSupply', totalSupply.toString() / 1e18);
          console.log('Equals', totalSupply.eq(totalREP.TOTAL))

          const wrongREPs = await rxjs.from(accounts.TOTAL).pipe(
            rxjsOps.mergeMap(async p => {
              const balance = await rxjs.defer(() => REP.balanceOf(p.account)).pipe(
                rxjsOps.timeout(7000),
                rxjsOps.tap(null, (e) => console.log('Error', e.message)),
                rxjsOps.retry(10)
              ).toPromise()
              const equals = balance.eq(p.REP)

              return {
                account: p.account,
                REP: p.REP,
                REP_FROM_CHAIN: balance,
                equals,
              }
            }, maxConcurrent),
            rxjsOps.filter(p => !p.equals),
            rxjsOps.toArray()
          ).toPromise()

          if (wrongREPs.length === 0) {
            console.log('All REP calculated correctly')
          } else {
            console.log('Incorrect REP for:')
            console.log('account\t\tREP\t\tREP_FROM_CHAIN')
            wrongREPs.forEach(({ account, REP, REP_FROM_CHAIN }) => {
              console.log(account, REP.toString() / 1e18, REP_FROM_CHAIN.toString() / 1e18)
            })
          }

          console.groupEnd()
        } else {
          console.log(`
            Make sure you gather all events and concatenate them first
          `)
        }
      }
      break;
    case 'Output users and MGN REP to JSON (W)':
    case 'Output users and ETH REP to JSON (W)':
    case 'Output users and Token REP to JSON (W)':
    case 'Output users and GEN REP to JSON (W)':
      {
        const { CTR_NAME } = whichPrintREP(action)
        const output = accounts[CTR_NAME].map(p => {
          const newP = {
            ...p,
            REP: p.REP.toString() / 1e18
          }
          if (CTR_NAME === 'MGN' && p.lockedMGN) {
            newP.lockedMGN = p.lockedMGN.toString() / 1e18
          }
          return newP
        })

        await fs.outputJSON('./Total_rep' + CTR_NAME + '.json', output, { spaces: 2 })
      }
      break;
    case 'Output users and MGN REP to CSV (W)':
    case 'Output users and ETH REP to CSV (W)':
    case 'Output users and Token REP to CSV (W)':
    case 'Output users and GEN REP to CSV (W)':
      {
        const { CTR_NAME } = whichPrintREP(action)
        const fields = ['account', 'method', 'REP', 'percentOfMethod', 'redeemedBy', 'redeemedByThemselves'];
        if (CTR_NAME === 'MGN') fields.push('lockedMGN', 'claimedBy', 'claimedByThemselves')

        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(accounts[CTR_NAME].map(p => ({
          ...p,
          REP: p.REP.toString() / 1e18,
          lockedMGN: p.lockedMGN && p.lockedMGN.toString() / 1e18,
        })));
        console.log('csv', csv);
        await fs.outputFile('./Total_rep' + CTR_NAME + '.csv', csv)
      }
      break;
    case 'Output users and their total REP to JSON (W)':
      {
        const output = accounts.TOTAL.map(p => ({
          ...p,
          REP: p.REP.toString() / 1e18
        }))
        await fs.outputJSON('./Total_rep.TOTAL.json', output, { spaces: 2 })
      }
      break;
    case 'Output users and their total REP to CSV (W)':
      {
        const fields = ['account', 'REP', 'percentOfTotal'];


        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(accounts.TOTAL.map(p => ({
          ...p,
          REP: p.REP.toString() / 1e18
        })));
        console.log('csv', csv);
        await fs.outputFile('./Total_rep.TOTAL.csv', csv)
      }
      break;
    case 'Output users and REP with method to JSON (W)':
      {
        const allUserNrep = [].concat(accounts.MGN, accounts.ETH, accounts.Token, accounts.GEN)

        const output = allUserNrep.map(p => ({
          ...p,
          REP: p.REP.toString() / 1e18
        }))

        await fs.outputJSON('./Total_rep.METHODS.json', output, { spaces: 2 })
      }
      break;
    case 'Output users and REP with method to CSV (W)':
      {
        const allUserNrep = [].concat(accounts.MGN, accounts.ETH, accounts.Token, accounts.GEN)
        const fields = ['account', 'method', 'REP', 'percentOfMethod', 'redeemedBy', 'redeemedByThemselves'];


        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(allUserNrep.map(p => ({
          ...p,
          REP: p.REP.toString() / 1e18
        })));
        console.log('csv', csv);
        await fs.outputFile('./Total_rep.METHODS.csv', csv)
      }
      break;
    case 'Output Total REP to JSON (W)':
      {
        const json = Object.entries(totalREP).reduce((accum, [key, val]) => {
          accum[key] = val.toString() / 1e18
          return accum
        }, {})

        console.log('json', json);
        await fs.outputJSON('./Total_rep.NUM.json', json, { spaces: 2 })
      }
      break;
    case 'Output Total REP to CSV (W)':
      {
        const fields = Object.keys(totalREP)

        const json2csvParser = new Parser({ fields });
        const json = Object.entries(totalREP).reduce((accum, [key, val]) => {
          accum[key] = val.toString() / 1e18
          return accum
        }, {})

        const csv = json2csvParser.parse(json);
        console.log('csv', csv);
        await fs.outputFile('./Total_rep.NUM.csv', csv)
      }
      break;
    case 'Refresh Time':
      return true;
    case 'Gather unreleased ETH locks':
      {
        const fromBlock = FromBlocks.MGN
        console.log('fromBlock: ', fromBlock);

        const toBlock = await web3.eth.getBlockNumber()
        console.log('currentBlock: ', toBlock);

        const events = await getPastEventsRx(DxLockETH, 'Lock', { fromBlock, toBlock })
        // console.log('events[0]', events[0]);

        const unreleasedBulk = await rxjs.from(events).pipe(

          rxjsOps.map(({ returnValues }) => ({ account: returnValues._locker, lockingId: returnValues._lockingId, amount: returnValues._amount })),
          rxjsOps.mergeMap(async (p) => {
            const { account, lockingId } = p
            const releaseTime = await rxjs.defer(() => DxLockETH.lockers(account, lockingId)).pipe(
              rxjsOps.timeout(5000),
              rxjsOps.tap(null, (e) => console.log('Error', e.message)),
              rxjsOps.retry(10),
              rxjsOps.filter(({ amount }) => !amount.isZero()),
              rxjsOps.map(({ releaseTime }) => new Date(releaseTime.toString() * 1000)),
            ).toPromise()

            return {
              ...p,
              releaseTime,
            }
          }, Math.max(maxConcurrent, 30)),
          rxjsOps.filter(({ releaseTime }) => !!releaseTime),
          // rxjsOps.tap(console.log),
          rxjsOps.toArray(),
        ).toPromise()
        console.log('unreleased', unreleasedBulk);

        console.log('Total Lock events', events.length)
        console.log('Unreleased', unreleasedBulk.length)

        unreleased.ETH = unreleasedBulk
      }
      break;
    case 'Gather unreleased Token locks':
      {
        const fromBlock = FromBlocks.MGN
        console.log('fromBlock: ', fromBlock);

        const toBlock = await web3.eth.getBlockNumber()
        console.log('currentBlock: ', toBlock);

        const events = await getPastEventsRx(DxLockToken, 'Lock', { fromBlock, toBlock })
        // console.log('events[0]', events[0]);

        const unreleasedBulk = await rxjs.from(events).pipe(

          rxjsOps.map(({ returnValues }) => ({ account: returnValues._locker, lockingId: returnValues._lockingId, amount: returnValues._amount })),
          rxjsOps.mergeMap(async (p) => {
            const { account, lockingId } = p
            const releaseTime = await rxjs.defer(() => DxLockToken.lockers(account, lockingId)).pipe(
              rxjsOps.timeout(5000),
              rxjsOps.tap(null, (e) => console.log('Error', e.message)),
              rxjsOps.retry(10),
              rxjsOps.filter(({ amount }) => !amount.isZero()),
              rxjsOps.map(({ releaseTime }) => new Date(releaseTime.toString() * 1000)),
            ).toPromise()

            const token = await rxjs.defer(() => DxLockToken.lockedTokens(lockingId)).pipe(
              rxjsOps.timeout(5000),
              rxjsOps.tap(null, (e) => console.log('Error', e.message)),
              rxjsOps.retry(10),
            ).toPromise()

            return {
              ...p,
              releaseTime,
              token,
            }
          }, Math.max(maxConcurrent, 30)),
          rxjsOps.filter(({ releaseTime }) => !!releaseTime),
          // rxjsOps.tap(console.log),
          rxjsOps.toArray(),
        ).toPromise()

        const tokenAddresses = Array.from(new Set(unreleasedBulk.map(p => p.token)))

        const token2Info = await rxjs.from(tokenAddresses).pipe(
          rxjsOps.mergeMap(async address => {
            const info = await rxjs.defer(() => getTokenInfo(address)).pipe(
              rxjsOps.timeout(5000),
              rxjsOps.tap(null, (e) => console.log('Error', e.message)),
              rxjsOps.retry(10),
            ).toPromise()

            return { address, ...info }
          }, Math.max(maxConcurrent, 30)),
          rxjsOps.reduce((accum, token) => {
            accum[token.address] = token
            return accum
          }, {})
        ).toPromise()

        // console.log('token2Info', token2Info);

        unreleasedBulk.forEach(p => {
          const {symbol, decimals} = token2Info[p.token]
          p.symbol = symbol
          p.amount = p.amount / (10 ** decimals)
        })

        console.log('unreleased', unreleasedBulk);

        console.log('Total Lock events', events.length)
        console.log('Unreleased', unreleasedBulk.length)

        unreleased.Token = unreleasedBulk
      }
      break;
    case 'Output unreleased ETH locks to JSON (W)':
      {
        const json = unreleased.ETH.map(p => ({
          ...p,
          amount: web3.utils.fromWei(p.amount),
          releaseTime: p.releaseTime.toUTCString(),
        }))

        console.log('json', json);
        await fs.outputJSON('./Unreleased.ETH.json', json, { spaces: 2 })
      }
      break;
    case 'Output unreleased ETH locks to CSV (W)':
      {
        const fields = Object.keys(unreleased.ETH[0] || {})

        const json2csvParser = new Parser({ fields });
        const json = unreleased.ETH.map(p => ({
          ...p,
          amount: web3.utils.fromWei(p.amount),
          releaseTime: p.releaseTime.toUTCString(),
        }))

        const csv = json2csvParser.parse(json);
        console.log('csv', csv);
        await fs.outputFile('./Unreleased.ETH.csv', csv)
      }
      break;
    case 'Output unreleased Token locks to JSON (W)':
      {
        const json = unreleased.Token.map(p => ({
          ...p,
          releaseTime: p.releaseTime.toUTCString(),
        }))

        console.log('json', json);
        await fs.outputJSON('./Unreleased.Token.json', json, { spaces: 2 })
      }
      break;
    case 'Output unreleased Token locks to CSV (W)':
      {
        const fields = Object.keys(unreleased.Token[0] || {})

        const json2csvParser = new Parser({ fields });
        const json = unreleased.Token.map(p => ({
          ...p,
          releaseTime: p.releaseTime.toUTCString(),
        }))

        const csv = json2csvParser.parse(json);
        console.log('csv', csv);
        await fs.outputFile('./Unreleased.Token.csv', csv)
      }
      break;
    default:
      break;
  }

  if (!action.includes('Gather') && !action.includes('Reload')) return true

  // console.log('After current action');
  // if (MGNchoices.includes(action)) reportNumbers({ accounts: accounts.MGN })
  // else if (ETHchoices.includes(action)) reportNumbers({ accounts: accounts.ETH })
  // else if (TokenChoices.includes(action)) reportNumbers({ accounts: accounts.Token })
  // else if (GENchoices.includes(action)) {
  //   const unduped = removeDuplicates(accounts.GEN.bidders)
  //   reportNumbers({ accounts: unduped, 'account-auctionId_pairs': accounts.GEN.bidders })
  // }

  console.log('\n');

  // continue?
  return true
}

function printUser2Rep(ctrName, accNrepS) {
  console.group(ctrName, 'REP per account for', accNrepS.length, 'users')
  accNrepS.forEach(({ account, REP, percentOfMethod, percentOfTotal }) => {
    console.log(account, REP.toString() / 1e18, `${percentOfMethod || percentOfTotal}%`)
  })
  console.groupEnd()
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

async function getTokenSymbol(address) {
  const request = {
    data: '0x95d89b41',
    to: address
  }

  const symbolHex = await web3.eth.call(request)
  let symbol
  try {
    symbol = web3.eth.abi.decodeParameter('string', symbolHex)
  } catch (error) {
    symbol = web3.utils.toUtf8(symbolHex)
  }
  return symbol
}

async function getTokenDecimals(address) {
  const request = {
    data: '0x313ce567',
    to: address
  }

  const decimalsHex = await web3.eth.call(request)
  return +decimalsHex
}

async function getTokenInfo(address) {
  const [symbol, decimals] = await Promise.all([getTokenSymbol(address), getTokenDecimals(address)])
  return { symbol, decimals }
}

module.exports = cb => main().then(() => cb(), cb)
