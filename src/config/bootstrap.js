// Bootstrap schemes config
const SECONDS_PER_DAY = 24 * 60 * 60


function getIntParam(envValue, defaultValue) {
  if (envValue) {
    return parseInt(envValue)
  } else {
    return defaultValue
  }
}


module.exports = {
  // Locked MGN
  //  - Get REP out of the locked MGN
  getLockedMgnSignature: 'lockedTokenBalances(address)',

  // GEN Auctions
  //  - Get REP out of auctioning GEN
  // TODO: Decide
  numberOfGenAuctions: getIntParam(process.env.NUMBERS_OF_GEN_AUCTIONS, 5),

  // ETH Locking (in seconds)
  maxLockingEthPeriod: getIntParam(process.env.MAX_LOCKING_PERIOD, 365 * SECONDS_PER_DAY),

  // Whitelisted tokens Locking
  maxLockingWhitelistedTokensPeriod: getIntParam(process.env.MAX_LOCKING_PERIOD, 365 * SECONDS_PER_DAY)
}
