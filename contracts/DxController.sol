pragma solidity ^0.4.24;

// import "@daostack/arc/contracts/controller/Controller.sol";
import "@daostack/arc/contracts/controller/Avatar.sol";
import "./Controller2.sol";

contract DxController is Controller2 {
    // constructor (Avatar _avatar)
    // Controller(_avatar) public {}

    constructor (Avatar _avatar)
    Controller2(_avatar) public {}
}