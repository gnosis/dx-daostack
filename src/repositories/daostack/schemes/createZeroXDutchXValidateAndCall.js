const assert = require('assert');
const constants = require('../util/constants');

module.exports = ({
  WhitelistUsing0xList
}) => async ({
  avatarAddress,
  zeroXTokenRegistryContract,
  dutchXContract
}) => {
  assert(avatarAddress, 'avatarAddress is required');
  assert(zeroXTokenRegistryContract, 'zeroXTokenRegistryContract is required');
  assert(dutchXContract, 'dutchXContract is required');

  return WhitelistUsing0xList.new(
    avatarAddress,
    zeroXTokenRegistryContract,
    dutchXContract,
    {
      from: web3.eth.accounts[0],
      gas: constants.ARC_GAS_LIMIT
    }
  );
};
