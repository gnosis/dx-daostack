/* global artifacts */
/* eslint no-undef: "error" */

module.exports = async function (deployer, network, accounts) {
  if (network === 'development') {
    console.log('Deploying some contracts into a local ganche-cli')
    const owner = accounts[0]

    // deploy MGN, GEN
    // await deployTokens(deployer, owner)

    // Deploy voting machines
    // await deployVotingMachines()

    // Deploy DaoStack Universal Controllers
    // await deployUniversalControllers(deployer)

    // deploy

    // // deploy GenesisProtocol
    // // gen token
    // var stakingTokenAddress = '0x543Ff227F64Aa17eA132Bf9886cAb5DB55DCAddf'
    // if (network === 'development') {
    //   await deployer.deploy(StandardTokenMock, options.from, 1000, options)
    //   var stakingToken = await StandardTokenMock.deployed()
    //   stakingTokenAddress = stakingToken.address
    // }
    // await deployer.deploy(GenesisProtocol, stakingTokenAddress, options)
    // var genesisProtocolInstance = await GenesisProtocol.deployed()

    // await genesisProtocolInstance.setParameters(genesisProtocolParams, options)
    // var genesisProtocolParamsHash = await genesisProtocolInstance.getParametersHash(genesisProtocolParams, options)


    // }) => {
    //   return deployer
    //     .deploy(ControllerCreator)
    //     .then(() => deployer.deploy(DaoCreator, ControllerCreator.address))
    //     .then(() => deployer.deploy(SchemeRegistrar))
    //     .then(() => {
    //       // Fix to truffle-contract/migration not saving JSON
    //       return Promise.all([
    //         ControllerCreator.saveArtifact(),
    //         DaoCreator.saveArtifact(),
    //         SchemeRegistrar.saveArtifact()
    //       ])
    //     })
    // })
  } else {
    console.log('Not in development, so nothing to do. Current network is %s', network)
  }
}

async function deployUniversalControllers (deployer) {
  const SchemeRegistrar = artifacts.require('DxToken')
  const UpgradeScheme = artifacts.require('UpgradeScheme')
  const GlobalConstraintRegistrar = artifacts.require('GlobalConstraintRegistrar')

  // Deploy some DaoStack Universal Controllers
  console.log('Scheme: Deploying SchemeRegistrar:')
  console.log('  - used for registering and unregistering schemes at organizations')
  await deployer.deploy(SchemeRegistrar)

  console.log('Scheme: Deploying UpgradeScheme:')
  console.log('  - upgrade the controller of an organization to a new controller')
  await deployer.deploy(UpgradeScheme)

  console.log('Scheme: Deploying GlobalConstraintRegistrar')
  console.log('  - register or remove new global constraints')
  await deployer.deploy(GlobalConstraintRegistrar)
}

async function deployTokens (deployer, owner) {
  const GenToken = artifacts.require('GenToken')
  const MgnToken = artifacts.require('MgnToken')
  const WethToken = artifacts.require('WethToken')
 
  console.log('Token: Deploying GEN Token:')
  await deployer.deploy(GenToken)
}

async function deployVotingMachines (deployer) {
  const GenesisProtocol = artifacts.require('GenesisProtocol')

  // TODO: Are we staking using GEN? (review this part)
  console.log('Voting machine: Deploying GenesisProtocol')
  console.log("  - GenesisProtocol implementation -an organization's voting machine scheme.")
  await deployer.deploy(GenesisProtocol)
}