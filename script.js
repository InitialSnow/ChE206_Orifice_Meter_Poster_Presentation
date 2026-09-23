const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

const data = {
  rho: 996.24,
  mu: 0.0083238,
  D: 0.0525,
  betaReport: 0.489,
  cdData: [0.756,0.789,0.795,0.751,0.807,0.752,0.759,0.767],
  reData: [12216,15024,16644,16817,19429,19586,20298,21501],
  qData: [0.421,0.518,0.573,0.579,0.669,0.675,0.699,0.741]
};

// Mobile nav
$("#menuBtn").addEventListener("click",()=>$("#mobileNav").classList.toggle("open"));
$$(".mobile-nav a").forEach(a=>a.addEventListener("click",()=>$("#mobileNav").classList.remove("open")));

// Simulation
const qSlider=$("#qSlider"), betaSlider=$("#betaSlider");
const qOut=$("#qOut"), betaOut=$("#betaOut"), vOut=$("#vOut"), hOut=$("#hOut"), reOut=$("#reOut"), cdOut=$("#cdOut"), vcPos=$("#vcPos");
const jet=$("#jet"), jet2=$("#jet2"), hole=$("#hole"), vcLeader=$("#vcLeader"), vcLabel=$("#vcLabel");
const streamlines=$("#streamlines"), flowParticles=$("#flowParticles");

function lerp(a,b,t){return a+(b-a)*t}
function calc(){
  const q = +qSlider.value / 1000; // L/s -> m3/s
  const beta = +betaSlider.value;
  const A = Math.PI*data.D**2/4;
  const d = data.D*beta;
  const Ao = Math.PI*d**2/4;
  const v = q/A;
  const re = data.rho*v*data.D/data.mu;
  // Representative Cd interpolated from supplied turbulent calibration data.
  const cd = lerp(Math.min(...data.cdData), Math.max(...data.cdData),
                  Math.min(1, Math.max(0,(beta-.35)/.4))) * (0.985 + 0.015*Math.sin((q*1000)*5));
  // Standard differential-pressure relationship, shown as an illustrative head.
  const beta4 = Math.pow(beta,4);
  const dh = Math.max(0.001, Math.pow(q/(cd*Ao),2) * (1-beta4)/(2*9.81));
  // Visualized vena-contracta distance: smooth geometry model, not a CFD prediction.
  const x = 42 + 92*(1-beta) + 12*Math.min(1, Math.max(0,(q*1000-.421)/.32));
  return {qL:q*1000,beta,d,A,Ao,v,re,cd,dh,x};
}
function updateGeometry(s){
  qOut.textContent=s.qL.toFixed(2)+" L/s";
  betaOut.textContent=s.beta.toFixed(3);
  vOut.textContent=s.v.toFixed(3);
  hOut.textContent=s.dh.toFixed(3);
  reOut.textContent=Math.round(s.re).toLocaleString();
  cdOut.textContent=s.cd.toFixed(3);
  vcPos.textContent=s.x.toFixed(0)+" mm";
  // Orifice hole radius responds to beta.
  const ry = 22 + (s.beta-.35)/.4*52;
  hole.setAttribute("ry", ry.toFixed(1));
  // Jet width / contraction responds to beta and Q.
  const jetW = 12 + (s.beta-.35)/.4*15;
  jet.setAttribute("d", `M438 210 C 475 210 500 ${210-jetW} ${s.x+438} ${210-jetW} C ${s.x+458} ${210-jetW} 555 210 620 210`);
  jet.style.strokeWidth = (jetW*1.35).toFixed(1);
  jet2.setAttribute("d", `M438 210 C 475 210 500 ${210+jetW} ${s.x+438} ${210+jetW} C ${s.x+458} ${210+jetW} 555 210 620 210`);
  // Leader follows the displayed VC point.
  const vx = 438 + s.x;
  vcLeader.setAttribute("x1",vx); vcLeader.setAttribute("x2",vx);
  vcLabel.setAttribute("x",vx);
  // Streamlines
  streamlines.innerHTML="";
  const top=185+jetW*1.7, bot=235-jetW*1.7;
  for(let i=0;i<5;i++){
    const y=lerp(top,bot,i/4);
    const p=document.createElementNS("http://www.w3.org/2000/svg","path");
    p.setAttribute("d",`M70 ${y} C 250 ${y} 330 ${y} 420 ${y} C 470 ${y} 500 ${210+(i-2)*jetW*.5} 610 ${210+(i-2)*jetW*.5} C 700 ${210+(i-2)*jetW*.5} 780 ${y} 830 ${y}`);
    p.setAttribute("class","stream-path");
    streamlines.appendChild(p);
  }
  // particles
  flowParticles.innerHTML="";
  const count=18;
  for(let i=0;i<count;i++){
    const c=document.createElementNS("http://www.w3.org/2000/svg","circle");
    c.setAttribute("r",2.3+(s.qL-.421)*3);
    c.setAttribute("class","particle");
    c.style.animationDelay=`-${(i/count)*1.7}s`;
    flowParticles.appendChild(c);
  }
  drawChart(s);
}
function drawChart(s){
  const svg=$("#chart"), grid=$("#grid"), path=$("#chartPath"), point=$("#chartPoint");
  grid.innerHTML="";
  const x0=55,y0=25,w=810,h=235;
  for(let i=0;i<=6;i++){
    const x=x0+w*i/6, y=y0+h*i/6;
    let v=document.createElementNS("http://www.w3.org/2000/svg","line");
    v.setAttribute("x1",x);v.setAttribute("x2",x);v.setAttribute("y1",y0);v.setAttribute("y2",y0+h);v.setAttribute("class","gridline");grid.appendChild(v);
    let h=document.createElementNS("http://www.w3.org/2000/svg","line");
    h.setAttribute("x1",x0);h.setAttribute("x2",x0+w);h.setAttribute("y1",y);h.setAttribute("y2",y);h.setAttribute("class","gridline");grid.appendChild(h);
  }
  const beta4=Math.pow(s.beta,4);
  const pts=[];
  for(let i=0;i<=50;i++){
    const xx=i/50;
    const q=(0.000421 + xx*(0.000741-0.000421));
    const A=Math.PI*data.D**2/4, Ao=Math.PI*(data.D*s.beta)**2/4;
    const cd=s.cdData.reduce((a,b)=>a+b,0)/data.cdData.length;
    const hh=Math.pow(q/(cd*Ao),2)*(1-beta4)/(2*9.81);
    pts.push({x:xx,y:hh});
  }
  const maxY=Math.max(...pts.map(p=>p.y),s.dh)*1.08;
  path.setAttribute("d",pts.map((p,i)=>`${i?'L':'M'} ${x0+p.x*w} ${y0+h-(p.y/maxY)*h}`).join(" "));
  const px=Math.min(1,Math.max(0,(s.qL-.421)/(.741-.421)));
  const py=Math.pow(s.dh/maxY,1);
  point.setAttribute("cx",x0+px*w);point.setAttribute("cy",y0+h-py*h);
  $("#chartCaption").textContent=`Q = ${s.qL.toFixed(2)} L/s · β = ${s.beta.toFixed(3)}`;
}
[qSlider,betaSlider].forEach(x=>x.addEventListener("input",()=>updateGeometry(calc())));
updateGeometry(calc());

