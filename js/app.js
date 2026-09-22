"use strict";

// Development-only comparison. No raster nodes are created when false.
const DEBUG_REFERENCE = false;
const DEBUG_REFERENCE_LAYER = "scale"; // "body", "scale", or "selector"

window.AvoScale.render();
window.AvoSelector.render();
window.AvoApp = (() => {
  const FULL_VIEWBOX = "165 80 680 850", FOCUS_VIEWBOX = "197 141 480 380";
  const state = {selectedQuizMode:'DCV',questionPositionMode:'mixed',activeSelectorDetent:'off',mechanicalZeroOffset:0,
    needleAngle:0,ohmAdjustOffset:0,currentQuestion:null,focusView:false,revealAnswer:false,shortProbes:false};
  const $ = id=>document.getElementById(id);
  const range = ()=>AvoRanges.byId(state.activeSelectorDetent);
  const isOhm = ()=>range()?.mode==='OHM';
  const ohmZero = AvoRanges.needleAngle(AvoRanges.byId('ohm1'),0);
  const ohmInfinity = AvoMeter.angleForScale(AvoScale.scaleCalibration.ohm[0].angle,
    AvoScale.meterGeometry.scales.ohm.radius);
  const ohmError = ()=>isOhm() ? (state.ohmAdjustOffset-AvoRanges.ohmIdeal[state.activeSelectorDetent])*8 : 0;
  const isOhmCalibrated = ()=>isOhm() && Math.abs(ohmError()+state.mechanicalZeroOffset)<.025;
  const number = value=>new Intl.NumberFormat('id-ID',{maximumFractionDigits:4}).format(value);
  function desiredAngle() {
    return state.shortProbes ? ohmZero+ohmError()+state.mechanicalZeroOffset : state.needleAngle;
  }
  function getReading() {
    const r=range();
    if (!r || state.shortProbes) return null;
    const raw=AvoRanges.readingAtAngle(r,state.needleAngle);
    const reading=Number.isFinite(raw)?Number(raw.toPrecision(12)):raw;
    return {reading,value:reading*r.multiplier,unit:r.unit,multiplier:r.multiplier,
      approximate:Number.isFinite(raw) && Math.abs(raw-Number(raw.toFixed(4)))>1e-8,
      overRange:r.mode!=='OHM' && reading*r.multiplier>r.max+1e-8};
  }
  function normalizeNeedle() {
    if(range()) state.needleAngle=AvoRanges.nearestPosition(range(),state.needleAngle).needleAngle;
  }
  function setManualNeedle(angle, transient=false) {
    if(!Number.isFinite(angle)) throw new TypeError('Sudut harus finite');
    if(state.shortProbes) return;
    state.needleAngle=Math.max(ohmInfinity,Math.min(ohmZero,angle));
    if(!transient) normalizeNeedle();
    state.currentQuestion=null;
    render(false);
  }
  function renderAnswer() {
    $('reading-explanation').hidden=!state.revealAnswer;
    $('check-answer').setAttribute('aria-expanded',String(state.revealAnswer));
    const result=getReading(), r=range();
    const ready=!!result;
    const values=ready ? [AvoSelector.activeDetent.label,
      r.scale==='ohm' ? 'Ω (nonlinier)' : r.scale==='ac10' ? 'AC10V · 0–10' : `V–A · 0–${r.scaleMax}`,
      `${result.approximate ? '≈ ' : ''}${number(result.reading)}`,`× ${number(r.multiplier)}`,
      `${result.approximate ? '≈ ' : ''}${number(result.value)} ${r.unit}`] : ['-','-','-','-','-'];
    ['range','scale','reading','multiplier','result'].forEach((key,i)=>$('answer-'+key).textContent=values[i]);
    $('answer-explanation').textContent = state.shortProbes ? 'OHM KALIBRASI: short probe, putar Ω ADJ ke 0 Ω. Kembali ke OHM BACA untuk membaca resistansi.'
      : !r ? 'Pilih range DCV, ACV, atau Ω pada selector, lalu seret jarum atau tekan ACAK SOAL.'
      : `${number(result.reading)} × ${number(r.multiplier)} = ${number(result.value)} ${r.unit}. Faktor range mengubah baca skala menjadi hasil ukur.`+
        (result.approximate ? ' ≈ Pembacaan manual dibulatkan.' : '')+
        (result.overRange ? ' Posisi jarum melampaui range yang dipilih.' : '');
  }

  function render(animate=true) {
    const ohm=isOhm(), calibrated=isOhmCalibrated();
    $('active-range').textContent=AvoSelector.activeDetent.label;
    $('quiz-mode').value=state.selectedQuizMode;
    $('question-position').value=state.questionPositionMode;
    $('ohm-controls').hidden=!ohm;
    $('probe-toggle').textContent=state.shortProbes ? 'KEMBALI KE OHM BACA' : 'DEMO KALIBRASI';
    $('probe-toggle').disabled=false;
    $('ohm-status').textContent=state.shortProbes
      ? calibrated ? 'OHM KALIBRASI · short probe · 0 Ω tepat.'
        : `OHM KALIBRASI · short probe · putar Ω ADJ ke 0 Ω.${state.focusView ? ' Gunakan AVO PENUH.' : ''}`
      : 'OHM BACA · kalibrasi dianggap benar. Baca skala Ω × faktor range.';
    $('needle-hit').setAttribute('aria-disabled',String(state.shortProbes));
    $('needle-hit').setAttribute('aria-valuenow',desiredAngle().toFixed(2));
    $('mechanical-adjuster').setAttribute('aria-valuenow',state.mechanicalZeroOffset.toFixed(2));
    $('mechanical-adjuster').setAttribute('aria-valuetext',`${number(state.mechanicalZeroOffset)} derajat dari nol mekanis`);
    $('zero-screw-rotor').setAttribute('transform',`rotate(${state.mechanicalZeroOffset*25} 430 490)`);
    $('ohm-adjust').setAttribute('aria-disabled',String(!ohm || !state.shortProbes));
    $('ohm-adjust').setAttribute('tabindex',ohm && state.shortProbes && !state.focusView ? '0' : '-1');
    $('ohm-adjust').setAttribute('aria-valuenow',state.ohmAdjustOffset.toFixed(3));
    $('ohm-adjust').setAttribute('aria-valuetext',calibrated ? '0 ohm terkalibrasi' : 'Putar sampai jarum di 0 ohm');
    $('ohm-adjust-rotor').setAttribute('transform',`rotate(${state.ohmAdjustOffset*135} 624 548)`);
    setNeedleAngle(desiredAngle(),animate);
    renderAnswer();
  }
  function setMechanicalZero(value, transient=false) {
    if(!Number.isFinite(value)) throw new TypeError('Offset harus finite');
    const next=Math.max(-3,Math.min(3,value));
    state.needleAngle+=next-state.mechanicalZeroOffset;
    state.mechanicalZeroOffset=next;
    if(!transient) normalizeNeedle();
    render(false);
  }
  function finishMechanicalZero() { normalizeNeedle(); render(false); }
  function setOhmAdjustment(value) {
    if(!Number.isFinite(value)) throw new TypeError('Offset harus finite');
    if(!isOhm() || !state.shortProbes) return;
    state.ohmAdjustOffset=Math.max(-1,Math.min(1,value));
    // A small magnetic tolerance makes exact zero practical with a mouse/touch.
    if(state.shortProbes && Math.abs(ohmError()+state.mechanicalZeroOffset)<.1) {
      state.ohmAdjustOffset=AvoRanges.ohmIdeal[state.activeSelectorDetent]-state.mechanicalZeroOffset/8;
    }
    render(false);
  }
  function setQuizMode(mode) {
    if(!['DCV','ACV','OHM'].includes(mode)) throw new RangeError('Mode tidak dikenal');
    state.selectedQuizMode=mode; $('quiz-mode').value=mode;
  }
  function randomize() {
    const question=AvoRanges.randomQuestion(state.selectedQuizMode,Math.random,state.questionPositionMode);
    AvoSelector.selectDetent(question.rangeId);
    state.currentQuestion=question; state.revealAnswer=false;
    state.shortProbes=false; state.needleAngle=question.needleAngle;
    render(); return structuredClone(question);
  }
  function toggleProbes() {
    if(!isOhm()) return;
    state.shortProbes=!state.shortProbes; state.revealAnswer=false; render();
  }
  function setFocusView(focused) {
    state.focusView=!!focused;
    document.querySelector('.avo-svg').setAttribute('viewBox',focused ? FOCUS_VIEWBOX : FULL_VIEWBOX);
    document.querySelector('.avo-stage').classList.toggle('is-focused',focused);
    document.querySelectorAll('[data-detent]').forEach(node=>node.setAttribute('tabindex',focused?'-1':'0'));
    $('view-toggle').setAttribute('aria-pressed',String(focused));
    $('view-toggle').textContent=focused ? 'AVO PENUH' : 'FOKUS SKALA';
    render(false);
  }
  function revealAnswer() { state.revealAnswer=true; renderAnswer(); }
  function setQuestionPositionMode(mode) {
    if(!['tick','midpoint','mixed'].includes(mode)) throw new RangeError('Posisi soal tidak dikenal');
    state.questionPositionMode=mode; $('question-position').value=mode;
  }
  function resetInstrument() {
    needleDrag=null;
    AvoSelector.selectDetent('off',false);
    Object.assign(state,{needleAngle:0,mechanicalZeroOffset:0,ohmAdjustOffset:0,
      currentQuestion:null,revealAnswer:false,shortProbes:false});
    render(false);
  }
  document.addEventListener('selectorchange',event=>{
    state.activeSelectorDetent=event.detail.id;
    state.currentQuestion=null; state.revealAnswer=false; state.shortProbes=false;
    normalizeNeedle(); render();
  });
  AvoAdjusters.bind({element:$('mechanical-adjuster'),min:-3,max:3,step:.1,sensitivity:.025,
    getValue:()=>state.mechanicalZeroOffset,onChange:value=>setMechanicalZero(value,true),onCommit:finishMechanicalZero});
  AvoAdjusters.bind({element:$('ohm-adjust'),min:-1,max:1,step:.01,sensitivity:.005,
    getValue:()=>state.ohmAdjustOffset,onChange:setOhmAdjustment});
  // Pointer coordinates use the same SVG matrix in full and focus views.
  const hit=$('needle-hit'), svg=document.querySelector('.avo-svg');
  // SVG graphics do not consistently establish a CSS touch-action region.
  // Suppress only native gestures starting on draggable controls; all movement,
  // capture and state still use the shared Pointer Events handlers below.
  [hit,$('selector-knob'),$('mechanical-adjuster'),$('ohm-adjust')].forEach(control=>{
    control.addEventListener('touchstart',event=>{
      if(control.getAttribute('aria-disabled')!=='true') event.preventDefault();
    },{passive:false});
    control.addEventListener('dragstart',event=>event.preventDefault());
  });
  let needleDrag=null;
  const pointerAngle=event=>{
    const p=new DOMPoint(event.clientX,event.clientY).matrixTransform(svg.getScreenCTM().inverse());
    return Math.atan2(p.x-AvoMeter.pivot.x,AvoMeter.pivot.y-p.y)*180/Math.PI-AvoMeter.restAngle;
  };
  hit.addEventListener('pointerdown',event=>{
    if(!event.isPrimary || event.button!==0 || needleDrag!==null || state.shortProbes) return;
    event.preventDefault(); needleDrag=event.pointerId; hit.setPointerCapture(event.pointerId);
    setManualNeedle(pointerAngle(event),true);
  });
  hit.addEventListener('pointermove',event=>{
    if(needleDrag===event.pointerId) setManualNeedle(pointerAngle(event),true);
  });
  const finish=event=>{
    if(needleDrag!==event.pointerId) return;
    needleDrag=null;
    normalizeNeedle(); render(false);
    if(hit.hasPointerCapture(event.pointerId)) hit.releasePointerCapture(event.pointerId);
  };
  ['pointerup','pointercancel','lostpointercapture'].forEach(type=>hit.addEventListener(type,finish));
  hit.addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowDown','ArrowRight','ArrowUp','Home','End'].includes(event.key)) return;
    event.preventDefault();
    const positions=range()?AvoRanges.legalNeedlePositions(range()):null;
    const direction=['ArrowRight','ArrowUp'].includes(event.key)?1:-1;
    const adjacent=positions?.filter(p=>direction*(p.needleAngle-state.needleAngle)>1e-7);
    const next=direction>0?adjacent?.[0]:adjacent?.at(-1);
    setManualNeedle(event.key==='Home'?(positions?.[0].needleAngle??0):event.key==='End'?(positions?.at(-1).needleAngle??ohmZero):
      next?.needleAngle??(positions?state.needleAngle:state.needleAngle+direction*.2));
  });
  $('view-toggle').addEventListener('click',()=>setFocusView(!state.focusView));
  $('quiz-mode').addEventListener('change',event=>setQuizMode(event.target.value));
  $('question-position').addEventListener('change',event=>setQuestionPositionMode(event.target.value));
  $('reset-instrument').addEventListener('click',resetInstrument);
  $('random-question').addEventListener('click',randomize);
  $('check-answer').addEventListener('click',revealAnswer);
  $('probe-toggle').addEventListener('click',toggleProbes);
  setSelectorAngle(0,false); render(false);
  return {get state(){return {...structuredClone(state),activeScaleId:range()?.scale??null};},setQuizMode,setQuestionPositionMode,resetInstrument,randomize,setMechanicalZero,
    setManualNeedle,setOhmAdjustment,toggleProbes,setFocusView,revealAnswer,isOhmCalibrated,getReading};
})();

if (DEBUG_REFERENCE) {
  const placements = {
    body: { href: "./assets/img/avo-body.jpg", x: 0, y: 0, width: 1000, height: 1000 },
    scale: { href: "./assets/img/meter-scale.png", x: 209, y: 158, width: 447.15, height: 232.65 },
    selector: { href: "./assets/img/selector-reference.png", x: 225, y: 549, width: 429.8, height: 302.7 }
  };
  window.AvoScale.element("image", { ...placements[DEBUG_REFERENCE_LAYER], opacity: .4, "pointer-events": "none", preserveAspectRatio: "none" }, document.getElementById("reference-overlay"));
}
