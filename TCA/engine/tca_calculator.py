import sys
import os
import json
import math
from datetime import datetime, timezone, timedelta
import numpy as np

# --- CONSTANTS ---
RISK_THRESHOLD_HIGH = 1e-4
RISK_THRESHOLD_MEDIUM = 1e-6
HARDBODY_RADIUS_M = 10.0  # 10m radius assumption

# Base covariance in RTN frame at epoch (meters^2)
# Diagonal: [Radial, Transverse, Normal]
BASE_COV_RTN = np.diag([10.0**2, 50.0**2, 10.0**2]) 

# Covariance growth rate per day in RTN (meters/day)
GROWTH_RATE_RTN = np.array([5.0, 20.0, 5.0])

# Add orbital-engine to path to use existing propagation
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(project_root, "orbital-engine"))

from src.propagation.sgp4_engine import initialize_satellite, propagate_satellite, get_orbital_parameters
from sgp4.api import jday

def norm(v):
    return math.sqrt(v[0]**2 + v[1]**2 + v[2]**2)

def get_age_days(satrec, dt: datetime):
    jd, fr = jday(dt.year, dt.month, dt.day, dt.hour, dt.minute, dt.second + dt.microsecond / 1e6)
    epoch_jd = satrec.jdsatepoch + satrec.jdsatepochF
    return (jd + fr) - epoch_jd

def get_rtn_covariance(age_days):
    sigma_r = math.sqrt(BASE_COV_RTN[0,0]) + abs(age_days) * GROWTH_RATE_RTN[0]
    sigma_t = math.sqrt(BASE_COV_RTN[1,1]) + abs(age_days) * GROWTH_RATE_RTN[1]
    sigma_n = math.sqrt(BASE_COV_RTN[2,2]) + abs(age_days) * GROWTH_RATE_RTN[2]
    return np.diag([sigma_r**2, sigma_t**2, sigma_n**2])

def get_rtn_to_eci_matrix(r, v):
    r_vec = np.array(r)
    v_vec = np.array(v)
    
    r_hat = r_vec / np.linalg.norm(r_vec)
    h_vec = np.cross(r_vec, v_vec)
    h_hat = h_vec / np.linalg.norm(h_vec)
    t_hat = np.cross(h_hat, r_hat)
    
    return np.column_stack([r_hat, t_hat, h_hat])

def compute_tca_probability(rA, vA, rB, vB, covA_rtn, covB_rtn):
    r_rel = np.array(rA) - np.array(rB)
    v_rel = np.array(vA) - np.array(vB)
    
    T_A = get_rtn_to_eci_matrix(rA, vA)
    T_B = get_rtn_to_eci_matrix(rB, vB)
    
    covA_eci = T_A @ covA_rtn @ T_A.T
    covB_eci = T_B @ covB_rtn @ T_B.T
    
    cov_comb_eci = covA_eci + covB_eci
    
    v_rel_norm = np.linalg.norm(v_rel)
    if v_rel_norm < 1e-6:
        return 0.0, 0.0, 0.0
        
    y_hat = v_rel / v_rel_norm
    
    h_vec = np.cross(r_rel, v_rel)
    if np.linalg.norm(h_vec) < 1e-6:
        tmp = np.array([1.0, 0.0, 0.0])
        if abs(np.dot(y_hat, tmp)) > 0.9:
            tmp = np.array([0.0, 1.0, 0.0])
        z_hat = tmp - np.dot(tmp, y_hat) * y_hat
        z_hat = z_hat / np.linalg.norm(z_hat)
    else:
        z_hat = h_vec / np.linalg.norm(h_vec)
        
    x_hat = np.cross(y_hat, z_hat)
    
    P = np.vstack([x_hat, z_hat])
    cov_bplane = P @ cov_comb_eci @ P.T
    r_bplane = P @ r_rel
    
    det_C = np.linalg.det(cov_bplane)
    if det_C <= 1e-12:
        return 0.0, np.linalg.norm(r_rel), 0.0
        
    inv_C = np.linalg.inv(cov_bplane)
    exponent = -0.5 * (r_bplane.T @ inv_C @ r_bplane)
    
    if exponent < -700:
        pc = 0.0
    else:
        combined_radius_m = HARDBODY_RADIUS_M * 2.0
        area = np.pi * (combined_radius_m**2)
        pdf_val = (1.0 / (2.0 * np.pi * np.sqrt(det_C))) * np.exp(exponent)
        pc = pdf_val * area
        
    eigenvalues = np.linalg.eigvalsh(cov_bplane)
    sigma_in_plane_m = np.sqrt(max(0.0, max(eigenvalues)))
    
    return float(pc), float(np.linalg.norm(r_rel)), float(sigma_in_plane_m)

