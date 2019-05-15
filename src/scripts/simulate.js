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

const { getTimestamp, increaseTimeAndMine, takeSnapshot, revertSnapshot } = require('../helpers/web3helpers')(web3)


const DEFAULT_MNEMONIC = 'candy maple cake sugar pudding cream honey rich smooth crumble sweet treat'

const priceOracleImpl = process.env.PRICE_ORACLE_IMPL || 'DutchXPriceOracle'
const mgnImpl = process.env.MGN_IMPL || 'TokenFRTProxy'


const privateKeys = process.env.PK && process.env.PK.split(',')
const mnemonic = process.env.MNEMONIC || DEFAULT_MNEMONIC
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

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



function createProvider(url, accounts) {
  return new HDWalletProvider(
    mnemonic,
    url,
    0,
    accounts
  )
}

function createWeb3({ network, accounts }) {
  const prov = createProvider(network2URL[network], accounts)
  return new Web3(prov)
}

async function getContracts(web3) {
  DxGenAuction4Rep.setProvider(web3.currentProvider)
  DxLockEth4Rep.setProvider(web3.currentProvider)
  DxLockMgnForRep.setProvider(web3.currentProvider)
  DxLockWhitelisted4Rep.setProvider(web3.currentProvider)

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

async function getBalances(web3, accs) {
  const balances = await Promise.all(accs.map(acc => web3.eth.getBalance(acc)))
  // console.log('balances: ', balances);

  return accs.reduce((accum, acc, i) => {
    const bal = balances[i]
    if (bal > 0) accum[acc] = bal
    return accum
  }, {})
}

async function run(options) {
  // console.log('options: ', options);

  const wa3 = createWeb3(options)
  const { network, fromBlock, useHelper } = options

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

  const contracts = await getContracts(wa3)

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


  const accs = wa3.currentProvider.addresses
  const accsN = accs.length
  const acc2bal = await getBalances(web3, accs)
  withBalance = Object.keys(acc2bal)
  console.log(`Available ${accsN} accounts`);
  console.log(`${withBalance.length || 'None'} of them have balance\n`);



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
      disabled: !mgnMock ? `Can't mint with ${mgnImpl}` : !isMgnOwner && !MGNownerless && `Only owner can mint`
    },
    'Register for future MGN claiming',
    'Print accounts registered for future MGN claiming',
    {
      name: 'Give a Token',
      disabled: !tokens.length && 'No whitelisted tokens'
    },
    new inquirer.Separator(),
    'Lock ETH for REP',
    'Lock MGN for REP',
    'Lock Token for REP',
    'Bid GEN',
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
    cont = await act(answ.action, { web3, wa3, accs, master, contracts, tokens, mgn, tvalue, gen })
  } while (cont)

}

let AGREEMENT_HASH

