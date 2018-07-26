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
  assert(avatarAddress, 'avatarAddress is required')
  assert(reputationReward, 'reputationReward is required')
  assert(lockingStartTime, 'lockingStartTime is required')
  assert(lockingEndTime, 'lockingEndTime is required')
  assert(externalLockingContract, 'externalLockingContract is required')
  assert(getBalanceFuncSignature, 'getBalanceFuncSignature is required')

  return ExternalLocking4Reputation.new(
    avatarAddress,
    reputationReward,
    lockingStartTime,
    lockingEndTime,
    externalLockingContract,
    getBalanceFuncSignature
  )
}
