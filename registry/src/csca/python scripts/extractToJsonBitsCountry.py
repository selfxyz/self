import os
import json
import re

def normalize_hex(hex_string):
    """Normalize hexadecimal string by removing all non-hexadecimal characters and formatting correctly."""
    cleaned_hex = re.sub(r'[^a-fA-F0-9]', '', hex_string)
    return cleaned_hex.lower()

def extract_field(content, field_name):
    pattern = re.compile(r'{}\s*:\s*([\da-fA-F:\s]+?)(?=\n\s*[A-Z])'.format(re.escape(field_name)), re.MULTILINE | re.DOTALL)
    match = pattern.search(content)
    if match:
        field_value = match.group(1)
        return normalize_hex(field_value)
    else:
        print(f"Debug: No match found for {field_name}.")
    return None

def extract_country(content):
    pattern = re.compile(r'Issuer:\s*(.*)')
    match = pattern.search(content)
    if match:
        issuer = match.group(1)
        return issuer.strip()
    return "Unknown"

def ecdsa_curve(content, filename):
    secp256r1_params = {
        'prime': '00ffffffff00000001000000000000000000000000ffffffffffffffffffffffff',
        'a': '00ffffffff00000001000000000000000000000000fffffffffffffffffffffffc',
        'b': '5ac635d8aa3a93e7b3ebbd55769886bc651d06b0cc53b0f63bce3c3e27d2604b'
    }
    unidentified_params = {
        'prime': '00a9fb57dba1eea9bc3e660a909d838d726e3bf623d52620282013481d1f6e5377',
        'a': '7d5a0975fc2c3057eef67530417affe7fb8055c126dc5c6ce94a4b44f330b5d9',
        'b': '26dc5c6ce94a4b44f330b5d9bbd77cbf958416295cf7e1ce6bccdc18ff8c07b6'
    }
    ed448_goldilocks = {
        'prime': '01ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
        'a': '01fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc',
        'b': '51953eb9618e1c9a1f929a21a0b68540eea2da725b99b315f3b8b489918ef109e156193951ec7e937b1652c0bd3bb1bf073573df883d2c34f1ef451fd46b503f00'
    }
    brainpoolP512t1_params = {
        'prime': '00aadd9db8dbe9c48b3fd4e6ae33c9fc07cb308db3b3c9d20ed6639cca703308717d4d9b009bc66842aecda12ae6a380e62881ff2f2d82c68528aa6056583a48f3',
        'a': '7830a3318b603b89e2327145ac234cc594cbdd8d3df91610a83441caea9863bc2ded5d5aa8253aa10a2ef1c98b9ac8b57f1117a72bf2c7b9e7c1ac4d77fc94ca',
        'b': '3df91610a83441caea9863bc2ded5d5aa8253aa10a2ef1c98b9ac8b57f1117a72bf2c7b9e7c1ac4d77fc94cadc083e67984050b75ebae5dd2809bd638016f723'
    }
    secp384r1_params = {
        'prime': '00fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffeffffffff0000000000000000ffffffff',
        'a': '00fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffeffffffff0000000000000000fffffffc',
        'b': '00b3312fa7e23ee7e4988e056be3f82d19181d9c6efe8141120314088f5013875ac656398d8a2ed19d2a85c8edd3ec2aef'
    }
    brainpoolP512r1_params = {
        'prime': '008cb91e82a3386d280f5d6f7e50e641df152f7109ed5456b412b1da197fb71123acd3a729901d1a71874700133107ec53',
        'a': '7bc382c63d8c150c3c72080ace05afa0c2bea28e4fb22787139165efba91f90f8aa5814a503ad4eb04a8c7dd22ce2826',
        'b': '04a8c7dd22ce28268b39b55416f0447c2fb77de107dcd2a62e880ea53eeb62d57cb4390295dbc9943ab78696fa504c11'
    }

    prime = extract_field(content, 'Prime')
    a = extract_field(content, 'A')
    b = extract_field(content, 'B')

    if (prime == secp256r1_params['prime'] and a == secp256r1_params['a'] and b == secp256r1_params['b']):
        return 'secp256r1'
    elif (prime == brainpoolP512r1_params['prime'] and a == brainpoolP512r1_params['a'] and b == brainpoolP512r1_params['b']):
        return 'brainpoolP512r1'
    elif (prime == unidentified_params['prime'] and a == unidentified_params['a'] and b == unidentified_params['b']):
        return 'unidentified'
    elif (prime == secp384r1_params['prime'] and a == secp384r1_params['a'] and b == secp384r1_params['b']):
        return 'secp384r1'
    elif (prime == brainpoolP512t1_params['prime'] and a == brainpoolP512t1_params['a'] and b == brainpoolP512t1_params['b']):
        return 'brainpoolP512t1'
    elif (prime == ed448_goldilocks['prime'] and a == ed448_goldilocks['a'] and b == ed448_goldilocks['b']):
        return 'ed448'
    else:
        print("Extracted - Prime:", prime, "A:", a, "B:", b)
    # print("File processed:", filename)

    return 'probably_secp384r1'

def count_signature_algorithms(directory):
    signature_counts = {}
    for filename in os.listdir(directory):
        if filename.endswith('.txt'):
            with open(os.path.join(directory, filename), 'r') as file:
                content = file.read()
                country = extract_country(content)
                start = content.find("Signature Algorithm:")
                if start != -1:
                    end = content.find('\n', start)
                    signature_algorithm = content[start:end].split(':')[-1].strip()
                    
                    key_start = content.find("Public-Key: (")
                    if key_start != -1:
                        key_end = content.find(" bit)", key_start)
                        key_size = content[key_start:key_end].split('(')[-1].strip()
                        signature_algorithm += " " + key_size + " bit"
                    
                    if "ecdsa" in signature_algorithm.lower():
                        curve_name = ecdsa_curve(content, filename)
                        signature_algorithm += " " + curve_name
                    elif "rsa" in signature_algorithm.lower():
                        exp_start = content.find("Exponent:")
                        if exp_start != -1:
                            exp_end = content.find(')', exp_start)
                            exponent = content[exp_start:exp_end].split(':')[-1].strip()
                            signature_algorithm += " " + exponent.split()[0]
                        else:
                            print("NOT RSA", filename)
                            signature_algorithm += " " + "NOT RSA"

                    
                    if signature_algorithm not in signature_counts:
                        signature_counts[signature_algorithm] = {}
                    
                    if country in signature_counts[signature_algorithm]:
                        signature_counts[signature_algorithm][country] += 1
                    else:
                        signature_counts[signature_algorithm][country] = 1

    return signature_counts

def total_signature_count(signature_counts):
    total_count = sum(sum(country_counts.values()) for country_counts in signature_counts.values())
    print("Total signature count:", total_count)

plain_text_directory = 'plain_text_unique'
signature_counts = count_signature_algorithms(plain_text_directory)

with open('signature_counts_bits_country.json', 'w') as json_file:
    json.dump(signature_counts, json_file, indent=4)

total_signature_count(signature_counts)