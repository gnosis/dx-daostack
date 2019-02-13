const { toBN } = require('./utils')(web3)
const { increaseTimeAndMine, getTimestamp } = require('../src/helpers/web3helpers')(web3)

const DxLockMgnForRepArtifact = artifacts.require('DxLockMgnForRep')
const DxDaoClaimRedeemHelperArtifact = artifacts.require('DxDaoClaimRedeemHelper')
const ExternalTokenLockerMock = artifacts.require('ExternalTokenLockerMock')
const TokenMGN = artifacts.require('TokenFRT')
const TokenMGNProxy = artifacts.require('TokenFRTProxy')

// Why this script?

// 1 Get DxLockMgnForRep contract
// either the deployed one (if artifacts have network) 
// or from a given networks-*.json file (-f flag?)
// or provided as an execution --flag

// 2 Get all Register events from the contract
// Contract.Register().getData or something like that
// var res = await lock.getPastEvents('Register', {fromBlock:0})

// test with this one, has events
// https://rinkeby.etherscan.io/address/0xa248671eC41110D58e587120a5B9C24A66daBfc6#events

// 3 Get all accounts that registered
// call Contract.claim(account) for them
// that produces Lock events

// 4 Would also be good to save log somewhere
// e.g
// {
//   <address>: {
//     Lock: {}
//     error: ?
//   }
// }    

