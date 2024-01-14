#!/bin/bash

mkdir -p target
circom ./multiplier2.circom --r1cs --wasm --sym --output ./target
