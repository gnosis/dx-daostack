// const DEFAULT_ETH_USD_PRICE = process.env.ETH_USD_PRICE || 1100 // 500 USD/ETH
// const DEFAULT_FEED_EXPIRE_PERIOD_DAYS = process.env.FEED_EXPIRE_PERIOD_DAYS || 365 // 1 year

var getDaoStackContracts = require('../repositories/daostack/util/getDaoStackContracts')

function migrate ({
  deployer,
  accounts,
  web3
}) {
  console.log('web3.currentProvider', web3.currentProvider)
  getDaoStackContracts({
    contracts: [
      'ControllerCreator',
      'DaoCreator',
      'SchemeRegistrar'
    ],
    provider: web3.currentProvider,
    fromDefault: accounts[0]
  }).then(({
    // ControllerCreator for creating a single controller
    ControllerCreator,

    // Genesis Scheme that creates organizations
    DaoCreator,

    // A registrar for Schemes for organizations
    SchemeRegistrar
  }) => {
    return deployer
      .deploy(ControllerCreator)
      .then(() => deployer.deploy(DaoCreator, ControllerCreator.address))
      .then(() => deployer.deploy(SchemeRegistrar))
  })
}

module.exports = migrate
