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
      const mgn = await dxRepo.getMgn()
      await mgn.mintTokens(account, mintAmount)
      await mgn.lockTokens(lockAmount)  

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
    },

    getMgnAddress: async () => {
      const mgn = await dxRepo.getMgn()
      return mgn.address
    }
    */
  }   
}
