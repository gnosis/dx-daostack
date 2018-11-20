const SchemePermissions = require('./SchemePermissions')

async function registerScheme ({
  web3,
  label,
  schemeAddress,
  paramsHash = web3.utils.asciiToHex('0'),
  permissions = SchemePermissions.REGISTERED,
  avatarAddress,
  controller
}) {
  // permission has to be convertible to bytes4
  // that is 0x0000001f => 0x 00 00 00 1f => [0, 0, 0, 31]
  // we have decimal int (.e.g. 31), therefore
  // 31 =toHex=> 1f =0x+padding=> 0x0000001f
  const permissionsInHex = '0x' + permissions.toString(16).padStart(8, '0')

  console.log('\nRegister ' + label + ' scheme in the controller:')
  console.log('  - Scheme address: ' + schemeAddress)
  console.log('  - Param hash: ' + paramsHash)
  console.log('  - Permissions: ' + permissionsInHex)
  console.log('  - Avatar address: ' + avatarAddress)
  console.log('  - Controller address: ' + controller.address)
  const txResult = await controller.registerScheme(
    schemeAddress,
    paramsHash,
    permissionsInHex,
    avatarAddress
  )
  console.log('  - Transaction: ' + txResult.tx)
  console.log('  - Gas used: ' + txResult.receipt.gasUsed)
  console.log()
}

registerScheme.SchemePermissions = SchemePermissions

module.exports = registerScheme
