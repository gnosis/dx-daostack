// Time periods
//    NOTE: All dates are expressed in Tel Aviv time zone
const dateUtil = require('../helpers/dateUtil')

// Initial distribution:
//   - Start of the locking for REP period
let INITIAL_DISTRIBUTION_START = '2019-02-18 12:00'
let INITIAL_DISTRIBUTION_END = '2019-03-04 12:00'

// Claiming period MGN:
//    - 24h period for claiming MGN
let CLAIMING_MGN_START = '2019-03-03 12:00:01'
let CLAIMING_MGN_END = '2019-03-04 12:00'

// Redeem period (aka freeze period):
//   - Users can redeem the REP
//   - They will be able to claim, also after this period
//   - No proposals can be sent during this period
let REDEEM_START = '2019-03-04 12:00'

// Governance period start
let GOVERNANCE_START = '2019-03-06 12:00'

// Defaults for testing
if (process.env.NODE_ENV === 'test') {
  const now = new Date()
  // Intitial distribution
  INITIAL_DISTRIBUTION_START = dateUtil.add(now, 1, 'month')
  INITIAL_DISTRIBUTION_END = dateUtil.add(INITIAL_DISTRIBUTION_START, 30, 'days')

  // Claiming of MGN
  CLAIMING_MGN_START = dateUtil.add(INITIAL_DISTRIBUTION_END, 1, 'second')
  CLAIMING_MGN_END = dateUtil.add(CLAIMING_MGN_START, 24, 'hours')

  // Redeem reputation
  REDEEM_START = dateUtil.add(CLAIMING_MGN_END, 1, 'second')

  // Start governance
  GOVERNANCE_START = dateUtil.add(REDEEM_START, 14, 'days')
}

module.exports = {
  // Intitial distribution
  initialDistributionStart: dateUtil.parse(
    process.env.INITIAL_DISTRIBUTION_START || INITIAL_DISTRIBUTION_START
  ),
  initialDistributionEnd: dateUtil.parse(
    process.env.INITIAL_DISTRIBUTION_END || INITIAL_DISTRIBUTION_END
  ),

  // Claiming of MGN
  claimingMgnStart: dateUtil.parse(
    process.env.CLAIMING_MGN_START || CLAIMING_MGN_START
  ),
  claimingMgnEnd: dateUtil.parse(
    process.env.CLAIMING_MGN_END || CLAIMING_MGN_END
  ),

  // Redeem reputation
  redeemStart: dateUtil.parse(
    process.env.REDEEM_START || REDEEM_START
  ),

  // Start governance
  governanceStart: dateUtil.parse(
    process.env.GOVERNANCE_START || GOVERNANCE_START
  )
}
