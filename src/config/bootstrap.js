const bs58 = require('bs58')

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
  numberOfGenAuctions: getIntParam(process.env.NUMBERS_OF_GEN_AUCTIONS, 10),

  // ETH Locking (in seconds)
  maxLockingEthPeriod: getIntParam(process.env.MAX_LOCKING_PERIOD, 30 * SECONDS_PER_DAY),

  // Whitelisted tokens Locking
  maxLockingWhitelistedTokensPeriod: getIntParam(process.env.MAX_LOCKING_PERIOD, 30 * SECONDS_PER_DAY),

  // IPFS hash for user agreement
  agreementHash: process.env.AGREEMENT_HASH ?
    '0x' + bs58.decode(process.env.AGREEMENT_HASH).slice(2).toString('hex')
    : '0x0'
}
