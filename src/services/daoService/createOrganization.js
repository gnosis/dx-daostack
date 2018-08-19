const debug = require('debug')('app:services:dao')

module.exports = ({
  daoStackRepo
}) => async ({
  organizationName,
  tokenName,
  tokenSymbol,
  founders,
  controller,
  cap,
  schemes
}) => {
  // Create a test organization
  debug('Forging organization %s', organizationName)
  const {
    avatar,
    token,
    reputation
  } = await daoStackRepo.forgeOrganization({
    organizationName,
    tokenName,
    tokenSymbol,
    founders,
    controller,
    cap
  })

  debug('Organization forged: %o', {
    avatar: avatar.address,
    token: token.address,
    reputation: reputation.address
  })

  // Create all the schemes
  assert(schemes && schemes.length >0, 'At least one scheme is required')
  const schemeCreationPromises = schemes.map(async scheme => {
    assert(scheme.type, 'The scheme type is mandatory')
    debug('Creating scheme %s, with data: %o', scheme.type, scheme.data)
    switch (scheme.type) {
      case 'ExternalLocking4Reputation':
        return daoStackRepo.createSchemeExternalLocking4Reputation({
          ...scheme.data,
          avatarAddress: avatar.address
        });
      break;
      case 'ZeroXDutchXValidateAndCall':
          return daoStackRepo.createSchemeZeroXDutchXValidateAndCall({
            ...scheme.data,
            avatarAddress: avatar.address
          })
      default:
        throw new Error('Unknown scheme type ' + scheme.type)
    }
  })

  // Wait for all the scheme creations
  const schemeCreations = await Promise.all(schemeCreationPromises)

  debug('%d schemes have been created', schemeCreations.length)
  const schemesDetails = schemeCreations.map((schemeCreation, index) => {
    const scheme = schemes[index]
    return {
      address: schemeCreation.address,

      // optional params
      params: scheme.params,
      permissions: scheme.permissions
    }
  })
  
  // Set organization schemes
  debug('Set schemes into Dao %s', avatar.address)
  await daoStackRepo.setSchemes({
    avatarAddress: avatar.address,
    schemes: schemesDetails
  })

  debug('Created DAO and configured')

  return {
    avatarAddress: avatar.address,
    tokenAddress: token.address,
    reputationAddress: reputation.address,
    schemes: schemesDetails
  }
}
