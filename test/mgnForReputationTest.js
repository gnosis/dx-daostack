const testHelperFactory = require('./util/testHelper')

async function setup ({
  artifacts,
  web3,
  accounts,

  reputationReward = 100,
  initialMgn = 80,
  lockedMgn = 60,
  lockingStartTimeDelta = 0,
  lockingEndTimeDelta = 3000,
}) {
  // Get the test helper
  const testHelper = await testHelperFactory({
    artifacts,
    web3,
    accounts
  })
  const { dxService } = testHelper

  // Calculate the locking time range
  const [
    lockingStartTime,
    lockingEndTime
  ] = await testHelper.getTimestampRangeFromDeltas({
    startTimeDelta: lockingStartTimeDelta,
    endTimeDelta: lockingEndTimeDelta
  })

  // Get the address for MGN
  const mgnAddress = await dxService.getMgnAddress()

  // Setup the DAO
  const {
    avatarAddress,
    tokenAddress,
    reputationAddress
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

  
  console.log(
    'Created DAO (%s) with REP (%s) and TOKEN (%s)',
    avatarAddress,
    tokenAddress,
    reputationAddress
  )
}

contract('Scheme MGN to REP', accounts => {
  it('works', async () => {
    
    await setup({
      web3,
      accounts,
      artifacts
    })
    
    assert.ok(true)
  })

    // it("constructor", async () => {
    //   let testSetup = await setup(accounts);
    //   assert.equal(await testSetup.externalLocking4Reputation.reputationReward(),100);
    //   assert.equal(await testSetup.externalLocking4Reputation.lockingEndTime(),testSetup.lockingEndTime);
    //   assert.equal(await testSetup.externalLocking4Reputation.lockingStartTime(),testSetup.lockingStartTime);
    //   assert.equal(await testSetup.externalLocking4Reputation.externalLockingContract(),testSetup.extetnalTokenLockerMock.address);
    //   assert.equal(await testSetup.externalLocking4Reputation.getBalanceFuncSignature(),"lockedTokenBalances(address)");
    // });

    // it("lock", async () => {
    //   let testSetup = await setup(accounts);
    //   var tx = await testSetup.externalLocking4Reputation.lock();
    //   var lockingId = await helpers.getValueFromLogs(tx, '_lockingId',1);
    //   assert.equal(tx.logs.length,1);
    //   assert.equal(tx.logs[0].event,"Lock");
    //   assert.equal(tx.logs[0].args._lockingId,lockingId);
    //   assert.equal(tx.logs[0].args._amount,100);
    //   assert.equal(tx.logs[0].args._period,1);
    //   assert.equal(tx.logs[0].args._locker,accounts[0]);
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
    //     assert.equal(tx.logs.length,1);
    //     assert.equal(tx.logs[0].event,"Redeem");
    //     assert.equal(tx.logs[0].args._lockingId,lockingId);
    //     assert.equal(tx.logs[0].args._amount,100);
    //     assert.equal(tx.logs[0].args._beneficiary,accounts[0]);
    //     assert.equal(await testSetup.org.reputation.reputationOf(accounts[0]),1000+100);
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
    //     assert.equal(await testSetup.org.reputation.reputationOf(accounts[0]),1000+25);
    //     assert.equal(await testSetup.org.reputation.reputationOf(accounts[2]),75);
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
