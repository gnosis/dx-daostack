const got = require('got')
const BASE_URL = 'https://min-api.cryptocompare.com/data'

const client = got.extend({
  baseUrl: BASE_URL
})

async function getAux (path) {
  const response = await client.get(path, {
    json: true
  })
  
  return response.body
}

async function getPrices ({ tokens }) {
  const allTokensInfo = require('../../resources/crypto-compare/tokens')
  
  // Ger token info for the tokens
  const tokenInfoPromises = tokens.map(async token => {
    const addressLowercase = token.address.toLowerCase()
    const tokenInfo = allTokensInfo[addressLowercase]

    if (tokenInfo) {
      const price = await getPriceBySymbol(tokenInfo.Symbol)
  
      return {
        ...tokenInfo,
        address: token.address,
        price: price.ETH
      }
    } else {
      return null
    }
  })
  let tokensInfo = await Promise.all(tokenInfoPromises)

  // Discard the tokens without info
  tokensInfo = tokensInfo.filter(tokenInfo => tokenInfo !== null)

  const priceByAddress = tokensInfo.reduce((acc, tokenInfo) => {
    if (tokenInfo) {
      acc[tokenInfo.address.toLowerCase()] = tokenInfo
    }

    return acc
  }, {})

  return priceByAddress
}

// Ether price
// https://min-api.cryptocompare.com/data/price?fsym=GNO&tsyms=ETH
async function getPriceBySymbol(symbol, priceUnits = 'ETH') {
  return getAux(`/price?fsym=${symbol}&tsyms=${priceUnits}`)
}

// All coins
// https://min-api.cryptocompare.com/data/all/coinlist
async function getCoinList () {
  return getAux('/all/coinlist')
}

// All exchanges and trading pairs
// https://min-api.cryptocompare.com/data/all/exchanges
async function geExchanges () {
  return getAux('/all/exchanges')
}

async function getEtherPrice (priceUnits = 'USD') {
  // Ether price
  // https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=USD,JPY,EUR
  const price = await getAux('/price?fsym=ETH&tsyms=' + priceUnits)
  
  return price[priceUnits]
}

module.exports = {
  // https://min-api.cryptocompare.com/documentation
  getPrices,
  getPriceBySymbol,
  getCoinList,
  geExchanges,
  getEtherPrice
}
