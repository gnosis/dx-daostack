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

const DAY_IN_SECONDS = 24 * 60 * 60

function getIntParam(envValue, defaultValue) {
  if (envValue) {
    return parseInt(envValue)
  } else {
    return defaultValue
  }
}

module.exports = {
  dutchX: {
    // Absolute majority
    queuedVoteRequiredPercentage: getIntParam(process.env.QUEUED_VOTE_REQUIRED_PERCENTAGE, 50),

    // The expiration period for proposal in normal queue
    // the time limit for a proposal to be in an absolute voting mode.
    queuedVotePeriodLimit: getIntParam(process.env.QUEUED_VOTE_PERIOD_LIMIT, 90 * DAY_IN_SECONDS),  // 7776000

    // Time to resolve a boosted proposal
    //  the time limit for a proposal to be in an relative voting mode.
    boostedVotePeriodLimit: getIntParam(process.env.BOOSTED_VOTE_PERIOD_LIMIT, 14 * DAY_IN_SECONDS),  // 1209600

    // Time period to have the proposal stable in the pre-boosted queue
    //  the time limit for a proposal to be in an preparation
    preBoostedVotePeriodLimit: getIntParam(process.env.PRE_BOOSTED_VOTE_PERIOD_LIMIT, 2 * DAY_IN_SECONDS),  // 172800


    // Alpha: Constant used to get the confidence:
    //    (S+ / S-) > Alpha^N
    //     N: number of busted proposals   
    thresholdConst: getIntParam(process.env.THRESHOLD_CONST, 1300),

    // Period where the decision cannot be swiched from a Yes/No (or otherwise)
    quietEndingPeriod: getIntParam(process.env.QUIET_ENDING_PERIOD, 4 * DAY_IN_SECONDS),  // 345600

    // Number of reputation for successful proposal
    proposingRepReward: getIntParam(process.env.PROPOSING_REP_REWARD, '1000000000000000000000'), // 1e21 = 1000 * 1e18

    // Percentage of reputation that a voter looses by voting wrong
    //  - Only affects regular queue + pre-boosted queue
    votersReputationLossRatio: getIntParam(process.env.VOTERS_REPUTATION_LOSS_RATIO, 4),

    // The dxDao will stake negatively against every proposal
    // Minimun stake
    // TODO: Add formula here    
    minimumDaoBounty: getIntParam(process.env.MINIMUM_DAO_BOUNTY, '500000000000000000000'), //  500 * 1e18
    // Constant
    daoBountyConst: getIntParam(process.env.DAO_BOUNTY_CONST, 10),

    // // This address is allowed to vote on behalf of someone else
    voteOnBehalf: NOBODYS_ADDRESS
  },
  contributionReward: {
    // Absolute majority
    queuedVoteRequiredPercentage: getIntParam(process.env.QUEUED_VOTE_REQUIRED_PERCENTAGE, 50),

    // The expiration period for proposal in normal queue
    // the time limit for a proposal to be in an absolute voting mode.
    queuedVotePeriodLimit: getIntParam(process.env.QUEUED_VOTE_PERIOD_LIMIT, 45 * DAY_IN_SECONDS), // 3888000

    // Time to resolve a boosted proposal
    //  the time limit for a proposal to be in an relative voting mode.
    boostedVotePeriodLimit: getIntParam(process.env.BOOSTED_VOTE_PERIOD_LIMIT, 7 * DAY_IN_SECONDS),  // 604800

    // Time period to have the proposal stable in the pre-boosted queue
    //  the time limit for a proposal to be in an preparation
    preBoostedVotePeriodLimit: getIntParam(process.env.PRE_BOOSTED_VOTE_PERIOD_LIMIT, 1 * DAY_IN_SECONDS), // 86400


    // Alpha: Constant used to get the confidence:
    //    (S+ / S-) > Alpha^Nb  
    //     Nn: number of busted proposals   
    thresholdConst: getIntParam(process.env.THRESHOLD_CONST, 1200),

    // Period where the decision cannot be swiched from a Yes/No (or otherwise)
    quietEndingPeriod: getIntParam(process.env.QUIET_ENDING_PERIOD, 2 * DAY_IN_SECONDS),  // 172800

    // Number of reputation for successful proposal
    proposingRepReward: getIntParam(process.env.PROPOSING_REP_REWARD, '500000000000000000000'), // 5e20 == 500 * 1e18

    // Percentage of reputation that a voter looses by voting wrong
    //  - Only affects regular queue + pre-boosted queue
    votersReputationLossRatio: getIntParam(process.env.VOTERS_REPUTATION_LOSS_RATIO, 4),

    // The dxDao will stake negatively against every proposal
    // Minimun stake
    // TODO: Add formula here
    minimumDaoBounty: getIntParam(process.env.MINIMUM_DAO_BOUNTY, '250000000000000000000'), //  250 * 1e18
    // Constant
    daoBountyConst: getIntParam(process.env.DAO_BOUNTY_CONST, 10),

    // // This address is allowed to vote on behalf of someone else
    voteOnBehalf: NOBODYS_ADDRESS
  },
  admin: {
    // Absolute majority
    queuedVoteRequiredPercentage: getIntParam(process.env.QUEUED_VOTE_REQUIRED_PERCENTAGE, 50),

    // The expiration period for proposal in normal queue
    // the time limit for a proposal to be in an absolute voting mode.
    queuedVotePeriodLimit: getIntParam(process.env.QUEUED_VOTE_PERIOD_LIMIT, 90 * DAY_IN_SECONDS),  // 777600

    // Time to resolve a boosted proposal
    //  the time limit for a proposal to be in an relative voting mode.
    boostedVotePeriodLimit: getIntParam(process.env.BOOSTED_VOTE_PERIOD_LIMIT, 14 * DAY_IN_SECONDS),  // 1209600

    // Time period to have the proposal stable in the pre-boosted queue
    //  the time limit for a proposal to be in an preparation
    preBoostedVotePeriodLimit: getIntParam(process.env.PRE_BOOSTED_VOTE_PERIOD_LIMIT, 2 * DAY_IN_SECONDS),  // 172800


    // Alpha: Constant used to get the confidence:
    //    (S+ / S-) > Alpha^Nb  
    //     Nn: number of boosted proposals   
    thresholdConst: getIntParam(process.env.THRESHOLD_CONST, 1300),

    // Period where the decision cannot be swiched from a Yes/No (or otherwise)
    quietEndingPeriod: getIntParam(process.env.QUIET_ENDING_PERIOD, 4 * DAY_IN_SECONDS),  // 345600

    // Number of reputation for successful proposal
    proposingRepReward: getIntParam(process.env.PROPOSING_REP_REWARD, '2000000000000000000000'), // 2e21 == 2000 * 1e18

    // Percentage of reputation that a voter looses by voting wrong
    //  - Only affects regular queue + pre-boosted queue
    votersReputationLossRatio: getIntParam(process.env.VOTERS_REPUTATION_LOSS_RATIO, 4),

    // The dxDao will stake negatively against every proposal
    // Minimun stake
    // TODO: Add formula here
    minimumDaoBounty: getIntParam(process.env.MINIMUM_DAO_BOUNTY, '1000000000000000000000'), //  1000 * 1e18
    // Constant
    daoBountyConst: getIntParam(process.env.DAO_BOUNTY_CONST, 10),

    // // This address is allowed to vote on behalf of someone else
    voteOnBehalf: NOBODYS_ADDRESS
  }
}
