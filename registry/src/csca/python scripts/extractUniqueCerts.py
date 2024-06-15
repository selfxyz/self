import hashlib
import os
import shutil

def hash_file(filepath):
    """Generate a SHA-256 hash for the contents of a file."""
    hasher = hashlib.sha256()
    with open(filepath, 'rb') as f:
        buf = f.read()
        hasher.update(buf)
    return hasher.hexdigest()

def find_unique_files(folder1, folder2, output_folder):
    """Find unique files in two folders and copy them to a new folder."""
    # Ensure output folder exists
    os.makedirs(output_folder, exist_ok=True)

    # Store hashes to identify unique files
    seen_hashes = set()

    # Check all .txt files in both folders
    for folder in [folder1, folder2]:
        for filename in os.listdir(folder):
            if filename.endswith('.txt'):
                print(filename)
                filepath = os.path.join(folder, filename)
                file_hash = hash_file(filepath)
                # If hash is unique, copy file to output folder with hash as the filename
                if file_hash not in seen_hashes:
                    shutil.copy(filepath, os.path.join(output_folder, file_hash[:16] + '.txt'))
                    seen_hashes.add(file_hash)

# Usage
folder1 = 'plain_text'
folder2 = 'plain_text_master'
output_folder = 'plain_text_unique'
find_unique_files(folder1, folder2, output_folder)