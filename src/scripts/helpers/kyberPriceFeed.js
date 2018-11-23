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

async function getPrices () {
  const pricesInfo = await getAux('/tokens/pairs')

  const markets = Object.keys(pricesInfo)

  return markets.reduce((prices, market) => {
    const { contractAddress: address , ...priceInfo } = pricesInfo[market]

    prices[address.toLowerCase()] = {
      address,
      ...priceInfo,
      market
    }

    return prices
  }, {})
}

module.exports = {
  // https://developer.kyber.network/docs/TrackerAPIGuide/#price-and-volume-information
  getPrices,
  getSupported: () => getAux('/tokens/supported')
}
