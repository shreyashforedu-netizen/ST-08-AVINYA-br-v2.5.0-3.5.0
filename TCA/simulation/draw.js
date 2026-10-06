import { MONO, norm, fmtDist, posV } from './constants';

export function draw(ctx, W, H, dpr, view, scene, ev) {
  const { yaw, pitch, t, zoom } = view;
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);

  const project = (p) => {
    const x1 = p[0] * cy + p[2] * sy;
    const z1 = -p[0] * sy + p[2] * cy;
    return { x: x1, y: -(p[1] * cp - z1 * sp), z: p[1] * sp + z1 * cp };
  };
  const s = Math.min(W / 600, H / 340) * zoom;
  const toScreen = (p) => {
    const q = project(p);
    return { x: W / 2 + q.x * s, y: H / 2 + 14 + q.y * s, z: q.z };
  };

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = "#08151d";
  ctx.fillRect(0, 0, W, H);

  // grid floor
  const step = 55, ext = 440, seg = 28, gy = -50;
  ctx.lineWidth = 1;
  for (let k = -ext; k <= ext; k += step) {
    for (let dir = 0; dir < 2; dir++) {
      for (let j = 0; j < seg; j++) {
        const u0 = -ext + (2 * ext * j) / seg, u1 = -ext + (2 * ext * (j + 1)) / seg;
        const p0 = dir ? [k, gy, u0] : [u0, gy, k];
        const p1 = dir ? [k, gy, u1] : [u1, gy, k];
        const mid = Math.hypot(dir ? k : (u0 + u1) / 2, dir ? (u0 + u1) / 2 : k);
        const al = 0.2 * Math.pow(Math.max(0, 1 - mid / (ext * 1.25)), 1.3);
        if (al < 0.01) continue;
        const a = toScreen(p0), b = toScreen(p1);
        ctx.strokeStyle = `rgba(130,165,185,${al.toFixed(3)})`;
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
    }
  }
  ctx.strokeStyle = "rgba(130,165,185,0.14)";
  ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke();

  // Aerodynamic guidance chevron arrow
  const arrow = (x, y, ang, scale = 1.0) => {
    ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
    ctx.beginPath(); 
    ctx.moveTo(8 * scale, 0); 
    ctx.lineTo(-12 * scale, -6 * scale); 
    ctx.lineTo(-7 * scale, 0); 
    ctx.lineTo(-12 * scale, 6 * scale); 
    ctx.closePath(); 
    ctx.fill();
    ctx.restore();
  };

  const TRACK_EXT = 4.8; // Extended orbital rail span for longer trajectory rails

  // drawTrack now accepts per-satellite speed `spd` and a retroB flag
  const drawTrack = (c, d, color, labelled, spd, retroB) => {
    const a = toScreen(posV(c, d, spd, -TRACK_EXT)), b = toScreen(posV(c, d, spd, TRACK_EXT));
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    const px = -Math.sin(ang), py = Math.cos(ang);
    ctx.save();
    ctx.strokeStyle = color; ctx.fillStyle = color;
    ctx.shadowColor = color; ctx.shadowBlur = 8; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.shadowBlur = 0; ctx.lineWidth = 1.2;
    for (let k = -4.5; k <= 4.5001; k += 0.25) {
      const whole = Math.abs(k - Math.round(k)) < 0.001;
      const p = toScreen(posV(c, d, spd, k)), L = whole ? 7 : 4;
      ctx.beginPath(); ctx.moveTo(p.x - px * L, p.y - py * L); ctx.lineTo(p.x + px * L, p.y + py * L); ctx.stroke();
      if (labelled && whole && k !== 0) {
        ctx.globalAlpha = 0.9; ctx.font = `14px ${MONO}`; ctx.textAlign = "left";
        ctx.fillText((k > 0 ? "+" : "-") + Math.abs(k) + " min", p.x + 10, p.y + 22);
        ctx.globalAlpha = 1;
      }
    }
    // Terminal direction arrow at the tip of the extended rail
    arrow(b.x, b.y, ang, 1.35);

    // Intermediate guidance arrows along the rail
    const m1 = toScreen(posV(c, d, spd, -2.2));
    arrow(m1.x, m1.y, ang, 0.9);
    const m2 = toScreen(posV(c, d, spd, 2.2));
    arrow(m2.x, m2.y, ang, 0.9);

    if (retroB) {
      // Reversed arrow near the tail to visually signal opposite motion
      ctx.globalAlpha = 0.65;
      const tail = toScreen(posV(c, d, spd, TRACK_EXT * 0.75));
      arrow(tail.x, tail.y, ang + Math.PI, 1.15); // flipped
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  };

  // drawing the bounding volume
  const drawVolume = (center, dir, aSemi, rgb) => {
    const bSemi = aSemi * 0.2 + 3;
    const c = toScreen(center), q = project(dir);
    const p = Math.hypot(q.x, q.y);
    const major = s * Math.sqrt(bSemi * bSemi + (aSemi * aSemi - bSemi * bSemi) * p * p);
    const minor = s * bSemi, ang = Math.atan2(q.y, q.x);

    ctx.save();
    ctx.strokeStyle = `rgba(${rgb},0.7)`; 
    ctx.fillStyle = `rgba(${rgb},0.08)`;
    ctx.lineWidth = 1.0;
    ctx.setLineDash([4, 4]); // Dotted pattern

    if (view.shapeMode === "cuboid") {
      // Draw a 3D wireframe cuboid
      const f = dir;
      let u = norm([0, 1, 0]);
      if (Math.abs(f[1]) > 0.9) u = norm([1, 0, 0]);
      let r = norm([f[1]*u[2]-f[2]*u[1], f[2]*u[0]-f[0]*u[2], f[0]*u[1]-f[1]*u[0]]);
      u = norm([r[1]*f[2]-r[2]*f[1], r[2]*f[0]-r[0]*f[2], r[0]*f[1]-r[1]*f[0]]);
      
      const hs = [aSemi * 0.6, bSemi * 1.5, bSemi * 1.5]; // approximate bounding box size
      const ax = [f, u, r];
      const pts = [];
      for(let i=0; i<8; i++) {
        const sx = (i&1)?1:-1, sy = (i&2)?1:-1, sz = (i&4)?1:-1;
        pts.push(toScreen([
           center[0] + ax[0][0]*sx*hs[0] + ax[1][0]*sy*hs[1] + ax[2][0]*sz*hs[2],
           center[1] + ax[0][1]*sx*hs[0] + ax[1][1]*sy*hs[1] + ax[2][1]*sz*hs[2],
           center[2] + ax[0][2]*sx*hs[0] + ax[1][2]*sy*hs[1] + ax[2][2]*sz*hs[2]
        ]));
      }
      ctx.beginPath();
      const edges = [[0,1], [0,2], [0,4], [1,3], [1,5], [2,3], [2,6], [3,7], [4,5], [4,6], [5,7], [6,7]];
      edges.forEach(e => {
         ctx.moveTo(pts[e[0]].x, pts[e[0]].y);
         ctx.lineTo(pts[e[1]].x, pts[e[1]].y);
      });
      ctx.stroke();
      
      // Draw a cross mesh on the faces
      ctx.beginPath();
      ctx.setLineDash([2, 6]);
      const faces = [[0,1,3,2], [4,5,7,6], [0,1,5,4], [2,3,7,6], [0,2,6,4], [1,3,7,5]];
      faces.forEach(f => {
         ctx.moveTo((pts[f[0]].x + pts[f[1]].x)/2, (pts[f[0]].y + pts[f[1]].y)/2);
         ctx.lineTo((pts[f[2]].x + pts[f[3]].x)/2, (pts[f[2]].y + pts[f[3]].y)/2);
         ctx.moveTo((pts[f[0]].x + pts[f[2]].x)/2, (pts[f[0]].y + pts[f[2]].y)/2);
         ctx.lineTo((pts[f[1]].x + pts[f[3]].x)/2, (pts[f[1]].y + pts[f[3]].y)/2);
      });
      ctx.stroke();

    } else {
      // Draw a dotted mesh ellipsoid
      ctx.translate(c.x, c.y); ctx.rotate(ang);
      ctx.beginPath(); 
      ctx.ellipse(0, 0, major, minor, 0, 0, Math.PI * 2); 
      ctx.fill(); ctx.stroke();
      
      // Draw inner mesh rings
      ctx.beginPath();
      for (let i = 1; i <= 3; i++) {
        ctx.ellipse(0, 0, major * (i / 4), minor, 0, 0, Math.PI * 2);
        ctx.ellipse(0, 0, major, minor * (i / 4), 0, 0, Math.PI * 2);
      }
      ctx.stroke();
    }

    ctx.restore();
    return { c, major, minor, ang };
  };

  // ---- 3D satellites -------------------------------------------------------
  // Each satellite is a small model built from (optionally tilted) boxes,
  // projected with the scene camera, back-face culled, depth sorted and lit.
  const LIGHT = norm([-0.35, 0.85, 0.4]);
  const SAT_SCALE = 1.25;  // overall size of the models in scene units
  const WING_TILT = 0.2;   // wings lean slightly, like sun-tracking arrays

  // part: c = centre [forward, up, side], h = half extents, tilt = rotation about the side axis
  const satParts = (variant) => {
    const P = [];
    const wings = (fn) => [1, -1].forEach(fn);
    if (variant === 0) {
      // SAT A: compact bus, 3-section wings, steerable dish
      P.push({ c: [0, 0, 0], h: [4.8, 3.2, 3.2], kind: "body" });
      P.push({ c: [0, 3.32, 0], h: [3.2, 0.12, 2.2], kind: "radiator" });
      P.push({ c: [5.6, 0, 0], h: [0.9, 1.7, 1.7], kind: "dark" });   // sensor aperture
      P.push({ c: [-5.6, 0, 0], h: [0.8, 1.2, 1.2], kind: "dark" });  // thruster
      wings((sg) => {
        P.push({ c: [0, 0, sg * 4.2], h: [0.35, 0.35, 1.0], kind: "boom" });
        for (let n = 0; n < 3; n++) {
          P.push({ c: [0, 0, sg * (8.1 + n * 5.8)], h: [3.6, 0.2, 2.7], kind: "panel", tilt: WING_TILT });
        }
      });
      P.push({ c: [-2.4, 5, 0], h: [0.3, 1.8, 0.3], kind: "boom" });  // dish mast
      P.push({ c: [-2.4, 7.1, 0], h: [2.2, 0.2, 2.2], kind: "dish", tilt: -0.55 });
    } else {
      // SAT B: larger bus, 2-section wide wings, rear boom antenna, star trackers
      P.push({ c: [0, 0, 0], h: [5.6, 3.8, 3.8], kind: "body" });
      P.push({ c: [0, 3.92, 0], h: [3.8, 0.12, 2.8], kind: "radiator" });
      P.push({ c: [6.7, 0, 0], h: [1.1, 2.0, 2.0], kind: "dark" });   // sensor aperture
      P.push({ c: [-6.5, 0, 0], h: [0.9, 1.5, 1.5], kind: "dark" });  // thruster
      P.push({ c: [2.2, 4.4, 1.6], h: [0.6, 0.5, 0.6], kind: "dark" });   // star tracker
      P.push({ c: [2.2, 4.4, -1.6], h: [0.6, 0.5, 0.6], kind: "dark" });  // star tracker
      wings((sg) => {
        P.push({ c: [0, 0, sg * 4.8], h: [0.4, 0.4, 1.0], kind: "boom" });
        for (let n = 0; n < 2; n++) {
          P.push({ c: [0, 0, sg * (9.3 + n * 7.5)], h: [4.6, 0.22, 3.5], kind: "panel", tilt: WING_TILT });
        }
      });
      P.push({ c: [-11, 1.6, 0], h: [4.6, 0.25, 0.25], kind: "boom" });   // rear boom
      P.push({ c: [-15.9, 1.6, 0], h: [1.1, 1.1, 1.1], kind: "dish" });   // boom tip
    }
    return P;
  };

  const mixc = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

  const drawSat3D = (center, dir, rgb, variant) => {
    const SC = SAT_SCALE;
    const f = dir;
    let base_u = norm([0, 1, 0]);
    if (Math.abs(f[1]) > 0.9) base_u = norm([1, 0, 0]);
    let sd = norm([f[1]*base_u[2]-f[2]*base_u[1], f[2]*base_u[0]-f[0]*base_u[2], f[0]*base_u[1]-f[1]*base_u[0]]);
    const u = norm([sd[1]*f[2]-sd[2]*f[1], sd[2]*f[0]-sd[0]*f[2], sd[0]*f[1]-sd[1]*f[0]]);
    
    const WHITE3 = [255, 255, 255];
    const pal = {
      body: mixc(rgb, [235, 240, 245], 0.12),
      radiator: mixc(rgb, WHITE3, 0.55),
      dark: [24, 32, 40],
      boom: mixc(rgb, [20, 28, 34], 0.45),
      panel: mixc(rgb.map((v) => v * 0.45), [14, 30, 60], 0.35),
      dish: mixc(rgb, WHITE3, 0.4),
    };
    const edgeRgb = mixc(rgb, WHITE3, 0.3).map(Math.round).join(",");
    const rgbStr = rgb.join(",");
    const col = (b, m, a = 1) =>
      `rgba(${Math.min(255, Math.round(b[0] * m))},${Math.min(255, Math.round(b[1] * m))},${Math.min(255, Math.round(b[2] * m))},${a})`;

    // soft glow behind the model so it reads against the dark scene
    const c0 = toScreen(center);
    const rr = 30 * SC * s;
    const halo = ctx.createRadialGradient(c0.x, c0.y, 0, c0.x, c0.y, rr);
    halo.addColorStop(0, `rgba(${rgbStr},0.28)`);
    halo.addColorStop(1, `rgba(${rgbStr},0)`);
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(c0.x, c0.y, rr, 0, Math.PI * 2); ctx.fill();

    const faces = [];
    satParts(variant).forEach((pt) => {
      // part axes: the satellite frame, optionally rotated about the side axis
      let ax = [f, u, sd];
      if (pt.tilt) {
        const ca = Math.cos(pt.tilt), sa = Math.sin(pt.tilt);
        ax = [
          [f[0] * ca + u[0] * sa, f[1] * ca + u[1] * sa, f[2] * ca + u[2] * sa],
          [-f[0] * sa + u[0] * ca, -f[1] * sa + u[1] * ca, -f[2] * sa + u[2] * ca],
          sd,
        ];
      }
      const cw = [
        center[0] + (f[0] * pt.c[0] + u[0] * pt.c[1] + sd[0] * pt.c[2]) * SC,
        center[1] + (f[1] * pt.c[0] + u[1] * pt.c[1] + sd[1] * pt.c[2]) * SC,
        center[2] + (f[2] * pt.c[0] + u[2] * pt.c[1] + sd[2] * pt.c[2]) * SC,
      ];
      for (let i = 0; i < 3; i++) {
        const j = (i + 1) % 3, k = (i + 2) % 3;
        for (const sg of [1, -1]) {
          const n = [ax[i][0] * sg, ax[i][1] * sg, ax[i][2] * sg];
          if (project(n).z <= 0) continue; // faces pointing away from the camera
          const at = (sj, sk) => {
            const o = [0, 0, 0];
            o[i] = sg * pt.h[i] * SC;
            o[j] = sj * pt.h[j] * SC;
            o[k] = sk * pt.h[k] * SC;
            return [
              cw[0] + ax[0][0] * o[0] + ax[1][0] * o[1] + ax[2][0] * o[2],
              cw[1] + ax[0][1] * o[0] + ax[1][1] * o[1] + ax[2][1] * o[2],
              cw[2] + ax[0][2] * o[0] + ax[1][2] * o[1] + ax[2][2] * o[2],
            ];
          };
          const lam = Math.max(0, n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2]);
          faces.push({
            pts: [at(1, 1), at(-1, 1), at(-1, -1), at(1, -1)].map(toScreen),
            z: project(at(0, 0)).z,
            k: 0.32 + 0.68 * lam,
            lam,
            kind: pt.kind,
            grid: pt.kind === "panel" && i === 1, // cell lines on the large panel faces
          });
        }
      }
    });
    faces.sort((a, b) => a.z - b.z); // far to near

    ctx.save();
    ctx.lineJoin = "round";
    faces.forEach((fc) => {
      const [p0, p1, p2, p3] = fc.pts;
      const base = pal[fc.kind];
      const glass = fc.kind === "panel";
      const trace = () => {
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.lineTo(p3.x, p3.y);
        ctx.closePath();
      };

      // base fill with a light-to-dark gradient across the face
      const g = ctx.createLinearGradient(p0.x, p0.y, p2.x, p2.y);
      g.addColorStop(0, col(base, fc.k * 1.4, glass ? 0.9 : 1));
      g.addColorStop(1, col(base, fc.k * 1.0, glass ? 0.9 : 1));
      ctx.fillStyle = g;
      trace(); ctx.fill();

      if (fc.grid) {
        // specular streak across the glass
        const sp = ctx.createLinearGradient(p0.x, p0.y, p2.x, p2.y);
        const a = 0.28 * fc.lam;
        sp.addColorStop(0, "rgba(255,255,255,0)");
        sp.addColorStop(0.4, "rgba(255,255,255,0)");
        sp.addColorStop(0.5, `rgba(255,255,255,${a.toFixed(3)})`);
        sp.addColorStop(0.6, "rgba(255,255,255,0)");
        sp.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = sp;
        trace(); ctx.fill();

        // solar cell grid
        const lerp = (a2, b2, w) => ({ x: a2.x + (b2.x - a2.x) * w, y: a2.y + (b2.y - a2.y) * w });
        ctx.strokeStyle = `rgba(${edgeRgb},0.45)`; ctx.lineWidth = 0.7;
        ctx.beginPath();
        [0.25, 0.5, 0.75].forEach((w) => {
          const a2 = lerp(p0, p1, w), b2 = lerp(p3, p2, w);
          ctx.moveTo(a2.x, a2.y); ctx.lineTo(b2.x, b2.y);
          const c2 = lerp(p0, p3, w), d2 = lerp(p1, p2, w);
          ctx.moveTo(c2.x, c2.y); ctx.lineTo(d2.x, d2.y);
        });
        ctx.stroke();
      }

      // edges
      ctx.strokeStyle = `rgba(${edgeRgb},${glass ? 0.85 : 0.8})`;
      ctx.lineWidth = glass ? 1.1 : 1;
      trace(); ctx.stroke();
    });
    ctx.restore();
  };

  drawTrack(scene.cB, scene.dB, "#f2a950", true,  scene.spdB, ev.retroB);
  drawTrack(scene.cA, scene.dA, "#62c4da", false, scene.spdA, false);

  const items = [
    { p: posV(scene.cA, scene.dA, scene.spdA, t), d: scene.dA, a: scene.aA, col: "#62c4da", rgb: "98,196,218",
      tag: ev.a, ox: -10, variant: 0, inc: ev.incA, vel: ev.velA, retro: false },
    { p: posV(scene.cB, scene.dB, scene.spdB, t), d: scene.dB, a: scene.aB, col: "#f2a950", rgb: "242,169,80",
      tag: ev.b, ox: 10, variant: 1, inc: ev.incB, vel: ev.velB, retro: ev.retroB },
  ].sort((u, v) => project(u.p).z - project(v.p).z); // far first, near drawn on top

  items.forEach((it) => {
    const e = drawVolume(it.p, it.d, it.a, it.rgb);
    drawSat3D(it.p, it.d, it.rgb.split(",").map(Number), it.variant);

    const labelY = e.c.y - e.minor - Math.abs(Math.sin(e.ang)) * e.major * 0.55 - 32;

    // Satellite name
    ctx.fillStyle = it.col; ctx.font = `bold 13px ${MONO}`; ctx.textAlign = "center";
    ctx.fillText(it.tag, e.c.x + it.ox, labelY);

    // Inclination + velocity badge
    ctx.fillStyle = `rgba(${it.rgb},0.85)`;
    ctx.font = `11px ${MONO}`;
    const badge = `${it.inc.toFixed(1)}° inc  ${it.vel.toFixed(2)} km/s${it.retro ? "  ↺ RETRO" : ""}`;
    ctx.fillText(badge, e.c.x + it.ox, labelY + 16);
  });

  // closest-approach marker and miss-distance callout
  const a0 = toScreen(scene.cA), b0 = toScreen(scene.cB);
  ctx.save();
  const riskColor = (ev.risk === "high") ? "#ef4444" : (ev.risk === "watch") ? "#f97316" : "#10b981";
  ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.fillStyle = "#fff"; ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.beginPath(); ctx.moveTo(a0.x, a0.y); ctx.lineTo(b0.x, b0.y); ctx.stroke();
  const lx = b0.x + 34, ly = b0.y + 52;
  ctx.beginPath(); ctx.moveTo(b0.x, b0.y); ctx.lineTo(lx, ly); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = riskColor;
  ctx.shadowColor = riskColor;
  ctx.shadowBlur = 8;
  ctx.beginPath(); ctx.arc(b0.x, b0.y, 4, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.font = `bold 14px ${MONO}`; ctx.textAlign = "left";
  ctx.fillStyle = riskColor;
  ctx.fillText("MISS DISTANCE: " + fmtDist(ev.miss), lx + 8, ly + 5);
  ctx.fillStyle = "rgba(235,243,248,0.8)"; ctx.textAlign = "right";
  ctx.fillText("TCA", b0.x - 12, b0.y + 26);
  ctx.restore();

  ctx.fillStyle = "rgba(160,185,200,0.7)"; ctx.font = `12px ${MONO}`; ctx.textAlign = "right";
  ctx.fillText("Schematic view, separation exaggerated", W - 14, H - 30);
  ctx.fillText("TCA = Time of Closest Approach", W - 14, H - 14);
}
