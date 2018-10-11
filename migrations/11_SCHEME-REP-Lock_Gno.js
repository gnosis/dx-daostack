/* global artifacts */
/* eslint no-undef: "error" */

module.exports = async function (deployer) {
  console.log('TODO: Deploy LockGnoForRep that inherits from LockingToken4Reputation')
  console.log('Configure LockGnoForRep')
  // TODO: Check permissions OLD_dao_migration.js
  console.log('controller.registerScheme(_schemes[i], _params[i], _permissions[i],address(_avatar));')

  // await deployer.deploy(LockingToken4Reputation,
  //   AvatarInst.address,
  //   lockingToken4ReputationParamsJson.reputationReward,
  //   lockingToken4ReputationParamsJson.lockingStartTime,
  //   lockingToken4ReputationParamsJson.lockingEndTime,
  //   lockingToken4ReputationParamsJson.maxLockingPeriod,
  //   lockingToken4ReputationParamsJson.token, // GNO token
  //   options)
  // var lockingToken4ReputationInst = await LockingToken4Reputation.deployed()
}
