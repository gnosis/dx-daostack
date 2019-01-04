[![Build Status](https://travis-ci.org/gnosis/dx-daostack.svg?branch=master)](https://travis-ci.org/gnosis/dx-react?branch=master)

<p align="center">
  <img width="350px" src="http://dutchx.readthedocs.io/en/latest/_static/DutchX-logo_blue.svg" />
</p>


# DutchX Dao (DaoStack)
DAO (Decentralized Autonomous Organization) for managing the **DutchX**.

The **Dutch Exchange (DutchX)** is a fully decentralized exchange, which
allows **everyone** to add any trading token pair.

It uses the [Dutch auction] principle, to prevent the problems that
other exchanges are experiencing (such as front running) getting a
fairer ecosystem for everyone to use.

There is no restriction besides the fact that tokens must be
[ERC20](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-20.md) compliant.

# Documentation
Checkout the [DutchX Documentation](http://dutchx.readthedocs.io/en/latest).

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

