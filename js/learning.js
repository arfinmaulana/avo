"use strict";

// Independent teaching needle; range selection belongs to the shared selector engine.
window.AvoLearning = (() => {
  const $=id=>document.getElementById(id), S=AvoScale, R=AvoRanges, number=R.number;
  const state={mode:'simulator',rangeId:AvoSelector.activeDetent.id,scaleMaximum:10,scaleMaximums:[10],angle:7};
  const svg=$('learning-svg'), hit=$('learning-hit'), root=$('learning-scale');
  const simulatorNodes=[document.querySelector('.avo-display'),$('view-toggle'),
    document.querySelector('[aria-labelledby="practice-title"]'),
    document.querySelector('[aria-labelledby="explanation-title"]'),$('adjuster-help')];
  const range=()=>R.byId(state.rangeId);
  const positions=()=>range()?R.legalNeedlePositions(range()):[];
  const fullScale=r=>r.scaleMax*r.multiplier;
  // Reference angles stay clockwise from twelve o'clock (polar theta = angle - 90).
  // All isolated families share the V-A reference radius and the fitted center.
  // Only their traced angular positions / label layers change, never the camera.
  const learningGeometry=Object.freeze({centerX:S.meterGeometry.centerX,
    centerY:S.meterGeometry.centerY,arcRadius:S.meterGeometry.scales.va.radius,
    needleRadius:S.meterGeometry.scales.va.radius+3,
    viewBox:'20 -40 815 655'});
  const pivot=()=>({x:learningGeometry.centerX,y:learningGeometry.centerY});
  const point=(radius,angle)=>S.point(radius,angle,learningGeometry.centerX,learningGeometry.centerY);
  function radialLabel(parent,radius,angle,value,size,color) {
    const p=point(radius,angle);
    const label=S.element('text',{x:p.x,y:p.y,fill:color,'font-size':size,
      'font-weight':600,'text-anchor':'middle','dominant-baseline':'central',
      transform:`rotate(${angle} ${p.x} ${p.y})`,'data-angle':angle,'data-radius':radius},parent);
    label.textContent=value;
  }
  svg.setAttribute('viewBox',learningGeometry.viewBox);
  function needlePoint(angle=state.angle,fraction=1) {
    return point(learningGeometry.arcRadius*fraction,angle);
  }
  const nearest=angle=>positions().reduce((a,b)=>Math.abs(b.angle-angle)<Math.abs(a.angle-angle)?b:a);
  const unit=value=> !Number.isFinite(value)?'∞ Ω':value>=1e6?`${number(value/1e6)} MΩ`:
    value>=1000?`${number(value/1000)} kΩ`:`${number(value)} Ω`;
  const multiplier=value=>`×${value>=1000?number(value/1000)+'K':number(value)}`;
  const clean=value=>Number.isFinite(value)?Number(value.toPrecision(12)):value;
  function getReading() {
    const r=range(); if(!r) return null;
    const g=S.meterGeometry.scales[r.scale];
    const relativePosition=(state.angle-g.start)/(g.end-g.start);
    const reading=r.scale==='va'?relativePosition*state.scaleMaximum:
      R.readingAtAngle(r,AvoMeter.angleForScale(state.angle,g.radius));
    const factor=r.scale==='va'?fullScale(r)/state.scaleMaximum:r.multiplier;
    return {reading:clean(reading),value:clean(r.scale==='va'?relativePosition*fullScale(r):reading*factor),
      readings:r.scale==='va'?state.scaleMaximums.map(maximum=>({maximum,reading:clean(relativePosition*maximum),factor:fullScale(r)/maximum})):null,
      factor,relativePosition:r.scale==='va'?clean(relativePosition):null};
  }
  function drawScale() {
    const r=range(); root.replaceChildren(); root.dataset.scale=r?.scale||'';
    if(!r) return;
    const g=S.meterGeometry.scales[r.scale], ps=positions().filter(p=>p.kind==='tick');
    const color=r.scale==='ohm'?'#8e472c':r.scale==='ac10'?'#a43c58':'#354137';
    const radius=learningGeometry.arcRadius;
    const a=point(radius,ps[0].angle), b=point(radius,ps.at(-1).angle);
    S.element('path',{d:`M${a.x} ${a.y} A${radius} ${radius} 0 0 1 ${b.x} ${b.y}`,fill:'none',stroke:color,'stroke-width':2.5},root);
    ps.forEach((p,i)=>{
      const length=r.scale==='ohm'?S.ohmTicks[i].length:i%10===0?18:i%5===0?13:8;
      S.tick(root,radius,p.angle,r.scale==='va'?-length:length,color,2,learningGeometry.centerX,learningGeometry.centerY);
    });
    if(r.scale==='va') {
      [...state.scaleMaximums].sort((a,b)=>b-a).forEach((maximum,row)=>{
        const layer=S.element('g',{'data-maximum':maximum},root);
        for(let i=0;i<=5;i++) radialLabel(layer,radius-38-row*36,
          g.start+(g.end-g.start)*i/5,number(maximum*i/5),24,color);
      });
    } else S.scaleCalibration[r.scale].forEach((p,i)=>radialLabel(root,
      radius+(r.scale==='ohm'?([36,70,54,36][i]||30):38),
      p.angle,p.value,r.scale==='ohm'&&i<4?19:26,color));
  }
  function render() {
    const r=range(), result=getReading();
    $('learning-full').textContent=r?(r.mode==='OHM'?`Ω ${multiplier(r.multiplier)}`:`${r.mode} ${number(r.max)} V`):AvoSelector.activeDetent.label;
    // Visibility preserves the fixed SVG region even at OFF / unsupported ranges.
    svg.style.visibility=r?'visible':'hidden'; svg.setAttribute('aria-hidden',String(!r));
    hit.setAttribute('tabindex',r?'0':'-1'); $('learning-unavailable').hidden=!!r;
    $('learning-scales').hidden=r?.scale!=='va';
    if(!r) {
      for(const id of ['learning-reading','learning-factor','learning-result','learning-formula','learning-original']) $(id).textContent='—';
      $('learning-relative-row').hidden=true;
      $('learning-note').textContent='Pilih DCV, ACV, atau Ω melalui selector. Fungsi lain belum tersedia.';
      $('workspace-title').textContent=state.mode==='learning'?'BELAJAR SKALA':'AVOMETER ANALOG';
      return;
    }
    const p=pivot(), tip=needlePoint(), dx=tip.x-p.x, dy=tip.y-p.y, length=Math.hypot(dx,dy);
    const end=point(learningGeometry.needleRadius,state.angle), start=needlePoint(state.angle,24/length);
    const side=(distance,width)=>({x:p.x+dx*distance/length-dy*width/length,y:p.y+dy*distance/length+dx*width/length});
    const blade=[side(0,-2.2),side(length+1,-.7),end,side(length+1,.7),side(0,2.2)];
    $('learning-needle').setAttribute('d',blade.map((v,i)=>`${i?'L':'M'}${v.x} ${v.y}`).join(' ')+'Z');
    $('learning-pivot').setAttribute('cx',p.x); $('learning-pivot').setAttribute('cy',p.y);
    hit.setAttribute('d',`M${start.x} ${start.y} L${end.x} ${end.y}`);
    const ps=positions(), percent=(state.angle-ps[0].angle)/(ps.at(-1).angle-ps[0].angle)*100;
    hit.setAttribute('aria-valuenow',number(percent).replace(',','.'));
    hit.setAttribute('aria-valuetext',`Baca ${number(result.reading)}; hasil ${r.mode==='OHM'?unit(result.value):number(result.value)+' V'}`);
    $('learning-scales').hidden=r.scale!=='va';
    document.querySelectorAll('[data-learning-scale]').forEach(b=>b.setAttribute('aria-pressed',String(state.scaleMaximums.includes(Number(b.dataset.learningScale)))));
    $('workspace-title').textContent=state.mode==='learning'?(r.scale==='ohm'?'SKALA Ω':r.scale==='ac10'?'SKALA AC10V':'SKALA V–A'):'AVOMETER ANALOG';
    $('learning-original').textContent='Skala alat asli: '+(r.scale==='ohm'?`Ω ${multiplier(r.multiplier)}`:
      `${r.scale==='ac10'?'AC10V':'V–A'} · 0–${r.scaleMax} ×${number(r.multiplier)}`);
    $('learning-relative-row').hidden=r.scale!=='va';
    $('learning-relative').textContent=`${number(result.relativePosition*100)} %`;
    $('learning-reading').textContent=result.readings?result.readings.map(v=>`${number(v.reading)} (0–${v.maximum})`).join(' · '):number(result.reading)+(r.scale==='ohm'?' Ω':'');
    $('learning-factor').textContent=result.readings?result.readings.map(v=>`×${number(v.factor)} (0–${v.maximum})`).join(' · '):`× ${number(result.factor)}`;
    $('learning-result').textContent=r.mode==='OHM'?unit(result.value):`${number(result.value)} V`;
    $('learning-formula').textContent=r.scale==='va'?result.readings.map(v=>`${number(v.reading)} / ${v.maximum} × ${number(fullScale(r))} V = ${number(result.value)} V`).join('\n'):
      `${number(result.reading)} × ${number(result.factor)} = ${r.mode==='OHM'?unit(result.value):number(result.value)+' V'}`;
    $('learning-note').textContent=r.scale==='ohm'?'Skala Ω terbalik dan nonlinier. Pada alat asli, short probe lalu atur 0 Ω setiap berganti range; demonstrasikan Ω ADJ di Simulator AVO.':
      r.scale==='ac10'?'Range 10 V memakai skala AC10V khusus sesuai manual; jarak tick tidak seragam.':
      r.max!==fullScale(r)?'ACV 750: skala alat asli 0–10 ×100; batas range 750 V pada angka 7,5.'+(result.value>r.max?' Posisi jarum melampaui range.':''):
      'Range menentukan nilai ujung kanan. Ganti skala tampil: posisi jarum dan hasil tetap sama.';
    sizeHit();
  }
  function sizeHit() {
    const m=svg.getScreenCTM(), scale=m&&Math.hypot(m.a,m.b);
    if(scale) hit.setAttribute('stroke-width',Math.max(24,44/scale));
  }
  function setRange(id) {
    if(!R.byId(id)) throw new RangeError('Range tidak dikenal');
    AvoSelector.selectDetent(id);
  }
  document.addEventListener('selectorchange',event=>{
    if(drag!==null) finish({pointerId:drag});
    const previous=range(); state.rangeId=event.detail.id;
    if(range() && previous?.scale!==range().scale) state.angle=nearest(state.angle).angle;
    drawScale(); render();
  });
  function setScales(maximums) {
    if(!Array.isArray(maximums)||!maximums.length||maximums.some(v=>![10,50,250].includes(v))) throw new RangeError('Minimal satu skala valid');
    state.scaleMaximums=[...new Set(maximums)].sort((a,b)=>a-b);
    state.scaleMaximum=state.scaleMaximums[0]; drawScale(); render();
  }
  // Retain the single-layer developer API; UI uses independent toggles.
  function setScale(maximum) { setScales([maximum]); }
  function toggleScale(maximum) {
    if(state.scaleMaximums.includes(maximum)) {
      if(state.scaleMaximums.length>1) setScales(state.scaleMaximums.filter(v=>v!==maximum));
    } else setScales([...state.scaleMaximums,maximum]);
  }
  function setAngle(angle,transient=false) {
    if(!Number.isFinite(angle)) throw new TypeError('Sudut harus finite');
    if(!range()) return;
    const ps=positions(); state.angle=Math.max(ps[0].angle,Math.min(ps.at(-1).angle,angle));
    if(!transient) state.angle=nearest(state.angle).angle;
    render();
  }
  let drag=null;
  function finish(event) {
    if(drag!==event.pointerId) return;
    drag=null; setAngle(state.angle);
    if(hit.hasPointerCapture(event.pointerId)) hit.releasePointerCapture(event.pointerId);
  }
  function setMode(mode) {
    if(!['learning','simulator'].includes(mode)) throw new RangeError('Mode tidak dikenal');
    if(drag!==null) finish({pointerId:drag});
    state.mode=mode; const learning=mode==='learning';
    AvoSelector.mountLearning(learning);
    simulatorNodes.forEach(node=>node.hidden=learning);
    ['learning-display','learning-controls','learning-explanation'].forEach(id=>$(id).hidden=!learning);
    document.querySelector('.avo-workspace').classList.toggle('is-learning',learning);
    const caption=document.querySelector('.workspace-caption');
    (learning?$('learning-display'):document.querySelector('.avo-workspace')).append(caption);
    $('mode-learning').setAttribute('aria-pressed',String(learning));
    $('mode-simulator').setAttribute('aria-pressed',String(!learning)); render();
  }
  const pointerAngle=event=>{
    const p=new DOMPoint(event.clientX,event.clientY).matrixTransform(svg.getScreenCTM().inverse());
    const origin=pivot(), vx=p.x-origin.x, vy=p.y-origin.y;
    return Math.hypot(vx,vy)<1e-6?state.angle:Math.atan2(vx,-vy)*180/Math.PI;
  };
  hit.addEventListener('pointerdown',event=>{
    if(!range()||!event.isPrimary||event.button!==0||drag!==null) return;
    event.preventDefault(); drag=event.pointerId; hit.setPointerCapture(drag); setAngle(pointerAngle(event),true);
  });
  hit.addEventListener('pointermove',event=>{if(drag===event.pointerId) setAngle(pointerAngle(event),true);});
  ['pointerup','pointercancel','lostpointercapture'].forEach(type=>hit.addEventListener(type,finish));
  hit.addEventListener('touchstart',event=>event.preventDefault(),{passive:false});
  hit.addEventListener('dragstart',event=>event.preventDefault());
  hit.addEventListener('keydown',event=>{
    if(!range()||!['ArrowLeft','ArrowDown','ArrowRight','ArrowUp','Home','End'].includes(event.key)) return;
    event.preventDefault(); const ps=positions(), forward=['ArrowRight','ArrowUp'].includes(event.key);
    const next=forward?ps.find(p=>p.angle>state.angle+1e-7):ps.findLast(p=>p.angle<state.angle-1e-7);
    setAngle(event.key==='Home'?ps[0].angle:event.key==='End'?ps.at(-1).angle:next?.angle??state.angle);
  });
  document.querySelectorAll('[data-learning-scale]').forEach(b=>b.addEventListener('click',()=>toggleScale(Number(b.dataset.learningScale))));
  $('mode-learning').addEventListener('click',()=>setMode('learning'));
  $('mode-simulator').addEventListener('click',()=>setMode('simulator'));
  new ResizeObserver(sizeHit).observe(svg);
  drawScale(); render();
  return {get state(){return {...state,scaleMaximums:[...state.scaleMaximums]};},learningGeometry,getReading,setMode,setRange,setScale,setScales,toggleScale,setAngle,needlePoint};
})();
