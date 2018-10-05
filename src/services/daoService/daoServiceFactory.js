// const constants = require('./util/constants')
const daoStackRepoFactory = require('../../../src/repositories/daoStack/daoStackRepoFactory')

module.exports = async ({
  provider,
  fromDefault
}) => {
  const daoStackRepo = await daoStackRepoFactory({
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
