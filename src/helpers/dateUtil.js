function parseIso8601Date (iso8601FormattedDate) {
  return new Date(Date.parse(iso8601FormattedDate))
}

function toEthereumTimestamp (date) {
  return Math.floor(date.getTime() / 1000)
}

// Formats a date: Just for debuging porposes
function formatDate (date) {
  if (!formatDateTime) {
    return null
  }

  return pad(date.getDate()) + '-' + pad(date.getMonth() + 1) + '-' + date.getFullYear()
}

// Formats a date and time: Just for debuging porposes
function formatDateTime (date) {
  if (!formatDateTime) {
    return null
  }

  return formatDate(date) +
    ' ' +
    pad(date.getHours()) + ':' + pad(date.getMinutes())
}

function pad (n, width = 2, z = 0) {
  z = z || '0'
  n = n + ''
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n
}

module.exports = {
  parseIso8601Date,
  toEthereumTimestamp,
  formatDate,
  formatDateTime
}
