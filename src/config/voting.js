// Voting config

/*
* Genesis Protocol voting machine config
*   Use absolute and relative decision method.
*   Currently it allows only YES/NO voting choices (2 choices).
*   Abstaining is not allowed.
*   This voting machine is also a UniversalScheme
*
*   Docs:
*     - Voting Machines: https://daostack.github.io/arc/contracts/VotingMachines/README/
*     - Genesis Protocol: https://daostack.github.io/arc/generated_docs/VotingMachines/GenesisProtocol/
*     - Contract (params): https://github.com/daostack/infra/blob/master/contracts/VotingMachines/GenesisProtocol.sol#L27
*/

const NOBODYS_ADDRESS = '0x0000000000000000000000000000000000000000'

const DAY_IN_SECONDS = 24

function getIntParam(envValue, defaultValue) {
  if (envValue) {
    return parseInt(envValue)
  } else {
    return defaultValue
  }
}

module.exports = {
  // Absolute majority
  queuedVoteRequiredPercentage: getIntParam(process.env.QUEUED_VOTE_REQUIRED_PERCENTAGE, 50),

  // The expiration period for proposal in normal queue
  // the time limit for a proposal to be in an absolute voting mode.
  queuedVotePeriodLimit: getIntParam(process.env.QUEUED_VOTE_PERIOD_LIMIT, 14 * DAY_IN_SECONDS),

  // Time to resolve a boosted proposal
  //  the time limit for a proposal to be in an relative voting mode.
  boostedVotePeriodLimit: getIntParam(process.env.BOOSTED_VOTE_PERIOD_LIMIT, 14 * DAY_IN_SECONDS),

  // Time period to have the proposal stable in the pre-boosted queue
  //  the time limit for a proposal to be in an preparation
  preBoostedVotePeriodLimit: getIntParam(process.env.PRE_BOOSTED_VOTE_PERIOD_LIMIT, 7 * DAY_IN_SECONDS),


  // Alpha: Constant used to get the confidence:
  //    (S+ / S-) > Alpha^Nb  
  //     Nn: number of busted proposals   
  thresholdConst: getIntParam(process.env.THRESHOLD_CONST, 1500),

  // Period where the decisiion cannot be swiched from a Yes/No (or otherwise)
  quietEndingPeriod: getIntParam(process.env.QUIET_ENDING_PERIOD, 2 * DAY_IN_SECONDS),

  // Number of reputation for successful proposal
  proposingRepReward: getIntParam(process.env.PROPOSING_REP_REWARD, 1000 * 1e18),

  // Percentage of reputation that a voter looses by voting wrong
  //  - Only affects regular queue + pre-boosted queue
  votersReputationLossRatio: getIntParam(process.env.VOTERS_REPUTATION_LOSS_RATIO, 1),

  // The dxDao will stake negatively against every proposal
  // Minimun stake
  // TODO: Add formula here
  minimumDaoBounty: getIntParam(process.env.MINIMUM_DAO_BOUNTY, 0.5 * 1e18),
  // Constant
  daoBountyConst: getIntParam(process.env.DAO_BOUNTY_CONST, 10),

  // // This address is allowed to vote on behalf of someone else
  voteOnBehalf: NOBODYS_ADDRESS

  // // The absolute vote percentages bar
  // preBoostedVoteRequiredPercentage: 50,

  // // The time limit for a proposal to be in an absolute voting mode
  // preBoostedVotePeriodLimit: 60,

  // // The time limit for a proposal to be in an relative voting mode
  // boostedVotePeriodLimit: 60,

  // // Constant A for threshold calculation
  // //    threshold = A * (e ** (numberOfBoostedProposals / B))
  // thresholdConstA: 1,

  // // Constant B for threshold calculation
  // //    threshold = A * (e ** (numberOfBoostedProposals / B))
  // thresholdConstB: 1,

  // // Minimum staking fee allowed.
  // minimumStakingFee: 0,

  // // Quite ending period
  // quietEndingPeriod: 0,

  // // Constant A for calculate proposer reward
  // //    proposerReward = (A * (RTotal) + B * (R+ - R-))/1000
  // proposingRepRewardConstA: 60,

  // // Constant B for calculate proposing reward.proposerReward =(A*(RTotal) +B*(R+ - R-))/1000
  // proposingRepRewardConstB: 1,

  // // The “ratio of stake” to be paid to voters.
  // //   - All stakers pay a portion of their stake to all voters, 
  // //     stakerFeeRatioForVoters * (s+ + s-).
  // //   - All voters (pre and during boosting period) divide this portion in proportion to their reputation.
  // stakerFeeRatioForVoters: 10,

  // // Unsuccessful pre booster voters lose votersReputationLossRatio% of their reputation.
  // votersReputationLossRatio: 10,

  // // - The percentages of the lost reputation which is divided by the successful
  // //   pre boosted voters, in proportion to their reputation
  // // - The rest (100 - votersGainRepRatioFromLostRep)% of lost reputation is 
  // //   divided between the successful wagers, in proportion to their stake
  // votersGainRepRatioFromLostRep: 80,

  // // The DAO adds up a bounty for successful staker.
  // //  - The bounty formula is:
  // //      s * daoBountyConst, where:
  // //      s+
  // //        is the wager staked for the proposal
  // //      daoBountyConst
  // //        is a constant factor that is configurable and changeable by the
  // //        DAO given.
  // //        daoBountyConst should be greater than stakerFeeRatioForVoters and
  // //        less than 2 * stakerFeeRatioForVoters
  // daoBountyConst: 15,

  // // The daoBounty cannot be greater than daoBountyLimit
  // daoBountyLimit: 10
}
