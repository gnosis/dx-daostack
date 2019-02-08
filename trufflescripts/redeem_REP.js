// artifacts and web3 are available globally
const { toBN } = require('./utils')(web3)

const DxLockMgnForRepArtifact = artifacts.require('DxLockMgnForRep')
const DxLockEth4RepArtifact = artifacts.require('DxLockEth4Rep')
const DxLockWhitelisted4RepArtifact = artifacts.require('DxLockWhitelisted4Rep')

// Same as claim_MGN, but
// look for Lock events in DxLockMgnForRep, DxLockEth4Rep, DxLockWhitelisted4Rep
// and Bid event in DxGenAuction4Rep
// contracts in ./networks-3rd-rinkeby-test.json should have those
// then call Contract.redeem(account)

// To help console testing
// const dxLMR = await DxLockMgnForRep.at('0x6099974d7Ed074110db69C515EC748893df43f13'); const dxLER = await DxLockEth4Rep.at('0x311814CAfb902C72e87aAbC2978751B7314646e6'); const dxLWR = await DxLockWhitelisted4Rep.at('0x1f05d55Cf3FA74eA658D87E48c60C5199Bad4caF'); const dxBAG = await DxGenAuction4Rep.at('0x2B19c60d6934E2f20515a8aECCaC4a5c58221BD4')

module.exports = async () => {

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
  // TODO: remove
  .option('registerEvents', {
    type: 'boolean',
    default: 'false',
    describe: 'Set contract address to one with Register events'
  })
  .help('help')
  .argv

  if (!argv._[0]) return argv.showHelp()

  const { dryRun, network, f, batchSize } = argv

  console.log(`
    claim_MGN.js data:

    Dry run: ${dryRun}
    Network: ${network}
    Network file: ${f}
    Batch size: ${batchSize}
  `)

  try {
    let dxLMR, dxLER, dxLWR

    if (f) {
      const fs = require('fs')
      const contractNetworksMap = JSON.parse(fs.readFileSync(f))
      const netID = await web3.eth.net.getId();

      ([dxLMR, dxLER, dxLWR] = await Promise.all([
        DxLockMgnForRepArtifact.at(contractNetworksMap['DxLockMgnForRep'][netID].address),
        DxLockEth4RepArtifact.at(contractNetworksMap['DxLockEth4Rep'][netID].address),
        DxLockWhitelisted4RepArtifact.at(contractNetworksMap['DxLockWhitelisted4Rep'][netID].address),
      ]))
    } else {
      ([dxLMR, dxLER, dxLWR] = await Promise.all([
        DxLockMgnForRepArtifact.deployed(),
        DxLockEth4RepArtifact.at(contractNetworksMap['DxLockEth4Rep'][netID].address),
        DxLockWhitelisted4RepArtifact.deployed(),
      ]))
    }
    
    // 1. Check all Lock events for dxLockMGNForRep, dxLockETHForRep, and dxLockWhitelistForRep
    //TODO: should this be 1 array? Does it matter if it's split?
    const [dxLMR_LOCK_EVENTS, dxLER_LOCK_EVENTS, dxLWR_LOCK_EVENTS] = await Promise.all([
      dxLMR.getPastEvents('Lock', { fromBlock: 0 }),
      dxLER.getPastEvents('Lock', { fromBlock: 0 }),
      dxLWR.getPastEvents('Lock', { fromBlock: 0 }),
    ])

    // 2. Of all the beneficiaries in step 1, use only the ones that ALSO have
    console.log('TCL: dxLMR_LOCK_EVENTS, dxLER_LOCK_EVENTS, dxLWR_LOCK_EVENTS', dxLMR_LOCK_EVENTS, dxLER_LOCK_EVENTS, dxLWR_LOCK_EVENTS) 
  } catch (error) {
    console.error(error)
  } finally {
    process.exit()
  }
}
