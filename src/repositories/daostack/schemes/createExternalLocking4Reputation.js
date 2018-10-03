const assert = require('assert');
const constants = require('../util/constants');

module.exports = ({
  ExternalLocking4Reputation
}) => async ({
  avatarAddress,
  reputationReward,
  lockingStartTime,
  lockingEndTime,
  externalLockingContract,
  getBalanceFuncSignature
}) => {
  assert(avatarAddress, 'avatarAddress is required');
  assert(reputationReward, 'reputationReward is required');
  assert(lockingStartTime, 'lockingStartTime is required');
  assert(lockingEndTime, 'lockingEndTime is required');
  assert(externalLockingContract, 'externalLockingContract is required');
  assert(getBalanceFuncSignature, 'getBalanceFuncSignature is required');

  return ExternalLocking4Reputation.new(
    avatarAddress,
    reputationReward,
    lockingStartTime,
    lockingEndTime,
    externalLockingContract,
    getBalanceFuncSignature,
    {
      from: web3.eth.accounts[0],
      gas: constants.ARC_GAS_LIMIT
    }
  );
};
