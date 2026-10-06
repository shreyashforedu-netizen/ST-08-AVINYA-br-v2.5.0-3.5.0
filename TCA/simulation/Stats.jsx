import { RISK, fmtDist, mmss } from './constants';

export default function Stats({ ev, t, sec, range }) {
  const risk = RISK[ev.risk];

  return (
    <>
      <div className="cw-objs">
        <div className="cw-a">
          <b>SAT A&nbsp; {ev.a}</b>
          <small>{ev.typeA}, {ev.altA} km alt, {ev.incA.toFixed(1)}° inc, {ev.velA.toFixed(2)} km/s</small>
        </div>
        <div className="cw-b">
          <b>SAT B&nbsp; {ev.b}</b>
          <small>
            {ev.typeB}, {ev.altB} km alt, {ev.incB.toFixed(1)}° inc, {ev.velB.toFixed(2)} km/s
            {ev.retroB && <span className="cw-retro">↺ RETROGRADE</span>}
          </small>
        </div>
      </div>
      <dl className="cw-stats">
        <div><dt>Encounter geometry</dt><dd className="cw-small">{ev.geometry}</dd></div>
        <div><dt>Miss distance</dt><dd>{fmtDist(ev.miss)}</dd></div>
        <div><dt>Time to closest approach</dt><dd>{t < 0 ? mmss(sec) : "Passed"}</dd></div>
        <div><dt>Closest approach (UTC)</dt><dd className="cw-small">{ev.tca}</dd></div>
        <div>
          <dt>Current range</dt>
          <dd>{range < 1 ? Math.round(range * 1000) + " m" : range.toFixed(range < 100 ? 1 : 0) + " km"}</dd>
        </div>
        <div><dt>Relative closing speed</dt><dd>{ev.vel.toFixed(1)} km/s</dd></div>
        <div><dt>SAT A velocity</dt><dd>{ev.velA.toFixed(2)} km/s</dd></div>
        <div><dt>SAT B velocity</dt><dd>{ev.velB.toFixed(2)} km/s{ev.retroB ? " (↺ retro)" : ""}</dd></div>
        <div><dt>Altitude separation</dt><dd>{ev.altB - ev.altA} km</dd></div>
        <div><dt>In-plane uncertainty (1σ)</dt><dd>{ev.sigma_in_plane_km ? ev.sigma_in_plane_km.toFixed(1) + ' km' : 'Unknown'}</dd></div>
        <div>
          <dt>Collision probability</dt>
          <dd>{ev.pc !== undefined ? (
            <>
              {Number(ev.pc).toExponential(1).split("e")[0]} × 10<sup>{Number(ev.pc).toExponential(1).split("e")[1].replace("-", "−")}</sup>
            </>
          ) : 'Unknown'}</dd>
        </div>
        <div>
          <dt>Assessment</dt>
          <dd className="cw-small">
            <span className="cw-dot" style={{ background: risk.color }} />{risk.label}
          </dd>
        </div>
      </dl>
    </>
  );
}

