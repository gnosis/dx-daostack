const constants = require('./util/constants');
// const getDxContracts = require('../src/helpers/getDxContracts')
const getDaoStackContracts = require('./util/getDaoStackContracts');

module.exports = async ({
  contracts,
  provider,
  fromDefault
}) => {
  const {
    ControllerCreator,
    DaoCreator,
    Avatar,
    DAOToken,
    Reputation,
    ExternalLocking4Reputation,
    WhitelistUsing0xList
  } = await getDaoStackContracts({
    contracts,
    provider,
    defaults: transactionDefaults
  });

  let daoCreator;
  const daoCreatorGetter = async () => {
    if (!daoCreator) {
      const controllerCreator = await ControllerCreator.new({
        gas: constants.ARC_GAS_LIMIT,
        from: web3.eth.accounts[0]
      });
      daoCreator = await DaoCreator.new(
        controllerCreator.address, {
          gas: constants.ARC_GAS_LIMIT,
          from: web3.eth.accounts[0]
        });
    }
    return daoCreator;
  };

  const forgeOrganization = require('./forgeOrganization')({
    daoCreatorGetter,
    Avatar,
    DAOToken,
    Reputation
  });

  const setSchemes = require('./setSchemes')({
    daoCreatorGetter
  });

  const createSchemeExternalLocking4Reputation = require('./schemes/createExternalLocking4Reputation')({
    ExternalLocking4Reputation
  });

  const createSchemeWhitelistUsing0xList = require('./schemes/createWhitelistUsing0xList')({
    WhitelistUsing0xList
  });

  // Repo API
  return {
    forgeOrganization,
    setSchemes,

    // Scheme creation
    createSchemeExternalLocking4Reputation,
    createSchemeWhitelistUsing0xList
  };
};
