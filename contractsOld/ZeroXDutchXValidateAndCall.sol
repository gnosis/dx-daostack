pragma solidity ^0.4.24;

import "./0xcontract/TokenRegistry.sol";
import "@daostack/arc/contracts/controller/ControllerInterface.sol";

/**
 * @title A scheme for validate tokens in 0x project TokenRegistry list and update that on dutchX contract
 */

contract ZeroXDutchXValidateAndCall {


    event Update(address _token, bool _approved);

    Avatar public avatar;
    TokenRegistry public zeroXTokenRegistryContract;
    address public dutchXContract;
    /**
     * @dev constructor
     * @param _avatar the avatar of the organization.
     * @param _zeroXTokenRegistryContract the contract which is used for validation.
     * @param _dutchXContract the destination contract which the data will be written to.
     *
     */
    constructor(Avatar _avatar,
                TokenRegistry _zeroXTokenRegistryContract,
                address _dutchXContract)
    public
    {
        avatar = _avatar;
        zeroXTokenRegistryContract = _zeroXTokenRegistryContract;
        dutchXContract = _dutchXContract;
    }

    /**
     * @dev validateTokensAndCall function
     * @param _tokens the tokens list to approve
     *        all tokens in the list must have the same validity state.
     */
    function validateTokensAndCall(address[] _tokens) public {
        uint i;
        bool valid = isValid(_tokens[0]);
        emit Update(_tokens[0],valid);
        for (i = 1;i<_tokens.length;i++) {
            require(isValid(_tokens[i]) == valid,"all tokens should have the same validity state");
            emit Update(_tokens[i],valid);
        }
        callDutchX(_tokens,valid);
    }

    /**
     * @dev validateAndCall function
     * @param _token the token to be approve
     */
    function validateTokenAndCall(address _token) public {
        address[] memory tokens = new address[](1);
        tokens[0] = _token;
        bool valid = isValid(_token);
        callDutchX(tokens,valid);
        emit Update(_token,valid);
    }

    /**
     * @dev isValid function
     * @return bool true or false
     */
    function isValid(address _token) public view returns(bool) {
        address tokenAddress;
        string  memory name;
        string  memory symbol;
        uint8   decimal;
        bytes   memory ipfsHash;
        bytes   memory swarmHash;
        (tokenAddress,name,symbol,decimal,ipfsHash,swarmHash) = zeroXTokenRegistryContract.getTokenMetaData(_token);
        return (tokenAddress != address(0));
    }

    /**
     * @dev callDutchX function call dutchX on behalf of the avatar
     * @param _tokens the tokens list to approve/disapprove
     * @param _valid true or false
     */
    function callDutchX(address[] _tokens,bool _valid) internal {
        ControllerInterface controller = ControllerInterface(Avatar(avatar).owner());
        bytes memory callData = abi.encodeWithSignature("updateApprovalOfToken(address[],bool)",_tokens,_valid);

        controller.genericCall(
        dutchXContract,
        callData,
        avatar);
    }
}
