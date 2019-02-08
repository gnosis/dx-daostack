/**
 * truffle exec trufflescripts/count_REP.js
 * to get REP locking nad accumulated REP data for
 * @flags:
 * -a <address>,<address>       for addresses
 * -i <path>                    file with \n delimited addresses
 * -n <path>                    path to network.json file
 * --mgn <address>              DxLockMgnForRep address
 * --eth <address>              DxLockEth4Rep address
 * --tkn <address>              DxLockWhitelisted4Rep address
 * --auc <address>              DxGenAuction4Rep  address
 * -o <path>                    output file path
 */

/**
 * examples:
 * $ npx truffle exec trufflescripts/count_REP.js --network mainnet -a 0x123,0x456 -n ./networks.json
 * calculates reputation for the two provided accounts
 * for contracts on mainnet at addresses from ./networks.json
 * 
 * $ npx truffle exec trufflescripts/count_REP.js --network rinkeby -o ./out.json
 * calculates reputation for all accounts for which there were Lcok/Bid events
 * for contracts on mainnet at addresses from artifacts in ./build/contracts
 * and outputs formatted data to ./out.json
 * 
 * $ npx truffle exec trufflescripts/count_REP.js --network rinkeby --mgn 0x1234
 * calculates reputation for all accounts for which there were Lcok/Bid events
 * for contracts on mainnet at addresses from artifacts in ./build/contracts
 * except for DxLockMgnForRep whose address is provided in --mgn flag
 * 
 */

const DxGenAuction4Rep = artifacts.require('DxGenAuction4Rep')
const DxLockEth4Rep = artifacts.require('DxLockEth4Rep')
const DxLockMgnForRep = artifacts.require('DxLockMgnForRep')
const DxLockWhitelisted4Rep = artifacts.require('DxLockWhitelisted4Rep')

const path = require('path')
const fs = require('fs')

const argv = require('minimist')(process.argv.slice(2),
  { string: ['a', 'mgn', 'eth', 'tkn', 'auc'] })

const BN = require('bignumber.js')

const decimals18 = new BN(1e18)
const Day_IN_SEC = new BN(24 * 60 * 60)


const cwd = path.resolve(__dirname, '../')
let accounts = argv.a ? argv.a.toLowerCase().split(',') : []
if (argv.i) {
  const inputFile = fs.readFileSync(path.resolve(cwd, argv.i), 'utf8')
  const accsFromFile = inputFile.split('\n').filter(Boolean)
  accounts.push(...accsFromFile)
  accounts = Array.from(new Set(accounts))
}


const main = async () => {
  console.log('Getting contracts');
  const contracts = await getContracts(argv)
  const {
    DxLockMgnForRep,
    DxLockEth4Rep,
    DxLockWhitelisted4Rep,
    DxGenAuction4Rep
  } = contracts

  console.log('\nDxLockMgnForRep: ', DxLockMgnForRep.address);
  console.log('DxLockEth4Rep: ', DxLockEth4Rep.address);
  console.log('DxLockWhitelisted4Rep: ', DxLockWhitelisted4Rep.address);
  console.log('DxGenAuction4Rep: ', DxGenAuction4Rep.address);

  // get Lock/Bid events
  const [LockBidEvents, participatingAccounts] = await getLockedBid(accounts, contracts)
  // console.log('LockBidEvents: ', JSON.stringify(LockBidEvents, null, 2));

  // get locked/bid amounts
  const LockBidAmounts = await displayAccountsSubmissions(LockBidEvents, contracts, participatingAccounts)
  // console.log('LockBidAmounts: ', JSON.stringify(LockBidAmounts, null, 2));

  // get expected reputation
  const ExpectedREP = await displayExpectedRep(LockBidAmounts, contracts, participatingAccounts)
  // console.log('ExpectedREP: ', JSON.stringify(ExpectedREP, null, 2));

  if (argv.o) {
    console.log('Parsed output is saved to', argv.o);
    writeToFile(path.resolve(cwd, argv.o), {
      LockBidEvents,
      LockBidAmounts,
      ExpectedREP
    })
  }
}

function writeToFile(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2))
}

