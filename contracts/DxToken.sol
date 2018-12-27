pragma solidity ^0.4.24;
import "@daostack/arc/contracts/controller/DAOToken.sol";


// is DAOToken
contract DxToken is DAOToken {
    constructor (
        string _name,
        string _symbol,
        uint _cap
    ) DAOToken (_name, _symbol, _cap) public {}
}