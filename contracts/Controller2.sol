pragma solidity ^0.4.24;

import "@daostack/arc/contracts/controller/Avatar.sol";
import "@daostack/arc/contracts/controller/DAOToken.sol";

contract Controller2 {
    address public avatar;
    DAOToken public nativeToken;

    constructor (Avatar _avatar) public {
        avatar = _avatar;
        // If I uncomment the following line, it breaks. Why?
        // nativeToken = avatar.nativeToken();


        // nativeToken = DAOToken(avatar.nativeToken());
        // nativeToken = DAOToken(address(avatar.nativeToken()));
        // nativeToken = DAOToken(address(_avatar.nativeToken));
        //DAOToken n = _avatar.nativeToken();
    }
}
