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
  }
]
