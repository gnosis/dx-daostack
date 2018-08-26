let contractInstances;

async function getDaoStackContracts ({ artifacts } = {}) {
    const TokenFRT = artifacts.require('TokenFRT');

    contractInstances = {
      TokenFRT
    };
  return contractInstances;
}

module.exports = getDaoStackContracts;
