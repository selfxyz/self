# When you run the tests

First you need to copy the abi files to the sdk/core/src/abi folder.

```
cd ../sdk/core
yarn run copy-abi
```

Then you need to run the local hardhat node.

```
cd contracts
npx hardhat node
```

Then you need to run the tests in the contract dir.

```
yarn run test:sdkcore:local
```
