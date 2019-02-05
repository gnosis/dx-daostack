// artifacts and web3 are available globally
module.exports = async () => {

  // 1 Get DxLockMgnForRep contract either the deployed if artifacts have network
  // or form a given networks-*.json file (-f flag?)
  // or provided as an execution --flag

  // 2 Get all Register events from the contract
  // Contract.Register().getData or something like that
  // test with this one, has events
  // https://rinkeby.etherscan.io/address/0xa248671eC41110D58e587120a5B9C24A66daBfc6#events

  // 3 Get all accounts that registered
  // call Contract.claim(account) for them
  // that produces Lock events

  // 4 Would also be good to save log somewhere
  // e.g
  // {
  //   <address>: {
  //     Lock: {}
  //     error: ?
  //   }
  // }
}
