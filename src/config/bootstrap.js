// Bootstrap schemes config
const SECONDS_PER_DAY = 24 * 60 * 60

module.exports = {
  // Locked MGN
  //  - Get REP out of the locked MGN
  getLockedMgnSignature: 'lockedTokenBalances(address)',

  // GEN Auctions
  //  - Get REP out of auctioning GEN
  // TODO: Decide
  numberOfGenAuctions: 5,

  // ETH Locking (in seconds)
  maxLockingEthPeriod: 180 * SECONDS_PER_DAY ,

  // Whitelisted tokens Locking
  maxLockingWhitelistedTokensPeriod: 180 * SECONDS_PER_DAY

  // dappConf card conf
}
