// Time periods
const dateUtil = require('../helpers/dateUtil')

// NOTE: All dates are expressed in Tel Aviv time zone

// Initial distribution (Feb 18 - Mar 20, at noon):
//   - Start of the locking for REP period (Ether, Tokens, GEN auctions)
//   - Also start for the MGN registering
let INITIAL_DISTRIBUTION_START = '2019-02-18 12:00'
let INITIAL_DISTRIBUTION_END = '2019-03-20 12:00'

// Claiming for MGN happens on the last 24h of the initial distribution (Mar 19, at noon)
let CLAIMING_MGN_START = '2019-03-19 12:00'
let CLAIMING_MGN_END = '2019-03-20 12:00'

// Redeem period (Mar 20, at noon):
//   - Users can redeem the REP after this date
//   - This period continues indefinetely
//   - All claimings are active on this date
let REDEEM_START = '2019-03-20 12:00'

// Governance period start (Apr 4, at noon):
let GOVERNANCE_START = '2019-04-04 12:00'


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
