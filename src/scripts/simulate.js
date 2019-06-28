/* global artifacts, web3 */

const yargs = require('yargs');
const inquirer = require('inquirer');
const Web3 = require('web3')
const HDWalletProvider = require('truffle-hdwallet-provider')
const fs = require('fs-extra')
const path = require('path')

const DxGenAuction4Rep = artifacts.require('DxGenAuction4Rep')
const DxLockEth4Rep = artifacts.require('DxLockEth4Rep')
const DxLockMgnForRep = artifacts.require('DxLockMgnForRep')
const DxLockWhitelisted4Rep = artifacts.require('DxLockWhitelisted4Rep')
const WhitelistPriceOracle = artifacts.require('WhitelistPriceOracle')
const TestToken = artifacts.require('TestToken')
const GenToken = artifacts.require('GenToken')
const TransferValue = artifacts.require('TransferValue')

const EtherToken = artifacts.require('EtherToken')
const TokenFRTProxy = artifacts.require('TokenFRTProxy')
const TokenGNO = artifacts.require('TokenGNO')
const TokenOWLProxy = artifacts.require('TokenOWLProxy')

const getPriceOracleAddress = require('../helpers/getPriceOracleAddress.js')(web3, artifacts)
const getDXContractAddresses = require('../helpers/getDXContractAddresses.js')(web3, artifacts)
const batchExecute = require('./utils/batch')

const {
  streamline,
  makeBatchNumberTracker,
  makeProcessSlice,
  postprocessBatchRequest,
  flattenArray,
} = require('./utils/rx')

const { getTimestamp, getBlockNumber, increaseTimeAndMine, takeSnapshot, revertSnapshot } = require('../helpers/web3helpers')(web3)
const rxjs = require('rxjs')
const rxjsOps = require('rxjs/operators')

const DEFAULT_MNEMONIC = 'candy maple cake sugar pudding cream honey rich smooth crumble sweet treat'

const priceOracleImpl = process.env.PRICE_ORACLE_IMPL || 'DutchXPriceOracle'
const mgnImpl = process.env.MGN_IMPL || 'TokenFRTProxy'


// const privateKeys = process.env.PK && process.env.PK.split(',')
const mnemonic = process.env.MNEMONIC || DEFAULT_MNEMONIC
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

const {network2URL, network2Id} = require('./utils/network2Url')

