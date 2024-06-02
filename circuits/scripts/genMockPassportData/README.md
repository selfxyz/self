# How to generate mock passport data based on your real data?

- Build the app and scan your passport to log your passport data.
- Copy one of the files of this folder and paste your passport data.
- Adapt the `verify` function to verify it. Once this is done, adapt the `genMockPassportData` to generate a mock one.
- Once the mock passport data generated is verified correctly by the same `verify` function that verifies yours, you're all set!
- Run the script to generate a mock passport data and add it to `common/src/utils/mockPassportData.ts`
- Do a PR
- DM us to collect your bounty!