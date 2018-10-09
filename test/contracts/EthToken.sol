pragma solidity ^0.4.24;

import "./TestToken.sol";

contract WethToken is TestToken {
    constructor (uint256 initialBalance) public
    TestToken ("Wrapped Ether Test Token", "WETH", initialBalance) {}
}