async function displayExpectedRep(data, contracts) {
  console.log('Expected Reputation:\n');
  // console.log('data: ', JSON.stringify(data, null, 2));
  const {
    DxLockMgnForRep,
    DxLockEth4Rep,
    DxLockWhitelisted4Rep,
    DxGenAuction4Rep
  } = contracts

  const [
    MGNreputationReward,
    MGNtotalScore,
    ETHreputationReward,
    ETHtotalScore,
    TKNreputationReward,
    TKNtotalScore,
    GENauctionReputationReward,
    numberOfAuctions,
  ] = (await Promise.all([
    DxLockMgnForRep.reputationReward(),
    DxLockMgnForRep.totalScore(),
    DxLockEth4Rep.reputationReward(),
    DxLockEth4Rep.totalScore(),
    DxLockWhitelisted4Rep.reputationReward(),
    DxLockWhitelisted4Rep.totalScore(),
    DxGenAuction4Rep.auctionReputationReward(),
    DxGenAuction4Rep.numberOfAuctions(),
  ])).map(n => new BN(n.toString()))

  const MGNtotalRep = MGNreputationReward
  console.log('All REP earned from DxLockMgnForRep:', MGNtotalRep.div(decimals18).toString());

  const ETHtotalRep = ETHreputationReward
  console.log('All REP earned from DxLockEth4Rep:', ETHtotalRep.div(decimals18).toString());

  const TKNtotalRep = TKNreputationReward
  console.log('All REP earned from DxLockWhitelisted4Rep:', TKNtotalRep.div(decimals18).toString());
  
  const result = {}
  
  const GenTotalBidsPerAuction = await Promise.all(Array.from({ length: numberOfAuctions.toString() },
    (_, i) => DxGenAuction4Rep.auctions(i).then(n => new BN(n.toString())))
  )
  // console.log('GenTotalBidsPerAuction: ', GenTotalBidsPerAuction);
  const GenAuctionsWithBidsN = GenTotalBidsPerAuction.filter(n => n.gt(new BN(0))).length
  const GENtotalRep = GENauctionReputationReward.mul(new BN(GenAuctionsWithBidsN))
  console.log('All REP earned from DxGenAuction4Rep:', GENtotalRep.div(decimals18).toString());

  const totalREP = MGNtotalRep.add(ETHtotalRep).add(TKNtotalRep).add(GENtotalRep)

  console.log('Total REP over the 4 schemes:', totalREP.div(decimals18).toString())

  const calcFunctions = {
    DxLockMgnForRep: function ({ total }) {
      const score = total
      return [score.mul(MGNreputationReward).div(MGNtotalScore)]
    },
    DxLockEth4Rep: function ({ totalPerPeriod }) {
      let totalScore = new BN(0)
      const scorePerPeriod = {}
      for (const period of Object.keys(totalPerPeriod)) {
        const amount = totalPerPeriod[period]
        scorePerPeriod[period] = new BN(period).mul(amount)
        totalScore = totalScore.add(scorePerPeriod[period])
      }
      return [totalScore.mul(ETHreputationReward).div(ETHtotalScore), totalScore, scorePerPeriod]
    },
    DxLockWhitelisted4Rep: function ({ byToken }) {
      const scorePerToken = {}
      let totalScore = new BN(0)
      for (const token of Object.keys(byToken)) {
        const { prices, amounts, periods, lockingIds, symbol, decimals } = byToken[token]

        scorePerToken[token] = { symbol, decimals }

        scorePerToken[token].submissions = periods.map((period, i) => {

          const price = prices[i]
          const [num, den] = price
          const amount = amounts[i]
          const score = new BN(period).mul(amount).mul(new BN(num)).div(new BN(den))

          totalScore = totalScore.add(score)

          return { period, amount, price, score, lockingId: lockingIds[i] }
        })
      }

      return [totalScore.mul(TKNreputationReward).div(TKNtotalScore), scorePerToken]
    },
    DxGenAuction4Rep: function ({ totalPerAuctionId }) {
      const repPerAuctionId = {}
      let totalRep = new BN(0)
      for (const auctionId of Object.keys(totalPerAuctionId)) {
        const bid = totalPerAuctionId[auctionId]
        const totalBid = GenTotalBidsPerAuction[auctionId]

        repPerAuctionId[auctionId] = bid.mul(GENauctionReputationReward).div(totalBid)
        totalRep = totalRep.add(repPerAuctionId[auctionId])
      }

      return [totalRep, repPerAuctionId]
    }
  }
  for (const account of Object.keys(data)) {
    const {
      DxLockMgnForRep: MgnRep,
      DxLockEth4Rep: EthRep,
      DxLockWhitelisted4Rep: TknRep,
      DxGenAuction4Rep: GenRep
    } = data[account]

    let totalRepForAccount = new BN(0)

    console.log('\n=========================');
    console.log('Account', account);
    console.log('Expected reputation from:');

    if (MgnRep) {

      console.log('\nDxLockMgnForRep at', DxLockMgnForRep.address);
      const [reputation] = calcFunctions.DxLockMgnForRep(MgnRep)
      console.log('reputation from MGN: ', reputation.div(decimals18).toString(), 'REP');

      totalRepForAccount = totalRepForAccount.add(reputation)
      const percent = reputation.mul(new BN(100)).div(MGNtotalRep) + '%'

      result[account] = {
        ...result[account],
        MGN: {
          reputation,
          percent
        }
      }
    }
    if (EthRep) {

      console.log('\nDxLockEth4Rep at', DxLockEth4Rep.address);
      const [reputation, totalScore, scorePerPeriod] = calcFunctions.DxLockEth4Rep(EthRep)
      console.log('reputation from ETH: ', reputation.div(decimals18).toString(), 'REP');

      totalRepForAccount = totalRepForAccount.add(reputation)
      const percent = reputation.mul(new BN(100)).div(ETHtotalRep) + '%'

      result[account] = {
        ...result[account],
        ETH: {
          reputation,
          percent,
          totalScore,
          scorePerPeriod
        }
      }

    }
    if (TknRep) {

      console.log('\nDxLockWhitelisted4Rep at', DxLockWhitelisted4Rep.address);
      const [reputation, scorePerToken] = calcFunctions.DxLockWhitelisted4Rep(TknRep)
      const symbols = Object.values(scorePerToken).map(t => t.symbol)
      console.log(`reputation from Tokens ${symbols.join(', ')}: `, reputation.div(decimals18).toString(), 'REP');

      totalRepForAccount = totalRepForAccount.add(reputation)
      const percent = reputation.mul(new BN(100)).div(TKNtotalRep) + '%'

      result[account] = {
        ...result[account],
        Tokens: {
          reputation,
          percent,
          scorePerToken
        }
      }
    }
    if (GenRep) {

      console.log('\nDxGenAuction4Rep at', DxGenAuction4Rep.address);
      const [reputation, repPerAuctionId] = calcFunctions.DxGenAuction4Rep(GenRep)
      console.log('reputation from GEN auction: ', reputation.div(decimals18).toString(), 'REP');

      totalRepForAccount = totalRepForAccount.add(reputation)
      const percent = reputation.mul(new BN(100)).div(GENtotalRep) + '%'

      result[account] = {
        ...result[account],
        GEN: {
          reputation,
          percent,
          repPerAuctionId
        }
      }
    }

    if (totalRepForAccount.gt(new BN(0))) {
      console.log('\nTotal REP for account: ', totalRepForAccount.div(decimals18).toString(), 'REP');
      const percent = totalRepForAccount.mul(new BN(100)).div(totalREP) + '%'
      console.log('\nPercent of total REP over all 4 schemes:', percent);

      result[account].reputation = totalRepForAccount
      result[account].percent = percent
    }
  }

  return result

}

