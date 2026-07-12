'use client';
import React, { useState } from 'react';
import Link from 'next/link';

interface Cable {
  id: number;
  room: string;
  cableNum: string;
  cableType: string;
  startLoc: string;
  startDwg: string;
  startSlack: number;
  passThru1: string;
  passThru2: string;
  passThru3: string;
  endLoc: string;
  endDwg: string;
  endSlack: number;
  runLength: number;
  pulled: boolean;
  tested: boolean;
  notes: string;
}

interface Project {
  name: string;
  number: string;
  customer: string;
  description: string;
  rep: string;
  engineer: string;
  pm: string;
  techPull: string;
  techTest: string;
  rev: string | number;
}

export default function CablePullPage() {
  const cableTypes = [
    {code:"SLX",wire:"10/2",desc:"10 AWG 2C Non-Shielded Plenum",dia:'0.340"',price:0.54},
    {code:"SL",wire:"12/2",desc:"12 AWG 2C Non-Shielded Plenum CL3P",dia:'0.250"',price:0.36},
    {code:"SM",wire:"14/2",desc:"14 AWG 2C Non-Shielded Plenum CL3P",dia:'0.210"',price:0.24},
    {code:"S",wire:"16/2",desc:"16 AWG 2C Non-Shielded Plenum Speaker",dia:'0.184"',price:0.16},
    {code:"CS",wire:"18/2",desc:"18 AWG 2C Non-Shielded Plenum CMP",dia:'0.158"',price:0.10},
    {code:"PWR",wire:"18/2",desc:"18 AWG 2C Power Cable Plenum CMP",dia:'0.158"',price:0.10},
    {code:"A",wire:"22/2 SH",desc:"22 AWG 2C Shielded Plenum Audio",dia:'0.126"',price:0.08},
    {code:"C",wire:"22/6 SH",desc:"22 AWG 6C Shielded Plenum Control",dia:'0.163"',price:0.16},
    {code:"D",wire:"18/2 & 22/2 SH",desc:"Cresnet/AxLink Composite Cable",dia:'0.217"',price:0.38},
    {code:"LAN",wire:"Cat5e",desc:"24 AWG 4-Pair Non-Shielded Cat5e 350MHz",dia:'0.175"',price:0.18},
    {code:"CAT",wire:"Cat6",desc:"23 AWG 4-Pair Non-Shielded Cat6",dia:'0.220"',price:0.25},
    {code:"CST",wire:"Cat6 SH",desc:"23 AWG 4-Pair Shielded Cat6",dia:'0.277"',price:0.55},
    {code:"UHD",wire:"Cat6a SH",desc:"23 AWG 4-Pair Shielded Cat6A 660MHz",dia:'0.273"',price:0.60},
    {code:"ULT",wire:"Cat7 SH",desc:"22 AWG 4-Pair Shielded Cat7 600MHz",dia:'0.335"',price:1.44},
    {code:"SDI",wire:"HD-SDI",desc:"RG-6/U Plenum 18 AWG Serial Digital",dia:'0.234"',price:0.58},
    {code:"RF",wire:"RG-6",desc:"RG-6/U Plenum 18 AWG Coax RF",dia:'0.234"',price:0.58},
    {code:"UHF",wire:"RG-8",desc:"RG-8/U Plenum 12 AWG UHF Antenna",dia:'0.349"',price:2.12},
  ];

  const emptyRow: Omit<Cable, 'id'> = {room:"",cableNum:"",cableType:"CST",startLoc:"",startDwg:"",startSlack:10,passThru1:"",passThru2:"",passThru3:"",endLoc:"",endDwg:"",endSlack:10,runLength:0,pulled:false,tested:false,notes:""};
  const [cables, setCables] = useState<Cable[]>([{...emptyRow,id:1}]);
  const [project, setProject] = useState<Project>({name:"",number:"PR-0XXXX",customer:"",description:"",rep:"",engineer:"",pm:"",techPull:"",techTest:"",rev:0});
  const [filterRoom, setFilterRoom] = useState("");
  const [showLegend, setShowLegend] = useState(false);

  const updateCable = (idx: number, field: string, val: string | boolean) => {
    const n=[...cables];
    n[idx]={...n[idx],[field]:field==="startSlack"||field==="endSlack"||field==="runLength"?parseFloat(val as string)||0:val};
    setCables(n);
  };
  const addCable = () => setCables([...cables,{...emptyRow,id:Date.now()}]);
  const removeCable = (idx: number) => setCables(cables.filter((_,i)=>i!==idx));
  const duplicateCable = (idx: number) => { const c={...cables[idx],id:Date.now(),pulled:false,tested:false}; setCables([...cables.slice(0,idx+1),c,...cables.slice(idx+1)]); };

  const totalLength = (c: Cable) => (c.startSlack||0) + (c.endSlack||0) + (c.runLength||0);
  const allRooms = [...new Set(cables.map(c=>c.room).filter(r=>r))];
  const filteredCables = filterRoom ? cables.filter(c=>c.room===filterRoom) : cables;

  const grandTotalFt = cables.reduce((s,c)=>s+totalLength(c),0);
  const pulledCount = cables.filter(c=>c.pulled).length;
  const testedCount = cables.filter(c=>c.tested).length;
  const costEstimate = cables.reduce((s,c)=>{const ct=cableTypes.find(t=>t.code===c.cableType); return s + totalLength(c)*(ct?ct.price:0);},0);

  const cellInput: React.CSSProperties = {padding:"5px 6px",background:"rgb(var(--forge-surface))",border:"1px solid rgb(var(--border))",borderRadius:4,color:"rgb(var(--text-body))",fontSize:11,outline:"none",boxSizing:"border-box",width:"100%"};
  const numInput: React.CSSProperties = {...cellInput,textAlign:"center",width:55};
  const thSt: React.CSSProperties = {padding:"5px 6px",fontSize:8,fontWeight:700,color:"rgb(var(--text-muted))",textTransform:"uppercase",letterSpacing:"0.03em",borderBottom:"2px solid rgb(var(--border))",whiteSpace:"nowrap",position:"sticky",top:0,background:"#0a0f1a",zIndex:2,textAlign:"center"};
  const labelStyle: React.CSSProperties = {fontSize:10,fontWeight:600,color:"rgb(var(--text-subtle))",textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:3,display:"block"};

  const exportCSV = () => {
    let csv = "Room,Cable #,Cable Type,Start Location,Start Dwg,Start Slack,Pass-Thru 1,Pass-Thru 2,Pass-Thru 3,End Location,End Dwg,End Slack,Run Length,Total Length,Pulled,Tested,Notes\n";
    cables.forEach(c => {
      csv += [c.room,c.cableNum,c.cableType,c.startLoc,c.startDwg,c.startSlack,c.passThru1,c.passThru2,c.passThru3,c.endLoc,c.endDwg,c.endSlack,c.runLength,totalLength(c),c.pulled?"Yes":"No",c.tested?"Yes":"No",'"'+c.notes+'"'].join(",")+"\n";
    });
    const blob = new Blob([csv],{type:"text/csv"});
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="Cable_Pull_Sheet.csv"; a.click();
  };

  return (
    <div className="animate-fade-in p-6">
      <Link href="/designEngineering" className="mb-1 flex items-center gap-1.5 text-xs text-subtle hover:text-secondary">
        ← Design Tools
      </Link>
      <h2 className="mb-0.5 text-lg font-semibold text-heading">Cable Pull Sheet</h2>
      <p className="mb-5 text-[13px] text-subtle">Cable run tracking with pull/test status</p>

      {/* Project Header */}
      <div style={{padding:14,background:"rgb(var(--forge-surface) / 0.5)",borderRadius:8,border:"1px solid rgb(var(--border))",marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <h3 style={{fontSize:14,fontWeight:700,color:"rgb(var(--text-body))",margin:0}}>Project Info</h3>
          <div style={{display:"flex",gap:6}}>
            <button onClick={()=>setShowLegend(!showLegend)} style={{padding:"5px 12px",borderRadius:5,fontSize:10,background:showLegend?"rgba(139,92,246,0.15)":"rgb(var(--forge-surface) / 0.5)",border:"1px solid "+(showLegend?"rgba(139,92,246,0.3)":"rgb(var(--border))"),color:showLegend?"#a78bfa":"rgb(var(--text-subtle))",cursor:"pointer"}}>Cable Legend</button>
            <button onClick={exportCSV} style={{padding:"5px 12px",borderRadius:5,fontSize:10,background:"rgba(139,92,246,0.08)",border:"1px solid rgba(139,92,246,0.2)",color:"#a78bfa",cursor:"pointer"}}>Export CSV</button>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:8}}>
          <div><label style={labelStyle}>Project #</label><input value={project.number} onChange={e=>setProject({...project,number:e.target.value})} style={cellInput} /></div>
          <div><label style={labelStyle}>Project Name</label><input value={project.name} onChange={e=>setProject({...project,name:e.target.value})} placeholder="Project name" style={cellInput} /></div>
          <div><label style={labelStyle}>Customer</label><input value={project.customer} onChange={e=>setProject({...project,customer:e.target.value})} style={cellInput} /></div>
          <div><label style={labelStyle}>REV</label><input value={project.rev} onChange={e=>setProject({...project,rev:e.target.value})} style={{...cellInput,width:60}} /></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:8,marginTop:8}}>
          <div><label style={labelStyle}>Rep</label><input value={project.rep} onChange={e=>setProject({...project,rep:e.target.value})} style={cellInput} /></div>
          <div><label style={labelStyle}>Engineer</label><input value={project.engineer} onChange={e=>setProject({...project,engineer:e.target.value})} style={cellInput} /></div>
          <div><label style={labelStyle}>PM</label><input value={project.pm} onChange={e=>setProject({...project,pm:e.target.value})} style={cellInput} /></div>
          <div><label style={labelStyle}>Tech - Pull / Test</label><input value={project.techPull} onChange={e=>setProject({...project,techPull:e.target.value})} style={cellInput} /></div>
        </div>
      </div>

      {/* Cable Legend */}
      {showLegend && (
        <div style={{padding:12,background:"rgb(var(--forge-surface) / 0.4)",borderRadius:8,border:"1px solid rgb(var(--border))",marginBottom:14,maxHeight:250,overflowY:"auto"}}>
          <div style={{fontSize:11,fontWeight:600,color:"rgb(var(--text-body))",marginBottom:8}}>Cable Type Legend</div>
          <div style={{display:"grid",gridTemplateColumns:"50px 80px 1fr 60px 60px",gap:"2px 8px",fontSize:10}}>
            <div style={{fontWeight:700,color:"rgb(var(--text-subtle))"}}>Code</div><div style={{fontWeight:700,color:"rgb(var(--text-subtle))"}}>Wire</div><div style={{fontWeight:700,color:"rgb(var(--text-subtle))"}}>Description</div><div style={{fontWeight:700,color:"rgb(var(--text-subtle))"}}>Dia.</div><div style={{fontWeight:700,color:"rgb(var(--text-subtle))"}}>$/ft</div>
            {cableTypes.map(ct=>(
              <React.Fragment key={ct.code}>
                <div style={{color:"#a78bfa",fontWeight:600,fontFamily:"'JetBrains Mono',monospace"}}>{ct.code}</div>
                <div style={{color:"rgb(var(--text-body))"}}>{ct.wire}</div>
                <div style={{color:"rgb(var(--text-muted))"}}>{ct.desc}</div>
                <div style={{color:"rgb(var(--text-muted))"}}>{ct.dia}</div>
                <div style={{color:"#22c55e"}}>${ct.price.toFixed(2)}</div>
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* Summary Bar */}
      <div style={{display:"flex",gap:10,marginBottom:14}}>
        <div style={{flex:1,padding:8,borderRadius:6,background:"rgba(139,92,246,0.06)",border:"1px solid rgba(139,92,246,0.15)",textAlign:"center"}}>
          <div style={{fontSize:18,fontWeight:700,color:"#a78bfa",fontFamily:"'JetBrains Mono',monospace"}}>{cables.length}</div>
          <div style={{fontSize:8,color:"#a78bfa",fontWeight:600,textTransform:"uppercase"}}>Total Cables</div>
        </div>
        <div style={{flex:1,padding:8,borderRadius:6,background:"rgba(34,197,94,0.06)",border:"1px solid rgba(34,197,94,0.15)",textAlign:"center"}}>
          <div style={{fontSize:18,fontWeight:700,color:"#22c55e",fontFamily:"'JetBrains Mono',monospace"}}>{grandTotalFt.toLocaleString()}&apos;</div>
          <div style={{fontSize:8,color:"#22c55e",fontWeight:600,textTransform:"uppercase"}}>Total Footage</div>
        </div>
        <div style={{flex:1,padding:8,borderRadius:6,background:"rgba(245,158,11,0.06)",border:"1px solid rgba(245,158,11,0.15)",textAlign:"center"}}>
          <div style={{fontSize:18,fontWeight:700,color:"#f59e0b",fontFamily:"'JetBrains Mono',monospace"}}>{pulledCount}/{cables.length}</div>
          <div style={{fontSize:8,color:"#f59e0b",fontWeight:600,textTransform:"uppercase"}}>Pulled</div>
        </div>
        <div style={{flex:1,padding:8,borderRadius:6,background:"rgba(168,85,247,0.06)",border:"1px solid rgba(168,85,247,0.15)",textAlign:"center"}}>
          <div style={{fontSize:18,fontWeight:700,color:"#a855f7",fontFamily:"'JetBrains Mono',monospace"}}>{testedCount}/{cables.length}</div>
          <div style={{fontSize:8,color:"#a855f7",fontWeight:600,textTransform:"uppercase"}}>Tested</div>
        </div>
        <div style={{flex:1,padding:8,borderRadius:6,background:"rgba(6,182,212,0.06)",border:"1px solid rgba(6,182,212,0.15)",textAlign:"center"}}>
          <div style={{fontSize:18,fontWeight:700,color:"#06b6d4",fontFamily:"'JetBrains Mono',monospace"}}>${costEstimate.toFixed(0)}</div>
          <div style={{fontSize:8,color:"#06b6d4",fontWeight:600,textTransform:"uppercase"}}>Est. Cable Cost</div>
        </div>
      </div>

      {/* Room Filter + Add */}
      <div style={{display:"flex",gap:8,marginBottom:10,alignItems:"center"}}>
        <select value={filterRoom} onChange={e=>setFilterRoom(e.target.value)} style={{padding:"5px 10px",background:"rgb(var(--forge-surface))",border:"1px solid rgb(var(--border))",borderRadius:5,color:"rgb(var(--text-body))",fontSize:11,cursor:"pointer"}}>
          <option value="">All Rooms ({cables.length})</option>
          {allRooms.map(r=><option key={r} value={r}>{r} ({cables.filter(c=>c.room===r).length})</option>)}
        </select>
        <button onClick={addCable} style={{padding:"5px 14px",background:"rgba(139,92,246,0.1)",border:"1px dashed #8b5cf6",borderRadius:6,color:"#a78bfa",fontSize:11,cursor:"pointer"}}>+ Add Cable</button>
        <button onClick={()=>{for(let i=0;i<5;i++)setCables(prev=>[...prev,{...emptyRow,id:Date.now()+i}]);}} style={{padding:"5px 14px",background:"rgba(34,197,94,0.08)",border:"1px dashed rgba(34,197,94,0.3)",borderRadius:6,color:"#22c55e",fontSize:11,cursor:"pointer"}}>+ Add 5 Rows</button>
      </div>

      {/* Cable Table */}
      <div style={{overflowX:"auto",borderRadius:8,border:"1px solid rgb(var(--border))"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:10,minWidth:1100}}>
          <thead>
            <tr>
              <th style={{...thSt,background:"rgba(139,92,246,0.06)"}}>Room</th>
              <th style={{...thSt,background:"rgba(139,92,246,0.06)"}}>Cable #</th>
              <th style={{...thSt,background:"rgba(139,92,246,0.06)"}}>Type</th>
              <th colSpan={3} style={{...thSt,background:"rgba(34,197,94,0.06)",color:"#22c55e",fontSize:7}}>Starting Point</th>
              <th colSpan={3} style={{...thSt,background:"rgba(245,158,11,0.06)",color:"#f59e0b",fontSize:7}}>Pass-Thru</th>
              <th colSpan={3} style={{...thSt,background:"rgba(168,85,247,0.06)",color:"#a855f7",fontSize:7}}>Ending Point</th>
              <th style={thSt}>Run</th>
              <th style={thSt}>Total</th>
              <th style={thSt}>Pull</th>
              <th style={thSt}>Test</th>
              <th style={thSt}>Notes</th>
              <th style={{...thSt,width:50}}></th>
            </tr>
            <tr>
              <th style={{...thSt,fontSize:7,borderBottom:"1px solid rgb(var(--border))"}}></th>
              <th style={{...thSt,fontSize:7,borderBottom:"1px solid rgb(var(--border))"}}></th>
              <th style={{...thSt,fontSize:7,borderBottom:"1px solid rgb(var(--border))"}}></th>
              <th style={{...thSt,fontSize:7,borderBottom:"1px solid rgb(var(--border))",background:"rgba(34,197,94,0.04)"}}>Location</th>
              <th style={{...thSt,fontSize:7,borderBottom:"1px solid rgb(var(--border))",background:"rgba(34,197,94,0.04)"}}>Dwg</th>
              <th style={{...thSt,fontSize:7,borderBottom:"1px solid rgb(var(--border))",background:"rgba(34,197,94,0.04)"}}>Slack</th>
              <th style={{...thSt,fontSize:7,borderBottom:"1px solid rgb(var(--border))",background:"rgba(245,158,11,0.04)"}}>1st</th>
              <th style={{...thSt,fontSize:7,borderBottom:"1px solid rgb(var(--border))",background:"rgba(245,158,11,0.04)"}}>2nd</th>
              <th style={{...thSt,fontSize:7,borderBottom:"1px solid rgb(var(--border))",background:"rgba(245,158,11,0.04)"}}>3rd</th>
              <th style={{...thSt,fontSize:7,borderBottom:"1px solid rgb(var(--border))",background:"rgba(168,85,247,0.04)"}}>Location</th>
              <th style={{...thSt,fontSize:7,borderBottom:"1px solid rgb(var(--border))",background:"rgba(168,85,247,0.04)"}}>Dwg</th>
              <th style={{...thSt,fontSize:7,borderBottom:"1px solid rgb(var(--border))",background:"rgba(168,85,247,0.04)"}}>Slack</th>
              <th style={{...thSt,fontSize:7,borderBottom:"1px solid rgb(var(--border))"}}>ft</th>
              <th style={{...thSt,fontSize:7,borderBottom:"1px solid rgb(var(--border))"}}>ft</th>
              <th style={{...thSt,fontSize:7,borderBottom:"1px solid rgb(var(--border))"}}></th>
              <th style={{...thSt,fontSize:7,borderBottom:"1px solid rgb(var(--border))"}}></th>
              <th style={{...thSt,fontSize:7,borderBottom:"1px solid rgb(var(--border))"}}></th>
              <th style={{...thSt,fontSize:7,borderBottom:"1px solid rgb(var(--border))"}}></th>
            </tr>
          </thead>
          <tbody>
            {filteredCables.map((c,idx)=>{
              const realIdx = cables.indexOf(c);
              const tot = totalLength(c);
              return (
                <tr key={c.id} style={{background:idx%2===0?"transparent":"rgb(var(--forge-surface) / 0.2)"}}>
                  <td style={{padding:2}}><input value={c.room} onChange={e=>updateCable(realIdx,"room",e.target.value)} placeholder="Room" style={{...cellInput,width:80}} list="roomList" /></td>
                  <td style={{padding:2}}><input value={c.cableNum} onChange={e=>updateCable(realIdx,"cableNum",e.target.value)} placeholder="D001" style={{...cellInput,width:60,fontFamily:"'JetBrains Mono',monospace",fontWeight:600}} /></td>
                  <td style={{padding:2}}><select value={c.cableType} onChange={e=>updateCable(realIdx,"cableType",e.target.value)} style={{...cellInput,width:65,cursor:"pointer",fontSize:10,fontWeight:600,color:"#a78bfa"}}>{cableTypes.map(ct=><option key={ct.code} value={ct.code}>{ct.code}</option>)}</select></td>
                  <td style={{padding:2,background:"rgba(34,197,94,0.02)"}}><input value={c.startLoc} onChange={e=>updateCable(realIdx,"startLoc",e.target.value)} placeholder="Back Box" style={{...cellInput,width:80}} /></td>
                  <td style={{padding:2,background:"rgba(34,197,94,0.02)"}}><input value={c.startDwg} onChange={e=>updateCable(realIdx,"startDwg",e.target.value)} placeholder="A-101" style={{...cellInput,width:55}} /></td>
                  <td style={{padding:2,background:"rgba(34,197,94,0.02)"}}><input type="number" value={c.startSlack} onChange={e=>updateCable(realIdx,"startSlack",e.target.value)} style={numInput} /></td>
                  <td style={{padding:2,background:"rgba(245,158,11,0.02)"}}><input value={c.passThru1} onChange={e=>updateCable(realIdx,"passThru1",e.target.value)} placeholder="" style={{...cellInput,width:55}} /></td>
                  <td style={{padding:2,background:"rgba(245,158,11,0.02)"}}><input value={c.passThru2} onChange={e=>updateCable(realIdx,"passThru2",e.target.value)} style={{...cellInput,width:55}} /></td>
                  <td style={{padding:2,background:"rgba(245,158,11,0.02)"}}><input value={c.passThru3} onChange={e=>updateCable(realIdx,"passThru3",e.target.value)} style={{...cellInput,width:55}} /></td>
                  <td style={{padding:2,background:"rgba(168,85,247,0.02)"}}><input value={c.endLoc} onChange={e=>updateCable(realIdx,"endLoc",e.target.value)} placeholder="Rack" style={{...cellInput,width:80}} /></td>
                  <td style={{padding:2,background:"rgba(168,85,247,0.02)"}}><input value={c.endDwg} onChange={e=>updateCable(realIdx,"endDwg",e.target.value)} placeholder="A-102" style={{...cellInput,width:55}} /></td>
                  <td style={{padding:2,background:"rgba(168,85,247,0.02)"}}><input type="number" value={c.endSlack} onChange={e=>updateCable(realIdx,"endSlack",e.target.value)} style={numInput} /></td>
                  <td style={{padding:2}}><input type="number" value={c.runLength} onChange={e=>updateCable(realIdx,"runLength",e.target.value)} style={numInput} /></td>
                  <td style={{padding:"2px 6px",textAlign:"center",fontWeight:700,color:tot>0?"rgb(var(--text-body))":"#334155",fontFamily:"'JetBrains Mono',monospace",fontSize:11}}>{tot>0?tot:""}</td>
                  <td style={{padding:2,textAlign:"center"}}><input type="checkbox" checked={c.pulled} onChange={e=>updateCable(realIdx,"pulled",e.target.checked)} style={{cursor:"pointer",accentColor:"#f59e0b"}} /></td>
                  <td style={{padding:2,textAlign:"center"}}><input type="checkbox" checked={c.tested} onChange={e=>updateCable(realIdx,"tested",e.target.checked)} style={{cursor:"pointer",accentColor:"#22c55e"}} /></td>
                  <td style={{padding:2}}><input value={c.notes} onChange={e=>updateCable(realIdx,"notes",e.target.value)} placeholder="" style={{...cellInput,width:100}} /></td>
                  <td style={{padding:2,display:"flex",gap:2}}>
                    <button onClick={()=>duplicateCable(realIdx)} title="Duplicate" style={{background:"none",border:"none",color:"#8b5cf6",cursor:"pointer",fontSize:12,padding:2}}>⧉</button>
                    <button onClick={()=>removeCable(realIdx)} title="Delete" style={{background:"none",border:"none",color:"#ef4444",cursor:"pointer",fontSize:12,padding:2,opacity:0.5}}>×</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <datalist id="roomList">{allRooms.map(r=><option key={r} value={r}/>)}</datalist>
      </div>

      <div style={{marginTop:8,display:"flex",justifyContent:"space-between",fontSize:10,color:"#475569"}}>
        <span>Total Length = Start Slack + End Slack + Run Length</span>
        <span>Est. Cable Cost = Sum of (Total Length × $/ft per cable type)</span>
      </div>
    </div>
  );
}
