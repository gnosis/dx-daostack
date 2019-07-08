[![Build Status](https://travis-ci.org/gnosis/dx-daostack.svg?branch=master)](https://travis-ci.org/gnosis/dx-react?branch=master)

</p>

# dxDAO
* **dxDAO Web**: https://dxdao.daostack.io

The future of organizations is DAOs. The dxDAO is a next-generation DAO, designed
 to facilitate global, open trade.

The first dApp governed by the dxDAO will be the DutchX, an open trading 
protocol for ERC20 tokens using the Dutch auction mechanism. 
It determines a fair value for tokens, permits trading in low liquidity 
environments with no third party risk, and mitigates harmful trading practices 
like front-running

You can find all information and documentation about the DutchX 
[here](https://dutchx.readthedocs.io/en/latest/), and join the discussion in 
this [Forum](https://daotalk.org/c/dx-dao).

# Contract Addresses
The dxDAO address is [0x519b70055af55A007110B4Ff99b0eA33071c720a](https://etherscan.io/address/0x519b70055af55A007110B4Ff99b0eA33071c720a). 


Other relevant addresses of the DAO:

## Main DAO Components
| Name  | Description  | Address |
|---|---|---|
| Avatar  | Main address for the DAO. Ethereum identity  | [0x519b70055af55A007110B4Ff99b0eA33071c720a](https://etherscan.io/address/0x519b70055af55A007110B4Ff99b0eA33071c720a)  |
| Token  | dxDAO's own token | [0x643b14F6EA235668278DA5974930105852F2B7C4](https://etherscan.io/address/0x643b14F6EA235668278DA5974930105852F2B7C4)  |
| Reputation  | Voting power for dxDAO proposals  | [0x7a927A93F221976AAE26d5D077477307170f0b7c](https://etherscan.io/address/0x7a927A93F221976AAE26d5D077477307170f0b7c)  |
| Controller  | dxDAO controller  | [0x9f828AC3baA9003e8a4e0b24bcaE7b027B6740b0](https://etherscan.io/address/0x9f828AC3baA9003e8a4e0b24bcaE7b027B6740b0)  |
| Genesis Protocol | Holographic Consensus voting machine for voting on proposals  | [0x332B8C9734b4097dE50f302F7D9F273FFdB45B84](https://etherscan.io/address/0x332B8C9734b4097dE50f302F7D9F273FFdB45B84) |

## Main Schemes
Main schemes that allow to create proposals to manage the dxDAO.

| Name  | Description  | Address | Genesis Protocol Hashed Params |
|---|---|---|---|
| DutchX (Generic Scheme) | Manage DutchX protocol  | [0x199719EE4d5DCF174B80b80afa1FE4a8e5b0E3A0](https://etherscan.io/address/0x199719EE4d5DCF174B80b80afa1FE4a8e5b0E3A0)  | `0xff6155010292b35fb8daae8b4450cdc41a586bc591e9a76484e88ffba36f94a8` |
| Contribution Reward Scheme  | Create proposals contributions in exchange for ETH, Tokens or Reputation  | [0x08cC7BBa91b849156e9c44DEd51896B38400f55B](https://etherscan.io/address/0x08cC7BBa91b849156e9c44DEd51896B38400f55B) | `0x399141801e9e265d79f1f1759dd67932980664ea28c2ba7e0e4dba8719e47118` |
| Admin (Scheme Registrar)  | Register new schemes  | [0xf050F3C6772Ff35eB174A6900833243fcCD0261F](https://etherscan.io/address/0xf050F3C6772Ff35eB174A6900833243fcCD0261F) | `0x9799ec39e42562c5ac7fbb104f1edcaa495e00b45e0db80cce1c0cdc863d0d0f` |

## Vote Staking Period Schemes
Schemes used during Vote Staking Period (VSP) to assign the initial Reputation.

| Name  | Description  | Address |
|---|---|---|
| ETH Locking Scheme  | Allows users to lock Ether during the VSP in order to get a score that will be used for the allocation of Reputation  | [0x4564BFe303900178578769b2D76B1a13533E5fd5](https://etherscan.io/address/0x4564BFe303900178578769b2D76B1a13533E5fd5)  |
| Whitelisted Token Locking Scheme  | Allows users to lock Tokens during the VSP in order to get a score that will be used for the allocation of Reputation  | [0x1cb5B2BB4030220ad5417229A7A1E3c373cDD2F6](https://etherscan.io/address/0x1cb5B2BB4030220ad5417229A7A1E3c373cDD2F6)  |
| MGN Registration Scheme  | Allows users to get a score, depending on the amount of locked MGN you hold, that will be used for the allocation of Reputation  | [0x2E6FaE82c77e1D6433CCaAaF90281523b99D0D0a](https://etherscan.io/address/0x2E6FaE82c77e1D6433CCaAaF90281523b99D0D0a) |
| GEN Auction Scheme  | Allows users to bid on several GEN auctions during the VSP in order to get a score that will be used for the allocation of Reputation  | [0x4D8DB062dEFa0254d00a44aA1602C30594e47B12](https://etherscan.io/address/0x4D8DB062dEFa0254d00a44aA1602C30594e47B12) |



# Bug Bounty
* [Blog post](https://blog.gnosis.pm/test-dxdao-bug-bounties-live-939095b7dd8d)
* [Bounty Github branch](https://github.com/gnosis/dx-daostack/tree/feature/bounty)
  * [Deployment info](https://github.com/gnosis/dx-daostack/blob/feature/bounty/deployment-bounty-mainnet.txt): Parameters, Contract Addresses, Transaction information, etc..
  * [Config used](https://github.com/gnosis/dx-daostack/blob/feature/bounty/env_vars/bounty.31.01.2019.env): Overrides over the default config

# Audit
DAOStack's Smart contract Audit:
* [Blog post](https://medium.com/chainsecurity/https-medium-com-chainsecurity-daostack-audit-completed-10e370c4bc30)
* [Full Report](https://github.com/ChainSecurity/audits/blob/master/ChainSecurity_DAOstack_v2.pdf)

## Install dependencies
Useful, for example for working with the console in any deployed network
```bash
# Install dependencies
npm run install

# Restore the network info in the compiled contracts
npm run restore

# Check the networks :) 
npm run networks
```

## Run tests
```bash
# Install dependencies
npm install

# In one tab: Run ganache
npm run rpc

# In another tab: Run the tests
npm run test
```

For running a particular test:
```bash
npx truffle test <name-of-the-test>
```

## Migrations
Local:
```bash
npm run migrate
```

Rinkeby:
```bash
npm run migrate -- --network rinkeby
```

Mainnet:
```bash
npm run migrate -- --network mainnet
```

## Verify contracts in Etherscan
Make sure the dependencies and addresses are updated:
```bash
npm run install
npm run restore
```

For every contract, you need to get the flattened version. 

```bash
# Get the list of contracts:
ls -Rl contracts

# Flatten a contract
npx truffle-flattener contracts/DxAvatar.sol > build/DxAvatar.sol
```

> To verify you will need to use the exact version of the compiler:
>
> Check it here:
> * https://github.com/gnosis/dx-daostack/blob/master/truffle.js#L84

Verify:
* [https://etherscan.io/verifyContract2](https://etherscan.io/verifyContract2)

