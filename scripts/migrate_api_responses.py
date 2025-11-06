#!/usr/bin/env python3
"""
Script to migrate all API endpoints to use standardized responses
"""

import re
import os
from pathlib import Path

def update_endpoint_function(file_path: str, function_name: str, endpoint_pattern: str):
    """
    Update a specific endpoint function to use standardized responses
    """
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Pattern to match the function definition and its body
    pattern = rf'(@app\.{endpoint_pattern}\s*\nasync def {function_name}\([^)]*\):\s*"""[^"]*"""\s*)(.*?)(?=\n@app\.|\n\n# |\nclass |\ndef |$)'
    
    def replace_function(match):
        decorator_and_signature = match.group(1)
        function_body = match.group(2)
        
        # Check if already using standardized response
        if 'api_response_wrapper' in function_body:
            return match.group(0)
        
        # Extract the main logic
        lines = function_body.split('\n')
        main_logic_lines = []
        return_statements = []
        error_handling = []
        
        for line in lines:
            stripped = line.strip()
            if stripped.startswith('return '):
                return_statements.append(line)
            elif stripped.startswith('except ') or 'raise Exception' in line:
                error_handling.append(line)
            elif stripped and not stripped.startswith('#'):
                main_logic_lines.append(line)
        
        # Create helper function name
        helper_name = f"_{function_name}_data"
        
        # Build the new function structure
        new_function = f"""{decorator_and_signature}return api_response_wrapper({helper_name})()

def {helper_name}({function_name.split('(')[1].split(')')[0] if '(' in function_name else ''}):
    \"\"\"Helper function to get {function_name.replace('_', ' ')} data\"\"\"
{chr(10).join(main_logic_lines)}"""
        
        return new_function
    
    # Apply the replacement
    new_content = re.sub(pattern, replace_function, content, flags=re.DOTALL)
    
    # Write back to file
    with open(file_path, 'w') as f:
        f.write(new_content)
    
    print(f"Updated {function_name}")

def main():
    """Main migration function"""
    backend_file = Path(__file__).parent / "web-ui" / "backend" / "main.py"
    
    # List of endpoints to update
    endpoints_to_update = [
        ("get_profile", r'get\("/api/profiles/\{profile_name\}"'),
        ("get_profile_angles", r'get\("/api/profiles/\{profile_name\}/angles"'),
        ("get_profile_angle_emotions", r'get\("/api/profiles/\{profile_name\}/angles/\{angle_name\}/emotions"'),
        ("get_visemes", r'get\("/api/profiles/\{profile_name\}/angles/\{angle_name\}/emotions/\{emotion_name\}/visemes"'),
        ("upload_viseme", r'post\("/api/profiles/\{profile_name\}/angles/\{angle_name\}/emotions/\{emotion_name\}/visemes/\{viseme_name\}"'),
        ("delete_viseme", r'delete\("/api/profiles/\{profile_name\}/angles/\{angle_name\}/emotions/\{emotion_name\}/visemes/\{viseme_name\}"'),
        ("get_viseme_image", r'get\("/api/profiles/\{profile_name\}/angles/\{angle_name\}/emotions/\{emotion_name\}/visemes/\{viseme_name\}/image"'),
        ("get_profile_structure", r'get\("/api/profiles/\{profile_name\}/structure"'),
        ("repair_profile_structure", r'post\("/api/profiles/\{profile_name\}/repair"'),
        ("create_angle", r'post\("/api/profiles/\{profile_name\}/angles/\{angle_name\}"'),
        ("create_emotion", r'post\("/api/profiles/\{profile_name\}/angles/\{angle_name\}/emotions/\{emotion_name\}"'),
        ("copy_emotion", r'post\("/api/profiles/\{profile_name\}/copy-emotion"'),
        ("update_profile", r'put\("/api/profiles/\{profile_name\}"'),
        ("get_settings", r'get\("/api/settings"'),
        ("update_settings", r'put\("/api/settings"'),
        ("get_cinematography_config", r'get\("/api/cinematography/config"'),
        ("update_cinematography_config", r'put\("/api/cinematography/config"'),
        ("get_cinematography_rules", r'get\("/api/cinematography/rules"'),
        ("create_cinematography_override", r'post\("/api/cinematography/overrides"'),
        ("get_cinematography_overrides", r'get\("/api/cinematography/overrides"'),
        ("delete_cinematography_override", r'delete\("/api/cinematography/overrides/\{override_id\}"'),
        ("analyze_emotion_audio", r'get\("/api/emotions/analyze/\{audio_id\}"'),
        ("get_emotion_segments", r'get\("/api/emotions/segments/\{job_id\}"'),
        ("manual_emotion_adjustment", r'post\("/api/emotions/manual-adjustment"'),
        ("get_job_shot_sequence", r'get\("/api/jobs/\{job_id\}/shot-sequence"'),
        ("get_job_emotion_analysis", r'get\("/api/jobs/\{job_id\}/emotion-analysis"'),
        ("start_batch_processing", r'post\("/api/batch/process"'),
        ("get_batch_status", r'get\("/api/batch/\{batch_id\}"'),
        ("upload_file", r'post\("/upload"'),
    ]
    
    print("Starting endpoint migration...")
    
    for function_name, endpoint_pattern in endpoints_to_update:
        try:
            update_endpoint_function(str(backend_file), function_name, endpoint_pattern)
        except Exception as e:
            print(f"Failed to update {function_name}: {e}")
    
    print("Migration completed!")

if __name__ == "__main__":
    main()