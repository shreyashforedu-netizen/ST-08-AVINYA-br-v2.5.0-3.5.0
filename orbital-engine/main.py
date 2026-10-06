import sys
import os
import argparse
from datetime import datetime, timezone

# Add orbital-engine root to path so modules can be imported
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from src.tle.fetch_tle import fetch_tle_data
from src.tle.parse_tle import parse_tle_data
from src.propagation.sgp4_engine import initialize_satellite, propagate_satellite, get_orbital_parameters
from src.propagation.orbit_generator import generate_orbit
from src.coordinates.geodetic import teme_to_geodetic
from src.output.json_writer import write_json_output

def main():
    parser = argparse.ArgumentParser(description="Run the SPACE ATC Orbital Engine")
    parser.add_argument("--group", type=str, default="ACTIVE", help="CelesTrak group to fetch (e.g. STATIONS, ACTIVE, WEATHER, STARLINK)")
    parser.add_argument("--limit", type=int, default=40, help="Maximum number of satellites to process")
    args = parser.parse_args()

    print(f"Starting orbital engine (Group: {args.group}, Limit: {args.limit})...", flush=True)
    
    raw_tle = fetch_tle_data(group=args.group)
    if not raw_tle:
        print("Failed to fetch TLE data. Exiting.", flush=True)
        return
        
    satellites_data = parse_tle_data(raw_tle)
    
    if args.limit > 0:
        satellites_data = satellites_data[:args.limit]
        
    print(f"Processing {len(satellites_data)} TLEs...", flush=True)
    
    current_time = datetime.now(timezone.utc)
    
    processed_sats = []
    failed_sats = 0
    
    for idx, sat_data in enumerate(satellites_data):
        try:
            print(f"[{idx+1}/{len(satellites_data)}] Generating SGP4 orbit for {sat_data['name']} (NORAD {sat_data['id']})...", flush=True)
            satrec = initialize_satellite(sat_data["line1"], sat_data["line2"])
            
            # Current position
            r, v = propagate_satellite(satrec, current_time)
            if r is None or v is None:
                raise ValueError("SGP4 propagation failed for current time.")
                
            lat, lon, alt = teme_to_geodetic(r, v, current_time)
            
            # Orbital parameters
            period_min, perigee_km, apogee_km = get_orbital_parameters(satrec)
            if period_min <= 0:
                raise ValueError("Invalid orbital period.")
                
            # Orbit generation
            orbit_points = generate_orbit(satrec, current_time, period_min)
            
            processed_sats.append({
                "id": sat_data["id"],
                "name": sat_data["name"],
                "tle": [sat_data["line1"], sat_data["line2"]],
                "current": [lat, lon, alt],
                "orbit": {
                    "period_min": round(period_min, 2),
                    "perigee_km": round(perigee_km, 2),
                    "apogee_km": round(apogee_km, 2),
                    "points": orbit_points
                }
            })
        except Exception as e:
            print(f"[{idx+1}/{len(satellites_data)}] Failed to process satellite {sat_data['name']}: {e}", flush=True)
            failed_sats += 1
            
    output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "output", "satellites.json")
    write_json_output(processed_sats, output_path)
    
    print("\n--- Summary ---")
    print(f"TLEs received: {len(satellites_data)}")
    print(f"Satellites successfully processed: {len(processed_sats)}")
    print(f"Satellites failed: {failed_sats}")
    print(f"Output path: {output_path}")
    
    if processed_sats:
        print("\nSample Satellite Output:")
        import json
        print(json.dumps(processed_sats[0], indent=2))

if __name__ == "__main__":
    main()
