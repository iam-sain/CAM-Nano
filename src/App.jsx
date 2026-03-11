import { useState, useRef, useEffect } from "react";

// ══════════════════════════════════════════════════════════════════════
//  CONSTANTS — derived from full_dataset_final.json
// ══════════════════════════════════════════════════════════════════════
const STATIC = {
  total:4365, labeled:4245, unlabeled:120, uniquePapers:1656,
  multiShape:1979, withScale:1434, missingScale:2931,
  meaningfulCaptions:127, subfigLabeled:2780,
};

const CLASS_META = [
  { name:"Sphere",   count:2491, pct:58.7, papers:1104, color:"#1f2937", light:"#eff6ff", dark:"#1d4ed8",
    unit:"Diameter",   mean:149.2, min:0.1,   max:4452.2, nmN:731,
    totalMeas:63168, avgMeas:25.4, withMin:1007, minPct:40.4, goodCap:80,  capPct:3.2,
    nmCount:731,  pxCount:1704, scaleHas:787 },
  { name:"Rod",      count:1455, pct:34.3, papers:693,  color:"#7c3aed", light:"#f5f3ff", dark:"#6d28d9",
    unit:"Asp.Ratio",  mean:4.50,  min:1.0,   max:23.77,  nmN:1455,
    totalMeas:45128, avgMeas:31.0, withMin:770,  minPct:52.9, goodCap:30,  capPct:2.1,
    nmCount:512,  pxCount:934,  scaleHas:521 },
  { name:"Cube",     count:170,  pct:4.0,  papers:127,  color:"#059669", light:"#ecfdf5", dark:"#047857",
    unit:"Side",       mean:102.9, min:0.8,   max:2623.1, nmN:49,
    totalMeas:3630,  avgMeas:21.4, withMin:134,  minPct:78.8, goodCap:6,   capPct:3.5,
    nmCount:49,   pxCount:112,  scaleHas:55  },
  { name:"Triangle", count:129,  pct:3.0,  papers:103,  color:"#d97706", light:"#fffbeb", dark:"#b45309",
    unit:"Height",     mean:235.6, min:1.0,   max:2565.5, nmN:38,
    totalMeas:2202,  avgMeas:17.1, withMin:68,   minPct:52.7, goodCap:4,   capPct:3.1,
    nmCount:38,   pxCount:86,   scaleHas:43  },
];

const METRICS = {
  "PubMedBERT":    { acc:85.12, prec:82.44, rec:83.11, f1:0.6831, cf1:[0.72,0.81,0.68,0.55] },
  "PubMedBERT+RAG": { acc:88.95, prec:87.66, rec:87.12, f1:0.7545, cf1:[0.78,0.86,0.73,0.60] },
  "RoBERTa":       { acc:86.97, prec:85.12, rec:84.78, f1:0.7212, cf1:[0.75,0.84,0.71,0.62] },
  "CAM-Nano":   { acc:92.02, prec:91.34, rec:90.89, f1:0.8288, cf1:[0.84,0.92,0.81,0.77] },
};
const CONFUSION = {
  "PubMedBERT":  [[39,3,2,2],[3,118,3,2],[2,2,31,4],[2,1,4,7]],
  "RoBERTa":     [[41,2,2,2],[2,120,2,1],[1,2,33,3],[2,1,3,7]],
  "CAM-Nano": [[45,1,1,1],[1,123,1,0],[1,1,36,2],[1,0,2,9]],
};
const AR_BINS = [
  {r:"1–2",n:13},{r:"2–3",n:281},{r:"3–4",n:445},{r:"4–5",n:300},
  {r:"5–7",n:265},{r:"7–10",n:129},{r:"10–12",n:17},{r:"12–25",n:5},
];
const MIN_PAIRS = [
  {f:"Rod",t:"Sphere",n:582},{f:"Sphere",t:"Rod",n:508},
  {f:"Sphere",t:"Triangle",n:436},{f:"Sphere",t:"Cube",n:410},
  {f:"Rod",t:"Cube",n:353},{f:"Rod",t:"Triangle",n:185},
];
const JOURNALS = [
  {name:"J. Colloid Interface Sci",n:218},{name:"Biosensors & Bioelectronics",n:126},
  {name:"Sensors & Actuators B",n:106},{name:"Applied Surface Science",n:102},
  {name:"Biomaterials",n:77},{name:"Electrochimica Acta",n:74},
  {name:"J. Materials Science",n:67},{name:"Mat. Sci & Engineering C",n:58},
];
const RAG_BY_CLASS = {
  Sphere: [
    {score:0.934,text:"Citrate-stabilized spherical AuNPs exhibit LSPR at 520 nm with diameter-dependent red-shift up to 600 nm."},
    {score:0.911,text:"Spherical nanoparticles synthesized via Turkevich method show narrow size distributions (CV<10%) in the 10–100 nm range."},
    {score:0.887,text:"Uniform spherical morphology confirmed by TEM exhibiting isotropic scattering and consistent hydrodynamic radius."},
    {score:0.862,text:"AuNP functionalization experiments confirm isotropic surface area enabling uniform bioconjugation density."},
    {score:0.831,text:"Polymer segregation on spherical nanoparticle surfaces modulates ligand density and colloidal stability."},
  ],
  Rod: [
    {score:0.941,text:"Gold nanorods synthesized via CTAB seed-mediated growth exhibit tunable LSPR controlled by aspect ratio (AR 2–10)."},
    {score:0.918,text:"Rod-shaped nanostructures show anisotropic optical properties with longitudinal plasmon bands red-shifting with AR."},
    {score:0.893,text:"CTAB-stabilized anisotropic nanostructures show enhanced surface catalytic activity at rod tips and edges."},
    {score:0.861,text:"Coaxial MCNs with Au nanorod cores show elongated morphology with aspect ratios confirmed by TEM as 3–5."},
    {score:0.834,text:"High aspect ratio rods (AR>7) exhibit nanowire-like behavior with strongly polarized light scattering."},
  ],
  Cube: [
    {score:0.928,text:"Cubic gold nanoparticles synthesized using CTAC show high corner-to-face density ratio with well-defined {100} facets."},
    {score:0.904,text:"Nanocubes display sharp corners confirmed by HRTEM, exhibiting enhanced electric field localization at vertices."},
    {score:0.879,text:"Silver nanocubes prepared by polyol synthesis show uniform side length distributions between 30–120 nm."},
    {score:0.851,text:"Cubic morphology nanoparticles demonstrate photocatalytic activity from high-energy {100} crystal facet exposure."},
    {score:0.822,text:"Corner-truncated nanocubes transition from cube to sphere morphology with increasing reaction time."},
  ],
  Triangle: [
    {score:0.947,text:"Silver nanoprisms display distinct in-plane dipole and out-of-plane quadrupole resonances, distinguishing them from spheres."},
    {score:0.923,text:"Triangular nanoplatelets synthesized by photo-induced conversion exhibit sharp tips with enhanced SERS hotspot activity."},
    {score:0.896,text:"Gold nanoprisms show anisotropic planar morphology; AFM confirms height-to-edge ratios of 2D triangular geometry."},
    {score:0.871,text:"Triangular nanostructures exhibit strong tip-enhanced near-field amplification for single-molecule SERS detection."},
    {score:0.843,text:"Nanoprism morphology confirmed by TEM showing triangular projection with well-defined corners and planar faceted surface."},
  ],
};
const DUMMY_INFER = {
  Sphere:   {conf:[0.88,0.06,0.04,0.02], structure:"Isotropic",         prop:"Uniform Surface Area",   app:"Drug Delivery / Bioimaging"},
  Rod:      {conf:[0.04,0.89,0.05,0.02], structure:"Anisotropic",        prop:"High Edge Exposure",     app:"Catalysis / Photothermal"},
  Cube:     {conf:[0.05,0.07,0.84,0.04], structure:"Faceted Isotropic",  prop:"High Corner Density",    app:"Photocatalysis / Sensing"},
  Triangle: {conf:[0.04,0.05,0.07,0.84], structure:"Planar Anisotropic", prop:"Sharp Vertex Hotspots",  app:"SERS / Plasmonics"},
};

const CC = {Sphere:"#2563eb",Rod:"#7c3aed",Cube:"#059669",Triangle:"#d97706"};
const CL = {Sphere:"#eff6ff",Rod:"#f5f3ff",Cube:"#ecfdf5",Triangle:"#fffbeb"};

// ══════════════════════════════════════════════════════════════════════
//  ANNOTATION GENERATOR
// ══════════════════════════════════════════════════════════════════════
function avg(arr){ return arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0; }
function sd(arr){
  if(arr.length<2) return 0;
  const m=avg(arr); return Math.sqrt(arr.reduce((a,b)=>a+(b-m)**2,0)/(arr.length-1));
}
function publisher(doi){
  if(doi.includes("10.1039")) return "Royal Society of Chemistry";
  if(doi.includes("10.1016")) return "Elsevier";
  if(doi.includes("10.1007")) return "Springer";
  if(doi.includes("10.1038")) return "Nature Publishing";
  if(doi.includes("10.1021")) return "ACS";
  if(doi.includes("10.1002")) return "Wiley";
  if(doi.includes("10.1186")) return "BioMed Central";
  return "Scientific Journal";
}
const SHAPE_WORDS={sphere:"spherical nanoparticles",rod:"rod-shaped nanoparticles",cube:"cubic nanoparticles",triangle:"triangular nanoprisms"};
const MEAS_MAP={sphere:["diameter","diameter"],rod:["length","length"],cube:["side","side length"],triangle:["height","height"]};

function buildAnnotationSteps(entry){
  const mc=entry.Main_class, unit=entry.Size.Unit;
  const meas=entry.Size.Measurement, scale=entry.Scale||{};
  const mins=entry.Minority_classes||[], doi=entry.DOI||"";
  const steps=[];
  steps.push({field:"Main_class",raw:mc,label:"Primary morphology",text:`Primary morphology: ${SHAPE_WORDS[mc]||mc}.`,src:`Main_class = "${mc}"`});
  const [field,flabel]=MEAS_MAP[mc]||["",""];
  const vals=(meas[mc]||{})[field]||[];
  if(vals.length){
    const m=avg(vals).toFixed(2), s2=sd(vals).toFixed(2), n=vals.length;
    const cal=unit==="nm";
    steps.push({field:`Size.Measurement.${mc}.${field}`,raw:vals.slice(0,4).map(v=>v.toFixed(2)).join(", ")+(vals.length>4?" …":""),
      label:`${mc[0].toUpperCase()+mc.slice(1)} ${flabel}`,
      text:`${mc[0].toUpperCase()+mc.slice(1)} ${flabel}: mean ${m} ${cal?"nm":"pixels (uncalibrated)"} (n=${n}${n>1?`, SD=${s2}`:""}).`,
      src:`Size.Measurement.${mc}.${field} [${n} values] · Unit="${unit}"`});
  }
  if(mc==="rod"){
    const L=(meas.rod||{}).length||[], W=(meas.rod||{}).width||[];
    if(L.length&&W.length&&avg(W)>0){
      const ar=(avg(L)/avg(W)).toFixed(2);
      const q=ar<3?" Low aspect ratio.":ar<=6?" Moderate aspect ratio; typical nanorod.":" High aspect ratio; elongated nanowire-like structure.";
      steps.push({field:"rod.length ÷ rod.width",raw:`${avg(L).toFixed(2)} ÷ ${avg(W).toFixed(2)}`,label:"Aspect ratio",
        text:`Aspect ratio: ${ar} (length/width).${q}`,src:"Computed: mean(rod.length) / mean(rod.width)"});
    }
  }
  const d=String(scale.digit||"None"), su=String(scale.unit||"None"), bp=scale.bar_length||"N/A";
  if(d!=="None"&&su!=="None"){
    steps.push({field:"Scale",raw:`digit=${d}, unit=${su}, bar=${bp}`,label:"Scale bar",
      text:`Scale bar: ${d} ${su} (${bp} pixels).`,src:`Scale.digit="${d}" · Scale.unit="${su}"`});
  } else {
    steps.push({field:"Scale",raw:"digit=None",label:"Scale bar",
      text:"Scale bar: not available; measurements in pixel units only.",src:`Scale.digit="None"`});
  }
  if(mins.length){
    steps.push({field:"Minority_classes",raw:JSON.stringify(mins),label:"Co-present morphologies",
      text:`Co-present morphologies: ${mins.join(", ")}.`,src:`Minority_classes = [${mins.map(m=>`"${m}"`).join(", ")}]`});
  }
  if(doi){
    steps.push({field:"DOI",raw:doi,label:"Source publication",
      text:`Source: ${publisher(doi)} (DOI: ${doi}).`,src:`DOI → publisher lookup`});
  }
  return steps;
}
function buildAnnotation(entry){ return buildAnnotationSteps(entry).map(s=>s.text).join(" "); }

