// All 0: Not registered,
// 1st bit: Flag if the scheme is registered,
// 2nd bit: Scheme can register other schemes
// 3th bit: Scheme can add/remove global constraints
// 4rd bit: Scheme can upgrade the controller
// 5th bit: Scheme can call delegatecall

const PermissionFlags = {
  NOT_REGISTERED: 0b0,
  REGISTERED: 0b1,
  REGISTER_SCHEMES: 0b10,
  ADD_REMOVE_GLOBAL_CONSTRAINTS: 0b100,
  UPGRADE_CONTROLLER: 0b1000,
  CALL_DELEGATECALL: 0b10000
}

// Per Scheme:
// SchemeRegistrar: REGISTERED | REGISTER_SCHEMES | ADD_REMOVE_GLOBAL_CONSTRAINTS |
//   UPGRADE_CONTROLLER | CALL_DELEGATECALL = '0x0000001F',
// GlobalConstraintRegistrar: REGISTERED | ADD_REMOVE_GLOBAL_CONSTRAINTS = '0x00000005',
// UpgradeScheme: REGISTER_SCHEMES | UPGRADE_CONTROLLER = '0x0000000a',
// ContributionReward: REGISTERED = '0x00000001',
// GenesisProtocol: REGISTERED = '0x00000001',
// ExternalLocking4Reputation: REGISTERED = '0x00000001',
// Auction4Reputation: REGISTERED = '0x00000001',
// LockingEth4Reputation: REGISTERED = '0x00000001',
// LockingToken4Reputation: REGISTERED = '0x00000001',
// FixedReputationAllocation: REGISTERED = '0x00000001',
// GenericScheme: CALL_DELEGATECALL = '0x00000010'

module.exports = PermissionFlags
