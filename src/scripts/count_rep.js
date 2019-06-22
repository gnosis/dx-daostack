/* global artifacts, web3 */

/**
 * truffle exec src/scripts/count_rep.js
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
 * --from-block <number>        start querying events from block
 * --log                        print event fetching process
 */

/**
 * examples:
 * $ npx truffle exec src/scripts/count_rep.js --network mainnet -a 0x123,0x456 -n ./networks.json
 * calculates reputation for the two provided accounts
 * for contracts on mainnet at addresses from ./networks.json
 * 
 * $ npx truffle exec src/scripts/count_rep.js --network rinkeby -o ./out.json
 * calculates reputation for all accounts for which there were Lock/Bid events
 * for contracts on mainnet at addresses from artifacts in ./build/contracts
 * and outputs formatted data to ./out.json
 * 
 * $ npx truffle exec src/scripts/count_rep.js --network rinkeby --mgn 0x1234
 * calculates reputation for all accounts for which there were Lock/Bid events
 * for contracts on rinkeby at addresses from artifacts in ./build/contracts
 * except for DxLockMgnForRep whose address is provided in --mgn flag
 * 
 */

const DxGenAuction4Rep = artifacts.require('DxGenAuction4Rep')
const DxLockEth4Rep = artifacts.require('DxLockEth4Rep')
const DxLockMgnForRep = artifacts.require('DxLockMgnForRep')
const DxLockWhitelisted4Rep = artifacts.require('DxLockWhitelisted4Rep')

const path = require('path')
const fs = require('fs')

const { getPastEventsRx } = require('./utils')(web3)

const argv = require('minimist')(process.argv.slice(2),
  { string: ['a', 'mgn', 'eth', 'tkn', 'auc'] })

const BN = require('bignumber.js')

const decimals18 = new BN(1e18)
const Day_IN_SEC = new BN(24 * 60 * 60)


const cwd = path.resolve(__dirname, '../../')
let accounts = argv.a ? argv.a.toLowerCase().split(',') : []
if (argv.i) {
  const inputFile = fs.readFileSync(path.resolve(cwd, argv.i), 'utf8')
  const accsFromFile = inputFile.split('\n').filter(Boolean)
  accounts.push(...accsFromFile)
  accounts = Array.from(new Set(accounts))
}


