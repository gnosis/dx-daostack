const dateUtil = require('../../helpers/dateUtil')

// The lock peridod has some default config, but it ca be modified with
// env variables
const LOCK_PERIOD_START = '2018-11-01 00:00'
const LOCK_PERIOD_END = '2019-01-31 23:59:59'

module.exports = {
  startDate: dateUtil.parse(
    process.env.LOCK_PERIOD_START || LOCK_PERIOD_START
  ),
  endDate: dateUtil.parse(
    process.env.LOCK_PERIOD_END || LOCK_PERIOD_END
  )
}
