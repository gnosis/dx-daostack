const { toBN } = require('./utils')(web3)
const { increaseTimeAndMine, getTimestamp } = require('../src/helpers/web3helpers')(web3)

const DxLockMgnForRepArtifact = artifacts.require('DxLockMgnForRep')
const DxLockMgnForRepHelperArtifact = artifacts.require('DxLockMgnForRepHelper')
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
module.exports = async () => {
  
  /**
   * How best to run this
   * 
   * Rinkeby:
   * [use flag --known-events to use DxLockMgnForRep with registered users w/MGN balance]
   * [use flag -f 'networks-david-test.json' for addresses]
   * [use flag --from-block 0]
   * 
   * Complete: npx truffle exec trufflescripts/claim_MGN.js --network rinkeby -f 'networks-david-test.json' --known-events --from-block 0
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
      default: false,
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
    let promisedDxLockMgnForRepHelper
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
        promisedDxLockMgnForRepHelper = DxLockMgnForRepHelperArtifact.at(contractNetworksMap['DxLockMgnForRepHelper'][netID].address)
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
        promisedDxLockMgnForRepHelper = DxLockMgnForRepHelperArtifact.deployed()

        // Allow use of MockMGN contract, only on development
        if (mockMGN && network === 'development') {
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

    /**
     * allPastRegisterEvents
     * @summary Promise for all past Register events fromBlock flag or 7185000
     * @type { [] } - Array of Event objects
     */
    if (fromBlock === 0 || fromBlock < 7185000) {
      console.warn(`
      =================================================================================================================
      WARNING: You are checking for Register events from either Block 0 or from a block further back than 15 hours ago.
      Script may hang or fail unexpectedly on Mainnet as filter array length size is too large.

      Please explicitly set the [--from-block <number>] flag if necessary.
      =================================================================================================================
      `)
    }
    const allPastRegisterEvents = await dxLockMgnForRep.getPastEvents('Register', { fromBlock })
    if (!allPastRegisterEvents.length) throw 'No registered users. Aborting.'

    /**
     * allFromandBeneficiaries
     * @summary Array with OBJECT items { from: '0x...', beneficiary: '0x...' }
     * @type { string[] }
     */
    const allBeneficiaries = allPastRegisterEvents.map(({ returnValues }) => returnValues._beneficiary)
		// console.log('All Registered Beneficiaries Addresses', allBeneficiaries)

    // Run checks to make sure claimAll will properly run
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
    if (!beneficiariesWithBalance.length) throw 'No registered users with any MGN balance. Aborting.'
    
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

    let bytesReturn = await Promise.all(beneficiariesWithBalance.map(({ address }) => dxLockMgnForRep.claim.call(address)))
		console.log('TCL: bytesReturn', bytesReturn)

    const dxLockMgnForRepHelper = await promisedDxLockMgnForRepHelper
    console.log('\nPreparing to claimAll call...')
    const lockingIdsArray = (await dxLockMgnForRepHelper.claimAll.call(beneficiariesWithBalance.map(({ address }) => address))).map(val => toBN(val))
    console.log('\nLocking IDs Array', JSON.stringify(lockingIdsArray, undefined, 2))
    
    // const claimAllReceipt = await dxLockMgnForRepHelper.claimAll(allBeneficiaries)
		// console.log('ClaimAll Receipt', claimAllReceipt)
  } catch (error) {
    console.error(error)
    // const ERROR_MESSAGE = 'File execution error, please see below.'
    // handleError(error, ERROR_MESSAGE)
  } finally {
    process.exit()
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
