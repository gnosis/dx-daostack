pragma solidity ^0.4.24;

import "@daostack/infra/contracts/VotingMachines/GenesisProtocol.sol";

/**
 * @title GenesisProtocol implementation -an organization's voting machine scheme.
 */
contract DxGenesisProtocol is GenesisProtocol {
    constructor (StandardToken _stakingToken) 
    GenesisProtocol(_stakingToken) public {}
}