// Extra SVG styling
const style = document.createElement("style");
style.textContent = `
.stream-path{fill:none;stroke:#65dcca;stroke-width:1.4;opacity:.28;stroke-dasharray:6 10;animation:flow 1.2s linear infinite}
.particle{fill:#9af5e4;animation:particleMove 2.2s linear infinite}
@keyframes particleMove{0%{transform:translateX(0);opacity:.1}10%{opacity:.9}100%{transform:translateX(760px);opacity:.15}}
`;
document.head.appendChild(style);

// Reports
const reports=[
  {n:1,name:"Irfan Uddin Mazumder",meta:"ID 2302008 · Section A-1 · Group 02",file:"assets/reports/participant-01.pdf",source:"assets/reports/participant-01-source.docx",real:true},
  ...Array.from({length:8},(_,i)=>({n:i+2,name:`Participant ${String(i+2).padStart(2,"0")}`,meta:"Placeholder — replace with final report",file:`assets/reports/participant-${String(i+2).padStart(2,"0")}.pdf`,real:false}))
];
$("#reportGrid").innerHTML=reports.map(r=>`
<article class="report-card">
  <span class="report-number">REPORT ${String(r.n).padStart(2,"0")}</span>
  <h3>${r.name}</h3><p>${r.meta}</p>
  <div class="report-actions">
    <button class="mini-btn primary" data-view="${r.file}" data-name="${r.name}">View PDF</button>
    <a class="mini-btn" href="${r.file}" download>Download</a>
    ${r.real?`<a class="mini-btn" href="${r.source}" download>DOCX</a>`:""}
  </div>
</article>`).join("");

$$("[data-view]").forEach(btn=>btn.addEventListener("click",()=>{
  const file=btn.dataset.view, name=btn.dataset.name;
  $("#modalContent").innerHTML=`<h3>${name}</h3><p>Internal report viewer. If your browser blocks the embedded document, use the Download button.</p><iframe title="${name} PDF" src="${file}" style="width:100%;height:62vh;border:1px solid rgba(255,255,255,.1);border-radius:10px;background:white"></iframe>`;
  openModal();
}));

// References
fetch("references.json").then(r=>r.json()).then(refs=>{
  $("#referencesList").innerHTML=refs.map(r=>`<article class="ref-card"><div class="ref-n">[${r.n}]</div><p>${r.text}</p></article>`).join("");
}).catch(()=>{
  $("#referencesList").innerHTML="<article class='ref-card'><div class='ref-n'>—</div><p>Reference data could not be loaded. Add references.json to the repository.</p></article>";
});

// Help modal
$("#helpBtn").addEventListener("click",()=>{
  $("#modalContent").innerHTML=`
    <p class="eyebrow">SIMULATION GUIDE</p><h3>What is changing?</h3>
    <p><b>Q</b> controls volumetric flow rate. Increasing it raises the pipe velocity and the illustrated differential head.</p>
    <p><b>β = d/D</b> controls the orifice-to-pipe diameter ratio. The opening, jet contraction and displayed vena-contracta position change continuously with β.</p>
    <p><b>Important:</b> this is an educational visualization, not a CFD solution. The pressure profile and vena-contracta movement are simplified models designed to communicate the trends described in the supplied laboratory report.</p>
  `;
  openModal();
});

function openModal(){ $("#modal").classList.add("open"); $("#modal").setAttribute("aria-hidden","false"); }
function closeModal(){ $("#modal").classList.remove("open"); $("#modal").setAttribute("aria-hidden","true"); $("#modalContent").innerHTML=""; }
$("#modalClose").addEventListener("click",closeModal);
$("#modalBackdrop").addEventListener("click",closeModal);
document.addEventListener("keydown",e=>{if(e.key==="Escape")closeModal()});
