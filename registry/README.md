# Public key registry

Public key registry and merkle tree builder for Proof of Passport.
We currently use the DSC list from the ICAO. The latest version can be downloaded [here](https://download.pkd.icao.int/). If you update them, be sure to change the filenames in the scripts!
As it does not contain all the DSCs used by all countries, we are working on verifying the full certificate chain up to CSCA, see [here](https://github.com/zk-passport/proof-of-passport/issues/37).

Here is the certificate chain flow. Basically, CSCA certificates are used to sign DSC certificates which sign the SOD files contained in passport chips.

<p align="center">
  <img src="https://i.imgur.com/5h0S9Eh.jpeg" width="70%" height="70%">
</p>


Install
```
yarn
```

# DSCs

Extract pem certificates from ldif file:
```
ts-node src/dsc/extract_certificates.ts
```

Extract readable public keys from pem certicates:
```
ts-node src/dsc/extract_pubkeys.ts
```

Build the merkle tree used in the app, serialize it and place it in `common/pubkeys` and `/app/deployments`:
```
ts-node src/dsc/build_merkle_tree.ts
```

Visualize the signature algorithms of each countries, run:
```
ts-node src/dsc/extract_sig_algs.ts
```

# CSCAs (WIP)

Extract pem certificates from ldif file:
```
ts-node src/csca/extract_certificates.ts
```

Extract readable public keys from pem certicates:
```
ts-node src/csca/extract_pubkeys.ts
```

More info: [ICAO website](https://www.icao.int/Security/FAL/PKD/Pages/icao-master-list.aspx)