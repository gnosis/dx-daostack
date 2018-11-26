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

async function getPrices (tokens) {
  // const coinListRaw = require('../')
  // Object.keys.

  // const pricesInfoPromises = tokens.map(token => {
  //   return getAux('/tokens/' + token.address.toLowerCase())
  //     .catch(error => {
  //       if (error.statusCode === 404) {
  //         return null
  //       }

  //       throw error
  //     })
  // })
  // const pricesInfo = await Promise.all(pricesInfoPromises)

  // const priceByAddress = pricesInfo.reduce((prices, pricesInfo) => {
  //   if (pricesInfo) {
  //     prices[pricesInfo.address.toLowerCase()] = {
  //       ...pricesInfo,
  //       lastPrice: pricesInfo.price.lastPrice        
  //     }
  //   }

  //   return prices
  // }, {})
  
  // return priceByAddress
}

async function _getTokenInfo({ coinList, token }) {
  coinList.Data.find()
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

async function getEtherPrice () {
  // Ether price
  // https://min-api.cryptocompare.com/data/price?fsym=ETH&tsyms=USD,JPY,EUR
  return getAux('/price?fsym=ETH&tsyms=USD')    
}

module.exports = {
  // https://min-api.cryptocompare.com/documentation
  getPrices,
  getPriceBySymbol,
  getCoinList,
  geExchanges,
  getEtherPrice
}
