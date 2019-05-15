/* global web3 */

const assert = require('assert');
const constants = require('./util/constants');

const DEFAULT_SCHEME_PARAMS = 0;
const DEFAULT_SCHEME_PARMISSIONS = 0;

module.exports = ({
  daoCreatorGetter
}) => async ({
  avatarAddress,
  schemes // Object containing the 'address', and optionally the 'params' and 'permissions'
}) => {
  assert(schemes || schemes.length > 0, 'At least one scheme is mandatory');
  const {
    schemesArray,
    paramsArray,
    permissionsArray
  } = schemes.reduce((acc, scheme) => {
    assert(scheme.address, 'The address scheme is mandatory');
    acc.schemesArray.push(scheme.address);
    acc.paramsArray.push(scheme.params || DEFAULT_SCHEME_PARAMS);
    acc.permissionsArray.push(scheme.permissions || DEFAULT_SCHEME_PARMISSIONS);

    return acc;
  }, {
    schemesArray: [],
    paramsArray: [],
    permissionsArray: []
  });

  const daoCreator = await daoCreatorGetter();
  return daoCreator.setSchemes(
    avatarAddress,
    schemesArray,
    paramsArray,
    permissionsArray,
    {
      gas: constants.ARC_GAS_LIMIT,
      from: web3.eth.accounts[0]
    }
  );
};