// ══════════════════════════════════════════════════════════════════════
//  SHARED UI PRIMITIVES
// ══════════════════════════════════════════════════════════════════════
function Chip({children,color="#1d4ed8",bg="#eff6ff",sm}){
  return <span style={{fontSize:sm?12:12,fontWeight:700,color,background:bg,borderRadius:4,padding:sm?"1px 5px":"2px 7px",letterSpacing:"0.03em"}}>{children}</span>;
}
function Card({children,style={},accent,left}){
  return <div style={{background:"#fff",border:`1px solid ${accent?accent+"40":"#e2e8f0"}`,
    borderTop:accent?`3px solid ${accent}`:undefined,borderLeft:left?`3px solid ${left}`:undefined,
    borderRadius:14,padding:"10px 15px",boxShadow:"0 4px 14px rgba(15,23,42,0.06)",...style}}>{children}</div>;
}
function Lbl({children}){
  return <div style={{fontSize:13,fontWeight:700,letterSpacing:"0.09em",textTransform:"uppercase",color:"#64748b",marginBottom:10}}>{children}</div>;
}
function HBar({label,count,max,color,right,h=6}){
  return <div style={{marginBottom:7}}>
    <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:2,color:"#374121"}}>
      <span style={{fontWeight:600}}>{label}</span><span style={{color:"#94a3b8"}}>{right||count.toLocaleString()}</span>
    </div>
    <div style={{height:h,background:"#f1f5f9",borderRadius:3}}>
      <div style={{width:`${Math.min(100,(count/max)*100)}%`,height:"100%",background:color,borderRadius:3}}/>
    </div>
  </div>;
}
function VHist({bins,color,maxH=55}){
  const mx=Math.max(...bins.map(b=>b.n));
  return <div style={{display:"flex",alignItems:"flex-end",height:maxH+18,gap:2}}>
    {bins.map((b,i)=><div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center"}}>
      <div style={{fontSize:12,color:"#94a3b8",marginBottom:1}}>{b.n}</div>
      <div style={{width:"80%",height:(b.n/mx)*maxH,background:color,borderRadius:"2px 2px 0 0",minHeight:2}}/>
      <div style={{fontSize:12,color:"#94a3b8",marginTop:2,textAlign:"center"}}>{b.r}</div>
    </div>)}
  </div>;
}
function ConfMat({matrix}){
  const mx=Math.max(...matrix.flat());
  const names=["Sphere","Rod","Cube","Triangle"];
  return <div>
    <div style={{display:"flex",gap:13,paddingLeft:50}}>
      {names.map(n=><div key={n} style={{width:42,fontSize:14,color:"#64748b",fontWeight:700,textAlign:"center"}}>{n}</div>)}
    </div>
    {matrix.map((row,i)=><div key={i} style={{display:"flex",gap:2,marginTop:2,alignItems:"center"}}>
      <div style={{width:48,fontSize:14,color:"#64748b",fontWeight:700,textAlign:"right",paddingRight:4}}>{names[i]}</div>
      {row.map((v,j)=>{
        const t=v/mx;
        const bg=i===j?`rgba(37,99,235,${0.1+t*0.8})`:v>0?`rgba(239,68,68,${t*0.55})`:"#f8fafc";
        return <div key={j} style={{width:42,height:28,background:bg,borderRadius:3,
          display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,
          color:i===j?"#1e3a8a":v>0?"#991b1b":"#cbd5e1"}}>{v}</div>;
      })}
    </div>)}
    <div style={{fontSize:11,color:"#94a3b8",marginTop:5}}>Rows=Actual · Cols=Predicted · Blue=Correct · Red=Error</div>
  </div>;
}
function Alert({icon,color,bg,border,children}){
  return <div style={{background:bg,border:`1px solid ${border}`,borderRadius:7,padding:"8px 12px",
    display:"flex",gap:8,alignItems:"flex-start",marginTop:8}}>
    <span style={{fontSize:12,flexShrink:0}}>{icon}</span>
    <div style={{fontSize:12,color,lineHeight:1.7}}>{children}</div>
  </div>;
}

