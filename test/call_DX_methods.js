// Testing Generic Scheme:

// // 0
// // before
// make sure accounts have rep (GEN)

// // 1
// // get call data for
// DX.updateThresholdNewTokenPair(uint _thresholdNewTokenPair)
// DX.updateThresholdNewAuction(uint _thresholdNewAuction)

// DX.startMasterCopyCountdown(address _masterCopy)
// //timeskip 30 days
// DX.updateMasterCopy()

// DX.updateApprovalOfToken(address[] token, bool approved)

// DX.initiateEthUsdOracleUpdate(PriceOracleInterface _ethUSDOracle)
// //timeskip 30 days
// DX.updateEthUSDOracle()

// DX.updateAuctioneer(address _auctioneer)

// // basically every method with onlyAuctioneer modifier

// // 2
// call GenericScheme.proposeCall(Avatar _avatar, bytes _callData) -> proposalId

// which calls GenesisProtocol.propose(uint _numOfChoices, bytes32 _paramsHash,address _proposer,address _organization)

// GenericProtocol.proposals(proposalId) -> current proposal

// // 3
// // voting
// GenericProtocol.vote(bytes32 _proposalId, {from: accountWithRep})
// winning vote calls GenericProtocol._execute(bytes32 _proposalId)

/* global artifacts, web3, contract, it, before, after, afterEach, assert */

const MgnToken = artifacts.require('TokenFRT')
const TokenFRTProxy = artifacts.require('TokenFRTProxy')
const DxLockMgnForRep = artifacts.require('DxLockMgnForRep')
const DxReputation = artifacts.require('DxReputation')
const DxAvatar = artifacts.require('DxAvatar')
const GenericScheme = artifacts.require('GenericScheme')
const GenesisProtocol = artifacts.require('GenesisProtocol')
const DutchExchange = artifacts.require('DutchExchange')
const DutchExchangeProxy = artifacts.require('DutchExchangeProxy')
const DxController = artifacts.require('DxController')

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

const BN = require('bn.js')
const {
  increaseTimeAndMine,
  takeSnapshot,
  revertSnapshot,
  getTimestamp
} = require('../src/helpers/web3helpers')(web3)

const LOCK_AMOUNT = 2001
const YES_VOTE = new BN(1)
const NO_VOTE = new BN(2)
const EXECUTED_STATE = new BN(2)

// won't work because we transferred ownership to DxController
// only schemes registered with it can mint tokens
// async function mintReputation(account, amount, dxReputation) {
//   if (amount) {
//     const txResult = await dxReputation.mint(account, amount)
//     console.log(`REP minted:
// - Transaction: ${txResult.tx}
// - Gas used: ${txResult.receipt.gasUsed}
// `)
//   }
// }
const callForAll = (accounts, cb) => { return Promise.all(accounts.map(cb)) }

contract('Execute updateAuctioneer proposal', (accounts) => {

  const context = setupBeforeAfter(accounts)

  checkSchemeParams(context)

  checkRepBalances(context)
  checkAvatarIsAuctioneer(context)

  const RAND_ADDRESS = '0x0000000000000000000000000000000000000001'

  addProposal(context, {
    method: 'updateAuctioneer',
    input: [RAND_ADDRESS]
  })

  voteAndExecute(context)

  checkStateChanged(context, 'auctioneer', RAND_ADDRESS)
})

contract('Execute updateThresholdNewTokenPair proposal', (accounts) => {
  const context = setupBeforeAfter(accounts)

  checkSchemeParams(context)

  checkRepBalances(context)
  checkAvatarIsAuctioneer(context)

  const RAND_THRESHOLD = Math.floor(Math.random() * 2000 + 1000)

  addProposal(context, {
    method: 'updateThresholdNewTokenPair',
    input: [RAND_THRESHOLD]
  })

  voteAndExecute(context)

  checkStateChanged(context, 'thresholdNewTokenPair', RAND_THRESHOLD)
})

