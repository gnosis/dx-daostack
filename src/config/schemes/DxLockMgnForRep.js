/*
* Scheme that allows to get GEN by locking MGN
*/
const lockingPeriod = require('../lockingPeriod')

const REPUTATION_REWARD = 100

module.exports = {
  reputationReward: REPUTATION_REWARD,
  lockingStartTime: lockingPeriod.startDate,
  lockingEndTime: lockingPeriod.endDate,
  getBalanceFuncSignature: 'lockedTokenBalances(address)'
}
