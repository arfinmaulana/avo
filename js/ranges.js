"use strict";

// Range/multiplier mapping: local Sanwa manual, SCALE READING table.
window.AvoRanges = (() => {
  const number = value=>new Intl.NumberFormat('id-ID',{maximumFractionDigits:4}).format(value);
  const ranges = [
    ['dc01','DCV',.1,10,.01], ['dc025','DCV',.25,250,.001],
    ['dc2m5','DCV',2.5,250,.01], ['dc10','DCV',10,10,1],
    ['dc50','DCV',50,50,1], ['dc250','DCV',250,250,1], ['dc1000','DCV',1000,10,100],
    ['ac10','ACV',10,10,1], ['ac50','ACV',50,50,1],
    ['ac250','ACV',250,250,1], ['ac750','ACV',750,10,100],
    ['ohm1','OHM',null,null,1], ['ohm10','OHM',null,null,10],
    ['ohm100','OHM',null,null,100], ['ohm1k','OHM',null,null,1000],
    ['ohm100k','OHM',null,null,100000]
  ].map(([id,mode,max,scaleMax,multiplier]) => ({
    id,mode,max,scaleMax,multiplier,
    scale: mode==='OHM' ? 'ohm' : id==='ac10' ? 'ac10' : 'va',
    unit: mode==='OHM' ? 'Ω' : 'V'
  }));
  const byId = id => ranges.find(range=>range.id===id);
  const ohmValues = {'∞':Infinity,'2k':2000,'1k':1000};
  const anchors = scale => scale==='ohm' ? ohmReadingTicks() : scale==='ac10'
    ? AvoScale.tracedTickAngles.ac10.map((angle,i)=>({angle,value:i/5}))
    : window.AvoScale.scaleCalibration[scale].map(entry=>({
    angle:entry.angle, value: Object.hasOwn(ohmValues,entry.value) ? ohmValues[entry.value] : Number(entry.value)
  }));
  function ohmReadingTicks() {
    const landmarks=AvoScale.scaleCalibration.ohm;
    return AvoScale.ohmTickAngles.map(angle=>{
      const i=landmarks.findIndex(p=>p.angle>=angle);
      const b=landmarks[i], a=landmarks[Math.max(0,i-1)];
      const value=p=>Object.hasOwn(ohmValues,p.value)?ohmValues[p.value]:Number(p.value);
      if(b.angle===angle) return {angle,value:value(b)};
      const ticks=AvoScale.ohmTickAngles.filter(v=>v>=a.angle && v<=b.angle);
      return {angle,value:value(a)+(value(b)-value(a))*ticks.indexOf(angle)/(ticks.length-1)};
    });
  }
  function interpolate(points, value, input, output) {
    const sorted=points.filter(p=>Number.isFinite(p[input]) && Number.isFinite(p[output]))
      .sort((a,b)=>a[input]-b[input]);
    if (value<=sorted[0][input]) return sorted[0][output];
    if (value>=sorted.at(-1)[input]) return sorted.at(-1)[output];
    const right=sorted.findIndex(p=>p[input]>=value), a=sorted[right-1],b=sorted[right];
    return a[output]+(b[output]-a[output])*(value-a[input])/(b[input]-a[input]);
  }
  function scaleAngle(range,reading) {
    if (range.scale==='va') {
      const g=AvoScale.meterGeometry.scales.va;
      return g.start+(g.end-g.start)*reading/range.scaleMax;
    }
    return interpolate(anchors(range.scale),reading,'value','angle');
  }
  function needleAngle(range,reading) {
    return AvoMeter.angleForScale(scaleAngle(range,reading),AvoScale.meterGeometry.scales[range.scale].radius);
  }
  function readingAtAngle(range,angle) {
    const g=AvoScale.meterGeometry.scales[range.scale];
    const a=AvoMeter.scaleAngleForNeedle(angle,g.radius);
    if (range.scale==='va') return Math.max(0,Math.min(range.scaleMax,(a-g.start)/(g.end-g.start)*range.scaleMax));
    if(range.scale==='ohm' && a< AvoScale.ohmTickAngles[1]-1e-7) return Infinity;
    return interpolate(anchors(range.scale),a,'angle','value');
  }
  // Geometry is shared by family; V-A values are normalized until a range is read.
  const families = new Map();
  function scalePositions(scale) {
    if(families.has(scale)) return families.get(scale);
    const g=AvoScale.meterGeometry.scales[scale];
    const ticks=scale==='va'
      ? Array.from({length:51},(_,i)=>({angle:g.start+(g.end-g.start)*i/50,value:i/50}))
      : anchors(scale);
    const positions=[];
    ticks.forEach((p,i)=>{
      const add=(angle,reading,kind)=>{
        positions.push(Object.freeze({angle,reading,kind,activeScaleId:scale,
          needleAngle:AvoMeter.angleForScale(angle,g.radius)}));
      };
      add(p.angle,p.value,'tick');
      const next=ticks[i+1];
      // Midpoint of adjacent printed rays, never midpoint of distant labels.
      // Infinity–2k remains infinity under the existing local reading model.
      if(next) add((p.angle+next.angle)/2,(p.value+next.value)/2,'midpoint');
    });
    families.set(scale,Object.freeze(positions));
    return families.get(scale);
  }
  function legalNeedlePositions(range) {
    return scalePositions(range.scale).map(p=>({...p,
      reading:Number((p.reading*(range.scale==='va'?range.scaleMax:1)).toPrecision(12))}));
  }
  function nearestPosition(range,angle) {
    return legalNeedlePositions(range).reduce((a,b)=>
      Math.abs(b.needleAngle-angle)<Math.abs(a.needleAngle-angle)?b:a);
  }
  function allowedReadingPositions(range) {
    return legalNeedlePositions(range).filter(p=>Number.isFinite(p.reading) &&
      (range.mode==='OHM' ? p.reading>=2 && p.reading<=200 :
        p.reading>=range.scaleMax*.1 && p.reading<=range.scaleMax*.9 && p.reading*range.multiplier<=range.max));
  }
  function randomQuestion(mode, random=Math.random, positionMode='mixed') {
    if(!['tick','midpoint','mixed'].includes(positionMode)) throw new RangeError('Posisi soal tidak dikenal');
    const options=ranges.filter(range=>range.mode===mode);
    if (!options.length) throw new RangeError('Mode soal tidak dikenal');
    const range=options[Math.floor(random()*options.length)];
    const positions=allowedReadingPositions(range);
    const roll=random(), kind=positionMode==='mixed'?(roll<.5?'tick':'midpoint'):positionMode;
    const pool=positions.filter(p=>p.kind===kind);
    const fraction=positionMode==='mixed'?(kind==='tick'?roll*2:(roll-.5)*2):roll;
    const position=pool[Math.min(pool.length-1,Math.floor(fraction*pool.length))];
    return {rangeId:range.id,mode,...position,multiplier:range.multiplier,
      value:Number((position.reading*range.multiplier).toPrecision(12)),unit:range.unit};
  }
  // Educational bridge variation, not manufacturer calibration specifications.
  const ohmIdeal = {ohm1:-.35,ohm10:.15,ohm100:-.1,ohm1k:.4,ohm100k:-.5};
  return {number,ranges,byId,legalNeedlePositions,nearestPosition,allowedReadingPositions,randomQuestion,needleAngle,readingAtAngle,ohmIdeal};
})();