async function displayAccountsSubmissions(data, contracts) {
  const {
    DxLockMgnForRep,
    DxLockEth4Rep,
    DxLockWhitelisted4Rep,
    DxGenAuction4Rep
  } = contracts

  const result = {}
  const accounts = Object.keys(data)
  console.log(`\nParticipating accounts:\n\t${accounts.join(',\n\t')}`);
  console.log('\n\nSubmissions data');

  for (const account of accounts) {
    console.log('============================================');
    console.log('\naccount: ', account);

    const {
      DxLockMgnForRep: MgnEvents,
      DxLockEth4Rep: EthEvents,
      DxLockWhitelisted4Rep: TknEvents,
      DxGenAuction4Rep: GenBids
    } = data[account]


    if (MgnEvents && MgnEvents.length) {
      console.log('\t------------------------------');
      console.log('\n\tLocked MGN for REP in DxLockMgnForRep at', DxLockMgnForRep.address);

      const lockingIds = []
      const lockedPerId = {}
      for (const { _amount, _lockingId } of MgnEvents) {
        lockingIds.push(_lockingId)
        lockedPerId[_lockingId] = new BN(_amount)
      }
      const total = Object.values(lockedPerId).reduce((sum, am) => sum.add(am), new BN(0))
      console.log('\n\tLocked amount', total.div(decimals18).toString(), 'MGN');
      console.log('\tlockingIds: ', Object.keys(lockedPerId).join(', '));

      result[account] = {
        DxLockMgnForRep: {
          lockingIds,
          lockedPerId,
          total
        }
      }
    }

    if (EthEvents && EthEvents.length) {
      console.log('\t------------------------------');
      console.log('\n\tLocked ETH for REP in DxLockEth4Rep at', DxLockEth4Rep.address);

      const totalPerPeriod = {}
      const lockingIdsPerPeriod = {}
      const lockedPerId = {}
      for (const { _amount, _period, _lockingId } of EthEvents) {
        const amount = new BN(_amount)

        if (!totalPerPeriod[_period]) totalPerPeriod[_period] = new BN(0)
        if (!lockingIdsPerPeriod[_period]) lockingIdsPerPeriod[_period] = []

        totalPerPeriod[_period] = totalPerPeriod[_period].add(amount)
        lockingIdsPerPeriod[_period].push(_lockingId)

        lockedPerId[_lockingId] = amount
      }

      for (const period of Object.keys(totalPerPeriod)) {
        const amount = totalPerPeriod[period].div(decimals18)
        const lockingIds = lockingIdsPerPeriod[period]

        console.log(`\t${amount.toString()} ETH for ${period} sec == ${new BN(period).div(Day_IN_SEC)} days`);
        console.log('\tlockingIds:', lockingIds.join(', '));
      }

      const total = Object.values(lockedPerId).reduce((sum, am) => sum.add(am), new BN(0))
      console.log('\ttotal locked:', total.div(decimals18).toString(), 'ETH');

      result[account] = {
        ...result[account],
        DxLockEth4Rep: {
          totalPerPeriod,
          lockingIdsPerPeriod,
          lockedPerId,
          total
        }
      }
    }

    if (TknEvents && TknEvents.length) {
      console.log('\t------------------------------');
      console.log('\n\tLocked Tokens for REP in DxLockWhitelisted4Rep at', DxLockWhitelisted4Rep.address);

      const priceOracleAddress = await DxLockWhitelisted4Rep.priceOracleContract()

      const lockingIds = [], amounts = [], periods = [], lockingId2blockNumber = {}
      for (const { _amount, _lockingId, _period, blockNumber } of TknEvents) {
        amounts.push(new BN(_amount))
        periods.push(_period)

        lockingIds.push(_lockingId)
        lockingId2blockNumber[_lockingId] = blockNumber
      }

      const tokenAddresses = await Promise.all(lockingIds.map(id => DxLockWhitelisted4Rep.lockedTokens(id)))

      const token2id_amounts = lockingIds.reduce((accum, id, i) => {
        const token = tokenAddresses[i].toLowerCase()
        if (!accum[token]) accum[token] = {
          lockingIds: [],
          amounts: [],
          totalPerPeriod: {},
          periods: [],
          total: new BN(0),
        }

        const tokenObj = accum[token]
        tokenObj.lockingIds.push(id)
        tokenObj.amounts.push(amounts[i])
        tokenObj.periods.push(periods[i])
        tokenObj.total = tokenObj.total.add(amounts[i])

        if (!tokenObj.totalPerPeriod[periods[i]]) tokenObj.totalPerPeriod[periods[i]] = new BN(0)

        tokenObj.totalPerPeriod[periods[i]] = tokenObj.totalPerPeriod[periods[i]].add(amounts[i])

        return accum
      }, {})


      for (const token of Object.keys(token2id_amounts)) {
        const [symbol, decimals, blockNumber2Price] = await Promise.all([
          getTokenSymbol(token),
          getTokenDecimals(token),
          getTokenPricesAtBlocks(token, Object.values(lockingId2blockNumber), priceOracleAddress),
        ])

        const { total, lockingIds, totalPerPeriod, periods, amounts } = token2id_amounts[token]

        const prices = token2id_amounts[token].prices = lockingIds.map(id => blockNumber2Price[lockingId2blockNumber[id]])

        token2id_amounts[token].symbol = symbol
        token2id_amounts[token].decimals = decimals.toString()

        const decimalsN = new BN(10).pow(decimals)

        for (let i = 0, len = amounts.length; i < len; ++i) {
          const period = periods[i]
          const [num, den] = prices[i]
          const amount = amounts[i]
          console.log(`\tLocked ${amount.div(decimalsN).toString()} ${symbol} for ${period} sec == ${new BN(period).div(Day_IN_SEC)} days`);
          console.log(`\tat ${num}/${den} price`);
        }

        console.log()

        for (const period of Object.keys(totalPerPeriod)) {
          const totalForPeriod = totalPerPeriod[period]
          console.log(`\tTotal locked ${totalForPeriod.div(decimalsN).toString()} ${symbol} for ${period} sec == ${new BN(period).div(Day_IN_SEC)} days`);
        }

        console.log('\n\tAll in all locked', total.div(decimalsN).toString(), symbol);
        console.log('\tlockingIds:', lockingIds.join(', '));
        console.log();
      }

      result[account] = {
        ...result[account],
        DxLockWhitelisted4Rep: {
          byToken: token2id_amounts
        }
      }
    }

    if (GenBids && GenBids.length) {
      console.log('\t------------------------------');
      console.log('\n\tBid GEN for REP in DxGenAuction4Rep at', DxGenAuction4Rep.address);

      const totalPerAuctionId = {}
      for (const { _amount, _auctionId } of GenBids) {
        const amount = new BN(_amount)

        if (!totalPerAuctionId[_auctionId]) totalPerAuctionId[_auctionId] = new BN(0)

        totalPerAuctionId[_auctionId] = totalPerAuctionId[_auctionId].add(amount)
      }

      console.log('\n\tAuction\tBid amount GEN');
      for (const auctionId of Object.keys(totalPerAuctionId)) {
        const amount = totalPerAuctionId[auctionId].div(decimals18)

        console.log(`\t${+auctionId + 1}\t${amount.toString()}`);
      }

      result[account] = {
        ...result[account],
        DxGenAuction4Rep: {
          totalPerAuctionId
        }
      }
    }

  }

  return result
}

