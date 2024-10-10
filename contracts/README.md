# OpenPassport Contracts

Contracts for OpenPassport.

Try running some of the following tasks:

```shell
npx hardhat help
npx hardhat test
GAS_REPORT=true npx hardhat test
npx hardhat node
npx hardhat run scripts/mint.ts
npx hardhat ignition deploy ignition/modules/Deploy_All.ts --network <network>
```

## When you run test
If you want to test in your local environment

```shell
cd ../circuits
./scripts/build_prove_circuits.sh
cd ../contracts
yarn run test:local
```

If you want to test in production environment
```shell
cd ../circuits
./scripts/download_circuits_from_aws.sh
cd ../contracts
yarn run test:prod
```

If you want to generate your own proof or when you update circuits, pls delete json files in test/integrationTest
