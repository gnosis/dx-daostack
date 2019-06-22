const network2URL = {
  mainnet: 'https://mainnet.infura.io/v3/9408f47dedf04716a03ef994182cf150',
  ropsten: 'https://ropsten.infura.io/v3/9408f47dedf04716a03ef994182cf150',
  rinkeby: 'https://rinkeby.infura.io/v3/9408f47dedf04716a03ef994182cf150',
  kovan: 'https://kovan.infura.io/v3/9408f47dedf04716a03ef994182cf150',
  development: 'http://localhost:8545'
}

const network2Id = {
  mainnet: 1,
  ropsten: 3,
  rinkeby: 4,
  kovan: 42
};

module.exports = {
  network2URL,
  network2Id,
}
