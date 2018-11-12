const dateUtil = require('../../helpers/dateUtil')

// The lock peridod has some default config, but it ca be modified with
// env variables
const now = new Date()

now.setUTCMonth(now.getUTCMonth() + 1)
now.setUTCDate(1)
const YY1 = now.getUTCFullYear()
const MM1 = now.getUTCMonth()
const DD1 = now.getUTCDate()
// 1st of next month
const LOCK_PERIOD_START = `${YY1}-${MM1 + 1}-${DD1} 00:00`

now.setUTCMonth(MM1 + 3)
now.setUTCDate(0)
const YY2 = now.getUTCFullYear()
const MM2 = now.getUTCMonth()
const DD2 = now.getUTCDate()
// last day of the third month from now
const LOCK_PERIOD_END = `${YY2}-${MM2 + 1}-${DD2} 23:59:59`

// e.g. for 2018-11-any
// LOCK_PERIOD_START = '2018-12-01 00:00'
// LOCK_PERIOD_END = '2019-02-28 23:59:59'

module.exports = {
  startDate: dateUtil.parse(
    process.env.LOCK_PERIOD_START || LOCK_PERIOD_START
  ),
  endDate: dateUtil.parse(
    process.env.LOCK_PERIOD_END || LOCK_PERIOD_END
  )
}
