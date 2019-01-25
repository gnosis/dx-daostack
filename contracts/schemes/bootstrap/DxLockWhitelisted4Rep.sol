pragma solidity ^0.5.2;

import "@daostack/arc/contracts/schemes/LockingToken4Reputation.sol";

/**
 * @title Scheme for locking GNO tokens for reputation
 */
contract DxLockWhitelisted4Rep is LockingToken4Reputation {
    // TODO: Extend the new LockWhitelisted4Rep once it's implemented
    constructor() public {}
}