const snapshots = {}
async function act(action, { web3, wa3, accs, master, contracts, tokens, mgn, tvalue, gen }) {
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
        const acc2bals = await getTokenBalances(tokens, [master])
        if (!acc2bals[master] || Object.keys(acc2bals[master]).length === 0) {
          console.log('Master has no Tokens');
          break;
        }
        printKV(acc2bals[master], `Master ${master} Token balance:`)
        break;
      }
    case 'Print account balances':
      await printAccBalances(web3, accs)
      break;
    case 'Print account Token balances':
      {
        const acc2bals = await getTokenBalances(tokens, accs)
        if (Object.keys(acc2bals).length === 0) {
          console.log('No account has Tokens');
          break;
        }
        printNestedKV(acc2bals, 'Accounts token balances')
        break;

      }
    case 'Print locked MGN':
      {
        const acc2bals = await getTokenBalances([mgn], accs, 'lockedTokenBalances')
        if (Object.keys(acc2bals).length === 0) {
          console.log('No account has MGN');
          break;
        }
        printNestedKV(acc2bals, `${Object.keys(acc2bals).length} accounts with MGN balances`)
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
            await tvalue.transferETH(accs, {
              from: master,
              value: web3.utils.toWei(String(answ.amount), 'ether')
            })
            return;
          }

          await Promise.all(accs.map(acc => web3.eth.sendTransaction({
            from: master,
            to: acc,
            value: web3.utils.toWei(String(perAcc), 'ether')
          })))
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
          await mgn.lockMultiple(web3.utils.toWei(String(perAcc), 'ether'), accs)
          // await Promise.all(accs.map(acc => mgn.lock(web3.utils.toWei(String(perAcc), 'ether'), acc, { from: master })))
        })
      }
      break;
    case 'Register for future MGN claiming':
      {
        console.log(`Registering ${accs.length} on DxLockMgnForRep`);
        AGREEMENT_HASH = AGREEMENT_HASH || await DxGenAuction.getAgreementHash()
        try {
          await Promise.all(accs.map(acc => DxLockMgn.register(AGREEMENT_HASH, { from: acc })))
        } catch (error) {
          console.error(error.message);
        }
      }
      break;
    case 'Print accounts registered for future MGN claiming':
      {
        const registered = await Promise.all(accs.map(acc => DxLockMgn.registrar(acc)))
        console.log(`${registered.filter(Boolean).length} accounts registered`);
        accs.forEach((acc, i) => {
          if (registered[i]) console.log(acc);
        })
      }
      break;
    case 'Give a Token':
      {
        const symbol2bal = (await getTokenBalances(tokens, [master]))[master]

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

            await token.approve(tvalue.address, String(wei), { from: master })

            await tvalue.transferToken(token.address, accs, String(wei), {
              from: master,
            })
            return;
          }


          const wei = perAcc * (10 ** token.decimals)

          await Promise.all(accs.map(acc => token.transfer(acc, String(wei), { from: master })))
        })
      }
      break;
    case 'Lock ETH for REP':
      {
        await loopTillSuccess(async () => {
          const answ = await inquirer.prompt([{
            name: 'period',
            type: 'number',
            message: 'Period to lock for, in sceonds',
          }, {
            name: 'amount',
            type: 'number',
            message: 'Amount to lock, in ETH'
          }])

          if (answ.period === 0 || answ.amount === 0) return;

          const value = web3.utils.toWei(String(answ.amount), 'ether')

          console.log(`${accs.length} accounts locking ${answ.amount} ETH in DxLockEth`);

          await Promise.all(accs.map(acc => DxLockEth.lock(answ.period, AGREEMENT_HASH, { from: acc, value })))
        })
      }
      break;
    case 'Lock MGN for REP':
      {
        await loopTillSuccess(async () => {

          AGREEMENT_HASH = AGREEMENT_HASH || await DxGenAuction.getAgreementHash()

          console.log(`${accs.length} accounts claiming locked MGN in DxLockMgn`);
          await Promise.all(accs.map(acc => DxLockMgn.claim(ZERO_ADDRESS, AGREEMENT_HASH, { from: acc })))

        })
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
            message: 'Period to lock for, in sceonds',
          }, {
            name: 'amount',
            type: 'number',
            message: 'Amount to lock, in ETH'
          }])

          if (answ.period === 0 || answ.amount === 0) return;

          const token = symbol2token[answ.symbol]

          const wei = answ.amount * (10 ** token.decimals)

          const allowance = (await token.allowance(accs[0], DxLockWhitelisted.address)).toString() / (10 ** t.decimals)
          if (amount < allowance.toString()) {
            const answ = await inquirer.prompt({
              name: 'allowance',
              type: 'number',
              message: 'Amount to approve DxLockWhitelisted to handle. Current allowance is ' + allowance,
              validate: (allow) => answ.amount < allow ? 'Insufficient allowance' : true
            })

            if (answ.allowance === 0) return;

            console.log('answ.allowance: ', answ.allowance);
            // first approve allowance
            if (answ.allowance) {
              console.log('Approving DxLockWhitelisted to handle Token transfers');
              await Promise.all(accs.map(acc => token.approve(DxLockWhitelisted.address, String(answ.allowance * (10 ** token.decimals)), { from: acc })))
            }
          }

          console.log(`${accs.length} accounts locking ${answ.amount} ${answ.symbol} in DxLockWhitelisted`);

          await Promise.all(accs.map(acc => DxLockWhitelisted.lock(String(wei), answ.period, token.address, AGREEMENT_HASH, { from: acc })))
        })
      }
      break;
    case 'Bid GEN':
      {
        const auctionId = await getCurrentAuctionId(DxGenAuction);
        await loopTillSuccess(async () => {
          const allowance = gen && (await gen.allowance(accs[0], DxGenAuction.address)).toString() / 1e18

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
            await Promise.all(accs.map(acc => gen.approve(DxGenAuction.address, web3.utils.toWei(answ.allowance, 'ether'), { from: acc })))
          }

          console.log(`${accs.length} accounts bidding ${answ.amount} GEN in auction #${auctionId} in DxLockWhitelisted`);

          AGREEMENT_HASH = AGREEMENT_HASH || await DxGenAuction.getAgreementHash()

          await Promise.all(accs.map(acc => DxGenAuction.bid(web3.utils.toWei(answ.amount, 'ether'), auctionId, AGREEMENT_HASH, { from: acc })))
        })
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

async function printAccBalances(web3, accs) {
  const acc2bal = await getBalances(web3, accs)
  if (Object.keys(acc2bal).length === 0) console.log('No account has balance');
  console.log('Displaying accounts with non-zero balances');
  printKV(acc2bal, 'Account\t : \t\t\t\tBalance ETH', { valTransform: v => v / 1e18 })
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

async function getTokenBalances(tokens, accounts, fname = 'balanceOf') {
  const acc2Balances = await Promise.all(
    accounts.map(async acc => {
      const token2bal = await Promise.all(tokens.map(async t => {
        const bal = await t[fname](acc)
        if (bal.isZero()) return
        return {
          [t.symbol]: bal.toString() / (10 ** t.decimals)
        }
      }))

      if (token2bal.every(b => !b)) return

      return Object.assign({}, ...token2bal)
    }))

  return accounts.reduce((accum, acc, i) => {
    if (acc2Balances[i]) accum[acc] = acc2Balances[i]
    return accum
  }, {})
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
    now
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
    getTimestamp()
  ])).map(d => new Date(d * 1000))

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
  Now: ${now.toUTCString()}
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
