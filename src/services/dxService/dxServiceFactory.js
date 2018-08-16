const debug = require('debug')('test:services:dx')
// const constants = require('./util/constants')
const dxRepoFactory = require('../../../src/repositories/dx/dxRepoFactory')

module.exports = async ({
  artifacts
}) => {
  const dxRepo = await dxRepoFactory({
    artifacts
  })

  // dxService API
  return {
    mintAndLockMgn: async ({
      account,
      mintAmount,
      lockAmount
    }) => {
      debug('Mint and lock: %o', {
        account,
        mintAmount,
        lockAmount
      })
      const mgn = await dxRepo.getMgn()
      debug('Using MGN: %s', mgn.address)

      debug('Minting: %d', mintAmount)
      await mgn.mintTokens(account, mintAmount)

      debug('Locking: %d', lockAmount)
      await mgn.lockTokens(lockAmount)  

      return mgn.address
    },

    getMgnAddress: async () => {
      const mgn = await dxRepo.getMgn()
      return mgn.address
    }

    /*
    mintMgn: async ({ account, amount }) => {
      const mgn = await dxRepo.getMgn()
      return mgn.mintTokens(account, amount)
    },

    lockMgn: async ({ amount }) => {
      const mgn = await dxRepo.getMgn()
      return mgn.lockTokens(amount)  
    }
    */
  }   
}
