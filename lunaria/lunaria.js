(() => {
  const dishes = {
    margherita:{name:'Margherita Lunaria',pins:[
      [31,30,'Basilico','Le foglie intere profumano al contatto con la pizza calda.'],
      [71,47,'Fior di latte','Lo lasciamo scolare prima di spezzarlo a mano.'],
      [59,73,'San Marzano','Il pomodoro si apre sotto i polpastrelli e resta a pezzi nella salsa.']
    ]},
    oro:{name:'Oro del Vesuvio',pins:[
      [57,30,'Pomodorino giallo','Una parte diventa crema, una parte resta intera.'],
      [33,48,'Ricotta di bufala','Piccoli ciuffi freschi addolciscono la punta acida del pomodoro.'],
      [62,61,'Olio extravergine','Lo versiamo a filo quando la pizza esce dal forno.']
    ]},
    selva:{name:'Selva',pins:[
      [40,35,'Friarielli','Ripassati in padella, con una nota amara che resta nel morso.'],
      [63,54,'Salsiccia','Sbriciolata in piccoli bocconi tra le foglie dei friarielli.'],
      [39,69,'Provola','Fonde sotto il condimento e porta un profumo leggermente affumicato.']
    ]}
  };
  const one=s=>document.querySelector(s);
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const pins=one('#ingredient-pins'),note=one('#ingredient-note'),art=one('#plate-art'),photo=one('#menu-pizza');
  let selected='margherita',activePin=null,switchAnimation,transitionVersion=0;
  function closeNote(){
    if(activePin)activePin.setAttribute('aria-expanded','false');
    note.hidden=true;activePin=null;
  }
  function showIngredients(key){
    closeNote();pins.replaceChildren();
    dishes[key].pins.forEach(([x,y,name,detail])=>{
      const b=document.createElement('button');b.type='button';b.className='pin';
      b.textContent='+';b.style.left=x+'%';b.style.top=y+'%';
      b.setAttribute('aria-label','Scopri '+name);b.setAttribute('aria-controls','ingredient-note');b.setAttribute('aria-expanded','false');
      b.addEventListener('click',()=>{
        const alreadyOpen=activePin===b;closeNote();if(alreadyOpen)return;
        const title=document.createElement('b'),body=document.createElement('span');
        title.textContent=name+'. ';body.textContent=detail;note.replaceChildren(title,body);
        activePin=b;b.setAttribute('aria-expanded','true');note.hidden=false;
      });
      pins.append(b);
    });
  }
  async function changeDish(key){
    if(key===selected)return;
    const version=++transitionVersion;
    const next=dishes[key];selected=key;document.body.dataset.pizzaKey=key;document.body.dataset.pizza=next.name;
    document.querySelectorAll('[data-dish]').forEach(button=>{
      const active=button.dataset.dish===key;
      button.setAttribute('aria-expanded',String(active));one('#'+button.getAttribute('aria-controls')).hidden=!active;
    });
    document.dispatchEvent(new CustomEvent('lunaria:pizza',{detail:{key,name:next.name}}));
    closeNote();pins.replaceChildren();switchAnimation?.cancel();
    const newSrc='./assets/'+key+'.webp',buffer=new Image();buffer.src=newSrc;
    const ready=buffer.decode().catch(()=>{});
    if(!reduced.matches){
      switchAnimation=art.animate([{transform:'rotate(-8deg) scale(1)',opacity:1},{transform:'rotate(-24deg) scale(.86)',opacity:.06}],{duration:195,easing:'ease-in',fill:'forwards'});
      await Promise.all([switchAnimation.finished.catch(()=>{}),ready]);
    }else await ready;
    if(version!==transitionVersion)return;
    photo.src=newSrc;photo.alt=next.name;switchAnimation?.cancel();
    if(!reduced.matches)switchAnimation=art.animate([{transform:'rotate(10deg) scale(.89)',opacity:.1},{transform:'rotate(-8deg) scale(1)',opacity:1}],{duration:560,easing:'cubic-bezier(.16,.88,.25,1)'});
    showIngredients(key);
  }
  document.querySelectorAll('[data-dish]').forEach(b=>b.onclick=()=>changeDish(b.dataset.dish));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&activePin){const trigger=activePin;closeNote();trigger.focus({preventScroll:true})}});
  document.addEventListener('pointerdown',e=>{if(activePin&&!e.target.closest('#menu-plate'))closeNote()});
  showIngredients(selected);
  const wipe=one('#eclipse-wipe'),hero=one('.hero');
  let changing=false;
  document.querySelectorAll('[data-eclipse]').forEach(a=>a.addEventListener('click',e=>{
    if(reduced.matches||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey||e.button!==0)return;
    e.preventDefault();if(changing)return;changing=true;wipe.classList.add('active');
    setTimeout(()=>{
      if(location.hash!=='#carta')history.pushState(null,'','#carta');
      const menu=one('#carta');menu.scrollIntoView({behavior:'instant',block:'start'});menu.tabIndex=-1;menu.focus({preventScroll:true});
    },365);
    setTimeout(()=>{wipe.classList.remove('active');changing=false},875);
  }));
  let queued=false;
  function setTravel(){queued=false;const y=hero.getBoundingClientRect().top;const p=reduced.matches?0:Math.min(1,Math.max(0,(-y+one('.mast').offsetHeight)/hero.offsetHeight));hero.style.setProperty('--scroll',p.toFixed(3))}
  window.addEventListener('scroll',()=>{if(!queued){queued=true;requestAnimationFrame(setTravel)}},{passive:true});
  reduced.addEventListener('change',setTravel);
  if(!reduced.matches){
    const reveal=new IntersectionObserver(entries=>{
      for(const entry of entries)if(entry.isIntersecting){
        entry.target.animate([{transform:'translateY(17px)',opacity:.5},{transform:'translateY(0)',opacity:1}],{duration:700,easing:'cubic-bezier(.18,.75,.22,1)'});
        reveal.unobserve(entry.target);
      }
    },{threshold:.18});
    document.querySelectorAll('.menu-head,.dough-copy,.sala-copy').forEach(el=>reveal.observe(el));
  }
})();
