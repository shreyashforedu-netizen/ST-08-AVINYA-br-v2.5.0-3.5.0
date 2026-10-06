def parse_tle_data(raw_text: str) -> list:
    """
    Parses raw TLE text (3-line format) into a list of dictionaries.
    """
    lines = [line.strip() for line in raw_text.strip().splitlines() if line.strip()]
    satellites = []
    
    for i in range(0, len(lines) - 2, 3):
        name = lines[i]
        line1 = lines[i+1]
        line2 = lines[i+2]
        
        try:
            sat_id = line1[2:7].strip()
        except IndexError:
            continue
            
        satellites.append({
            "id": sat_id,
            "name": name,
            "line1": line1,
            "line2": line2
        })
        
    return satellites
