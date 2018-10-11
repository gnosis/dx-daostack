pragma solidity ^0.4.24;

// Vote machines
import "@daostack/infra/contracts/VotingMachines/GenesisProtocol.sol";

// Universal Schemes
import "@daostack/arc/contracts/universalSchemes/SchemeRegistrar.sol";
import "@daostack/arc/contracts/universalSchemes/UpgradeScheme.sol";
import "@daostack/arc/contracts/universalSchemes/GlobalConstraintRegistrar.sol";

// Tokens
//  First aproach, maybe later we take it from DutchX contracts
import "../test/contracts/GenToken.sol";
import "../test/contracts/MgnToken.sol";
import "../test/contracts/EthToken.sol";

contract LocalDevelopment {}