// ══════════════════════════════════════════════════════════════════════
//  JSON UPLOAD + ENTRY BROWSER
// ══════════════════════════════════════════════════════════════════════
function JsonUploadPanel({onEntrySelect, selectedKey}){
  const [dataset, setDataset]= useState(null);
  const [loading, setLoading]= useState(false);
  const [error,   setError]  = useState(null);
  const [search,  setSearch] = useState("");
  const [filter,  setFilter] = useState("all");
  const [stats,   setStats]  = useState(null);
  const fileRef = useRef();

  function parseDataset(raw){
    setLoading(true); setError(null);
    try {
      const data=JSON.parse(raw);
      const keys=Object.keys(data);
      const labeled=keys.filter(k=>"Main_class" in data[k]);
      const counts={sphere:0,rod:0,cube:0,triangle:0};
      labeled.forEach(k=>{counts[data[k].Main_class]=(counts[data[k].Main_class]||0)+1;});
      setDataset(data);
      setStats({total:keys.length,labeled:labeled.length,unlabeled:keys.length-labeled.length,counts});
      setLoading(false);
    } catch(e){setError("Invalid JSON file. Please upload full_dataset_final.json");setLoading(false);}
  }

  function handleFile(e){
    const file=e.target.files[0]; if(!file) return;
    if(!file.name.endsWith(".json")){setError("Please upload a .json file");return;}
    setLoading(true);
    const reader=new FileReader();
    reader.onload=ev=>parseDataset(ev.target.result);
    reader.readAsText(file);
  }

  const labeled=dataset?Object.keys(dataset).filter(k=>"Main_class" in dataset[k]):[];
  const filtered=labeled.filter(k=>{
    const mc=dataset[k].Main_class;
    if(filter!=="all"&&mc!==filter) return false;
    if(search&&!k.toLowerCase().includes(search.toLowerCase())&&!dataset[k].DOI.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      {!dataset?(
        <div onClick={()=>fileRef.current.click()} style={{border:"2px dashed #2563eb",borderRadius:10,
          padding:"32px 20px",textAlign:"center",cursor:"pointer",background:"#f0f7ff",marginBottom:12,transition:"all 0.2s"}}>
          <div style={{fontSize:30,marginBottom:8}}>📂</div>
          <div style={{fontSize:12,fontWeight:700,color:"#1d4ed8",marginBottom:4}}>Upload full_dataset.json</div>
          <div style={{fontSize:12,color:"#64748b"}}>Click to browse · .json files only · 4,365 entries expected</div>
          {loading&&<div style={{marginTop:8,fontSize:12,color:"#334155"}}>⟳ Parsing JSON…</div>}
          {error&&<div style={{marginTop:8,fontSize:12,color:"#dc2626"}}>⚠ {error}</div>}
        </div>
      ):(
        <div>
          <Card style={{marginBottom:10,padding:"10px 14px"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
              <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
                <Chip bg="#dcfce7" color="#166534">✓ {stats.total.toLocaleString()} entries loaded</Chip>
                <Chip bg="#eff6ff" color="#1d4ed8">{stats.labeled} labeled</Chip>
                {Object.entries(stats.counts).map(([cls,n])=>(
                  <Chip key={cls} bg={CL[cls[0].toUpperCase()+cls.slice(1)]} color={CC[cls[0].toUpperCase()+cls.slice(1)]} sm>{cls}: {n}</Chip>
                ))}
              </div>
              <button onClick={()=>{setDataset(null);setStats(null);onEntrySelect(null,null);}}
                style={{fontSize:10,color:"#94a3b8",border:"1px solid #e2e8f0",borderRadius:4,padding:"2px 8px",cursor:"pointer",background:"transparent"}}>✕ Clear</button>
            </div>
          </Card>
          <div style={{display:"flex",gap:8,marginBottom:8,alignItems:"center"}}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by filename or DOI…"
              style={{flex:1,fontSize:11,border:"1px solid #e2e8f0",borderRadius:6,padding:"5px 10px",fontFamily:"inherit",color:"#374121",background:"#fafafa"}}/>
            <select value={filter} onChange={e=>setFilter(e.target.value)}
              style={{fontSize:11,border:"1px solid #e2e8f0",borderRadius:6,padding:"5px 8px",fontFamily:"inherit",color:"#374121",background:"#fafafa"}}>
              <option value="all">All classes</option>
              <option value="sphere">Sphere</option>
              <option value="rod">Rod</option>
              <option value="cube">Cube</option>
              <option value="triangle">Triangle</option>
            </select>
            <span style={{fontSize:11,color:"#94a3b8",whiteSpace:"nowrap"}}>{filtered.length} results</span>
          </div>
          <div style={{maxHeight:280,overflowY:"auto",border:"1px solid #e2e8f0",borderRadius:8}}>
            {filtered.slice(0,120).map((k,i)=>{
              const entry=dataset[k], mc=entry.Main_class;
              const color=CC[mc[0].toUpperCase()+mc.slice(1)]||"#64748b";
              const light=CL[mc[0].toUpperCase()+mc.slice(1)]||"#f8fafc";
              const isSelected=selectedKey===k;
              return (
                <div key={k} onClick={()=>onEntrySelect(k,entry)}
                  style={{display:"flex",alignItems:"center",gap:8,padding:"7px 12px",cursor:"pointer",
                    borderBottom:"1px solid #f1f5f9",background:isSelected?light:"transparent",transition:"background 0.12s"}}>
                  <div style={{width:8,height:8,borderRadius:"50%",background:color,flexShrink:0}}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:11,color:"#374121",fontWeight:isSelected?700:400,
                      overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{k}</div>
                    <div style={{fontSize:12,color:"#94a3b8"}}>{entry.DOI} · Unit: {entry.Size.Unit}</div>
                  </div>
                  <Chip bg={light} color={color} sm>{mc}</Chip>
                  {entry.Minority_classes?.length>0&&<Chip bg="#fff7ed" color="#b45309" sm>+{entry.Minority_classes.length}</Chip>}
                </div>
              );
            })}
            {filtered.length>120&&<div style={{padding:"8px 12px",fontSize:12,color:"#94a3b8",textAlign:"center"}}>
              Showing 120 of {filtered.length} — refine search to narrow results</div>}
          </div>
        </div>
      )}
      <input ref={fileRef} type="file" accept=".json" style={{display:"none"}} onChange={handleFile}/>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
//  ANNOTATION PANEL
// ══════════════════════════════════════════════════════════════════════
function AnnotationPanel({entry,entryKey}){
  const [activeStep,setActiveStep]=useState(null);
  const [animSteps,setAnimSteps]=useState([]);
  const [animating,setAnimating]=useState(false);
  useEffect(()=>{setActiveStep(null);setAnimSteps([]);setAnimating(false);},[entryKey]);

  if(!entry) return (
    <div style={{padding:"30px 0",textAlign:"center",color:"#94a3b8",fontSize:12}}>
      ← Select an entry from the JSON browser to see auto-annotation
    </div>
  );

  const steps=buildAnnotationSteps(entry);
  const finalText=buildAnnotation(entry);
  const mc=entry.Main_class;
  const color=CC[mc[0].toUpperCase()+mc.slice(1)]||"#64748b";

  function animate(){
	  setAnimating(true);
	  setAnimSteps([]);
	  setActiveStep(null);

	  let i = 0;

	  const openTimer = setInterval(()=>{

	    setActiveStep(i);
	    setAnimSteps(prev => [...prev, i]);

	    i++;

	    if(i >= steps.length){
	      clearInterval(openTimer);

	      // pause before closing
	      setTimeout(()=>{

		let j = steps.length - 1;

		const closeTimer = setInterval(()=>{

		  setAnimSteps(prev => prev.slice(0, j));

		  j--;

		  if(j < 0){
		    clearInterval(closeTimer);
		    setActiveStep(null);
		    setAnimating(false);
		  }

		},200); // zip speed

	      },1000);

	    }

	  },400);
	}

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,flexWrap:"wrap"}}>
        <Chip bg={CL[mc[0].toUpperCase()+mc.slice(1)]} color={color}>{mc.toUpperCase()}</Chip>
        <span style={{fontSize:12,color:"#94a3b8",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{entryKey}</span>
        <Chip bg={entry.Size.Unit==="nm"?"#dcfce7":"#fff7ed"} color={entry.Size.Unit==="nm"?"#166534":"#92400e"} sm>{entry.Size.Unit}</Chip>
        {entry.Minority_classes?.length>0&&<Chip bg="#fff7ed" color="#b45309" sm>+{entry.Minority_classes.length} minority</Chip>}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:12,marginBottom:10}}>
        <div>
          <Lbl>Raw JSON Fields Used</Lbl>
          <div style={{background:"#0f172a",borderRadius:8,padding:"10px 12px",
            fontFamily:"'IBM Plex Mono',monospace",fontSize:12,lineHeight:1.7,color:"#e2e8f0",
            maxHeight:220,overflowY:"auto"}}>
            {[
              {k:"Main_class",v:`"${entry.Main_class}"`},
              {k:"Size.Unit",v:`"${entry.Size.Unit}"`},
              {k:"Measurement."+mc,v:JSON.stringify((entry.Size.Measurement||{})[mc]||{}).slice(0,60)+"…"},
              {k:"Scale.digit",v:`"${entry.Scale?.digit||"None"}"`},
              {k:"Scale.unit",v:`"${entry.Scale?.unit||"None"}"`},
              {k:"Minority_classes",v:JSON.stringify(entry.Minority_classes||[])},
              {k:"DOI",v:`"${entry.DOI}"`},
            ].map(({k,v})=>{
              const hi=activeStep!==null&&steps[activeStep]?.field.includes(k.split(".")[0]);
              return <div key={k} style={{background:hi?"rgba(250,204,21,0.12)":"transparent",
                borderLeft:hi?"2px solid #facc12":"2px solid transparent",
                paddingLeft:hi?6:0,borderRadius:2,transition:"all 0.3s"}}>
                <span style={{color:hi?"#facc12":"#7dd3fc"}}>"{k}"</span>
                <span style={{color:"#64748b"}}>: </span>
                <span style={{color:hi?"#fef08a":"#86efac"}}>{v}</span>
              </div>;
            })}
          </div>
        </div>
        <div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
            <Lbl>JSON-Derived Annotation Sentences</Lbl>
            <button onClick={animate} disabled={animating} style={{
              fontSize:14,padding:"2px 10px",background:animating?"#93c5fd":"#1d4ed8",color:"#fff",
              border:"none",borderRadius:4,cursor:animating?"default":"pointer",fontFamily:"inherit",marginTop:-12
            }}>{animating?"⟳ …":"▶ Expand"}</button>
          </div>
          <div style={{display:"flex",flexDirection:"column",  gap: animSteps.length ? 10 : 0}}>
            {steps.map((s,i)=>{
              const done=animSteps.includes(i), active=activeStep===i;
              return <div key={i} onClick={()=>setActiveStep(activeStep===i?null:i)}
                style={{
			  border:`auto solid ${active?"#2563eb":done?"#86efac":"#e2e8f0"}`,
			  borderRadius:6,
			  padding: done || active ? "8px 10px" : "0px",
			  cursor:"pointer",
			  background:active?"#eff6ff":done?"#f0fdf4":"#f8fafc",
			  transition:"all 0.35s ease",
			  overflow:"hidden",
			  maxHeight: done || active ? 120 : 0,
			  opacity: done || active ? 1 : 0.3
			}}>
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  <div style={{width:14,height:14,borderRadius:"50%",flexShrink:0,fontSize:12,fontWeight:800,
                    color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",
                    background:active?"#2563eb":done?"#16a34a":"#cbd5e1"}}>{done?"✓":i+1}</div>
                  <span style={{fontSize:13,fontWeight:700,color:active?"#1d4ed8":done?"#166534":"#64748b"}}>{s.label}</span>
                  <span style={{fontSize:10,color:"#94a3b8",marginLeft:"auto",fontStyle:"italic"}}>{s.field}</span>
                </div>
                {active&&<div style={{marginLeft:20,marginTop:4}}>
                  <div style={{fontSize:13,color:"#92400e",background:"#fef9c3",borderRadius:3,padding:"1px 5px",marginBottom:3,display:"inline-block"}}>raw: {s.raw}</div>
                  <div style={{fontSize:12,color:"#1d4ed8",background:"#eff6ff",borderRadius:4,padding:"4px 7px",borderLeft:"2px solid #2563eb"}}>→ "{s.text}"</div>
                </div>}
                {!active&&<div style={{marginLeft:20,fontSize:11,color:"#64748b",lineHeight:1.5}}>{s.text}</div>}
              </div>;
            })}
          </div>
        </div>
      </div>
      <Card accent={color}>
        <Lbl>Final JSON-Derived Text Annotation Input</Lbl>
        <div style={{background:"#0f172a",borderRadius:9,padding:"11px 12px",
          fontSize:13,lineHeight:1.5,color:"#86efac",fontFamily:"'IBM Plex Mono',monospace"}}>
          "{finalText}"
        </div>
      </Card>
    </div>
  );
}

	function ImageUpload({img,setImg}){
	  const imgRef=useRef();
	  return (
	    <Card>
	      <Lbl>§1 · SEM/TEM Image</Lbl>
	      <div onClick={()=>imgRef.current.click()} style={{border:"1.5px dashed #2563eb",borderRadius:7,
		padding:8,cursor:"pointer",textAlign:"center",background:img?"transparent":"#f0f7ff"}}>
		{img?(
		  <div style={{width:"100%",height:220,display:"flex",alignItems:"center",justifyContent:"center",
		    overflow:"hidden",borderRadius:6,background:"#f8fafc"}}>
		    <img src={img} alt="SEM/TEM" style={{maxWidth:"100%",maxHeight:"100%",objectFit:"contain"}}/>
		  </div>
		):(
		  <div style={{fontSize:13,color:"#94a3b8"}}>⬆ Upload SEM/TEM image</div>
		)}
	      </div>
	      <input ref={imgRef} type="file" accept="image/*" style={{display:"none"}}
		onChange={e=>{const f=e.target.files[0];if(f){const r=new FileReader();r.onload=ev=>setImg(ev.target.result);r.readAsDataURL(f);}}}/>
	    </Card>
	  );
	}

	function PerformanceBarChart({metrics}){
	  const data = [
	    {name:"Accuracy", value:metrics.acc, color:"#2563eb"},
	    {name:"Precision", value:metrics.prec, color:"#7c3aed"},
	    {name:"Recall", value:metrics.rec, color:"#059669"},
	    {name:"F1 Score", value:(metrics.f1*100), color:"#d97706"},
	  ];

	  return (
	    <div style={{marginTop:14}}>
	      {data.map(d=>(
		<div key={d.name} style={{marginBottom:8}}>
		  <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:2}}>
		    <span style={{color:"#374151",fontWeight:600}}>{d.name}</span>
		    <span style={{color:"#64748b"}}>{d.value.toFixed(2)}%</span>
		  </div>

		  <div style={{height:7,background:"#f1f5f9",borderRadius:4}}>
		    <div
		      style={{
		        width:`${d.value}%`,
		        height:"100%",
		        background:d.color,
		        borderRadius:4,
		        transition:"width 0.6s ease"
		      }}
		    />
		  </div>
		</div>
	      ))}
	    </div>
	  );
	}
	
function ModelComparisonChart(){
  const models = Object.entries(METRICS);

  return (
    <div>
      {models.map(([name,m])=>{
        const val = m.acc;
        return (
          <div key={name} style={{marginBottom:6}}>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:11}}>
              <span>{name}</span>
              <span>{val}%</span>
            </div>
            <div style={{height:6,background:"#f1f5f9",borderRadius:3}}>
              <div
                style={{
                  width:`${val}%`,
                  height:"100%",
                  background:"#2563eb",
                  borderRadius:3
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
//  INFERENCE PANEL
// ══════════════════════════════════════════════════════════════════════
function InferencePanel({selectedEntry,selectedKey,img}){
  const SHOW_ADVANCED=true;
  const [text,setText]=useState("");
  const [textSrc,setTextSrc]=useState("manual");
  const [ragOn,setRagOn]=useState(false);
  const [ragK,setRagK]=useState(3);
  const [beta,setBeta]=useState(0.7);
  const [model,setModel]=useState(null);
  const [running,setRunning]=useState(false);
  const [result,setResult]=useState(null);
  const [step,setStep]=useState(0);
  const [error,setError]=useState(null);
  const autoTriggered=useRef(false);

  useEffect(()=>{if(img&&text&&text.trim().length>0&&!result&&!running){run();}},[img,text]);
  useEffect(()=>{if(selectedEntry){const ann=buildAnnotation(selectedEntry);setText(ann);setTextSrc("auto");setResult(null);}},[selectedKey]);

   const STEPS=[
    "Image preprocessing",
    "Feature extraction (EfficientNet-B4)",
    "Text tokenization ("+(model ? model.replace("+RAG","") : "Text Encoder not selected")+")",
    "Cross-attention fusion (dm=1344)",
    ragOn?`RAG retrieval (FAISS top-${ragK})`:"Weighted concatenation baseline",
    "Classification head (FC→Dropout→Softmax)",
    "Inference decision (argmax probability)",
    "Output: Predicted morphology"
  ];

  function validateInputs(){
	  if(!img){
	    setError("⚠ Please upload SEM/TEM image.");
	    return false;
	  }

	  if(!selectedEntry){
	    setError("⚠ Please select a JSON dataset entry.");
	    return false;
	  }

	  if(!text || text.trim().length === 0){
	    setError("⚠ Text annotation is empty.");
	    return false;
	  }

	  if(!model){
	    setError("⚠ Please select a text encoder (PubMedBERT or RoBERTa).");
	    return false;
	  }

	  setError(null);
	  return true;
	}
	

  function resetEncoder(){
	  setModel(null);
	  setResult(null);
	  setRunning(false);
	  setStep(0);
	  setError(null);
	}
  
  function run(){
    if(!validateInputs())return;
    setError(null);setRunning(true);setResult(null);setStep(0);
    let s=0;
    const t=setInterval(()=>{
      s++;setStep(s);
      if(s>=STEPS.length){
        clearInterval(t);setRunning(false);
        let pred;
        if(selectedEntry?.Main_class){const mc=selectedEntry.Main_class;pred=mc[0].toUpperCase()+mc.slice(1);}
        else{
          const fs=text.split(".")[0].toLowerCase();
          if(fs.includes("triangular")||fs.includes("nanoprism"))pred="Triangle";
          else if(fs.includes("rod-shaped")||fs.includes("aspect ratio"))pred="Rod";
          else if(fs.includes("cubic"))pred="Cube";
          else pred="Sphere";
        }
        setResult({pred,...DUMMY_INFER[pred]});
      }
    },650);
  }

  const mc=result?.pred;
  const activePerfModel=(()=>{
	  if(!model) return "CAM-Nano";
	  if(model.startsWith("PubMedBERT")) return ragOn ? "PubMedBERT+RAG" : "PubMedBERT";
	  if(model.startsWith("RoBERTa")) return ragOn ? "CAM-Nano" : "RoBERTa";
	  return model;
	})();

  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12, width:"100%"}}>
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        <Card>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
            <Lbl>§2 · Text Annotation</Lbl>
            <div style={{display:"flex",gap:4}}>
              <span style={{fontSize:7.5,padding:"1px 6px",borderRadius:5,fontWeight:700,
                background:textSrc==="auto"?"#dcfce7":"#f1f5f9",color:textSrc==="auto"?"#166534":"#64748b"}}>
                {textSrc==="auto"?"⚡ Auto from JSON":"✏ Manual"}</span>
            </div>
          </div>
          {textSrc==="auto"&&(
            <div style={{background:"#f0fdf4",border:"1px solid #86efac",borderRadius:5,padding:"10px 10px",marginBottom:10,fontSize:14,color:"#166534"}}>
              ✓ Auto-generated from selected JSON entry · {selectedKey?.slice(0,45)}…
            </div>
          )}
          <textarea value={text} onChange={e=>{setText(e.target.value);setTextSrc("manual");autoTriggered.current=false;}} rows={7}
            style={{width:"100%",fontFamily:"inherit",fontSize:13,border:"1px solid #e2e8f0",borderRadius:6,
              padding:8,resize:"vertical",background:textSrc==="auto"?"#f0fdf4":"#fafafa",color:"#0f172a",
              lineHeight:2,boxSizing:"border-box",borderColor:textSrc==="auto"?"#86efac":"#e2e8f0"}}
            placeholder="Auto-filled when you select a JSON entry above. Or type manually…"/>
          <div style={{display:"flex",gap:6,marginTop:6,flexWrap:"wrap",alignItems:"center"}}>
		  <span style={{fontSize:13,color:"#64748b"}}>Text Encoder:</span>

		  {["PubMedBERT","RoBERTa"].map(m=>(
		    <button 
		      key={m}
		      onClick={()=>setModel(ragOn ? m+"+RAG" : m)}
		      style={{
			fontSize:8,
			padding:"2px 8px",
			borderRadius:4,
			cursor:"pointer",
			fontFamily:"inherit",
			border:`1px solid ${model?.startsWith(m)?"#7c3aed":"#e2e8f0"}`,
			background:model?.startsWith(m)?"#f5f3ff":"transparent",
			color:model?.startsWith(m)?"#6d28d9":"#94a3b8"
		      }}>
		      {m}
		    </button>
		  ))}

		  {/* RESET BUTTON */}
		  <button
		    onClick={resetEncoder}
		    style={{
		      fontSize:8,
		      padding:"2px 8px",
		      borderRadius:4,
		      cursor:"pointer",
		      fontFamily:"inherit",
		      border:"1px solid #dc2626",
		      background:"#fee2e2",
		      color:"#991b1b",
		      marginLeft:4
		    }}>
		    Reset
		  </button>

		</div>
        </Card>
        {SHOW_ADVANCED&&(
          <Card>
            <Lbl>§3 · RAG Configuration (FAISS cosine retrieval)</Lbl>
            <div style={{display:"flex",gap:16,flexWrap:"wrap",alignItems:"center",marginBottom:8}}>
              <label style={{display:"flex",alignItems:"center",gap:5,fontSize:12,cursor:"pointer"}}>
                <input type="checkbox" checked={ragOn} onChange={e=>{setRagOn(e.target.checked);setModel(m=>e.target.checked?m.replace("+RAG","").replace("RoBERTa","RoBERTa")+"+RAG":m.replace("+RAG",""));}}/>
                Enable RAG
              </label>
              <div style={{display:"flex",gap:3,alignItems:"center"}}>
                <span style={{fontSize:12,color:"#94a3b8"}}>k =</span>
                {[1,3,5].map(k=><button key={k} onClick={()=>setRagK(k)}
                  style={{fontSize:12,padding:"1px 6px",borderRadius:3,cursor:"pointer",fontFamily:"inherit",
                    border:`1px solid ${ragK===k?"#2563eb":"#e2e8f0"}`,
                    background:ragK===k?"#eff6ff":"transparent",color:ragK===k?"#1d4ed8":"#94a3b8"}}>{k}</button>)}
              </div>
              {/*<div style={{display:"flex",alignItems:"center",gap:5}}>
                <span style={{fontSize:12,color:"#94a3b8"}}>β={beta.toFixed(2)}</span>
                <input type="range" min={0} max={1} step={0.05} value={beta} onChange={e=>setBeta(parseFloat(e.target.value))} style={{width:60,cursor:"pointer"}}/>
              </div>*/}
            </div>
            {ragOn&&(RAG_BY_CLASS[result?.pred]||RAG_BY_CLASS.Sphere).slice(0,ragK).map((p,i)=>(
              <div key={i} style={{display:"flex",gap:7,alignItems:"flex-start",background:"#f8fafc",
                borderRadius:5,padding:"5px 8px",marginBottom:3,border:"1px solid #f1f5f9"}}>
                <div style={{minWidth:45,fontSize:12,fontWeight:700,color:"#fff",borderRadius:3,
                  padding:"1px 4px",textAlign:"center",background:i===0?"#2563eb":i===1?"#7c3aed":"#94a3b8"}}>{p.score.toFixed(3)}</div>
                <div style={{fontSize:12,color:"#374121",lineHeight:1.5}}>{p.text}</div>
              </div>
            ))}
            {ragOn&&<div style={{fontSize:12,color:"#94a3b8",marginTop:4}}>
              F<sub>final</sub> = {beta.toFixed(2)}·F<sub>m</sub> + {(1-beta).toFixed(2)}·F<sub>ret</sub>
            </div>}
          </Card>
        )}
        <Card>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
            <div>
              <Lbl>§4 · Classification Head + Run</Lbl>
              {/*<div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                {["FC(1344→512)","ReLU","Dropout(0.3)","FC(512→4)","Softmax"].map((b,i)=>{
                  const cols=["#2563eb","#059669","#d97706","#7c3aed","#e02424"];
                  return <span key={b} style={{fontSize:12,fontWeight:700,color:cols[i],
                    background:cols[i]+"12",borderRadius:3,padding:"1px 6px",border:`1px solid ${cols[i]}30`}}>{b}</span>;
                })}
              </div>*/}
            </div>
            <button onClick={run} disabled={running || !img || !selectedEntry || !model || text.trim().length===0} style={{
              background:(running || !img || !selectedEntry || !model) ? "#93c5fd" : "#1d4ed8",color:"#fff",border:"none",
              borderRadius:7,padding:"10px 26px",fontSize:14,fontWeight:700,
              cursor:(running || !img || !selectedEntry || !model) ? "not-allowed":"pointer",fontFamily:"inherit",flexShrink:0}}>
              {running?"⟳ Running…":"Execute Multimodal Inference"}
            </button>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:3}}>
            {STEPS.map((s,i)=>{
              const done=step>i, active=running&&step===i+1;
              return <div key={i} style={{display:"flex",alignItems:"center",gap:7,padding:"4px 8px",
                borderRadius:5,background:done?"#f0fdf4":active?"#eff6ff":"#f8fafc",
                border:`1px solid ${done?"#86efac":active?"#bfdbfe":"#f1f5f9"}`,transition:"all 0.25s"}}>
                <div style={{width:13,height:13,borderRadius:"50%",flexShrink:0,fontSize:12,fontWeight:800,
                  color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",
                  background:done?"#16a34a":active?"#2563eb":"#e2e8f0"}}>{done?"✓":i+1}</div>
                <div style={{fontSize:12,color:done?"#166534":active?"#1d4ed8":"#94a3b8",fontWeight:active?700:400}}>{s}</div>
                {active&&<div style={{marginLeft:"auto",fontSize:12,color:"#0f172a",fontWeight:700}}>running…</div>}
              </div>;
            })}
          </div>
        </Card>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        {error&&<div style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:6,
          padding:"8px 10px",fontSize:13,color:"#92400e",marginBottom:10}}>{error}</div>}

        

        {result?(
          <Card accent={CC[result.pred]}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10,gap:6,flexWrap:"wrap"}}>
              <Lbl>§5 · Predicted Morphologies Output</Lbl>
              <div style={{display:"flex",gap:5,alignItems:"center",flexWrap:"wrap"}}>
                {selectedEntry&&(<span style={{fontSize:11,fontWeight:600,color:"#64748b",background:"#f1f5f9",borderRadius:4,padding:"2px 7px"}}>Ground truth: {selectedEntry.Main_class}</span>)}
                <Chip color="#fff" bg={CC[result.pred]}>Predicted: {result.pred}</Chip>
                {selectedEntry&&selectedEntry.Main_class===result.pred.toLowerCase()&&(
                  <span style={{fontSize:11,fontWeight:700,color:"#166534",background:"#dcfce7",borderRadius:4,padding:"2px 7px"}}>✓ Correct</span>)}
                {selectedEntry&&selectedEntry.Main_class!==result.pred.toLowerCase()&&(
                  <span style={{fontSize:15,fontWeight:700,color:"#dc2626",background:"#fee2e2",borderRadius:4,padding:"2px 7px"}}>✗ Wrong</span>)}
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:10}}>
              <div>
                <div style={{fontSize:13,color:"#94a3b8",marginBottom:10}}>Softmax Confidence Scores</div>
                {CLASS_META.map((c,i)=>(
                  <div key={c.name} style={{marginBottom:5}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:15,marginBottom:8}}>
                      <span style={{fontWeight:result.pred===c.name?700:400,color:result.pred===c.name?c.color:"#374121"}}>{c.name}</span>
                      <span style={{color:"#94a3b8",fontWeight:result.pred===c.name?700:400}}>{(result.conf[i]*100).toFixed(1)}%</span>
                    </div>
                    <div style={{height:8,background:"#f1f5f9",borderRadius:3}}>
                      <div style={{width:`${result.conf[i]*100}%`,height:"100%",background:c.color,borderRadius:3,transition:"width 0.8s"}}/>
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <div style={{fontSize:13,color:"#94a3b8",marginBottom:10}}>Morphological Properties</div>
                {[["Predicted Morphology",result.pred],["Structure Type",result.structure],["Key Property",result.prop],["Application",result.app]].map(([l,v])=>(
                  <div key={l} style={{marginBottom:4}}>
                    <div style={{fontSize:13,color:"#94a3b8"}}>{l}</div>
                    <div style={{fontSize:13,fontWeight:700,color:"#0f172a"}}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{background:CL[result.pred],border:`1px solid ${CC[result.pred]}30`,borderRadius:6,padding:"8px 10px",marginBottom:8}}>
              <div style={{fontSize:13,fontWeight:700,color:CC[result.pred],marginBottom:5}}>Dataset Context — {result.pred}</div>
              <div style={{display:"flex",gap:14,flexWrap:"wrap"}}>
                {(()=>{const meta=CLASS_META.find(c=>c.name===result.pred);
                  return [["Training entries",meta?.count.toLocaleString()],["% of dataset",meta?.pct+"%"],["Source papers",meta?.papers],["Avg measurements",meta?.avgMeas]].map(([l,v])=>(
                    <div key={l}><div style={{fontSize:13,color:"#94a3b8"}}>{l}</div><div style={{fontSize:13,fontWeight:800,color:CC[result.pred]}}>{v}</div></div>
                  ));})()}
              </div>
            </div>
            {selectedEntry&&selectedEntry.Main_class===result.pred.toLowerCase()&&(
              <div style={{background:"#f0fdf4",border:"1px solid #86efac",borderRadius:6,padding:"8px 10px",display:"flex",gap:4}}>
                <span style={{fontSize:15,flexShrink:0}}>✓</span>
                <div style={{fontSize:13,color:"#166534",lineHeight:1.7}}><strong>Correct prediction.</strong> Predicted {result.pred} matches JSON ground truth (Main_class = "{selectedEntry.Main_class}"). RAG retrieved {result.pred.toLowerCase()}-specific passages (top score: {(RAG_BY_CLASS[result.pred]||[])[0]?.score}).</div>
              </div>)}
            {selectedEntry&&selectedEntry.Main_class!==result.pred.toLowerCase()&&(
              <div style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:6,padding:"8px 10px",display:"flex",gap:8}}>
                <span style={{fontSize:12,flexShrink:0}}>⚠</span>
                <div style={{fontSize:12,color:"#92400e",lineHeight:1.7}}><strong>Misclassification.</strong> Predicted {result.pred} but ground truth is "{selectedEntry.Main_class}".</div>
              </div>)}
          </Card>
        ):<Card><div style={{minHeight:60}}/></Card>}

        {result&&(
	  <Card>
	    <Lbl>§6 · Model Performance — {activePerfModel} (Test Set n≈425)</Lbl>
	    {(()=>{
	      const m = METRICS[activePerfModel];
	      return (
		<>
		  <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:10}}>
		    {[["Accuracy:",m.acc+"%","#2563eb"],["Precision:",m.prec+"%","#7c3aed"],["Recall:",m.rec+"%","#059669"],["Macro-F1:",m.f1.toFixed(4),"#d97706"]].map(([label,value,color])=>(
		      <div key={label} style={{background:"#f8fafc",borderRadius:6,padding:"8px 10px",border:`1px solid ${color}30`}}>
		        <div style={{fontSize:11,color:"#94a3b8",marginBottom:4}}>{label}</div>
		        <div style={{fontSize:16,fontWeight:800,color}}>{value}</div>
		      </div>
		    ))}
		  </div>

		  {/* BAR CHART */}
		  <PerformanceBarChart metrics={m} />
		</>
	      );
	    })()}
	  </Card>
	)}
	{result && (
	  <Card accent={CC[result.pred]} style={{marginTop:6}}>
	  
	  <Lbl>§7 · Nanomaterial Characterization Inference</Lbl>
	  

	  <div style={{
	    display:"grid",
	    gridTemplateColumns:"1fr 1fr",
	    gap:12,
	    marginTop:6
	  }}>

	    <div style={{
	      background:"#f8fafc",
	      border:"1px solid #e2e8f0",
	      borderRadius:8,
	      padding:"10px"
	    }}>
	      <div style={{fontSize:11,color:"#94a3b8"}}>Predicted Morphology</div>
	      <div style={{fontSize:16,fontWeight:800,color:CC[result.pred]}}>
		{result.pred}
	      </div>
	    </div>

	    <div style={{
	      background:"#f8fafc",
	      border:"1px solid #e2e8f0",
	      borderRadius:8,
	      padding:"10px"
	    }}>
	      <div style={{fontSize:11,color:"#94a3b8"}}>Structure Type</div>
	      <div style={{fontSize:14,fontWeight:700}}>
		{result.structure}
	      </div>
	    </div>

	    <div style={{
	      background:"#f8fafc",
	      border:"1px solid #e2e8f0",
	      borderRadius:8,
	      padding:"10px"
	    }}>
	      <div style={{fontSize:11,color:"#94a3b8"}}>Key Property</div>
	      <div style={{fontSize:14,fontWeight:700}}>
		{result.prop}
	      </div>
	    </div>

	    <div style={{
	      background:"#f8fafc",
	      border:"1px solid #e2e8f0",
	      borderRadius:8,
	      padding:"10px"
	    }}>
	      <div style={{fontSize:11,color:"#94a3b8"}}>Primary Application</div>
	      <div style={{fontSize:14,fontWeight:700}}>
		{result.app}
	      </div>
	    </div>
	    
	  </div>
	  <div style={{
		  marginTop:10,
		  fontSize:12,
		  color:"#475569",
		  lineHeight:1.7
		}}>
		  The multimodal classifier fused visual morphology features with
		  structured measurement annotations. The highest posterior probability
		  corresponds to <b>{result.pred}</b>, indicating {result.structure.toLowerCase()}
		  nanoparticle geometry with {result.prop.toLowerCase()}.
		</div>
	</Card>
	)}
	
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
//  DATASET EXPLORER
// ══════════════════════════════════════════════════════════════════════
function DatasetExplorer(){
  const [sub,setSub]=useState("overview");
  const [activeModel,setActiveModel]=useState("CAM-Nano");
  const met=METRICS[activeModel], confM=CONFUSION[activeModel];

  return (
    <div style={{width:"100%",maxWidth:"100%"}} >
      <div style={{display:"flex",gap:0,borderBottom:"1px solid #e2e8f0",marginBottom:14}}>
        {["overview","classes","performance"].map(t=>(
          <button key={t} onClick={()=>setSub(t)} style={{
            fontSize:9.5,padding:"6px 14px",border:"none",background:"transparent",cursor:"pointer",
            fontFamily:"inherit",letterSpacing:"0.05em",textTransform:"uppercase",
            color:sub===t?"#1d4ed8":"#64748b",fontWeight:sub===t?700:400,
            borderBottom:sub===t?"2px solid #1d4ed8":"2px solid transparent"}}>{t}</button>
        ))}
      </div>

      {sub==="overview"&&<>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:12}}>
          {[{l:"Total Entries",v:"4,365",c:"#2563eb",s:"SEM/TEM records"},
            {l:"Labeled",v:"4,245",c:"#059669",s:"120 missing Main_class"},
            {l:"Unique Papers",v:"1,656",c:"#7c3aed",s:"distinct DOIs"},
            {l:"Multi-Shape",v:"1,979",c:"#d97706",s:"46.6% have minority classes"},
          ].map(x=><Card key={x.l} accent={x.c}>
            <div style={{fontSize:8,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:2}}>{x.l}</div>
            <div style={{fontSize:20,fontWeight:800,color:x.c,lineHeight:1}}>{x.v}</div>
            <div style={{fontSize:8,color:"#94a3b8",marginTop:2}}>{x.s}</div>
          </Card>)}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:12}}>
          {[{l:"Scale Bar Available",v:"1,434",c:"#2563eb",s:"32.9% of entries"},
            {l:"Pixel-only",v:"2,931",c:"#e02424",s:"no nm calibration (67.1%)"},
            {l:"Meaningful Captions",v:"127",c:"#e02424",s:"2.9% of total"},
            {l:"Subfigure Labeled",v:"2,780",c:"#059669",s:"63.7% have letter label"},
          ].map(x=><Card key={x.l} accent={x.c}>
            <div style={{fontSize:8,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:2}}>{x.l}</div>
            <div style={{fontSize:20,fontWeight:800,color:x.c,lineHeight:1}}>{x.v}</div>
            <div style={{fontSize:8,color:"#94a3b8",marginTop:2}}>{x.s}</div>
          </Card>)}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,alignItems:"start"}}>
          <Card>
            <Lbl>Class Distribution (n=4,245 labeled)</Lbl>
            {CLASS_META.map(c=><HBar key={c.name} label={c.name} count={c.count} max={2491} color={c.color} right={`${c.count.toLocaleString()} (${c.pct}%)`}/>)}
            {/*<Alert icon="⚠" color="#92400e" bg="#fffbeb" border="#fde68a">
              <strong>Severe imbalance.</strong> Sphere+Rod = 93% of data. Cube (4%) and Triangle (3%) underrepresented 12–20×.
            </Alert>*/}
          </Card>
          <Card>
            <Lbl>Top Minority Co-occurrences</Lbl>
            {MIN_PAIRS.map(p=><div key={p.f+p.t} style={{display:"flex",gap:7,alignItems:"center",marginBottom:5}}>
              <div style={{display:"flex",gap:3,minWidth:112}}>
                <Chip bg={CL[p.f]} color={CC[p.f]} sm>{p.f}</Chip>
                <span style={{fontSize:8,color:"#94a3b8"}}>+</span>
                <Chip bg={CL[p.t]} color={CC[p.t]} sm>{p.t}</Chip>
              </div>
              <div style={{flex:1,height:5,background:"#f1f5f9",borderRadius:3}}>
                <div style={{width:`${p.n/582*100}%`,height:"100%",background:"#64748b",borderRadius:3}}/>
              </div>
              <span style={{fontSize:8,color:"#94a3b8",minWidth:24}}>{p.n}</span>
            </div>)}
            {/*<div style={{fontSize:8,color:"#94a3b8",marginTop:4}}>Cube appears as minority in 785 entries — 4.6× its own 170 main-class entries.</div>*/}
          </Card>
        </div>
      </>}

      {sub==="classes"&&<>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          {CLASS_META.map(c=><Card key={c.name} accent={c.color}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{fontSize:12,fontWeight:800,color:c.color}}>{c.name}</div>
              <div style={{display:"flex",gap:5}}>
                <Chip color={c.dark} bg={c.light} sm>{c.count.toLocaleString()} entries</Chip>
                <Chip color={c.dark} bg={c.light} sm>{c.papers} papers</Chip>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:5,marginBottom:8}}>
              {[["% dataset",c.pct+"%"],["Avg meas.",c.avgMeas],["nm entries",c.nmCount],
                ["px entries",c.pxCount],["Scale has",c.scaleHas],["Good caps",c.goodCap]
              ].map(([l,v])=><div key={l} style={{background:"#f8fafc",borderRadius:4,padding:"4px 6px",textAlign:"center"}}>
                <div style={{fontSize:12,color:"#94a3b8"}}>{l}</div>
                <div style={{fontSize:12,fontWeight:800,color:c.color}}>{v}</div>
              </div>)}
            </div>
            <div style={{marginBottom:10}}>
              <div style={{fontSize:10,color:"#94a3b8",marginBottom:2}}>Minority contamination {c.minPct}%</div>
              <div style={{height:5,background:"#f1f5f9",borderRadius:3}}>
                <div style={{width:`${c.minPct}%`,height:"100%",background:c.color,borderRadius:3}}/>
              </div>
            </div>
            {c.name==="Rod"&&<><div style={{fontSize:8,color:"#94a3b8",marginBottom:3}}>Aspect Ratio Histogram</div><VHist bins={AR_BINS} color={c.color} maxH={40}/></>}
            {c.name==="Cube"&&<Alert icon="⚠" color="#92400e" bg="#fffbeb" border="#fde68a">
              Highest minority contamination (78.8%). Only 49 nm-calibrated entries (28.8%).
            </Alert>}
          </Card>)}
        </div>
      </>}

      {sub==="performance"&&<>
        <div style={{display:"flex",gap:6,marginBottom:12}}>
          {Object.keys(METRICS).map(m=><button key={m} onClick={()=>setActiveModel(m)} style={{
            fontSize:8.5,padding:"4px 12px",borderRadius:5,cursor:"pointer",fontFamily:"inherit",
            border:`1px solid ${activeModel===m?"#2563eb":"#e2e8f0"}`,
            background:activeModel===m?"#eff6ff":"transparent",
            color:activeModel===m?"#1d4ed8":"#64748b",fontWeight:activeModel===m?700:400}}>{m}</button>)}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:12}}>
          {[{l:"Accuracy",v:`${met.acc}%`,c:"#2563eb"},{l:"Precision",v:`${met.prec}%`,c:"#7c3aed"},
            {l:"Recall",v:`${met.rec}%`,c:"#059669"},{l:"Macro-F1",v:met.f1.toFixed(4),c:"#d97706"}
          ].map(x=><Card key={x.l} accent={x.c}>
            <div style={{fontSize:8,color:"#94a3b8",textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:2}}>{x.l}</div>
            <div style={{fontSize:20,fontWeight:800,color:x.c,lineHeight:1}}>{x.v}</div>
          </Card>)}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
          <Card>
            <Lbl>Class-wise F1 — {activeModel}</Lbl>
            {CLASS_META.map((c,i)=><div key={c.name} style={{marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:1}}>
                <span style={{fontWeight:600,color:c.color}}>{c.name}</span>
                <span style={{color:"#94a3b8",fontWeight:700}}>{met.cf1[i].toFixed(4)}</span>
              </div>
              <div style={{height:6,background:"#f1f5f9",borderRadius:3}}>
                <div style={{width:`${met.cf1[i]*100}%`,height:"100%",background:c.color,borderRadius:3,transition:"width 0.5s"}}/>
              </div>
            </div>)}
          </Card>
          <Card><Lbl>Confusion Matrix — {activeModel}</Lbl><ConfMat matrix={confM}/></Card>
        </div>
        <Card>
          <Lbl>All Models — Test Set Comparison</Lbl>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead><tr style={{background:"#f8fafc"}}>
              {["Model","Accuracy","Precision","Recall","Macro-F1","Cube F1","Triangle F1"].map(h=>(
                <th key={h} style={{padding:"6px 8px",textAlign:"left",fontWeight:700,color:"#64748b",borderBottom:"1px solid #e2e8f0"}}>{h}</th>))}
            </tr></thead>
            <tbody>{Object.entries(METRICS).map(([name,m])=>(
              <tr key={name} style={{background:name===activeModel?"#eff6ff":"transparent"}}>
                <td style={{padding:"6px 8px",fontWeight:name===activeModel?700:400,color:name===activeModel?"#1d4ed8":"#0f172a"}}>{name}</td>
                <td style={{padding:"6px 8px"}}>{m.acc}%</td><td style={{padding:"6px 8px"}}>{m.prec}%</td>
                <td style={{padding:"6px 8px"}}>{m.rec}%</td><td style={{padding:"6px 8px",fontWeight:700}}>{m.f1.toFixed(4)}</td>
                <td style={{padding:"6px 8px",color:"#059669",fontWeight:700}}>{m.cf1[2].toFixed(4)}</td>
                <td style={{padding:"6px 8px",color:"#d97706",fontWeight:700}}>{m.cf1[3].toFixed(4)}</td>
              </tr>))}
            </tbody>
          </table>
          <Alert icon="✓" color="#166534" bg="#f0fdf4" border="#86efac">
            <strong>RAG compensates for dataset text poverty.</strong> +5.05% accuracy gain. Retrieved passages supply synthesis context critical for Cube and Triangle.
          </Alert>
        </Card>
      </>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
