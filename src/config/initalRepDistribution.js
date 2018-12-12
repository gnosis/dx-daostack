/*
* Initial REP distribution amounts
*/

/*
TOTAL: 1M
  GNO: 30%
  ETH: 8%
  dAppCon: 2%
  GEN: 10%
  MGN: 50%
*/

const INITIAL_REP_DISTRIBUTION = 1e6
 
const GNO_PERCENTAGE = 30
const ETH_PERCENTAGE = 8
const DAPPCON_CARDS_PERCENTAGE = 2
const GEN_PERCENTAGE = 10
const MGN_PERCENTAGE = 50

const totalAssignedRep =
  GNO_PERCENTAGE +
  ETH_PERCENTAGE +
  DAPPCON_CARDS_PERCENTAGE +
  GEN_PERCENTAGE +
  MGN_PERCENTAGE

const assert = require('assert')
assert(totalAssignedRep === 100, 'The percecentages must sum 100%')

module.exports = {
  gnoReward: getReward(GNO_PERCENTAGE),
  ethReward: getReward(ETH_PERCENTAGE),
  dappConReward: getReward(DAPPCON_CARDS_PERCENTAGE),
  genReward: getReward(GEN_PERCENTAGE),
  mgnReward: getReward(MGN_PERCENTAGE)
}

function getReward (percentage) {
  return Math.ceil((INITIAL_REP_DISTRIBUTION * percentage) / 100)
}
