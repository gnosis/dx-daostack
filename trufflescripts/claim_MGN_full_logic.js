const { toBN } = require('./utils')(web3)

const argv = require('yargs').argv

const DxLockMgnForRepArtifact = artifacts.require('DxLockMgnForRep')
const DxLockMgnForRepHelperArtifact = artifacts.require('DxLockMgnForRepHelper')
const TokenMGN = artifacts.require('TokenFRT')

// artifacts and web3 are available globally
module.exports = async () => {
  // console.log('argv = ', argv)
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

  let PERIOD = toBN(1)
  let MAX_LOCKING_PERIOD
  let NOW
  let LOCKING_START_TIME
  let LOCKING_END_TIME

  try {
    // for now use the above deployed Rinkeby address w/Events
    // const dxLockMgnForRep = await DxLockMgnForRepArtifact.at('0xa248671eC41110D58e587120a5B9C24A66daBfc6')
    const dxLockMgnForRep = await DxLockMgnForRepArtifact.deployed()
    const promisedDxLockMgnForRepHelper = DxLockMgnForRepHelperArtifact.deployed()
    const promisedTokenMGN = TokenMGN.deployed()

    /**
     * allPastRegisterEvents
     * @summary Promise for all past Register events fromBlock 0
     * @type { [] } - Array of Event objects
     */
    const allPastRegisterEvents = await dxLockMgnForRep.getPastEvents('Register', { fromBlock: 0 })
    if (!allPastRegisterEvents.length) throw 'No registered users. Aborting.'

    /**
     * allFromandBeneficiaries
     * @summary ARRAY with OBJECT values { from: '0x...', beneficiary: '0x...' }
     * @type { string[] }
     */
    const allBeneficiaries = allPastRegisterEvents.map(({ returnValues }) => returnValues._beneficiary)
    
    // Run checks to make sure claimAll will properly run
    const dxLockMgnForRepHelper = await promisedDxLockMgnForRepHelper
    const mgn = await promisedTokenMGN
    
    const beneficiariesMgnBalances = await Promise.all(allBeneficiaries.map(beneficiary => mgn.balanceOf.call(beneficiary)))
		console.log('Beneficiaries MGN Balances (in BN): ', beneficiariesMgnBalances)

    // Filter out zero balance beneficiaries
    const filteredBeneficiariesMgnBalances = beneficiariesMgnBalances.filter(beneficiaryBalance => beneficiaryBalance.gt(toBN(0)))
    if (!filteredBeneficiariesMgnBalances.length) throw 'No registered users with any MGN balance. Aborting.'
    
    // Pull maxLockingPeriod to compare against current period
    MAX_LOCKING_PERIOD = await dxLockMgnForRep.maxLockingPeriod.call()
		console.log('Current MAX_LOCKING_PERIOD: ', MAX_LOCKING_PERIOD)
    if (PERIOD.gt(MAX_LOCKING_PERIOD) || PERIOD.lte(0)) throw 'Locking PERIOD must be <= MAX_LOCKING_PERIOD and PERIOD must be > 0'

    // Time checks
    // Time (in seconds) based on pending block timestamp
    NOW = toBN((await web3.eth.getBlock()).timestamp)
    LOCKING_END_TIME = (await dxLockMgnForRep.lockingEndTime.call())
    LOCKING_START_TIME = (await dxLockMgnForRep.lockingStartTime.call())
    if (NOW.gt(LOCKING_END_TIME)) throw 'NOW cannot be greater than LOCKING_END_TIME'
    if (NOW.lt(LOCKING_START_TIME)) throw 'NOW cannot be less than than LOCKING_START_TIME'
    
    // TODO: remove, not possible to replicate
    // const score = PERIOD.mul()

    const res = await dxLockMgnForRepHelper.claimAll.call(allBeneficiaries)
		console.log('Res: ', res)
  } catch (error) {
    console.error(error)
  } finally {
    process.exit()
  }
}
