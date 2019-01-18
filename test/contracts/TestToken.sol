pragma solidity ^0.5.2;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Mintable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/ERC20Burnable.sol";


contract TestToken is ERC20, ERC20Mintable, ERC20Burnable {
    string public name;
    string public symbol;
    // solium-disable-next-line uppercase
    uint8 public constant decimals = 18;
    uint public cap;

    constructor (string memory _name, string memory _symbol, uint256 initialBalance) public {
        // balances[msg.sender] = initialBalance;
        // totalSupply_ = initialBalance;
        _mint(msg.sender, initialBalance);
        name = _name;
        symbol = _symbol;
    }
}
