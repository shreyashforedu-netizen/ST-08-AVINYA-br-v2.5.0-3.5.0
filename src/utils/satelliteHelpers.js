export function calculatePosition(inc, raan, theta) {
  const iRad = (inc * Math.PI) / 180;
  const rRad = (raan * Math.PI) / 180;
  const tRad = (theta * Math.PI) / 180;

  const x = Math.cos(tRad) * Math.cos(rRad) - Math.sin(tRad) * Math.cos(iRad) * Math.sin(rRad);
  const y = Math.cos(tRad) * Math.sin(rRad) + Math.sin(tRad) * Math.cos(iRad) * Math.cos(rRad);
  const z = Math.sin(tRad) * Math.sin(iRad);

  const lat = Math.asin(z) * (180 / Math.PI);
  const lng = Math.atan2(y, x) * (180 / Math.PI);
  
  return { lat, lng };
}
