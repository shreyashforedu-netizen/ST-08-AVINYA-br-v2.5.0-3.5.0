from sgp4.api import Satrec, jday
from datetime import datetime

def initialize_satellite(line1: str, line2: str) -> Satrec:
    """
    Initializes an SGP4 satellite object from TLE lines.
    """
    return Satrec.twoline2rv(line1, line2)

def propagate_satellite(satellite: Satrec, dt: datetime):
    """
    Propagates the satellite to the given datetime using SGP4.
    Returns (position, velocity) in TEME frame, or (None, None) on error.
    """
    jd, fr = jday(dt.year, dt.month, dt.day, dt.hour, dt.minute, dt.second + dt.microsecond / 1e6)
    
    e, r, v = satellite.sgp4(jd, fr)
    if e == 0:
        return r, v
    else:
        return None, None

def get_orbital_parameters(satellite: Satrec):
    """
    Calculates orbital period (minutes), perigee (km), and apogee (km).
    """
    earth_radius = 6378.135 # km
    try:
        no = satellite.no_kozai # rad/min
        period_min = (2 * 3.141592653589793) / no if no > 0 else 0
        
        e = satellite.ecco
        a_er = satellite.a
        a_km = a_er * earth_radius
        
        perigee_km = a_km * (1 - e) - earth_radius
        apogee_km = a_km * (1 + e) - earth_radius
        
        return period_min, perigee_km, apogee_km
    except Exception:
        return 0.0, 0.0, 0.0
