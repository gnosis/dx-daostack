// const DEFAULT_ETH_USD_PRICE = process.env.ETH_USD_PRICE || 1100 // 500 USD/ETH
// const DEFAULT_FEED_EXPIRE_PERIOD_DAYS = process.env.FEED_EXPIRE_PERIOD_DAYS || 365 // 1 year

const getDaoStackContracts = require('../repositories/daostack/util/getDaoStackContracts')

// Defaults
const ORGANIZATION_NAME = 'DutchX'
const TOKEN_NAME = 'DutchX'
const TOKEN_SYMBOL = 'DUX'
const INITIAL_REPUTATION = 1e6 // TODO: 1M, isn't it?
const INITIAL_TOKENS = 10e6 // TODO: Review
const TOKENS_CAP = 1.5e6 // TODO: No idea. Confirm

function migrate ({
  deployer,
  accounts,
  web3,

  // Params
  organizationName = ORGANIZATION_NAME,
  tokenName = TOKEN_NAME,
  tokenSymbol = TOKEN_SYMBOL,
  founders = [ web3.eth.accounts[0] ],
  initialReputation = INITIAL_REPUTATION,
  initialTokens = INITIAL_TOKENS,
  tokensCap = TOKENS_CAP
}) {
  getDaoStackContracts({
    contracts: [ 'DaoCreator' ],
    provider: web3.currentProvider,
    fromDefault: accounts[0]
  }).then(({
    // Genesis Scheme that creates organizations
    DaoCreator
  }) => {
    console.log(`
Forging organization with the following data...
  - Organization name: ${organizationName}
  - Token name: ${tokenName}
  - Token symbol: ${tokenSymbol}
  - Founders (${founders.length}): ${founders.join(', ')}
  - Initial reputation: ${initialReputation}
  - Initial tokens: ${initialTokens}
  - Tokens cap: ${tokensCap}
`)
    const initRepInWei = [ web3.toWei(initialReputation) ]
    const initTokenInWei = [ web3.toWei(initialTokens) ]

    return deployer
      .then(() => DaoCreator.deployed())
      .then(daoCreator => {
        daoCreator.forgeOrg(
          organizationName,
          tokenName,
          tokenSymbol,
          founders,
          initTokenInWei,
          initRepInWei,
          0,
          tokensCap
        )
      })
  })
}

module.exports = migrate
