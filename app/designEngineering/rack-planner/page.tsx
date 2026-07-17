'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { loadToolData, saveToolData } from "@/lib/tool-data";
import { useBOM } from "@/lib/bom-context";
import BOMPanel from "@/components/BOMPanel";
import { useCanvasAnnotations } from "@/components/CanvasAnnotations";

export default function RackPlannerPage() {
  const rackColors = ["#3b82f6","#8b5cf6","#22c55e","#f59e0b","#ef4444","#06b6d4","#f97316","#ec4899","rgb(var(--text-subtle))","rgb(var(--text-faint))"];
  const defaultItems = [
    {name:"Patch Panel",ru:1,color:"rgb(var(--text-subtle))"},
    {name:"NETGEAR M4250-48G4X PoE+",ru:1,color:"#8b5cf6"},
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

  // Annotations (Text / Shape / Pencil / Highlight / Eraser) — drawn on an
  // overlay in the rack container's pixel space
  const rackAreaRef = useRef<HTMLDivElement>(null);
  const annotate = useCanvasAnnotations({
    getPoint: (e) => {
      const el = rackAreaRef.current; if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    },
  });

  // Load
  useEffect(() => {
    loadToolData("rack-planner").then((data) => {
      if (data?.items) setItems(data.items as typeof items);
      if (data?.annotations) annotate.setAnnotations(data.annotations as any[]);
      setLoaded(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save
  const doSave = useCallback((list: typeof items, anns: any[]) => {
    saveToolData("rack-planner", { items: list, annotations: anns });
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => doSave(items, annotate.annotations), 1000);
  }, [items, annotate.annotations, loaded, doSave]);

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

  // Marquee multi-select on the rack elevation (AutoCAD-style):
  // L→R drag = window (rows fully inside), R→L = crossing (rows touched)
  const [selectedIdxs, setSelectedIdxs] = useState<Set<number>>(new Set());
  const [marquee, setMarquee] = useState<{sx:number;sy:number;cx:number;cy:number}|null>(null);
  const rackRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const didMarqueeDrag = useRef(false);

  const startRackMarquee = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const el = rackRef.current; if (!el) return;
    e.preventDefault();
    const rect = el.getBoundingClientRect();
    const start = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    let cur = start;
    didMarqueeDrag.current = false;
    setMarquee({ sx: start.x, sy: start.y, cx: start.x, cy: start.y });
    const onMove = (me: MouseEvent) => {
      const r = el.getBoundingClientRect();
      cur = { x: me.clientX - r.left, y: me.clientY - r.top };
      setMarquee({ sx: start.x, sy: start.y, cx: cur.x, cy: cur.y });
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      if (Math.abs(cur.x - start.x) > 4 || Math.abs(cur.y - start.y) > 4) {
        didMarqueeDrag.current = true;
        const isWindow = cur.x >= start.x;
        const x1 = Math.min(start.x, cur.x), x2 = Math.max(start.x, cur.x);
        const y1 = Math.min(start.y, cur.y), y2 = Math.max(start.y, cur.y);
        const width = el.clientWidth;
        const hits = new Set<number>();
        let top = 0;
        itemsRef.current.forEach((item, i) => {
          const h = item.ru * ruH;
          const xOverlap = !(width < x1 || 0 > x2);
          const hit = isWindow
            ? xOverlap && top >= y1 && top + h <= y2   // window: row fully inside vertically
            : xOverlap && !(top + h < y1 || top > y2); // crossing: row touched
          if (hit) hits.add(i);
          top += h + 1;
        });
        setSelectedIdxs(hits);
        setEditingIdx(null);
      } else {
        setSelectedIdxs(new Set());
      }
      setMarquee(null);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  // Delete / Backspace removes marquee-selected devices; Escape clears the selection
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "Escape") { setSelectedIdxs(new Set()); return; }
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      if (selectedIdxs.size === 0) return;
      e.preventDefault();
      setItems(prev => prev.filter((_, i) => !selectedIdxs.has(i)));
      setSelectedIdxs(new Set());
      setEditingIdx(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedIdxs]);

  return (
    <div className="animate-fade-in flex" style={{minHeight:"calc(100vh - 157px)"}}>
      {/* Main content */}
      <div style={{flex:1,padding:24,overflowY:"auto"}}>
      {/* Full-width command bar, matching Signal Flow and Room Designer */}
      <div style={{background:"rgb(var(--forge-panel))",borderBottom:"2px solid rgb(var(--border))",margin:"-24px -24px 20px",paddingLeft:4,paddingRight:12,userSelect:"none"}}>
        <div style={{display:"flex",alignItems:"stretch",height:82}}>
          <div style={{display:"flex",flexDirection:"column",justifyContent:"space-between",padding:"5px 6px 0"}}>
            <div style={{display:"flex",gap:2,flex:1,alignItems:"stretch"}}>
              <button onClick={()=>setItems([...items,{name:"New Device",ru:1,color:rackColors[items.length%rackColors.length]}])} title="Add equipment to rack"
                style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,padding:"4px 12px",background:"transparent",border:"1px solid transparent",borderRadius:4,cursor:"pointer",transition:"all 0.15s",minWidth:58}}
                onMouseEnter={e=>{e.currentTarget.style.background="rgb(var(--forge-surface))";e.currentTarget.style.borderColor="rgb(var(--border))"}}
                onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.borderColor="transparent"}}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--text-subtle))" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="3" width="7" height="18" rx="1"/><rect x="13" y="7" width="7" height="14" rx="1"/><line x1="6.5" y1="7" x2="8.5" y2="7"/><line x1="15.5" y1="11" x2="17.5" y2="11"/>
                </svg>
                <span style={{fontSize:9,color:"rgb(var(--text-subtle))",lineHeight:1.2,whiteSpace:"nowrap",textAlign:"center"}}>Add<br/>Equipment</span>
              </button>
            </div>
            <span style={{fontSize:8,color:"rgb(var(--text-subtle))",textTransform:"uppercase",letterSpacing:"0.06em",textAlign:"center",paddingBottom:2,paddingTop:2}}>Create</span>
          </div>
          <div style={{width:1,background:"rgb(var(--border))",margin:"6px 4px"}} />
          <div style={{display:"flex",flexDirection:"column",justifyContent:"space-between",padding:"5px 6px 0"}}>
            <div style={{display:"flex",gap:2,flex:1,alignItems:"stretch"}}>
              {annotate.toolbarButtons}
            </div>
            <span style={{fontSize:8,color:"rgb(var(--text-subtle))",textTransform:"uppercase",letterSpacing:"0.06em",textAlign:"center",paddingBottom:2,paddingTop:2}}>Annotate</span>
          </div>
        </div>
      </div>
      {annotate.optionsBar && <div style={{display:"flex",justifyContent:"center",marginTop:-12,marginBottom:12}}>{annotate.optionsBar}</div>}

      <div className="flex flex-col gap-5 lg:flex-row">
        {/* Left: Device Editor Panel */}
        <div className="w-full shrink-0 lg:w-[260px]">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{fontSize:12,color:"rgb(var(--text-muted))"}}>
              <span style={{color:totalRU>maxRU?"#f87171":"#8b5cf6",fontWeight:700,fontFamily:"'JetBrains Mono', monospace",fontSize:16}}>{totalRU}</span>
              <span style={{fontSize:11}}>/{maxRU} RU</span>
            </div>
            <button onClick={()=>setItems([...items,{name:"New Device",ru:1,color:rackColors[items.length%rackColors.length]}])} style={{background:"rgba(139,92,246,0.1)",border:"1px dashed rgba(139,92,246,0.4)",borderRadius:6,padding:"5px 12px",color:"#8b5cf6",fontSize:10,cursor:"pointer"}}>+ Add Device</button>
          </div>
          <div style={{maxHeight:500,overflowY:"auto",paddingRight:4}}>
            {items.map((item,i)=>(
              <div key={i} style={{padding:"8px 10px",marginBottom:4,background:editingIdx===i?"rgba(139,92,246,0.08)":"rgb(var(--forge-surface) / 0.4)",border:"1px solid "+(editingIdx===i?"rgba(139,92,246,0.3)":"rgb(var(--border))"),borderRadius:6,borderLeft:"3px solid "+item.color,cursor:"pointer"}} onClick={()=>setEditingIdx(editingIdx===i?null:i)}>
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
                      <button disabled={i===0} onClick={(e)=>{e.stopPropagation();const n=[...items];[n[i-1],n[i]]=[n[i],n[i-1]];setItems(n);setEditingIdx(i-1);}} style={{flex:1,padding:"3px",background:"rgba(139,92,246,0.08)",border:"1px solid rgba(139,92,246,0.2)",borderRadius:3,color:i===0?"rgb(var(--text-faint))":"#8b5cf6",fontSize:9,cursor:i===0?"default":"pointer"}}>▲ Move Up</button>
                      <button disabled={i===items.length-1} onClick={(e)=>{e.stopPropagation();const n=[...items];[n[i],n[i+1]]=[n[i+1],n[i]];setItems(n);setEditingIdx(i+1);}} style={{flex:1,padding:"3px",background:"rgba(139,92,246,0.08)",border:"1px solid rgba(139,92,246,0.2)",borderRadius:3,color:i===items.length-1?"rgb(var(--text-faint))":"#8b5cf6",fontSize:9,cursor:i===items.length-1?"default":"pointer"}}>▼ Move Down</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right: Rack Visualization */}
        <div className="flex flex-1 flex-col items-center overflow-x-auto">
          <div ref={rackAreaRef} style={{position:"relative"}}>
            {/* Rack frame */}
            <div style={{width:rackW+60,background:"rgb(var(--forge-surface))",borderRadius:6,border:"2px solid rgb(var(--border))",padding:"6px 0",boxShadow:"0 4px 20px rgba(0,0,0,0.15),inset 0 0 30px rgba(0,0,0,0.05)"}}>
              {/* Top plate */}
              <div style={{height:8,margin:"0 8px 4px",background:"linear-gradient(180deg,rgb(var(--border)),rgb(var(--forge-surface)))",borderRadius:"3px 3px 0 0",border:"1px solid rgb(var(--border))"}} />

              {/* Rack units container */}
              <div ref={rackRef} onMouseDown={startRackMarquee} style={{position:"relative",margin:"0 8px",userSelect:"none",cursor:marquee?"crosshair":"default"}}>
                {(()=>{
                  let y = 0;
                  const elements: React.ReactNode[] = [];
                  items.forEach((item,i) => {
                    const h = item.ru * ruH;
                    elements.push(
                      <div key={"item-"+i} style={{display:"flex",alignItems:"stretch",height:h,marginBottom:1,outline:selectedIdxs.has(i)?"2px solid #8b5cf6":undefined,outlineOffset:-1,position:"relative",zIndex:selectedIdxs.has(i)?1:undefined}}>
                        {/* Left rail with RU numbers */}
                        <div style={{width:26,display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",background:"rgb(var(--forge-panel))",borderLeft:"2px solid rgb(var(--border))",borderRight:"1px solid rgb(var(--border))"}}>
                          {Array.from({length:item.ru},(_,r)=>(
                            <div key={r} style={{fontSize:7,color:"rgb(var(--text-subtle))",fontFamily:"'JetBrains Mono',monospace",lineHeight:ruH+"px",textAlign:"center"}}>{y/ruH+r+1}</div>
                          ))}
                        </div>

                        {/* Device faceplate */}
                        <div onClick={()=>{if(didMarqueeDrag.current){didMarqueeDrag.current=false;return;}setEditingIdx(editingIdx===i?null:i);}} style={{flex:1,background:`linear-gradient(180deg, ${item.color}18 0%, ${item.color}08 100%)`,border:"1px solid "+item.color+"44",borderLeft:"none",borderRight:"none",display:"flex",alignItems:"center",padding:"0 12px",gap:8,cursor:"pointer",position:"relative",overflow:"hidden",transition:"all 0.15s",outline:editingIdx===i?"1px solid "+item.color+"88":"none"}}>
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
                {/* Marquee rectangle — blue solid = window, green dashed = crossing */}
                {marquee && (()=>{
                  const isWindow = marquee.cx >= marquee.sx;
                  const x = Math.min(marquee.sx, marquee.cx);
                  const y = Math.min(marquee.sy, marquee.cy);
                  const w = Math.abs(marquee.cx - marquee.sx);
                  const h = Math.abs(marquee.cy - marquee.sy);
                  return (
                    <div style={{position:"absolute",left:x,top:y,width:w,height:h,zIndex:5,pointerEvents:"none",
                      background:isWindow?"rgba(139,92,246,0.07)":"rgba(34,197,94,0.07)",
                      border:`1px ${isWindow?"solid #8b5cf6":"dashed #22c55e"}`}} />
                  );
                })()}
              </div>

              {/* Bottom plate */}
              <div style={{height:8,margin:"4px 8px 0",background:"linear-gradient(0deg,rgb(var(--border)),rgb(var(--forge-surface)))",borderRadius:"0 0 3px 3px",border:"1px solid rgb(var(--border))"}} />
            </div>

            {/* Rack label */}
            <div style={{textAlign:"center",marginTop:8,fontSize:10,color:"rgb(var(--text-subtle))"}}>
              {totalRU>maxRU && <div style={{color:"#ef4444",fontWeight:600,fontSize:11}}>⚠ Over capacity by {totalRU-maxRU} RU</div>}
            </div>

            {/* Annotation overlay — interactive only while a tool is active */}
            <svg
              onMouseDown={annotate.handleDown}
              onMouseMove={annotate.handleMove}
              onMouseUp={annotate.handleUp}
              onMouseLeave={annotate.handleLeave}
              onDoubleClick={annotate.handleDoubleClick}
              style={{position:"absolute",inset:0,width:"100%",height:"100%",zIndex:4,overflow:"visible",pointerEvents:annotate.activeTool?"auto":"none",cursor:annotate.cursor||undefined}}>
              {annotate.layer}
            </svg>
          </div>
        </div>
      </div>
      </div>{/* end main content */}

      {/* Annotation text editor overlay */}
      {annotate.overlay}

      {/* Shared BOM Panel */}
      <BOMPanel
        collapsed={bomCollapsed}
        onToggle={() => setBomCollapsed(!bomCollapsed)}
      />
    </div>
  );
}