contract('Execute updateThresholdNewAuction proposal', (accounts) => {
  const context = setupBeforeAfter(accounts)

  checkSchemeParams(context)

  checkRepBalances(context)
  checkAvatarIsAuctioneer(context)

  const RAND_THRESHOLD = Math.floor(Math.random() * 2000 + 1000)

  addProposal(context, {
    method: 'updateThresholdNewAuction',
    input: [RAND_THRESHOLD]
  })

  voteAndExecute(context)

  checkStateChanged(context, 'thresholdNewAuction', RAND_THRESHOLD)
})

contract('Execute updateMasterCopy proposal', (accounts) => {
  const context = setupBeforeAfter(accounts)

  checkSchemeParams(context)

  checkRepBalances(context)
  checkAvatarIsAuctioneer(context)

  const RAND_ADDRESS = '0x0000000000000000000000000000000000000001'

  addProposal(context, {
    method: 'startMasterCopyCountdown',
    input: [RAND_ADDRESS]
  })

  voteAndExecute(context)

  checkStateChanged(context, 'newMasterCopy', RAND_ADDRESS)

  skip30Days()

  addProposal(context, {
    method: 'updateMasterCopy'
  })

  voteAndExecute(context)

  // .masterCopy var is on the proxy contract directly,
  // so can be accessed even if proxied to RANDOM_ADDRESS
  // any other props break
  checkStateChanged(context, 'masterCopy', RAND_ADDRESS)
})

contract('Execute updateEthUSDOracle proposal', (accounts) => {
  const context = setupBeforeAfter(accounts)

  checkSchemeParams(context)

  checkRepBalances(context)
  checkAvatarIsAuctioneer(context)

  const RAND_ADDRESS = '0x0000000000000000000000000000000000000001'

  addProposal(context, {
    method: 'initiateEthUsdOracleUpdate',
    input: [RAND_ADDRESS]
  })

  voteAndExecute(context)

  checkStateChanged(context, 'newProposalEthUSDOracle', RAND_ADDRESS)

  skip30Days()

  addProposal(context, {
    method: 'updateEthUSDOracle'
  })

  voteAndExecute(context)

  checkStateChanged(context, 'ethUSDOracle', RAND_ADDRESS)
})

contract('Execute updateApprovalOfToken proposal', (accounts) => {
  const context = setupBeforeAfter(accounts)

  checkSchemeParams(context)

  checkRepBalances(context)
  checkAvatarIsAuctioneer(context)

  const RAND_ADDRESS = '0x0000000000000000000000000000000000000001'

  addProposal(context, {
    method: 'updateApprovalOfToken',
    input: [[RAND_ADDRESS], true]
  })

  voteAndExecute(context)

  checkStateChanged(context, 'approvedTokens', true, RAND_ADDRESS)
})

function skip30Days() {
  it('skips 30 days', async () => {
    await increaseTimeAndMine(30 * 24 * 60 * 60)
  })
}

function setupBeforeAfter(accounts) {
  let snapshotId
  const context = {}

  before(async () => {
    console.log('TIMESTAMP', await getTimestamp());
    snapshotId = await takeSnapshot();
    const [master] = accounts
    const FRTProxy = await TokenFRTProxy.deployed()
    const MGN = await MgnToken.at(FRTProxy.address)
    const DxLock4Rep = await DxLockMgnForRep.deployed()
    const DxRep = await DxReputation.deployed()
    const Avatar = await DxAvatar.deployed()
    const GenericS = await GenericScheme.deployed()
    const GenesisP = await GenesisProtocol.deployed()
    const DXProxy = await DutchExchangeProxy.deployed()
    const DX = await DutchExchange.at(DXProxy.address)

    const Controller = await DxController.deployed()

    context.contracts = {
      Avatar,
      GenericS,
      GenesisP,
      DX,
      MGN,
      DxLock4Rep,
      DxRep,
      DXProxy,
      Controller,
    }

    context.accounts = accounts.slice()
    context.accounts.master = master

    await ensureRep(accounts, context.contracts)

    await ensureAvatarIsAuctioneer(accounts, context.contracts)
  })

  afterEach(() => {
    console.log('--------------------')
  })

  after(() => revertSnapshot(snapshotId))

  return context
}

