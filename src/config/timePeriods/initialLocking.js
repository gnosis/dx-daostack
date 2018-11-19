const dateUtil = require('../../helpers/dateUtil')

// The lock peridod has some default config, but it ca be modified with
// env variables

let LOCK_PERIOD_START, LOCK_PERIOD_END
if (!process.env.LOCK_PERIOD_START || !process.env.LOCK_PERIOD_END) {
  // Default dates (+1 month, +3 month)
  const now = new Date()
  LOCK_PERIOD_START = dateUtil.add(now, 1, 'month')
  LOCK_PERIOD_END = dateUtil.add(now, 3, 'month')
} else if (process.env.LOCK_PERIOD_START && process.env.LOCK_PERIOD_END) {
  // Provided dates
  LOCK_PERIOD_START = process.env.LOCK_PERIOD_START
  LOCK_PERIOD_END = process.env.LOCK_PERIOD_END
} else {
  throw new Error(`
  LOCK_PERIOD_START and LOCK_PERIOD_END env variables must be provided together
  or not provided at all
  `)
}

module.exports = {
  startDate: dateUtil.parse(LOCK_PERIOD_START),
  endDate: dateUtil.parse(LOCK_PERIOD_END)
}
