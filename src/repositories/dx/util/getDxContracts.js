async function getDaoStackContracts ({ artifacts }) {
  const TokenFRT = artifacts.require('TokenFRT')

  return {
    TokenFRT
  }
}

module.exports = getDaoStackContracts
