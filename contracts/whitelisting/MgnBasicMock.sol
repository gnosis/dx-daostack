pragma solidity ^0.5.4;


contract MgnBasicMock {

    // user => amount
    mapping (address => uint) public lockedTokenBalances;

    function lock(uint256 _amount) external {
        lockedTokenBalances[msg.sender] = _amount;
    }

    function lockMultiple(uint256 _amount, address[] calldata _beneficiaries) external {
        for (uint i = 0; i < _beneficiaries.length; ++i) {
            lockedTokenBalances[_beneficiaries[i]] = _amount;
        }
    }
}
