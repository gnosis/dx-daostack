// const migrateDaoStackBase = require('../src/migrations/2_DEV_deploy_DaoStack_base')

module.exports = function (deployer, network, accounts) {
  if (network === 'development') {
    // return migrateDaoStackBase({
    //   deployer,
    //   network,
    //   accounts,
    //   web3
    // })

    // const contracts = [
    //   'ControllerCreator',
    //   'DaoCreator',
    //   'SchemeRegistrar'
    // ]
    // console.log('Deploying DaoStack base contracts: ' + contracts.join(', '))
    // getDaoStackContracts({
    //   contracts,
    //   provider: web3.currentProvider,
    //   fromDefault: accounts[0]
    // }).then(({
    //   // ControllerCreator for creating a single controller
    //   ControllerCreator,

    //   // Genesis Scheme that creates organizations
    //   DaoCreator,

    //   // A registrar for Schemes for organizations
    //   SchemeRegistrar
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
