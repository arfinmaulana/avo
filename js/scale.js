"use strict";

// Visual transcription of reference/Skala Baca.png (813 × 423).
// Angles are clockwise from twelve o'clock. This is NOT a measurement model.
window.AvoScale = (() => {
  const NS = "http://www.w3.org/2000/svg";
  // Circle fit to 131 black-band samples; residual RMS .453 source pixels.
  const centerX = 427.5, centerY = 593.8;
  const meterGeometry = {
    centerX, centerY, sourceTransform: { x: 209, y: 158, scale: .55 },
    needlePivotX: 430, needlePivotY: 490, needleLength: 310,
    needleRestAngle: -38.5,
    scales: {
      ohm: { radius: 543, bandRadius: 531, start: -37.8, end: 37.8 },
      va: { radius: 520, start: -35, end: 35, arcStart: -38.5, arcEnd: 38.5 },
      ac10: { radius: 438, start: -40, end: 40 },
      capacitance: { radius: 431, start: -40, end: 40 },
      null: { radius: 379, start: -34, end: 34 },
      li: { radius: 325, start: -40, end: 39 },
      lv: { radius: 319, start: -30, end: 29, arcStart: -40, arcEnd: 39 },
      hfe: { radius: 291, start: -40, end: 16 },
      db: { radius: 261, start: -27, end: 32 }
    }
  };
  const colors = { ink: "#354137", ohm: "#ac5634", ac: "#c86d83", null: "#b9873d" };
  const element = (tag, attrs, parent) => {
    const node = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
    if (parent) parent.append(node);
    return node;
  };
  function point(radius, angle, cx = centerX, cy = centerY) {
    const radians = angle * Math.PI / 180;
    return { x: cx + radius * Math.sin(radians), y: cy - radius * Math.cos(radians) };
  }
  function arc(parent, radius, startAngle, endAngle, color, width = 2) {
    const a = point(radius, startAngle), b = point(radius, endAngle);
    return element("path", { d: `M${a.x} ${a.y} A${radius} ${radius} 0 0 1 ${b.x} ${b.y}`, fill: "none", stroke: color, "stroke-width": width }, parent);
  }
  function tick(parent, radius, angle, length, color, width = 1.8, cx = centerX, cy = centerY) {
    const a = point(radius, angle, cx, cy), b = point(radius + length, angle, cx, cy);
    element("line", { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: color, "stroke-width": width, "data-angle": angle }, parent);
  }
  function ticks(parent, { radius, startAngle, endAngle, tickCount, tickLength = 7, majorInterval = 5, color = colors.ink, cx = centerX, cy = centerY }) {
    for (let i = 0; i <= tickCount; i++) {
      const major = i % majorInterval === 0;
      tick(parent, radius, startAngle + (endAngle - startAngle) * i / tickCount, tickLength * (major ? 1.8 : 1), color, major ? 2.5 : 1.7, cx, cy);
    }
  }
  function label(parent, x, y, value, size = 18, color = colors.ink, angle = 0, anchor = "middle") {
    const node = element("text", { x, y, fill: color, "font-size": size, "font-weight": 600, "text-anchor": anchor, transform: `rotate(${angle} ${x} ${y})` }, parent);
    node.textContent = value;
    return node;
  }
  function radialLabel(parent, radius, angle, value, size = 18, color = colors.ink) {
    const p = point(radius, angle);
    const node = label(parent, p.x, p.y, value, size, color, angle);
    node.setAttribute("dominant-baseline", "central");
    node.setAttribute("data-angle", angle);
    node.setAttribute("data-radius", radius);
  }
  // Nonlinear landmarks traced from the image. Subdivisions describe visual tick
  // density between anchors; their interpolation is provisional, not electrical.
  const scaleCalibration = {
    ohm: [
      { value: "∞", angle: -36.39, divisions: 1 }, { value: "2k", angle: -35.61, divisions: 1 },
      { value: "1k", angle: -34.84, divisions: 2 }, { value: "500", angle: -32.6, divisions: 3 },
      { value: "200", angle: -28.62, divisions: 4 }, { value: "100", angle: -23.66, divisions: 5 },
      { value: "50", angle: -14.77, divisions: 4 }, { value: "30", angle: -6.24, divisions: 5 },
      { value: "20", angle: 0.9, divisions: 10 }, { value: "10", angle: 12.63, divisions: 10 },
      { value: "5", angle: 21.94, divisions: 6 }, { value: "2", angle: 29.74, divisions: 5 },
      { value: "1", angle: 32.63, divisions: 5 }, { value: "0", angle: 36.31, divisions: 0 }
    ],
    capacitance: [
      { value: "0", angle: -34.15, divisions: 2 }, { value: ".01", angle: -30.45, divisions: 3 },
      { value: ".05", angle: -19.89, divisions: 4 }, { value: ".1", angle: -12.6, divisions: 4 },
      { value: ".2", angle: -4.31, divisions: 6 }, { value: ".5", angle: 7.61, divisions: 4 },
      { value: "1", angle: 15.74, divisions: 8 }, { value: "5", angle: 24.19, divisions: 2 },
      { value: "10", angle: 29.38, divisions: 0 }
    ],
    hfe: [
      { value: "0", angle: -29, divisions: 8 }, { value: "50", angle: -14, divisions: 5 },
      { value: "100", angle: -7, divisions: 5 }, { value: "200", angle: 0, divisions: 6 },
      { value: "500", angle: 9, divisions: 5 }, { value: "1000", angle: 16, divisions: 0 }
    ],
    db: [
      { value: "-10", angle: -25.99, divisions: 2 }, { value: "0", angle: -23.47, divisions: 5 },
      { value: "+10", angle: -14.39, divisions: 5 }, { value: "+15", angle: -4.14, divisions: 5 },
      { value: "+20", angle: 13.75, divisions: 2 }, { value: "+22", angle: 24.49, divisions: 0 }
    ],
    ac10: [
      { value: "0", angle: -34.48, divisions: 10 }, { value: "2", angle: -21.97, divisions: 10 },
      { value: "4", angle: -7.67, divisions: 10 }, { value: "6", angle: 6.38, divisions: 10 },
      { value: "8", angle: 20.03, divisions: 10 }, { value: "10", angle: 34.34, divisions: 0 }
    ]
  };
  const ohmTickAngles = [-36.39, -35.61, -34.84, -33.39, -32.6, -31.53, -30.61, -29.4, -28.62, -27.71, -26.66, -25.49, -24.55, -23.66, -23.09, -22.49, -21.86, -21.09, -20.35, -19.47, -18.45, -17.44, -16.26, -14.77, -14.17, -13.59, -12.86, -12.09, -11.31, -10.41, -9.54, -8.49, -7.51, -6.24, -5.09, -3.82, -2.35, -0.79, 0.9, 1.73, 2.78, 3.78, 4.94, 6.05, 7.2, 8.46, 9.85, 11.24, 12.63, 13.44, 14.28, 15.08, 15.91, 16.71, 17.7, 18.71, 19.7, 20.81, 21.94, 23.01, 24.18, 25.45, 26.74, 28.12, 29.74, 30.34, 30.86, 31.49, 32.01, 32.63, 33.39, 34.14, 34.83, 35.58, 36.31];
  // Explicit medium rays read from Skala Baca.png: 40, 15, 7.5 and 2.5 Ω.
  // 120 Ω (-24.55°) restores the missing fourth interior ray in 100–200.
  const ohmMediumAngles = [-11.31, 6.05, 16.71, 28.12];
  const ohmTicks = ohmTickAngles.map(angle => ({angle,
    length: scaleCalibration.ohm.some(v=>v.angle===angle) ? 16
      : ohmMediumAngles.includes(angle) ? 13 : 8}));
  const tracedTickAngles = {"ac10": [-34.48, -33.39, -32.29, -31.23, -30.07, -29.04, -27.6, -26.15, -24.73, -23.35, -21.97, -20.5, -19.06, -17.65, -16.25, -14.82, -13.35, -11.91, -10.5, -9.12, -7.67, -6.19, -4.81, -3.37, -2.01, -0.65, 0.78, 2.14, 3.63, 4.95, 6.38, 7.74, 9.1, 10.44, 11.83, 13.21, 14.58, 15.94, 17.26, 18.63, 20.03, 21.36, 22.71, 24.05, 25.5, 26.95, 28.4, 29.9, 31.29, 32.7, 34.34], "capacitance": [-34.15, -30.45, -27.12, -24.23, -21.85, -19.89, -18.22, -16.72, -15.32, -13.96, -12.6, -7.84, -4.31, -1.55, 0.94, 3.09, 4.83, 6.26, 7.61, 9.61, 11.46, 13.04, 14.43, 15.74, 19.06, 21.3, 22.86, 24.19, 25.94, 27.14, 28.16, 28.69, 29.38, 30.23], "li": [-32.93, -30.61, -28.76, -26.55, -24.46, -22.22, -20.11, -17.97, -15.79, -13.82, -11.74, -9.64, -7.6, -5.65, -3.57, -1.65, 0.43, 2.35, 4.28, 6.26, 8.2, 10.19, 12.09, 14.11, 16.09, 18.11, 20.11, 22.13, 24.21, 26.25, 28.19, 30.54]};
  function calibratedTicks(parent, data, radius, length, color) {
    data.forEach((entry, i) => {
      tick(parent, radius, entry.angle, length * 1.7, color, 2.5);
      if (i === data.length - 1) return;
      for (let j = 1; j < entry.divisions; j++) tick(parent, radius, entry.angle + (data[i + 1].angle - entry.angle) * j / entry.divisions, length, color);
    });
  }
  function render() {
    const geometry = meterGeometry.scales;
    const angleAt = (scale, index, count) => scale.start + (scale.end-scale.start)*index/count;
    const root = document.getElementById("meter-scale");
    root.replaceChildren();
    const group = id => element("g", { id }, root);
    const ohm = group("scale-ohm");
    arc(ohm, geometry.ohm.radius, geometry.ohm.start, geometry.ohm.end, colors.ohm, 2.3);
    arc(ohm, geometry.ohm.bandRadius, geometry.ohm.start, geometry.ohm.end, colors.ink, 9);
    // Tick rays detected in the source scan at radii 544-549; data retained for audit.
    ohmTicks.forEach(({angle,length}) => tick(ohm, geometry.ohm.radius, angle, length, colors.ink));
    scaleCalibration.ohm.forEach((v, i) => {
      // Crowded high-resistance labels stagger radially, never off their tick ray.
      radialLabel(ohm, [578,608,593,578][i] || 569, v.angle, v.value, i < 4 ? 19 : 24);
    });
    const va = group("scale-va");
    arc(va, geometry.va.radius, geometry.va.arcStart, geometry.va.arcEnd, colors.ink);
    ticks(va, { radius: meterGeometry.scales.va.radius, startAngle: geometry.va.start, endAngle: geometry.va.end, tickCount: 50, tickLength: -9 });
    [0, 50, 100, 150, 200, 250].forEach((value, i) => {
      const angle = angleAt(geometry.va, i, 5);
      [value, value / 5, value / 25].forEach((v, row) => radialLabel(va, 496 - row * 18, angle, v, 18));
    });
    const ac = group("scale-ac10v");
    arc(ac, geometry.ac10.radius, geometry.ac10.start, geometry.ac10.end, colors.ac);
    tracedTickAngles.ac10.forEach((angle,i) => tick(ac, meterGeometry.scales.ac10.radius, angle, i%10===0 ? 12 : 7, colors.ac));
    const capacitance = group("scale-capacitance");
    arc(capacitance, geometry.capacitance.radius, geometry.capacitance.start, geometry.capacitance.end, colors.ink, 1.5);
    tracedTickAngles.capacitance.forEach(angle => tick(capacitance, meterGeometry.scales.capacitance.radius, angle, scaleCalibration.capacitance.some(v=>v.angle===angle) ? -12 : -6, colors.ink));
    scaleCalibration.capacitance.forEach(v => radialLabel(capacitance, 410, v.angle, v.value, 14));
    const nullScale = group("scale-null");
    for (let i = 0; i <= 50; i++) tick(nullScale, meterGeometry.scales.null.radius, angleAt(geometry.null, i, 50), -10, colors.null, 5);
    for (let i = 0; i <= 10; i++) {
      const angle = angleAt(geometry.null, i, 10), value = (i - 5) * 5, small = i - 5;
      radialLabel(nullScale, 395, angle, value > 0 ? `+${value}` : value, 17, colors.null);
      radialLabel(nullScale, 359, angle, small > 0 ? `+${small}` : small, 16, colors.null);
    }
    const li = group("scale-li-iceo");
    arc(li, geometry.li.radius, geometry.li.start, geometry.li.end, colors.ink);
    tracedTickAngles.li.forEach((angle,i) => tick(li,meterGeometry.scales.li.radius,angle,[0,10,20,31].includes(i) ? 12 : 6,colors.ink));
    [0, 5, 10, 15].forEach((v, i) => radialLabel(li, 343, [-32.93,-11.74,8.2,30.54][i], v, 16));
    const lv = group("scale-lv");
    arc(lv, geometry.lv.radius, geometry.lv.arcStart, geometry.lv.arcEnd, colors.ink, 1.5);
    ticks(lv, { radius: meterGeometry.scales.lv.radius, startAngle: geometry.lv.start, endAngle: geometry.lv.end, tickCount: 30, tickLength: -7 });
    [3, 2, 1, 0].forEach((v, i) => radialLabel(lv, 305, angleAt(geometry.lv, i, 3), v, 16));
    const hfe = group("scale-hfe");
    arc(hfe, geometry.hfe.radius, geometry.hfe.start, geometry.hfe.end, colors.ink);
    calibratedTicks(hfe, scaleCalibration.hfe, meterGeometry.scales.hfe.radius, -7, colors.ink);
    scaleCalibration.hfe.forEach(v => {
      radialLabel(hfe, v.value === "1000" ? 265 : 274, v.angle, v.value, 14);
    });
    const db = group("scale-db");
    arc(db, geometry.db.radius, geometry.db.start, geometry.db.end, colors.ac);
    calibratedTicks(db, scaleCalibration.db, meterGeometry.scales.db.radius, -7, colors.ac);
    scaleCalibration.db.forEach(v => radialLabel(db, v.value === "0" ? 248 : 235, v.angle, v.value, 14, colors.ac));
    const sides = group("scale-side-labels");
    // Elbows and label baselines use source-image coordinates.
    [
      ["M75 152V169H91", "Ω", 77, 165, colors.ink], ["M759 170H782V151", "Ω", 763, 163, colors.ink],
      ["M73 220V196H94L103 188", "V·A", 78, 217, colors.ink], ["M748 190H781V221", "V·A", 735, 218, colors.ink],
      ["M63 239V262H146L156 253", "AC10V", 68, 256, colors.ac], ["M705 259 711 264H786V240", "AC10V", 721, 256, colors.ac],
      ["M63 299V270H146L158 260", "C(µF)", 69, 294, colors.ink], ["M704 265 711 272H786V299", "C(µF)", 727, 294, colors.ink],
      ["M136 309V287H202", "NULL", 140, 308, colors.null], ["M654 290H725V313", "±DCV", 649, 311, colors.null],
      ["M161 318V342H219", "ICEO", 164, 335, colors.ink], ["M633 343H738V318", "LI(µA.mA)", 634, 335, colors.ink],
      ["M161 370V348H219", "LV", 165, 368, colors.ink], ["M636 349H700", "LV(V)", 636, 368, colors.ink],
      ["M201 394V373H237", "hFE", 205, 392, colors.ink], ["M571 376H617V399", "dB", 586, 397, colors.ac]
    ].forEach(([d, text, x, y, color]) => {
      element("path", { d, stroke: color, "stroke-width": 2, fill: "none" }, sides);
      label(sides, x, y, text, text === "LI(µA.mA)" ? 19 : 21, color, 0, "start");
    });
    element("path", { d: "M194 296h27v13h-27z M197 305q10-8 21 0 M207 307v-10", fill: "none", stroke: colors.null, "stroke-width": 1.7 }, sides);
  }
  return { render, scaleCalibration, meterGeometry, ohmTickAngles, ohmTicks, tracedTickAngles, point, element, ticks, arc, tick, radialLabel };
})();
