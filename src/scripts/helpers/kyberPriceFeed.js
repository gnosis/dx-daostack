const got = require('got')
const BASE_URL = 'https://tracker.kyber.network/api'

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
  const pricesInfo = await getAux('/tokens/pairs')

  const markets = Object.keys(pricesInfo)

  const priceByAddress = markets.reduce((prices, market) => {
    const { contractAddress: address , ...priceInfo } = pricesInfo[market]
    const addressLower = address.toLowerCase()
    
    // Is one of the requested tokens
    const isRequestedToken = tokens.some(
      ({ address }) => address.toLowerCase() === addressLower
    )

    if (isRequestedToken) {
      prices[addressLower] = {
        address,
        ...priceInfo,
        market
      }
    }

    return prices
  }, {})

  return priceByAddress
}

module.exports = {
  // https://developer.kyber.network/docs/TrackerAPIGuide/#price-and-volume-information
  getPrices,
  getSupported: () => getAux('/tokens/supported')
}
