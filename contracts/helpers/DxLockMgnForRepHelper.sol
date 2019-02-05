pragma solidity ^0.5.2;

import "../schemes/bootstrap/DxLockMgnForRep.sol";


contract DxLockMgnForRepHelper {
    DxLockMgnForRep public dxLM4R;

    constructor (DxLockMgnForRep _dxLM4R) public {
        require(address(_dxLM4R) != address(0));
        dxLM4R = _dxLM4R;
    }

    /// @dev batch claiming
    function claimAll(address[] memory beneficiaries) public returns(bytes32[] memory) {
        uint length = beneficiaries.length;

        bytes32[] memory lockingId = new bytes32[](length);

        for (uint i; i < beneficiaries.length; ++i) {
            lockingId[i] = dxLM4R.claim(beneficiaries[i]);
        }

        return lockingId;
    }
}