function checkSchemeParams(context) {
  it('scheme parameters are correct', async () => {
    const { Controller, Avatar, GenericS, DX } = context.contracts

    const paramsHash = await Controller.getSchemeParameters(GenericS.address, Avatar.address)
    console.log('paramsHash: ', paramsHash);

    console.log('DX: ', DX.address);
    const parameters = await GenericS.parameters(paramsHash)
    // console.log('parameters: ', JSON.stringify(parameters, null, 2));

    assert.equal(DX.address, parameters.contractToCall, 'contractToCall should be DX address')
  })
}

function checkRepBalances(context) {
  it('every account has rep', async () => {
    const { contracts: { DxRep }, accounts } = context
    const balances = await callForAll(accounts, (acc) => { return DxRep.balanceOf(acc) })

    accounts.forEach((acc, i) => { return console.log(acc, 'rep:', balances[i].toString()) })

    balances.forEach((bal) => { return assert(bal.gt(new BN(0)), 'reputation balance should be > 0') })
  })
}

function checkAvatarIsAuctioneer(context) {
  it('controller (Avatar\'s owner should be auctioneer)', async () => {
    const { contracts: { Avatar, DX } } = context

    const avatar = await Avatar.address
    // console.log('avatar: ', avatar);
    const auctioneer = await DX.auctioneer()
    // console.log('auctioneer: ', auctioneer);

    assert.equal(avatar, auctioneer, 'avatar should be auctioneer to be able to change DX state')
  })
}

function addProposal(
  context,
  { method, input = [] }
) {
  it('adds a proposal', async () => {
    const { contracts: { GenericS, GenesisP, Avatar }, accounts: { master } } = context

    const methodSignature = DutchExchange.abi.find((f) => { return f.name === method })

    assert.isObject(methodSignature, `${method} should be in the abi`)
    const encoded = web3.eth.abi.encodeFunctionCall(methodSignature, input)

    const tx = await GenericS.proposeCall(Avatar.address, encoded)

    // console.log('tx: ', JSON.stringify(tx, null, 2));
    const { args } = tx.logs.find((log) => { return log.event === 'NewCallProposal' })
    const proposalId = context.proposalId = args._proposalId

    console.log('proposalId: ', proposalId);

    const proposal = await GenesisP.proposals(proposalId)

    // console.log('proposal: ', JSON.stringify(proposal, null, 2));

    const { proposer, callbacks, state, winningVote } = proposal

    assert.equal(proposer, master, 'proposer of a valid proposal should be non-zero')
    assert.equal(callbacks, GenericS.address, 'callback should be the VotingMachineCallbacks in use')
    console.log('GenericS.address: ', GenericS.address);

    assert(!state.eq(EXECUTED_STATE), 'proposal should not be in executed state')
    assert(winningVote.eq(NO_VOTE), 'default winnigVote should be NO')
  });
}


function voteAndExecute(context) {
  it('can vote and execute', async () => {
    const { contracts: { GenesisP }, accounts, proposalId } = context

    // const ex = await GenesisP.execute.call(proposalId)
    // console.log('ex: ', ex);

    let isVotable = await GenesisP.isVotable.call(proposalId)

    console.log('proposal isVotable: ', isVotable);

    assert.isTrue(isVotable, 'proposal should be votable')

    for (const acc of accounts) {
      const tx = await GenesisP.vote(proposalId, 1, acc, { from: acc })
      const events = tx.logs.map((log) => { return log.event })

      console.log(acc, 'voted on proposal', proposalId)
      // we also should receive ProposalDeleted and ProposalExecuted from GenericScheme.executeProposal
      // but we don't, (ノ°Д°）ノ︵ ┻━┻
      console.log('events: ', tx.logs.map((log) => { return log.event }).join(', '));

      if (events.includes('ExecuteProposal')) {
        // console.log('tx: ', JSON.stringify(tx.logs, null, 2));
        break
      }
    }

    isVotable = await GenesisP.isVotable.call(proposalId)
    console.log('proposal isVotable: ', isVotable);

    assert.isFalse(isVotable, 'proposal should no longer be votable')

    const proposal = await GenesisP.proposals(proposalId)

    // console.log('proposal: ', JSON.stringify(proposal, null, 2));

    const { state, winningVote } = proposal

    assert(state.eq(EXECUTED_STATE), 'proposal should be in executed state')
    assert(winningVote.eq(YES_VOTE), 'winnigVote should be YES')
  })
}

