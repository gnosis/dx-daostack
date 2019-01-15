
/* global artifacts, web3, contract, it, before, after, afterEach, assert */

const DxGenAuction4Rep = artifacts.require('DxGenAuction4Rep')
const DxReputation = artifacts.require('DxReputation')
const DxAvatar = artifacts.require('DxAvatar')
const GenToken = artifacts.require('GenToken')
const BN = require('bn.js')

const {
  increaseTimeAndMine,
  takeSnapshot,
  revertSnapshot,
  getTimestamp
} = require('../src/helpers/web3helpers')(web3)

const BID_AMOUNT_1_MASTER = web3.utils.toWei('20')
const BID_AMOUNT_2_MASTER = web3.utils.toWei('15')
const BID_AMOUNT_1_ANOTHER = web3.utils.toWei('30')
const BID_AMOUNT_2_ANOTHER = web3.utils.toWei('35')
const TOTAL_AMOUNT = web3.utils.toWei('10000000')

contract('Locking Token for REP', accounts => {
  let Auction4Rep, DxRep, GEN
  let master, another
  let snapshotId
  let AuctionID, NextAuctionID

  before(async () => {
    snapshotId = await takeSnapshot();
    [master, another] = accounts
    Auction4Rep = await DxGenAuction4Rep.deployed()
    DxRep = await DxReputation.deployed()
    GEN = await GenToken.deployed()
    const Avatar = await DxAvatar.deployed()

    const bidToken = await Auction4Rep.token()
    assert.equal(bidToken, GEN.address, 'bid token should be GEN')
    
    const wallet = await Auction4Rep.wallet()
    assert.equal(wallet, Avatar.address, 'wallet should be Avatar address')

    const masterBalance = await GEN.balanceOf(master)
    console.log('masterBalance: ', masterBalance.toString());
    assert(masterBalance.gt(new BN(0)), 'master has GEN > 0')

    let anotherBalance = await GEN.balanceOf(another)
    if (anotherBalance.eq(new BN(0))) {
      const halfBalance = masterBalance.div(new BN(2))
      await GEN.transfer(another, halfBalance)
      console.log('masterBalance: ', halfBalance.toString());
    } else console.log('masterBalance: ', masterBalance.toString());

    anotherBalance = await GEN.balanceOf(another)
    console.log('anotherBalance: ', anotherBalance.toString());
    assert(masterBalance.gt(new BN(0)), 'another account has GEN > 0')
  })

  afterEach(() => {
    console.log('--------------------')
  })

  after(() => revertSnapshot(snapshotId))

  it('can\'t bid 0 amount', async () => {
    try {
      await Auction4Rep.bid(0)
      // should be unreachable
      assert.fail('shouldn\'t allow bidding 0')
    } catch (error) {
      assert.include(error.message, 'bidding amount should be > 0', 'error message should contain string specified')
    }
  })
  it('can\'t bid before auctionsStartTime', async () => {
    const auctionsStartTime = await Auction4Rep.auctionsStartTime()
    console.log('auctionsStartTime: ', auctionsStartTime.toString())
    const now = await getTimestamp()

    assert(auctionsStartTime.gt(new BN(now)), 'auctionsStartTime should be in the future')

    try {
      await Auction4Rep.bid(BID_AMOUNT_1_MASTER)
      // should be unreachable
      assert.fail('shouldn\'t bid before auctionsStartTime')
    } catch (error) {
      assert.include(error.message, 'bidding is enable only after bidding auctionsStartTime', 'error message should contain string specified')
    }
  })

  it('increases time to reach auctionsStartTime', async () => {
    const auctionsStartTime = await Auction4Rep.auctionsStartTime()
    console.log('auctionsStartTime: ', auctionsStartTime.toString())
    const timestamp1 = await getTimestamp()
    console.log('now: ', timestamp1)

    const advanceBy = auctionsStartTime.sub(new BN(timestamp1 - 1000))
    console.log('advanceBy: ', advanceBy.toString())
    await increaseTimeAndMine(advanceBy.toNumber())

    const timestamp2 = await getTimestamp()
    console.log('now: ', timestamp2)

    assert(auctionsStartTime.lt(new BN(timestamp2)), 'auctionsStartTime should be in the past')
  })

  it('can\'t bid token without approval (allowance)', async () => {
    try {
      await Auction4Rep.bid(BID_AMOUNT_1_MASTER)
      // should be unreachable
      assert.fail('shouldn\'t transfer unapproved token')
    } catch (error) {
      assert.include(error.message, 'revert', 'error message should contain string specified')
    }
  })

  it('can bid GEN after all', async () => {
    await GEN.approve(Auction4Rep.address, TOTAL_AMOUNT)

    const balanceBefore = await GEN.balanceOf(master)
    console.log('balanceBefore: ', balanceBefore.toString());

    const tx = await Auction4Rep.bid(BID_AMOUNT_1_MASTER)

    const BidEvent = tx.logs.find(log => log.event === 'Bid')

    const { _bidder, _amount, _auctionId } = BidEvent.args

    assert.equal(_bidder, master, 'Bidder should be master account')

    assert(_amount.eq(new BN(BID_AMOUNT_1_MASTER)), 'Bid amount should be BID_AMOUNT')

    AuctionID = _auctionId
    console.log('AuctionID: ', AuctionID.toString());
    const balanceAfter = await GEN.balanceOf(master)
    console.log('balanceAfter: ', balanceAfter.toString());

    assert(balanceBefore.sub(balanceAfter).eq(_amount), 'balance difference should be the Bided amount')

    const bid = await Auction4Rep.getBid(master, AuctionID)

    assert(bid.eq(new BN(BID_AMOUNT_1_MASTER)), 'BID_AMOUNT should equal the resulting bid')

    // struct Auction {
    //   uint totalBid;
    //   // A mapping from bidder addresses to their bids.
    //   mapping(address=>uint) bids;
    // }
    // this returns totalBid from Auction struct, can't get bids mapping
    const totalBid = await Auction4Rep.auctions(AuctionID)
    console.log('totalBid: ', totalBid.toString());
    assert(totalBid.eq(bid), 'bid should equal totalBid for the first bid ever')
  })

  it('bidding at around the same time results in the same auction Id', async () => {
    await GEN.approve(Auction4Rep.address, TOTAL_AMOUNT, {from: another})

    const balanceBefore = await GEN.balanceOf(another)
    console.log('balanceBefore: ', balanceBefore.toString());

    const tx = await Auction4Rep.bid(BID_AMOUNT_1_ANOTHER, {from:another})

    const BidEvent = tx.logs.find(log => log.event === 'Bid')

    const { _bidder, _amount, _auctionId } = BidEvent.args

    assert.equal(_bidder, another, 'Bidder should be another account')

    assert(_amount.eq(new BN(BID_AMOUNT_1_ANOTHER)), 'Bid amount should be BID_AMOUNT')

    assert(AuctionID.eq(_auctionId), 'auction id should be the same withing one auction period')
    

    const balanceAfter = await GEN.balanceOf(another)
    console.log('balanceAfter: ', balanceAfter.toString());

    assert(balanceBefore.sub(balanceAfter).eq(_amount), 'balance difference should be the Bided amount')

    const bid = await Auction4Rep.getBid(another, AuctionID)

    assert(bid.eq(new BN(BID_AMOUNT_1_ANOTHER)), 'BID_AMOUNT should equal the resulting bid')

    const bothBids = new BN(BID_AMOUNT_1_MASTER).add(new BN(BID_AMOUNT_1_ANOTHER))

    const totalBid = await Auction4Rep.auctions(AuctionID)
    console.log('totalBid: ', totalBid.toString());
    assert(totalBid.eq(bothBids), 'bid should equal the sum of the two bids')
  })

  it('increases time to reach next auction Id', async () => {
    const auctionsStartTime = await Auction4Rep.auctionsStartTime()
    const auctionPeriod = await Auction4Rep.auctionPeriod()

    const nextAuctionIdAt = AuctionID.add(new BN(1)).mul(auctionPeriod).add(auctionsStartTime)

    console.log('nextAuctionIdAt: ', nextAuctionIdAt.toString())
    const timestamp1 = await getTimestamp()
    console.log('now: ', timestamp1)

    const advanceBy = nextAuctionIdAt.sub(new BN(timestamp1 - 1000))
    console.log('advanceBy: ', advanceBy.toString())
    await increaseTimeAndMine(advanceBy.toNumber())

    const timestamp2 = await getTimestamp()
    console.log('now: ', timestamp2)

    assert(nextAuctionIdAt.lt(new BN(timestamp2)), 'nextAuctionIdAt should be in the past')
  })

  it('bidding at different auctionPeriod results in different auctionId', async () => {

    const tx1 = await Auction4Rep.bid(BID_AMOUNT_2_MASTER, {from:master})
    const tx2 = await Auction4Rep.bid(BID_AMOUNT_2_ANOTHER, {from:another})

    const BidEvent1 = tx1.logs.find(log => log.event === 'Bid')
    const BidEvent2 = tx2.logs.find(log => log.event === 'Bid')

    const { _auctionId: aId1 } = BidEvent1.args
    const { _auctionId: aId2 } = BidEvent2.args
    
    assert(aId1.eq(aId2), 'auction id should be the same withing one auction period')
    assert(!AuctionID.eq(aId1), 'auction id should be different from the last auction period')

    NextAuctionID =  aId1
  })

  it('can\'t transfer tokens to wallet before auctionsEndTime', async () => {
    try {
      await Auction4Rep.transferToWallet()
      // should be unreachable
      assert.fail('shouldn\'t transfer before auctionsEndTime')
    } catch (error) {
      assert.include(error.message, 'now > auctionsEndTime', 'error message should contain string specified')
    }
  })

  it('increases time to reach auctionsEndTime', async () => {
    const auctionsEndTime = await Auction4Rep.auctionsEndTime()
    console.log('auctionsEndTime: ', auctionsEndTime.toString())
    const timestamp1 = await getTimestamp()
    console.log('now: ', timestamp1)

    const advanceBy = auctionsEndTime.sub(new BN(timestamp1 - 1000))
    console.log('advanceBy: ', advanceBy.toString())
    await increaseTimeAndMine(advanceBy.toNumber())

    const timestamp2 = await getTimestamp()
    console.log('now: ', timestamp2)

    assert(auctionsEndTime.lt(new BN(timestamp2)), 'auctionsEndTime should be in the past')
  })

  it('can transfer tokens to wallet after auctionsEndTime', async () => {
    const auctionBalanceBefore = await GEN.balanceOf(Auction4Rep.address)
    console.log('auctionBalanceBefore: ', auctionBalanceBefore.toString());

    const bidSumAmount = new BN(BID_AMOUNT_1_MASTER)
      .add(new BN(BID_AMOUNT_1_ANOTHER))
      .add(new BN(BID_AMOUNT_2_MASTER))
      .add(new BN(BID_AMOUNT_2_ANOTHER))

    assert(auctionBalanceBefore.eq(bidSumAmount), 'auction has GEN balance equal the sum of all bids')

    const wallet = await Auction4Rep.wallet()
    console.log('wallet address: ', wallet);

    const walletBalanceBefore = await GEN.balanceOf(wallet)
    console.log('walletBalanceBefore: ', walletBalanceBefore.toString());

    assert(walletBalanceBefore.eq(new BN(0)), 'wallet doesn\'t have GEN')
    
    await Auction4Rep.transferToWallet()

    const auctionBalanceAfter = await GEN.balanceOf(Auction4Rep.address)
    console.log('auctionBalanceAfter: ', auctionBalanceAfter.toString());

    assert(auctionBalanceAfter.eq(new BN(0)), 'all GEN has been transferred out of the auction')

    const walletBalanceAfter = await GEN.balanceOf(wallet)
    console.log('walletBalanceAfter: ', walletBalanceAfter.toString());

    assert(walletBalanceAfter.eq(auctionBalanceBefore), 'all GEN has been transferred to the wallet')
  })

  it('can\'t bid after auctionsEndTime', async () => {
    try {
      await Auction4Rep.bid(BID_AMOUNT_1_MASTER,)
      // should be unreachable
      assert.fail('shouldn\'t bid after auctionsEndTime')
    } catch (error) {
      assert.include(error.message, 'bidding should be within the allowed bidding period', 'error message should contain string specified')
    }
  })

  it('can\'t redeem before redeemEnableTime', async () => {
    const redeemEnableTime = await Auction4Rep.redeemEnableTime()
    const now = await getTimestamp()

    assert(redeemEnableTime.gt(new BN(now)), 'redeemEnableTime should be in the future')

    try {
      await Auction4Rep.redeem(master, AuctionID)
      // should be unreachable
      assert.fail('shouldn\'t redeem before redeemEnableTime')
    } catch (error) {
      assert.include(error.message, 'now > redeemEnableTime', 'error message should contain string specified')
    }
  })

  it('increases time to reach redeemEnableTime', async () => {
    const redeemEnableTime = await Auction4Rep.redeemEnableTime()
    console.log('redeemEnableTime: ', redeemEnableTime.toString())
    const timestamp1 = await getTimestamp()
    console.log('now: ', timestamp1)

    const advanceBy = redeemEnableTime.sub(new BN(timestamp1 - 1000))
    console.log('advanceBy: ', advanceBy.toString())
    await increaseTimeAndMine(advanceBy.toNumber())

    const timestamp2 = await getTimestamp()
    console.log('now: ', timestamp2)

    assert(redeemEnableTime.lt(new BN(timestamp2)), 'redeemEnableTime should be in the past')
  })

  it('can\'t redeem when no bid was made', async () => {
    const emptyAuctionId = NextAuctionID.add(new BN(Math.floor(Math.random() * 100 + 10)))
    const bid = await Auction4Rep.getBid(master, emptyAuctionId)
    assert(bid.eq(new BN(0)), 'bid should be 0 for a random auction Id')

    try {
      await Auction4Rep.redeem(master, emptyAuctionId)
      // should be unreachable
      assert.fail('shouldn\'t redeem for a random auction Id')
    } catch (error) {
      assert.include(error.message, 'bidding amount should be > 0', 'error message should contain string specified')
    }
  })

  it('redeems reputation in correct proportions', async () => {
    await checkRepGain(master, AuctionID)
    await checkRepGain(another, AuctionID)
    await checkRepGain(master, NextAuctionID)
    await checkRepGain(another, NextAuctionID)
  })

  it('can\'t redeem twice', async () => {
    const bid = await Auction4Rep.getBid(master, AuctionID)
    assert(bid.eq(new BN(0)), 'bid should be 0 after redeeming')

    try {
      await Auction4Rep.redeem(master, AuctionID)
      // should be unreachable
      assert.fail('shouldn\'t redeem a second time')
    } catch (error) {
      assert.include(error.message, 'bidding amount should be > 0', 'error message should contain string specified')
    }
  })

  async function calcExpectedRep(account, auctionId) {
    const auctionReputationReward = await Auction4Rep.auctionReputationReward()
    const totalBid = await Auction4Rep.auctions(auctionId)
    const bid = await Auction4Rep.getBid(account, auctionId)

    return bid.mul(auctionReputationReward).div(totalBid)
  }

  async function checkRepGain(account, auctionId) {
    const repBefore = await DxRep.balanceOf(account)

    const expectedREP = await calcExpectedRep(account, auctionId)
    
    const tx = await Auction4Rep.redeem(account, auctionId)
    const RedeemEvent = tx.logs.find(log => log.event === 'Redeem')

    const {_auctionId, _beneficiary, _amount} = RedeemEvent.args
    assert(auctionId.eq(_auctionId), 'auction Id should be the one redeemed for')
    assert.equal(account, _beneficiary, 'account should be the one redeemed for')
    assert(expectedREP.eq(_amount), 'amount should be the expected one')

    const repAfter = await DxRep.balanceOf(account)

    const repDiff = repAfter.sub(repBefore)
    const dec = await DxRep.decimals()

    assert(repDiff.eq(expectedREP), `the account ${account} should have gotten REP proportional to its bid in auction ${auctionId}`)
    console.log(`account ${account} gained ${repDiff.div(dec)} REP from auction ${auctionId}`)
  }
})
