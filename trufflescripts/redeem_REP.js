// artifacts and web3 are available globally
module.exports = async () => {

  // Same as claim_MGN, but
  // look for Lock events in DxLockMgnForRep, DxLockEth4Rep, DxLockWhitelisted4Rep
  // and Bid event in DxGenAuction4Rep
  // contracts in ./networks-3rd-rinkeby-test.json should have those
  // then call Contract.redeem(account)
}
