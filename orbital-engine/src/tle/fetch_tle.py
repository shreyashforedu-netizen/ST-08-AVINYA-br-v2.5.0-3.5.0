import requests

def fetch_tle_data(group="ACTIVE") -> str:
    """
    Fetches TLE data from CelesTrak for the specified group.
    Returns the raw text data.
    """
    url = f"https://celestrak.org/NORAD/elements/gp.php?GROUP={group}&FORMAT=TLE"
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        return response.text
    except requests.RequestException as e:
        print(f"Error fetching TLE data for group {group}: {e}")
        return ""
