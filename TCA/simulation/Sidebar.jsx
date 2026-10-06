import { EVENTS, RISK, fmtDist } from './constants';

export default function Sidebar({ cur, select }) {
  return (
    <aside className="cw-side">
      <div className="cw-side-heading">
        <h2>Close approaches</h2>
        <span>{EVENTS.length} EVENTS</span>
      </div>
      {EVENTS.map((e, i) => (
        <button
          key={`${e.a}-${e.b}-${i}`}
          type="button"
          className="cw-ev"
          aria-pressed={i === cur}
          onClick={() => select(i)}
        >
          <div className="cw-pair">
            {e.a} <i>and</i> {e.b}
            {e.retroB && <span className="cw-retro" style={{ marginLeft: 6 }}>↺</span>}
          </div>
          <div className="cw-meta cw-meta-risk">
            <span className="cw-miss-distance">
              <span
                className="cw-dot"
                style={{
                  background: RISK[e.risk].color,
                  boxShadow: `0 0 10px ${RISK[e.risk].color}99`
                }}
              />
              <span style={{ color: RISK[e.risk].color, fontWeight: 600 }}>
                {fmtDist(e.miss)}
              </span><span className="cw-miss-label">miss distance</span>
            </span>
            <span className="cw-risk-pill" style={{ '--risk-color': RISK[e.risk].color }}>
              {RISK[e.risk].label}
            </span>
          </div>
          <div className="cw-meta cw-meta-detail">
            <span>{e.when}</span>
            <span>{e.geometry}</span>
          </div>
        </button>
      ))}
    </aside>
  );
}

