pragma solidity ^0.5.2;


contract DutchXMock {
    event UpdateTokenApproval(address _token, bool _approved);

    function updateApprovalOfToken(address[] memory token, bool approved) public {
        uint i;
        for (i = 0; i < token.length; i++) {
            emit UpdateTokenApproval(token[i], approved);
        }
    }

    function update(address token) public {
        emit UpdateTokenApproval(token, true);
    }
}
