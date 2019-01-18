pragma solidity ^0.5.2;

import "@daostack/arc/contracts/schemes/ExternalLocking4Reputation.sol";

/**
 * @title Scheme that allows to get GEN by locking MGN
 */
contract DxLockMgnForRep is ExternalLocking4Reputation {
    constructor() public {}
}
