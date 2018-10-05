/* global web3 */
/* eslint no-undef: "error" */

const migrateDaoStackBase = require('../src/migrations/3_DEV_deploy_DaoStack_base')

module.exports = function (deployer, network, accounts) {
  if (network === 'development') {
    return migrateDaoStackBase({
      deployer,
      network,
      accounts,
      web3
    })
  } else {
    console.log('Not in development, so nothing to do. Current network is %s', network)
  }
}
