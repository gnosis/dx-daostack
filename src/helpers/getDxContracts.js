const constracts = {
  Avatar: 'controller/Avatar',
  DAOToken: 'controller/DAOToken',
  Reputation: 'controller/Reputation',
  DAOToken: 'controller/ControllerCreator',
  DAOToken: 'controller/ExternalLocking4Reputation',
}

function getDaoStackContracts (artifacts) {
  const TokenFRT = artifacts.require("./TokenFRT.sol");

  return {
    TokenFRT
  }
}

module.exports = getDaoStackContracts
