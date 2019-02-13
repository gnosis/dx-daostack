[![Build Status](https://travis-ci.org/gnosis/dx-daostack.svg?branch=master)](https://travis-ci.org/gnosis/dx-react?branch=master)

<p align="center">
  <img width="350px" src="http://dutchx.readthedocs.io/en/latest/_static/DutchX-logo_blue.svg" />
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

