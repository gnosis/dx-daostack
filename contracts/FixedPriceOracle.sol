pragma solidity ^0.4.24;

/**
 * @title An Ether-ERC20 token price oracle with an unmutable price
 * 
 * @dev The prices are initialized when configuring the contract, then you 
 *  freeze the contract disallowing any further modification.
 */ 
contract FixedPriceOracle {
    mapping (address => Price) public prices;
    bool public frozen;
    address public owner;
    
    modifier onlyOwner () {
        require(msg.sender == owner, "Only the owner can do the operation");
        _;
    }
    
    modifier notFrozen () {
        require(!frozen, "The contract is frozen, not changes are allowed");
        _;
    }
    
    struct Price {
        uint numerator;
        uint denominator;
    }
    
    event PriceSet(
         address indexed token,
         uint numerator,
         uint denominator
    );
    
    event Freeze();
    
    
    constructor () public {
        owner = msg.sender;
    }

    function hasReliablePrice (address token) public view returns (bool) {
        return prices[token].denominator != 0;
    }
    
    function getPrice(address token) public view returns (uint, uint) {
        Price memory price = prices[token];
        return (price.numerator, price.denominator);
    }
    
    function setPrices(
        address[] tokens,
        uint[] numerators,
        uint[] denominators
    ) public onlyOwner notFrozen {
        for (uint i = 1 ; i < tokens.length ; i++) {
            address token = tokens[i];
            uint numerator = numerators[i];
            uint denominator = denominators[i];
            
            prices[token] = Price(numerator, denominator);
            emit PriceSet(token, numerator, denominator);
        }
    }
    
    function setPrice(
        address token, 
        uint numerator, 
        uint denominator
    ) public onlyOwner notFrozen {
        prices[token] = Price(numerator, denominator);
        emit PriceSet(token, numerator, denominator);
    }
    
    function freeze() public onlyOwner {
        frozen = true;
        emit Freeze();
    }
}
