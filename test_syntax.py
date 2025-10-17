#!/usr/bin/env python3
"""
Test script to verify syntax of all Python files in the project
"""

import ast
import os
from pathlib import Path

def check_syntax(file_path):
    """Check syntax of a Python file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            source = f.read()
        ast.parse(source)
        return True, None
    except SyntaxError as e:
        return False, str(e)
    except Exception as e:
        return False, str(e)

def main():
    """Check syntax of all Python files in the project"""
    project_root = Path(__file__).parent
    python_files = list(project_root.rglob("*.py"))
    
    print(f"Checking syntax of {len(python_files)} Python files...")
    
    errors = []
    for file_path in python_files:
        is_valid, error = check_syntax(file_path)
        if not is_valid:
            errors.append((file_path, error))
            print(f"[ERROR] {file_path}: {error}")
        else:
            print(f"[OK] {file_path}")
    
        print(f"\nSummary: {len(python_files) - len(errors)}/{len(python_files)} files have valid syntax")
    
    if errors:
        print(f"\nFiles with syntax errors: {len(errors)}")
        for file_path, error in errors:
            print(f"  - {file_path}: {error}")
        return 1
    else:
        print("\nAll Python files have valid syntax!")
        return 0

if __name__ == "__main__":
    exit(main())