function checkStateChanged(context, variable, expected, ...input) {
  it(`${variable} is changed`, async () => {
    const { DX } = context.contracts

    const changed = await DX[variable](...input)
    const isBN = BN.isBN(changed)

    console.log(variable, ':', isBN ? changed.toString() : changed);

    isBN ?
      assert(changed.eq(new BN(expected), `${variable} should have been changed`)) :
      assert.equal(changed, expected, `${variable} should have been changed`)
  })
}

async function ensureAvatarIsAuctioneer(accounts, { Avatar, DX }) {
  const avatar = await Avatar.address
  const auctioneer = await DX.auctioneer()

  if (avatar === auctioneer) return

  if (accounts.includes(auctioneer)) {
    console.log('Changing DX auctioneer to Controller address')
    await DX.updateAuctioneer(avatar, { from: auctioneer })
    return
  }

  throw new Error(`
    Auctioneer is neither the avatar nor among the available accounts.
    Unable to proceed.`
  )
}

async function ensureRep(accounts, { MGN, DxLock4Rep, DxRep }) {
  const balances = await callForAll(accounts, (acc) => { return MGN.balanceOf(acc) })

  let repBalances = await callForAll(accounts, (acc) => { return DxRep.balanceOf(acc) })

  await callForAll(accounts, async (acc, i) => {
    if (repBalances[i].gt(new BN(0))) return
    // console.log('repBalances[i]: ', repBalances[i].toString());

    if (balances[i].lt(new BN(LOCK_AMOUNT))) {
      // minted tokens are added to lockedBalances
      // console.log('mint tokens for', acc)
      await mintTokensFor(MGN, acc, accounts, LOCK_AMOUNT)
    } else {
      // console.log('lock tokens for', acc)
      await MGN.lockTokens(LOCK_AMOUNT, { from: acc })
    }
  })

  const lockingStartTime = await DxLock4Rep.lockingStartTime()
  const timestamp1 = await getTimestamp()

  let advanceBy = lockingStartTime.sub(new BN(timestamp1 - 1000))

  await increaseTimeAndMine(advanceBy.toNumber())

  await callForAll(accounts, async (acc) => {
    /*const locked =*/ await DxLock4Rep.externalLockers(acc)
    // console.log(acc, 'locked:', locked);
  })
  await callForAll(accounts, (acc) => { return DxLock4Rep.claim(ZERO_ADDRESS, { from: acc }) })

  const redeemEnableTime = await DxLock4Rep.redeemEnableTime()
  const timestamp2 = await getTimestamp()

  advanceBy = redeemEnableTime.sub(new BN(timestamp2 - 1000))
  await increaseTimeAndMine(advanceBy.toNumber())

  await callForAll(accounts, (acc) => { return DxLock4Rep.redeem(acc) })

  repBalances = await callForAll(accounts, (acc) => { return DxRep.balanceOf(acc) })

  accounts.forEach((acc, i) => { return console.log(acc, 'rep:', repBalances[i].toString()) })
}

async function mintTokensFor(Token, address, accounts, amount) {
  const oldMinter = await Token.minter()

  let minter = oldMinter
  let owner

  // if minter not available in accounts
  if (!accounts.includes(minter)) {
    // check owner
    owner = await Token.owner()

    // owner not available in accounts, nothing we can do
    if (!accounts.includes(owner)) {
      throw new Error(`
      Neither Token owner nor minter are among available accounts.
      Unable to get tokens for sunsequent locking. Terminating.
    `)
    }

    // switch to an available account as minter
    await Token.updateMinter(owner, { from: owner })
    minter = owner
  }

  await Token.mintTokens(address, amount, { from: minter })

  // switch minter back if needed
  if (minter !== oldMinter) { await Token.updateMinter(oldMinter, { from: owner }) }
}