function parseArgv() {
  return yargs
    .usage('Usage: npx truffle exec src/scripts/simulate.js --network <network_name> --accounts <number_of_accounts>')

    .option('network', {
      // demandOption: true,
      choices: Object.keys(network2URL),
      type: 'string',
      default: 'development',
      describe: 'which network to run simulation on'
    })
    .option('accounts', {
      demandOption: true,
      type: 'number',
      describe:
        'how many accounts to create'
    })
    .option('from', {
      type: 'number',
      default: 0,
      describe:
        'start accounts from index'
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
    .option('from-block', {
      type: 'number',
      default: 0,
      describe:
        'get events starting from block'
    })
    .option('use-helper', {
      type: 'boolean',
      default: true,
      describe:
        'use TransferValue helper contract for sharing ETH and Tokens'
    })
    .help('help')
    .alias('help', 'h')
    .wrap(yargs.terminalWidth())
    .argv
}



function createProvider(url, accounts, from = 0) {
  return new HDWalletProvider(
    mnemonic,
    url,
    from,
    accounts
  )
}

function createWeb3({ network, accounts, from }) {
  const provider = createProvider(network2URL[network], accounts, from)
  return { web3: new Web3(provider), provider }
}

async function getContracts(provider) {
  DxGenAuction4Rep.setProvider(provider)
  DxLockEth4Rep.setProvider(provider)
  DxLockMgnForRep.setProvider(provider)
  DxLockWhitelisted4Rep.setProvider(provider)

  const [DxGenAuction, DxLockEth, DxLockMgn, DxLockWhitelisted] = await Promise.all([
    DxGenAuction4Rep.deployed(),
    DxLockEth4Rep.deployed(),
    DxLockMgnForRep.deployed(),
    DxLockWhitelisted4Rep.deployed(),
  ])

  return {
    DxGenAuction,
    DxLockEth,
    DxLockMgn,
    DxLockWhitelisted
  }
}

async function getBalances(web3, accounts, options) {
  // TODO: batch and flat-map
  // const balArrs = await batchExecute(accsSlice => {
  //   return Promise.all(accsSlice.map(acc => web3.eth.getBalance(acc)))
  // }, { ...options, log: options && options.batchSize < accs.length }, accs)

  // const balances = [].concat(...balArrs)

  // const balances = await Promise.all(accs.map(acc => web3.eth.getBalance(acc)))
  // console.log('balances: ', balances);

  const trackBatch = makeBatchNumberTracker()

  const getBalanceReq = acc => web3.eth.getBalance.request(acc, () => { })
  const makeBatch = accsSlice => {
    const { from, to } = trackBatch(accsSlice)
    const batch = new web3.BatchRequest()
    batch.name = `${from}--${to} from ${accounts.length}`
    accsSlice.forEach(acc => batch.add(getBalanceReq(acc)))

    console.log(`Batch ${batch.name} compiled`)
    return batch
  }

  const processSlice = makeProcessSlice({
    makeBatch,
    timeout: 10000,
    retry: 15,
  })

  const postprocess = rxjs.pipe(
    postprocessBatchRequest,
    rxjsOps.map(balances => balances.reduce((accum, balance, i) => {
      const { withBalance, withoutBalance } = accum
      if (balance > 0) withBalance[accounts[i]] = balance
      else withoutBalance.push(accounts[i])
      return accum
    }, { withBalance: {}, withoutBalance: [] }))
  )

  const acc2bal = await streamline(accounts, {
    ...options,
    processSlice,
    postprocess,
  })

  // const { from, defer, of, forkJoin } = rxjs

  // const { map, bufferCount, tap, concatMap, scan, reduce, pluck, retry, timeout, concatAll } = rxjsOps

  // const tapIndex = cb => source => defer(() => {
  //   let index = 0
  //   let from = 0
  //   let to = 0


  //   return source.pipe(tap(arr => {
  //     from = to + 1
  //     to = from + arr.length - 1
  //     cb({ from, to, ind: index++, value: arr })
  //   }))
  // })
  // const tapIndexTotal = (cb) => {
  //   let index = 0
  //   let from = 0
  //   let to = 0
  //   let total = 0


  //   return tap(arr => {
  //     from = to + 1
  //     to = from + arr.length - 1
  //     total += arr.length
  //     cb({ from, to, ind: index++, value: arr, total })
  //   })

  // }

  // const trackBatches = tapIndexTotal(
  //   ({ from, to }) => console.log(`batch ${from}--${to} from ${accs.length}`),
  //   accs.length
  // )

  // const indexBatch = () => scan((accum, accs, ind) => {
  //   const from = accum.to + 1
  //   const to = from + accs.length - 1
  //   return { from, to, accs, ind }
  // }, { from: 0, to: 0, accs: [] })

  // const processSlice = slice => {
  //   console.log('Start OW');
  //   return of(slice).pipe(
  //     trackBatches,
  //     map(makeBatch),
  //     concatMap(batch => {
  //       console.log('Start bo');
  //       // const prom = batch.execute()
  //       // console.log('prom: ', prom, Object.getOwnPropertyNames(prom), Object.getOwnPropertyNames(Object.getPrototypeOf(prom)));
  //       return defer(() => batch.execute()).pipe(
  //         // stop waiting and retry if past * ms
  //         timeout(10000),
  //         tap(
  //           () => console.log('Batch resolved'),
  //           e => console.log('Batch errored', e.message)
  //         ),
  //         retry(15)
  //       )
  //     }),

  //   )
  // }

  console.log('options.maxConcurrent: ', options.maxConcurrent);
  // const acc2bal = await rxjs.from(accs).pipe(
  //   bufferCount(options.batchSize),
  //   bufferCount(options.maxConcurrent),
  //   // starts #maxConcurrent at a time
  //   concatMap(arrOfSlices => forkJoin(arrOfSlices.map(processSlice))),
  //   concatAll(),
  //   // tap(console.log),
  //   // concatMap(processSlice),
  //   pluck('response'),
  //   // tap(v => console.log('Balances', v)),
  //   reduce((accum, curr) => accum.concat(curr), []),
  //   tap(balances => console.log('total accs processed', balances.length)),
  //   map(bals => bals.reduce((accum, bal, i) => {
  //     const { withBalance, withoutBalance } = accum
  //     if (bal > 0) withBalance[accs[i]] = bal
  //     else withoutBalance.push(accs[i])
  //     return accum
  //   }, { withBalance: {}, withoutBalance: [] }))
  // ).toPromise()

  console.log('withBalance: ', Object.keys(acc2bal.withBalance).length);
  console.log('withoutBalance: ', acc2bal.withoutBalance.length);

  return acc2bal

  // return accs.reduce((accum, acc, i) => {
  //   const bal = balances[i]
  //   if (bal > 0) accum[acc] = bal
  //   return accum
  // }, {})
}

async function run(options) {
  // console.log('options: ', options);

  const { web3: wa3, provider } = createWeb3(options)
  console.log('web3 version: ', web3.version);
  console.log('wa3 version: ', wa3.version);
  const { network, /*fromBlock,*/ useHelper, batchSize, maxConcurrent } = options

  const isDev = network === 'development'
  const networkId = await web3.eth.net.getId()
  const isChainFork = isDev && Object.values(network2Id).includes(networkId)

  const mgnMock = mgnImpl !== 'TokenFRTProxy' &&
    await artifacts.require(mgnImpl).deployed()

  let mgn
  if (mgnMock) {
    mgn = mgnMock
  } else {
    const mgnTokenAddress = await getDXContractAddresses('TokenFRTProxy')
    mgn = await artifacts.require('TokenFRT').at(mgnTokenAddress)
  }

  mgn.name = 'Magnolia Token'
  mgn.symbol = 'MGN'
  mgn.decimals = '18'

  const contracts = await getContracts(provider)

  const [master] = await web3.eth.getAccounts()
  const masterBal = await web3.eth.getBalance(master)
  console.log(`Network ${network}\n`);

  printKV(contracts, 'Contracts', { valTransform: ctr => ctr.address })

  console.log(`\nMaster acc ${master}
    has balance of ${masterBal / 1e18} ETH
  `);

  const tvalue = useHelper && await deployTransferValue(
    isChainFork ? null :
      isDev ? networkId : network2Id[network]
  )


  const accs = await wa3.eth.getAccounts()
  const accsN = accs.length
  // const acc2bal = await getBalances(web3, accs, { batchSize, maxConcurrent })
  // const withBalance = Object.keys(acc2bal)
  console.log(`Available ${accsN} accounts`);
  // console.log(`${withBalance.length || 'None'} of them have balance\n`);

  // accs.forEach(async acc => {
  //   const bal = await wa3.eth.getBalance(acc)
  //   // console.log('acc',acc, 'bal: ', bal, bal -21000);
  //   // console.log('String(bal - 2 * 21000): ', String(bal - 2 * 21000));
  //   wa3.eth.sendTransaction({
  //     from: acc,
  //     to: master,
  //     value: String(bal - 15  * 10000000000 * 21000),
  //     gas: 21000
  //   }).then((res) => console.log('acc', acc, res)).catch(e=> console.error('acc', acc, e))
  // })



  const tokens = await getWhitelistedTokens(priceOracleImpl, networkId)


  console.log(`\nValid Whitelisted Tokens: \n\t${tokens.map(t => t.symbol + ' at ' + t.address).join('\n\t') || 'None'}\n`)

  let gen = tokens.find(t => t.symbol === 'GEN')
  if (!gen) {
    let genAddress = require('../config/genTokenAddress')[networkId]
    if (!genAddress && isDev) {
      try {
        genAddress = { address: GenToken.address }
      } catch (error) {
        console.error(error);
      }
    }
    if (genAddress) {
      gen = await wrapToken(genAddress.address)
      if (gen) tokens.push(gen)
    }
  }

  console.log(`GEN Token at ${gen && gen.address}`);

  console.log(`MGN implementation -- ${mgnImpl} at ${mgn.address}`);

  if (mgn) tokens.push(mgn)


  let isMgnOwner = false
  let MGNownerless = false
  if (mgnMock) {
    try {
      isMgnOwner = await mgnMock.isOwner({ from: master })
    } catch (error) {
      MGNownerless = true
    }

  }

  const choices = [
    'Print master balance',
    'Print master Token balances',
    'Print account balances',
    'Print account Token balances',
    'Print locked MGN',
    'Print account addresses',
    new inquirer.Separator(),
    'Fund accounts',
    {
      name: 'Lock mocked MGN',
      disabled: !mgnMock ? `Can't mint with ${mgnImpl}` : !isMgnOwner && !MGNownerless && 'Only owner can mint'
    },
    {
      name: 'Lock real MGN',
      disabled: mgnMock && 'Using MGN Mock'
    },
    'Register for future MGN claiming',
    'Print accounts registered for future MGN claiming',
    {
      name: 'Give a Token',
      disabled: !tokens.length && 'No whitelisted tokens'
    },
    new inquirer.Separator(),
    'Lock ETH for REP',
    'Print accounts that locked ETH',
    'Lock MGN for REP',
    'Print accounts that locked MGN',
    'Lock Token for REP',
    'Print accounts that locked Tokens',
    'Bid GEN',
    'Print accounts that bid GEN',
    new inquirer.Separator(),
    'Refresh time',
    new inquirer.Separator(),
  ]

  if (isDev) {
    const devChoices = [
      'Increase Time',
      'Take a Snapshot',
      {
        name: 'Revert a Snapshot',
        disabled: () => Object.keys(snapshots).length === 0 && 'No snapshots recorded'
      }
    ]
    choices.push(...devChoices)
  }

  choices.push('Quit', new inquirer.Separator())

  const updateHeader = async (str = getTimesStr(contracts)) => {
    console.log(await str)
  }


  const inquire = (def) => inquirer.prompt({
    type: 'list',
    name: 'action',
    message: 'Choose action',
    pageSize: 20,
    default: def,
    choices
  })


  let cont, answ = {}
  do {
    await updateHeader()
    answ = await inquire(answ.action)
    // console.log('answ: ', answ);
    cont = await act(answ.action, { web3, wa3, accs, master, contracts, tokens, mgn, tvalue, gen, batchSize, maxConcurrent })
  } while (cont)

}

let AGREEMENT_HASH

const snapshots = {}
async function act(action, options) {
  const {
    web3,
    wa3,
    accs,
    master,
    contracts,
    tokens,
    mgn,
    tvalue,
    gen,
    batchSize,
    maxConcurrent
  } = options
  if (action === 'Refresh time') return true

  const {
    DxGenAuction,
    DxLockEth,
    DxLockMgn,
    DxLockWhitelisted
  } = contracts

  AGREEMENT_HASH = AGREEMENT_HASH || await DxGenAuction.getAgreementHash()

  const symbols = []
  const symbol2token = tokens.reduce((accum, t) => {
    symbols.push(t.symbol)
    accum[t.symbol] = t
    return accum
  }, {})

  console.log('\n');
  switch (action) {
    case 'Quit':
      return false;
    case 'Print master balance':
      {
        const bal = await web3.eth.getBalance(master)
        console.log(`Master ${master} balance ${bal / 1e18}`);
        break;
      }
    case 'Print master Token balances':
      {
        const { withBalance: acc2bals } = await getTokenBalances(tokens, [master], { web3: wa3, batchSize, maxConcurrent })
        if (!acc2bals[master] || Object.keys(acc2bals[master]).length === 0) {
          console.log('Master has no Tokens');
          break;
        }
        printKV(acc2bals[master], `Master ${master} Token balance:`)
        break;
      }
    case 'Print account balances':
      {
        const withoutBalance = await printAccBalances(wa3, accs, { batchSize, maxConcurrent })
        if (withoutBalance.length) {
          const answ = await inquirer.prompt({
            name: 'fund',
            message: `${withoutBalance.length} accounts don't have balance. Would you like to fund them?`,
            type: 'confirm'
          })

          if (answ.fund) await act('Fund accounts', { ...options, accs: withoutBalance });
        }
        break;

      }
    case 'Print account Token balances':
      {
        const symbols = tokens.map(t => t.symbol)
        const allSymbols = symbols.join(',')
        const answ = await inquirer.prompt({
          name: 'symbol',
          type: 'list',
          message: 'Choose token to transfer',
          choices: [allSymbols, ...symbols]
        })

        let tokensToCheck = tokens

        if (answ.symbol !== allSymbols) {
          tokensToCheck = [tokens.find(t => t.symbol === answ.symbol)]
        }

        const { withBalance: acc2bals, withoutBalance } = await getTokenBalances(tokensToCheck, accs, { web3: wa3, batchSize, maxConcurrent })
        if (Object.keys(acc2bals).length === 0) {
          console.log('No account has Tokens');
          break;
        }
        // printNestedKV(acc2bals, 'Accounts token balances')
        if (withoutBalance.length) {
          const answ = await inquirer.prompt({
            name: 'fund',
            message: `${withoutBalance.length} accounts don't have Tokens. Would you like to give them some?`,
            type: 'confirm'
          })

          if (answ.fund) await act('Give a Token', { ...options, accs: withoutBalance });
        }
        break;

      }
    case 'Print locked MGN':
      {
        const { withBalance: acc2bals, withoutBalance } = await getTokenBalances([mgn], accs, { web3: wa3, fname: 'lockedTokenBalances', batchSize, maxConcurrent })



        if (Object.keys(acc2bals).length === 0) {
          console.log('No account has locked MGN Tokens');
          break;
        }
        printNestedKV(acc2bals, `${Object.keys(acc2bals).length} accounts with locked MGN balances`)
        console.log(`${Object.keys(acc2bals).length} accounts with locked MGN balances`)

        if (withoutBalance.length) {
          const answ = await inquirer.prompt({
            name: 'lock',
            message: `${withoutBalance.length} accounts don't have locked MGN. Would you like to lock some?`,
            type: 'confirm'
          })

          if (answ.lock) await act('Lock real MGN', { ...options, accs: withoutBalance });
        }
      }
      break;

    case 'Print account addresses':
      console.log('  ' + accs.join('\n  '));
      break;

    case 'Fund accounts':
      {

        await loopTillSuccess(async () => {
          const answ = await inquirer.prompt({
            name: `amount`,
            message: `How much to give to the accounts. ETH amount will be divided equally between ${accs.length} accounts`,
            type: 'number'
          })

          if (answ.amount === 0) return;

          const perAcc = answ.amount / accs.length
          console.log(`Sending ${perAcc} ETH to each account`);

          if (tvalue) {
            // const makeRequestFactory = total => accsSlice => {
            //   const value = web3.utils.toWei(expToString(answ.amount / total * accsSlice.length), 'ether')
            //   // console.log('value: ', value);
            //   return tvalue.contract.transferETH(accsSlice).send.request({
            //     from: master,
            //     value
            //   }, () => { })
            //   // web3.eth.getBalance.request(acc, () => { })
            // }

            // const makeRequest = makeRequestFactory(accs.length)

            const trackBatch = makeBatchNumberTracker()

            const makeBatch = accsSlice => {
              const value = web3.utils.toWei(expToString(answ.amount / accs.length * accsSlice.length), 'ether')
              // console.log('value: ', value);
              const { from, to } = trackBatch(accsSlice)
              const name = `${from}--${to} from ${accs.length}`

              const execute = () => tvalue.transferETH(accsSlice, {
                from: master,
                value
              })

              return { execute, name }

              // const batch = new web3.BatchRequest()
              // accsSlice.forEach(acc => batch.add(makeRequest(acc)))
              // return batch
            }

            // const { from, defer, of, forkJoin } = rxjs

            // const { map, bufferCount, toArray, tap, concatMap, scan, catchError, reduce, pluck, retry, timeout, concatAll } = rxjsOps

            // const tapIndex = cb => source => defer(() => {
            //   let index = 0
            //   let from = 0
            //   let to = 0


            //   return source.pipe(tap(arr => {
            //     from = to + 1
            //     to = from + arr.length - 1
            //     cb({ from, to, ind: index++, value: arr })
            //   }))
            // })
            // const tapIndexTotal = (cb) => {
            //   let index = 0
            //   let from = 0
            //   let to = 0
            //   let total = 0


            //   return tap(arr => {
            //     from = to + 1
            //     to = from + arr.length - 1
            //     total += arr.length
            //     cb({ from, to, ind: index++, value: arr, total })
            //   })

            // }

            // const trackBatches = tapIndexTotal(
            //   ({ from, to }) => console.log(`batch ${from}--${to} from ${accs.length}`),
            //   accs.length
            // )

            // const indexBatch = () => scan((accum, accs, ind) => {
            //   const from = accum.to + 1
            //   const to = from + accs.length - 1
            //   return { from, to, accs, ind }
            // }, { from: 0, to: 0, accs: [] })

            // const processSlice = slice => {
            //   console.log('Start OW');
            //   return of(slice).pipe(
            //     trackBatches,
            //     map(makeBatch),
            //     concatMap(batch => {
            //       console.log('Start ba');
            //       // const prom = batch.execute()
            //       // console.log('prom: ', prom, Object.getOwnPropertyNames(prom), Object.getOwnPropertyNames(Object.getPrototypeOf(prom)));
            //       return defer(() => batch.execute()).pipe(
            //         // stop waiting and retry if past * ms
            //         // timeout(10000),
            //         tap(
            //           () => console.log('Batch resolved'),
            //           e => console.log('Batch errored', e.message)
            //         ),
            //         catchError(e => of(e.message))
            //         // retry(15)
            //       )
            //     }),

            //   )

            // }

            const processSlice = makeProcessSlice({
              makeBatch
            })

            const postprocess = rxjsOps.toArray()

            const results = await streamline(accs, {
              batchSize,
              maxConcurrent,
              processSlice,
              postprocess
            })

            // const results = await from(accs).pipe(
            //   bufferCount(batchSize),
            //   concatMap(processSlice),
            //   pluck('response'),
            //   toArray(),
            // ).toPromise()
            console.log('results: ', results);

            // await batchExecute(accsSlice => {
            //   const value = web3.utils.toWei(expToString(answ.amount / accs.length * accsSlice.length), 'ether')
            //   // console.log('value: ', value);
            //   return tvalue.transferETH(accsSlice, {
            //     from: master,
            //     value
            //   })
            // }, { batchSize, maxConcurrent, log: true }, accs)
            // await tvalue.transferETH(accs, {
            //   from: master,
            //   value: web3.utils.toWei(expToString(answ.amount), 'ether')
            // })
            return;
          }

          await batchExecute(accsSlice => {
            return Promise.all(accsSlice.map(acc => web3.eth.sendTransaction({
              from: master,
              to: acc,
              value: web3.utils.toWei(expToString(perAcc), 'ether')
            })))
          }, { batchSize, maxConcurrent, log: true }, accs)

          // await Promise.all(accs.map(acc => web3.eth.sendTransaction({
          //   from: master,
          //   to: acc,
          //   value: web3.utils.toWei(expToString(perAcc), 'ether')
          // })))
        })

        break;
      }
    case 'Lock mocked MGN':
      {
        await loopTillSuccess(async () => {
          const answ = await inquirer.prompt({
            name: `amount`,
            message: `How much MGN to lock for the accounts. MGN amount will be divided equally between ${accs.length} accounts`,
            type: 'number'
          })

          if (answ.amount === 0) return;

          const perAcc = answ.amount / accs.length
          console.log(`Locking ${perAcc} MGN for each account`);

          const wei = web3.utils.toWei(expToString(perAcc), 'ether')
          await batchExecute(accsSlice => {
            return mgn.lockMultiple(wei, accsSlice)
          }, { batchSize, maxConcurrent, log: true }, accs)
          // await mgn.lockMultiple(web3.utils.toWei(expToString(perAcc), 'ether'), accs)
          // await Promise.all(accs.map(acc => mgn.lock(web3.utils.toWei(expToString(perAcc), 'ether'), acc, { from: master })))
        })
      }
      break;
    case 'Lock real MGN':
      {
        await loopTillSuccess(async () => {
          const answ = await inquirer.prompt({
            name: `amount`,
            message: 'How much MGN to lock for each accounts',
            type: 'number'
          })

          if (answ.amount === 0) return;

          console.log(`Locking ${answ.amount} MGN for each account`);

          const trackBatch = makeBatchNumberTracker()

          const lockData = mgn.contract.methods.lockTokens(web3.utils.toWei(expToString(answ.amount), 'ether')).encodeABI()

          const makeRequest = acc => wa3.eth.sendTransaction.request({
            from: acc,
            data: lockData,
            to: mgn.address
          }, (err, txhash) => console.log(`Acc ${acc}, tx ${txhash}, err ${err}`))

          const makeBatch = accsSlice => {
            const { from, to } = trackBatch(accsSlice)
            const name = `${from}--${to} from ${accs.length}`

            const batch = new wa3.BatchRequest()

            accsSlice.forEach(acc => batch.add(makeRequest(acc)))
            batch.name = name

            return batch
          }

          const processSlice = makeProcessSlice({
            makeBatch,
          })

          // const postprocess = rxjsOps.toArray()

          const results = await streamline(accs, {
            batchSize,
            maxConcurrent,
            processSlice,
            postprocess: postprocessBatchRequest,
          })
          console.log('results: ', results);

          // const req = mgn.contract.methods.lockTokens(web3.utils.toWei(expToString(answ.amount), 'ether')).send.request()
          // console.log('req: ', req);

          // let withMGN = 0, withoutMGN = 0
          // await batchExecute(async accsSlice => {
          //   const batch = new wa3.BatchRequest();

          //   const accs2MGN = await Promise.all(accsSlice.map(acc => mgn.lockedTokenBalances(acc)))


          //   accsSlice.forEach((acc, i) => {
          //     if (accs2MGN[i].toString() !== '0') {
          //       console.log(`Account ${acc} already has locked MGN: ${accs2MGN[i].toString() / 1e18}`);
          //       ++withMGN
          //       return
          //     }

          //     ++withoutMGN
          //     console.log(`Account ${acc} hasn't locked MGN`);

          //     batch.add({
          //       ...req,
          //       params: req.params.map(param => ({ ...param, from: acc }))
          //     })
          //   });

          //   return batch.execute()
          // }, { batchSize, maxConcurrent, log: true }, accs)


          // console.log(`There was ${withMGN} accounts with MGN already locked, and ${withoutMGN} accounts without.`)

          // const batch = new wa3.BatchRequest();

          // accs.forEach(acc => batch.add({
          //   ...req,
          //   params: req.params.map(param => ({ ...param, from: acc }))
          // }));

          // await batch.execute()
          // /////////////////////////////
          // await Promise.all(accs.map(acc => mgn.lockTokens(web3.utils.toWei(expToString(answ.amount), 'ether'), { from: acc })))
        })
      }
      break;
    case 'Register for future MGN claiming':
      {
        console.log(`Registering ${accs.length} on DxLockMgnForRep`);
        const gas = await DxLockMgn.register.estimateGas(AGREEMENT_HASH, { from: accs[0] })
        console.log('gas: ', gas);
        // let notRegistered = 0, Registered = 0
        try {

          const trackBatch = makeBatchNumberTracker()

          const registerData = DxLockMgn.contract.methods.register(AGREEMENT_HASH).encodeABI()

          const makeRequest = acc => wa3.eth.sendTransaction.request({
            from: acc,
            data: registerData,
            to: DxLockMgn.address,
            gas: gas * 1.5
          }, (err, txhash) => console.log(`Acc ${acc}, tx ${txhash}, err ${err}`))

          const makeBatch = accsSlice => {
            const { from, to } = trackBatch(accsSlice)
            const name = `${from}--${to} from ${accs.length}`

            const batch = new wa3.BatchRequest()

            accsSlice.forEach(acc => batch.add(makeRequest(acc)))
            batch.name = name

            return batch
          }

          const processSlice = makeProcessSlice({
            makeBatch,
          })

          // const postprocess = rxjsOps.toArray()

          const results = await streamline(accs, {
            batchSize,
            maxConcurrent,
            processSlice,
            postprocess: postprocessBatchRequest,
          })
          console.log('results: ', results);

          // await batchExecute(async accsSlice => {
          //   const accs2Reg = await Promise.all(accsSlice.map(acc => DxLockMgn.registrar(acc)))

          //   const accsToRegister = []
          //   accsSlice.forEach((acc, i) => {
          //     if (accs2Reg[i]) {
          //       console.log(`Account ${acc} already Registered`);
          //       ++Registered
          //       return
          //     }

          //     accsToRegister.push(acc)

          //     ++notRegistered
          //   });

          //   return Promise.all(accsToRegister.map(acc => DxLockMgn.register(AGREEMENT_HASH, { from: acc, gas: gas * 1.5 })))
          // }, { batchSize, maxConcurrent, log: true }, accs)
          // await batchExecute(accsSlice => {
          //   return Promise.all(accsSlice.map(acc => DxLockMgn.register(AGREEMENT_HASH, { from: acc, gas })))
          // }, { batchSize, maxConcurrent, log: true }, accs)
          // await Promise.all(accs.map(acc => DxLockMgn.register(AGREEMENT_HASH, { from: acc })))
        } catch (error) {
          console.error(error.message);
        }
        // console.log(`${Registered} accounts have been registered beforehand; ${notRegistered} not registered`);
      }
      break;
    case 'Print accounts registered for future MGN claiming':
      {
        const trackBatch = makeBatchNumberTracker()

        const makeRequest = acc => wa3.eth.call.request({
          from: acc,
          data: DxLockMgn.contract.methods.registrar(acc).encodeABI(),
          to: DxLockMgn.address
        }, () => { })

        const makeBatch = accsSlice => {
          const { from, to } = trackBatch(accsSlice)
          const name = `${from}--${to} from ${accs.length}`

          const batch = new wa3.BatchRequest()

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
          rxjsOps.map(registeredBools => registeredBools.reduce((accum, registeredHex, i) => {
            console.log('accs[i]: ', accs[i]);
            console.log('registeredHex: ', registeredHex);
            const registeredBool = wa3.eth.abi.decodeParameter('bool', registeredHex)
            console.log('registeredBool: ', registeredBool);
            const { registered, notRegistered } = accum
            if (registeredBool) registered.push(accs[i])
            else notRegistered.push(accs[i])
            return accum
          }, { registered: [], notRegistered: [] }))
        )

        const { registered, notRegistered } = await streamline(accs, {
          batchSize,
          maxConcurrent,
          processSlice,
          postprocess,
        })
        // console.log('results: ', results);

        // const regArrs = await batchExecute(accsSlice => {
        //   return Promise.all(accsSlice.map(acc => DxLockMgn.registrar(acc)))
        // }, { batchSize, maxConcurrent, log: true }, accs)
        // console.log('regArrs: ', regArrs);
        // const registered = [].concat(...regArrs)
        // // const registered = await Promise.all(accs.map(acc => DxLockMgn.registrar(acc)))
        console.log(`${registered.length} accounts registered`);
        accs.forEach((acc, i) => {
          if (registered[i]) console.log(acc);
        })
        console.log(`${registered.length} accounts registered`);
        console.log(`${notRegistered.length} accounts not registered`);

        if (notRegistered.length) {
          const answ = await inquirer.prompt({
            name: 'register',
            message: `${notRegistered.length} accounts haven't registered for MGN claiming. Would you like to register them?`,
            type: 'confirm'
          })

          if (answ.register) await act('Register for future MGN claiming', { ...options, accs: notRegistered });
        }
      }
      break;
    case 'Give a Token':
      {
        const symbol2bal = (await getTokenBalances(tokens, [master], { web3: wa3, batchSize, maxConcurrent })).withBalance[master]

        await loopTillSuccess(async () => {
          const answ = await inquirer.prompt([{
            name: 'symbol',
            type: 'list',
            message: 'Choose token to transfer',
            choices: Object.keys(symbol2bal)
          }, {
            name: 'amount',
            type: 'number',
            message: 'Choose amount to transfer'
          }])

          if (answ.amount === 0) return;

          const perAcc = answ.amount / accs.length
          console.log(`Transferring ${perAcc} ${answ.symbol} to each account`);

          const token = symbol2token[answ.symbol]

          if (tvalue) {
            const wei = answ.amount * (10 ** token.decimals)

            console.log('expToString(wei): ', expToString(wei));
            await token.approve(tvalue.address, expToString(wei), { from: master })
            console.log('Approved');

            const trackBatch = makeBatchNumberTracker()

            const makeBatch = accsSlice => {
              const { from, to } = trackBatch(accsSlice)
              const name = `${from}--${to} from ${accs.length}`

              const execute = () => tvalue.transferToken(token.address, accsSlice, expToString(wei / accs.length * accsSlice.length), {
                from: master,
              })

              return { execute, name }
            }

            const processSlice = makeProcessSlice({
              makeBatch,
            })

            const postprocess = rxjsOps.toArray()

            const results = await streamline(accs, {
              batchSize,
              maxConcurrent,
              processSlice,
              postprocess,
            })

            console.log('results: ', results);

            // await batchExecute(accsSlice => {
            //   return tvalue.transferToken(token.address, accsSlice, expToString(wei / accs.length * accsSlice.length), {
            //     from: master,
            //   })
            // }, { batchSize, maxConcurrent, log: true }, accs)
            return;
          }


          const wei = perAcc * (10 ** token.decimals)

          await batchExecute(accsSlice => {
            return Promise.all(accsSlice.map(acc => token.transfer(acc, expToString(wei), { from: master })))
          }, { batchSize, maxConcurrent, log: true }, accs)

          // await Promise.all(accs.map(acc => token.transfer(acc, expToString(wei), { from: master })))
        })
      }
      break;
    case 'Lock ETH for REP':
      {
        await loopTillSuccess(async () => {
          const answ = await inquirer.prompt([{
            name: 'period',
            type: 'number',
            message: 'Period to lock for, in seconds',
          }, {
            name: 'amount',
            type: 'number',
            message: 'Amount to lock, in ETH'
          }])

          if (answ.period === 0 || answ.amount === 0) return;

          const value = web3.utils.toWei(expToString(answ.amount), 'ether')

          console.log(`${accs.length} accounts locking ${answ.amount} ETH in DxLockEth`);

          const gas = await DxLockEth.lock.estimateGas(answ.period, AGREEMENT_HASH, { from: accs[0], value })

          const trackBatch = makeBatchNumberTracker()

          const lockData = DxLockEth.contract.methods.lock(answ.period, AGREEMENT_HASH).encodeABI()

          const makeRequest = acc => wa3.eth.sendTransaction.request({
            from: acc,
            data: lockData,
            to: DxLockEth.address,
            gas: gas * 1.5,
            value,
          }, (err, txhash) => console.log(`Acc ${acc}, tx ${txhash}, err ${err}`))

          const makeBatch = accsSlice => {
            const { from, to } = trackBatch(accsSlice)
            const name = `${from}--${to} from ${accs.length}`

            const batch = new wa3.BatchRequest()

            accsSlice.forEach(acc => batch.add(makeRequest(acc)))
            batch.name = name

            return batch
          }

          const processSlice = makeProcessSlice({
            makeBatch,
          })

          // const postprocess = rxjsOps.toArray()

          const results = await streamline(accs, {
            batchSize,
            maxConcurrent,
            processSlice,
            postprocess: postprocessBatchRequest,
          })
          console.log('results: ', results);

          // await batchExecute(accsSlice => {
          //   return Promise.all(accsSlice.map(acc => DxLockEth.lock(answ.period, AGREEMENT_HASH, { from: acc, value, gas })))
          // }, { batchSize, maxConcurrent, log: true }, accs)

          // await Promise.all(accs.map(acc => DxLockEth.lock(answ.period, AGREEMENT_HASH, { from: acc, value })))
        })
      }
      break;
    case 'Print accounts that locked ETH':
      {
        const trackBatch = makeBatchNumberTracker()

        const makeRequest = acc => wa3.eth.call.request({
          from: acc,
          data: DxLockEth.contract.methods.scores(acc).encodeABI(),
          to: DxLockEth.address
        }, () => { })

        const makeBatch = accsSlice => {
          const { from, to } = trackBatch(accsSlice)
          const name = `${from}--${to} from ${accs.length}`

          const batch = new wa3.BatchRequest()

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
            const score = wa3.eth.abi.decodeParameter('uint', scoreHex)
            // console.log('score: ', score);
            const { withScore, withoutScore } = accum
            if (!score.isZero()) withScore[accs[i]] = score.toString()
            else withoutScore.push(accs[i])
            return accum
          }, { withScore: {}, withoutScore: [] }))
        )

        const { withScore, withoutScore } = await streamline(accs, {
          batchSize,
          maxConcurrent,
          processSlice,
          postprocess,
        })

        printKV(withScore, 'Accounts with Lock ETH score')

        console.log(`${Object.keys(withScore).length} accounts with score`);
        console.log(`${withoutScore.length} accounts without score`);

        if (withoutScore.length) {
          const answ = await inquirer.prompt({
            name: 'lock',
            message: `${withoutScore.length} accounts without score. Would you like them to lock ETH?`,
            type: 'confirm'
          })

          if (answ.lock) await act('Lock ETH for REP', { ...options, accs: withoutScore });
        }
      }
      break;
    case 'Lock MGN for REP':
      {
        await loopTillSuccess(async () => {

          console.log(`${accs.length} accounts claiming locked MGN in DxLockMgn`);

          const trackBatch = makeBatchNumberTracker()

          const lockData = DxLockMgn.contract.methods.claim(ZERO_ADDRESS, AGREEMENT_HASH).encodeABI()

          const makeRequest = acc => wa3.eth.sendTransaction.request({
            from: acc,
            data: lockData,
            to: DxLockMgn.address,
          }, (err, txhash) => console.log(`Acc ${acc}, tx ${txhash}, err ${err}`))

          const makeBatch = accsSlice => {
            const { from, to } = trackBatch(accsSlice)
            const name = `${from}--${to} from ${accs.length}`

            const batch = new wa3.BatchRequest()

            accsSlice.forEach(acc => batch.add(makeRequest(acc)))
            batch.name = name

            return batch
          }

          const processSlice = makeProcessSlice({
            makeBatch,
          })

          // const postprocess = rxjsOps.toArray()

          const results = await streamline(accs, {
            batchSize,
            maxConcurrent,
            processSlice,
            postprocess: postprocessBatchRequest,
          })
          console.log('results: ', results);

          // await batchExecute(accsSlice => {
          //   return Promise.all(accsSlice.map(acc => DxLockMgn.claim(ZERO_ADDRESS, AGREEMENT_HASH, { from: acc })))
          // }, { batchSize, maxConcurrent, log: true }, accs)
          // await Promise.all(accs.map(acc => DxLockMgn.claim(ZERO_ADDRESS, AGREEMENT_HASH, { from: acc })))

        })
      }
      break;
    case 'Print accounts that locked MGN':
      {
        const trackBatch = makeBatchNumberTracker()

        const makeRequest = acc => wa3.eth.call.request({
          from: acc,
          data: DxLockMgn.contract.methods.scores(acc).encodeABI(),
          to: DxLockMgn.address
        }, () => { })

        const makeBatch = accsSlice => {
          const { from, to } = trackBatch(accsSlice)
          const name = `${from}--${to} from ${accs.length}`

          const batch = new wa3.BatchRequest()

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
            const score = wa3.eth.abi.decodeParameter('uint', scoreHex)
            // console.log('score: ', score);
            const { withScore, withoutScore } = accum
            if (!score.isZero()) withScore[accs[i]] = score.toString()
            else withoutScore.push(accs[i])
            return accum
          }, { withScore: {}, withoutScore: [] }))
        )

        const { withScore, withoutScore } = await streamline(accs, {
          batchSize,
          maxConcurrent,
          processSlice,
          postprocess,
        })


        // console.log('withScore: ', withScore);
        printKV(withScore, 'Accounts with Lock MGN score')

        console.log(`${Object.keys(withScore).length} accounts with score`);
        console.log(`${withoutScore.length} accounts without score`);

        if (withoutScore.length) {
          const answ = await inquirer.prompt({
            name: 'lock',
            message: `${withoutScore.length} accounts without score. Would you like them to lock MGN?`,
            type: 'confirm'
          })

          if (answ.lock) await act('Lock MGN for REP', { ...options, accs: withoutScore });
        }
      }
      break;
    case 'Lock Token for REP':
      {
        await loopTillSuccess(async () => {
          const answ = await inquirer.prompt([{
            name: 'symbol',
            type: 'list',
            message: 'Choose token to lock',
            choices: symbols
          }, {
            name: 'period',
            type: 'number',
            message: 'Period to lock for, in seconds',
          }, {
            name: 'amount',
            type: 'number',
            message: ({ symbol }) => `Amount to lock, in ${symbol}`
          }])

          if (answ.period === 0 || answ.amount === 0) return;

          const token = symbol2token[answ.symbol]

          const wei = answ.amount * (10 ** token.decimals)

          const allowance = (await token.allowance(accs[0], DxLockWhitelisted.address)).toString() / (10 ** token.decimals)
          console.log('answ.amount: ', answ.amount);
          console.log('allowance: ', allowance, (await token.allowance(accs[0], DxLockWhitelisted.address)).toString());
          console.log('answ.amount < allowance.toString(): ', answ.amount < allowance.toString());
          if (answ.amount > allowance.toString()) {
            const answ1 = await inquirer.prompt({
              name: 'allowance',
              type: 'number',
              message: 'Amount to approve DxLockWhitelisted to handle. Current allowance is ' + allowance,
              validate: (allow) => answ.allowance < allow ? 'Insufficient allowance' : true
            })

            if (answ1.allowance === 0) return;

            console.log('answ.allowance: ', answ1.allowance);
            // first approve allowance
            if (answ1.allowance) {
              console.log('Approving DxLockWhitelisted to handle Token transfers');
              const allow = expToString(answ1.allowance * (10 ** token.decimals))
              console.log('DxLockWhitelisted.address: ', DxLockWhitelisted.address);
              console.log('allow: ', allow);
              const approveData = token.contract.methods.approve(DxLockWhitelisted.address, allow).encodeABI()
              // console.log('req: ', req);

              const trackBatch = makeBatchNumberTracker()

              // const lockData = DxLockEth.contract.methods.lock(answ.period, AGREEMENT_HASH).encodeABI()

              const makeRequest = acc => wa3.eth.sendTransaction.request({
                from: acc,
                data: approveData,
                to: token.address,
              }, (err, txhash) => console.log(`Acc ${acc}, tx ${txhash}, err ${err}`))

              const makeBatch = accsSlice => {
                const { from, to } = trackBatch(accsSlice)
                const name = `${from}--${to} from ${accs.length}`

                const batch = new wa3.BatchRequest()

                accsSlice.forEach(acc => batch.add(makeRequest(acc)))
                batch.name = name

                return batch
              }

              const processSlice = makeProcessSlice({
                makeBatch,
              })

              // const postprocess = rxjsOps.toArray()

              const results = await streamline(accs, {
                batchSize,
                maxConcurrent,
                processSlice,
                postprocess: postprocessBatchRequest,
              })
              console.log('results: ', results);

              // await batchExecute(accsSlice => {
              //   const batch = new wa3.BatchRequest();

              //   accsSlice.forEach(acc => batch.add({
              //     ...req,
              //     params: req.params.map(param => ({ ...param, from: acc }))
              //   }));

              //   return batch.execute()
              //   // await batchExecute(accsSlice => {
              //   //   return Promise.all(accsSlice.map(acc => token.approve(DxLockWhitelisted.address, allow, { from: acc })))
              // }, { batchSize, maxConcurrent, log: true }, accs)
              // await Promise.all(accs.map(acc => token.approve(DxLockWhitelisted.address, allow, { from: acc })))
            }
          }

          console.log(`${accs.length} accounts locking ${answ.amount} ${answ.symbol} in DxLockWhitelisted`);

          const gas = await DxLockWhitelisted.lock.estimateGas(expToString(wei), answ.period, token.address, AGREEMENT_HASH, { from: accs[0] })
          console.log('gas: ', gas);

          const trackBatch = makeBatchNumberTracker()

          const lockData = DxLockWhitelisted.contract.methods.lock(expToString(wei), answ.period, token.address, AGREEMENT_HASH).encodeABI()

          const makeRequest = acc => wa3.eth.sendTransaction.request({
            from: acc,
            data: lockData,
            to: DxLockWhitelisted.address,
            gas: gas + 10
          }, (err, txhash) => console.log(`Acc ${acc}, tx ${txhash}, err ${err}`))

          const makeBatch = accsSlice => {
            const { from, to } = trackBatch(accsSlice)
            const name = `${from}--${to} from ${accs.length}`

            const batch = new wa3.BatchRequest()

            accsSlice.forEach(acc => batch.add(makeRequest(acc)))
            batch.name = name

            return batch
          }

          const processSlice = makeProcessSlice({
            makeBatch,
          })

          // const postprocess = rxjsOps.toArray()

          const results = await streamline(accs, {
            batchSize,
            maxConcurrent,
            processSlice,
            postprocess: postprocessBatchRequest,
          })
          console.log('results: ', results);

          // await batchExecute(accsSlice => {
          //   return Promise.all(accsSlice.map(acc => DxLockWhitelisted.lock(expToString(wei), answ.period, token.address, AGREEMENT_HASH, { from: acc })))
          // }, { batchSize, maxConcurrent, log: true }, accs)

          // await Promise.all(accs.map(acc => DxLockWhitelisted.lock(expToString(wei), answ.period, token.address, AGREEMENT_HASH, { from: acc })))
        })
      }
      break;
    case 'Print accounts that locked Tokens':
      {
        const trackBatch = makeBatchNumberTracker()

        const makeRequest = acc => wa3.eth.call.request({
          from: acc,
          data: DxLockWhitelisted.contract.methods.scores(acc).encodeABI(),
          to: DxLockWhitelisted.address
        }, () => { })

        const makeBatch = accsSlice => {
          const { from, to } = trackBatch(accsSlice)
          const name = `${from}--${to} from ${accs.length}`

          const batch = new wa3.BatchRequest()

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
            const score = wa3.eth.abi.decodeParameter('uint', scoreHex)
            // console.log('score: ', score);
            const { withScore, withoutScore } = accum
            if (!score.isZero()) withScore[accs[i]] = score.toString()
            else withoutScore.push(accs[i])
            return accum
          }, { withScore: {}, withoutScore: [] }))
        )

        const { withScore, withoutScore } = await streamline(accs, {
          batchSize,
          maxConcurrent,
          processSlice,
          postprocess,
        })


        // console.log('withScore: ', withScore);
        printKV(withScore, 'Accounts with Lock Token score')

        console.log(`${Object.keys(withScore).length} accounts with score`);
        console.log(`${withoutScore.length} accounts without score`);

        if (withoutScore.length) {
          const answ = await inquirer.prompt({
            name: 'lock',
            message: `${withoutScore.length} accounts without score. Would you like them to lock Tokens?`,
            type: 'confirm'
          })

          if (answ.lock) await act('Lock Token for REP', { ...options, accs: withoutScore });
        }
      }
      break;
    case 'Bid GEN':
      {
        const auctionId = await getCurrentAuctionId(DxGenAuction);
        await loopTillSuccess(async () => {
          const allowance = gen && (await gen.allowance(accs[0], DxGenAuction.address)).toString() / 1e18
          console.log('allowance: ', allowance);

          const answ = await inquirer.prompt([{
            name: 'amount',
            type: 'number',
            message: 'Amount to bid, in auction #' + auctionId
          }, {
            name: 'allowance',
            type: 'number',
            message: 'Amount to approve DxGenAuction to handle. Current allowance is ' + allowance,
            when: ({ amount }) => amount > allowance.toString(),
            validate: (allow, { amount }) => amount > allow ? 'Insufficient allowance' : true
          }])

          if (answ.amount === 0 || answ.allowance === 0) return;

          console.log('answ.allowance: ', answ.allowance);
          // first approve allowance
          if (answ.allowance) {
            console.log('Approving DxGenAuction to handle GEN token transfers');
            const approveData = gen.contract.methods.approve(DxGenAuction.address, web3.utils.toWei(expToString(answ.allowance), 'ether')).encodeABI()
            // console.log('req: ', req);

            // const approveData = token.contract.methods.approve(DxLockWhitelisted.address, allow).encodeABI()
            // console.log('req: ', req);

            const trackBatch = makeBatchNumberTracker()

            // const lockData = DxLockEth.contract.methods.lock(answ.period, AGREEMENT_HASH).encodeABI()

            const makeRequest = acc => wa3.eth.sendTransaction.request({
              from: acc,
              data: approveData,
              to: gen.address,
            }, (err, txhash) => console.log(`Acc ${acc}, tx ${txhash}, err ${err}`))

            const makeBatch = accsSlice => {
              const { from, to } = trackBatch(accsSlice)
              const name = `${from}--${to} from ${accs.length}`

              const batch = new wa3.BatchRequest()

              accsSlice.forEach(acc => batch.add(makeRequest(acc)))
              batch.name = name

              return batch
            }

            const processSlice = makeProcessSlice({
              makeBatch,
            })

            // const postprocess = rxjsOps.toArray()

            const results = await streamline(accs, {
              batchSize,
              maxConcurrent,
              processSlice,
              postprocess: postprocessBatchRequest,
            })
            console.log('results: ', results);

            // await batchExecute(accsSlice => {
            //   const batch = new wa3.BatchRequest();

            //   accsSlice.forEach(acc => batch.add({
            //     ...req,
            //     params: req.params.map(param => ({ ...param, from: acc }))
            //   }));

            //   return batch.execute()
            // }, { batchSize, maxConcurrent, log: true }, accs)

            // const batch = new wa3.BatchRequest();

            // accs.forEach(acc => batch.add({
            //   ...req,
            //   params: req.params.map(param => ({ ...param, from: acc }))
            // }));

            // await batch.execute()
            // /////////////////////////////
            // await Promise.all(accs.map(acc => wa3.eth.sendTransaction({...req.params[0], from: acc})))
          }

          console.log(`${accs.length} accounts bidding ${answ.amount} GEN in auction #${auctionId} in DxGenAuction`);

          const gas =await DxGenAuction.bid.estimateGas(web3.utils.toWei(expToString(answ.amount), 'ether'), auctionId, AGREEMENT_HASH, { from: accs[0] })
          console.log('gas: ', gas);

          const trackBatch = makeBatchNumberTracker()

          const bidData = DxGenAuction.contract.methods.bid(web3.utils.toWei(expToString(answ.amount), 'ether'), auctionId, AGREEMENT_HASH).encodeABI()

          const makeRequest = acc => wa3.eth.sendTransaction.request({
            from: acc,
            data: bidData,
            to: DxGenAuction.address,
            gas: gas + 10,
          }, (err, txhash) => console.log(`Acc ${acc}, tx ${txhash}, err ${err}`))

          const makeBatch = accsSlice => {
            const { from, to } = trackBatch(accsSlice)
            const name = `${from}--${to} from ${accs.length}`

            const batch = new wa3.BatchRequest()

            accsSlice.forEach(acc => batch.add(makeRequest(acc)))
            batch.name = name

            return batch
          }

          const processSlice = makeProcessSlice({
            makeBatch,
          })

          // const postprocess = rxjsOps.toArray()

          const results = await streamline(accs, {
            batchSize,
            maxConcurrent,
            processSlice,
            postprocess: postprocessBatchRequest,
          })
          console.log('results: ', results);

          // await batchExecute(accsSlice => {
          //   return Promise.all(accsSlice.map(acc => DxGenAuction.bid(web3.utils.toWei(expToString(answ.amount), 'ether'), auctionId, AGREEMENT_HASH, { from: acc, gas: 76261 })))
          // }, { batchSize, maxConcurrent, log: true }, accs)

          // await Promise.all(accs.map(acc => DxGenAuction.bid(web3.utils.toWei(expToString(answ.amount), 'ether'), auctionId, AGREEMENT_HASH, { from: acc })))
        })
      }
      break;
    case 'Print accounts that bid GEN':
      {
        const numberOfAuctions = await DxGenAuction.numberOfAuctions()
        console.log('numberOfAuctions: ', numberOfAuctions.toString());
        const auctionIds = Array.from({ length: numberOfAuctions.toString() }, (_, i) => i)
        console.log('auctionIds: ', auctionIds);
        const trackBatch = makeBatchNumberTracker()

        const makeRequest = (acc, auctionId) => wa3.eth.call.request({
          from: acc,
          data: DxGenAuction.contract.methods.getBid(acc, auctionId).encodeABI(),
          to: DxGenAuction.address
        }, () => { })

        const makeBatch = accsSlice => {
          const { from, to } = trackBatch(accsSlice)
          const name = `${from}--${to} from ${accs.length}`

          const batch = new wa3.BatchRequest()

          accsSlice.forEach(acc => {
            auctionIds.forEach(id => batch.add(makeRequest(acc, id)))
          })
          batch.name = name

          return batch
        }

        const processSlice = makeProcessSlice({
          makeBatch,
          timeout: 30000,
          retry: 15,
        })

        const postprocess = rxjs.pipe(
          rxjsOps.pluck('response'),
          rxjsOps.concatMap(bidsArray => rxjs.from(bidsArray).pipe(
            rxjsOps.bufferCount(+numberOfAuctions.toString()),
            rxjsOps.map(bids => {
              const bidsN = bids.map(bidHex => +wa3.eth.abi.decodeParameter('uint', bidHex).toString())
              console.log('bidsN: ', bidsN);
              return bidsN.reduce((a, b) => a + b)
            }),
            rxjsOps.toArray()
          )),
          // rxjsOps.bufferCount(+numberOfAuctions.toString()),
          // rxjsOps.map(bids => {
          //   const bidsN = bids.map(bidHex => +wa3.eth.abi.decodeParameter('uint', bidHex).toString())
          //   console.log('bidsN: ', bidsN);
          //   return Math.max(...bidsN)
          // }),
          flattenArray,
          rxjsOps.map(bids => bids.reduce((accum, bid, i) => {
            // console.log('accs[i]: ', accs[i]);
            // console.log('bidHex: ', bidHex);
            // const bid = wa3.eth.abi.decodeParameter('uint', bidHex)
            // console.log('bid: ', bid);
            const { withBids, withoutBids } = accum
            if (bid !== 0) withBids[accs[i]] = bid.toString()
            else withoutBids.push(accs[i])
            return accum
          }, { withBids: {}, withoutBids: [] }))
        )

        const { withBids, withoutBids } = await streamline(accs, {
          batchSize: Math.floor(batchSize / +numberOfAuctions * 2),
          maxConcurrent,
          processSlice,
          postprocess,
        })

        printKV(withBids, 'Accounts with Bid GEN score')

        console.log(`${Object.keys(withBids).length} accounts with bids`);
        console.log(`${withoutBids.length} accounts without bids`);

        if (withoutBids.length) {
          const answ = await inquirer.prompt({
            name: 'lock',
            message: `${withoutBids.length} accounts without bids. Would you like them to bid GEN?`,
            type: 'confirm'
          })

          if (answ.lock) await act('Bid GEN', { ...options, accs: withoutBids });
        }
      }
      break;
    case 'Increase Time':
      {
        const answ = await inquirer.prompt({
          name: 'amount',
          type: 'number',
          message: 'Increase time by how much? In minutes'
        })

        if (answ.amount === 0) break;

        await increaseTimeAndMine(answ.amount * 60)
      }
      break;
    case 'Revert a Snapshot':
      {
        const snapKeys = Object.keys(snapshots)
        const answ = await inquirer.prompt({
          name: 'snapname',
          type: 'list',
          message: 'Choose a snapshot to revert to',
          choices: snapKeys.concat('Cancel'),
        })

        if (answ.snapname === 'Cancel') break

        const result = await revertSnapshot(snapshots[answ.snapname])
        delete snapshots[answ.snapname]
        if (result.result) console.log(`Reverted to ${answ.snapname} snapshot`);

      }
      break;
    case 'Take a Snapshot':
      {
        const answ = await inquirer.prompt({
          name: 'name',
          type: 'input',
          message: 'Name this snapshot or press Enter for default'
        })

        const snap = await takeSnapshot()
        const snapName = answ.name || snap
        snapshots[snapName] = snap
        console.log(`Snapshot ${snapName} created`);
      }
      break;
    default:
      break;
  }

  console.log('\n');

  // continue?
  return true
}

