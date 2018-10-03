// const constants = require('./util/constants')
const daoStackRepoFactory = require('../../../src/repositories/daostack/daoStackRepoFactory');

module.exports = async ({
  provider,
  transactionDefaults
  // accounts,
}) => {
  const daoStackRepo = await daoStackRepoFactory({
    provider,
    transactionDefaults
  });

  const createOrganization = require('./createOrganization')({
    daoStackRepo
  });

  // daoService API
  return {
    createOrganization
  };
};
