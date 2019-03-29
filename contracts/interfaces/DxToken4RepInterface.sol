pragma solidity ^0.5.4;


interface DxToken4RepInterface {
    function claim(address _beneficiary) external returns(bytes32);
    function redeem(address _beneficiary) external returns(uint256 reputation);
    
}
