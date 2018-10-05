// const constants = require('./util/constants')
const daoStackRepoFactory = require('../../../src/repositories/daoStack/daoStackRepoFactory')

module.exports = async ({
  contracts,
  provider,
  fromDefault
}) => {
  const daoStackRepo = await daoStackRepoFactory({
    contracts,
    provider,
    fromDefault
  })

  const createOrganization = require('./createOrganization')({
    daoStackRepo
  })

  // daoService API
  return {
    createOrganization
  }
}
