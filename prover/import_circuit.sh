cp ../circuits/build/dsc_4096_final.zkey src/circuit/dsc_4096_final.zkey
cp ../circuits/build/dsc_4096_js/dsc_4096.wasm src/circuit/dsc_4096.wasm
modal deploy dsc_prover.py --name dsc_prover