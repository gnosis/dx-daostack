pragma solidity ^0.4.24;

import "@daostack/arc/contracts/controller/Controller.sol";


contract DxController is Controller {
    constructor (Avatar _avatar)
    Controller(_avatar) public {}
}