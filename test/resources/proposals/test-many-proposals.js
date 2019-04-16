module.exports = [
  // updateThresholdNewAuction(uint _thresholdNewAuction)
  {
    type: 'CHANGE-THRESHOLD-NEW-AUCTION',
    newThresholdInUsd: 2000
  },

  // updateThresholdNewTokenPair(uint _thresholdNewTokenPair) 
  {
    type: 'CHANGE-THRESHOLD-NEW-TOKEN-PAIR',
    newThresholdInUsd: 15000
  },

  // updateAuctioneer(address _auctioneer)
  {
    type: 'UPDATE-AUCTIONEER',
    newAuctioneer: '0xf85D1a0E1b71e72013Db51139f285C6d5356B712'
  },

  // startMasterCopyCountdown(address _masterCopy)
  {
    type: 'UPGRADE-MASTER-CONTRACT',
    newMasterContract: '0x0000000000000000000000000000000000000000'
  },

  // initiateEthUsdOracleUpdate(PriceOracleInterface _ethUSDOracle)
  {
    type: 'UPDATE-ETH-USD-ORACLE',
    oracleAddress: '0x0000000000000000000000000000000000000000'
  },

  // updateApprovalOfToken(address[] memory token, bool approved)
  {
    type: 'UPDATE-APPROVED_TOKENS',
    tokens: [
      '0x0000000000000000000000000000000000000000',
      '0x0000000000000000000000000000000000000001'
    ],
    approve: true
  },

  // updateApprovalOfToken(address[] memory token, bool approved)
  {
    type: 'UPDATE-APPROVED_TOKENS',
    tokens: [
      '0x0000000000000000000000000000000000000000',
      '0x0000000000000000000000000000000000000001'
    ],
    approve: false
  },

  // Contribution Reward: Send Ether
  {
    type: 'SEND-ETHER',
    toAddress: '0x3d1df1a816577a62db61281f673c4f43ae063490',
    amount: 1e15  // 0.001 in Wei
  },

  // Contribution Reward: Send tokens
  {
    type: 'SEND-TOKENS',
    toAddress: '0x3d1df1a816577a62db61281f673c4f43ae063490',
    tokenAddress: '0x6810e776880c02933d47db1b9fc05908e5386b96', // GNO
    amount: 1e15  // 0.001 in Wei
  },

  // Contribution Reward: Change reputation
  {
    type: 'CHANGE-REPUTATION',
    toAddress: '0x3d1df1a816577a62db61281f673c4f43ae063490',
    changeAmount: 1e15  // 0.001 in Wei
  },

  // Contribution Reward: Contribution reward proposal
  {
    type: 'CONTRIBUTION-REWARD',
    reputationChange: 1e17,  // 0.1 in Wei,
    nativeTokensReward: 5e18,  // 5 Tokens
    etherReward: 5e17,  // 0.5 in Wei
    tokenAddress: '0x6810e776880c02933d47db1b9fc05908e5386b96', // GNO
    tokenReward: 2e15,  // 0.002 in Wei,
    periodLength: 0,
    numberOfPeriod: 1,
    beneficiary: '0x3d1df1a816577a62db61281f673c4f43ae063490'
  }
]
