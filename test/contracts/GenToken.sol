pragma solidity ^0.4.24;

import "./TestToken.sol";

contract GenToken is TestToken {
    constructor (uint256 initialBalance) public
    TestToken ("GEN Test Token", "GEN", initialBalance) {}
}