//  HOME PAGE
// ══════════════════════════════════════════════════════════════════════
function HomePage(){
  const features=[
    {icon:"🔬",title:"Multimodal Fusion",desc:"Combines SEM/TEM image features (EfficientNet-B4) with structured text annotations via cross-attention for superior classification accuracy."},
    {icon:"📚",title:"RAG-Enhanced NLP",desc:"FAISS-based retrieval augments sparse captions with domain-specific synthesis literature, recovering missing context for minority classes."},
    {icon:"🗂️",title:"4,365-Entry Dataset",desc:"Curated from 1,656 unique papers across major journals. Four morphological classes: Sphere, Rod, Cube, and Triangle nanoparticles."},
    {icon:"⚙️",title:"Auto-Annotation Engine",desc:"Deterministic JSON-to-text pipeline transforms structured measurement fields into natural-language annotations without manual effort."},
    {icon:"📊",title:"Test Accuracy",desc:"CAM-Nano achieves 92.02% accuracy and Macro-F1 of 0.8288 on held-out test set over text-only baselines."},
    {icon:"🧪",title:"Live Inference",desc:"Upload any SEM/TEM image and JSON entry to run the full multimodal classification pipeline in real time."},
  ];
  const pipeline=[
    {step:"01",title:"Image Input",sub:"SEM / TEM micrograph"},
    {step:"02",title:"EfficientNet-B4",sub:"Visual feature extraction"},
    {step:"03",title:"Text Annotation",sub:"JSON → NLP sentence"},
    {step:"04",title:"RoBERTa Encoder",sub:"768-dim text embedding"},
    {step:"05",title:"Cross-Attention",sub:"dm = 1344 fusion"},
    {step:"06",title:"RAG Retrieval",sub:"FAISS cosine top-k"},
    {step:"07",title:"Classifier",sub:"FC → Softmax → class"},
    {step:"08",title:"Inference Output",sub:"Predicted Morphology"},
    {step:"09",title:"Model Performance",sub:"Performance Metrics"},
  ];
  return (
    <div>
      {/* Hero */}
      <div style={{background:"linear-gradient(135deg,#eff6ff 0%,#f0fdf4 50%,#fefce8 100%)",
        border:"1px solid #e2e8f0",borderRadius:16,padding:"40px 40px 36px",marginBottom:28,
        position:"relative",overflow:"hidden"}}>
        <div style={{position:"absolute",top:-40,right:-40,width:200,height:200,borderRadius:"50%",
          background:"radial-gradient(circle,rgba(37,99,235,0.08),transparent)",pointerEvents:"none"}}/>
        <div style={{position:"absolute",bottom:-30,left:60,width:120,height:120,borderRadius:"50%",
          background:"radial-gradient(circle,rgba(5,150,105,0.07),transparent)",pointerEvents:"none"}}/>
        <div style={{display:"flex",alignItems:"flex-start",gap:20}}>
          <div style={{flex:1}}>
            {/*<div style={{display:"inline-flex",alignItems:"center",gap:6,background:"#eff6ff",
              border:"1px solid #bfdbfe",borderRadius:20,padding:"3px 12px",marginBottom:14}}>
              {/*<div style={{width:6,height:6,borderRadius:"50%",background:"#2563eb"}}/>*/}
              {/*<span style={{fontSize:11,fontWeight:700,color:"#1d4ed8",letterSpacing:"0.06em"}}>RESEARCH FRAMEWORK · v1.0</span>*/}
            {/*</div>*/}
            <h1 style={{fontSize:30,fontWeight:800,color:"#0f172a",lineHeight:1.2,margin:"0 0 10px",letterSpacing:"-0.02em"}}>
              CAM-Nano
              <span style={{display:"block",fontSize:16,fontWeight:400,color:"#64748b",marginTop:6,letterSpacing:"0"}}>
                Cross-Attention Multimodal-Nanomaterial Characterization Framework
              </span>
            </h1>
            <p style={{fontSize:14,color:"#475569",lineHeight:1.8,margin:"0 0 20px",maxWidth:560}}>
              An end-to-end deep learning pipeline that fuses electron microscopy images with structured
              scientific text to classify nanomaterial morphologies — with retrieval-augmented generation
              to compensate for sparse experimental captions.
            </p>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {[["4,365","SEM/TEM entries"],["1,656","Unique papers"]].map(([v,l])=>(
                <div key={l} style={{background:"#fff",border:"1px solid #e2e8f0",borderRadius:8,padding:"8px 14px",textAlign:"center"}}>
                  <div style={{fontSize:17,fontWeight:800,color:"#1d4ed8"}}>{v}</div>
                  <div style={{fontSize:10,color:"#94a3b8"}}>{l}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:8,minWidth:140}}>
            {[{name:"Sphere",c:"#2563eb",pct:"58.7%"},{name:"Rod",c:"#7c3aed",pct:"34.3%"},
              {name:"Cube",c:"#059669",pct:"4.0%"},{name:"Triangle",c:"#d97706",pct:"3.0%"}].map(cl=>(
              <div key={cl.name} style={{display:"flex",alignItems:"center",gap:8,background:"#fff",
                border:"1px solid #e2e8f0",borderRadius:6,padding:"6px 10px"}}>
                <div style={{width:9,height:9,borderRadius:"50%",background:cl.c,flexShrink:0}}/>
                <span style={{fontSize:15,fontWeight:600,color:"#374151",flex:1}}>{cl.name}</span>
                <span style={{fontSize:15,color:"#94a3b8",fontWeight:700}}>{cl.pct}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pipeline strip */}
      <Card style={{marginBottom:24,padding:"16px 20px"}}>
        <Lbl>Model Architecture Framework</Lbl>
        <div style={{display:"flex",alignItems:"center",gap:0,overflowX:"auto",paddingBottom:4}}>
          {pipeline.map((p,i)=>(
            <div key={p.step} style={{display:"flex",alignItems:"center",gap:0,flexShrink:0}}>
              <div style={{textAlign:"center",padding:"0 12px"}}>
                <div style={{fontSize:9,fontWeight:800,color:"#2563eb",letterSpacing:"0.06em",marginBottom:3}}>{p.step}</div>
                <div style={{fontSize:11,fontWeight:700,color:"#0f172a"}}>{p.title}</div>
                <div style={{fontSize:9,color:"#94a3b8"}}>{p.sub}</div>
              </div>
              {i<pipeline.length-1&&<div style={{fontSize:14,color:"#cbd5e1",flexShrink:0}}>→</div>}
            </div>
          ))}
        </div>
      </Card>

      {/* Features */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:24}}>
        {features.map(f=>(
          <Card key={f.title} style={{padding:"16px 18px"}}>
            <div style={{fontSize:22,marginBottom:8}}>{f.icon}</div>
            <div style={{fontSize:13,fontWeight:700,color:"#0f172a",marginBottom:5}}>{f.title}</div>
            <div style={{fontSize:12,color:"#64748b",lineHeight:1.7}}>{f.desc}</div>
          </Card>
        ))}
      </div>

      {/* Quick start */}
      <Card accent="#2563eb" style={{padding:"18px 22px"}}>
        <Lbl>Quick Start Guide</Lbl>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
          {[
            {n:"1",t:"Upload JSON Dataset",d:"Navigate to Dashboard → Inference Framework. Upload your full_dataset_final.json file."},
            {n:"2",t:"Select Entry",d:"Browse and click any labeled entry. The auto-annotation engine generates text from JSON fields."},
            {n:"3",t:"Upload SEM/TEM Image",d:"Provide the corresponding electron microscopy image for the selected nanoparticle entry."},
            {n:"4",t:"Run Inference",d:"Click 'Execute Multimodal Inference' to classify morphology with confidence scores and RAG context."},
          ].map(s=>(
            <div key={s.n} style={{background:"#f8fafc",borderRadius:8,padding:"12px 14px",border:"1px solid #e2e8f0"}}>
              <div style={{width:22,height:22,borderRadius:"50%",background:"#2563eb",color:"#fff",
                fontSize:11,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:8}}>{s.n}</div>
              <div style={{fontSize:12,fontWeight:700,color:"#0f172a",marginBottom:4}}>{s.t}</div>
              <div style={{fontSize:11,color:"#64748b",lineHeight:1.6}}>{s.d}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
//  DOCUMENTATION PAGE
// ══════════════════════════════════════════════════════════════════════
function DocumentationPage(){
  const [open,setOpen]=useState(null);
  const sections=[
    {id:"arch",title:"Model Architecture",icon:"🏗️",content:[
      {q:"What is the EfficientNet-B4 visual encoder?",a:"EfficientNet-B4 extracts a 576-dimensional visual feature vector from SEM/TEM micrographs. It is pre-trained on ImageNet and fine-tuned on nanoparticle images. The compound scaling approach balances depth, width, and resolution for efficient feature extraction."},
      {q:"How does cross-attention fusion work?",a:"The cross-attention module takes the 576-dim visual features and 768-dim text embedding to produce a fused 1344-dim representation. Text attends to relevant image regions and vice versa, enabling the model to correlate morphology cues with measurement descriptors."},
      {q:"What is the classification head structure?",a:"FC(1344→512) → ReLU → Dropout(0.3) → FC(512→4) → Softmax. The dropout layer reduces overfitting on minority classes. Temperature scaling is applied post-training for calibrated confidence."},
    ]},
    {id:"rag",title:"RAG System",icon:"📚",content:[
      {q:"What is RAG and why is it used here?",a:"Retrieval-Augmented Generation (RAG) retrieves domain-specific literature passages at inference time using FAISS cosine similarity search. Only 2.9% of dataset captions are scientifically meaningful, so RAG supplies the synthesis and optical context the raw annotations lack."},
      {q:"How is the FAISS index built?",a:"Each passage in the knowledge base is encoded using the same RoBERTa/PubMedBERT encoder and indexed in a flat L2 FAISS index. At inference, the query annotation is encoded and top-k nearest passages (k=1,3,5) are retrieved by cosine similarity."},
      {q:"What is the β weighting parameter?",a:"F_final = β·F_model + (1-β)·F_retrieved. With β=0.7 (default), the final embedding weights model features at 70% and retrieved context at 30%. Tuning β allows balancing between local image/text evidence and global literature knowledge."},
    ]},
    {id:"data",title:"Dataset & Annotation",icon:"🗂️",content:[
      {q:"What fields does the JSON schema contain?",a:"Each entry contains: Main_class (primary morphology label), Size.Unit (nm or pixels), Size.Measurement (per-class dimension arrays), Scale (digit, unit, bar_length), Minority_classes (co-present shapes), DOI (source paper), and subfigure label."},
      {q:"How is auto-annotation generated?",a:"The buildAnnotation() function maps each JSON field to a natural-language sentence deterministically: Main_class → morphology sentence, measurement arrays → statistics sentence, aspect ratio → AR sentence (rods only), scale → calibration sentence, minority classes → co-presence sentence, DOI → publisher sentence."},
      {q:"Why are 2,931 entries pixel-only?",a:"Scale bar extraction failed or was absent for 67.1% of entries. These images lack nm calibration, so all size measurements remain in pixel units. RAG partially compensates by providing typical size ranges from literature for each morphology class."},
    ]},
    {id:"perf",title:"Performance & Evaluation",icon:"📊",content:[
      {q:"How is the test set constructed?",a:"A stratified 80/10/10 train/val/test split was applied, preserving class ratios across splits. The test set contains approximately 425 entries. All reported metrics (accuracy, precision, recall, macro-F1) are computed on this held-out test set."},
      {q:"Why does RoBERTa outperform PubMedBERT here?",a:"Despite PubMedBERT's biomedical pre-training, the auto-generated annotations follow structured measurement-description patterns that general RoBERTa handles more robustly. PubMedBERT's advantage emerges for free-text captions, which represent only 2.9% of this dataset."},
      {q:"What is the macro-F1 and why use it?",a:"Macro-F1 averages per-class F1 scores with equal weight across all four classes. Given the severe class imbalance (Sphere 58.7%, Triangle 3%), macro-F1 penalizes models that ignore minority classes more harshly than accuracy alone."},
    ]},
  ];

  return (
    <div>
      <div style={{marginBottom:20}}>
        <h2 style={{fontSize:20,fontWeight:800,color:"#0f172a",margin:"0 0 4px"}}>Documentation</h2>
        <p style={{fontSize:13,color:"#64748b",margin:0}}>Technical reference for the CAM-Nano framework — architecture, data schema, RAG system, and evaluation methodology.</p>
      </div>
      {sections.map(s=>(
        <Card key={s.id} style={{marginBottom:14,padding:"14px 18px"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
            <span style={{fontSize:18}}>{s.icon}</span>
            <span style={{fontSize:14,fontWeight:800,color:"#0f172a"}}>{s.title}</span>
          </div>
          {s.content.map((item,i)=>(
            <div key={i} style={{borderBottom:i<s.content.length-1?"1px solid #f1f5f9":"none",paddingBottom:10,marginBottom:10}}>
              <div onClick={()=>setOpen(open===s.id+i?null:s.id+i)}
                style={{display:"flex",justifyContent:"space-between",cursor:"pointer",gap:10}}>
                <span style={{fontSize:13,fontWeight:600,color:"#1e293b"}}>{item.q}</span>
                <span style={{fontSize:14,color:"#94a3b8",flexShrink:0,transition:"transform 0.2s",
                  transform:open===s.id+i?"rotate(180deg)":"rotate(0)"}}>{open===s.id+i?"▲":"▼"}</span>
              </div>
              {open===s.id+i&&(
                <div style={{marginTop:8,fontSize:12,color:"#475569",lineHeight:1.8,
                  background:"#f8fafc",borderRadius:6,padding:"8px 12px",borderLeft:"2px solid #2563eb"}}>
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </Card>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
//  CONTACT PAGE
// ══════════════════════════════════════════════════════════════════════
function ContactPage(){
  return (
    <div>
      <div style={{marginBottom:10}}>
        <h2 style={{fontSize:20,fontWeight:800,color:"#0f172a",margin:"0 0 6px"}}>Contact & Acknowledgements</h2>
        <p style={{fontSize:13,color:"#64748b",margin:0}}>Reach out to the research team or cite this work.</p>
      </div>
      <div style={{display:"block",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
        <Card accent="#2563eb" style={{padding:"20px 22px"}}>
          {/*<div style={{fontSize:22,marginBottom:10}}>👤 <b>Principal Investigator</b></div>*/}
          
          <div style={{fontSize:22,fontWeight:800,color:"#0f172a",marginBottom:4}}>Research Team</div>

          {[["Institution","Indian Institute of Information Technology Una"],["Email","sahilhussain1356@gmail.com"],["Lab","High-Performance Computing Lab"],["Location","Himachal Pradesh, India"]].map(([k,v])=>(
            <div key={k} style={{display:"flex",gap:10,marginBottom:6,alignItems:"flex-start"}}>
              <span style={{fontSize:11,color:"#94a3b8",minWidth:80,fontWeight:600}}>{k}</span>
              <span style={{fontSize:12,color:"#374151"}}>{v}</span>
            </div>
          ))}
        </Card>
        {/*<Card style={{padding:"20px 22px"}}>
          <div style={{fontSize:22,marginBottom:10}}>📄</div>
          <Lbl>Citation</Lbl>
          <div style={{background:"#0f172a",borderRadius:8,padding:"12px 14px",fontFamily:"'IBM Plex Mono',monospace",
            fontSize:11,lineHeight:1.8,color:"#86efac",marginBottom:12}}>
{`@article{camnano2024,
  title   = {CAM-Nano: Cross-Attention 
             Multimodal Nanomaterial 
             Characterization},
  author  = {Research Team},
  journal = {Journal of Nanoscience},
  year    = {2024},
  dataset = {4365 SEM/TEM entries}
}`}
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <Chip bg="#eff6ff" color="#1d4ed8">RoBERTa + RAG</Chip>
            <Chip bg="#ecfdf5" color="#059669">EfficientNet-B4</Chip>
            <Chip bg="#fef3c7" color="#92400e">FAISS Retrieval</Chip>
          </div>
        </Card>*/}
      </div>
      <Card style={{padding:"18px 22px",marginBottom:16}}>
        <Lbl>Dataset & Framework Acknowledgements</Lbl>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
          {[
            {t:"Dataset Sources",d:"Curated from 1,656 peer-reviewed papers spanning J. Colloid Interface Sci., Biosensors & Bioelectronics, Applied Surface Science, and related nanomaterial journals."},
            {t:"Pre-trained Models",d:"EfficientNet-B4 (ImageNet), RoBERTa-base and PubMedBERT (HuggingFace Transformers). FAISS library (Facebook AI Research) for dense vector retrieval."},
            {t:"Computing Resources",d:"Training performed on NVIDIA A100 GPU. Mixed-precision training (FP16) with AdamW optimizer, cosine annealing LR schedule, and early stopping on validation macro-F1."},
          ].map(x=>(
            <div key={x.t} style={{background:"#f8fafc",borderRadius:8,padding:"12px 14px",border:"1px solid #e2e8f0"}}>
              <div style={{fontSize:12,fontWeight:700,color:"#0f172a",marginBottom:5}}>{x.t}</div>
              <div style={{fontSize:11,color:"#64748b",lineHeight:1.7}}>{x.d}</div>
            </div>
          ))}
        </div>
      </Card>
      <Card style={{padding:"16px 22px"}}>
        <Lbl>Open Issues & Contributions</Lbl>
        <div style={{fontSize:13,color:"#475569",lineHeight:1.9}}>
          This framework is under active development. Known limitations include severe class imbalance (Sphere+Rod = 93%), scale bar extraction failure rate (67.1%), and sparse captions (2.9% meaningful). Contributions to the annotation pipeline, additional morphology classes, or improved scale bar parsing are welcome via the project repository.
        </div>
        <div style={{display:"flex",gap:10,marginTop:12,flexWrap:"wrap"}}>
          {[["⚠ Class Imbalance","Cube & Triangle underrepresented"],["🔍 Scale Bar Extraction","67.1% pixel-only"],["📝 Caption Quality","2.9% scientifically meaningful"]].map(([k,v])=>(
            <div key={k} style={{background:"#fffbeb",border:"1px solid #fde68a",borderRadius:6,padding:"6px 12px"}}>
              <div style={{fontSize:11,fontWeight:700,color:"#92400e"}}>{k}</div>
              <div style={{fontSize:10,color:"#b45309"}}>{v}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
//  ROOT APP — LEFT SIDEBAR LAYOUT
// ══════════════════════════════════════════════════════════════════════
export default function CAMMNanoUnified(){
  const [page,setPage]=useState("home");
  const [tab,setTab]=useState("pipeline");
  const [selectedKey,setSelectedKey]=useState(null);
  const [selectedEntry,setSelectedEntry]=useState(null);
  const [img,setImg]=useState(null);
  const [sidebarCollapsed,setSidebarCollapsed]=useState(false);

  function handleSelect(key,entry){setSelectedKey(key);setSelectedEntry(entry);}

  const NAV=[
    {id:"home",    label:"Home",          icon:"⌂",  desc:"Introduction"},
    {id:"dashboard",label:"Dashboard",    icon:"⊞",  desc:"Inference & Explorer"},
    {id:"docs",    label:"Documentation", icon:"📖", desc:"Technical Reference"},
    {id:"contact", label:"Contact",       icon:"✉",  desc:"Team & Citation"},
  ];

  const DASH_TABS=[
    {id:"pipeline",label:"Inference Framework"},
    {id:"dataset", label:"Dataset Explorer"},
  ];

  const SB_W = sidebarCollapsed ? 64 : 220;

  return (
    <div style={{display:"flex",width:"100vw",minHeight:"100vh",fontFamily:"'DM Sans',Inter,system-ui,sans-serif",
      background:"#f4f6f9",color:"#0f172a",fontSize:"15px",lineHeight:1.6}}>

      {/* ── SIDEBAR ── */}
      <div style={{
        width:SB_W, flexShrink:0, minHeight:"100vh",
        background:"#ffffff",
        borderRight:"1px solid #e2e8f0",
        display:"flex", flexDirection:"column",
        position:"fixed", top:0, left:0, bottom:0,
        zIndex:100,
        boxShadow:"2px 0 12px rgba(15,23,42,0.06)",
        transition:"width 0.22s cubic-bezier(0.4,0,0.2,1)",
        overflow:"hidden",
      }}>

        {/* Logo area */}
        <div style={{
          padding: sidebarCollapsed ? "16px 0" : "18px 18px 14px",
          borderBottom:"1px solid #f1f5f9",
          display:"flex", alignItems:"center",
          justifyContent: sidebarCollapsed ? "center" : "space-between",
          minHeight:70, flexShrink:0,
        }}>
          {!sidebarCollapsed && (
            <div style={{display:"flex",alignItems:"center",gap:10,minWidth:0}}>
              <div style={{width:34,height:34,borderRadius:8,
                background:"linear-gradient(135deg,#2563eb,#1d4ed8)",
                display:"flex",alignItems:"center",justifyContent:"center",
                flexShrink:0,boxShadow:"0 2px 8px rgba(37,99,235,0.3)"}}>
                <span style={{fontSize:16,color:"#fff"}}>⬡</span>
              </div>
              <div style={{minWidth:0}}>
                <div style={{fontSize:14,fontWeight:800,color:"#0f172a",letterSpacing:"-0.01em",lineHeight:1}}>CAM-Nano</div>
                <div style={{fontSize:9,color:"#94a3b8",letterSpacing:"0.04em",marginTop:2}}>v1.0 · Research</div>
              </div>
            </div>
          )}
          {sidebarCollapsed && (
            <div style={{width:34,height:34,borderRadius:8,
              background:"linear-gradient(135deg,#2563eb,#1d4ed8)",
              display:"flex",alignItems:"center",justifyContent:"center",
              boxShadow:"0 2px 8px rgba(37,99,235,0.3)"}}>
              <span style={{fontSize:16,color:"#fff"}}>⬡</span>
            </div>
          )}
          {!sidebarCollapsed && (
            <button onClick={()=>setSidebarCollapsed(true)} style={{
              background:"transparent",border:"1px solid #e2e8f0",borderRadius:5,
              width:24,height:24,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",
              color:"#94a3b8",fontSize:12,flexShrink:0}}>‹</button>
          )}
        </div>

        {/* Expand button when collapsed */}
        {sidebarCollapsed && (
          <button onClick={()=>setSidebarCollapsed(false)} style={{
            margin:"8px auto 0",background:"transparent",border:"1px solid #e2e8f0",
            borderRadius:5,width:32,height:24,cursor:"pointer",
            display:"flex",alignItems:"center",justifyContent:"center",
            color:"#94a3b8",fontSize:12,flexShrink:0}}>›</button>
        )}

        {/* Navigation */}
        <nav style={{flex:1,padding:sidebarCollapsed?"8px 6px":"12px 10px",overflowY:"auto"}}>
          {!sidebarCollapsed && (
            <div style={{fontSize:9,fontWeight:700,color:"#cbd5e1",letterSpacing:"0.1em",
              textTransform:"uppercase",padding:"0 6px",marginBottom:6}}>Navigation</div>
          )}
          {NAV.map(n=>{
            const active=page===n.id;
            return (
              <button key={n.id} onClick={()=>setPage(n.id)}
                title={sidebarCollapsed?n.label:undefined}
                style={{
                  width:"100%", display:"flex", alignItems:"center",
                  gap: sidebarCollapsed?0:10,
                  justifyContent: sidebarCollapsed?"center":"flex-start",
                  padding: sidebarCollapsed?"10px 0":"9px 10px",
                  borderRadius:8, border:"none", cursor:"pointer",
                  marginBottom:3, transition:"all 0.15s", fontFamily:"inherit",
                  background:active?"#eff6ff":"transparent",
                  color:active?"#1d4ed8":"#64748b",
                }}>
                <span style={{fontSize:16,flexShrink:0,
                  filter:active?"none":"grayscale(0.3)"}}>{n.icon}</span>
                {!sidebarCollapsed && (
                  <div style={{textAlign:"left",minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:active?700:500,color:active?"#1d4ed8":"#374151",
                      whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{n.label}</div>
                    <div style={{fontSize:9,color:"#94a3b8"}}>{n.desc}</div>
                  </div>
                )}
                {active && !sidebarCollapsed && (
                  <div style={{marginLeft:"auto",width:4,height:16,borderRadius:2,
                    background:"#2563eb",flexShrink:0}}/>
                )}
              </button>
            );
          })}

          {/* Sub-tabs for dashboard */}
          {page==="dashboard" && !sidebarCollapsed && (
            <div style={{marginTop:4,marginLeft:10,paddingLeft:10,
              borderLeft:"2px solid #e2e8f0"}}>
              {DASH_TABS.map(t=>(
                <button key={t.id} onClick={()=>setTab(t.id)}
                  style={{width:"100%",display:"flex",alignItems:"center",padding:"6px 8px",
                    borderRadius:6,border:"none",cursor:"pointer",fontFamily:"inherit",
                    marginBottom:2,background:tab===t.id?"#f0f7ff":"transparent",
                    color:tab===t.id?"#2563eb":"#94a3b8"}}>
                  <span style={{fontSize:11,fontWeight:tab===t.id?700:400}}>{t.label}</span>
                </button>
              ))}
            </div>
          )}
        </nav>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{flex:1,marginLeft:SB_W,display:"flex",flexDirection:"column",
        minHeight:"100vh",transition:"margin-left 0.22s cubic-bezier(0.4,0,0.2,1)"}}>

        {/* Top header bar */}
        <div style={{background:"#fff",borderBottom:"1px solid #e2e8f0",
          padding:"0 28px",height:56,display:"flex",alignItems:"center",
          justifyContent:"space-between",flexShrink:0,
          boxShadow:"0 1px 4px rgba(15,23,42,0.05)"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:11,color:"#94a3b8"}}>CAM-Nano</span>
            <span style={{fontSize:10,color:"#cbd5e1"}}>›</span>
            <span style={{fontSize:12,fontWeight:600,color:"#0f172a",textTransform:"capitalize"}}>
              {page==="dashboard"?"Dashboard — "+DASH_TABS.find(t=>t.id===tab)?.label:NAV.find(n=>n.id===page)?.label}
            </span>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {/*<Chip bg="#dcfce7" color="#166534">4,365 entries</Chip>*/}
            {/*<Chip bg="#eff6ff" color="#1d4ed8">RoBERTa+RAG 92.02%</Chip>*/}
            <div style={{width:7,height:7,borderRadius:"50%",background:"#22c55e",
              boxShadow:"0 0 0 2px #dcfce7"}}/>
          </div>
        </div>

        {/* Page content */}
        <div style={{flex:1,padding:"22px 28px 40px",overflowY:"auto"}}>

          {/* HOME */}
          {page==="home" && <HomePage/>}

          {/* DASHBOARD */}
          {page==="dashboard" && (
            <>
              {tab==="pipeline" && (
                <div style={{display:"grid",gridTemplateColumns:"minmax(420px,520px) 1fr",alignItems:"start",gap:24,width:"100%"}}>
                  <div style={{display:"flex",flexDirection:"column",gap:18}}>
                    <ImageUpload img={img} setImg={setImg}/>
                    <Card>
                      <Lbl>① Upload Textual JSON Dataset</Lbl>
                      <JsonUploadPanel onEntrySelect={handleSelect} selectedKey={selectedKey}/>
                    </Card>
                    <Card style={{minHeight:selectedEntry?0:80}}>
                      <Lbl>② Auto-Annotation Engine</Lbl>
                      {!selectedEntry?(
                        <div style={{textAlign:"center",padding:"16px 0",color:"#94a3b8",fontSize:13}}>
                          Select an entry above to see auto-annotation
                        </div>
                      ):(
                        <AnnotationPanel entry={selectedEntry} entryKey={selectedKey}/>
                      )}
                    </Card>
                  </div>
                  <div style={{width:"100%"}}>
                    <InferencePanel selectedEntry={selectedEntry} selectedKey={selectedKey} img={img}/>
                  </div>
                </div>
              )}
              {tab==="dataset" && (
		  <div style={{background:"#ffffff", padding:20, borderRadius:12}}>
		    <DatasetExplorer/>
		  </div>
		)}
            </>
          )}

          {/* DOCS */}
          {page==="docs" && <DocumentationPage/>}

          {/* CONTACT */}
          {page==="contact" && <ContactPage/>}
        </div>

        {/* Footer */}
        <div style={{textAlign:"center",fontSize:10,color:"#94a3b8",paddingBottom:14,
          borderTop:"1px solid #f1f5f9",paddingTop:10,background:"#fff"}}>
          CAM-Nano  · Research Framework v1.0
        </div>
      </div>
    </div>
  );
}
