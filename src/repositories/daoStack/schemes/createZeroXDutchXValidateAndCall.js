const assert = require('assert')

module.exports = ({
  ZeroXDutchXValidateAndCall
}) => async ({
  avatarAddress,
  zeroXTokenRegistryContract,
  dutchXContract
}) => {
  assert(avatarAddress, 'avatarAddress is required')
  assert(zeroXTokenRegistryContract, 'zeroXTokenRegistryContract is required')
  assert(dutchXContract, 'dutchXContract is required')

  return ZeroXDutchXValidateAndCall.new(
    avatarAddress,
    zeroXTokenRegistryContract,
    dutchXContract
  )
}
