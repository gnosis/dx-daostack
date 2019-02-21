pragma solidity ^0.5.4;

import "@gnosis.pm/dx-contracts/contracts/base/TokenWhitelist.sol";


contract BasicTokenWhitelist is TokenWhitelist {
    constructor() public {
        auctioneer = msg.sender;
    }
}
