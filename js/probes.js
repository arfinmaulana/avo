"use strict";

// Visual feedback for the existing shortProbes state, never a measurement input.
window.AvoProbes = (() => {
  const radians=-5*Math.PI/180;
  const probes=[
    {node:document.getElementById('red-probe'),tip:{x:714,y:246},rest:{x:714,y:246,angle:0},short:{x:746,y:244,angle:5}},
    {node:document.getElementById('black-probe'),tip:{x:765,y:266},
      rest:{x:765-(266-515)*Math.sin(radians),y:515+(266-515)*Math.cos(radians),angle:-5},
      short:{x:746,y:244,angle:-5}}
  ];
  const contact=document.getElementById('probe-contact');
  let target=false, frame=0;
  probes.forEach(p=>p.current={...p.rest});
  function apply(probe,pose) {
    probe.current=pose;
    probe.node.setAttribute('transform',`translate(${pose.x-probe.tip.x} ${pose.y-probe.tip.y}) rotate(${pose.angle} ${probe.tip.x} ${probe.tip.y})`);
  }
  function render(shorted) {
    if(target===shorted) return;
    target=shorted; cancelAnimationFrame(frame);
    contact.setAttribute('opacity','0');
    const from=probes.map(p=>({...p.current})), to=probes.map(p=>shorted?p.short:p.rest);
    const complete=()=>{probes.forEach((p,i)=>apply(p,to[i]));contact.setAttribute('opacity',shorted?'1':'0');};
    if(matchMedia('(prefers-reduced-motion: reduce)').matches) {complete();return;}
    const start=performance.now();
    const step=now=>{
      const t=Math.min(1,(now-start)/320), eased=t*t*(3-2*t);
      probes.forEach((p,i)=>apply(p,Object.fromEntries(['x','y','angle'].map(k=>[k,from[i][k]+(to[i][k]-from[i][k])*eased]))));
      if(t<1) frame=requestAnimationFrame(step); else complete();
    };
    frame=requestAnimationFrame(step);
  }
  return {render};
})();
