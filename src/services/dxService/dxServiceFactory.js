const debug = require('debug')('test:services:dx');
const dxRepoFactory = require('../../../src/repositories/dx/dxRepoFactory');

module.exports = async ({
  artifacts
}) => {
  const dxRepo = await dxRepoFactory({
    artifacts
  });

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
      });
      const mgn = await dxRepo.getMgn(account);
      debug('Using MGN: %s', mgn.address);

      debug('Minting: %d', mintAmount);

      await mgn.updateMinter(account);

      await mgn.mintTokens(account, mintAmount);

      debug('Locking: %d', lockAmount);
      await mgn.lockTokens(lockAmount);
      return mgn;
    }
  };
};
