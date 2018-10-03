// const getDxContracts = require('../src/helpers/getDxContracts')
const getDxContracts = require('./util/getDxContracts');

module.exports = async ({
  artifacts
}) => {
  // const contract = require('truffle-contract')
  // const ControllerCreator = contract(require(`@daostack/arc/build/contracts/ControllerCreator` ))
  // console.log('currentProvider: ', web3.currentProvider)
  // ControllerCreator.defaults({ from: owner })
  // ControllerCreator.setProvider(web3.currentProvider)
  const {
    TokenFRT
  } = await getDxContracts({
    artifacts
  });

  const getMgn = async (owner) => {
    return await TokenFRT.new(owner, {gas: 7000000});
  };

  // Repo API
  return {
    getMgn
  };
};
