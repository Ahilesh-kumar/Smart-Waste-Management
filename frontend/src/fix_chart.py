
import os

file_path = 'ChartEnhancements.jsx'
snippet_path = 'radar_snippet.jsx'

# Read clean lines
try:
    with open(file_path, 'rb') as f:
        # Read strictly bytes to avoid encoding errors initially
        content = f.read()
        
    # converting to string with ignore to skip garbage
    content_str = content.decode('utf-8', errors='ignore')
    
    # Split lines
    lines = content_str.splitlines()
    
    # Truncate at line 532 (keep 0-531)
    # Line 532 is "export const HistorySlider = TimelineScrubber;" which is usually line 531 index.
    # Let's find "HistorySlider = TimelineScrubber;" and cut after it.
    
    cut_index = -1
    for i, line in enumerate(lines):
        if "export const HistorySlider = TimelineScrubber;" in line:
            cut_index = i
            break
            
    if cut_index != -1:
        clean_lines = lines[:cut_index+1]
    else:
        # If not found, fallback to hardcoded line number or just error safely
        clean_lines = lines[:532]
        
    clean_content = '\n'.join(clean_lines) + '\n'
    
    # Read snippet
    with open(snippet_path, 'r', encoding='utf-8') as f:
        snippet = f.read()
        
    # Write back
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(clean_content + snippet)
        
    print("File fixed successfully.")
    
except Exception as e:
    print(f"Error: {e}")
