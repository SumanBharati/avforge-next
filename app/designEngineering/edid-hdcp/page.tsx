'use client';
import React, { useState } from 'react';
import Link from 'next/link';

export default function EDIDHDCPPage() {
  const emptyRow = {srcMake:"",srcRes:"4K 60 4:4:4",inter1:"",inter2:"",platform:"",hdcp:"On",dispMake:"",aspectRatio:"16:9",desiredRes:"1080p",frameRate:"60",colorSpace:"YCbCr",chroma:"4:4:4"};
  const [rows, setRows] = useState([{...emptyRow, srcMake:"Bright Sign Player 1",inter1:"Extron MQP 641 Switcher",inter2:"-",platform:"",hdcp:"On",dispMake:"Samsung QM65r",desiredRes:"1080p",colorSpace:"YCbCr",chroma:"4:4:4"}]);

  const updateRow = (i: number, field: string, val: string) => { const n=[...rows]; n[i]={...n[i],[field]:val}; setRows(n); };
  const addRow = () => setRows([...rows, {...emptyRow}]);
  const removeRow = (i: number) => setRows(rows.filter((_,j)=>j!==i));

  const resOptions = ["4K 60 4:4:4","4K 60 4:2:2","4K 60 4:2:0","4K 30 4:4:4","1080p","1080i","720p","WUXGA","SXGA+","XGA","Custom"];
  const arOptions = ["16:9","16:10","21:9","4:3","32:9","Custom"];
  const outResOptions = ["4K (3840x2160)","1080p (1920x1080)","1080i","720p (1280x720)","WUXGA (1920x1200)","SXGA+ (1400x1050)","XGA (1024x768)","Custom"];
  const frOptions = ["24","30","50","60","120","Custom"];
  const csOptions = ["RGB","YCbCr","BT.2020","Custom"];
  const chromaOptions = ["4:4:4","4:2:2","4:2:0"];
  const hdcpOptions = ["On","Off"];
  const platformOptions = ["","Apple","PC","Android","ChromeOS"];

  const cellStyle = {padding:"4px 3px",borderBottom:"1px solid rgb(var(--border))",verticalAlign:"top" as const};
  const inputStyle = {width:"100%",padding:"5px 6px",background:"rgb(var(--forge-surface))",border:"1px solid rgb(var(--border))",borderRadius:4,color:"rgb(var(--text-body))",fontSize:11,outline:"none",boxSizing:"border-box" as const};
  const selectStyle = {...inputStyle,cursor:"pointer"};
  const thStyle = {padding:"6px 4px",fontSize:9,fontWeight:700,color:"rgb(var(--text-muted))",textAlign:"left" as const,textTransform:"uppercase" as const,letterSpacing:"0.04em",borderBottom:"2px solid rgb(var(--border))",whiteSpace:"nowrap" as const,position:"sticky" as const,top:0,background:"#0a0f1a",zIndex:2};

  const getHDCPStatus = (row: typeof emptyRow) => {
    if(row.hdcp==="Off") return {color:"#f59e0b",text:"Non-compliant",tip:"HDCP disabled — protected content may show black screen"};
    const is4K = row.srcRes.startsWith("4K");
    if(is4K) return {color:"#4ade80",text:"HDCP 2.2+ Required",tip:"4K UHD content requires HDCP 2.2 or higher on ALL devices in chain"};
    return {color:"#4ade80",text:"HDCP 1.4+",tip:"HD content requires minimum HDCP 1.4"};
  };

  const getResStatus = (row: typeof emptyRow) => {
    const src4K = row.srcRes.startsWith("4K");
    const dst4K = row.desiredRes.startsWith("4K");
    if(src4K && !dst4K) return {color:"#f59e0b",text:"Downscale",tip:"Source is 4K but destination is lower — scaler may be needed"};
    if(!src4K && dst4K) return {color:"#ef4444",text:"Upscale",tip:"Cannot upscale source to 4K natively"};
    return {color:"#4ade80",text:"Match",tip:"Source and destination resolution compatible"};
  };

  return (
    <div className="animate-fade-in p-6">
      <Link href="/designEngineering" className="mb-1 flex items-center gap-1.5 text-xs text-subtle hover:text-secondary">
        ← Design Tools
      </Link>
      <h2 className="mb-0.5 text-lg font-semibold text-heading">EDID &amp; HDCP Strategy</h2>
      <p className="mb-5 text-[13px] text-subtle">Signal chain planner with HDCP/EDID validation</p>

      {/* EDID Strategy Info */}
      <div style={{marginBottom:20,padding:16,background:"rgb(var(--forge-surface) / 0.5)",borderRadius:8,border:"1px solid rgb(var(--border))"}}>
        <h3 style={{fontSize:14,fontWeight:600,color:"rgb(var(--text-body))",marginBottom:8}}>EDID Strategy</h3>
        <p style={{fontSize:12,color:"rgb(var(--text-muted))",lineHeight:1.7,marginBottom:10}}>An EDID strategy involves managing how display identification data is handled to ensure optimal performance and prevent common AV issues:</p>
        <div style={{fontSize:12,color:"rgb(var(--text-muted))",lineHeight:1.8}}>
          <div><strong style={{color:"rgb(var(--text-body))"}}>Resolution mismatches</strong> — when a source outputs a resolution a display can&apos;t support</div>
          <div><strong style={{color:"rgb(var(--text-body))"}}>No signal errors</strong> — if the source doesn&apos;t recognize the display correctly</div>
          <div><strong style={{color:"rgb(var(--text-body))"}}>Audio dropouts</strong> — especially with HDMI setups when audio formats aren&apos;t negotiated properly</div>
        </div>
        <div style={{marginTop:12,fontSize:12,color:"rgb(var(--text-muted))",lineHeight:1.8}}>
          <div style={{fontWeight:600,color:"rgb(var(--text-body))",marginBottom:4}}>Key components of an EDID strategy:</div>
          <div><strong style={{color:"#a78bfa"}}>EDID Management Tools</strong> — using hardware (matrix switchers, scalers, or EDID emulators) to customize EDID info</div>
          <div><strong style={{color:"#a78bfa"}}>Predefined EDIDs</strong> — locking devices to specific profiles, preventing unexpected changes when devices are plugged/unplugged</div>
          <div><strong style={{color:"#a78bfa"}}>EDID Passthrough</strong> — allowing the source to read EDID directly from the display — useful for simple setups</div>
          <div><strong style={{color:"#a78bfa"}}>EDID Emulation</strong> — creating custom profiles for complex setups, ensuring compatibility across multiple displays</div>
        </div>
      </div>

      {/* HDCP Strategy Info */}
      <div style={{marginBottom:20,padding:16,background:"rgb(var(--forge-surface) / 0.5)",borderRadius:8,border:"1px solid rgb(var(--border))"}}>
        <h3 style={{fontSize:14,fontWeight:600,color:"rgb(var(--text-body))",marginBottom:8}}>HDCP Strategy</h3>
        <p style={{fontSize:12,color:"#ef4444",fontWeight:600,marginBottom:10}}>**Using videoconferencing to share HDCP material violates copyright and is not supported. This IS the main reason we would set HDCP settings to non-compliant.</p>
        <p style={{fontSize:12,color:"rgb(var(--text-muted))",lineHeight:1.7,marginBottom:10}}>An HDCP Strategy refers to a plan to implement <strong style={{color:"rgb(var(--text-body))"}}>High-bandwidth Digital Content Protection (HDCP)</strong> — a security protocol developed by Intel to prevent unauthorized copying of digital audio and video content across HDMI, DisplayPort, or DVI.</p>
        <div style={{fontSize:12,color:"rgb(var(--text-muted))",lineHeight:1.8}}>
          <div><strong style={{color:"rgb(var(--text-body))"}}>Compliance &amp; Licensing:</strong> Ensuring all hardware and software meet HDCP licensing requirements from DCP LLC</div>
          <div><strong style={{color:"rgb(var(--text-body))"}}>Device Compatibility:</strong> Making sure devices support the same HDCP version, avoiding handshake errors or black screens</div>
          <div><strong style={{color:"rgb(var(--text-body))"}}>Version Management:</strong> HDCP has multiple versions (1.4, 2.2, etc.). <strong style={{color:"#f59e0b"}}>HDCP 2.2 is required for 4K UHD</strong> content protection</div>
          <div><strong style={{color:"rgb(var(--text-body))"}}>Testing &amp; Validation:</strong> Rigorous testing to detect compatibility issues in multi-device setups</div>
        </div>
      </div>

      {/* Signal Chain Table */}
      <div style={{marginBottom:16,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <h3 style={{fontSize:14,fontWeight:600,color:"rgb(var(--text-body))"}}>Signal Chain Planner</h3>
        <button onClick={addRow} style={{padding:"6px 14px",background:"rgba(139,92,246,0.1)",border:"1px dashed #8b5cf6",borderRadius:6,color:"#a78bfa",fontSize:11,cursor:"pointer"}}>+ Add Row</button>
      </div>

      <div style={{overflowX:"auto",borderRadius:8,border:"1px solid rgb(var(--border))"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,minWidth:1200}}>
          <thead>
            <tr>
              <th colSpan={2} style={{...thStyle,textAlign:"center",background:"rgba(139,92,246,0.08)",color:"#a78bfa",fontSize:10}}>Source</th>
              <th colSpan={2} style={{...thStyle,textAlign:"center",background:"rgba(168,85,247,0.08)",color:"#a855f7",fontSize:10}}>Intermediary Devices</th>
              <th colSpan={2} style={{...thStyle,textAlign:"center",background:"rgba(251,191,36,0.08)",color:"#fbbf24",fontSize:10}}>Settings</th>
              <th colSpan={6} style={{...thStyle,textAlign:"center",background:"rgba(34,197,94,0.08)",color:"#22c55e",fontSize:10}}>Destination</th>
              <th style={{...thStyle,width:30}}></th>
            </tr>
            <tr>
              <th style={thStyle}>Source Make/Model</th>
              <th style={thStyle}>Source Output Res</th>
              <th style={thStyle}>Intermediary 1</th>
              <th style={thStyle}>Intermediary 2</th>
              <th style={thStyle}>Platform</th>
              <th style={thStyle}>HDCP</th>
              <th style={thStyle}>Display Make/Model</th>
              <th style={thStyle}>Aspect Ratio</th>
              <th style={thStyle}>Desired Resolution</th>
              <th style={thStyle}>Frame Rate</th>
              <th style={thStyle}>Color Space</th>
              <th style={thStyle}>Chroma Sub</th>
              <th style={thStyle}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row,i) => {
              const hdcpStatus = getHDCPStatus(row);
              const resStatus = getResStatus(row);
              return (
                <tr key={i} style={{background:i%2===0?"transparent":"rgb(var(--forge-surface) / 0.2)"}}>
                  <td style={cellStyle}><input value={row.srcMake} onChange={e=>updateRow(i,"srcMake",e.target.value)} placeholder="e.g., BrightSign" style={inputStyle} /></td>
                  <td style={cellStyle}><select value={row.srcRes} onChange={e=>updateRow(i,"srcRes",e.target.value)} style={selectStyle}>{resOptions.map(o=><option key={o} value={o}>{o}</option>)}</select></td>
                  <td style={{...cellStyle,background:"rgba(168,85,247,0.03)"}}><input value={row.inter1} onChange={e=>updateRow(i,"inter1",e.target.value)} placeholder="enc/dec, switcher" style={inputStyle} /></td>
                  <td style={{...cellStyle,background:"rgba(168,85,247,0.03)"}}><input value={row.inter2} onChange={e=>updateRow(i,"inter2",e.target.value)} placeholder="-" style={inputStyle} /></td>
                  <td style={cellStyle}><select value={row.platform} onChange={e=>updateRow(i,"platform",e.target.value)} style={selectStyle}>{platformOptions.map(o=><option key={o} value={o}>{o||"Select One"}</option>)}</select></td>
                  <td style={cellStyle}>
                    <select value={row.hdcp} onChange={e=>updateRow(i,"hdcp",e.target.value)} style={{...selectStyle,color:row.hdcp==="On"?"#4ade80":"#f59e0b",fontWeight:600}}>
                      {hdcpOptions.map(o=><option key={o} value={o}>{o}</option>)}
                    </select>
                  </td>
                  <td style={{...cellStyle,background:"rgba(34,197,94,0.03)"}}><input value={row.dispMake} onChange={e=>updateRow(i,"dispMake",e.target.value)} placeholder="e.g., Samsung QM65r" style={inputStyle} /></td>
                  <td style={{...cellStyle,background:"rgba(34,197,94,0.03)"}}><select value={row.aspectRatio} onChange={e=>updateRow(i,"aspectRatio",e.target.value)} style={selectStyle}>{arOptions.map(o=><option key={o} value={o}>{o}</option>)}</select></td>
                  <td style={{...cellStyle,background:"rgba(34,197,94,0.03)"}}><select value={row.desiredRes} onChange={e=>updateRow(i,"desiredRes",e.target.value)} style={selectStyle}>{outResOptions.map(o=><option key={o} value={o}>{o}</option>)}</select></td>
                  <td style={{...cellStyle,background:"rgba(34,197,94,0.03)"}}><select value={row.frameRate} onChange={e=>updateRow(i,"frameRate",e.target.value)} style={selectStyle}>{frOptions.map(o=><option key={o} value={o}>{o}</option>)}</select></td>
                  <td style={{...cellStyle,background:"rgba(34,197,94,0.03)"}}><select value={row.colorSpace} onChange={e=>updateRow(i,"colorSpace",e.target.value)} style={selectStyle}>{csOptions.map(o=><option key={o} value={o}>{o}</option>)}</select></td>
                  <td style={{...cellStyle,background:"rgba(34,197,94,0.03)"}}><select value={row.chroma} onChange={e=>updateRow(i,"chroma",e.target.value)} style={selectStyle}>{chromaOptions.map(o=><option key={o} value={o}>{o}</option>)}</select></td>
                  <td style={cellStyle}><button onClick={()=>removeRow(i)} style={{background:"none",border:"none",color:"#ef4444",cursor:"pointer",fontSize:14,opacity:0.6}}>×</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Validation Results */}
      {rows.filter(r=>r.srcMake||r.dispMake).length > 0 && (
        <div style={{marginTop:16}}>
          <h3 style={{fontSize:13,fontWeight:600,color:"rgb(var(--text-muted))",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:10}}>Validation</h3>
          {rows.filter(r=>r.srcMake||r.dispMake).map((row,i) => {
            const hdcp = getHDCPStatus(row);
            const res = getResStatus(row);
            const is4KSrc = row.srcRes.startsWith("4K");
            const label = (row.srcMake || "Source "+(i+1)) + " → " + (row.dispMake || "Display "+(i+1));
            return (
              <div key={i} style={{padding:12,background:"rgb(var(--forge-surface) / 0.4)",borderRadius:8,border:"1px solid rgb(var(--border))",marginBottom:8}}>
                <div style={{fontSize:12,fontWeight:600,color:"rgb(var(--text-body))",marginBottom:6}}>{label}</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                  <span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 10px",borderRadius:12,fontSize:10,fontWeight:600,background:hdcp.color+"18",border:"1px solid "+hdcp.color+"33",color:hdcp.color}} title={hdcp.tip}>{row.hdcp==="On"?"✓":"⚠"} {hdcp.text}</span>
                  <span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 10px",borderRadius:12,fontSize:10,fontWeight:600,background:res.color+"18",border:"1px solid "+res.color+"33",color:res.color}} title={res.tip}>{res.text==="Match"?"✓":"⚠"} Resolution: {res.text}</span>
                  {is4KSrc && row.chroma==="4:4:4" && <span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 10px",borderRadius:12,fontSize:10,fontWeight:600,background:"rgba(139,92,246,0.12)",border:"1px solid rgba(139,92,246,0.3)",color:"#a78bfa"}} title="4K 4:4:4 requires 18Gbps — ensure DTP3, SDVoE, or HDMI 2.0+ throughout chain">ℹ 4K 4:4:4 → 18Gbps required</span>}
                  {row.hdcp==="Off" && <span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 10px",borderRadius:12,fontSize:10,fontWeight:600,background:"rgba(239,68,68,0.12)",border:"1px solid rgba(239,68,68,0.3)",color:"#f87171"}}>⚠ Protected content will show black screen</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick Reference */}
      <div style={{marginTop:16,padding:14,background:"rgba(30,41,59,0.4)",borderRadius:8,border:"1px solid rgb(var(--border))",fontSize:12,color:"rgb(var(--text-subtle))",lineHeight:1.7}}>
        <div style={{fontWeight:600,color:"rgb(var(--text-muted))",marginBottom:6}}>HDCP Version Reference</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,fontSize:11}}>
          <div><strong style={{color:"rgb(var(--text-body))"}}>HDCP 1.4</strong><br/>1080p max, HDMI 1.x/DVI</div>
          <div><strong style={{color:"#f59e0b"}}>HDCP 2.2</strong><br/>4K UHD required, HDMI 2.0</div>
          <div><strong style={{color:"#a78bfa"}}>HDCP 2.3</strong><br/>Latest, HDMI 2.1 (Extron DTP3)</div>
        </div>
        <div style={{marginTop:10,fontWeight:600,color:"rgb(var(--text-muted))",marginBottom:4}}>Bandwidth Reference</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:6,fontSize:10}}>
          <div><strong style={{color:"rgb(var(--text-body))"}}>1080p60 4:4:4</strong><br/>4.46 Gbps</div>
          <div><strong style={{color:"rgb(var(--text-body))"}}>4K30 4:4:4</strong><br/>8.91 Gbps</div>
          <div><strong style={{color:"#f59e0b"}}>4K60 4:2:0</strong><br/>8.91 Gbps</div>
          <div><strong style={{color:"#ef4444"}}>4K60 4:4:4</strong><br/>17.82 Gbps</div>
        </div>
      </div>
    </div>
  );
}
