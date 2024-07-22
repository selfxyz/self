import requests
import json

with open("csca_inputs.json", "r") as file:
    inputs = json.load(file)

response = requests.post("https://zk-passport--dsc-prover-generate-dsc-proof.modal.run", json=inputs , timeout=600)
with open("response.json", "w") as file:
    file.write(response.text)