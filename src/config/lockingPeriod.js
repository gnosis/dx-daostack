const dateUtil = require('../helpers/dateUtil')

// The lock peridod has some default config, but it ca be modified with
// env variables
const LOCK_PERIOD_START = '2018-11-01T00:00:00+02:00'
const LOCK_PERIOD_END = '2019-01-31T23:59:59+02:00'

module.exports = {
  startDate: dateUtil.parseIso8601Date(
    process.env.LOCK_PERIOD_START || LOCK_PERIOD_START
  ),
  endDate: dateUtil.parseIso8601Date(
    process.env.LOCK_PERIOD_END || LOCK_PERIOD_END
  )
}
