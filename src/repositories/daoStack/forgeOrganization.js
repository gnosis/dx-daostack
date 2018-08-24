const assert = require('assert')
const constants = require('./util/constants')

module.exports = ({
  daoCreatorGetter,
  Avatar,
  DAOToken,
  Reputation
}) => async ({
  organizationName,
  tokenName,
  tokenSymbol,
  founders,
  // universal controller instance
  // if _uController address equal to zero the organization
  // will use none universal controller
  controller = 0,
  // token cap - 0 for no cap
  cap = 0
}) => {
  assert(founders || founders.length > 0, 'At least one founder is mandatory')

  const {
    foundersArray,
    foundersTokenAmounts,
    founderReputationAmounts
  } = founders.reduce((acc, founder) => {
    assert(founder.account, 'The founder account is mandarory')
    acc.foundersArray.push(founder.account)
    acc.foundersTokenAmounts.push(founder.tokenAmount)
    acc.founderReputationAmounts.push(founder.reputationAmount)

    return acc
  }, {
    foundersArray: [],
    foundersTokenAmounts: [],
    founderReputationAmounts: []
  })

  // Create organization
  const daoCreator = await daoCreatorGetter()
  var tx = await daoCreator.forgeOrg(
    organizationName,
    tokenName,
    tokenSymbol,
    foundersArray,
    foundersTokenAmounts,
    founderReputationAmounts,
    controller,
    cap, {
      gas: constants.ARC_GAS_LIMIT
    })

  // Validate that the organization was created
  assert.strictEqual(tx.logs.length, 1)
  assert.strictEqual(tx.logs[0].event, constants.EVENT_NEW_ORGANIZATION)

  var avatarAddress = tx.logs[0].args._avatar
  const avatar = await Avatar.at(avatarAddress)

  var tokenAddress = await avatar.nativeToken()
  const token = await DAOToken.at(tokenAddress)

  var reputationAddress = await avatar.nativeReputation()
  const reputation = await Reputation.at(reputationAddress)

  return {
    avatar,
    token,
    reputation,
    tx
  }
}
