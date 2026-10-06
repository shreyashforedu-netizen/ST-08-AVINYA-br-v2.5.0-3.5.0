import json
import os

def write_json_output(data: list, filepath: str):
    """
    Writes the satellite data to a compact JSON file.
    """
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2)