const address2symbol = {}
async function getTokenSymbol(address) {
  address = address.toLowerCase()
  if (address2symbol[address]) return address2symbol[address]

  const request = {
    data: '0x95d89b41',
    to: address
  }

  const symbolHex = await web3.eth.call(request)
  return address2symbol[address] = web3.utils.toUtf8(symbolHex).replace(/\s||\u0000/g, '')
}

const address2decimals = {}
async function getTokenDecimals(address) {
  address = address.toLowerCase()
  if (address2decimals[address]) return address2decimals[address]

  const request = {
    data: '0x313ce567',
    to: address
  }

  const decimalsHex = await web3.eth.call(request)
  return address2decimals[address] = new BN(decimalsHex)
}

const MiniOracle = new web3.eth.Contract([{
  "constant": true,
  "inputs": [
    {
      "name": "token",
      "type": "address"
    }
  ],
  "name": "getPrice",
  "outputs": [
    {
      "name": "num",
      "type": "uint256"
    },
    {
      "name": "den",
      "type": "uint256"
    }
  ],
  "payable": false,
  "stateMutability": "view",
  "type": "function"
}])
const addressAndblockNumber2prices = {}

async function getTokenPricesAtBlocks(address, blockNumbers, oracleAddress) {
  address = address.toLowerCase()

  MiniOracle.options.address = oracleAddress

  const prices = await Promise.all(
    blockNumbers.map(async n => {
      const cachedKey = address + '@' + n
      if (addressAndblockNumber2prices[cachedKey]) return addressAndblockNumber2prices[cachedKey]

      const { num, den } = await MiniOracle.methods.getPrice(address).call(n)
      return addressAndblockNumber2prices[cachedKey] = [num, den]
    })
  )

  const bn2prices = blockNumbers.reduce((accum, n, i) => {
    accum[n] = prices[i]
    return accum
  }, {})

  return bn2prices
}