// artifacts and web3 are available globally
const main = async () => {

  /**
   * How best to run this for testing @ Rinkeby
   * 
   * Rinkeby:
   * [use flag --mock-mgn to use mocked ExternalLocking contract allowing testing w/LockedMGNBalance
   * [use flag -f 'networks-rinkeby-long-lock.json' for addresses]
   * [use flag --from-block 0]
   * 
   * Complete [ DRY-RUN ]: npx truffle exec src/scripts/claim_mgn.js --network rinkeby -f 'networks-rinkeby-long-lock.json' --mock-mgn --from-block 0
   * Complete [ REAL-RUN ]: npx truffle exec src/scripts/claim_mgn.js --network rinkeby -f 'networks-rinkeby-long-lock.json' --mock-mgn --from-block 0 --dry-run false
   */

  // address of DxLockMgnForRep contract with Register events
  const REGISTER_EVENTS = '0xa248671eC41110D58e587120a5B9C24A66daBfc6'

  const argv = require('yargs')
    .usage('Usage: MNEMONIC="evil cat kills man ... " npm run claimMGN -- -f [string] --network [name] --dry-run --batch-size [number]')
    .option('f', {
      type: 'string',
      describe: 'Networks JSON file name'
    })
    .option('network', {
      type: 'string',
      default: 'development',
      describe: 'Blockchain network to operate on'
    })
    .option('dryRun', {
      type: 'boolean',
      default: true,
      describe: 'Run contract functions via [.call]'
    })
    .option('batchSize', {
      type: 'string',
      default: '500',
      describe: 'Set batch size'
    })
    .option('mockMGN', {
      type: 'boolean',
      default: false,
      describe: 'Use mock MGN contract to simulate - TESTING ONLY'
    })
    // TODO: remove
    .option('knownEvents', {
      type: 'boolean',
      default: false,
      describe: 'Set contract address to one with Register events'
    })
    .option('fromBlock', {
      type: 'number',
      default: 7185000,
      describe: 'Set from which Block to check for events'
    })
    .help('help')
    .argv

  if (!argv._[0]) return argv.showHelp()

  const { dryRun, network, f, batchSize, mockMGN, knownEvents, fromBlock } = argv

  console.log(`
      Claim MGN data:
      
      ====================================================================
      Dry run: ${dryRun}
      Network: ${network}
      Network file: ${f}
      Batch size: ${batchSize}
      Use known Rinkeby address with Register Events? ${knownEvents}
      Searching Events from block: ${fromBlock}
      ====================================================================
  `)

  try {
    let dxLockMgnForRep
    let promisedDxDaoClaimRedeemHelper
    // let promisedTokenMGN

    // Conditionally check which contract addresses to use
    if (f) {
      console.log(`
      =====================================================================================

      Network flag detected [-f] - attempting to use networks from ${f}

      =====================================================================================
      `)
      // if f flag is specified, use networks file passed in
      // to set contract addresses
      const fs = require('fs')
      const contractNetworksMap = JSON.parse(fs.readFileSync(f))
      const netID = await web3.eth.net.getId()
      try {
        dxLockMgnForRep = await DxLockMgnForRepArtifact.at(contractNetworksMap['DxLockMgnForRep'][netID].address)
        promisedDxDaoClaimRedeemHelper = DxDaoClaimRedeemHelperArtifact.at(contractNetworksMap['DxLockMgnForRepHelper'][netID].address)
        promisedTokenMGN = TokenMGN.at(contractNetworksMap['TokenFRTProxy'][netID].address)
      } catch (error) {
        const ERROR_MESSAGE = `
        No relevant netID addresses found. Stopping. 
        Please check your networks file that the above contracts respective addresses have been added.
        `
        handleError(error, ERROR_MESSAGE)
      }
    } else {
      try {
        // Use current artifacts network addresses inside build/contracts
        // const dxLockMgnForRep = await DxLockMgnForRepArtifact.at('0xa248671eC41110D58e587120a5B9C24A66daBfc6')
        dxLockMgnForRep = (network === 'rinkeby' && knownEvents) ? await DxLockMgnForRepArtifact.at(REGISTER_EVENTS) : await DxLockMgnForRepArtifact.deployed()

        // Start promise resolve for DxLockMgnForRepHelper
        promisedDxDaoClaimRedeemHelper = DxDaoClaimRedeemHelperArtifact.deployed()

        // Allow use of MockMGN contract, only on development
        if (mockMGN && network !== 'mainnet') {
          console.log(`
      =====================================================================

      Using ExternalTokenLockerMock.address as MGN [MOCK MGN FLAG DETECTED]

      =====================================================================
          `)
          const eTLM = await ExternalTokenLockerMock.deployed()
          promisedTokenMGN = TokenMGN.at(eTLM.address)
        } else {
          // else use the regular method of TokenFRTProxy address
          console.log('Using TokenFRTProxy.address as MGN [DEFAULT]')
          promisedTokenMGN = TokenMGN.at(TokenMGNProxy.address)
        }
      } catch (error) {
        const ERROR_MESSAGE = (`
        MGN Token initialisation errors encountered. 
        It is likely your contract artifacts don't have the correct injected networks.
        `)

        handleError(error, ERROR_MESSAGE)
      }
    }

    // Hook up to DxLockMgnForRep contract with known Rinkeby Register events
    if (network === 'rinkeby' && knownEvents) {
      console.log(`
      =============================================================================================================

      Using DxLockMgnForRep Rinkeby address with known Register Events @ ${REGISTER_EVENTS}

      =============================================================================================================
      `)
      dxLockMgnForRep = await DxLockMgnForRepArtifact.at(REGISTER_EVENTS)
    }

    if (fromBlock === 0 || fromBlock < 7185000) {
      console.warn(`
      =================================================================================================================
      WARNING: You are checking for Register events from either Block 0 or from a block further back than 15 hours ago.
      Script may hang or fail unexpectedly on Mainnet as filter array length size is too large.

      Please explicitly set the [--from-block <number>] flag if necessary.
      =================================================================================================================
      `)
    }

    /**
     * allPastRegisterEvents
     * @summary Promise for all past Register events fromBlock flag or 7185000
     * @type { [] } - Array of Event objects
     */
    const allPastRegisterEvents = await dxLockMgnForRep.getPastEvents('Register', { fromBlock })
    if (!allPastRegisterEvents.length) throw 'Controlled THROW: No registered users. Aborting. Did you forget [--from-block 0]?'

    /**
     * allFromandBeneficiaries
     * @summary Array with OBJECT items { from: '0x...', beneficiary: '0x...' }
     * @type { string[] }
     */
    const allBeneficiariesFromEvents = allPastRegisterEvents.map(({ returnValues }) => returnValues._beneficiary)
    // console.log('All Registered Beneficiaries Addresses', allBeneficiaries)

    /* 
      VALIDATION - REMOVE UN-CLAIMABLE USER ADDRESSES
    */

    // Make sure that beneficiaries inside allBeneficiaries have NOT already claimed  
    const hasRegistered = await Promise.all(allBeneficiariesFromEvents.map(bene => dxLockMgnForRep.externalLockers.call(bene)))
    const allBeneficiaries = allBeneficiariesFromEvents.reduce((acc, bene, idx) => {
      if (hasRegistered[idx]) return acc

      acc.push(bene)
      return acc
    }, [])
    if (!allBeneficiaries.length) throw 'Controlled THROW: No first time registered users available. Aborting.'

    // Get beneficiaries' MGN locked balance (since there's no point in claiming 0 balance MGN...)
    const mgn = await promisedTokenMGN
    const beneficiariesMgnBalances = await Promise.all(allBeneficiaries.map(beneficiary => mgn.lockedTokenBalances.call(beneficiary)))

    /**
     * beneficiariesWithBalance
     * @summary Maps through beneficiaries to grab address and add MGN locked balance - filters out 0 balance
     * @type { { address: string, balance: BN }[] }
     */
    const beneficiariesWithBalance = allBeneficiaries
      .map((bene, i) => ({ address: bene, balance: beneficiariesMgnBalances[i] }))
      .filter(({ balance }) => balance.gt(toBN(0)))
    console.log('\nBeneficiary Addresss + Balances Objects: \n', JSON.stringify(beneficiariesWithBalance.map(item => ({ ...item, balance: item.balance.toString() })), undefined, 2))
    if (!beneficiariesWithBalance.length) throw 'Controlled THROW: No registered users with any MGN balance. Aborting.'

    // Development only, can be removed
    if (network === 'development') {
      // All time values below in denoted in SECONDS
      const { NOW, TIME_JUMP_REQUIRED } = await getDxLockMgnForRepState(dxLockMgnForRep)

      if (TIME_JUMP_REQUIRED.gt(toBN(0))) {
        console.log(`
        A time change is required - fast-forwarding ganache blockchain time...
        TIME BEFORE = [in SECONDS] = ${NOW.toString()}
        [FORMATTED: ${new Date(NOW.toString() * 1000)}]
        
        TIME REQUIRED JUMPING FORWARD: ${toBN(TIME_JUMP_REQUIRED).toString()}
      `)

        //TODO: remove
        await increaseTimeAndMine(TIME_JUMP_REQUIRED.toNumber())

        console.log(`
        Time jump successful...
        TIME AFTER = [in SECONDS] = ${toBN(await getTimestamp()).toString()}
        [FORMATTED: ${new Date(toBN(await getTimestamp()).toString() * 1000)}]
      `)
      }
      // console.log('Time jump NOT required. Skipping...')
    }

    // get dxLockHelper
    const dxDaoClaimRedeemHelper = await promisedDxDaoClaimRedeemHelper
    // Extract only addresses w/MGN locked balance into array
    const beneficiariesWithBalanceAddressesOnly = beneficiariesWithBalance.map(({ address }) => address)

    // Below is required as Solidity loop function claimAll inside DxLockMgnForRepHelper.claimAll is NOT reverting when looping and
    // calling individual DxLockMgnForRep.claim method on passed in beneficiary addresses
    // Lines 268 - 277 filter out bad responses and leave claimable addresses to batch
    const individualClaimCallReturn = await Promise.all(beneficiariesWithBalanceAddressesOnly.map(beneAddr => dxLockMgnForRep.claim.call(beneAddr)))
    console.log('DxLockMgnForRep.claim on each acct call result: ', individualClaimCallReturn)
    console.log('Filtering out 0x08c379a000000000000000000000000000000000000000000000000000000000 values...')

    const accountsClaimable = individualClaimCallReturn.reduce((acc, item, index) => {
      if (item === '0x08c379a000000000000000000000000000000000000000000000000000000000') return acc

      acc.push(beneficiariesWithBalanceAddressesOnly[index])
      return acc
    }, [])
    console.log('Final Filtered Values', accountsClaimable)

    if (!accountsClaimable.length) throw 'Controlled THROW: No final claimable addresses. Aborting.'

    if (dryRun) {
      console.warn(`
      ============================================================================
      
      DRY-RUN ENABLED - Call values returned, no actual blockchain state affected. 
      To actually change state, please run without [--dry-run false].

      ============================================================================
      `)

      // TODO: fix this
      // Workaround as failing bytes32[] call return doesn't properly throw and returns
      // consistent 'overflow' error(seems to be Truffle5 + Ethers.js issue)
      // 1 = dxLMR
      await dxDaoClaimRedeemHelper.claimAll.estimateGas(accountsClaimable, 1)
      console.log('\nPreparing claimAll call...')
      // 1 = dxLMR
      const lockingIdsArray = await dxDaoClaimRedeemHelper.claimAll.call(accountsClaimable, 1)
      console.log('\nLocking IDs Array', JSON.stringify(lockingIdsArray, undefined, 2))
    } else {
      console.log('\nPreparing actual claimAll - this WILL affect blockchain state...')
      const claimAllReceipts = await dxDaoClaimRedeemHelper.claimAll(accountsClaimable, 1)
      console.log('ClaimAll Receipt(s)', claimAllReceipts)
    }
  } catch (error) {
    console.error(error)
  } finally {
    console.warn(`
      ===========
      
      SCRIPT DONE

      ===========
    `)
  }
}
/** 
 * Helper Functions
*/
async function getDxLockMgnForRepState(dxLockMgnContract) {
  // TODO: node_modules/truffle/lib/cli.bundled.js > 
  // var outputBlockFormatter = function(block) { ... }
  // ^^ Removed as breaking fast-forwarding
  // Fix is below...
  // NOW = SECONDS - mult by 1000 for millis
  const NOW = toBN(await getTimestamp()).toString()

  // All time values in SECONDS
  // Mult by 1000 for millisecond values needed to print via new Date(...)
  const [MAX_LOCKING_PERIOD, LOCKING_END_TIME, LOCKING_START_TIME] = await Promise.all([
    dxLockMgnContract.maxLockingPeriod.call(),
    dxLockMgnContract.lockingEndTime.call(),
    dxLockMgnContract.lockingStartTime.call()
  ])

  const TIME_JUMP_REQUIRED = LOCKING_START_TIME.sub(toBN(NOW))

  return {
    NOW,
    MAX_LOCKING_PERIOD,
    LOCKING_END_TIME,
    LOCKING_START_TIME,
    TIME_JUMP_REQUIRED: TIME_JUMP_REQUIRED.gt(toBN(0)) ? TIME_JUMP_REQUIRED : toBN(0)
  }
}

function handleError(error, message) {
  throw `

    ERROR!
    ======================================================================
    ${message}

    Error: ${error.message || 'Unknown error occurred'}
    ======================================================================

  `
}

module.exports = cb => main().then(() => cb(), cb)
