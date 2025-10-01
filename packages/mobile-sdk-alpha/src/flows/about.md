# Read This

This folder contains folders for flows ie steps to complete a task like onboarding aka document registration or disclosing. In each folder each file represents roughly 1 step. Usually this means 1 screen but can be multiple depending on how error and bad states are represented in the UI. This helps with implementation as consumers of the api when building out their screens will more easily know which functions, hooks, Components, and constants to use together.

The files here and their structure are part of the external mobile sdk API.

convention is for folder for each flow to end in --ing and for file names to be verb-noun.ts

read-mrz
scan-nfc
import-aadhaar
confirm-ownership
generate-proof