async function getLockedBid(accounts, contracts) {
  const LockOptions = {
    fromBlock: 0,
    toBlock: 'latest',
    filter: accounts && accounts.length && { _locker: accounts }
  }
  const BidOptions = {
    fromBlock: 0,
    toBlock: 'latest',
    filter: accounts && accounts.length && { _bidder: accounts }
  }

  const {
    DxLockMgnForRep,
    DxLockEth4Rep,
    DxLockWhitelisted4Rep,
    DxGenAuction4Rep
  } = contracts


  console.log('Fetching Lock events from DxLockMgnForRep');
  const MgnLocks = await retryPromise(() => DxLockMgnForRep.getPastEvents('Lock', LockOptions))

  console.log('Fetching Lock events from DxLockEth4Rep');
  const EthLocks = await retryPromise(() => DxLockEth4Rep.getPastEvents('Lock', LockOptions))

  console.log('Fetching Lock events from DxLockWhitelisted4Rep');
  const TknLocks = await retryPromise(() => DxLockWhitelisted4Rep.getPastEvents('Lock', LockOptions))

  console.log('Fetching Bid events from DxGenAuction4Rep');
  const GenBids = await retryPromise(() => DxGenAuction4Rep.getPastEvents('Bid', BidOptions))

  let participatingAccounts = new Set()

  const gatherEventsPerAddress = (events) => {
    return events.reduce((accum, event) => {
      const { returnValues } = event
      returnValues.event = event.event
      returnValues.blockNumber = event.blockNumber
      returnValues.tx = event.transactionHash

      const addr = (returnValues._locker || returnValues._bidder).toLowerCase()
      participatingAccounts.add(addr)

      if (!accum[addr]) accum[addr] = []
      accum[addr].push(returnValues)

      return accum
    }, {})
  }


  MgnEvents = gatherEventsPerAddress(MgnLocks),
    EthEvents = gatherEventsPerAddress(EthLocks),
    TknEvents = gatherEventsPerAddress(TknLocks),
    GenEvents = gatherEventsPerAddress(GenBids)

  participatingAccounts = Array.from(participatingAccounts)
  // console.log('participatingAccounts: ', participatingAccounts);

  const eventsPerAddress = participatingAccounts.reduce((accum, acc) => {
    accum[acc] = {
      DxLockMgnForRep: MgnEvents[acc],
      DxLockEth4Rep: EthEvents[acc],
      DxLockWhitelisted4Rep: TknEvents[acc],
      DxGenAuction4Rep: GenEvents[acc],
    }
    return accum
  }, {})

  // console.log('eventsPerAddress: ', JSON.stringify(eventsPerAddress, null, 2));

  return [eventsPerAddress, participatingAccounts]
}

