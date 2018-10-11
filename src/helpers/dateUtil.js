function parseIso8601Date (iso8601FormattedDate) {
  return new Date(Date.parse(iso8601FormattedDate))
}

function toEthereumTimestamp (date) {
  return Math.floor(date.getTime() / 1000)
}

module.exports = {
  parseIso8601Date,
  toEthereumTimestamp
}
