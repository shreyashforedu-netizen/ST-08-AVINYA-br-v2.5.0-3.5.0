from datetime import datetime, timedelta
from src.propagation.sgp4_engine import propagate_satellite
from src.coordinates.geodetic import teme_to_geodetic

def generate_orbit(satellite, current_time: datetime, period_min: float) -> list:
    """
    Generates orbit samples for approximately one orbital period around current_time.
    Returns a list of [lat, lon, alt].
    """
    ORBIT_SAMPLES = 36
    points = []
    
    if period_min <= 0:
        return points
        
    start_time = current_time - timedelta(minutes=period_min / 2)
    time_step = timedelta(minutes=period_min / (ORBIT_SAMPLES - 1)) if ORBIT_SAMPLES > 1 else timedelta(minutes=period_min)
    
    for i in range(ORBIT_SAMPLES):
        sample_time = start_time + i * time_step
        r, v = propagate_satellite(satellite, sample_time)
        if r is not None and v is not None:
            # We use current_time for the geodetic transformation so the entire orbit 
            # is drawn in the Earth-fixed frame of the *current instant*.
            # This makes the orbit a clean closed ring instead of a spirograph.
            lat, lon, alt = teme_to_geodetic(r, v, current_time)
            points.append([lat, lon, alt])
            
    return points
