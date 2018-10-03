const assert = require('assert');
const constants = require('../util/constants');

module.exports = ({
  ZeroXDutchXValidateAndCall
}) => async ({
  avatarAddress,
  zeroXTokenRegistryContract,
  dutchXContract
}) => {
  assert(avatarAddress, 'avatarAddress is required');
  assert(zeroXTokenRegistryContract, 'zeroXTokenRegistryContract is required');
  assert(dutchXContract, 'dutchXContract is required');

  return ZeroXDutchXValidateAndCall.new(
    avatarAddress,
    zeroXTokenRegistryContract,
    dutchXContract,
    {
      from: web3.eth.accounts[0],
      gas: constants.ARC_GAS_LIMIT
    }
  );
};
