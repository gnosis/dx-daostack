pragma solidity ^0.5.2;

import "openzeppelin-solidity/contracts/token/ERC20/StandardToken.sol";
import "openzeppelin-solidity/contracts/token/ERC20/MintableToken.sol";
import "openzeppelin-solidity/contracts/token/ERC20/BurnableToken.sol";

contract TestToken is StandardToken, MintableToken, BurnableToken {
    string public name;
    string public symbol;
    // solium-disable-next-line uppercase
    uint8 public constant decimals = 18;
    uint public cap;

    constructor(string memory _name, string memory _symbol, uint256 initialBalance) public {
        balances[msg.sender] = initialBalance;
        totalSupply_ = initialBalance;
        name = _name;
        symbol = _symbol;
    }
}
