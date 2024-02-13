# rust module to generate the proof of passport android native lib

To run tests and see logs:
```
cargo test --release -- --nocapture
```

Could be replaced by mopro once mopro is available on Android.

To generate the arkzkey, if you have installed arkzkey-util globally from the mopro repo, you can run
```
cd passport
arkzkey-util proof_of_passport_final.zkey
```