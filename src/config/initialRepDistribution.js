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
const GEN_PERCENTAGE = 10 / 5 // TODO: Fix this
const MGN_PERCENTAGE = 50

const totalAssignedRep =
  WHITELISTED_TOKENS_PERCENTAGE +
  ETH_PERCENTAGE +
  CONTRIBUTORS_PERCENTAGE +
  5 * GEN_PERCENTAGE +
  MGN_PERCENTAGE

const assert = require('assert')
assert(totalAssignedRep === 100, 'The percecentages must sum 100%')

module.exports = web3 => ({
  whitelistedTokensReward: getReward(WHITELISTED_TOKENS_PERCENTAGE, web3),
  ethReward: getReward(ETH_PERCENTAGE, web3),
  contributorsReward: getReward(CONTRIBUTORS_PERCENTAGE, web3),
  genReward: getReward(GEN_PERCENTAGE, web3),
  mgnReward: getReward(MGN_PERCENTAGE, web3)
})

function getReward(percentage, web3) {
  const val = Math.ceil((INITIAL_REP_DISTRIBUTION * percentage) / 100).toString()
  // (numbers >= 1e21).toString() result in strings in E-notation, which breaks toWei()
  assert(!val.includes('e'), `reputation reward ${val} shouldn't be in E-notation`)
  return web3.utils.toWei(val)
}
