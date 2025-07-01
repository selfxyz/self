how to deploy and update the protocol

Main contracts:

- Hub
- Registries
  - Passports
  - ID cards

Hub and Registries are following an upgradeable proxy pattern. Use only the Proxy address for everything.

Secondary contracts:

- vc_and_disclose verifiers
- vc_and_disclose_id verifiers
- register verifiers'
- register id verifiers
- dsc verifiers

How to update the protocol:

### Deploy the Hub V2 and the Identity registry

```
yarn deploy:hub:v2
```

```
yarn deploy:registry:idcard
```

### Set the registries address in the hub

```
yarn set:hub:v2
```

Set the verifiers in the hub

```
yarn set:verifiers:v2
```

### Update the registries

````
yarn set:registry:hub:v2
```
````
