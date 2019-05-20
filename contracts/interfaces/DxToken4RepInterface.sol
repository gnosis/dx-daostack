pragma solidity ^0.5.4;


interface DxToken4RepInterface {
    function claim(address _beneficiary, bytes32 _agreementHash) external returns(bytes32);
    function redeem(address _beneficiary) external returns(uint256 reputation);
    function getAgreementHash() external  view returns(bytes32);
}
