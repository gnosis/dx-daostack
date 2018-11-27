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

module.exports = {
  // The absolute vote percentages bar
  preBoostedVoteRequiredPercentage: 50,

  // The time limit for a proposal to be in an absolute voting mode
  preBoostedVotePeriodLimit: 60,

  // The time limit for a proposal to be in an relative voting mode
  boostedVotePeriodLimit: 60,

  // Constant A for threshold calculation
  //    threshold = A * (e ** (numberOfBoostedProposals / B))
  thresholdConstA: 1,

  // Constant B for threshold calculation
  //    threshold = A * (e ** (numberOfBoostedProposals / B))
  thresholdConstB: 1,

  // Minimum staking fee allowed.
  minimumStakingFee: 0,

  // Quite ending period
  quietEndingPeriod: 0,

  // Constant A for calculate proposer reward
  //    proposerReward = (A * (RTotal) + B * (R+ - R-))/1000
  proposingRepRewardConstA: 60,

  // Constant B for calculate proposing reward.proposerReward =(A*(RTotal) +B*(R+ - R-))/1000
  proposingRepRewardConstB: 1,

  // The “ratio of stake” to be paid to voters.
  //   - All stakers pay a portion of their stake to all voters, 
  //     stakerFeeRatioForVoters * (s+ + s-).
  //   - All voters (pre and during boosting period) divide this portion in proportion to their reputation.
  stakerFeeRatioForVoters: 10,

  // Unsuccessful pre booster voters lose votersReputationLossRatio% of their reputation.
  votersReputationLossRatio: 10,

  // - The percentages of the lost reputation which is divided by the successful
  //   pre boosted voters, in proportion to their reputation
  // - The rest (100 - votersGainRepRatioFromLostRep)% of lost reputation is 
  //   divided between the successful wagers, in proportion to their stake
  votersGainRepRatioFromLostRep: 80,

  // The DAO adds up a bounty for successful staker.
  //  - The bounty formula is:
  //      s * daoBountyConst, where:
  //      s+
  //        is the wager staked for the proposal
  //      daoBountyConst
  //        is a constant factor that is configurable and changeable by the
  //        DAO given.
  //        daoBountyConst should be greater than stakerFeeRatioForVoters and
  //        less than 2 * stakerFeeRatioForVoters
  daoBountyConst: 15,

  // The daoBounty cannot be greater than daoBountyLimit
  daoBountyLimit: 10,

  // This address is allowed to vote on behalf of someone else
  voteOnBehalf: '0x0000000000000000000000000000000000000000'
}
