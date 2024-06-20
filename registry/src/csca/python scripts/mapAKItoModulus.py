import os
import json
import logging
import re

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Paths
path_to_plain_text_csca_certificates = "../../../outputs/plain_text_unique"
path_to_json_output = "../../../outputs/csca_aki_modulus.json"

def check_ecdsa_in_files(folder_path):
    aki_to_modulus = {}
    modulus_pattern = re.compile(r"Modulus:\s+([0-9a-f:\s]+)")
    ski_pattern = re.compile(r"Subject Key Identifier:\s+([0-9A-F:]+)")
    for filename in os.listdir(folder_path):
        if filename.endswith(".txt"):
            file_path = os.path.join(folder_path, filename)
            with open(file_path, 'r') as file:
                content = file.read()
                modulus_match = modulus_pattern.search(content)
                ski_match = ski_pattern.search(content)
                if modulus_match and ski_match:
                    modulus_value = modulus_match.group(1).replace('\n', '').replace(' ', '')
                    ski_value = ski_match.group(1)
                    aki_to_modulus[ski_value] = modulus_value
                else:
                    missing = []
                    if not modulus_match:
                        missing.append("Modulus")
                    if not ski_match:
                        missing.append("Subject Key Identifier")
                    print(f"Filename: {filename}, Missing: {', '.join(missing)}")

    with open(path_to_json_output, 'w') as json_file:
        json.dump(aki_to_modulus, json_file, indent=4)

check_ecdsa_in_files(path_to_plain_text_csca_certificates)
