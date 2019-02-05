const moment = require('moment-timezone')

const TIME_ZONE = process.env.TIME_ZONE || 'Asia/Tel_Aviv'

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

  return _toMoment(date).format('L')
}

// Formats a date and time: Just for debuging porposes
function formatDateTime (date) {
  if (!formatDateTime) {
    return null
  }

  return _toMoment(date).format('DD/MM/YYYY HH:mm')
}

function parse (dateString) {
  return moment.tz(dateString, TIME_ZONE).toDate()
}

function add (date, amount, unit) {
  return _toMoment(date).add(amount, unit)
}

function _toMoment (date) {
  return moment(date).tz(TIME_ZONE)
}

module.exports = {
  add,
  parse,
  parseIso8601Date,
  toEthereumTimestamp,
  formatDate,
  formatDateTime,
  timeZone: TIME_ZONE
}