async function getContracts({ mgn, eth, tkn, auc, n }) {
  const artifacts = {
    DxLockMgnForRep,
    DxLockEth4Rep,
    DxLockWhitelisted4Rep,
    DxGenAuction4Rep
  }

  const contractNames = Object.keys(artifacts)

  const addresses = {
    DxLockMgnForRep: mgn,
    DxLockEth4Rep: eth,
    DxLockWhitelisted4Rep: tkn,
    DxGenAuction4Rep: auc
  }

  // console.log('addresses: ', addresses);
  let networkAddresses = {}
  const networkId = await web3.eth.net.getId()
  console.log('networkId: ', networkId);

  if (!Object.values(addresses).every(Boolean) && n) {
    console.log('Using addresses from', n);
    const networks = require(path.resolve(cwd, n))
    networkAddresses = contractNames.reduce((accum, name) => {
      accum[name] = networks[name][networkId].address
      return accum
    }, {})
  }
  // console.log('networkAddresses: ', networkAddresses);

  const deployed = await Promise.all(contractNames.map(name => {
    const addr = addresses[name] || networkAddresses[name]
    if (addr) return artifacts[name].at(addresses[name] || networkAddresses[name])
      .catch(() => artifacts[name].deployed())

    return artifacts[name].deployed()
  }))

  return contractNames.reduce((accum, name, i) => {
    accum[name] = deployed[i]
    return accum
  }, {})
}

const MAX_TRIES = 15
function retryPromise(execPromise, tryN = 1) {
  if (tryN > MAX_TRIES) return Promise.reject('number of tries exceeded', MAX_TRIES, '\taborting')
  console.log('try', tryN)
  return execPromise().catch(() => retryPromise(execPromise, tryN + 1))
}


module.exports = cb => main().then(() => cb(), cb)
