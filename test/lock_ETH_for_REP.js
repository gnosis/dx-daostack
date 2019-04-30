
/* global artifacts, web3, contract, it, before, after, afterEach, assert */

const DxLockEth4Rep = artifacts.require('DxLockEth4Rep')
const DxReputation = artifacts.require('DxReputation')
const BN = require('bn.js')

const {
  increaseTimeAndMine,
  takeSnapshot,
  revertSnapshot,
  getTimestamp
} = require('../src/helpers/web3helpers')(web3)

const LOCK_AMOUNT = web3.utils.toWei('20')
const LOCK_PERIOD = 3

contract('Locking ETH for REP', accounts => {
  let DxLock4Rep, DxRep
  let master
  let snapshotId
  let AGREEMENT_HASH

  before(async () => {
    snapshotId = await takeSnapshot();
    [master] = accounts
    DxLock4Rep = await DxLockEth4Rep.deployed()
    DxRep = await DxReputation.deployed()
    AGREEMENT_HASH = await DxLock4Rep.getAgreementHash()
    console.log('Current AGREEMENT_HASH: ', AGREEMENT_HASH);
  })

  afterEach(() => {
    console.log('--------------------')
  })

  after(() => revertSnapshot(snapshotId))

  it('can\'t lock zero amount', async () => {
    try {
      await DxLock4Rep.lock(LOCK_PERIOD, AGREEMENT_HASH, { from: master, value: 0 })
      // should be unreachable
      assert.fail('shouldn\'t lock when zero ETH')
    } catch (error) {
      assert.include(error.message, 'locking amount should be > 0', 'error message should contain string specified')
    }
  })

  it('can\'t lock for longer than maxLockingPeriod', async () => {
    const maxLockingPeriod = await DxLock4Rep.maxLockingPeriod()
    try {
      await DxLock4Rep.lock(maxLockingPeriod.add(new BN(1)), AGREEMENT_HASH, { from: master, value: LOCK_AMOUNT })
      // should be unreachable
      assert.fail('shouldn\'t lock for longer than maxLockingPeriod')
    } catch (error) {
      assert.include(error.message, 'locking period should be <= maxLockingPeriod', 'error message should contain string specified')
    }
  })

  it('can\'t lock for locking period of 0', async () => {
    try {
      await DxLock4Rep.lock(0, AGREEMENT_HASH, { from: master, value: LOCK_AMOUNT })
      // should be unreachable
      assert.fail('shouldn\'t lock for locking period of 0')
    } catch (error) {
      assert.include(error.message, 'locking period should be > 0', 'error message should contain string specified')
    }
  })

  it('can\'t lock before lockingStartTime', async () => {
    const lockingStartTime = await DxLock4Rep.lockingStartTime()
    console.log('lockingStartTime: ', lockingStartTime.toString())
    const now = await getTimestamp()

    assert(lockingStartTime.gt(new BN(now)), 'lockingStartTime should be in the future')

    try {
      await DxLock4Rep.lock(LOCK_PERIOD, AGREEMENT_HASH, { from: master, value: LOCK_AMOUNT })
      // should be unreachable
      assert.fail('shouldn\'t lock before lockingStartTime')
    } catch (error) {
      assert.include(error.message, 'lock should start after lockingStartTime', 'error message should contain string specified')
    }
  })

  it('increases time to reach lockingStartTime', async () => {
    const lockingStartTime = await DxLock4Rep.lockingStartTime()
    console.log('lockingStartTime: ', lockingStartTime.toString())
    const timestamp1 = await getTimestamp()
    console.log('now: ', timestamp1)

    const advanceBy = lockingStartTime.sub(new BN(timestamp1 - 1000))
    console.log('advanceBy: ', advanceBy.toString())
    await increaseTimeAndMine(advanceBy.toNumber())

    const timestamp2 = await getTimestamp()
    console.log('now: ', timestamp2)

    assert(lockingStartTime.lt(new BN(timestamp2)), 'lockingStartTime should be in the past')
  })

  it('can\'t release if nothing was locked', async () => {
    const testLockID = await DxLock4Rep.lock.call(LOCK_PERIOD, AGREEMENT_HASH, { from: master, value: LOCK_AMOUNT })

    try {
      await DxLock4Rep.release(master, testLockID)
      // should be unreachable
      assert.fail('shouldn\'t lock when zero ETH')
    } catch (error) {
      assert.include(error.message, 'amount should be > 0', 'error message should contain string specified')
    }
  })

  let lockID

  it('can lock ETH after all', async () => {
    const balanceBefore = await web3.eth.getBalance(master)
    console.log('balanceBefore: ', balanceBefore);

    const tx = await DxLock4Rep.lock(LOCK_PERIOD, AGREEMENT_HASH, { from: master, value: LOCK_AMOUNT })
    // console.log('tx: ', JSON.stringify(tx, null, 2));

    const LockEvent = tx.logs.find(log => log.event === 'Lock')

    const { _locker, _period, _amount, _lockingId } = LockEvent.args

    assert.equal(_locker, master, 'locker should be master account')
    assert(_period.eq(new BN(LOCK_PERIOD)), 'lock period should be LOCK_PERIOD')
    assert(_amount.eq(new BN(LOCK_AMOUNT)), 'locked amount should be LOCK_AMOUNT')

    lockID = _lockingId
    console.log('lockID: ', lockID);
    const balanceAfter = await web3.eth.getBalance(master)
    console.log('balanceAfter: ', balanceAfter);

    const txCost = await getTxCost(tx)
    assert(new BN(balanceBefore).sub(new BN(balanceAfter)).sub(txCost).eq(_amount), 'balance difference should be the locked amount - txCost')

    const score = await DxLock4Rep.scores(master)
    console.log('score: ', score.toString());
    assert(score.eq(new BN(LOCK_PERIOD).mul(new BN(LOCK_AMOUNT))), 'score should be equal to LOCK_PERIOD')
  })

  it('can\'t release before releaseTime', async () => {
    const { releaseTime } = await DxLock4Rep.lockers(master, lockID)
    const now = await getTimestamp()

    assert(releaseTime.gt(new BN(now)), 'releaseTime should be in the future')

    try {
      await DxLock4Rep.release(master, lockID)
      // should be unreachable
      assert.fail('shouldn\'t release before releaseTime')
    } catch (error) {
      assert.include(error.message, 'check the lock period pass', 'error message should contain string specified')
    }
  })

  it('increases time to reach releaseTime', async () => {
    const { releaseTime } = await DxLock4Rep.lockers(master, lockID)
    console.log('releaseTime: ', releaseTime.toString())
    const timestamp1 = await getTimestamp()
    console.log('now: ', timestamp1)

    const advanceBy = releaseTime.sub(new BN(timestamp1 - 1000))
    console.log('advanceBy: ', advanceBy.toString())
    await increaseTimeAndMine(advanceBy.toNumber())

    const timestamp2 = await getTimestamp()
    console.log('now: ', timestamp2)

    assert(releaseTime.lt(new BN(timestamp2)), 'releaseTime should be in the past')
  })

  it('can release after all', async () => {
    const balanceBefore = await web3.eth.getBalance(master)
    console.log('balanceBefore: ', balanceBefore);

    const tx = await DxLock4Rep.release(master, lockID)

    const ReleaseEvent = tx.logs.find(log => log.event === 'Release')

    const { _beneficiary, _amount, _lockingId } = ReleaseEvent.args

    assert.equal(_beneficiary, master, 'beneficiary should be master account')
    assert.equal(_lockingId, lockID, 'lockingId should be lockID')
    assert(_amount.eq(new BN(LOCK_AMOUNT)), 'released amount should be LOCK_AMOUNT')

    const balanceAfter = await web3.eth.getBalance(master)
    console.log('balanceAfter: ', balanceAfter);

    const txCost = await getTxCost(tx)

    assert(new BN(balanceAfter).sub(new BN(balanceBefore)).add(txCost).eq(_amount), 'balance difference should be the released amount + txCost')
  })

  it('can\'t redeem before redeemEnableTime', async () => {
    const redeemEnableTime = await DxLock4Rep.redeemEnableTime()
    const now = await getTimestamp()

    assert(redeemEnableTime.gt(new BN(now)), 'redeemEnableTime should be in the future')

    try {
      await DxLock4Rep.redeem(master)
      // should be unreachable
      assert.fail('shouldn\'t redeem before redeemEnableTime')
    } catch (error) {
      assert.include(error.message, 'now > redeemEnableTime', 'error message should contain string specified')
    }
  })

  it('increases time to reach redeemEnableTime', async () => {
    const redeemEnableTime = await DxLock4Rep.redeemEnableTime()
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

  it('can redeem after redeemEnableTime', async () => {
    const scoreBefore = await DxLock4Rep.scores(master)
    console.log('scoreBefore: ', scoreBefore.toString())
    assert(scoreBefore.gt(new BN(0)), 'score before should be > 0')

    const totalScore = await DxLock4Rep.totalScore()

    const reputationReward = await DxLock4Rep.reputationReward()
    const expectedREP = scoreBefore.mul(reputationReward).div(totalScore)

    const repBefore = await DxRep.balanceOf(master)
    console.log('rep Before: ', repBefore.toString())
    assert(repBefore.eq(new BN(0)), 'should not have REP at first')

    const tx = await DxLock4Rep.redeem(master)

    const RedeemEvent = tx.logs.find(log => log.event === 'Redeem')
    const { _beneficiary, _amount } = RedeemEvent.args

    assert.equal(_beneficiary, master, 'beneficiary should be master account')
    assert(_amount.eq(expectedREP), 'reputation amount should be expectedREP')

    const scoreAfter = await DxLock4Rep.scores(master)
    console.log('score After: ', scoreAfter.toString())
    assert(scoreAfter.eq(new BN(0)), 'score after should be 0')

    const repAfter = await DxRep.balanceOf(master)
    console.log('rep After: ', repAfter.toString())
    assert(repAfter.eq(expectedREP), 'the only account should have gotten REP proportional to its score')
  })

  it('can\'t redeem twice', async () => {
    const score = await DxLock4Rep.scores(master)
    assert(score.eq(new BN(0)), 'score should be 0 after redeeming')

    try {
      await DxLock4Rep.redeem(master)
      // should be unreachable
      assert.fail('shouldn\'t with score == 0')
    } catch (error) {
      assert.include(error.message, 'score should be > 0', 'error message should contain string specified')
    }
  })

  it('increases time to past lockingEndTime', async () => {
    const lockingEndTime = await DxLock4Rep.lockingEndTime()
    console.log('lockingEndTime: ', lockingEndTime.toString())
    const timestamp1 = await getTimestamp()
    console.log('now: ', timestamp1)

    const advanceBy = lockingEndTime.sub(new BN(timestamp1 - 1000))
    console.log('advanceBy: ', advanceBy.toString())
    await increaseTimeAndMine(advanceBy.toNumber())

    const timestamp2 = await getTimestamp()
    console.log('now: ', timestamp2)

    assert(lockingEndTime.lt(new BN(timestamp2)), 'lockingEndTime should be in the past')
  })

  it('can\'t lock after lockingEndTime', async () => {
    try {
      await DxLock4Rep.lock(LOCK_PERIOD, AGREEMENT_HASH, { from: master, value: LOCK_AMOUNT })
      // should be unreachable
      assert.fail('shouldn\'t lock after lockingEndTime')
    } catch (error) {
      assert.include(error.message, 'lock should be within the allowed locking period', 'error message should contain string specified')
    }
  })
})

async function getTxCost(tx) {
  const { gasPrice } = await web3.eth.getTransaction(tx.receipt.transactionHash)

  return new BN(gasPrice).mul(new BN(tx.receipt.gasUsed))
}
