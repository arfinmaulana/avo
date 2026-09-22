"use strict";

window.AvoSelector = (() => {
  const center = { x: 610, y: 465 };
  // Angles transcribed from centers of panel segments in the dedicated photo.
  // One bounded turn, seam between DCV1000 and NULL ±25 (no endless rotation).
  // The photo/manual do not establish a mechanical stop: this seam is a UI limit.
  const selectorDetents = [
    ['null25','DCV NULL ±25',-98], ['null5','DCV NULL ±5',-78.5],
    ['ac750','ACV 750',-62], ['ac250','ACV 250',-46],
    ['ac50','ACV 50',-30], ['ac10','ACV 10',-14], ['off','OFF',0],
    ['ohm100k','Ω ×100K / C(µF)',16.5], ['ohm1k','Ω ×1K',31.5],
    ['ohm100','Ω ×100',47], ['ohm10','Ω ×10',63.5], ['ohm1','Ω ×1',80.5],
    ['dca025','DCA 0.25',100.5], ['dca25m','DCA 25m',116],
    ['dca2m5','DCA 2.5m',132], ['dca50u','DCA 50µ',145],
    ['dc01','DCV 0.1',153.5], ['dc025','DCV 0.25',166],
    ['dc2m5','DCV 2.5',180], ['dc10','DCV 10',196],
    ['dc50','DCV 50',209], ['dc250','DCV 250',224], ['dc1000','DCV 1000',237]
  ].map(([id,label,angle]) => ({id,label,angle}));
  const limits = { min: selectorDetents[0].angle, max: selectorDetents.at(-1).angle };
  const clamp = angle => Math.max(limits.min, Math.min(limits.max, angle));
  const nearest = angle => selectorDetents.reduce((a,b) => Math.abs(b.angle-angle) < Math.abs(a.angle-angle) ? b : a);
  let activeDetent = selectorDetents.find(d => d.id === 'off');
  function selectDetent(id, animate = true) {
    const detent = selectorDetents.find(d => d.id === id);
    if (!detent) throw new RangeError('Unknown selector detent');
    activeDetent = detent;
    setSelectorAngle(detent.angle, animate);
    document.querySelectorAll('[data-detent]').forEach(node => node.setAttribute('aria-pressed', String(node.dataset.detent === id)));
    document.dispatchEvent(new CustomEvent('selectorchange', { detail: detent }));
  }
  let selectorAngle = 0, displayedAngle = 0, frame = 0;
  function setSelectorAngle(angle, animate = true) {
    if (!Number.isFinite(angle)) throw new TypeError("selectorAngle harus angka finite.");
    angle = clamp(angle);
    const rotor = document.getElementById("selector-rotor");
    cancelAnimationFrame(frame);
    const from = displayedAngle;
    selectorAngle = angle;
    const apply = value => {
      displayedAngle = value;
      rotor.setAttribute("transform", `rotate(${value} ${center.x} ${center.y})`);
    };
    if (!animate || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { apply(angle); return; }
    const start = performance.now();
    function step(now) {
      const t = Math.min(1, (now - start) / 200);
      apply(from + (angle - from) * (1 - (1 - t) ** 3));
      if (t < 1) frame = requestAnimationFrame(step);
    }
    frame = requestAnimationFrame(step);
  }
  function render() {
    const root = document.getElementById("panel-labels");
    root.replaceChildren();
    const el = window.AvoScale.element;
    const white = "#e3e5db", yellow = "#d8b760", red = "#db6966";
    const text = (x, y, value, size = 45, color = white, anchor = "middle") => {
      const node = el("text", { x, y, fill: color, "font-size": size, "text-anchor": anchor, "font-family": "Arial, sans-serif" }, root);
      node.textContent = value;
      return node;
    };
    // Landmarks from the dedicated selector photo at 1400×986.
    // OFF / C(µF) ordering differs from Foto Utuh.jpg; see PROJECT_BLUEPRINT.md.
    const labels = [
      [370, 111, "1000", white], [298, 201, "250", white], [246, 290, "50", white],
      [213, 382, "10", white], [213, 491, "2.5", white], [180, 596, "0.25", white],
      [223, 687, "0.1", white], [266, 742, "50µ", white], [328, 817, "2.5m", white],
      [421, 871, "25m", white], [531, 918, "0.25", white], [678, 898, "×1", yellow],
      [812, 868, "×10", yellow], [930, 785, "×100", yellow], [1000, 696, "×1K", yellow],
      [1035, 626, "×100K", yellow], [1049, 486, "OFF", white], [1034, 385, "10", red],
      [982, 292, "50", red], [905, 202, "250", red], [802, 119, "750", red],
      [682, 102, "±5", yellow], [557, 102, "±25", yellow]
    ];
    // Tick positions follow the photographed label directions; not range selection logic.
    const labelIds = ['dc1000','dc250','dc50','dc10','dc2m5','dc025','dc01','dca50u','dca2m5','dca25m','dca025','ohm1','ohm10','ohm100','ohm1k','ohm100k','off','ac10','ac50','ac250','ac750','null5','null25'];
    labels.forEach(([x, y, value, color], index) => {
      const detent = selectorDetents.find(d => d.id === labelIds[index]);
      const angle = detent.angle * Math.PI / 180, r = 346;
      const a = angle - .105, b = angle + .105;
      el("path", { d: `M${center.x + r * Math.cos(a)} ${center.y + r * Math.sin(a)} A${r} ${r} 0 0 1 ${center.x + r * Math.cos(b)} ${center.y + r * Math.sin(b)}`, fill: "none", stroke: color, "stroke-width": 17 }, root);
      const label = text(x, y, value, value === "OFF" ? 57 : 47, color);
      label.classList.add('selector-label');
      label.addEventListener('click', () => selectDetent(detent.id));
      // Fill the available sector without overlapping the neighboring detent.
      const detentIndex=selectorDetents.indexOf(detent);
      const start=((selectorDetents[detentIndex-1]?.angle ?? detent.angle-14)+detent.angle)/2*Math.PI/180;
      const end=((selectorDetents[detentIndex+1]?.angle ?? detent.angle+14)+detent.angle)/2*Math.PI/180;
      const target = el('path', {
        d: `M${center.x+330*Math.cos(start)} ${center.y+330*Math.sin(start)} L${center.x+480*Math.cos(start)} ${center.y+480*Math.sin(start)} A480 480 0 0 1 ${center.x+480*Math.cos(end)} ${center.y+480*Math.sin(end)} L${center.x+330*Math.cos(end)} ${center.y+330*Math.sin(end)}Z`,
        fill:'transparent', class:'selector-target', role:'button', tabindex:0,
        'aria-label':detent.label, 'data-detent':detent.id, 'aria-pressed':String(detent.id===activeDetent.id)
      }, root);
      target.addEventListener('click', () => selectDetent(detent.id));
      target.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectDetent(detent.id); }
      });
    });
    [
      [133, 107, "DCV", 57, white], [595, 43, "DCV(NULL)", 42, yellow],
      [960, 113, "ACV～", 55, red], [148, 894, "DCA", 56, white],
      [1069, 564, "C (µF)", 42, yellow], [1061, 866, "Ω", 59, yellow],
      [1061, 917, "LI", 48, yellow], [695, 939, "150mA", 29, yellow],
      [817, 912, "15mA", 29, yellow], [962, 829, "1.5mA", 29, yellow],
      [1021, 735, "150µA", 29, yellow], [1270, 238, "0Ω·ADJ", 38, yellow],
      [1100, 383, "(22dB)", 24, red], [123, 479, "HV", 36, yellow],
      [120, 526, "PROBE", 27, yellow], [937, 907, "hFE", 37, yellow],
      [937, 943, "PROBE", 26, yellow]
    ].forEach(v => text(...v));
    el("path", { d: "M177 674H49Q23 674 23 650V49Q23 20 52 20H447L490 98 M174 696H53Q26 696 26 724V921Q26 951 57 951H577Q604 951 604 923V857", fill: "none", stroke: white, "stroke-width": 5 }, root);
    el("path", { d: "M647 858V924Q647 953 675 953H1120Q1148 953 1148 923V548Q1148 522 1122 522H990 M988 402H1120Q1148 402 1148 373V154", fill: "none", stroke: yellow, "stroke-width": 4 }, root);
    el("path", { d: "M207 73H248 M207 87H221M231 87H247 M230 865H272 M230 879H245M255 879H272 M59 443H173V491H59Z M895 874H977V918H895Z", fill: "none", stroke: white, "stroke-width": 4 }, root);
    el("path", { d: "M1208 259h105v48h-105z M1218 294Q1260 265 1303 293 M1259 299V267 M1223 362v38m-11 0h24v253h-24z M1223 653v26 M1281 362v38m-11 0h24v253h-24z M1281 653v26", fill: "none", stroke: yellow, "stroke-width": 5 }, root);
    text(1224, 350, "−", 34, white); text(1283, 350, "+", 34, red);
    el("path", { d: "M1203 696 1168 767H1240Z M1310 696 1275 767H1345Z", fill: "none", stroke: yellow, "stroke-width": 6 }, root);
    text(1204, 752, "!", 50, yellow);
    el("path", { d: "M1318 711 1300 739H1316L1302 757", fill: "none", stroke: yellow, "stroke-width": 4 }, root);
    ["DC1000V MAX", "AC750V MAX", "(CAT.Ⅱ)", "DC.AC600V", "MAX(CAT.Ⅲ)"].forEach((s, i) => text(1255, 810 + i * 33, s, 29, yellow));
    const ridges = document.getElementById("ohm-ridges");
    ridges.replaceChildren();
    for (let i = 0; i < 30; i++) el("rect", { x: 619.5, y: 484, width: 9, height: 13, rx: 1, fill: "#afb7ad", stroke: "#68766b", "stroke-width": 1, transform: `rotate(${i * 12} 624 548)` }, ridges);
    const knob = document.getElementById('selector-knob');
    const panel = document.getElementById('selector-panel');
    let drag = null;
    function pointerAngle(event) {
      const p = new DOMPoint(event.clientX,event.clientY).matrixTransform(panel.getScreenCTM().inverse());
      return Math.atan2(p.y-center.y,p.x-center.x)*180/Math.PI;
    }
    knob.onpointerdown = event => {
      if (!event.isPrimary || event.button !== 0 || drag) return;
      event.preventDefault(); cancelAnimationFrame(frame);
      drag = { id:event.pointerId, previous:pointerAngle(event), angle:displayedAngle };
      knob.setPointerCapture(event.pointerId);
      knob.classList.add('dragging');
    };
    knob.onpointermove = event => {
      if (!drag || event.pointerId !== drag.id) return;
      const angle = pointerAngle(event);
      const delta = ((angle-drag.previous+540)%360)-180;
      drag.angle = clamp(drag.angle+delta); drag.previous = angle;
      setSelectorAngle(drag.angle,false);
    };
    const finish = event => {
      if (!drag || event.pointerId !== drag.id) return;
      const id = drag.id; drag = null; knob.classList.remove('dragging');
      if (knob.hasPointerCapture(id)) knob.releasePointerCapture(id);
      selectDetent(nearest(displayedAngle).id);
    };
    knob.onpointerup = finish; knob.onpointercancel = finish; knob.onlostpointercapture = finish;
  }
  return { render, setSelectorAngle, selectDetent, selectorDetents, limits,
    get activeDetent() { return activeDetent; }, get selectorAngle() { return selectorAngle; }, center };
})();
window.setSelectorAngle = window.AvoSelector.setSelectorAngle;
