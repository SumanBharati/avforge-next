'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { loadToolData, saveToolData } from "@/lib/tool-data";
import { searchProducts, type AVProduct } from "@/lib/av-products";
import { useBOM } from "@/lib/bom-context";
import BOMPanel from "@/components/BOMPanel";
import { useCanvasAnnotations } from "@/components/CanvasAnnotations";

type RackItem = {
  sourceDeviceId?: string | number;
  productId?: string;
  manual?: boolean;
  rackMounted?: boolean;
  rackOrder?: number;
  rackStartRU?: number;
  rackId?: number;
  unrackedX?: number;
  unrackedY?: number;
  name: string;
  ru: number;
  color: string;
};

export default function RackPlannerPage() {
  const rackColors = ["#3b82f6","#8b5cf6","#22c55e","#f59e0b","#ef4444","#06b6d4","#f97316","#ec4899","rgb(var(--text-subtle))","rgb(var(--text-faint))"];
  const [items, setItems] = useState<RackItem[]>([]);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [bomCollapsed, setBomCollapsed] = useState(true);
  const [showAddEquipment, setShowAddEquipment] = useState(false);
  const [equipmentSearch, setEquipmentSearch] = useState("");
  const [equipmentResults, setEquipmentResults] = useState<AVProduct[]>([]);
  const [equipmentLoading, setEquipmentLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<AVProduct|null>(null);
  const [newDescription, setNewDescription] = useState("");
  const [newMake, setNewMake] = useState("");
  const [newModel, setNewModel] = useState("");
  const [pendingRackItem, setPendingRackItem] = useState<RackItem|null>(null);
  const [rackRUCapacity, setRackRUCapacity] = useState<number|null>(null);
  const [rackCount, setRackCount] = useState(1);
  const [additionalRackRUCapacities, setAdditionalRackRUCapacities] = useState<number[]>([]);
  const [hoveredRackNumber, setHoveredRackNumber] = useState<number|null>(null);
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
    Promise.all([loadToolData("rack-planner"), loadToolData("signal-flow")]).then(([rackData, signalData]) => {
      const savedItems = Array.isArray(rackData?.items) ? rackData.items as RackItem[] : [];
      const savedBySourceId = new Map(
        savedItems
          .filter(item => item.sourceDeviceId !== undefined)
          .map(item => [String(item.sourceDeviceId), item])
      );
      const signalDevices = Array.isArray(signalData?.devices) ? signalData.devices as any[] : [];
      const mountedItems = signalDevices
        .filter(device => (device.rackMounted ?? device.rack_mounted ?? false) === true)
        .map((device, index): RackItem => {
          const saved = savedBySourceId.get(String(device.id));
          const catalogRU = Number(device.rackUnits ?? device.rack_units);
          const modelName = device.model && device.model !== "—" ? device.model : null;
          const manufacturer = device.mfr && device.mfr !== "Generic" ? device.mfr : null;
          const sourceName = [manufacturer, modelName].filter(Boolean).join(" ") || device.type || "Rack Device";
          return {
            sourceDeviceId: device.id,
            rackMounted: true,
            rackOrder: saved?.rackOrder,
            rackStartRU: saved?.rackStartRU,
            rackId: saved?.rackId ?? 1,
            name: saved?.name || sourceName,
            ru: saved?.ru || (Number.isFinite(catalogRU) && catalogRU > 0 ? Math.max(1, Math.round(catalogRU)) : 1),
            color: saved?.color || device.color || rackColors[index % rackColors.length],
          };
        });
      const manualItems = savedItems.filter(item => item.manual === true);
      const restored=[...mountedItems,...manualItems].sort((a,b)=>(a.rackOrder??Number.MAX_SAFE_INTEGER)-(b.rackOrder??Number.MAX_SAFE_INTEGER));
      const restoredMounted=restored.filter(item=>item.rackMounted!==false);
      let nextTopRU=restoredMounted.reduce((sum,item)=>sum+item.ru,0);
      setItems(restored.map(item=>{
        if(item.rackMounted===false||item.rackStartRU!==undefined)return item;
        const rackStartRU=Math.max(1,nextTopRU-item.ru+1);
        nextTopRU-=item.ru;
        return {...item,rackStartRU};
      }));
      if (typeof rackData?.rackRUCapacity === "number") setRackRUCapacity(rackData.rackRUCapacity);
      const restoredRackCount=typeof rackData?.rackCount === "number"?Math.max(1,Math.floor(rackData.rackCount)):1;
      setRackCount(restoredRackCount);
      const savedAdditionalCapacities=Array.isArray(rackData?.additionalRackRUCapacities)?rackData.additionalRackRUCapacities:[];
      const defaultAdditionalCapacity=Math.max(1,typeof rackData?.rackRUCapacity==="number"?rackData.rackRUCapacity:restoredMounted.reduce((sum,item)=>sum+item.ru,0));
      setAdditionalRackRUCapacities(Array.from({length:restoredRackCount-1},(_,index)=>{
        const saved=Number(savedAdditionalCapacities[index]);
        return Number.isFinite(saved)&&saved>0?Math.floor(saved):defaultAdditionalCapacity;
      }));
      if (rackData?.annotations) annotate.setAnnotations(rackData.annotations as any[]);
      setLoaded(true);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save
  const doSave = useCallback((list: RackItem[], anns: any[]) => {
    saveToolData("rack-planner", { items: list.map((item,rackOrder)=>({...item,rackOrder})), annotations: anns, rackRUCapacity, rackCount, additionalRackRUCapacities });
  }, [rackRUCapacity,rackCount,additionalRackRUCapacities]);

  useEffect(() => {
    if (!loaded) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => doSave(items, annotate.annotations), 1000);
  }, [items, annotate.annotations, loaded, doSave]);

  useEffect(() => {
    if (!showAddEquipment || !equipmentSearch.trim()) {
      setEquipmentResults([]);
      setEquipmentLoading(false);
      return;
    }
    setEquipmentLoading(true);
    const timer = setTimeout(async () => {
      try {
        setEquipmentResults(await searchProducts(equipmentSearch, 12));
      } catch {
        setEquipmentResults([]);
      } finally {
        setEquipmentLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [equipmentSearch, showAddEquipment]);

  const closeAddEquipment = () => {
    setShowAddEquipment(false);
    setEquipmentSearch("");
    setEquipmentResults([]);
    setSelectedProduct(null);
    setNewDescription("");
    setNewMake("");
    setNewModel("");
  };

  const addEquipment = () => {
    if (selectedProduct) {
      const ru = selectedProduct.rack_units && selectedProduct.rack_units > 0 ? Math.max(1, Math.round(selectedProduct.rack_units)) : 1;
      const name = [selectedProduct.manufacturer, selectedProduct.model_name].filter(Boolean).join(" ") || selectedProduct.type;
      setPendingRackItem({manual:true,productId:selectedProduct.id,name,ru,color:selectedProduct.color||rackColors[items.length%rackColors.length]});
      closeAddEquipment();
      return;
    }
    const description = newDescription.trim();
    const makeModel = [newMake.trim(), newModel.trim()].filter(Boolean).join(" ");
    if (!description && !makeModel) return;
    setPendingRackItem({manual:true,name:makeModel||description,ru:1,color:rackColors[items.length%rackColors.length]});
    closeAddEquipment();
  };

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

  const mountedEntries = items.map((item,index)=>({item,index})).filter(({item})=>item.rackMounted!==false&&(item.rackId??1)===1);
  const unrackedEntries = items.map((item,index)=>({item,index})).filter(({item})=>item.rackMounted===false);
  const totalRU = mountedEntries.reduce((s,{item})=>s+item.ru,0);
  const maxRU = rackRUCapacity ?? totalRU;
  const defaultRackStarts = new Map<number,number>();
  let defaultTopRU = totalRU;
  mountedEntries.forEach(({item,index})=>{
    defaultRackStarts.set(index,Math.max(1,defaultTopRU-item.ru+1));
    defaultTopRU -= item.ru;
  });
  const rackStartFor = (item: RackItem,index: number) => item.rackStartRU ?? defaultRackStarts.get(index) ?? 1;
  const highestOccupiedRU = mountedEntries.reduce((highest,{item,index})=>Math.max(highest,rackStartFor(item,index)+item.ru-1),0);
  const displayRU = Math.max(maxRU,highestOccupiedRU,totalRU);
  const ruH = 21;
  const rackW = 340;

  // Marquee multi-select on the rack elevation (AutoCAD-style):
  // L→R drag = window (rows fully inside), R→L = crossing (rows touched)
  const [selectedIdxs, setSelectedIdxs] = useState<Set<number>>(new Set());
  const [marquee, setMarquee] = useState<{sx:number;sy:number;cx:number;cy:number}|null>(null);
  const [draggedRackIndex, setDraggedRackIndex] = useState<number|null>(null);
  const [rackDropStartRU, setRackDropStartRU] = useState<number|null>(null);
  const [hoveredRackIndex, setHoveredRackIndex] = useState<number|null>(null);
  const [hoveredUnrackedIndex, setHoveredUnrackedIndex] = useState<number|null>(null);
  const rackRef = useRef<HTMLDivElement>(null);
  const rackDragOffsetY = useRef(0);
  const unrackedAreaRef = useRef<HTMLDivElement>(null);
  const unrackedDidDrag = useRef(false);
  const mountedEntriesRef = useRef(mountedEntries);
  mountedEntriesRef.current = mountedEntries;
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
        mountedEntriesRef.current.forEach(({item,index}) => {
          const h = item.ru * ruH;
          const startRU = item.rackStartRU ?? defaultRackStarts.get(index) ?? 1;
          const top = (displayRU-(startRU+item.ru-1))*ruH;
          const xOverlap = !(width < x1 || 0 > x2);
          const hit = isWindow
            ? xOverlap && top >= y1 && top + h <= y2   // window: row fully inside vertically
            : xOverlap && !(top + h < y1 || top > y2); // crossing: row touched
          if (hit) hits.add(index);
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

  const getRackDropStart = (clientY: number, itemIndex: number) => {
    const rack = rackRef.current;
    const item = items[itemIndex];
    if (!rack || !item) return null;
    const rect = rack.getBoundingClientRect();
    const maxStart = Math.max(1,displayRU-item.ru+1);
    const top = Math.max(0,Math.min(clientY-rect.top-rackDragOffsetY.current,displayRU*ruH-item.ru*ruH));
    const requested = Math.max(1,Math.min(maxStart,Math.round((displayRU*ruH-top-item.ru*ruH)/ruH)+1));
    const occupied = mountedEntries
      .filter(({index})=>index!==itemIndex)
      .map(({item:other,index})=>({start:rackStartFor(other,index),end:rackStartFor(other,index)+other.ru-1}));
    const candidates = Array.from({length:maxStart},(_,i)=>i+1).sort((a,b)=>Math.abs(a-requested)-Math.abs(b-requested));
    return candidates.find(start=>occupied.every(range=>start+item.ru-1<range.start||start>range.end)) ?? null;
  };

  const moveRackItemToRU = (itemIndex: number, startRU: number) => {
    setItems(prev=>prev.map((item,index)=>index===itemIndex?{...item,rackId:1,rackStartRU:startRU}:item));
    setEditingIdx(null);
    setSelectedIdxs(new Set());
  };

  const getDropStartForRack = (clientY:number,itemIndex:number,rackNumber:number,rackElement:HTMLElement,capacity:number) => {
    const item=items[itemIndex];
    if(!item)return null;
    const rackItems=items.map((entry,index)=>({item:entry,index})).filter(({item:entry,index})=>entry.rackMounted!==false&&(entry.rackId??1)===rackNumber&&index!==itemIndex);
    const highest=rackItems.reduce((value,{item:entry})=>Math.max(value,(entry.rackStartRU??1)+entry.ru-1),0);
    const rackRU=Math.max(capacity,highest,item.ru);
    const rect=rackElement.getBoundingClientRect();
    const maxStart=Math.max(1,rackRU-item.ru+1);
    const top=Math.max(0,Math.min(clientY-rect.top-rackDragOffsetY.current,rackRU*ruH-item.ru*ruH));
    const requested=Math.max(1,Math.min(maxStart,Math.round((rackRU*ruH-top-item.ru*ruH)/ruH)+1));
    const occupied=rackItems.map(({item:entry})=>({start:entry.rackStartRU??1,end:(entry.rackStartRU??1)+entry.ru-1}));
    return Array.from({length:maxStart},(_,index)=>index+1).sort((a,b)=>Math.abs(a-requested)-Math.abs(b-requested)).find(start=>occupied.every(range=>start+item.ru-1<range.start||start>range.end))??null;
  };

  const startUnrackedDrag = (e: React.MouseEvent, itemIndex: number, defaultY: number) => {
    if (e.button !== 0) return;
    const area = unrackedAreaRef.current;
    if (!area) return;
    e.preventDefault();
    e.stopPropagation();
    const item = items[itemIndex];
    const startX = e.clientX;
    const startY = e.clientY;
    const originX = item.unrackedX ?? 0;
    const originY = item.unrackedY ?? defaultY;
    unrackedDidDrag.current = false;
    setEditingIdx(itemIndex);
    const onMove = (me: MouseEvent) => {
      const dx = me.clientX - startX;
      const dy = me.clientY - startY;
      if (Math.abs(dx)>3 || Math.abs(dy)>3) unrackedDidDrag.current = true;
      const x = Math.max(0, Math.min(originX + dx, area.clientWidth - 240));
      const y = Math.max(0, Math.min(originY + dy, area.clientHeight - 50));
      setItems(prev=>prev.map((entry,index)=>index===itemIndex?{...entry,unrackedX:x,unrackedY:y}:entry));
    };
    const onUp = () => {
      window.removeEventListener("mousemove",onMove);
      window.removeEventListener("mouseup",onUp);
    };
    window.addEventListener("mousemove",onMove);
    window.addEventListener("mouseup",onUp);
  };

  return (
    <div className="animate-fade-in flex" style={{minHeight:"calc(100vh - 157px)"}}>
      {/* Main content */}
      <div style={{flex:1,padding:24,overflowY:"auto"}}>
      {/* Full-width command bar, matching Signal Flow and Room Designer */}
      <div style={{background:"rgb(var(--forge-panel))",borderBottom:"2px solid rgb(var(--border))",margin:"-24px -24px 20px",paddingLeft:4,paddingRight:12,userSelect:"none"}}>
        <div style={{display:"flex",alignItems:"stretch",height:82}}>
          <div style={{display:"flex",flexDirection:"column",justifyContent:"space-between",padding:"5px 6px 0"}}>
            <div style={{display:"flex",gap:2,flex:1,alignItems:"stretch"}}>
              <button onClick={()=>setShowAddEquipment(true)} title="Add equipment to rack"
                style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,padding:"4px 12px",background:"transparent",border:"1px solid transparent",borderRadius:4,cursor:"pointer",transition:"all 0.15s",minWidth:58}}
                onMouseEnter={e=>{e.currentTarget.style.background="rgb(var(--forge-surface))";e.currentTarget.style.borderColor="rgb(var(--border))"}}
                onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.borderColor="transparent"}}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--text-subtle))" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="3" width="7" height="18" rx="1"/><rect x="13" y="7" width="7" height="14" rx="1"/><line x1="6.5" y1="7" x2="8.5" y2="7"/><line x1="15.5" y1="11" x2="17.5" y2="11"/>
                </svg>
                <span style={{fontSize:9,color:"rgb(var(--text-subtle))",lineHeight:1.2,whiteSpace:"nowrap",textAlign:"center"}}>Add<br/>Equipment</span>
              </button>
              <button onClick={()=>{setRackCount(count=>count+1);setAdditionalRackRUCapacities(capacities=>[...capacities,Math.max(1,rackRUCapacity??totalRU)]);}} title="Add another equipment rack"
                style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,padding:"4px 12px",background:"transparent",border:"1px solid transparent",borderRadius:4,cursor:"pointer",transition:"all 0.15s",minWidth:58}}
                onMouseEnter={e=>{e.currentTarget.style.background="rgb(var(--forge-surface))";e.currentTarget.style.borderColor="rgb(var(--border))"}}
                onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.borderColor="transparent"}}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--text-subtle))" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="3" width="11" height="18" rx="1"/><line x1="8" y1="7" x2="13" y2="7"/><line x1="8" y1="11" x2="13" y2="11"/><circle cx="18" cy="17" r="4" fill="rgb(var(--forge-panel))"/><line x1="18" y1="15" x2="18" y2="19"/><line x1="16" y1="17" x2="20" y2="17"/>
                </svg>
                <span style={{fontSize:9,color:"rgb(var(--text-subtle))",lineHeight:1.2,whiteSpace:"nowrap",textAlign:"center"}}>Add<br/>Rack</span>
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
        {/* Rack Visualization */}
        <div className="flex-1 overflow-x-auto" style={{position:"relative",left:120,width:"min(100%, 840px)",margin:"0 auto"}}>
          <div ref={rackAreaRef} style={{position:"relative",width:rackW+60}}>
            <div style={{width:rackW+60,display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:10}}>
              <span style={{fontSize:11,fontWeight:600,color:"rgb(var(--text-muted))"}}>RUs</span>
              <input id="rack-ru-capacity" type="number" min={0} max={100} value={rackRUCapacity??totalRU}
                aria-label="Rack units"
                onChange={e=>setRackRUCapacity(e.target.value===""?null:Math.max(0,Math.min(100,Math.floor(Number(e.target.value)||0))))}
                style={{width:58,height:28,padding:"0 6px",background:"rgb(var(--forge-surface))",border:"1px solid rgb(var(--border))",borderRadius:4,color:"rgb(var(--text-body))",fontSize:11,fontFamily:"'JetBrains Mono',monospace",textAlign:"center",outline:"none"}}/>
            </div>
            {/* Rack frame */}
            <div style={{width:rackW+60,background:"rgb(var(--forge-surface))",borderRadius:6,border:"2px solid rgb(var(--border))",padding:"6px 0",boxShadow:"0 4px 20px rgba(0,0,0,0.15),inset 0 0 30px rgba(0,0,0,0.05)"}}>
              {/* Top plate */}
              <div style={{height:8,margin:"0 8px 4px",background:"linear-gradient(180deg,rgb(var(--border)),rgb(var(--forge-surface)))",borderRadius:"3px 3px 0 0",border:"1px solid rgb(var(--border))"}} />

              {/* Rack units container */}
              <div ref={rackRef} onMouseDown={startRackMarquee}
                onDragOver={e=>{if(draggedRackIndex===null)return;e.preventDefault();e.dataTransfer.dropEffect="move";setRackDropStartRU(getRackDropStart(e.clientY,draggedRackIndex));}}
                onDrop={e=>{e.preventDefault();if(draggedRackIndex!==null){const start=getRackDropStart(e.clientY,draggedRackIndex);if(start!==null)moveRackItemToRU(draggedRackIndex,start);}setDraggedRackIndex(null);setRackDropStartRU(null);}}
                style={{position:"relative",minHeight:displayRU*ruH,margin:"0 8px",userSelect:"none",cursor:marquee?"crosshair":"default"}}>
                {(()=>{
                  let cursorRU = displayRU;
                  const elements: React.ReactNode[] = [];
                  const pushEmpty = (count:number,key:string) => {
                    if(count<=0)return;
                    elements.push(
                      <div key={key} style={{display:"flex",height:count*ruH,opacity:0.4}}>
                        <div style={{width:26,background:"rgb(var(--forge-panel))",borderLeft:"2px solid rgb(var(--border))",borderRight:"1px solid rgb(var(--border))",display:"flex",flexDirection:"column",justifyContent:"flex-start"}}>
                          {Array.from({length:count},(_,r)=><div key={r} style={{fontSize:7,color:"rgb(var(--text-faint))",fontFamily:"'JetBrains Mono',monospace",lineHeight:ruH+"px",textAlign:"center"}}>{cursorRU-r}</div>)}
                        </div>
                        <div style={{flex:1,border:"1px dashed rgb(var(--border))",display:"flex",alignItems:"center",justifyContent:"center",background:"rgb(var(--forge-surface) / 0.15)"}}>
                          {count>=3&&<span style={{fontSize:10,color:"rgb(var(--text-faint))"}}>{count} RU available</span>}
                        </div>
                        <div style={{width:26,background:"rgb(var(--forge-panel))",borderRight:"2px solid rgb(var(--border))",borderLeft:"1px solid rgb(var(--border))",display:"flex",flexDirection:"column",justifyContent:"flex-start"}}>
                          {Array.from({length:count},(_,r)=><div key={r} style={{fontSize:7,color:"rgb(var(--text-faint))",fontFamily:"'JetBrains Mono',monospace",lineHeight:ruH+"px",textAlign:"center"}}>{cursorRU-r}</div>)}
                        </div>
                      </div>
                    );
                    cursorRU-=count;
                  };
                  [...mountedEntries].sort((a,b)=>(rackStartFor(b.item,b.index)+b.item.ru)-(rackStartFor(a.item,a.index)+a.item.ru)).forEach(({item,index:i}) => {
                    const startRU=rackStartFor(item,i);
                    pushEmpty(cursorRU-(startRU+item.ru-1),"gap-"+i);
                    const h = item.ru * ruH;
                    elements.push(
                      <div key={"item-"+i}
                        draggable
                        onMouseDown={e=>e.stopPropagation()}
                        onMouseEnter={()=>setHoveredRackIndex(i)}
                        onMouseLeave={()=>setHoveredRackIndex(prev=>prev===i?null:prev)}
                        onDragStart={e=>{const rect=e.currentTarget.getBoundingClientRect();rackDragOffsetY.current=e.clientY-rect.top;e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("text/plain",String(i));setDraggedRackIndex(i);setEditingIdx(null);}}
                        onDragEnd={()=>{setDraggedRackIndex(null);setRackDropStartRU(null);}}
                        style={{display:"flex",alignItems:"stretch",height:h,outline:selectedIdxs.has(i)?"2px solid #8b5cf6":undefined,outlineOffset:-1,position:"relative",zIndex:selectedIdxs.has(i)?2:undefined,opacity:draggedRackIndex===i?0.45:1,cursor:draggedRackIndex===i?"grabbing":"grab",boxShadow:rackDropStartRU!==null&&draggedRackIndex===i?"0 0 0 2px #8b5cf6":undefined}}>
                        {/* Left rail with RU numbers */}
                        <div style={{width:26,display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",background:"rgb(var(--forge-panel))",borderLeft:"2px solid rgb(var(--border))",borderRight:"1px solid rgb(var(--border))"}}>
                          {Array.from({length:item.ru},(_,r)=>(
                            <div key={r} style={{fontSize:7,color:"rgb(var(--text-subtle))",fontFamily:"'JetBrains Mono',monospace",lineHeight:ruH+"px",textAlign:"center"}}>{startRU+item.ru-1-r}</div>
                          ))}
                        </div>

                        {/* Device faceplate */}
                        <div onClick={()=>{if(didMarqueeDrag.current){didMarqueeDrag.current=false;return;}setEditingIdx(editingIdx===i?null:i);}} style={{flex:1,background:`linear-gradient(180deg, ${item.color}18 0%, ${item.color}08 100%)`,border:"1px solid "+item.color+"44",borderLeft:"none",borderRight:"none",display:"flex",alignItems:"center",padding:"0 12px",gap:8,cursor:"inherit",position:"relative",overflow:"hidden",transition:"all 0.15s",outline:editingIdx===i?"1px solid "+item.color+"88":"none"}}>
                          {/* Device label */}
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:item.ru>=2?11:10,color:"rgb(var(--text-body))",fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{item.name}</div>
                            {item.ru>=2 && <div style={{fontSize:8,color:item.color,opacity:0.7,marginTop:1}}>{item.ru}U</div>}
                          </div>

                          {hoveredRackIndex===i && (
                            <button draggable={false} aria-label={`Delete ${item.name}`} title="Delete equipment"
                              onMouseDown={e=>{e.preventDefault();e.stopPropagation();}}
                              onClick={e=>{e.preventDefault();e.stopPropagation();setItems(prev=>prev.filter((_,index)=>index!==i));setHoveredRackIndex(null);setEditingIdx(null);setSelectedIdxs(new Set());}}
                              style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",zIndex:3,width:18,height:18,padding:0,display:"flex",alignItems:"center",justifyContent:"center",border:"1px solid rgba(239,68,68,0.45)",borderRadius:4,background:"rgb(var(--forge-panel))",color:"#ef4444",fontSize:15,lineHeight:1,cursor:"pointer",boxShadow:"0 1px 4px rgba(0,0,0,0.18)"}}>×</button>
                          )}

                        </div>

                        {/* Right rail with RU numbers */}
                        <div style={{width:26,display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",background:"rgb(var(--forge-panel))",borderRight:"2px solid rgb(var(--border))",borderLeft:"1px solid rgb(var(--border))"}}>
                          {Array.from({length:item.ru},(_,r)=><div key={r} style={{fontSize:7,color:"rgb(var(--text-subtle))",fontFamily:"'JetBrains Mono',monospace",lineHeight:ruH+"px",textAlign:"center"}}>{startRU+item.ru-1-r}</div>)}
                        </div>

                      </div>
                    );
                    cursorRU=startRU-1;
                  });
                  pushEmpty(cursorRU,"gap-bottom");
                  return elements;
                })()}
                {rackDropStartRU!==null&&draggedRackIndex!==null&&(
                  <div style={{position:"absolute",zIndex:6,left:26,right:26,top:(displayRU-(rackDropStartRU+items[draggedRackIndex].ru-1))*ruH,height:items[draggedRackIndex].ru*ruH,border:"2px solid #8b5cf6",background:"rgba(139,92,246,0.12)",pointerEvents:"none"}} />
                )}
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
              <div style={{fontSize:14,fontWeight:600,color:"rgb(var(--text-muted))",letterSpacing:"0.04em"}}>Equipment Rack 1</div>
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
          {Array.from({length:rackCount-1},(_,rackOffset)=>{
            const rackNumber=rackOffset+2;
            const emptyRackRU=Math.max(1,additionalRackRUCapacities[rackOffset]??displayRU);
            const rackEntries=items.map((item,index)=>({item,index})).filter(({item})=>item.rackMounted!==false&&(item.rackId??1)===rackNumber);
            const rackHighestRU=rackEntries.reduce((highest,{item})=>Math.max(highest,(item.rackStartRU??1)+item.ru-1),0);
            const rackDisplayRU=Math.max(emptyRackRU,rackHighestRU);
            return <div key={`rack-${rackNumber}`} onMouseEnter={()=>setHoveredRackNumber(rackNumber)} onMouseLeave={()=>setHoveredRackNumber(prev=>prev===rackNumber?null:prev)} style={{position:"relative",width:rackW+60,marginTop:48}}>
              {hoveredRackNumber===rackNumber&&<button aria-label={`Delete Equipment Rack ${rackNumber}`} title={`Delete Equipment Rack ${rackNumber}`}
                onClick={()=>{setItems(current=>current.map(item=>(item.rackId??1)===rackNumber?{...item,rackMounted:false,rackId:undefined}:item.rackId&&item.rackId>rackNumber?{...item,rackId:item.rackId-1}:item));setRackCount(count=>Math.max(1,count-1));setAdditionalRackRUCapacities(capacities=>capacities.filter((_,index)=>index!==rackOffset));setHoveredRackNumber(null);}}
                style={{position:"absolute",right:8,top:42,zIndex:8,width:22,height:22,padding:0,display:"flex",alignItems:"center",justifyContent:"center",border:"1px solid rgba(239,68,68,0.5)",borderRadius:4,background:"rgb(var(--forge-panel))",color:"#ef4444",fontSize:17,lineHeight:1,cursor:"pointer",boxShadow:"0 2px 6px rgba(0,0,0,0.2)"}}>×</button>}
              <div style={{width:rackW+60,height:28,display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:10}}>
                <span style={{fontSize:11,fontWeight:600,color:"rgb(var(--text-muted))"}}>RUs</span>
                <input type="number" min={1} max={100} value={emptyRackRU} aria-label={`Equipment Rack ${rackNumber} rack units`}
                  onChange={e=>{const value=Math.max(1,Math.min(100,Math.floor(Number(e.target.value)||1)));setAdditionalRackRUCapacities(capacities=>capacities.map((capacity,index)=>index===rackOffset?value:capacity));}}
                  style={{width:58,height:28,padding:"0 6px",background:"rgb(var(--forge-surface))",border:"1px solid rgb(var(--border))",borderRadius:4,color:"rgb(var(--text-body))",fontSize:11,fontFamily:"'JetBrains Mono',monospace",textAlign:"center",outline:"none"}} />
              </div>
              <div style={{width:rackW+60,background:"rgb(var(--forge-surface))",borderRadius:6,border:"2px solid rgb(var(--border))",padding:"6px 0",boxShadow:"0 4px 20px rgba(0,0,0,0.15),inset 0 0 30px rgba(0,0,0,0.05)"}}>
                <div style={{height:8,margin:"0 8px 4px",background:"linear-gradient(180deg,rgb(var(--border)),rgb(var(--forge-surface)))",borderRadius:"3px 3px 0 0",border:"1px solid rgb(var(--border))"}} />
                <div onDragOver={e=>{if(draggedRackIndex!==null){e.preventDefault();e.dataTransfer.dropEffect="move";}}}
                  onDrop={e=>{e.preventDefault();if(draggedRackIndex!==null){const start=getDropStartForRack(e.clientY,draggedRackIndex,rackNumber,e.currentTarget,rackDisplayRU);if(start!==null)setItems(current=>current.map((item,index)=>index===draggedRackIndex?{...item,rackMounted:true,rackId:rackNumber,rackStartRU:start}:item));}setDraggedRackIndex(null);setRackDropStartRU(null);}}
                  style={{position:"relative",height:rackDisplayRU*ruH,margin:"0 8px",userSelect:"none"}}>
                  {["left","right"].map(side=><div key={side} style={{position:"absolute",zIndex:3,top:0,bottom:0,[side]:0,width:26,background:"rgb(var(--forge-panel))",borderLeft:side==="left"?"2px solid rgb(var(--border))":"1px solid rgb(var(--border))",borderRight:side==="right"?"2px solid rgb(var(--border))":"1px solid rgb(var(--border))"}}>
                    {Array.from({length:rackDisplayRU},(_,r)=><div key={r} style={{height:ruH,fontSize:7,color:"rgb(var(--text-faint))",fontFamily:"'JetBrains Mono',monospace",lineHeight:ruH+"px",textAlign:"center"}}>{rackDisplayRU-r}</div>)}
                  </div>)}
                  <div style={{position:"absolute",left:26,right:26,top:0,bottom:0,border:"1px dashed rgb(var(--border))",background:`repeating-linear-gradient(to bottom,transparent 0,transparent ${ruH-1}px,rgb(var(--border) / 0.45) ${ruH-1}px,rgb(var(--border) / 0.45) ${ruH}px)`,opacity:0.4}} />
                  {rackEntries.length===0&&<span style={{position:"absolute",left:26,right:26,top:"45%",textAlign:"center",fontSize:10,color:"rgb(var(--text-faint))"}}>{rackDisplayRU} RU available</span>}
                  {rackEntries.map(({item,index})=><div key={`rack-${rackNumber}-item-${index}`} draggable
                    onMouseEnter={()=>setHoveredRackIndex(index)} onMouseLeave={()=>setHoveredRackIndex(previous=>previous===index?null:previous)}
                    onDragStart={e=>{const rect=e.currentTarget.getBoundingClientRect();rackDragOffsetY.current=e.clientY-rect.top;e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("text/plain",String(index));setDraggedRackIndex(index);}}
                    onDragEnd={()=>setDraggedRackIndex(null)}
                    style={{position:"absolute",zIndex:4,left:26,right:26,bottom:((item.rackStartRU??1)-1)*ruH,height:item.ru*ruH,display:"flex",alignItems:"center",padding:"0 12px",background:`linear-gradient(180deg, ${item.color}18 0%, ${item.color}08 100%)`,border:"1px solid "+item.color+"44",cursor:"grab",opacity:draggedRackIndex===index?0.45:1,overflow:"hidden"}}>
                    <div style={{flex:1,minWidth:0}}><div style={{fontSize:item.ru>=2?11:10,color:"rgb(var(--text-body))",fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{item.name}</div>{item.ru>=2&&<div style={{fontSize:8,color:item.color,opacity:0.7}}>{item.ru}U</div>}</div>
                    {hoveredRackIndex===index&&<button draggable={false} aria-label={`Delete ${item.name}`} title="Delete equipment" onMouseDown={e=>{e.preventDefault();e.stopPropagation();}} onClick={e=>{e.preventDefault();e.stopPropagation();setItems(current=>current.filter((_,itemIndex)=>itemIndex!==index));setHoveredRackIndex(null);}} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",zIndex:5,width:18,height:18,padding:0,display:"flex",alignItems:"center",justifyContent:"center",border:"1px solid rgba(239,68,68,0.45)",borderRadius:4,background:"rgb(var(--forge-panel))",color:"#ef4444",fontSize:15,lineHeight:1,cursor:"pointer"}}>×</button>}
                  </div>)}
                </div>
                <div style={{height:8,margin:"4px 8px 0",background:"linear-gradient(0deg,rgb(var(--border)),rgb(var(--forge-surface)))",borderRadius:"0 0 3px 3px",border:"1px solid rgb(var(--border))"}} />
              </div>
              <div style={{textAlign:"center",marginTop:8,fontSize:14,fontWeight:600,color:"rgb(var(--text-muted))",letterSpacing:"0.04em"}}>Equipment Rack {rackNumber}</div>
            </div>;
          })}
          {unrackedEntries.length > 0 && (
            <div ref={unrackedAreaRef} style={{position:"absolute",left:rackW+80,top:38,width:420,minHeight:790}}>
              {unrackedEntries.map(({item,index},unrackedIndex) => (
                <div key={"unracked-"+index}
                  onMouseDown={e=>startUnrackedDrag(e,index,unrackedIndex*58)}
                  onMouseEnter={()=>setHoveredUnrackedIndex(index)}
                  onMouseLeave={()=>setHoveredUnrackedIndex(prev=>prev===index?null:prev)}
                  onClick={()=>{if(unrackedDidDrag.current){unrackedDidDrag.current=false;return;}setEditingIdx(editingIdx===index?null:index);}}
                  style={{position:"absolute",left:item.unrackedX??0,top:item.unrackedY??unrackedIndex*58,width:240,height:50,display:"flex",alignItems:"center",padding:"0 36px 0 14px",background:"rgb(var(--forge-surface))",border:"1px solid rgb(var(--border))",borderRadius:4,cursor:"grab",userSelect:"none",outline:editingIdx===index?"2px solid #8b5cf6":undefined,outlineOffset:-1,zIndex:editingIdx===index?2:1,boxShadow:editingIdx===index?"0 4px 14px rgba(0,0,0,0.12)":undefined}}>
                  <span style={{display:"block",width:"100%",fontSize:11,fontWeight:600,color:"rgb(var(--text-body))",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{item.name}</span>
                  {hoveredUnrackedIndex===index && (
                    <button aria-label={`Delete ${item.name}`} title="Delete equipment"
                      onMouseDown={e=>{e.preventDefault();e.stopPropagation();}}
                      onClick={e=>{e.preventDefault();e.stopPropagation();setItems(prev=>prev.filter((_,itemIndex)=>itemIndex!==index));setHoveredUnrackedIndex(null);setEditingIdx(null);}}
                      style={{position:"absolute",right:9,top:"50%",transform:"translateY(-50%)",width:20,height:20,padding:0,display:"flex",alignItems:"center",justifyContent:"center",border:"1px solid rgba(239,68,68,0.45)",borderRadius:4,background:"rgb(var(--forge-panel))",color:"#ef4444",fontSize:16,lineHeight:1,cursor:"pointer",boxShadow:"0 1px 4px rgba(0,0,0,0.15)"}}>×</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      </div>{/* end main content */}

      {showAddEquipment && (
        <div onMouseDown={e=>{if(e.target===e.currentTarget)closeAddEquipment();}} style={{position:"fixed",inset:0,zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(2,6,23,0.62)",padding:20}}>
          <div role="dialog" aria-modal="true" aria-labelledby="rack-add-equipment-title" style={{width:"min(700px,100%)",background:"rgb(var(--forge-panel))",border:"1px solid rgb(var(--border))",borderRadius:12,boxShadow:"0 24px 70px rgba(0,0,0,0.38)",overflow:"hidden"}}>
            <div style={{padding:"22px 24px 14px"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
                <div id="rack-add-equipment-title" style={{display:"flex",alignItems:"center",gap:10,fontSize:20,fontWeight:700,color:"rgb(var(--text-body))"}}>
                  <span style={{width:18,height:18,border:"2px solid currentColor",borderRadius:3,display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:15,lineHeight:1}}>+</span>
                  Add Equipment
                </div>
                <button onClick={closeAddEquipment} aria-label="Close" style={{background:"none",border:"none",color:"rgb(var(--text-subtle))",fontSize:24,cursor:"pointer",padding:4,lineHeight:1}}>×</button>
              </div>

              <div style={{display:"flex",height:48,border:"1px solid rgb(var(--border))",borderRadius:7,overflow:"hidden",background:"rgb(var(--forge-surface))"}}>
                <input autoFocus value={equipmentSearch} onChange={e=>{setEquipmentSearch(e.target.value);setSelectedProduct(null);}} placeholder="Search by Make, Model, Part#..." style={{flex:1,minWidth:0,border:"none",outline:"none",background:"transparent",padding:"0 16px",fontSize:14,color:"rgb(var(--text-body))"}}/>
                <div style={{width:52,borderLeft:"1px solid rgb(var(--border))",display:"flex",alignItems:"center",justifyContent:"center",color:"rgb(var(--text-subtle))"}}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
                </div>
              </div>

              {(equipmentSearch.trim() || equipmentLoading) && (
                <div style={{marginTop:8,maxHeight:190,overflowY:"auto",border:"1px solid rgb(var(--border))",borderRadius:7,background:"rgb(var(--forge-surface))"}}>
                  {equipmentLoading ? <div style={{padding:14,fontSize:12,color:"rgb(var(--text-subtle))"}}>Searching equipment library…</div> : equipmentResults.length===0 ? <div style={{padding:14,fontSize:12,color:"rgb(var(--text-subtle))"}}>No library equipment found. Create a new item below.</div> : equipmentResults.map(product => {
                    const active = selectedProduct?.id===product.id;
                    return <button key={product.id} onClick={()=>setSelectedProduct(product)} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,padding:"10px 12px",background:active?"rgba(139,92,246,0.12)":"transparent",border:"none",borderBottom:"1px solid rgb(var(--border))",color:"rgb(var(--text-body))",cursor:"pointer",textAlign:"left"}}>
                      <span><strong style={{fontSize:13}}>{product.manufacturer} {product.model_name}</strong><span style={{display:"block",fontSize:11,color:"rgb(var(--text-subtle))",marginTop:2}}>{product.type}</span></span>
                      <span style={{fontSize:11,color:"#8b5cf6",fontFamily:"'JetBrains Mono',monospace",whiteSpace:"nowrap"}}>{product.rack_units?`${product.rack_units}U`:"1U"}</span>
                    </button>;
                  })}
                </div>
              )}

              <div style={{display:"flex",alignItems:"center",gap:16,margin:"24px 0 16px",color:"rgb(var(--text-subtle))",fontSize:11,fontWeight:700,letterSpacing:"0.08em"}}>
                <span style={{height:1,background:"rgb(var(--border))",flex:1}}/><span>OR CREATE NEW</span><span style={{height:1,background:"rgb(var(--border))",flex:1}}/>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1.8fr 1fr 1fr",gap:12}}>
                <input value={newDescription} onChange={e=>{setNewDescription(e.target.value);setSelectedProduct(null);}} placeholder="Description" style={{height:48,padding:"0 14px",border:"1px solid rgb(var(--border))",borderRadius:7,outline:"none",background:"rgb(var(--forge-surface))",color:"rgb(var(--text-body))",fontSize:14,minWidth:0}}/>
                <input value={newMake} onChange={e=>{setNewMake(e.target.value);setSelectedProduct(null);}} placeholder="Make" style={{height:48,padding:"0 14px",border:"1px solid rgb(var(--border))",borderRadius:7,outline:"none",background:"rgb(var(--forge-surface))",color:"rgb(var(--text-body))",fontSize:14,minWidth:0}}/>
                <input value={newModel} onChange={e=>{setNewModel(e.target.value);setSelectedProduct(null);}} placeholder="Model" style={{height:48,padding:"0 14px",border:"1px solid rgb(var(--border))",borderRadius:7,outline:"none",background:"rgb(var(--forge-surface))",color:"rgb(var(--text-body))",fontSize:14,minWidth:0}}/>
              </div>
            </div>
            <div style={{display:"flex",justifyContent:"flex-end",gap:12,padding:"16px 24px",borderTop:"1px solid rgb(var(--border))"}}>
              <button onClick={closeAddEquipment} style={{padding:"10px 22px",border:"1px solid rgb(var(--border))",borderRadius:7,background:"transparent",color:"rgb(var(--text-body))",fontSize:14,cursor:"pointer"}}>Cancel</button>
              <button onClick={addEquipment} disabled={!selectedProduct&&!newDescription.trim()&&!newMake.trim()&&!newModel.trim()} style={{padding:"10px 24px",border:"1px solid "+(selectedProduct||newDescription.trim()||newMake.trim()||newModel.trim()?"#8b5cf6":"rgb(var(--border))"),borderRadius:7,background:selectedProduct||newDescription.trim()||newMake.trim()||newModel.trim()?"#8b5cf6":"rgb(var(--forge-surface))",color:selectedProduct||newDescription.trim()||newMake.trim()||newModel.trim()?"#fff":"rgb(var(--text-subtle))",fontSize:14,fontWeight:600,cursor:selectedProduct||newDescription.trim()||newMake.trim()||newModel.trim()?"pointer":"not-allowed"}}>+ Add</button>
            </div>
          </div>
        </div>
      )}

      {pendingRackItem && (
        <div style={{position:"fixed",inset:0,zIndex:110,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(2,6,23,0.62)",padding:20}}>
          <div role="alertdialog" aria-modal="true" aria-labelledby="rack-confirm-title" style={{width:"min(430px,100%)",background:"rgb(var(--forge-panel))",border:"1px solid rgb(var(--border))",borderRadius:12,boxShadow:"0 24px 70px rgba(0,0,0,0.4)",overflow:"hidden"}}>
            <div style={{padding:"24px 24px 20px"}}>
              <div id="rack-confirm-title" style={{fontSize:20,fontWeight:700,color:"rgb(var(--text-body))",marginBottom:10}}>Add this to Rack?</div>
              <div style={{fontSize:14,color:"rgb(var(--text-subtle))",lineHeight:1.5}}>
                Add <strong style={{color:"rgb(var(--text-body))"}}>{pendingRackItem.name}</strong> to the rack elevation?
              </div>
              <div style={{marginTop:12,display:"inline-flex",alignItems:"center",gap:6,padding:"5px 9px",borderRadius:5,background:"rgb(var(--forge-surface))",border:"1px solid rgb(var(--border))",fontSize:12,color:"rgb(var(--text-subtle))"}}>
                Rack space: <strong style={{color:"#8b5cf6"}}>{pendingRackItem.ru}U</strong>
              </div>
            </div>
            <div style={{display:"flex",justifyContent:"flex-end",gap:12,padding:"16px 24px",borderTop:"1px solid rgb(var(--border))"}}>
              <button onClick={()=>{setItems(prev=>[...prev,{...pendingRackItem,rackMounted:false}]);setPendingRackItem(null);}} style={{minWidth:92,padding:"10px 22px",border:"1px solid rgb(var(--border))",borderRadius:7,background:"transparent",color:"rgb(var(--text-body))",fontSize:14,cursor:"pointer"}}>No</button>
              <button autoFocus onClick={()=>{setItems(prev=>{
                const mounted=prev.filter(item=>item.rackMounted!==false);
                const occupied=mounted.map((item,index)=>{const start=item.rackStartRU??mounted.slice(index+1).reduce((sum,other)=>sum+other.ru,1);return {start,end:start+item.ru-1};});
                const limit=Math.max(rackRUCapacity??0,mounted.reduce((sum,item)=>sum+item.ru,0)+pendingRackItem.ru);
                const rackStartRU=Array.from({length:Math.max(1,limit-pendingRackItem.ru+1)},(_,i)=>i+1).find(start=>occupied.every(range=>start+pendingRackItem.ru-1<range.start||start>range.end))??1;
                return [...prev,{...pendingRackItem,rackMounted:true,rackId:1,rackStartRU}];
              });setPendingRackItem(null);}} style={{minWidth:92,padding:"10px 22px",border:"1px solid #8b5cf6",borderRadius:7,background:"#8b5cf6",color:"#fff",fontSize:14,fontWeight:600,cursor:"pointer"}}>Yes</button>
            </div>
          </div>
        </div>
      )}

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
