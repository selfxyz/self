from cryptography import x509
from cryptography.hazmat.backends import default_backend
import os

def main():
    # Path to the certificate file
    cert_path = 'certificate.pem'
    
    # Read the certificate file
    with open(cert_path, 'rb') as file:
        cert_data = file.read()
    
    # Load the certificate
    cert = x509.load_pem_x509_certificate(cert_data, default_backend())
    
    # Get the TBS (To Be Signed) certificate bytes
    tbs_certificate_bytes = cert.tbs_certificate_bytes
    
    # Print the size of the TBS certificate in bytes
    print(f"Size of TBS Certificate: {len(tbs_certificate_bytes)} bytes")

if __name__ == "__main__":
    main()