/* global artifacts, web3, contract, it */
/* eslint no-undef: "error" */
const assert = require('assert')
const debug = require('debug')('test:mgnForReputation')
const testHelperFactory = require('../src/helpers/testHelper')

const INITIAL_MGN_AMOUNT = 80
const INITIAL_LOCKED_MGN_AMOUNT = 60
const REPUTATION_REWARD = 100

let currentSnapshotId
async function setup ({
  accounts,

  reputationReward = REPUTATION_REWARD,
  initialMgn = INITIAL_MGN_AMOUNT,
  lockedMgn = INITIAL_LOCKED_MGN_AMOUNT,
  lockingStartTimeDelta = 0,
  lockingEndTimeDelta = 3000
}) {
  // Get the test helper
  const testHelper = await testHelperFactory({
    artifacts,
    web3,
    accounts
  })

  // Revert state, or save state to make test repeatable
  if (currentSnapshotId) {
    debug('Revert ganache snapshot: ' + currentSnapshotId)
    await testHelper.revertSnapshot(currentSnapshotId)
    debug('Ganache snapshot successfully reverted')
  } else {
    debug('Creating snapshot of local ganache')
    currentSnapshotId = await testHelper.makeSnapshot()
    debug('Created snapshot: ' + currentSnapshotId)
  }

  const { dxService } = testHelper

  // Calculate the locking time range
  const [
    lockingStartTime,
    lockingEndTime
  ] = await testHelper.getTimestampRangeFromDeltas({
    startTimeDelta: lockingStartTimeDelta,
    endTimeDelta: lockingEndTimeDelta
  })
  testHelper.lockingStartTime = lockingStartTime
  // Get the address for MGN
  const mgnAddress = await dxService.getMgnAddress()
  debug('Using MGN: ' + mgnAddress)

  // Setup the DAO
  debug('Setup DAO')
  const {
    avatarAddress,
    tokenAddress,
    reputationAddress,
    schemes
  } = await testHelper.setupDao({
    initialMgn,
    lockedMgn,
    schemes: [{
      type: 'ExternalLocking4Reputation',
      data: {
        reputationReward,
        lockingStartTime,
        lockingEndTime,
        externalLockingContract: mgnAddress,
        getBalanceFuncSignature: 'lockedTokenBalances(address)'
      }
    }]
  })

  // Get an scheme instance
  const { ExternalLocking4Reputation } = await testHelper.getDaoStackContracts()
  const schemeAddress = schemes[0].address
  const externalLocking4Reputation = await ExternalLocking4Reputation.at(schemeAddress)

  debug(
    'Created DAO (%s) with REP (%s) and TOKEN (%s). Schemes: %s',
    avatarAddress,
    tokenAddress,
    reputationAddress,
    schemes.map(scheme => scheme.address).join(',')
  )

  return {
    testHelper,
    avatarAddress,
    tokenAddress,
    reputationAddress,
    schemes,
    externalLocking4Reputation,
    lockingStartTime,
    lockingEndTime
  }
}

