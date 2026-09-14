import pandas as pd
from typing import Optional


def normalize_district(district_str: Optional[str]) -> str:
    """
    Normalizes district names:
    - Trims whitespace
    - Removes redundant suffixes/prefixes like 'Distt', 'District', 'Dist'
    - Converts casing to standard Title Case (e.g., 'KARNAL' -> 'Karnal', 'karnal' -> 'Karnal')
    - Returns 'Unknown' for null/empty values
    """
    if district_str is None or pd.isna(district_str):
        return "Unknown"
    
    cleaned = str(district_str).strip()
    if not cleaned or cleaned.lower() in ["none", "nan", "null", "undefined", ""]:
        return "Unknown"

    # Remove common district suffixes
    lower_val = cleaned.lower()
    for suffix in [" district", " distt", " dist.", " dist"]:
        if lower_val.endswith(suffix):
            cleaned = cleaned[:-len(suffix)].strip()
            break

    # Remove common district prefixes
    lower_val = cleaned.lower()
    for prefix in ["district ", "distt ", "dist. ", "dist "]:
        if lower_val.startswith(prefix):
            cleaned = cleaned[len(prefix):].strip()
            break

    return cleaned.title()
