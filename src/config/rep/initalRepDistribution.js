/*
* Initial REP distribution amonts
*/
const assert = require('assert')

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