function expToString(expNotation) {
  return String(expNotation).replace(/(.\d+)?e\+?(\d+)$/, (_, dec, exp) => (dec ? dec.slice(1) : '') + Array(+exp + 1 - (dec ? dec.length - 1 : 0)).join('0'))
}

async function getCurrentAuctionId(DxGenAuction) {
  const [auctionsStartTime, auctionPeriod, now] = (await Promise.all([
    DxGenAuction.auctionsStartTime.call(),
    DxGenAuction.auctionPeriod.call(),
    getTimestamp()
  ])).map(n => +n.toString())

  return Math.floor((now - auctionsStartTime) / auctionPeriod);
}

async function deployTransferValue(networkId) {

  try {
    const tvalue = await TransferValue.deployed()
    console.log(`TransferValue contract at ${tvalue.address}\n`);
    return tvalue
  } catch (error) {
    console.error(error.message);
  }

  const answ = await inquirer.prompt({
    type: 'confirm',
    name: 'deploy',
    message: 'Deploy helper contract for funding accounts with ETH and Tokens'
  })

  if (!answ.deploy) return null

  console.log('Deploying TransferValue helper contract');

  const tvalue = await TransferValue.new()
  // don't fill in the artifact on *-fork chains
  if (networkId) {
    TransferValue._json.networks[networkId] = {
      events: {},
      links: {},
      address: tvalue.address,
      transactionHash: tvalue.transactionHash
    }

    console.log('Saving Artifacts');

    await fs.writeJSON(path.resolve('./build/contracts/TransferValue.json'), TransferValue._json, {
      spaces: 2,
    })
  }

  console.log(`TransferValue contract at ${tvalue.address}\n`);

  return tvalue

}

