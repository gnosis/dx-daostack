/* global artifacts, web3, contract, it */
const assert = require('assert');
const debug = require('debug')('test:zeroxdutchxtokensupdate');
const testHelperFactory = require('../src/helpers/testHelper');

var TokenRegistry = artifacts.require('./0xcontract/TokenRegistry.sol');
var DutchXMock = artifacts.require('./test/DutchXMock.sol');
const constants = require('../src/repositories/daostack/util/constants');
const options = {gas: constants.ARC_GAS_LIMIT, from: web3.eth.accounts[0]};

async function setup ({
  accounts
}) {
  // Get the test helper
  const testHelper = await testHelperFactory({
    artifacts,
    web3,
    accounts
  });

  var zeroXRegistryContract = await TokenRegistry.new(options);
  var dxContract = await DutchXMock.new(options);

  // Setup the DAO
  debug('Setup DAO');
  const {
    avatarAddress,
    tokenAddress,
    reputationAddress,
    schemes
  } = await testHelper.setupDao({
    schemes: [{
      type: 'ZeroXDutchXValidateAndCall',
      data: {
        zeroXTokenRegistryContract: zeroXRegistryContract.address,
        dutchXContract: dxContract.address
      },
      permissions: '0x00000010'
    }]
  });
  // add 5 tokens to 0x
  for (let i = 0; i < 5; i++) {
    await zeroXRegistryContract.addToken(accounts[i],
      'test' + i,
      'TST' + i,
      1,
      0x1243,
      0x1234);
  }

  // Get an scheme instance
  const { ZeroXDutchXValidateAndCall } = await testHelper.getDaoStackContracts();
  const schemeAddress = schemes[0].address;
  const zeroXDutchXValidateAndCall = await ZeroXDutchXValidateAndCall.at(schemeAddress);

  debug(
    'Created DAO (%s) with REP (%s) and TOKEN (%s). Schemes: %s',
    avatarAddress,
    tokenAddress,
    reputationAddress,
    schemes.map(scheme => scheme.address).join(',')
  );

  return {
    testHelper,
    avatarAddress,
    schemes,
    zeroXDutchXValidateAndCall,
    zeroXRegistryContract,
    dxContract
  };
}

contract('Scheme ZeroX to DutchX', accounts => {
  it('constructor', async () => {
    const {
      zeroXDutchXValidateAndCall,
      zeroXRegistryContract,
      dxContract
    } = await setup({
      accounts
    });

    const _zeroXTokenRegistryContract = await zeroXDutchXValidateAndCall
      .zeroXTokenRegistryContract
      .call();

    assert.strictEqual(_zeroXTokenRegistryContract, zeroXRegistryContract.address);

    const _dutchXContract = await zeroXDutchXValidateAndCall
      .dutchXContract
      .call();

    assert.strictEqual(_dutchXContract, dxContract.address);

    assert.ok(true);
  });

  it('validateTokenAndCall', async () => {
    const {
      zeroXDutchXValidateAndCall
    } = await setup({
      accounts
    });
    var tx = await zeroXDutchXValidateAndCall.validateTokenAndCall(accounts[0], options);
    assert.strictEqual(tx.logs.length, 1);
    var log = tx.logs[0];
    debug('Lock zeroXDutchXValidateAndCall log: %o', log);
    assert.strictEqual(tx.logs[0].event, 'Update');
    assert.strictEqual(tx.logs[0].args._token, accounts[0]);
    assert.strictEqual(tx.logs[0].args._approved, true);

    tx = await zeroXDutchXValidateAndCall.validateTokenAndCall(accounts[5], options);
    assert.strictEqual(tx.logs.length, 1);
    log = tx.logs[0];
    debug('Lock zeroXDutchXValidateAndCall log: %o', log);
    assert.strictEqual(tx.logs[0].event, 'Update');
    assert.strictEqual(tx.logs[0].args._token, accounts[5]);
    assert.strictEqual(tx.logs[0].args._approved, false);

    tx = await zeroXDutchXValidateAndCall.validateTokensAndCall([accounts[0], accounts[1]], options);
    assert.strictEqual(tx.logs.length, 2);
    log = tx.logs[0];
    debug('Lock zeroXDutchXValidateAndCall log: %o', log);
    assert.strictEqual(tx.logs[0].event, 'Update');
    assert.strictEqual(tx.logs[0].args._token, accounts[0]);
    assert.strictEqual(tx.logs[0].args._approved, true);

    try {
      await zeroXDutchXValidateAndCall.validateTokensAndCall([accounts[4], accounts[5]], options);
      assert(false, 'should revert!');
    } catch (ex) {
      let condition = (
        ex.message.search('VM Exception') > -1
      );
      assert(condition, 'Expected a VM Exception, got this instead:' + ex.message);
    }
  });
});
