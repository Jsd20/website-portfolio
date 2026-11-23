const stage = document.querySelector('.stage');
const journey = document.querySelector('.journey');
const viewer = document.querySelector('.viewer');
const canvas = document.querySelector('#turntable');
const poster = document.querySelector('.poster');
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const clamp = (n, low = 0, high = 1) => Math.min(high, Math.max(low, n));
const sections = [
  null,
  ['Il vinile.', 'Il solco percorre la superficie in una spirale continua. Quando il disco gira, la puntina ne segue le minuscole deviazioni.'],
  ['Il piatto.', 'Sotto il disco, il piatto metallico distribuisce la massa attorno al perno. Il bordo lavorato rivela la rotazione.'],
  ['Il telaio.', 'Il guscio in alluminio poggia su una fascia in noce. I quattro piedini tengono il corpo del giradischi separato dal piano.']
];
let section = -1;
let progress = 0;
let wake = () => {};
let modelVisible = true;
let isPlaying = false;
let selectedSide = 0;
let fast = false;
let groovePosition = 0;
let azimuth = .525;
let elevation = .565;
let baseSpin = 0;
let userView = false;
let scrollQueued = false;
const positions = [0,.28,.59,.9];
const travel = () => Math.max(1, journey.offsetHeight - stage.offsetHeight);
const topOfJourney = () => journey.getBoundingClientRect().top + scrollY - document.querySelector('.mast').offsetHeight;
function goToSection(i) {window.scrollTo({top:topOfJourney() + travel()*positions[i],behavior:reduce.matches?'instant':'smooth'})}
function setProgress() {
  scrollQueued = false;
  progress = clamp((scrollY-topOfJourney())/travel());
  document.querySelector('#anatomia').style.top = travel()*positions[1]+'px';
  const index = progress < .15 ? 0 : progress < .45 ? 1 : progress < .75 ? 2 : 3;
  if (index !== section) {
    section = index;
    document.querySelector('.chapter-intro').hidden = index !== 0;
    const detail = document.querySelector('.chapter-detail');
    detail.hidden = index === 0;
    if(index) {
      document.querySelector('.chapter-counter').textContent = 'ANATOMIA / 0'+index;
      document.querySelector('.layer-title').textContent = sections[index][0];
      document.querySelector('.layer-description').textContent = sections[index][1];
      if (!reduce.matches) detail.animate([{opacity:.35,transform:'translateY(7px)'},{opacity:1,transform:'translateY(0)'}],{duration:280,easing:'ease-out'});
    }
    document.querySelectorAll('[data-layer]').forEach(button=>button.setAttribute('aria-current',String(+button.dataset.layer===index)));
    document.querySelector('.phase-label').textContent = index ? 'ANATOMIA / 0'+index : 'STRUMENTO';
    document.querySelector('.track-line i').style.width=(index+1)*25+'%';
    const photo = index ? './assets/tonale-exploded.webp' : './assets/tonale-studio.webp';
    if(!viewer.classList.contains('live') && poster.getAttribute('src')!==photo) poster.src=photo;
  }
  wake();
}
window.addEventListener('scroll',()=>{if(!scrollQueued){scrollQueued=true;requestAnimationFrame(setProgress)}},{passive:true});
window.addEventListener('resize',setProgress);
document.querySelectorAll('[data-layer]').forEach(b=>b.onclick=()=>goToSection(+b.dataset.layer));
document.querySelectorAll('a[href="#anatomia"]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();history.replaceState(null,'','#anatomia');goToSection(1)}));
document.addEventListener('tonale-audio',e=>{isPlaying=e.detail.playing;selectedSide=e.detail.side;fast=e.detail.fast;wake()});
document.addEventListener('tonale-position',e=>{groovePosition=e.detail;if(isPlaying)wake()});
function changeAngle(yaw, pitch=0) {userView=true;azimuth+=yaw;elevation=clamp(elevation+pitch,.16,1.35);wake()}
function reset() {azimuth=.525;elevation=.565;userView=false;wake()}
document.querySelectorAll('[data-orbit]').forEach(b=>b.onclick=()=>changeAngle(+b.dataset.orbit*.48));
document.querySelector('[data-reset]').onclick=reset;
canvas.addEventListener('keydown',e=>{
  const turns={ArrowLeft:[-.16,0],ArrowRight:[.16,0],ArrowUp:[0,.11],ArrowDown:[0,-.11]};
  if(turns[e.key]){e.preventDefault();changeAngle(...turns[e.key])}
  if(e.key==='Home'){e.preventDefault();reset()}
});
let drag=null;
canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId)});
canvas.addEventListener('pointermove',e=>{if(drag?.id!==e.pointerId)return;changeAngle((drag.x-e.clientX)*.009,(e.clientY-drag.y)*.005);drag.x=e.clientX;drag.y=e.clientY});
for(const name of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(name,()=>{drag=null});
setProgress();

async function openStudio() {
  const [T,{buildTurntable}] = await Promise.all([import('./vendor/three.module.min.js'),import('./model.js')]);
  const renderer = new T.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance'});
  renderer.setClearColor(0,0);
  renderer.shadowMap.enabled=true;
  renderer.shadowMap.type=T.PCFSoftShadowMap;
  renderer.toneMapping=T.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.03;
  const scene=new T.Scene();
  // Reflected strip lights give the machined metal and lacquer separate highlights.
  const studio=new T.Scene();
  studio.background=new T.Color('#b6b9b0');
  const panel=(x,y,z,w,h,color,intensity)=>{
    const m=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({color:new T.Color(color).multiplyScalar(intensity),side:T.DoubleSide}));
    m.position.set(x,y,z);m.lookAt(0,0,0);studio.add(m);
  };
  panel(-3,4,3,7,3,'#ffffff',3.3);panel(4,3,-4,2,7,'#ffffff',3.8);
  panel(0,1,-5,9,2.1,'#111414',.65);panel(3,0,4,.9,4,'#212822',.5);
  const pmrem=new T.PMREMGenerator(renderer);
  const environment=pmrem.fromScene(studio,.04);
  scene.environment=environment.texture;
  pmrem.dispose();studio.traverse(o=>{o.geometry?.dispose();o.material?.dispose()});
  const model=buildTurntable(T);
  scene.add(model.group);
  const hemi=new T.HemisphereLight('#fffbee','#69766a',1.25);
  const key=new T.DirectionalLight('#fff3dc',2.4);
  key.position.set(-3.2,7.8,4.8);key.castShadow=true;key.shadow.mapSize.set(1024,1024);
  Object.assign(key.shadow.camera,{left:-5,right:5,top:5,bottom:-5,near:.1,far:22});
  key.shadow.normalBias=.018;key.shadow.bias=-.0002;
  const rim=new T.DirectionalLight('#d8e9ff',1.5);rim.position.set(3.8,3,-4);
  const floor=new T.Mesh(new T.PlaneGeometry(42,42),new T.ShadowMaterial({opacity:.16}));
  floor.rotation.x=-Math.PI/2;floor.position.y=-.018;floor.receiveShadow=true;
  scene.add(hemi,key,rim,floor);
  const aoCanvas=document.createElement('canvas');aoCanvas.width=aoCanvas.height=128;
  const ctx=aoCanvas.getContext('2d');const fade=ctx.createRadialGradient(64,64,10,64,64,64);
  fade.addColorStop(0,'rgba(39,44,32,.39)');fade.addColorStop(.58,'rgba(39,44,32,.21)');fade.addColorStop(1,'rgba(39,44,32,0)');ctx.fillStyle=fade;ctx.fillRect(0,0,128,128);
  const ao=new T.Mesh(new T.PlaneGeometry(7.5,5.6),new T.MeshBasicMaterial({map:new T.CanvasTexture(aoCanvas),transparent:true,depthWrite:false}));
  ao.rotation.x=-Math.PI/2;ao.position.y=-.011;scene.add(ao);
  const camera=new T.OrthographicCamera(-4,4,3,-3,.05,60);
  let aspect=1,angle=azimuth,tilt=elevation,explosion=0,lift=0,frame=0,last=0;
  let entryStart,entryFinished=reduce.matches||progress>.1;
  const ray=new T.Raycaster(), point=new T.Vector3(), pointer=new T.Vector2();
  const surface=new T.Plane(new T.Vector3(0,1,0),-.834);
  const tip=document.querySelector('#hardware-tip');
  let pressed=null;
  function partAt(event){
    if(section!==0 || explosion>.03)return null;
    const box=canvas.getBoundingClientRect();
    pointer.set((event.clientX-box.left)/box.width*2-1,1-(event.clientY-box.top)/box.height*2);
    ray.setFromCamera(pointer,camera);
    surface.constant=-.834;
    if(!ray.ray.intersectPlane(surface,point))return null;
    const radius=Math.hypot(point.x+.7,point.z+.13);
    if(radius>.55&&radius<1.46)return {name:'Posa la puntina',cue:clamp((1.44-radius)/.88)};
    if(radius<=.5)return {name:'Gira il disco · lato '+(selectedSide?'A':'B'),side:1-selectedSide};
    surface.constant=-.65;
    if(!ray.ray.intersectPlane(surface,point))return null;
    if(Math.hypot(point.x-1.55,point.z-1.335)<.265)return {name:isPlaying?'Ferma il disco':'Avvia il disco',button:'.play-button'};
    if(Math.abs(point.x-2.144)<.25&&Math.abs(point.z-1.397)<.16)return {name:fast?'Passa a 33⅓ giri':'Passa a 45 giri',button:'#speed-control'};
    return null;
  }
  canvas.addEventListener('pointerdown',e=>{pressed={x:e.clientX,y:e.clientY};tip.hidden=true});
  canvas.addEventListener('pointermove',e=>{
    if(e.buttons||e.pointerType==='touch')return;
    const hit=partAt(e);tip.hidden=!hit;canvas.style.cursor=hit?'pointer':'grab';
    if(hit){const r=viewer.getBoundingClientRect();tip.textContent=hit.name;tip.style.left=clamp(e.clientX-r.left,80,r.width-80)+'px';tip.style.top=Math.max(27,e.clientY-r.top-6)+'px'}
  });
  canvas.addEventListener('pointerleave',()=>{tip.hidden=true});
  canvas.addEventListener('pointercancel',()=>{pressed=null});
  canvas.addEventListener('pointerup',e=>{
    if(!pressed)return;
    const moved=Math.hypot(e.clientX-pressed.x,e.clientY-pressed.y);pressed=null;
    if(moved>5)return;
    const part=partAt(e);if(!part)return;
    if(part.button)document.querySelector(part.button).click();
    else if(part.side!==undefined)document.querySelector('[data-side="'+part.side+'"]').click();
    else document.dispatchEvent(new CustomEvent('tonale-cue',{detail:part.cue}));
    tip.hidden=true;
  });
  function resize(){
    const w=viewer.clientWidth,h=viewer.clientHeight;
    if(!w||!h)return;
    aspect=w/h;renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,w<650?1.55:1.75));renderer.setSize(w,h,false);requestDraw();
  }
  function requestDraw(){if(!frame && modelVisible && !document.hidden)frame=requestAnimationFrame(draw)}
  function draw(now){
    frame=0;if(!modelVisible||document.hidden)return;
    const dt=Math.min(.05,(now-(last||now))/1000);last=now;
    const e=clamp((progress-.05)/.6);
    const targetE=e*e*(3-2*e);
    const targetAngle=azimuth+(userView?0:-progress*1.05);
    const targetTilt=elevation+(userView?0:.15*Math.sin(progress*Math.PI)-.23*progress);
    const mix=reduce.matches?1:1-Math.exp(-dt*10);
    angle+=(targetAngle-angle)*mix;tilt+=(targetTilt-tilt)*mix;explosion+=(targetE-explosion)*mix;
    const targetLift=isPlaying && explosion<.03?1:0;lift+=(targetLift-lift)*mix*.9;
    if(entryStart===undefined)entryStart=now;
    if(userView||progress>.025||isPlaying||reduce.matches)entryFinished=true;
    const remaining=entryFinished?0:clamp(1-(now-entryStart)/1750);
    const entrance=remaining*remaining*(3-2*remaining);
    if(remaining===0)entryFinished=true;
    const parts=Math.max(explosion,entrance*.85);
    if(isPlaying && !reduce.matches && explosion<.07)baseSpin+=dt*(fast?4.7124:3.4907);
    model.update({explosion:parts,spin:baseSpin,playing:isPlaying,lift,side:selectedSide,fast,position:groovePosition});
    const height=Math.max(4+explosion*.35,(7.26+explosion*.13)/aspect);
    camera.left=-height*aspect*.5;camera.right=-camera.left;camera.top=height*.5;camera.bottom=-camera.top;camera.updateProjectionMatrix();
    const focusY=.54+parts*.54;
    const yaw=angle-entrance*.63,pitch=tilt+entrance*.27;
    camera.position.set(Math.sin(yaw)*Math.cos(pitch)*11,focusY+Math.sin(pitch)*11,Math.cos(yaw)*Math.cos(pitch)*11);
    camera.lookAt(0,focusY,0);renderer.render(scene,camera);
    viewer.classList.add('live');
    const moving=Math.abs(angle-targetAngle)+Math.abs(tilt-targetTilt)+Math.abs(explosion-targetE)+Math.abs(lift-targetLift)>.001;
    if(!entryFinished||moving||(isPlaying&&!reduce.matches&&explosion<.07))requestDraw();
  }
  wake=requestDraw;
  new ResizeObserver(resize).observe(viewer);
  new IntersectionObserver(([entry])=>{modelVisible=entry.isIntersecting;if(modelVisible){last=0;requestDraw()}},{rootMargin:'90px'}).observe(stage);
  document.addEventListener('visibilitychange',()=>{last=0;requestDraw()});
  reduce.addEventListener('change',requestDraw);
  canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();fallback()});
  canvas.addEventListener('webglcontextrestored',()=>{stage.classList.remove('fallback');document.querySelector('#gesture-copy').textContent='Tocca un solco per posare la puntina.';canvas.tabIndex=0;modelVisible=true;requestDraw()});
  resize();
}
function fallback(){
  stage.classList.add('fallback');viewer.classList.remove('live');canvas.tabIndex=-1;
  document.querySelector('#gesture-copy').textContent='Esplora i componenti e ascolta i due lati del disco.';
  poster.src=section?'./assets/tonale-exploded.webp':'./assets/tonale-studio.webp';
}
openStudio().catch(fallback);
