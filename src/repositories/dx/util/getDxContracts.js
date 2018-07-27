let contractInstances

async function getDaoStackContracts ({ artifacts } = {}) {
  if (!contractInstances) {
    const TokenFRT = artifacts.require('TokenFRT')
  
    contractInstances = {
      TokenFRT
    }
  }

  return contractInstances
}

module.exports = getDaoStackContracts
