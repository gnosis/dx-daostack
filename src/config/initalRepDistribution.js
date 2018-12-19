/*
* Initial REP distribution amounts
*/

/*
TOTAL: 1M
  Whitelisted tokens: 30%
  ETH: 8%
  dAppCon: 2%
  GEN: 10%
  MGN: 50%
*/

const INITIAL_REP_DISTRIBUTION = 1e6
 
const WHITELISTED_TOKENS_PERCENTAGE = 30
const ETH_PERCENTAGE = 8
const CONTRIBUTORS_PERCENTAGE = 2
const GEN_PERCENTAGE = 10
const MGN_PERCENTAGE = 50

const totalAssignedRep =
  WHITELISTED_TOKENS_PERCENTAGE +
  ETH_PERCENTAGE +
  CONTRIBUTORS_PERCENTAGE +
  GEN_PERCENTAGE +
  MGN_PERCENTAGE

const assert = require('assert')
assert(totalAssignedRep === 100, 'The percecentages must sum 100%')

module.exports = {
  whitelistedTokensReward: getReward(WHITELISTED_TOKENS_PERCENTAGE),
  ethReward: getReward(ETH_PERCENTAGE),
  contributorsReward: getReward(CONTRIBUTORS_PERCENTAGE),
  genReward: getReward(GEN_PERCENTAGE),
  mgnReward: getReward(MGN_PERCENTAGE)
}

function getReward (percentage) {
  return Math.ceil((INITIAL_REP_DISTRIBUTION * percentage) / 100)
}
