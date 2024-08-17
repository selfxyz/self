# OpenPassport Prover

This repository contains the code for the OpenPassport DSC/CSCA prover.
The prover runs on the [modal](https://modal.com/docs/guide) server and generates a witness with [snarkjs](https://github.com/iden3/snarkjs) and a proof with the [old version of rapidsnark](https://github.com/iden3/rapidsnark-old).

## Installation
install requirements.txt
```
pip install -r requirements.txt
```
## Usage

launch modal server

```
./import_circuit.sh
modal deploy dsc_prover.py --name dsc_prover
```

## Test

create a test/csca_inputs.json file with the inputs for the CSCA circuit and run the request.py script

```
cd test
python request.py
```
