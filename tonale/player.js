(() => {
  const sides=[{name:'Polvere',file:'polvere.mp3',side:'A'},{name:'Riflesso',file:'riflesso.mp3',side:'B'}];
  const audio=new Audio('./assets/'+sides[0].file);
  audio.preload='metadata';audio.loop=true;audio.volume=.62;
  const canvas=document.querySelector('#waveform'),ctx=canvas.getContext('2d');
  const seek=document.querySelector('#seek'),status=document.querySelector('.audio-status');
  const buttons=[...document.querySelectorAll('[data-play]')];
  let selected=0,revision=0,fast=false;
  const time=t=>String(Math.floor(t/60)).padStart(2,'0')+':'+String(Math.floor(t%60)).padStart(2,'0');
  function draw(){
    const p=audio.duration?audio.currentTime/audio.duration:0;
    document.dispatchEvent(new CustomEvent('tonale-position',{detail:p}));
    seek.value=p*100;seek.setAttribute('aria-valuetext',time(audio.currentTime||0));
    document.querySelector('#track-time').textContent=time(audio.currentTime||0);
    if(!ctx){seek.classList.add('native-seek');return}
    const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;
    const dpr=Math.min(devicePixelRatio||1,2);
    if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr)}
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
    const values=window.tonaleWaveforms[selected];
    const count=Math.min(values.length,Math.floor(w/3)),step=w/count;
    for(let i=0;i<count;i++){
      const bar=Math.max(2,values[Math.floor(i*values.length/count)]/100*h*.83);
      ctx.fillStyle=i/count<=p?'#be4828':'#626e58';ctx.fillRect(i*step,(h-bar)/2,Math.max(1,step-1.6),bar);
    }
    ctx.fillStyle='#bd4624';ctx.fillRect(Math.min(w-2,p*w),0,2,h);
  }
  function sync(){
    const playing=!audio.paused&&!audio.ended;
    document.body.classList.toggle('playing',playing);
    buttons.forEach(b=>b.setAttribute('aria-pressed',String(playing)));
    const labels=playing?{sound:'Audio on',short:'Pausa',full:'Ferma il disco'}:{sound:'Audio off',short:'Riproduci',full:'Ascolta il disco'};
    document.querySelectorAll('[data-play-label]').forEach(n=>n.textContent=labels[n.dataset.playLabel]);
    document.dispatchEvent(new CustomEvent('tonale-audio',{detail:{playing,side:selected,fast}}));
    draw();
  }
  async function play(){
    const attempt=++revision;status.hidden=true;
    try {await audio.play()}catch(err){
      if(attempt!==revision||err.name==='AbortError')return;
      status.textContent='Audio non disponibile. Riprova a premere Riproduci.';status.hidden=false;sync();
    }
  }
  buttons.forEach(b=>b.addEventListener('click',()=>{if(audio.paused)play();else{revision++;audio.pause();sync()}}));
  const speed=document.querySelector('#speed-control');
  speed.addEventListener('click',()=>{
    fast=!fast;audio.preservesPitch=false;audio.defaultPlaybackRate=audio.playbackRate=fast?1.35:1;
    speed.firstChild.textContent=fast?'45 ':'33⅓ ';
    speed.setAttribute('aria-label',fast?'Velocità del piatto, 45 giri. Passa a 33 giri.':'Velocità del piatto, 33 giri. Passa a 45 giri.');
    sync();
  });
  document.addEventListener('tonale-cue',event=>{
    const position=Math.max(0,Math.min(.995,event.detail));
    const cue=()=>{if(Number.isFinite(audio.duration))audio.currentTime=position*audio.duration};
    if(audio.readyState>=1)cue();else audio.addEventListener('loadedmetadata',cue,{once:true});
    play();
  });
  document.querySelectorAll('[data-side]').forEach(b=>b.addEventListener('click',()=>{
    const index=Number(b.dataset.side);if(index===selected)return;
    const resume=!audio.paused;revision++;audio.pause();selected=index;
    const side=sides[index];audio.src='./assets/'+side.file;audio.load();status.hidden=true;
    document.querySelector('#track-title').textContent=side.name;
    document.querySelector('.side-label').textContent='LATO '+side.side;
    document.querySelectorAll('[data-side]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
    if(resume)play();else sync();
  }));
  document.querySelector('#volume').addEventListener('input',e=>audio.volume=Number(e.target.value));
  seek.addEventListener('input',()=>{if(Number.isFinite(audio.duration))audio.currentTime=+seek.value/100*audio.duration;draw()});
  ['play','pause','ended'].forEach(event=>audio.addEventListener(event,sync));
  ['timeupdate','seeked','loadedmetadata'].forEach(event=>audio.addEventListener(event,draw));
  new ResizeObserver(draw).observe(canvas);
  sync();
})();
