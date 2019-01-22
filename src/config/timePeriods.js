// Time period

const dateUtil = require('../helpers/dateUtil')

// Initial distribution (Feb 18 - Mar 20, at noon):
//   - Start of the locking for REP period
let INITIAL_DISTRIBUTION_START = '2019-02-18 12:00'
let INITIAL_DISTRIBUTION_END = '2019-03-20 11:59:59'

// Claiming period for REP for Locked MGN (Mar 20, at noon)
//    - 24h period, starts at noon, on the 20th
//    - The MGN cannot be claimed until the 21th (all other can start being claimed on the 20th)
let CLAIMING_MGN_START = '2019-03-19 12:00'
let CLAIMING_MGN_END = '2019-03-20 11:59:59'

// Redeem period (Mar 20):
//   - Users can redeem the REP
//   - This period continues indefinetely
//   - All claimings but MGN are active on this date (MGN needs to wait the 24h window)
let REDEEM_START = '2019-03-20 12:00'

// Governance period start (Apr 4):
let GOVERNANCE_START = '2019-04-04 12:00'


// Defaults for testing
if (process.env.NODE_ENV === 'test') {
  const now = new Date()
  // LOCKING: Starts in one month from now, last 30 days
  INITIAL_DISTRIBUTION_START = dateUtil.add(now, 1, 'month')
  INITIAL_DISTRIBUTION_END = dateUtil.add(INITIAL_DISTRIBUTION_START, 30, 'days')

  // CLAIMING MGN: Right after the initial distribution, last 24h
  CLAIMING_MGN_START = dateUtil.add(INITIAL_DISTRIBUTION_END, 1, 'second')
  CLAIMING_MGN_END = dateUtil.add(CLAIMING_MGN_START, 24, 'hours')

  // REDEEM: Right after the claiming of MGN
  REDEEM_START = dateUtil.add(CLAIMING_MGN_END, 1, 'second')

  // GOVERNANCE: 14 days after redeem the period starts
  GOVERNANCE_START = dateUtil.add(REDEEM_START, 14, 'days')
}

module.exports = {
  // Initial distribution
  initialDistributionStart: dateUtil.parse(
    process.env.INITIAL_DISTRIBUTION_START || INITIAL_DISTRIBUTION_START
  ),
  initialDistributionEnd: dateUtil.parse(
    process.env.INITIAL_DISTRIBUTION_END || INITIAL_DISTRIBUTION_END
  ),

  // 24h claiming MGN window
  claimingMgnStart: dateUtil.parse(
    process.env.CLAIMING_MGN_START || CLAIMING_MGN_START
  ),
  claimingMgnEnd: dateUtil.parse(
    process.env.CLAIMING_MGN_END || CLAIMING_MGN_END
  ),

  // Redeem period
  redeemStart: dateUtil.parse(
    process.env.REDEEM_START || REDEEM_START
  ),

  // Governance
  governanceStart: dateUtil.parse(
    process.env.GOVERNANCE_START || GOVERNANCE_START
  )
}
