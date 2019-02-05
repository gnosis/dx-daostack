pragma solidity ^0.5.2;

import "@gnosis.pm/dx-contracts/contracts/base/TokenWhitelist.sol";

contract BasicTokenWhitelist is TokenWhitelist {
    constructor() public {
        auctioneer = msg.sender;
    }
}