async function loopTillSuccess(cb) {
  try {
    return await cb()
  } catch (error) {
    console.error(error.message);
    return loopTillSuccess(cb)
  }
}

async function printAccBalances(web3, accs, options) {
  const { withBalance, withoutBalance } = await getBalances(web3, accs, options)
  if (Object.keys(withBalance).length === 0) console.log('No account has balance');
  else {
    console.log(Object.keys(withBalance).length, 'accounts have balance');
    console.log('Displaying accounts with non-zero balances');
    printKV(withBalance, 'Account\t : \t\t\t\t\tBalance ETH', { valTransform: v => v / 1e18 })
  }
  return withoutBalance
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

function isLocalGanache(networkId) {
  return networkId > Date.now() / 10
}

const possibleWhitelistedTokens = (networkId) => {
  const id2tokens = {
    1: [
      '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
      '0x255aa6df07540cb5d3d297f0d0d4d84cb52bc8e6',
      '0xd26114cd6ee289accf82350c8d8487fedb8a0c07',
      '0xdd974d5c2e2928dea5f71b9825b8b646686bd200',
      '0x543ff227f64aa17ea132bf9886cab5db55dcaddf',
      '0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2',
      '0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359',
      '0x6810e776880c02933d47db1b9fc05908e5386b96'
    ],
    4: [
      '0xd0Dab4E640D95E9E8A47545598c33e31bDb53C7c',
      '0x3615757011112560521536258c1E7325Ae3b48AE',
      '0x00Df91984582e6e96288307E9c2f20b38C8FeCE9',
      '0xc778417E063141139Fce010982780140Aa0cD5Ab',
      '0x543Ff227F64Aa17eA132Bf9886cAb5DB55DCAddf'
    ]
  }

  const tokenaddresses = id2tokens[networkId]
  if (tokenaddresses) return tokenaddresses

  if (isLocalGanache(networkId)) {
    return [
      EtherToken.address,
      TokenFRTProxy.address,
      TokenGNO.address,
      TokenOWLProxy.address
    ]


  }
}

async function getWhitelistedTokens(priceOracleImpl, networkId) {
  const priceOracleAddress = priceOracleImpl === 'DutchXPriceOracle' ?
    await getDXContractAddresses('DutchExchangeProxy') :
    await getPriceOracleAddress(priceOracleImpl)

  console.log(`Price Orcale Implementation -- ${priceOracleImpl} at ${priceOracleAddress}`)

  const whiteList = await WhitelistPriceOracle.at(priceOracleAddress)
  // console.log('whiteList: ', whiteList);

  console.log('isLocalGanache(networkId): ', isLocalGanache(networkId));
  console.log('networkId: ', networkId);
  const tokensToCheck = possibleWhitelistedTokens(networkId)
  if (!tokensToCheck || tokensToCheck.length === 0) return []

  if (isLocalGanache(networkId)) {
    console.log('In local Ganache');
    console.log('Whitelisting available tokens for testing');
    try {
      await whiteList.updateApprovalOfToken(tokensToCheck, true)
    } catch (error) {
      console.error('error whitelisting tokens', error);

    }
  }

  const approvedMapping = await whiteList.getApprovedAddressesOfList(tokensToCheck)
  console.log('approvedMapping: ', approvedMapping);
  const approvedTokens = tokensToCheck.filter((addr, i) => approvedMapping[i])

  // const ApprovalEvents = await whiteList.getPastEvents('Approval', { fromBlock })
  // // console.log('ApprovalEvents: ', ApprovalEvents);

  // const approvedTokens = new Set()
  // const unapprovedTokens = new Set()
  // for (const { returnValues: { token, approved } } of ApprovalEvents.reverse()) {
  //   if (!approved) unapprovedTokens.add(token)
  //   else if (!unapprovedTokens.has(token)) approvedTokens.add(token)
  // }

  // const tokensPromised = []

  // console.log('approvedTokens: ', approvedTokens);
  // for (addr of approvedTokens) {
  //   tokensPromised.push(wrapToken(addr))
  // }
  // const tokens = await Promise.all(tokensPromised)
  const tokens = await Promise.all(approvedTokens.map(wrapToken))
  // console.log('tokens: ', tokens);

  return tokens.filter(Boolean)
}

async function wrapToken(address) {
  // console.log('address: ', address);
  try {
    const Token = await TestToken.at(address)
    const [name, symbol, decimals] = await Promise.all([
      Token.name(),
      Token.symbol(),
      Token.decimals(),
    ])

    Token.name = name
    Token.symbol = symbol
    Token.decimals = decimals.toString()

    return Token

  } catch (error) {
    console.log('error: ', address, error.message);

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

    // console.log(`Batch ${batch.name} compiled`)
    // console.log('batch: ', batch.methods[0], batch.execute);
    return batch
  }

  console.log('tokens.length: ', tokens.length);
  const postprocessBatchResponse = rxjs.pipe(
    // rxjsOps.tap(console.log),
    rxjsOps.pluck('response'),
    rxjsOps.concatAll(),
    // rxjsOps.tap(console.log),
    rxjsOps.bufferCount(tokens.length),
    // rxjsOps.tap(balanceBatch => console.log('balanceBatch.length', balanceBatch.length)),
    rxjsOps.map(balanceBatch => balanceBatch.reduce((accum, bal, i) => {
      // console.log('bal: ', bal)
      // console.log('bal: ', bal, web3.eth.abi.decodeParameter('uint', bal))
      const balance = web3.eth.abi.decodeParameter('uint', bal)
      if (!balance.isZero()) {
        const token = tokens[i]
        accum[token.symbol] = balance.toString() / (10 ** token.decimals)
      }
      return accum
    }, {})),
    rxjsOps.toArray()
    // rxjsOps.tap(console.log)
    // rxjsOps.map(balanceBatchofBatch => balanceBatchofBatch.reduce((accum, bal, i) => {
    //   console.log('bal: ', bal)
    //   console.log('bal: ', bal, web3.eth.abi.decodeParameter('uint', bal))
    //   if (true || !bal.isZero()) {
    //     const token = tokens[i]
    //     accum[token.symbol] = bal.toString() / (10 ** token.decimals)
    //   }
    //   return accum
    // }, {}))
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
    // postprocessBatchRequest,
    // rxjsOps.bufferCount(tokens.length),
    // rxjsOps.map(balanceBatch => from(balanceBatch).pipe()
    //   balanceBatch.reduce((accum, bal, i) => {
    //   if (!bal.isZero()) {
    //     const token = tokens[i]
    //     accum[token.symbol] = bal.toString() / (10 ** token.decimals)
    //   }
    //   return accum
    // }, {})
    // rxjsOps.map(balances => balances.reduce((accum, balance, i) => {
    //   // const { withBalance, withoutBalance } = accum
    //   // if (balance > 0) withBalance[accounts[i]] = balance
    //   // else withoutBalance.push(accounts[i])
    //   // return accum
    //   accum[accounts[i]] = balance
    // }, {}))
  )

  const acc2bal = await streamline(accounts, {
    batchSize,
    maxConcurrent,
    processSlice,
    postprocess,
  })

  console.log('acc2bal: ', acc2bal);
  return acc2bal

  // const balArrs = await batchExecute(accsSlice => {
  //   return Promise.all(

  //     accsSlice.map(async acc => {
  //       const token2bal = await Promise.all(tokens.map(async t => {
  //         // MGN Mock doesn'thave .balanceOf
  //         if (typeof t[fname] !== 'function') return
  //         const bal = await t[fname](acc)
  //         if (bal.isZero()) return
  //         return {
  //           [t.symbol]: bal.toString() / (10 ** t.decimals)
  //         }
  //       }))

  //       if (token2bal.every(b => !b)) return

  //       return Object.assign({}, ...token2bal)
  //     }))
  // }, { batchSize: batchSizeWithTokens, maxConcurrent, log: batchSize && batchSizeWithTokens < accounts.length }, accounts)

  // const acc2Balances = [].concat(...balArrs)

  // const acc2Balances = await Promise.all(
  //   // TODO: batch and flatmap

  //   accounts.map(async acc => {
  //     const token2bal = await Promise.all(tokens.map(async t => {
  //       // MGN Mock doesn'thave .balanceOf
  //       if (typeof t[fname] !== 'function') return
  //       const bal = await t[fname](acc)
  //       if (bal.isZero()) return
  //       return {
  //         [t.symbol]: bal.toString() / (10 ** t.decimals)
  //       }
  //     }))

  //     if (token2bal.every(b => !b)) return

  //     return Object.assign({}, ...token2bal)
  //   }))

  // return accounts.reduce((accum, acc, i) => {
  //   if (acc2Balances[i]) accum[acc] = acc2Balances[i]
  //   return accum
  // }, {})
}

async function getTimesStr({
  DxGenAuction,
  DxLockEth,
  DxLockMgn,
  DxLockWhitelisted
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
    DxLockMgn.lockingStartTime.call(),
    DxLockMgn.lockingEndTime.call(),
    DxLockMgn.redeemEnableTime.call(),
    DxLockEth.lockingStartTime.call(),
    DxLockEth.lockingEndTime.call(),
    DxLockEth.redeemEnableTime.call(),
    DxLockWhitelisted.lockingStartTime.call(),
    DxLockWhitelisted.lockingEndTime.call(),
    DxLockWhitelisted.redeemEnableTime.call(),
    DxGenAuction.auctionsStartTime.call(),
    DxGenAuction.auctionsEndTime.call(),
    DxGenAuction.redeemEnableTime.call(),
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
    auctionId = await getCurrentAuctionId(DxGenAuction);
  }

  return `
  Now: ${now.toUTCString()} \t current block: ${blockNumber}
  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  DxLockMgn:\t\t\t\t\t | DxLockEth:\t\t\t\t\t | DxLockWhitelisted:\t\t\t\t | DxGenAuction:
  lock start: ${mgnStart.toUTCString()}\t | lock start: ${ethStart.toUTCString()}\t | lock start: ${tokenStart.toUTCString()}\t | auctions start: ${auctionStart.toUTCString()}
  lock end: ${mgnEnd.toUTCString()}\t | lock end: ${ethEnd.toUTCString()}\t | lock end: ${tokenEnd.toUTCString()}\t | auctions end: ${auctionEnd.toUTCString()}
  redeem: ${mgnRedeem.toUTCString()}\t\t | redeem: ${ethRedeem.toUTCString()}\t | redeem: ${tokenRedeem.toUTCString()}\t | redeem: ${auctionRedeem.toUTCString()}
  -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  period: ${mgnPeriod}\t\t\t\t | period: ${ethPeriod}\t\t\t\t | period: ${tokenPeriod}\t\t\t\t | period: ${auctionPeriod}   ${auctionId !== undefined ? `auctionId: ${auctionId}` : ''}
  `
}

function main() {
  const options = parseArgv()
  return run(options)
}


module.exports = cb => main().then(() => cb(), cb)
