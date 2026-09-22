"use strict";

window.AvoMeter = (() => {
  // Physical pivot follows the mechanical zero screw. The photographed scale
  // circle has a slightly different center: project its tick onto this pivot.
  const geometry = window.AvoScale.meterGeometry;
  const pivot = { x: geometry.needlePivotX, y: geometry.needlePivotY };
  const source = geometry.sourceTransform;
  const scaleCenter = { x: source.x + source.scale * geometry.centerX,
    y: source.y + source.scale * geometry.centerY };
  function absoluteAngleForScale(angle, radius) {
    const p = window.AvoScale.point(radius, angle);
    return Math.atan2(source.x + source.scale*p.x - pivot.x,
      pivot.y - source.y - source.scale*p.y)*180/Math.PI;
  }
  const restAngle = absoluteAngleForScale(geometry.scales.va.start, geometry.scales.va.radius);
  geometry.needleRestAngle = restAngle;
  function angleForScale(angle, radius) { return absoluteAngleForScale(angle,radius)-restAngle; }
  function scaleAngleForNeedle(angle, radius) {
    const radians = (angle+restAngle)*Math.PI/180;
    const dx = Math.sin(radians), dy = -Math.cos(radians);
    const px = pivot.x-scaleCenter.x, py = pivot.y-scaleCenter.y;
    const projection = px*dx+py*dy, r = radius*source.scale;
    const distance = -projection + Math.sqrt(projection*projection-px*px-py*py+r*r);
    return Math.atan2(px+distance*dx,-py-distance*dy)*180/Math.PI;
  }
  const radians = restAngle*Math.PI/180;
  const bladePoint = (length, halfWidth) => ({
    x: pivot.x+length*Math.sin(radians)+halfWidth*Math.cos(radians),
    y: pivot.y-length*Math.cos(radians)+halfWidth*Math.sin(radians)
  });
  const blade = [bladePoint(0,-1.15),bladePoint(geometry.needleLength-2,-.5),
    bladePoint(geometry.needleLength,0),bladePoint(geometry.needleLength-2,.5),bladePoint(0,1.15)];
  document.querySelector('#needle-blade').setAttribute('d',
    blade.map((p,i)=>`${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ')+'Z');
  // Invisible targets use CSS-pixel size in either camera; blade geometry is unchanged.
  const svg=document.querySelector('.avo-svg');
  function sizeHitTargets() {
    // Detail previews may remove the instrument while keeping the SVG viewport.
    const mechanical=document.getElementById('mechanical-hit');
    const ohm=document.getElementById('ohm-hit'), hit=document.getElementById('needle-hit');
    if(!svg.isConnected || !mechanical || !ohm || !hit) return;
    const matrix=svg.getScreenCTM();
    const scale=matrix && Math.hypot(matrix.a,matrix.b);
    if(!scale) return;
    const zeroRadius=Math.max(32,22/scale);
    mechanical.setAttribute('r',zeroRadius);
    ohm.setAttribute('r',Math.max(70,22/scale));
    const hitStart=bladePoint(Math.max(45,zeroRadius+8),0), hitEnd=bladePoint(geometry.needleLength,0);
    hit.setAttribute('stroke-width',Math.max(22,44/scale));
    hit.setAttribute('d',`M${hitStart.x} ${hitStart.y} L${hitEnd.x} ${hitEnd.y}`);
  }
  new ResizeObserver(sizeHitTargets).observe(svg);
  new MutationObserver(sizeHitTargets).observe(svg,{attributes:true,attributeFilter:['viewBox']});
  sizeHitTargets();
  let needleAngle = 0, displayedAngle = 0, frame = 0;
  function setNeedleAngle(angle, animate = true) {
    if (!Number.isFinite(angle)) throw new TypeError("needleAngle harus angka finite.");
    const rotor = document.getElementById("needle-rotor");
    cancelAnimationFrame(frame);
    const from = displayedAngle;
    needleAngle = angle;
    // SVG rotate(angle cx cy) avoids CSS-origin ambiguity with a nonzero viewBox.
    const apply = value => {
      displayedAngle = value;
      rotor.setAttribute("transform", `rotate(${value} ${pivot.x} ${pivot.y})`);
    };
    if (!animate || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { apply(angle); return; }
    const start = performance.now();
    function step(now) {
      const t = Math.min(1, (now - start) / 240);
      apply(from + (angle - from) * (1 - (1 - t) ** 3));
      if (t < 1) frame = requestAnimationFrame(step);
    }
    frame = requestAnimationFrame(step);
  }
  return { setNeedleAngle, angleForScale, scaleAngleForNeedle, restAngle,
    get needleAngle() { return needleAngle; }, pivot };
})();
window.setNeedleAngle = window.AvoMeter.setNeedleAngle;
