const got = require('got')
const BASE_URL = 'https://api.0xtracker.com'

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
  // Get the info for all the tokens
  //  i.e. https://api.0xtracker.com/tokens/0x6810e776880c02933d47db1b9fc05908e5386b96? 
  const pricesInfoPromises = tokens.map(token => {
    return getAux('/tokens/' + token.address.toLowerCase())
      .catch(error => {
        if (error.statusCode === 404) {
          return null
        }

        throw error
      })
  })
  const pricesInfo = await Promise.all(pricesInfoPromises)

  const priceByAddress = pricesInfo.reduce((prices, pricesInfo) => {
    if (pricesInfo) {
      prices[pricesInfo.address.toLowerCase()] = {
        ...pricesInfo,
        lastPrice: pricesInfo.price.lastPrice        
      }
    }

    return prices
  }, {})
  
  return priceByAddress
}

module.exports = {
  // https://developer.kyber.network/docs/TrackerAPIGuide/#price-and-volume-information
  getPrices
}
