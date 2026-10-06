from astropy import units as u
from astropy.time import Time
from astropy.coordinates import TEME, ITRS
import warnings
from astropy.utils.exceptions import AstropyWarning

# Suppress Astropy IERS warnings since we don't need sub-millisecond precision
warnings.simplefilter('ignore', AstropyWarning)

def teme_to_geodetic(r_teme: tuple, v_teme: tuple, dt) -> tuple:
    """
    Converts TEME position/velocity to Geodetic coordinates using astropy.
    Returns (latitude_deg, longitude_deg, altitude_km).
    """
    obs_time = Time(dt, scale='utc')
    
    teme_coord = TEME(x=r_teme[0]*u.km, 
                      y=r_teme[1]*u.km, 
                      z=r_teme[2]*u.km, 
                      v_x=v_teme[0]*u.km/u.s,
                      v_y=v_teme[1]*u.km/u.s,
                      v_z=v_teme[2]*u.km/u.s,
                      obstime=obs_time)
    
    itrs_coord = teme_coord.transform_to(ITRS(obstime=obs_time))
    loc = itrs_coord.earth_location
    
    lat = loc.lat.deg
    lon = loc.lon.deg
    alt = loc.height.to(u.km).value
    
    return round(lat, 4), round(lon, 4), round(alt, 2)
