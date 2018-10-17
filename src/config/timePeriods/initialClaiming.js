const dateUtil = require('../../helpers/dateUtil')

// The claim peridod has some default config, but it ca be modified with
// env variables
const CLAIM_PERIOD_START = '2018-01-01 00:00'
const CLAIM_PERIOD_END = '2019-03-01 23:59:59'

module.exports = {
  startDate: dateUtil.parse(
    process.env.CLAIM_PERIOD_START || CLAIM_PERIOD_START
  ),
  endDate: dateUtil.parse(
    process.env.CLAIM_PERIOD_END || CLAIM_PERIOD_END
  )
}
