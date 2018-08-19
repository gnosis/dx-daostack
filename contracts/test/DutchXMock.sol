pragma solidity ^0.4.24;


contract DutchXMock {

    event UpdateTokenApproval(address _token,bool _approved);

    function updateApprovalOfToken(
        address[] token,
        bool approved
    ) public
    {
        uint i;
        for (i = 0;i<token.length;i++) {
            emit UpdateTokenApproval(token[i],approved);
        }
    }

    function update(address token) public {
        emit UpdateTokenApproval(token,true);
    }
}
