import os
import re

def read_certificate_content(file_path):
    """Read and return the complete PEM certificate including headers, removing any extra lines."""
    with open(file_path, 'r') as f:
        full_text = f.read()
    # Extract just the chunk from BEGIN CERTIFICATE to END CERTIFICATE
    start_idx = full_text.find("-----BEGIN CERTIFICATE-----")
    end_idx = full_text.find("-----END CERTIFICATE-----") + len("-----END CERTIFICATE-----")
    if start_idx == -1 or end_idx == -1:
        # If not found, just return what we have
        return full_text.strip()
    pem_chunk = full_text[start_idx:end_idx]

    cleaned_lines = []
    for line in pem_chunk.splitlines():
        stripped = line.strip()
        # Remove any completely empty lines or lines that are just "-----"
        if not stripped or stripped == "-----":
            continue
        cleaned_lines.append(line)
    return "\n".join(cleaned_lines) + "\n"


def read_private_key_content(file_path):
    """Read and return the complete PEM private key including headers, removing any extra lines."""
    with open(file_path, 'r') as f:
        full_text = f.read()
    # Extract just the chunk from BEGIN PRIVATE KEY to END PRIVATE KEY
    start_idx = full_text.find("-----BEGIN PRIVATE KEY-----")
    end_idx = full_text.find("-----END PRIVATE KEY-----") + len("-----END PRIVATE KEY-----")
    if start_idx == -1 or end_idx == -1:
        # If not found, just return what we have
        return full_text.strip()
    pem_chunk = full_text[start_idx:end_idx]

    cleaned_lines = []
    for line in pem_chunk.splitlines():
        stripped = line.strip()
        # Remove any completely empty lines or lines that are just "-----"
        if not stripped or stripped == "-----":
            continue
        # If we ever find a line of just "=" or "==", merge it into the previous line.
        if stripped in ["=", "==", "==="] and cleaned_lines:
            cleaned_lines[-1] += stripped
            continue
        cleaned_lines.append(line)
    return "\n".join(cleaned_lines) + "\n"


def format_variable_name(dir_name):
    """
    Customize how directory names become variable suffixes here.
    e.g., "sha256_rsa_65537_4096" -> "sha256_rsa_65537_4096"
    """
    return dir_name


def generate_typescript_file():
    """
    Scans src/mock_certificates subdirectories for DSC files (mock_dsc.pem + mock_dsc.key).
    Generates a single file: src/constants/mockCertificates.ts
    which exports each DSC certificate & key as TypeScript constants.
    """
    base_path = "src/mock_certificates"
    ts_output_path = "src/constants/mockCertificates.ts"

    typescript_content = "// Auto-generated file (DSC only)\n\n"

    # Look through all subdirectories of src/mock_certificates
    if not os.path.isdir(base_path):
        print(f"No directory found at {base_path}; skipping DSC scanning.")
        return

    for subdir in sorted(os.listdir(base_path)):
        full_subdir_path = os.path.join(base_path, subdir)
        if not os.path.isdir(full_subdir_path):
            continue

        dsc_cert_path = os.path.join(full_subdir_path, "mock_dsc.pem")
        dsc_key_path = os.path.join(full_subdir_path, "mock_dsc.key")

        if os.path.exists(dsc_cert_path) and os.path.exists(dsc_key_path):
            cert_content = read_certificate_content(dsc_cert_path)
            key_content = read_private_key_content(dsc_key_path)

            formatted_name = format_variable_name(subdir)
            var_name = f"mock_dsc_{formatted_name}"
            key_var_name = f"{var_name}_key"

            typescript_content += f"""export const {var_name} = `{cert_content}`;
export const {key_var_name} = `{key_content}`;

"""

    os.makedirs(os.path.dirname(ts_output_path), exist_ok=True)
    with open(ts_output_path, 'w') as f:
        f.write(typescript_content)


if __name__ == "__main__":
    generate_typescript_file()