'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { loadToolData, saveToolData } from "@/lib/tool-data";

export default function RFIManagementPage() {
  const emptyRFI = {projectName:"",location:"",projectNum:"",trade:"Audio Visual",focusArea:"",attention:"",date:new Date().toISOString().split("T")[0],submittedBy:"",email:"",phone:"",company:""};
  const emptyItem = {question:"",response:"",status:"Open",priority:"Normal",dateAsked:"",dateAnswered:""};
  const [rfiList, setRfiList] = useState<{id:number;rfiNum:string;items:{question:string;response:string;status:string;priority:string;dateAsked:string;dateAnswered:string;id:number}[];[key:string]:unknown}[]>([]);
  const [activeRFI, setActiveRFI] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const saveTimer = useRef<NodeJS.Timeout | null>(null);

  // Load
  useEffect(() => {
    loadToolData("rfi").then((data) => {
      if (data?.rfiList) {
        setRfiList(data.rfiList as typeof rfiList);
        if (data.activeRFI !== undefined) setActiveRFI(data.activeRFI as number);
      }
      setLoaded(true);
    });
  }, []);

  // Auto-save on changes
  const doSave = useCallback((list: typeof rfiList) => {
    saveToolData("rfi", { rfiList: list });
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => doSave(rfiList), 1000);
  }, [rfiList, loaded, doSave]);

  const rfi = rfiList[activeRFI] || rfiList[0];
  const updateRFI = (field: string, val: string) => { const n=[...rfiList]; n[activeRFI]={...n[activeRFI],[field]:val}; setRfiList(n); };
  const updateItem = (idx: number, field: string, val: string) => {
    const n=[...rfiList]; const items=[...n[activeRFI].items]; items[idx]={...items[idx],[field]:val};
    if(field==="response" && val && !items[idx].dateAnswered) items[idx].dateAnswered=new Date().toISOString().split("T")[0];
    if(field==="response" && val) items[idx].status="Answered";
    n[activeRFI]={...n[activeRFI],items}; setRfiList(n);
  };
  const addItem = () => { const n=[...rfiList]; const items=[...n[activeRFI].items]; items.push({...emptyItem,id:items.length+1,dateAsked:new Date().toISOString().split("T")[0]}); n[activeRFI]={...n[activeRFI],items}; setRfiList(n); };
  const removeItem = (idx: number) => { const n=[...rfiList]; const items=n[activeRFI].items.filter((_,i)=>i!==idx); n[activeRFI]={...n[activeRFI],items}; setRfiList(n); };
  const addRFI = () => {
    const num = rfiList.length+1;
    setRfiList([...rfiList,{...emptyRFI, id:num, rfiNum:"RFI-"+num, items:[{...emptyItem,id:1,dateAsked:new Date().toISOString().split("T")[0]}]}]);
    setActiveRFI(rfiList.length);
  };
  const deleteRFI = (idx: number) => { const n=rfiList.filter((_,i)=>i!==idx); setRfiList(n); if(activeRFI>=n.length) setActiveRFI(Math.max(0, n.length-1)); };

  const statusColors: Record<string,string> = {Open:"#f59e0b",Answered:"#22c55e",Closed:"rgb(var(--text-subtle))","Needs Followup":"#ef4444"};
  const priorityColors: Record<string,string> = {Low:"rgb(var(--text-subtle))",Normal:"#8b5cf6",High:"#f59e0b",Urgent:"#ef4444"};

  const openCount = rfi?.items?.filter(i=>i.status==="Open").length ?? 0;
  const answeredCount = rfi?.items?.filter(i=>i.status==="Answered").length ?? 0;

  const inputStyle: React.CSSProperties = {width:"100%",padding:"7px 10px",background:"rgb(var(--forge-surface))",border:"1px solid rgb(var(--border))",borderRadius:5,color:"rgb(var(--text-body))",fontSize:12,outline:"none",boxSizing:"border-box"};
  const labelStyle: React.CSSProperties = {fontSize:10,fontWeight:600,color:"rgb(var(--text-subtle))",textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:3,display:"block"};
  const selectStyle: React.CSSProperties = {...inputStyle,cursor:"pointer"};

  const generateAllHTML = useCallback(() => {
    if (rfiList.length === 0) return "";
    const statusColor = (s: string) => s==="Open"?"#f59e0b":s==="Answered"?"#22c55e":s==="Closed"?"rgb(var(--text-subtle))":"#ef4444";
    let html = `<html><head><meta charset="utf-8"><title>RFI Report</title>
      <style>body{font-family:Arial,sans-serif;margin:40px;color:rgb(var(--border))}
      h1{font-size:22px;margin-bottom:4px}h2{font-size:16px;color:#475569;margin:24px 0 12px}
      h3{font-size:18px;margin:32px 0 8px;padding-top:16px;border-top:2px solid #e2e8f0}
      table{width:100%;border-collapse:collapse;margin:8px 0}
      th,td{border:1px solid #cbd5e1;padding:8px 12px;text-align:left;font-size:13px}
      th{background:#f1f5f9;font-weight:600;font-size:11px;text-transform:uppercase}
      .badge{display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;color:white}
      .meta{display:flex;gap:32px;margin:8px 0;font-size:13px;color:#475569}
      .meta span{font-weight:600;color:rgb(var(--border))}
      </style></head><body>`;
    html += `<h1>RFI Report — All Requests for Information</h1>`;
    html += `<p style="color:#475569;font-size:13px">${rfiList.length} RFI(s) total</p>`;

    rfiList.forEach((r) => {
      const open = r.items.filter(i => i.status === "Open").length;
      const answered = r.items.filter(i => i.status === "Answered").length;
      html += `<h3>${r.rfiNum}</h3>`;
      html += `<div class="meta"><div>Date: <span>${r.date || "—"}</span></div><div>Open: <span style="color:#f59e0b">${open}</span></div><div>Answered: <span style="color:#22c55e">${answered}</span></div><div>Total Items: <span>${r.items.length}</span></div></div>`;
      html += `<table><tr><th>#</th><th>Status</th><th>Priority</th><th>Question</th><th>Response</th><th>Date Asked</th><th>Date Answered</th></tr>`;
      r.items.forEach((item, i) => {
        html += `<tr><td>${i+1}</td><td><span class="badge" style="background:${statusColor(item.status)}">${item.status}</span></td><td>${item.priority}</td><td>${item.question||"—"}</td><td>${item.response||"—"}</td><td>${item.dateAsked||"—"}</td><td>${item.dateAnswered||"—"}</td></tr>`;
      });
      html += `</table>`;
    });
    html += `</body></html>`;
    return html;
  }, [rfiList]);

  const exportPDF = useCallback(() => {
    const html = generateAllHTML();
    if (!html) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    setTimeout(() => { win.print(); }, 500);
  }, [generateAllHTML]);

  const exportWord = useCallback(() => {
    const html = generateAllHTML();
    if (!html) return;
    const blob = new Blob(['\ufeff', html], { type: "application/msword" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "RFI-Report.doc";
    a.click();
  }, [generateAllHTML]);

  // Listen for export events from layout
  useEffect(() => {
    const handleExportPDF = () => exportPDF();
    const handleExportWord = () => exportWord();
    window.addEventListener("avforge-export-pdf", handleExportPDF);
    window.addEventListener("avforge-export-word", handleExportWord);
    return () => {
      window.removeEventListener("avforge-export-pdf", handleExportPDF);
      window.removeEventListener("avforge-export-word", handleExportWord);
    };
  }, [exportPDF, exportWord]);

  return (
    <div className="animate-fade-in p-6">
      <Link href="/designEngineering" className="mb-1 flex items-center gap-1.5 text-xs text-subtle hover:text-secondary">
        ← Design Tools
      </Link>
      <h2 className="mb-0.5 text-lg font-semibold text-heading">RFI Management</h2>
      <p className="mb-5 text-[13px] text-subtle">Request for Information tracker</p>

      {/* RFI Tabs */}
      <div style={{display:"flex",gap:6,marginBottom:16,flexWrap:"wrap",alignItems:"center"}}>
        {rfiList.map((r,i)=>(
          <div key={r.id} style={{position:"relative",display:"inline-flex"}} className="group">
            <button onClick={()=>setActiveRFI(i)} style={{padding:"6px 24px 6px 14px",borderRadius:6,fontSize:11,fontWeight:activeRFI===i?700:400,background:activeRFI===i?"rgba(139,92,246,0.15)":"rgb(var(--forge-surface) / 0.4)",border:"1px solid "+(activeRFI===i?"rgba(139,92,246,0.4)":"rgb(var(--border))"),color:activeRFI===i?"#a78bfa":"rgb(var(--text-muted))",cursor:"pointer"}}>
              {r.rfiNum}
            </button>
            {r.items.some(it=>it.status==="Open") && <span style={{position:"absolute",top:-3,left:-3,width:8,height:8,borderRadius:4,background:"#f59e0b",zIndex:1}}></span>}
            <button
              onClick={(e)=>{e.stopPropagation();setDeleteConfirm(i);}}
              className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{background:"none",border:"none",cursor:"pointer",padding:2,lineHeight:1,color:"rgb(var(--text-subtle))"}}
              onMouseEnter={e=>e.currentTarget.style.color="#ef4444"}
              onMouseLeave={e=>e.currentTarget.style.color="rgb(var(--text-subtle))"}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>
          </div>
        ))}
        <button onClick={addRFI} style={{padding:"6px 14px",borderRadius:6,fontSize:11,background:"rgba(34,197,94,0.08)",border:"1px dashed rgba(34,197,94,0.3)",color:"#22c55e",cursor:"pointer"}}>+ New RFI</button>
        {rfiList.length>0 && (
          <div style={{marginLeft:"auto",position:"relative"}}>
            <button onClick={()=>setShowExportMenu(!showExportMenu)} style={{padding:"6px 14px",borderRadius:6,fontSize:11,background:"rgba(139,92,246,0.08)",border:"1px solid rgba(139,92,246,0.2)",color:"#a78bfa",cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
              Export Report
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            </button>
            {showExportMenu && (
              <>
                <div style={{position:"fixed",inset:0,zIndex:40}} onClick={()=>setShowExportMenu(false)} />
                <div style={{position:"absolute",right:0,top:32,zIndex:50,width:170,background:"rgb(var(--forge-surface))",border:"1px solid rgb(var(--border))",borderRadius:8,padding:4,boxShadow:"0 10px 40px rgba(0,0,0,0.5)"}}>
                  <button onClick={()=>{exportPDF();setShowExportMenu(false);}} style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"8px 12px",background:"none",border:"none",color:"rgb(var(--text-body))",fontSize:12,cursor:"pointer",borderRadius:6,textAlign:"left"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(139,92,246,0.1)"} onMouseLeave={e=>e.currentTarget.style.background="none"}>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="2" y="1" width="12" height="14" rx="2" stroke="#ef4444" strokeWidth="1.2"/><text x="8" y="11" textAnchor="middle" fontSize="6" fill="#ef4444" fontWeight="700">PDF</text></svg>
                    Export as PDF
                  </button>
                  <button onClick={()=>{exportWord();setShowExportMenu(false);}} style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"8px 12px",background:"none",border:"none",color:"rgb(var(--text-body))",fontSize:12,cursor:"pointer",borderRadius:6,textAlign:"left"}} onMouseEnter={e=>e.currentTarget.style.background="rgba(139,92,246,0.1)"} onMouseLeave={e=>e.currentTarget.style.background="none"}>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="2" y="1" width="12" height="14" rx="2" stroke="#8b5cf6" strokeWidth="1.2"/><text x="8" y="11" textAnchor="middle" fontSize="5" fill="#8b5cf6" fontWeight="700">DOC</text></svg>
                    Export as Word
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {!rfi ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="text-faint">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="text-sm text-subtle">No RFIs yet</p>
          <p className="text-xs text-faint">Click &quot;+ New RFI&quot; to create one</p>
        </div>
      ) : (<>

      {/* Status Summary */}
      <div style={{display:"flex",gap:10,marginBottom:16}}>
        <div style={{flex:1,padding:10,borderRadius:8,background:"rgba(245,158,11,0.06)",border:"1px solid rgba(245,158,11,0.15)",textAlign:"center"}}>
          <div style={{fontSize:22,fontWeight:700,color:"#f59e0b",fontFamily:"'JetBrains Mono', monospace"}}>{openCount}</div>
          <div style={{fontSize:9,color:"#f59e0b",fontWeight:600,textTransform:"uppercase"}}>Open</div>
        </div>
        <div style={{flex:1,padding:10,borderRadius:8,background:"rgba(34,197,94,0.06)",border:"1px solid rgba(34,197,94,0.15)",textAlign:"center"}}>
          <div style={{fontSize:22,fontWeight:700,color:"#22c55e",fontFamily:"'JetBrains Mono', monospace"}}>{answeredCount}</div>
          <div style={{fontSize:9,color:"#22c55e",fontWeight:600,textTransform:"uppercase"}}>Answered</div>
        </div>
        <div style={{flex:1,padding:10,borderRadius:8,background:"rgba(139,92,246,0.06)",border:"1px solid rgba(139,92,246,0.15)",textAlign:"center"}}>
          <div style={{fontSize:22,fontWeight:700,color:"#a78bfa",fontFamily:"'JetBrains Mono', monospace"}}>{rfi.items.length}</div>
          <div style={{fontSize:9,color:"#a78bfa",fontWeight:600,textTransform:"uppercase"}}>Total Items</div>
        </div>
      </div>

      {/* RFI Header */}
      <div style={{padding:16,background:"rgb(var(--forge-surface) / 0.5)",borderRadius:8,border:"1px solid rgb(var(--border))",marginBottom:16}}>
        <div>
          <div><label style={labelStyle}>Date</label><input type="date" value={rfi.date as string} onChange={e=>updateRFI("date",e.target.value)} onClick={e=>(e.target as HTMLInputElement).showPicker?.()} style={{...inputStyle,maxWidth:300,cursor:"pointer"}} /></div>
        </div>
      </div>

      {/* RFI Items */}
      <div style={{marginBottom:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <h3 style={{fontSize:13,fontWeight:600,color:"rgb(var(--text-body))",margin:0}}>RFI Items</h3>
        <button onClick={addItem} style={{padding:"6px 14px",background:"rgba(139,92,246,0.1)",border:"1px dashed #8b5cf6",borderRadius:6,color:"#a78bfa",fontSize:11,cursor:"pointer"}}>+ Add Item</button>
      </div>

      {rfi.items.map((item,idx)=>{
        const stColor = statusColors[item.status]||"rgb(var(--text-subtle))";
        const prColor = priorityColors[item.priority]||"#8b5cf6";
        return (
          <div key={idx} style={{padding:14,background:"rgb(var(--forge-surface) / 0.4)",borderRadius:8,border:"1px solid rgb(var(--border))",marginBottom:10,borderLeft:"3px solid "+stColor}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:14,fontWeight:700,color:"rgb(var(--text-body))",fontFamily:"'JetBrains Mono', monospace"}}>#{String(idx+1).padStart(2,"0")}</span>
                <select value={item.status} onChange={e=>updateItem(idx,"status",e.target.value)} style={{padding:"3px 8px",background:stColor+"15",border:"1px solid "+stColor+"44",borderRadius:12,color:stColor,fontSize:10,fontWeight:600,cursor:"pointer",outline:"none"}}>
                  <option value="Open">Open</option><option value="Answered">Answered</option><option value="Closed">Closed</option><option value="Needs Followup">Needs Followup</option>
                </select>
                <select value={item.priority} onChange={e=>updateItem(idx,"priority",e.target.value)} style={{padding:"3px 8px",background:prColor+"15",border:"1px solid "+prColor+"44",borderRadius:12,color:prColor,fontSize:10,fontWeight:600,cursor:"pointer",outline:"none"}}>
                  <option value="Low">Low</option><option value="Normal">Normal</option><option value="High">High</option><option value="Urgent">Urgent</option>
                </select>
              </div>
              <button onClick={()=>removeItem(idx)} style={{background:"none",border:"none",color:"#ef4444",cursor:"pointer",fontSize:14,opacity:0.5}}>×</button>
            </div>
            <div style={{marginBottom:8}}>
              <label style={{...labelStyle,color:"#f59e0b"}}>Question</label>
              <textarea value={item.question} onChange={e=>updateItem(idx,"question",e.target.value)} placeholder="Enter your question..." rows={2} style={{...inputStyle,resize:"vertical",minHeight:40}} />
            </div>
            <div>
              <label style={{...labelStyle,color:"#22c55e"}}>Response</label>
              <textarea value={item.response} onChange={e=>updateItem(idx,"response",e.target.value)} placeholder="Enter response when received..." rows={2} style={{...inputStyle,resize:"vertical",minHeight:40,borderColor:item.response?"rgba(34,197,94,0.3)":"rgb(var(--border))"}} />
            </div>
            <div style={{display:"flex",gap:12,marginTop:6,fontSize:9,color:"#475569"}}>
              {item.dateAsked && <span>Asked: {item.dateAsked}</span>}
              {item.dateAnswered && <span>Answered: {item.dateAnswered}</span>}
            </div>
          </div>
        );
      })}
      </>)}

      {/* Delete Confirmation Modal */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setDeleteConfirm(null)} />
          <div className="relative w-full max-w-[360px] rounded-xl border border-border bg-forge-bg p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/15">
                <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
                  <path d="M3 4h10M6 4V3h4v1M5 4v9h6V4" stroke="#ef4444" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <h3 className="text-[15px] font-semibold text-heading">Delete {rfiList[deleteConfirm]?.rfiNum}?</h3>
                <p className="text-[13px] text-subtle">This action cannot be undone.</p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="rounded-lg px-4 py-2 text-[13px] font-medium text-muted transition-colors hover:text-body">
                Cancel
              </button>
              <button onClick={() => { deleteRFI(deleteConfirm); setDeleteConfirm(null); }} className="rounded-lg bg-red-500/15 px-4 py-2 text-[13px] font-semibold text-red-400 transition-colors hover:bg-red-500/25">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
