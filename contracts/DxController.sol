pragma solidity ^0.5.2;

import "@daostack/arc/contracts/controller/Controller.sol";

contract DxController is Controller {
    constructor(Avatar _avatar) public Controller(_avatar) {}
}
