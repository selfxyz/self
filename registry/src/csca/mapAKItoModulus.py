import os
import json
import re


# Paths
path_to_plain_text_csca_certificates = "outputs/unique_txt"
path_to_json_output = "outputs/csca_aki_modulus.json"

development_mode = True
    
mockCscaList = [
    '../common/src/mock_certificates/sha256_rsa_4096/mock_csca.txt',
    '../common/src/mock_certificates/sha256_rsa_2048/mock_csca.txt',
]

def check_ecdsa_in_files(folder_path):
    aki_to_modulus = {}
    modulus_pattern = re.compile(r"Modulus:\s+([0-9a-f:\s]+)")
    ski_pattern = re.compile(r"Subject Key Identifier:\s+([0-9A-F:]+)")
    
    def process_file(file_path):
        with open(file_path, 'r') as file:
            content = file.read()
            if "ecdsa" in content.lower() or "id-ecpublickey" in content.lower(): 
                print(f"skipping {file_path} as it is an ECDSA certificate")
                return
            if "6144 bit" in content: # skip 6144 bit certificates for the moment
                return
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
                print(f"Filename: {file_path}, Missing: {', '.join(missing)}")

    for filename in os.listdir(folder_path):
        if filename.endswith(".txt"):
            file_path = os.path.join(folder_path, filename)
            process_file(file_path)

    if development_mode:
        for mock_file in mockCscaList:
            if not os.path.exists(mock_file):
                print(f"File not found: {mock_file}")
                continue
            print(f"Processing mock file: {mock_file}")
            process_file(mock_file)

    with open(path_to_json_output, 'w') as json_file:
        json.dump(aki_to_modulus, json_file, indent=4)

check_ecdsa_in_files(path_to_plain_text_csca_certificates)
