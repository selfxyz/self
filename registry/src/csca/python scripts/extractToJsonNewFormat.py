import os
import json
import re
from utils import extract_country, ecdsa_curve

def count_signature_algorithms(directory):
    signature_counts = {}
    for filename in os.listdir(directory):
        if filename.endswith('.txt'):
            with open(os.path.join(directory, filename), 'r') as file:
                content = file.read()
                country = extract_country(content)
                # Extract only the value of C from the country
                country_code = re.search(r"C=([^,]+)", country)
                if country_code:
                    country = country_code.group(1).upper()

                # Extract the signature algorithm base name
                if "pss" in content.lower():
                    signature_algorithm = "rsapss"
                elif "rsa" in content.lower():
                    signature_algorithm = "rsa"
                elif "ecdsa" in content.lower():
                    signature_algorithm = "ecdsa"
                else:
                    signature_algorithm = "unknown"

                # Improved hash algorithm extraction
                hash_algorithm_match = re.search(r"sha(\d+)", content, re.IGNORECASE)
                hash_algorithm = "sha" + hash_algorithm_match.group(1) if hash_algorithm_match else "unknown"

                # Extract the public key bit length
                key_size_match = re.search(r"Public-Key:\s*\((\d+) bit\)", content, re.IGNORECASE)
                bit_length = int(key_size_match.group(1)) if key_size_match else 0

                # Determine curve exponent or RSA exponent based on the algorithm
                if "ecdsa" in signature_algorithm:
                    curve_name = ecdsa_curve(content, filename)
                    curve_exponent = curve_name
                elif "rsa" in signature_algorithm or "rsapss" in signature_algorithm:
                    exp_match = re.search(r"Exponent:\s*(\d+)", content, re.IGNORECASE)
                    curve_exponent = exp_match.group(1) if exp_match else "NOT RSA"
                else:
                    curve_exponent = "N/A"

                entry = {
                    "signature_algorithm": signature_algorithm,
                    "hash_algorithm": hash_algorithm,
                    "curve_exponent": curve_exponent,
                    "bit_length": bit_length,
                    "amount": 1
                }

                if country not in signature_counts:
                    signature_counts[country] = [entry]
                else:
                    found = False
                    for item in signature_counts[country]:
                        if (item["signature_algorithm"] == entry["signature_algorithm"] and
                            item["hash_algorithm"] == entry["hash_algorithm"] and
                            item["curve_exponent"] == entry["curve_exponent"] and
                            item["bit_length"] == entry["bit_length"]):
                            item["amount"] += 1
                            found = True
                            break
                    if not found:
                        signature_counts[country].append(entry)

    return signature_counts

def total_signature_count(signature_counts):
    total_count = sum(sum(item['amount'] for item in country_list) for country_list in signature_counts.values())
    print("Total signature count:", total_count)

plain_text_directory = '../../../outputs/plain_text_unique'
signature_counts = count_signature_algorithms(plain_text_directory)

with open('../../../outputs/csca_formatted.json', 'w') as json_file:
    json.dump(signature_counts, json_file, indent=4)

total_signature_count(signature_counts)