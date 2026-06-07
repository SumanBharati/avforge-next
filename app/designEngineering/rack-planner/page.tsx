'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { loadToolData, saveToolData } from "@/lib/tool-data";
import { useBOM } from "@/lib/bom-context";
import BOMPanel from "@/components/BOMPanel";

export default function RackPlannerPage() {
  const rackColors = ["#3b82f6","#8b5cf6","#22c55e","#f59e0b","#ef4444","#06b6d4","#f97316","#ec4899","rgb(var(--text-subtle))","rgb(var(--text-faint))"];
  const defaultItems = [
    {name:"Patch Panel",ru:1,color:"rgb(var(--text-subtle))"},
    {name:"NETGEAR M4250-48G4X PoE+",ru:1,color:"#3b82f6"},
    {name:"Q-SYS Core 110f",ru:1,color:"#8b5cf6"},
    {name:"Extron DTP3 CrossPoint 642",ru:2,color:"#0e7a3a"},
    {name:"Biamp TesiraFORTÉ AVB",ru:1,color:"#10b981"},
    {name:"Extron DMP 128 Plus AT",ru:1,color:"#22c55e"},
    {name:"Crown DCi 4|300N",ru:2,color:"#ef4444"},
    {name:"1RU Vent Panel",ru:1,color:"rgb(var(--text-faint))"},
    {name:"UPS 1500VA",ru:2,color:"#06b6d4"},
  ];
  const [items, setItems] = useState(defaultItems);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [bomCollapsed, setBomCollapsed] = useState(true);
  const saveTimer = useRef<NodeJS.Timeout | null>(null);
  const { updateSlice } = useBOM();

  // Load
  useEffect(() => {
    loadToolData("rack-planner").then((data) => {
      if (data?.items) setItems(data.items as typeof items);
      setLoaded(true);
    });
  }, []);

  // Auto-save
  const doSave = useCallback((list: typeof items) => {
    saveToolData("rack-planner", { items: list });
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => doSave(items), 1000);
  }, [items, loaded, doSave]);

  // Sync rack items to shared BOM
  useEffect(() => {
    updateSlice('rack-builder', items.map(item => ({ name: item.name, cat: 'Rack Equipment' })));
  }, [items, updateSlice]);

  // Auto-expand BOM when a device is added (not on initial load)
  const bomBaseline = useRef(-1);
  useEffect(() => {
    if (!loaded) return;
    if (bomBaseline.current === -1) {
      bomBaseline.current = items.length;
      return;
    }
    if (items.length > bomBaseline.current) {
      setBomCollapsed(false);
      bomBaseline.current = items.length;
    }
  }, [items.length, loaded]);

  const totalRU = items.reduce((s,i)=>s+i.ru,0);
  const maxRU = 42;
  const ruH = 18;
  const rackW = 340;

  return (
    <div className="animate-fade-in flex" style={{minHeight:"calc(100vh - 157px)"}}>
      {/* Main content */}
      <div style={{flex:1,padding:24,overflowY:"auto"}}>
      <Link href="/designEngineering" className="mb-1 flex items-center gap-1.5 text-xs text-subtle hover:text-secondary">
        ← Design Tools
      </Link>
      <h2 className="mb-0.5 text-lg font-semibold text-heading">Rack Builder</h2>
      <p className="mb-5 text-[13px] text-subtle">Visual 42U rack elevation builder</p>

      <div style={{display:"flex",gap:20}}>
        {/* Left: Device Editor Panel */}
        <div style={{width:260,flexShrink:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{fontSize:12,color:"rgb(var(--text-muted))"}}>
              <span style={{color:totalRU>maxRU?"#f87171":"#3b82f6",fontWeight:700,fontFamily:"'JetBrains Mono', monospace",fontSize:16}}>{totalRU}</span>
              <span style={{fontSize:11}}>/{maxRU} RU</span>
            </div>
            <button onClick={()=>setItems([...items,{name:"New Device",ru:1,color:rackColors[items.length%rackColors.length]}])} style={{background:"rgba(59,130,246,0.1)",border:"1px dashed rgba(59,130,246,0.4)",borderRadius:6,padding:"5px 12px",color:"#3b82f6",fontSize:10,cursor:"pointer"}}>+ Add Device</button>
          </div>
          <div style={{maxHeight:500,overflowY:"auto",paddingRight:4}}>
            {items.map((item,i)=>(
              <div key={i} style={{padding:"8px 10px",marginBottom:4,background:editingIdx===i?"rgba(59,130,246,0.08)":"rgb(var(--forge-surface) / 0.4)",border:"1px solid "+(editingIdx===i?"rgba(59,130,246,0.3)":"rgb(var(--border))"),borderRadius:6,borderLeft:"3px solid "+item.color,cursor:"pointer"}} onClick={()=>setEditingIdx(editingIdx===i?null:i)}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                  <div style={{fontSize:11,color:"rgb(var(--text-body))",fontWeight:500,flex:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{item.name}</div>
                  <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
                    <span style={{fontSize:9,color:"rgb(var(--text-subtle))",fontFamily:"'JetBrains Mono',monospace"}}>{item.ru}U</span>
                    <button onClick={(e)=>{e.stopPropagation();setItems(items.filter((_,j)=>j!==i));if(editingIdx===i)setEditingIdx(null);}} style={{background:"none",border:"none",color:"#ef4444",cursor:"pointer",fontSize:12,opacity:0.4,padding:0}}>×</button>
                  </div>
                </div>
                {editingIdx===i && (
                  <div style={{marginTop:8,display:"flex",flexDirection:"column",gap:6}}>
                    <input value={item.name} onChange={e=>{const n=[...items];n[i]={...n[i],name:e.target.value};setItems(n);}} style={{padding:"4px 8px",background:"rgb(var(--forge-surface))",border:"1px solid rgb(var(--border))",borderRadius:4,color:"rgb(var(--text-body))",fontSize:11,outline:"none"}} />
                    <div style={{display:"flex",gap:6,alignItems:"center"}}>
                      <select value={item.ru} onChange={e=>{const n=[...items];n[i]={...n[i],ru:parseInt(e.target.value)};setItems(n);}} style={{padding:"3px 6px",background:"rgb(var(--forge-surface))",border:"1px solid rgb(var(--border))",borderRadius:4,color:"rgb(var(--text-body))",fontSize:11,outline:"none",cursor:"pointer"}}>
                        {[1,2,3,4,5,6,8,10,12].map(r=><option key={r} value={r}>{r} RU</option>)}
                      </select>
                      <div style={{display:"flex",gap:3}}>
                        {rackColors.map(c=>(
                          <div key={c} onClick={()=>{const n=[...items];n[i]={...n[i],color:c};setItems(n);}} style={{width:14,height:14,borderRadius:3,background:c,border:item.color===c?"2px solid #fff":"2px solid transparent",cursor:"pointer",opacity:item.color===c?1:0.5}} />
                        ))}
                      </div>
                    </div>
                    <div style={{display:"flex",gap:4}}>
                      <button disabled={i===0} onClick={(e)=>{e.stopPropagation();const n=[...items];[n[i-1],n[i]]=[n[i],n[i-1]];setItems(n);setEditingIdx(i-1);}} style={{flex:1,padding:"3px",background:"rgba(59,130,246,0.08)",border:"1px solid rgba(59,130,246,0.2)",borderRadius:3,color:i===0?"rgb(var(--text-faint))":"#3b82f6",fontSize:9,cursor:i===0?"default":"pointer"}}>▲ Move Up</button>
                      <button disabled={i===items.length-1} onClick={(e)=>{e.stopPropagation();const n=[...items];[n[i],n[i+1]]=[n[i+1],n[i]];setItems(n);setEditingIdx(i+1);}} style={{flex:1,padding:"3px",background:"rgba(59,130,246,0.08)",border:"1px solid rgba(59,130,246,0.2)",borderRadius:3,color:i===items.length-1?"rgb(var(--text-faint))":"#3b82f6",fontSize:9,cursor:i===items.length-1?"default":"pointer"}}>▼ Move Down</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right: Rack Visualization */}
        <div style={{flex:1,display:"flex",justifyContent:"center"}}>
          <div style={{position:"relative"}}>
            {/* Rack frame */}
            <div style={{width:rackW+60,background:"rgb(var(--forge-surface))",borderRadius:6,border:"2px solid rgb(var(--border))",padding:"6px 0",boxShadow:"0 4px 20px rgba(0,0,0,0.15),inset 0 0 30px rgba(0,0,0,0.05)"}}>
              {/* Top plate */}
              <div style={{height:8,margin:"0 8px 4px",background:"linear-gradient(180deg,rgb(var(--border)),rgb(var(--forge-surface)))",borderRadius:"3px 3px 0 0",border:"1px solid rgb(var(--border))"}} />

              {/* Rack units container */}
              <div style={{position:"relative",margin:"0 8px"}}>
                {(()=>{
                  let y = 0;
                  const elements: React.ReactNode[] = [];
                  items.forEach((item,i) => {
                    const h = item.ru * ruH;
                    elements.push(
                      <div key={"item-"+i} style={{display:"flex",alignItems:"stretch",height:h,marginBottom:1}}>
                        {/* Left rail with RU numbers */}
                        <div style={{width:26,display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",background:"rgb(var(--forge-panel))",borderLeft:"2px solid rgb(var(--border))",borderRight:"1px solid rgb(var(--border))"}}>
                          {Array.from({length:item.ru},(_,r)=>(
                            <div key={r} style={{fontSize:7,color:"rgb(var(--text-subtle))",fontFamily:"'JetBrains Mono',monospace",lineHeight:ruH+"px",textAlign:"center"}}>{y/ruH+r+1}</div>
                          ))}
                        </div>

                        {/* Device faceplate */}
                        <div onClick={()=>setEditingIdx(editingIdx===i?null:i)} style={{flex:1,background:`linear-gradient(180deg, ${item.color}18 0%, ${item.color}08 100%)`,border:"1px solid "+item.color+"44",borderLeft:"none",borderRight:"none",display:"flex",alignItems:"center",padding:"0 12px",gap:8,cursor:"pointer",position:"relative",overflow:"hidden",transition:"all 0.15s",outline:editingIdx===i?"1px solid "+item.color+"88":"none"}}>
                          {/* Left mounting screws */}
                          <div style={{display:"flex",flexDirection:"column",gap:Math.max(4,h-14),position:"absolute",left:4,top:"50%",transform:"translateY(-50%)"}}>
                            <div style={{width:5,height:5,borderRadius:5,background:"rgb(var(--text-faint))",border:"1px solid rgb(var(--text-subtle))"}} />
                            {item.ru>=2 && <div style={{width:5,height:5,borderRadius:5,background:"rgb(var(--text-faint))",border:"1px solid rgb(var(--text-subtle))"}} />}
                          </div>

                          {/* Color accent strip */}
                          <div style={{width:3,height:"70%",background:item.color,borderRadius:2,opacity:0.8,marginLeft:10}} />

                          {/* Device label */}
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:item.ru>=2?11:10,color:"rgb(var(--text-body))",fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{item.name}</div>
                            {item.ru>=2 && <div style={{fontSize:8,color:item.color,opacity:0.7,marginTop:1}}>{item.ru}U</div>}
                          </div>

                          {/* Right indicator LEDs */}
                          <div style={{display:"flex",flexDirection:"column",gap:3,marginRight:8}}>
                            <div style={{width:4,height:4,borderRadius:4,background:"#22c55e",boxShadow:"0 0 4px #22c55e88"}} />
                            {item.ru>=2 && <div style={{width:4,height:4,borderRadius:4,background:item.color,boxShadow:"0 0 4px "+item.color+"88"}} />}
                          </div>

                          {/* Right mounting screws */}
                          <div style={{display:"flex",flexDirection:"column",gap:Math.max(4,h-14),position:"absolute",right:4,top:"50%",transform:"translateY(-50%)"}}>
                            <div style={{width:5,height:5,borderRadius:5,background:"rgb(var(--text-faint))",border:"1px solid rgb(var(--text-subtle))"}} />
                            {item.ru>=2 && <div style={{width:5,height:5,borderRadius:5,background:"rgb(var(--text-faint))",border:"1px solid rgb(var(--text-subtle))"}} />}
                          </div>
                        </div>

                        {/* Right rail */}
                        <div style={{width:26,display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",background:"rgb(var(--forge-panel))",borderRight:"2px solid rgb(var(--border))",borderLeft:"1px solid rgb(var(--border))"}}>
                          {Array.from({length:item.ru},(_,r)=>(
                            <div key={r} style={{fontSize:7,color:"rgb(var(--text-subtle))",fontFamily:"'JetBrains Mono',monospace",lineHeight:ruH+"px",textAlign:"center"}}>{y/ruH+r+1}</div>
                          ))}
                        </div>
                      </div>
                    );
                    y += h;
                  });

                  // Empty space
                  const usedRU = items.reduce((s,it)=>s+it.ru,0);
                  const emptyRU = maxRU - usedRU;
                  if(emptyRU > 0) {
                    const showRU = Math.min(emptyRU, 12);
                    elements.push(
                      <div key="empty" style={{display:"flex",height:showRU*ruH,marginBottom:1,opacity:0.4}}>
                        <div style={{width:26,background:"rgb(var(--forge-panel))",borderLeft:"2px solid rgb(var(--border))",borderRight:"1px solid rgb(var(--border))",display:"flex",flexDirection:"column",justifyContent:"flex-start"}}>
                          {Array.from({length:showRU},(_,r)=>(
                            <div key={r} style={{fontSize:7,color:"rgb(var(--text-faint))",fontFamily:"'JetBrains Mono',monospace",lineHeight:ruH+"px",textAlign:"center"}}>{usedRU+r+1}</div>
                          ))}
                        </div>
                        <div style={{flex:1,border:"1px dashed rgb(var(--border))",display:"flex",alignItems:"center",justifyContent:"center",background:"rgb(var(--forge-surface) / 0.15)"}}>
                          <span style={{fontSize:10,color:"rgb(var(--text-faint))"}}>{emptyRU} RU available</span>
                        </div>
                        <div style={{width:26,background:"rgb(var(--forge-panel))",borderRight:"2px solid rgb(var(--border))",borderLeft:"1px solid rgb(var(--border))"}} />
                      </div>
                    );
                  }
                  return elements;
                })()}
              </div>

              {/* Bottom plate */}
              <div style={{height:8,margin:"4px 8px 0",background:"linear-gradient(0deg,rgb(var(--border)),rgb(var(--forge-surface)))",borderRadius:"0 0 3px 3px",border:"1px solid rgb(var(--border))"}} />
            </div>

            {/* Rack label */}
            <div style={{textAlign:"center",marginTop:8,fontSize:10,color:"rgb(var(--text-subtle))"}}>
              {totalRU>maxRU && <div style={{color:"#ef4444",fontWeight:600,fontSize:11}}>⚠ Over capacity by {totalRU-maxRU} RU</div>}
            </div>
          </div>
        </div>
      </div>
      </div>{/* end main content */}

      {/* Shared BOM Panel */}
      <BOMPanel
        collapsed={bomCollapsed}
        onToggle={() => setBomCollapsed(!bomCollapsed)}
      />
    </div>
  );
}
