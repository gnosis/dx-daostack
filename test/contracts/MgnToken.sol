pragma solidity ^0.4.24;

import "./TestToken.sol";

contract MgnToken is TestToken {
    constructor (uint256 initialBalance) public
    TestToken ("MGN Test Token", "MGN", initialBalance) {}
}