"use strict";

// Small horizontal/upward drags in SVG units, independent of the camera view.
window.AvoAdjusters = {
  bind({element,min,max,step,sensitivity,getValue,onChange,onCommit=()=>{},reset=0}) {
    let drag=null;
    const localPoint=event=>new DOMPoint(event.clientX,event.clientY)
      .matrixTransform(element.ownerSVGElement.getScreenCTM().inverse());
    const change=value=>onChange(Math.max(min,Math.min(max,value)));
    element.addEventListener('pointerdown',event=>{
      if (event.button!==0 || drag || element.getAttribute('aria-disabled')==='true') return;
      event.preventDefault();
      drag={id:event.pointerId,start:localPoint(event),value:getValue()};
      element.setPointerCapture(event.pointerId);
      element.classList.add('dragging');
    });
    element.addEventListener('pointermove',event=>{
      if (!drag || drag.id!==event.pointerId) return;
      const p=localPoint(event);
      change(drag.value+((p.x-drag.start.x)-(p.y-drag.start.y))*sensitivity);
    });
    const finish=event=>{
      if (!drag || drag.id!==event.pointerId) return;
      const id=drag.id; drag=null; element.classList.remove('dragging');
      onCommit();
      if(element.hasPointerCapture(id)) element.releasePointerCapture(id);
    };
    ['pointerup','pointercancel','lostpointercapture'].forEach(type=>element.addEventListener(type,finish));
    element.addEventListener('keydown',event=>{
      if(element.getAttribute('aria-disabled')==='true') return;
      if(['ArrowRight','ArrowUp','ArrowLeft','ArrowDown','Home'].includes(event.key)) {
        event.preventDefault();
        change(event.key==='Home' ? reset : getValue()+(['ArrowRight','ArrowUp'].includes(event.key)?step:-step));
        onCommit();
      }
    });
    element.addEventListener('dblclick',()=>{
      if(element.getAttribute('aria-disabled')!=='true') { change(reset); onCommit(); }
    });
  }
};
