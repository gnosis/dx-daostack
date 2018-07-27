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

  // Create all the schemes
  assert(schemes && schemes.length >0, 'At least one scheme is required')
  const schemeCreationPromises = schemes.map(async scheme => {
    assert(scheme.type, 'The scheme type is mandatory')
    switch (scheme.type) {
      case 'ExternalLocking4Reputation':
        return daoStackRepo.createSchemeExternalLocking4Reputation({
          ...scheme.data,
          avatarAddress: avatar.address
        })
      default:
        throw new Error('Unknown scheme type ' + scheme.type)
    }
  })

  // Wait for all the scheme creations
  const schemeCreations = await Promise.all(schemeCreationPromises)
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
  await daoStackRepo.setSchemes({
    avatarAddress: avatar.address,
    schemes: schemesDetails
  })

  return {
    avatarAddress: avatar.address,
    tokenAddress: token.address,
    reputationAddress: reputation.address,
    schemes: schemesDetails
  }
}
