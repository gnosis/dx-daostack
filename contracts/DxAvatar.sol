pragma solidity ^0.4.24;

import "@daostack/arc/contracts/controller/Avatar.sol";


contract DxAvatar is Avatar {
    constructor (
        string _orgName,
        DAOToken _nativeToken,
        Reputation _nativeReputation
    ) Avatar(_orgName, _nativeToken, _nativeReputation) public {}
}