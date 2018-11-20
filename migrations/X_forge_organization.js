/* global web3 */
/* eslint no-undef: "error" */

const forgeOrganization = require('../src/migrations/3_deploy_Token_Reputation_Avatar')

module.exports = function (deployer, network, accounts) {
  let founders
  if (process.env.FOUNDERS_LIST) {
    founders = process.env.FOUNDERS_LIST.split(',')
  }
  return forgeOrganization({
    deployer,
    network,
    accounts,
    web3,

    // Params: can be modified, but they have already a default
    organizationName: process.env.ORG_NAME,
    tokenName: process.env.TOKEN_NAME,
    tokenSymbol: process.env.TOKEN_SYMBOL,
    founders,
    initialReputation: process.env.INITIAL_REPUTATION,
    initialTokens: process.env.INITIAL_TOKENS,
    tokensCap: process.env.TOKEN_CAP
  })
}
