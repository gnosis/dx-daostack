const SchemePermissions = require('./SchemePermissions')

async function registerScheme ({
  web3,
  label,
  schemeAddress,
  paramsHash = web3.utils.asciiToHex('0'),
  permissions = SchemePermissions.Default,
  avatarAddress,
  controller
}) {
  console.log('\nRegister ' + label + ' scheme in the controller:')
  console.log('  - Scheme address: ' + schemeAddress)
  console.log('  - Param hash: ' + paramsHash)
  console.log('  - Permissions: ' + permissions)
  console.log('  - Avatar address: ' + avatarAddress)
  console.log('  - Controller address: ' + controller.address)
  const txResult = await controller.registerScheme(
    schemeAddress,
    paramsHash,
    permissions,
    avatarAddress
  )
  console.log('  - Transaction: ' + txResult.tx)
  console.log('  - Gas used: ' + txResult.receipt.gasUsed)
  console.log()
}

registerScheme.SchemePermissions = SchemePermissions

module.exports = registerScheme
