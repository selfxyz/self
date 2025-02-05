#!/usr/bin/env python3
import json
import os

def read_json_file(json_path: str) -> dict:
    """
    Safely read JSON from a file. Return an empty dict if not found.
    """
    if not os.path.exists(json_path):
        print(f"JSON not found at {json_path}, skipping...")
        return {}
    with open(json_path, 'r') as f:
        return json.load(f)

def generate_typescript_from_ski_json():
    """
    Read ski_pem.json and ski_pem_dev.json, create corresponding 
    TypeScript exports with SKI -> PEM mapping, then write to 
    src/constants/skiPem.ts

    This version uses absolute paths relative to this script's location
    so it can find the registry/outputs folder even if run from 'common/'.
    """
    # Calculate paths relative to the script's directory
    script_dir = os.path.dirname(os.path.abspath(__file__))

    # Move up 3 directories from 'common/src/scripts' -> the repo root
    # so that "registry/outputs" is located properly as a sibling to "common"
    prod_path = os.path.join(script_dir, "..", "..", "..", "registry", "outputs", "ski_pem.json")
    dev_path = os.path.join(script_dir, "..", "..", "..", "registry", "outputs", "ski_pem_dev.json")

    prod_data = read_json_file(prod_path)  # { ski_string: base64_der }
    dev_data = read_json_file(dev_path)

    # Prepare TypeScript content
    ts_output_path = os.path.join(script_dir, "..", "..", "src", "constants", "skiPem.ts")
    ts_content = "// Auto-generated from addSkiPemToTs.py\n\n"

    # We'll export two objects: skiPemProd & skiPemDev
    # Each is a Record<string, string> mapping SKI -> PEM certificate
    ts_content += "export const SKI_PEM: Record<string, string> = {\n"
    for ski, b64_der in prod_data.items():
        # Escape backticks so the final TS file remains valid
        escaped_der = b64_der.replace("`", "\\`")
        ts_content += f'  "{ski}": `{escaped_der}`,\n'
    ts_content += "};\n\n"

    ts_content += "export const SKI_PEM_DEV: Record<string, string> = {\n"
    for ski, b64_der in dev_data.items():
        escaped_der = b64_der.replace("`", "\\`")
        ts_content += f'  "{ski}": `{escaped_der}`,\n'
    ts_content += "};\n\n"

    # Ensure output directory exists
    os.makedirs(os.path.dirname(ts_output_path), exist_ok=True)
    with open(ts_output_path, 'w') as ts_file:
        ts_file.write(ts_content)

if __name__ == "__main__":
    generate_typescript_from_ski_json()