def calculate_tca():
    input_path = os.path.join(project_root, "orbital-engine", "output", "satellites.json")
    if not os.path.exists(input_path):
        print(f"Input file not found: {input_path}")
        return

    with open(input_path, 'r') as f:
        satellites_data = json.load(f)

    # Initialize all satellites
    sats = []
    for sat in satellites_data:
        try:
            satrec = initialize_satellite(sat["tle"][0], sat["tle"][1])
            sats.append({
                "id": sat["id"],
                "name": sat["name"],
                "satrec": satrec,
                "data": sat
            })
        except Exception as e:
            continue

    if len(sats) < 2:
        print("Not enough satellites to compute TCA.")
        return

    current_time = datetime.now(timezone.utc)
    # limit to 20 satellites for speed in this example
    sats = sats[:20] 

    events = []
    
    print(f"Calculating TCA for {len(sats)} satellites over 24 hours...")

    # For every pair, find minimum distance
    for i in range(len(sats)):
        for j in range(i + 1, len(sats)):
            satA = sats[i]
            satB = sats[j]
            
            min_dist = float('inf')
            tca_time = None
            tca_rA, tca_rB = None, None
            tca_vA, tca_vB = None, None
            
            # Coarse search: 5 minute steps for 24 hours
            step_min = 5
            for k in range(0, 24 * 60, step_min):
                t = current_time + timedelta(minutes=k)
                rA, vA = propagate_satellite(satA["satrec"], t)
                rB, vB = propagate_satellite(satB["satrec"], t)
                
                if rA and rB:
                    dist = math.sqrt((rA[0]-rB[0])**2 + (rA[1]-rB[1])**2 + (rA[2]-rB[2])**2)
                    if dist < min_dist:
                        min_dist = dist
                        tca_time = t

            # If coarse distance < 2000 km, refine search to 10 seconds
            if tca_time and min_dist < 2000:
                refined_min_dist = float('inf')
                refined_tca = None
                r_rA, r_rB = None, None
                r_vA, r_vB = None, None
                
                for k in range(-step_min * 60, step_min * 60, 10):
                    t = tca_time + timedelta(seconds=k)
                    rA, vA = propagate_satellite(satA["satrec"], t)
                    rB, vB = propagate_satellite(satB["satrec"], t)
                    
                    if rA and rB:
                        dist = math.sqrt((rA[0]-rB[0])**2 + (rA[1]-rB[1])**2 + (rA[2]-rB[2])**2)
                        if dist < refined_min_dist:
                            refined_min_dist = dist
                            refined_tca = t
                            r_rA, r_rB = rA, rB
                            r_vA, r_vB = vA, vB
                
                if refined_tca and refined_min_dist <= 150:
                    # Found a close approach <= 150 km
                    # Calculate required parameters for simulation
                    velA = norm(r_vA)
                    velB = norm(r_vB)
                    
                    # Relative velocity
                    rel_vx = r_vA[0] - r_vB[0]
                    rel_vy = r_vA[1] - r_vB[1]
                    rel_vz = r_vA[2] - r_vB[2]
                    rel_vel = norm([rel_vx, rel_vy, rel_vz])
                    
                    if rel_vel < 0.001:
                        continue # Skip identical orbits/satellites
                    
                    # Inclination from satrec
                    incA = math.degrees(satA["satrec"].inclo)
                    incB = math.degrees(satB["satrec"].inclo)
                    
                    # Determine retrograde visually (opposite direction)
                    # We can use the dot product of velocities
                    dot_v = (r_vA[0]*r_vB[0] + r_vA[1]*r_vB[1] + r_vA[2]*r_vB[2]) / (velA * velB)
                    retroB = bool(dot_v < 0)
                    
                    _, perA, _ = get_orbital_parameters(satA["satrec"])
                    _, perB, _ = get_orbital_parameters(satB["satrec"])
                    
                    # format time to match simulation: YYYY-MM-DD HH:MM:SS
                    tca_str = refined_tca.strftime("%Y-%m-%d %H:%M:%S")
                    
                    # Calculate real Pc and uncertainties
                    ageA_days = get_age_days(satA["satrec"], refined_tca)
                    ageB_days = get_age_days(satB["satrec"], refined_tca)
                    
                    covA_rtn = get_rtn_covariance(ageA_days)
                    covB_rtn = get_rtn_covariance(ageB_days)
                    
                    # Compute probabilities using 2D numerical integration approximation
                    # Both states must be in meters for accurate covariance projection
                    pc, miss_m, sigma_in_plane_m = compute_tca_probability(
                        np.array(r_rA) * 1000.0, np.array(r_vA) * 1000.0, 
                        np.array(r_rB) * 1000.0, np.array(r_vB) * 1000.0, 
                        covA_rtn, covB_rtn
                    )
                    
                    miss_km = miss_m / 1000.0
                    sigma_in_plane_km = sigma_in_plane_m / 1000.0
                    
                    # Determine risk tier based on Pc
                    if pc >= RISK_THRESHOLD_HIGH:
                        risk = "high"
                    elif pc >= RISK_THRESHOLD_MEDIUM:
                        risk = "watch"
                    else:
                        risk = "low"
                        
                    # Generate reasoning string
                    if pc < 1e-9:
                        odds = "negligible"
                        reason = f"Despite a {miss_km:.1f} km miss distance, ~{sigma_in_plane_km:.1f} km in-plane uncertainty gives a negligible collision probability."
                    else:
                        odds_val = int(round(1.0 / pc))
                        reason = f"Despite a {miss_km:.1f} km miss distance, ~{sigma_in_plane_km:.1f} km in-plane uncertainty gives a 1-in-{odds_val:,} collision probability."
                        
                    assumptions = f"Spherical {HARDBODY_RADIUS_M:.1f}m hardbody radius, diagonal RTN covariance growth"

                    events.append({
                        "a": satA["name"],
                        "b": satB["name"],
                        "typeA": "Object",
                        "typeB": "Object",
                        "altA": perA,
                        "altB": perB,
                        "velA": velA,
                        "velB": velB,
                        "vel": rel_vel,
                        "incA": incA,
                        "incB": incB,
                        "retroB": retroB,
                        "miss": miss_m,
                        "miss_km": miss_km,
                        "sigma_in_plane_km": sigma_in_plane_km,
                        "pc": pc,
                        "assumptions": assumptions,
                        "reason": reason,
                        "tca": tca_str,
                        "when": "in " + str(int((refined_tca - current_time).total_seconds() / 3600)) + " h",
                        "risk": risk,
                        "geometry": "Close approach"
                    })

    # Sort by Probability of Collision (Pc), highest first
    events = sorted(events, key=lambda x: x["pc"], reverse=True)
    
    output_path = os.path.join(project_root, "src", "data", "tca_events.json")
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    with open(output_path, 'w') as f:
        json.dump(events, f, indent=2)
        
    print(f"Generated {len(events)} TCA events. Saved to {output_path}")

if __name__ == "__main__":
    calculate_tca()
