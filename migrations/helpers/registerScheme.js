async function registerScheme ({
  web3,
  label,
  schemeAddress,
  paramsHash = web3.utils.asciiToHex('0'),
  permissions = '0x00000001', // TODO: Use constants
  avatarAddress,
  controller
}) {
  console.log('Register ' + label + ' scheme in the controller:')
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

module.exports = registerScheme
