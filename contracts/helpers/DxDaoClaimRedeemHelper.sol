pragma solidity ^0.5.2;

import "../schemes/bootstrap/DxLockEth4Rep.sol";
import "../schemes/bootstrap/DxLockMgnForRep.sol";
import "../schemes/bootstrap/DxLockWhitelisted4Rep.sol";
import "../schemes/bootstrap/DxGenAuction4Rep.sol";

import "../interfaces/DxToken4RepInterface.sol";

contract DxDaoClaimRedeemHelper {
    DxToken4RepInterface public dxLER;
    DxToken4RepInterface public dxLMR;
    DxToken4RepInterface public dxLWR;
    DxGenAuction4Rep public dxGAR;

    constructor (
        DxToken4RepInterface _dxLER,
        DxToken4RepInterface _dxLMR,
        DxToken4RepInterface _dxLWR,
        DxGenAuction4Rep _dxGAR
    ) public {
        require(address(_dxLER) != address(0));
        require(address(_dxLMR) != address(0));
        require(address(_dxLWR) != address(0));
        require(address(_dxGAR) != address(0));
        dxLER = _dxLER;
        dxLMR = _dxLMR;
        dxLWR = _dxLWR;
        dxGAR = _dxGAR;
    }

    enum DxTokenContracts4Rep {
        dxLER,
        dxLMR,
        dxLWR,
        dxGAR
    }

    /// @dev batch claiming
    function claimAll(
        address[] calldata userAddresses, 
        DxTokenContracts4Rep mapIdx
    ) 
        external 
        returns(bytes32[] memory) 
    {
        require(uint(mapIdx) < 3, "mapIdx cannot be greater than 2");

        DxToken4RepInterface claimingContract;

        if (mapIdx == DxTokenContracts4Rep.dxLER) {
            claimingContract = dxLER;
        } else if (mapIdx == DxTokenContracts4Rep.dxLMR) {
            claimingContract = dxLMR;
        } else if (mapIdx == DxTokenContracts4Rep.dxLWR) {
            claimingContract = dxLWR;
        }

        uint length = userAddresses.length;

        bytes32[] memory returnArray = new bytes32[](length);

        for (uint i = 0; i < length; i++) {
            returnArray[i] = claimingContract.claim(userAddresses[i]);
        }

        return returnArray;
    }

    /// @dev batch redeeming
    function redeemAll(
        address[] calldata userAddresses, 
        DxTokenContracts4Rep mapIdx
    ) 
        external 
        returns(uint256[] memory) 
    {        
        require(uint(mapIdx) < 3, "mapIdx cannot be greater than 2");

        DxToken4RepInterface redeemingContract;

        if (mapIdx == DxTokenContracts4Rep.dxLER) {
            redeemingContract = dxLER;
        } else if (mapIdx == DxTokenContracts4Rep.dxLMR) {
            redeemingContract = dxLMR;
        } else if (mapIdx == DxTokenContracts4Rep.dxLWR) {
            redeemingContract = dxLWR;
        }

        uint length = userAddresses.length;

        uint256[] memory returnArray = new uint256[](length);

        for (uint i = 0; i < length; i++) {
            returnArray[i] = redeemingContract.redeem(userAddresses[i]);
        }

        return returnArray;
    }

    /// @dev batch redeeming (dxGAR only)
    function redeemAllGAR(
        address[] calldata userAddresses, 
        uint256[] calldata auctionIndices
    ) 
        external 
        returns(uint256[] memory) 
    {        
        require(userAddresses.length == auctionIndices.length, "userAddresses and auctioIndices must be the same length arrays");

        uint length = userAddresses.length;

        uint256[] memory returnArray = new uint256[](length);

        for (uint i = 0; i < length; i++) {
            returnArray[i] = dxGAR.redeem(userAddresses[i], auctionIndices[i]);
        }

        return returnArray;
    }
}
