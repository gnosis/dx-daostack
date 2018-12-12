const dateUtil = require('../../helpers/dateUtil')

// Initial distribution (Feb 18 - Mar 20, at noon):
//   - Start of the locking for REP period
let INITIAL_DISTRIBUTION_START = '2019-02-18 12:00'
let INITIAL_DISTRIBUTION_END =   '2019-03-20 11:59:59'

// Claiming period for REP for Locked MGN (Mar 20, at noon)
//    - 24h period, starts at noon, on the 20th
//    - The MGN cannot be claimed until the 21th (all other can start being claimed on the 20th)
const CLAIMING_MGN_START = '2019-03-20 12:00'
const CLAIMING_MGN_END =   '2019-03-21 11:59:59'
const REDEEM_MGN_START =   '2019-03-21 12:00'

// Redeem period (Mar 20):
//   - Users can redeem the REP
//   - This period continues indefinetely
//   - All claimings but MGN are active on this date (MGN needs to wait the 24h window)
const REDEEM_START = '2019-03-20 12:00'

// Governance period start (Apr 4):
const GOVERNANCE_START = '2019-04-04 12:00'


// Defaults for testing
if (process.env.NODE_ENV === 'test') {
  // Default dates (+1 month, +3 month)
  const now = new Date()
  INITIAL_DISTRIBUTION_START = dateUtil.add(now, 1, 'month')
  INITIAL_DISTRIBUTION_END = dateUtil.add(now, 3, 'month')
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
  redeemMgnStart: dateUtil.parse(
    // Same as claimingMgnEnd
    process.env.REDEEM_MGN_START || REDEEM_MGN_START
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
