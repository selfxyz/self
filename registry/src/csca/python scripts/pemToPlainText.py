import os
import subprocess

pem_directory = 'path/to/pem/directory'
output_directory = 'path/to/plain/text/directory'
os.makedirs(output_directory, exist_ok=True)

for pem_file in os.listdir(pem_directory):
    if pem_file.endswith('.pem'):
        input_path = os.path.join(pem_directory, pem_file)
        output_path = os.path.join(output_directory, pem_file.replace('.pem', '.txt'))
        subprocess.run(['openssl', 'x509', '-in', input_path, '-text', '-noout'], stdout=open(output_path, 'w'))