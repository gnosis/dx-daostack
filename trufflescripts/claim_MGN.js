const { toBN } = require('./utils')(web3)

const DxLockMgnForRepArtifact = artifacts.require('DxLockMgnForRep')
const DxLockMgnForRepHelperArtifact = artifacts.require('DxLockMgnForRepHelper')
const ExternalTokenLockerMock = artifacts.require('ExternalTokenLockerMock')
const TokenMGN = artifacts.require('TokenFRT')
const TokenMGNProxy = artifacts.require('TokenFRTProxy')

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
    .option('registerEvents', {
      type: 'boolean',
      default: 'false',
      describe: 'Set contract address to one with Register events'
    })
    .help('help')
    .argv
  
    if (!argv._[0]) return argv.showHelp()

  const { dryRun, network, f, batchSize, mockMGN } = argv

  console.log(`
    claim_MGN.js data:

    Dry run: ${dryRun}
    Network: ${network}
    Network file: ${f}
    Batch size: ${batchSize}
  `)

  try {
    let dxLockMgnForRep
    let promisedDxLockMgnForRepHelper
    let promisedTokenMGN
    
    // Conditionally check which contract addresses to use
    if (f) {
      // if f flag is specified, use networks file passed in
      // to set contract addresses
      const fs = require('fs')
      const contractNetworksMap = JSON.parse(fs.readFileSync(f))
      const netID = await web3.eth.net.getId()
      
      dxLockMgnForRep = await DxLockMgnForRepArtifact.at(contractNetworksMap['DxLockMgnForRep'][netID].address)
      promisedDxLockMgnForRepHelper = DxLockMgnForRepHelperArtifact.at(contractNetworksMap['DxLockMgnForRepHelper'][netID].address)
      promisedTokenMGN = TokenMGN.at(contractNetworksMap['TokenFRTProxy'][netID].address)
    } else {
      // Use current artifacts network addresses inside build/contracts
      // const dxLockMgnForRep = await DxLockMgnForRepArtifact.at('0xa248671eC41110D58e587120a5B9C24A66daBfc6')
      dxLockMgnForRep = await DxLockMgnForRepArtifact.deployed()
      promisedDxLockMgnForRepHelper = DxLockMgnForRepHelperArtifact.deployed()

      if (mockMGN && network === 'development') {
        console.log('MOCK MGN FLAG DETECTED - using ExternalTokenLockerMock.address')
        promisedTokenMGN = TokenMGN.at(ExternalTokenLockerMock.address)
      } else {
        console.log('Using TokenFRTProxy address')
        promisedTokenMGN = TokenMGN.at(TokenMGNProxy.address)
      }
      // TODO: change this back to use TokenFRTProxy address as this is just for mocking
      // promisedTokenMGN = TokenMGN.at(mockMGN ? ExternalTokenLockerMock.address : TokenFRTProxy.address)
    }

    // TODO: testing only - should be removed
    // Use --sure-events to use event positive DxLockMgnForRep address: 0xa248671eC41110D58e587120a5B9C24A66daBfc6
    if (argv.registerEvents) {
      console.log('Using RegisterEvents address @', REGISTER_EVENTS)
      dxLockMgnForRep = await DxLockMgnForRepArtifact.at(REGISTER_EVENTS)
    }

    /**
     * allPastRegisterEvents
     * @summary Promise for all past Register events fromBlock 0
     * @type { [] } - Array of Event objects
     */
    const allPastRegisterEvents = await dxLockMgnForRep.getPastEvents('Register', { fromBlock: 0 })
    if (!allPastRegisterEvents.length) throw 'No registered users. Aborting.'

    /**
     * allFromandBeneficiaries
     * @summary Array with OBJECT items { from: '0x...', beneficiary: '0x...' }
     * @type { string[] }
     */
    const allBeneficiaries = allPastRegisterEvents.map(({ returnValues }) => returnValues._beneficiary)

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
    console.log('Beneficiary Address + Balances Objects: ', beneficiariesWithBalance)
    if (!beneficiariesWithBalance.length) throw 'No registered users with any MGN balance. Aborting.'
    
    // TODO: review below - fails to throw EVM in Rinkeby (???) when user has NO MGN and/or is not registered...
    // const canClaim = await Promise.all(beneficiariesWithBalance.map(({ address }) => dxLockMgnForRep.claim.call(address)))
		// console.log('Can-Claim', canClaim)
    
    const dxLockMgnForRepHelper = await promisedDxLockMgnForRepHelper
    await dxLockMgnForRepHelper.claimAll.call(allBeneficiaries)
  } catch (error) {
    console.error(error)
  } finally {
    process.exit()
  }
}
