// const constants = require('./util/constants')
const daoStackRepoFactory = require('../../../src/repositories/daostack/daoStackRepoFactory');

module.exports = async ({
  contracts,
  provider
}) => {
  const daoStackRepo = await daoStackRepoFactory({
    contracts,
    provider,
    // transactionDefaults
  });

  const createOrganization = require('./createOrganization')({
    daoStackRepo
  });

  // daoService API
  return {
    createOrganization
  };
};
