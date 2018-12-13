/*
* dxDao main config
*/

// Defauls (may be overrided by env vars)
// TODO: Confirm
const TOKEN_NAME = 'dxDAO'
const TOKEN_SYMBOL = 'DXD'
const TOKENS_CAP = 1.5e6
const ORGANIZATION_NAME = 'dxDAO'

module.exports = {
  // Basic info
  tokenName: process.env.TOKEN_NAME || TOKEN_NAME,
  tokenSymbol: process.env.TOKEN_SYMBOL || TOKEN_SYMBOL,
  tokenCap: parseFloat(process.env.TOKENS_CAP || TOKENS_CAP),
  organizationName: process.env.ORGANIZATION_NAME || ORGANIZATION_NAME,

  // Founders
  founders: getFounders(),
  foundersInitialTokens: parseInt(process.env.FOUNDERS_INITIAL_TOKENS || 100),
  foundersInitialRep: parseInt(process.env.FOUNDERS_INITIAL_REP || 200)
}

function getFounders () {
  // Founders:
  //  - not mandatory, by default the deployer will be the sole founder
  //  - it can be specified by a list of comma separated addresses
  //  - i.e. FOUNDERS=<address1>,<address2>
  let founders
  const foundersAddressesString = process.env.FOUNDERS
  if (foundersAddressesString) {
    founders = foundersAddressesString
      .split(',')
      .map(address => address.trim())
  }

  return founders
}
