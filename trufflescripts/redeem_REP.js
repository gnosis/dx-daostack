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
    
    const [dxLMR_LOCK_EVENTS, dxLER_LOCK_EVENTS, dxLWR_LOCK_EVENTS] = await Promise.all([
      dxLMR.getPastEvents('Lock', { fromBlock: 0 }),
      dxLER.getPastEvents('Lock', { fromBlock: 0 }),
      dxLWR.getPastEvents('Lock', { fromBlock: 0 }),
    ])
    console.log('TCL: dxLMR_LOCK_EVENTS, dxLER_LOCK_EVENTS, dxLWR_LOCK_EVENTS', dxLMR_LOCK_EVENTS, dxLER_LOCK_EVENTS, dxLWR_LOCK_EVENTS) 
  } catch (error) {
    console.error(error)
  } finally {
    process.exit()
  }
}
