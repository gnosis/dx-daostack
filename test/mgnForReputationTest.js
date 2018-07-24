// const helpers = require('./helpers')
const constants = require('./constants')
const getDaoStackContracts = require('../src/helpers/getDaoStackContracts')
const getDxContracts = require('../src/helpers/getDxContracts')


// TODO: Refactor
const setupOrganization = async function ({
  // contract instances
  daoCreator,

  // Contracts
  Avatar,
  DAOToken,
  Reputation,

  // Params
  daoCreatorOwner,
  founderToken,
  founderReputation,
  controller = 0,
  cap = 0
}) {
  // console.log('SETUP daoCreator:', daoCreator)
  // TODO: Refactor
  // Create organization
  var tx = await daoCreator.forgeOrg(
    // org name
    'testOrg',
    // token name
    'TEST',
    // token symbol
    'TST',
    [ daoCreatorOwner ],
    [ founderToken ],
    [ founderReputation ],
    controller,
    cap,{
      gas: constants.ARC_GAS_LIMIT
    })

  // Validate that the organization was created
  assert.equal(tx.logs.length, 1)
  assert.equal(tx.logs[0].event, 'NewOrg')

  var avatarAddress = tx.logs[0].args._avatar
  const avatar = await Avatar.at(avatarAddress)

  var tokenAddress = await avatar.nativeToken()
  const token = await DAOToken.at(tokenAddress)

  var reputationAddress = await avatar.nativeReputation()
  const reputation = await Reputation.at(reputationAddress)

  return {
    avatar,
    token,
    reputation
  }
}

async function setup ({
  artifacts,
  accounts,
  repAllocation = 100,
  lockingStartTimeDelta = 0,
  lockingEndTimeDelta = 3000,
  initialMgn = 80,
  lockedMgn = 60
}) { 
  const owner = accounts[0]
  // const contract = require('truffle-contract')
  // const ControllerCreator = contract(require(`@daostack/arc/build/contracts/ControllerCreator` ))
  // console.log('currentProvider: ', web3.currentProvider)
  // ControllerCreator.defaults({ from: owner })
  // ControllerCreator.setProvider(web3.currentProvider)
  const {
    ControllerCreator,
    DaoCreator,
    Avatar,
    DAOToken,
    Reputation
  } = await getDaoStackContracts({
    provider: web3.currentProvider,
    defaults: {
      from: owner 
    }
  })
  
  const controllerCreator = await ControllerCreator.new({
    gas: constants.ARC_GAS_LIMIT
  })
  const daoCreator = await DaoCreator.new(
    controllerCreator.address, {
    gas: constants.ARC_GAS_LIMIT
  })

  // // Create organization
  const {
    avatar,
    token,
    reputation
  } = await setupOrganization({
    daoCreator,
    Avatar,
    DAOToken,
    Reputation,
    daoCreatorOwner: owner,
    founderToken: 0,
    founderReputation: 0
  })

  // const now = await web3.eth.getBlock('latest').timestamp
  // const lockingStartTime = now + lockingStartTimeDelta
  // const lockingEndTime = now + lockingEndTimeDelta

  // const {
  //   TokenFRT
  // } = await getDxContracts(artifacts)
  // const mgn = await TokenFRT.deployed()
  // await mgn.mintTokens(owner, initialMgn)
  // await mgn.lockTokens(initialMgn, lockedMgn)

  // //  testSetup.extetnalTokenLockerMock = await ExternalTokenLockerMock.new();
  // //  await testSetup.extetnalTokenLockerMock.lock(100,{from:accounts[0]});
  // //  await testSetup.extetnalTokenLockerMock.lock(200,{from:accounts[1]});
  // //  await testSetup.extetnalTokenLockerMock.lock(300,{from:accounts[2]});

  // // Create scheme for getting REP from locked MGN
  // const externalLocking4Reputation = await ExternalLocking4Reputation.new(
  //   avatar.address,
  //   repAllocation,
  //   lockingStartTime,
  //   lockingEndTime,
  //   mgn.address,
  //   'lockedTokenBalances(address)'
  // )

  // await daoCreator.setSchemes(
  //    // avatar
  //    avatar.address,
  //    // Scheme
  //    [ externalLocking4Reputation.address ],
  //    // parameters (no params)
  //    [ 0 ],
  //    // Permissions (no permissions)
  //    [ '0x00000000' ]
  // )

  // return {
  //   mgn,

  //   // Main DaoStack contracts
  //   avatar,
  //   token,
  //   reputation,
  //   // Schemes
  //   externalLocking4Reputation
  // }
}

contract('Scheme MGN to REP', accounts => {
  it('works', async () => {
    
    await setup({
      accounts
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
