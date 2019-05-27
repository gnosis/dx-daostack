const SchemePermissions = require('./SchemePermissions')
const assert = require('assert')

async function registerScheme({
  web3,
  label,
  schemeAddress,
  paramsHash = web3.utils.toHex(0),
  permissions = SchemePermissions.REGISTERED,
  avatarAddress,
  controller
}) {
  // permission has to be convertible to bytes4
  // that is 0x0000001f => 0x 00 00 00 1f => [0, 0, 0, 31]
  // we have decimal int (.e.g. 31), therefore
  // 31 =toHex=> 1f =0x+padding=> 0x0000001f
  const permissionsInHex = '0x' + permissions.toString(16).padStart(8, '0')

  assert(schemeAddress, `The parameter schemeAddress was not defined`)
  assert(paramsHash, `The parameter paramsHash was not defined`)
  assert(permissionsInHex, `The parameter permissionsInHex was not defined`)
  assert(avatarAddress, `The parameter avatarAddress was not defined`)
  assert(controller.address, `The parameter controller address was not defined`)

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

async function setParameters({
  scheme,
  parameters
}) {
  assert(scheme, `The parameter scheme was not defined`)
  assert(parameters, `The parameter parameters was not defined`)
  assert(Array.isArray(parameters), `The parameter should be an array`)
  assert(parameters.length > 0, `Parameters list should contain at least one parameter`)

  console.log(`\nSet scheme parameters for scheme: ${scheme.address}`)
  parameters.forEach(({ name, value }) => {
    console.log(`  - ${name}: ${value}`)
    assert(value !== null, `The parameter ${name} is required`)
  })
  console.log()

  const paramList = parameters.map(parameter => parameter.value)
  await scheme.setParameters(...paramList)
  const paramsHash = await scheme.getParametersHash(...paramList)

  return paramsHash
}

module.exports = {
  registerScheme,
  setParameters,
  SchemePermissions
}
