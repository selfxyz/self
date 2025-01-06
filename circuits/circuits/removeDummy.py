import os
import re

def process_line(line):
    # Handle "+ dummy * dummy" pattern at the end (only lowercase, standalone 'dummy')
    line = re.sub(r'\s*\+\s*\bdummy\b\s*\*\s*\bdummy\b', '', line)
    
    # Handle "dummy * dummy +" pattern at the start of expression (only lowercase, standalone 'dummy')
    line = re.sub(r'<==\s*\bdummy\b\s*\*\s*\bdummy\b\s*\+\s*', '<== ', line)
    
    # If line starts with uppercase or contains 'template'
    if line[0].isupper() or 'template' in line.lower():
        # Remove ', dummy' or 'dummy,' pattern (only lowercase, standalone 'dummy')
        line = re.sub(r',\s*\bdummy\b(?![A-Za-z])', '', line)
        line = re.sub(r'\bdummy\b(?![A-Za-z]),', '', line)
        # Remove standalone 'dummy' (only lowercase)
        line = re.sub(r'\bdummy\b(?![A-Za-z])', '', line)
        return line
    # Handle function calls with dummy parameter
    elif '(' in line and ')' in line:
        # Remove ', dummy' before closing parenthesis (only lowercase, standalone 'dummy')
        line = re.sub(r',\s*\bdummy\b(?![A-Za-z])\s*\)', ')', line)
        return line
    # For other lines, if they contain standalone 'dummy' (lowercase only), return None to remove the entire line
    elif re.search(r'\bdummy\b(?![A-Za-z])', line):
        return None
    return line

def remove_dummy_lines(directory):
    # Walk through all directories and files
    for root, dirs, files in os.walk(directory):
        # Filter for .circom files
        for file in files:
            if file.endswith('.circom'):
                file_path = os.path.join(root, file)
                print(f"Processing: {file_path}")
                
                # Read file content
                with open(file_path, 'r') as f:
                    lines = f.readlines()
                
                # Process lines
                new_lines = []
                lines_removed = 0
                for line in lines:
                    processed_line = process_line(line)
                    if processed_line is not None:
                        new_lines.append(processed_line)
                    else:
                        lines_removed += 1
                
                # If we found and modified/removed any lines
                if len(lines) != len(new_lines):
                    print(f"Modified/Removed {lines_removed} lines containing 'dummy' in {file_path}")
                    
                    # Write back the filtered content
                    with open(file_path, 'w') as f:
                        f.writelines(new_lines)

if __name__ == "__main__":
    # Get the current directory where the script is running
    current_dir = os.getcwd()
    
    # Ask for confirmation
    print(f"This will process 'dummy' occurrences in .circom files in {current_dir} and its subdirectories.")
    confirm = input("Do you want to continue? (y/n): ")
    
    if confirm.lower() == 'y':
        remove_dummy_lines(current_dir)
        print("Process completed!")
    else:
        print("Operation cancelled.")