contract('Scheme MGN to REP', accounts => {
  it('constructor', async () => {
    const {
      testHelper,
      // avatarAddress,
      // tokenAddress,
      // reputationAddress,
      externalLocking4Reputation,
      lockingStartTime,
      lockingEndTime
    } = await setup({
      accounts
    })

    const reputationReward = await externalLocking4Reputation
      .reputationReward
      .call()
      .then(n => n.toNumber())

    assert.strictEqual(reputationReward, REPUTATION_REWARD)

    const _lockingEndTime = await externalLocking4Reputation
      .lockingEndTime
      .call()
      .then(n => n.toNumber())
    assert.strictEqual(_lockingEndTime, lockingEndTime)

    const _lockingStartTime = await externalLocking4Reputation
      .lockingStartTime
      .call()
      .then(n => n.toNumber())

    assert.strictEqual(_lockingStartTime, lockingStartTime)

    const externalLockingContract = await externalLocking4Reputation
      .externalLockingContract
      .call()
    const { dxService } = testHelper
    assert.strictEqual(externalLockingContract, await dxService.getMgnAddress())

    const getBalanceFuncSignature = await externalLocking4Reputation
      .getBalanceFuncSignature
      .call()

    assert.strictEqual(getBalanceFuncSignature, 'lockedTokenBalances(address)')

    assert.ok(true)
  })

  it('lock', async () => {
    const {
      externalLocking4Reputation
    } = await setup({
      accounts
    })

    var tx = await externalLocking4Reputation.lock()
    assert.strictEqual(tx.logs.length, 1)
    const log = tx.logs[0]
    debug('Lock externalLocking4Reputation log: %o', log)
    // assert.strictEqual(tx.logs[0].event, 'Lock');
    // assert.strictEqual(tx.logs[0].args._amount, INITIAL_LOCKED_MGN_AMOUNT);
    // assert.strictEqual(tx.logs[0].args._period, 1);
    // assert.strictEqual(tx.logs[0].args._locker, accounts[0]);
    assert.ok(true)
  })

  // it("lock", async () => {
  //   let testSetup = await setup(accounts);
  //   var tx = await testSetup.externalLocking4Reputation.lock();
  //   var lockingId = await helpers.getValueFromLogs(tx, '_lockingId',1);
  //   assert.strictEqual(tx.logs.length,1);
  //   assert.strictEqual(tx.logs[0].event,"Lock");
  //   assert.strictEqual(tx.logs[0].args._lockingId,lockingId);
  //   assert.strictEqual(tx.logs[0].args._amount,100);
  //   assert.strictEqual(tx.logs[0].args._period,1);
  //   assert.strictEqual(tx.logs[0].args._locker,accounts[0]);
  // });

  // it("lock with value == 0 should revert", async () => {
  //   let testSetup = await setup(accounts);
  //   try {
  //     await testSetup.externalLocking4Reputation.lock({from:accounts[4]});
  //     assert(false, "lock with value == 0 should revert");
  //   } catch(error) {
  //     helpers.assertVMException(error);
  //   }
  // });

  // it("lock after _lockingEndTime should revert", async () => {
  //   let testSetup = await setup(accounts);
  //   await helpers.increaseTime(3001);
  //   try {
  //     await testSetup.externalLocking4Reputation.lock();
  //     assert(false, "lock after _lockingEndTime should revert");
  //   } catch(error) {
  //     helpers.assertVMException(error);
  //   }
  // });

  // it("lock before start should  revert", async () => {
  //   let testSetup = await setup(accounts,100,100);
  //   try {
  //     await testSetup.externalLocking4Reputation.lock();
  //     assert(false, "lock before start should  revert");
  //   } catch(error) {
  //     helpers.assertVMException(error);
  //   }
  // });

  // it("cannot lock twice for the same user", async () => {
  //   let testSetup = await setup(accounts);
  //   await testSetup.externalLocking4Reputation.lock();
  //   try {
  //     await testSetup.externalLocking4Reputation.lock();
  //     assert(false, "cannot lock twice for the same user");
  //   } catch(error) {
  //     helpers.assertVMException(error);
  //   }
  // });

  // it("redeem", async () => {
  //     let testSetup = await setup(accounts);
  //     var tx = await testSetup.externalLocking4Reputation.lock();
  //     var lockingId = await helpers.getValueFromLogs(tx, '_lockingId',1);
  //     await helpers.increaseTime(3001);
  //     tx = await testSetup.externalLocking4Reputation.redeem(accounts[0],lockingId);
  //     assert.strictEqual(tx.logs.length,1);
  //     assert.strictEqual(tx.logs[0].event,"Redeem");
  //     assert.strictEqual(tx.logs[0].args._lockingId,lockingId);
  //     assert.strictEqual(tx.logs[0].args._amount,100);
  //     assert.strictEqual(tx.logs[0].args._beneficiary,accounts[0]);
  //     assert.strictEqual(await testSetup.org.reputation.reputationOf(accounts[0]),1000+100);
  // });

  // it("redeem score ", async () => {
  //     let testSetup = await setup(accounts);
  //     var tx = await testSetup.externalLocking4Reputation.lock({from:accounts[0]});
  //     var lockingId1 = await helpers.getValueFromLogs(tx, '_lockingId',1);
  //     tx = await testSetup.externalLocking4Reputation.lock({from:accounts[2]});
  //     var lockingId2 = await helpers.getValueFromLogs(tx, '_lockingId',1);
  //     await helpers.increaseTime(3001);
  //     await testSetup.externalLocking4Reputation.redeem(accounts[0],lockingId1);
  //     await testSetup.externalLocking4Reputation.redeem(accounts[2],lockingId2);
  //     assert.strictEqual(await testSetup.org.reputation.reputationOf(accounts[0]),1000+25);
  //     assert.strictEqual(await testSetup.org.reputation.reputationOf(accounts[2]),75);
  // });

  // it("redeem cannot redeem twice", async () => {
  //     let testSetup = await setup(accounts);
  //     var tx = await testSetup.externalLocking4Reputation.lock();
  //     var lockingId = await helpers.getValueFromLogs(tx, '_lockingId',1);
  //     await helpers.increaseTime(3001);
  //     await testSetup.externalLocking4Reputation.redeem(accounts[0],lockingId);
  //     try {
  //       await testSetup.externalLocking4Reputation.redeem(accounts[0],lockingId);
  //       assert(false, "cannot redeem twice");
  //     } catch(error) {
  //       helpers.assertVMException(error);
  //     }
  // });

  // it("redeem before lockingEndTime should revert", async () => {
  //     let testSetup = await setup(accounts);
  //     var tx = await testSetup.externalLocking4Reputation.lock();
  //     var lockingId = await helpers.getValueFromLogs(tx, '_lockingId',1);
  //     await helpers.increaseTime(50);
  //     try {
  //          await testSetup.externalLocking4Reputation.redeem(accounts[0],lockingId);
  //          assert(false, "redeem before lockingEndTime should revert");
  //        } catch(error) {
  //          helpers.assertVMException(error);
  //        }
  // });
})