const main = async () => {
  console.group('Getting contracts');
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

  console.groupEnd()

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
  console.log('\n============================================\n');
  console.group('Expected Reputation:\n');
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
    GENnumberOfAuctions,
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

  const MGNtotalPotentialRep = MGNreputationReward
  console.log('All REP potentially earned from DxLockMgnForRep:', MGNtotalPotentialRep.div(decimals18).toString());
  let MGNtotalDistributedRep
  if (MGNtotalScore.eq(new BN(0))) {
    console.log('None yet distributed')
    MGNtotalDistributedRep = new BN(0)
  } else {
    console.log('All distributed');
    MGNtotalDistributedRep = MGNtotalPotentialRep
  }

  const ETHtotalPotentialRep = ETHreputationReward
  console.log('\nAll REP potentially earned from DxLockEth4Rep:', ETHtotalPotentialRep.div(decimals18).toString());
  let ETHtotalDistributedRep
  if (ETHtotalScore.eq(new BN(0))) {
    console.log('None yet distributed')
    ETHtotalDistributedRep = new BN(0)
  } else {
    console.log('All distributed');
    ETHtotalDistributedRep = ETHtotalPotentialRep
  }

  const TKNtotalPotentialRep = TKNreputationReward
  console.log('\nAll REP potentially earned from DxLockWhitelisted4Rep:', TKNtotalPotentialRep.div(decimals18).toString());
  let TKNtotalDistributedRep
  if (TKNtotalScore.eq(new BN(0))) {
    console.log('None yet distributed')
    TKNtotalDistributedRep = new BN(0)
  } else {
    console.log('All distributed');
    TKNtotalDistributedRep = TKNtotalPotentialRep
  }


  const GenTotalBidsPerAuction = await Promise.all(Array.from({ length: GENnumberOfAuctions.toString() },
    (_, i) => DxGenAuction4Rep.auctions(i).then(n => new BN(n.toString())))
  )

  const { GenAuctionIdsWithBids, GENtotalDistributedRep } = GenTotalBidsPerAuction.reduce(
    (accum, bid, auctionId) => {
      if (bid.gt(new BN(0))) {
        accum.GENtotalDistributedRep = accum.GENtotalDistributedRep.add(GENauctionReputationReward)
        accum.GenAuctionIdsWithBids.push(auctionId)
      }
      return accum
    }, { GenAuctionIdsWithBids: [], GENtotalDistributedRep: new BN(0) }
  )
  // console.log('GenTotalBidsPerAuction: ', GenTotalBidsPerAuction);
  const GENtotalPotentialRep = GENauctionReputationReward.mul(GENnumberOfAuctions)
  console.log('\nAll REP potentially earned from DxGenAuction4Rep:', GENtotalPotentialRep.div(decimals18).toString(), 'over', GENnumberOfAuctions.toString(), 'auctions');

  if (!GENtotalPotentialRep.eq(GENtotalDistributedRep)) {
    console.log('Distributed only', GENtotalDistributedRep.div(decimals18).toString(), 'from auctions:', GenAuctionIdsWithBids.map(i => i + 1).join(', '));
  }

  const totalPotentialREP = MGNtotalPotentialRep.add(ETHtotalPotentialRep).add(TKNtotalPotentialRep).add(GENtotalPotentialRep)
  const totalDistributedREP = MGNtotalDistributedRep.add(ETHtotalDistributedRep).add(TKNtotalDistributedRep).add(GENtotalDistributedRep)

  console.log('\nTotal potential REP over the 4 schemes:', totalPotentialREP.div(decimals18).toString())
  if (!totalPotentialREP.eq(totalDistributedREP)) {
    console.log('Distributed only', totalDistributedREP.div(decimals18).toString());
  } else {
    console.log('All distributed');
  }

  const result = {}

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
      const percentOfPotential = reputation.mul(new BN(100)).div(MGNtotalPotentialRep) + '%'
      const percentOfDistributed = reputation.mul(new BN(100)).div(MGNtotalDistributedRep) + '%'

      result[account] = {
        ...result[account],
        MGN: {
          reputation,
          percentOfPotential,
          percentOfDistributed,
        }
      }
    }
    if (EthRep) {

      console.log('\nDxLockEth4Rep at', DxLockEth4Rep.address);
      const [reputation, totalScore, scorePerPeriod] = calcFunctions.DxLockEth4Rep(EthRep)
      console.log('reputation from ETH: ', reputation.div(decimals18).toString(), 'REP');

      totalRepForAccount = totalRepForAccount.add(reputation)
      const percentOfPotential = reputation.mul(new BN(100)).div(ETHtotalPotentialRep) + '%'
      const percentOfDistributed = reputation.mul(new BN(100)).div(ETHtotalDistributedRep) + '%'

      result[account] = {
        ...result[account],
        ETH: {
          reputation,
          percentOfPotential,
          percentOfDistributed,
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
      const percentOfPotential = reputation.mul(new BN(100)).div(TKNtotalPotentialRep) + '%'
      const percentOfDistributed = reputation.mul(new BN(100)).div(TKNtotalPotentialRep) + '%'

      result[account] = {
        ...result[account],
        Tokens: {
          reputation,
          percentOfPotential,
          percentOfDistributed,
          scorePerToken
        }
      }
    }
    if (GenRep) {

      console.log('\nDxGenAuction4Rep at', DxGenAuction4Rep.address);
      const [reputation, repPerAuctionId] = calcFunctions.DxGenAuction4Rep(GenRep)
      console.log('reputation from GEN auction: ', reputation.div(decimals18).toString(), 'REP');

      totalRepForAccount = totalRepForAccount.add(reputation)
      const percentOfPotential = reputation.mul(new BN(100)).div(GENtotalPotentialRep) + '%'
      const percentOfDistributed = reputation.mul(new BN(100)).div(GENtotalDistributedRep) + '%'

      result[account] = {
        ...result[account],
        GEN: {
          reputation,
          percentOfPotential,
          percentOfDistributed,
          repPerAuctionId
        }
      }
    }

    if (totalRepForAccount.gt(new BN(0))) {
      console.log('\nTotal REP for account: ', totalRepForAccount.div(decimals18).toString(), 'REP');
      const percentOfPotential = totalRepForAccount.mul(new BN(100)).div(totalPotentialREP) + '%'
      const percentOfDistributed = totalRepForAccount.mul(new BN(100)).div(totalDistributedREP) + '%'

      if (percentOfPotential === percentOfDistributed) {
        console.log('\nPercent of total REP over all 4 schemes:', percentOfDistributed);
      } else {
        console.log('\nPercent of total REP over all 4 schemes:', percentOfPotential, 'if all REP was distributed');
        console.log('\nPercent of total REP over all 4 schemes:', percentOfDistributed, 'actual');
      }

      result[account].reputation = totalRepForAccount
      result[account].percentOfPotential = percentOfPotential
      result[account].percentOfDistributed = percentOfDistributed
    }
  }

  console.groupEnd()

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
  console.group('\n\nSubmissions data');

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

      const lockingIds = [], amounts = []
      const lockedPerId = {}
      for (const { _amount, _lockingId } of MgnEvents) {
        lockingIds.push(_lockingId)
        amounts.push(_amount)
        lockedPerId[_lockingId] = new BN(_amount)
      }
      const total = Object.values(lockedPerId).reduce((sum, am) => sum.add(am), new BN(0))
      console.log('\n\tLocked amount', total.div(decimals18).toString(), 'MGN');
      console.log('\tlockingIds: ', Object.keys(lockedPerId).join(', '));

      result[account] = {
        DxLockMgnForRep: {
          lockingIds,
          amounts,
          lockedPerId,
          total
        }
      }
    }

    if (EthEvents && EthEvents.length) {
      console.log('\t------------------------------');
      console.log('\n\tLocked ETH for REP in DxLockEth4Rep at', DxLockEth4Rep.address);

      const lockingIds = [], amounts = [], periods = []
      const totalPerPeriod = {}
      const lockingIdsPerPeriod = {}
      const lockedPerId = {}
      for (const { _amount, _period, _lockingId } of EthEvents) {
        const amount = new BN(_amount)

        lockingIds.push(_lockingId)
        amounts.push(_amount)
        periods.push(_period)

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
          lockingIds,
          amounts,
          periods,
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
          periods: [],
          totalPerPeriod: {},
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

  console.groupEnd()

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
  let symbol
  try {
    symbol = web3.eth.abi.decodeParameter('string', symbolHex)
  } catch (error) {
    symbol = web3.utils.toUtf8(symbolHex)
  }
  return address2symbol[address] = symbol
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

  // latest
  const toBlock = await web3.eth.getBlockNumber()

  const LockOptions = {
    fromBlock: argv.fromBlock || 0,
    toBlock,
    filter: accounts && accounts.length && { _locker: accounts }
  }
  const BidOptions = {
    fromBlock: argv.fromBlock || 0,
    toBlock,
    filter: accounts && accounts.length && { _bidder: accounts }
  }
  const RegisterOptions = {
    fromBlock: argv.fromBlock || 0,
    toBlock,
    filter: accounts && accounts.length && { _beneficiary: accounts }
  }

  const {
    DxLockMgnForRep,
    DxLockEth4Rep,
    DxLockWhitelisted4Rep,
    DxGenAuction4Rep
  } = contracts

  console.group('\nFetching events from contracts\n')

  console.log('Fetching Lock events from DxLockMgnForRep');
  // const MgnLocks = await retryPromise(() => DxLockMgnForRep.getPastEvents('Lock', LockOptions))
  const MgnLocks = await getPastEventsRx(DxLockMgnForRep, 'Lock', { ...LockOptions, ...argv })

  console.log('Fetching Register events from DxLockMgnForRep');
  // const MgnLocks = await retryPromise(() => DxLockMgnForRep.getPastEvents('Lock', LockOptions))
  const MgnRegisters = await getPastEventsRx(DxLockMgnForRep, 'Register', { ...RegisterOptions, ...argv })

  console.log('Fetching Lock events from DxLockEth4Rep');
  // const EthLocks = await retryPromise(() => DxLockEth4Rep.getPastEvents('Lock', LockOptions))
  const EthLocks = await getPastEventsRx(DxLockEth4Rep, 'Lock', { ...LockOptions, ...argv })

  console.log('Fetching Lock events from DxLockWhitelisted4Rep');
  // const TknLocks = await retryPromise(() => DxLockWhitelisted4Rep.getPastEvents('Lock', LockOptions))
  const TknLocks = await getPastEventsRx(DxLockWhitelisted4Rep, 'Lock', { ...LockOptions, ...argv })

  console.log('Fetching Bid events from DxGenAuction4Rep');
  // const GenBids = await retryPromise(() => DxGenAuction4Rep.getPastEvents('Bid', BidOptions))
  const GenBids = await getPastEventsRx(DxGenAuction4Rep, 'Bid', { ...BidOptions, ...argv })

  let participatingAccounts = new Set()
  let totalAccounts = new Set()

  const gatherEventsPerAddress = (events, dontCount = false) => {
    return events.reduce((accum, event) => {
      const { returnValues } = event
      returnValues.event = event.event
      returnValues.blockNumber = event.blockNumber
      returnValues.tx = event.transactionHash

      const addr = (
        returnValues._locker
        || returnValues._bidder
        || returnValues._beneficiary
      ).toLowerCase()
      totalAccounts.add(addr)
      if(!dontCount) participatingAccounts.add(addr)

      if (!accum[addr]) {
        accum[addr] = []
        accum.total++
      }
      accum[addr].push(returnValues)

      return accum
    }, { total: 0 })
  }


  const MgnEvents = gatherEventsPerAddress(MgnLocks),
    MgnRegisterEvents = gatherEventsPerAddress(MgnRegisters, true),
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

  console.group(`Total participating accounts: ${participatingAccounts.length}`);
  console.log(`Including registered ${totalAccounts.size}`);
  console.log(`Registered for MGN locking ${MgnRegisterEvents.total} accounts`);
  console.log(`Locked MGN ${MgnEvents.total} accounts`);
  console.log(`Locked ETH ${EthEvents.total} accounts`);
  console.log(`Locked Tokens ${TknEvents.total} accounts`);
  console.log(`Bid GEN ${GenEvents.total} accounts`);
  console.groupEnd()

  console.groupEnd()

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

// const MAX_TRIES = 15
// function retryPromise(execPromise, tryN = 1) {
//   if (tryN > MAX_TRIES) return Promise.reject('number of tries exceeded', MAX_TRIES, '\taborting')
//   // console.log('try', tryN)
//   return execPromise().catch(() => retryPromise(execPromise, tryN + 1))
// }


module.exports = cb => main().then(() => cb(), cb)
