# How do I add my own app?

- Copy the file of an existing app such as `sbt.tsx`
- Adapt the UI fields and the `handleProve` and `handleSendProof` functions
- On your server, import the sdk in `/sdk`
- For onchain usage, let the app mint an SBT and choose `onchain` in the sdk
- For offchain usage, send the proof to your server using an api call, choose `offchain` in the sdk and let it verify the proof directly!
