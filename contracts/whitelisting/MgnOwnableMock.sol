pragma solidity ^0.5.4;

import "openzeppelin-solidity/contracts/ownership/Ownable.sol";


contract MgnOwnableMock is Ownable {

    // user => amount
    mapping (address => uint) public lockedTokenBalances;

    function lock(uint256 _amount, address _beneficiary) external onlyOwner {
        lockedTokenBalances[_beneficiary] = _amount;
    }

    function lockMultiple(uint256 _amount, address[] calldata _beneficiaries) external onlyOwner {
        for (uint i = 0; i < _beneficiaries.length; ++i) {
            lockedTokenBalances[_beneficiaries[i]] = _amount;
        }
    }
}
