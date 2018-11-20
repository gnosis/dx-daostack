pragma solidity ^0.4.24;

import "@daostack/arc/contracts/schemes/ExternalLocking4Reputation.sol";

/**
 * @title Scheme that allows to get GEN by locking MGN
 */
contract DxLockMgnForRep is ExternalLocking4Reputation {
    constructor () public {}
}