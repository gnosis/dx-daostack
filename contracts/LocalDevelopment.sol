pragma solidity ^0.4.24;

// DutchX dependencies
import "@gnosis.pm/dx-contracts/contracts/DxDevDependencies.sol";

// Universal Schemes
import "@daostack/arc/contracts/universalSchemes/SchemeRegistrar.sol";
import "@daostack/arc/contracts/universalSchemes/UpgradeScheme.sol";
import "@daostack/arc/contracts/universalSchemes/GlobalConstraintRegistrar.sol";
import "@daostack/arc/contracts/universalSchemes/ContributionReward.sol";
import "@daostack/arc/contracts/universalSchemes/GenericScheme.sol";
import "@daostack/infra/contracts/votingMachines/GenesisProtocol.sol";

// Tokens
import "../test/contracts/GenToken.sol";

contract LocalDevelopment {}
