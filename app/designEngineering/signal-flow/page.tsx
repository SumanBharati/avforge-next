'use client';
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { loadToolData, saveToolData } from "@/lib/tool-data";
import { searchProducts } from "@/lib/av-products";
import { useBOM } from "@/lib/bom-context";
import BOMPanel from "@/components/BOMPanel";

const SIGNAL_TYPES = [
  {id:"hdmi",name:"HDMI",color:"#3b82f6"},
  {id:"dante",name:"Dante",color:"#22c55e"},
  {id:"usb",name:"USB",color:"#a855f7"},
  {id:"cat6",name:"Cat6/HDBaseT",color:"#f59e0b"},
  {id:"analog",name:"Analog Audio",color:"#ef4444"},
  {id:"speaker",name:"Speaker Wire",color:"#f97316"},
  {id:"control",name:"Control/RS232",color:"rgb(var(--text-subtle))"},
  {id:"fiber",name:"Fiber",color:"#06b6d4"},
  {id:"sdi",name:"SDI",color:"#ec4899"},
];

const DEVICE_LIBRARY = [
  {cat:"Sources",items:[
    {type:"Laptop",mfr:"Generic",model:"—",price:0,w:120,h:56,color:"#3b82f6",ports:[{side:"right",signal:"hdmi",dir:"out",label:"HDMI"},{side:"right",signal:"usb",dir:"out",label:"USB"}]},
    {type:"Media Player",mfr:"Generic",model:"—",price:0,w:120,h:56,color:"#3b82f6",ports:[{side:"right",signal:"hdmi",dir:"out",label:"HDMI"}]},
    {type:"Blu-ray Player",mfr:"Generic",model:"—",price:0,w:120,h:56,color:"#3b82f6",ports:[{side:"right",signal:"hdmi",dir:"out",label:"HDMI"}]},
    {type:"Camera (PTZ)",mfr:"Generic",model:"—",price:0,w:120,h:56,color:"#3b82f6",ports:[{side:"right",signal:"hdmi",dir:"out",label:"HDMI"},{side:"right",signal:"sdi",dir:"out",label:"SDI"},{side:"right",signal:"cat6",dir:"out",label:"IP"}]},
    {type:"Extron SMP 111",mfr:"Extron",model:"SMP 111",price:2495,w:130,h:56,color:"#3b82f6",ports:[{side:"left",signal:"hdmi",dir:"in",label:"HDMI In"},{side:"right",signal:"cat6",dir:"out",label:"Stream"}]},
    {type:"Extron ShareLink Pro 2500",mfr:"Extron",model:"ShareLink Pro 2500",price:2195,w:150,h:56,color:"#3b82f6",ports:[{side:"right",signal:"hdmi",dir:"out",label:"HDMI"},{side:"right",signal:"usb",dir:"out",label:"USB"}]},
    {type:"Barco ClickShare CX-50",mfr:"Barco",model:"CX-50 Gen 2",price:3499,w:150,h:56,color:"#3b82f6",ports:[{side:"right",signal:"hdmi",dir:"out",label:"HDMI"},{side:"right",signal:"usb",dir:"out",label:"USB"}]},
  ]},
  {cat:"Displays",items:[
    {type:"Display / TV",mfr:"Generic",model:"—",price:0,w:120,h:56,color:"#8b5cf6",ports:[{side:"left",signal:"hdmi",dir:"in",label:"HDMI"}]},
    {type:"Projector",mfr:"Generic",model:"—",price:0,w:120,h:56,color:"#8b5cf6",ports:[{side:"left",signal:"hdmi",dir:"in",label:"HDMI"},{side:"left",signal:"cat6",dir:"in",label:"HDBaseT"}]},
    {type:"LED Video Wall",mfr:"Generic",model:"—",price:0,w:120,h:56,color:"#8b5cf6",ports:[{side:"left",signal:"hdmi",dir:"in",label:"HDMI"},{side:"left",signal:"cat6",dir:"in",label:"IP"}]},
    {type:"Confidence Monitor",mfr:"Generic",model:"—",price:0,w:130,h:56,color:"#8b5cf6",ports:[{side:"left",signal:"hdmi",dir:"in",label:"HDMI"}]},
  ]},
  {cat:"Extron Switching",items:[
    {type:"Extron DTP3 CrossPoint 642",mfr:"Extron",model:"DTP3 CrossPoint 642",price:0,w:170,h:80,color:"#0e7a3a",ports:[{side:"left",signal:"hdmi",dir:"in",label:"HDMI 1"},{side:"left",signal:"hdmi",dir:"in",label:"HDMI 2"},{side:"left",signal:"cat6",dir:"in",label:"DTP3 In 3"},{side:"left",signal:"cat6",dir:"in",label:"DTP3 In 4"},{side:"right",signal:"hdmi",dir:"out",label:"HDMI Out"},{side:"right",signal:"cat6",dir:"out",label:"DTP3 Out 1"},{side:"right",signal:"cat6",dir:"out",label:"DTP3 Out 2"}]},
    {type:"Extron DTP3 CrossPoint 884",mfr:"Extron",model:"DTP3 CrossPoint 884",price:0,w:170,h:90,color:"#0e7a3a",ports:[{side:"left",signal:"hdmi",dir:"in",label:"HDMI 1-2"},{side:"left",signal:"cat6",dir:"in",label:"DTP3 In 3-4"},{side:"left",signal:"cat6",dir:"in",label:"DTP3 In 5-8"},{side:"right",signal:"hdmi",dir:"out",label:"HDMI Out"},{side:"right",signal:"cat6",dir:"out",label:"DTP3 Out 1-2"},{side:"right",signal:"cat6",dir:"out",label:"DTP3 Out 3-4"},{side:"right",signal:"analog",dir:"out",label:"Audio Out"}]},
    {type:"Extron IN1804",mfr:"Extron",model:"IN1804",price:0,w:140,h:70,color:"#0e7a3a",ports:[{side:"left",signal:"hdmi",dir:"in",label:"HDMI 1"},{side:"left",signal:"hdmi",dir:"in",label:"HDMI 2"},{side:"left",signal:"cat6",dir:"in",label:"DTP In"},{side:"right",signal:"hdmi",dir:"out",label:"HDMI Scaled"},{side:"right",signal:"cat6",dir:"out",label:"DTP Out"}]},
    {type:"Extron DTP3 T 202",mfr:"Extron",model:"DTP3 T 202",price:0,w:140,h:56,color:"#0e7a3a",ports:[{side:"left",signal:"hdmi",dir:"in",label:"HDMI In"},{side:"right",signal:"cat6",dir:"out",label:"DTP3 Out"},{side:"right",signal:"control",dir:"out",label:"RS232"}]},
    {type:"Extron DTP3 R 201",mfr:"Extron",model:"DTP3 R 201",price:0,w:140,h:56,color:"#0e7a3a",ports:[{side:"left",signal:"cat6",dir:"in",label:"DTP3 In"},{side:"right",signal:"hdmi",dir:"out",label:"HDMI Out"},{side:"right",signal:"control",dir:"out",label:"RS232"}]},
    {type:"Extron DTP3 T 301",mfr:"Extron",model:"DTP3 T 301",price:0,w:140,h:70,color:"#0e7a3a",ports:[{side:"left",signal:"hdmi",dir:"in",label:"HDMI In"},{side:"left",signal:"usb",dir:"in",label:"USB Host"},{side:"right",signal:"cat6",dir:"out",label:"DTP3 Out"},{side:"right",signal:"control",dir:"out",label:"RS232"}]},
    {type:"Extron DTP3 R 301",mfr:"Extron",model:"DTP3 R 301",price:0,w:140,h:70,color:"#0e7a3a",ports:[{side:"left",signal:"cat6",dir:"in",label:"DTP3 In"},{side:"right",signal:"hdmi",dir:"out",label:"HDMI Out"},{side:"right",signal:"usb",dir:"out",label:"USB Hub"}]},
    {type:"Extron NAV E 501",mfr:"Extron",model:"NAV E 501",price:0,w:140,h:56,color:"#0e7a3a",ports:[{side:"left",signal:"hdmi",dir:"in",label:"HDMI In"},{side:"right",signal:"cat6",dir:"out",label:"1G IP Out"}]},
    {type:"Extron NAV SD 101",mfr:"Extron",model:"NAV SD 101",price:0,w:140,h:56,color:"#0e7a3a",ports:[{side:"left",signal:"cat6",dir:"in",label:"1G IP In"},{side:"right",signal:"hdmi",dir:"out",label:"HDMI Out"}]},
    {type:"Extron XTP II CrossPoint",mfr:"Extron",model:"XTP II CrossPoint",price:0,w:170,h:90,color:"#0e7a3a",ports:[{side:"left",signal:"hdmi",dir:"in",label:"XTP In 1-8"},{side:"left",signal:"fiber",dir:"in",label:"Fiber In"},{side:"right",signal:"hdmi",dir:"out",label:"XTP Out 1-4"},{side:"right",signal:"fiber",dir:"out",label:"Fiber Out"},{side:"right",signal:"cat6",dir:"out",label:"DTP Out"}]},
  ]},
  {cat:"Crestron/QSC",items:[
    {type:"Crestron DM-NVX-350",mfr:"Crestron",model:"DM-NVX-350",price:0,w:150,h:56,color:"#f59e0b",ports:[{side:"left",signal:"hdmi",dir:"in",label:"HDMI In"},{side:"right",signal:"cat6",dir:"out",label:"NVX 1G"}]},
    {type:"Crestron DM-NVX-D30",mfr:"Crestron",model:"DM-NVX-D30",price:0,w:150,h:56,color:"#f59e0b",ports:[{side:"left",signal:"cat6",dir:"in",label:"NVX 1G"},{side:"right",signal:"hdmi",dir:"out",label:"HDMI Out"}]},
    {type:"Crestron DM-MD 8x8",mfr:"Crestron",model:"DM-MD 8x8",price:0,w:150,h:80,color:"#f59e0b",ports:[{side:"left",signal:"hdmi",dir:"in",label:"HDMI In 1-4"},{side:"left",signal:"cat6",dir:"in",label:"DM In 5-8"},{side:"right",signal:"hdmi",dir:"out",label:"HDMI Out 1-4"},{side:"right",signal:"cat6",dir:"out",label:"DM Out 5-8"}]},
    {type:"QSC NV-32-H (Encoder)",mfr:"QSC",model:"NV-32-H",price:0,w:150,h:56,color:"#f59e0b",ports:[{side:"left",signal:"hdmi",dir:"in",label:"HDMI In"},{side:"right",signal:"cat6",dir:"out",label:"Q-LAN"}]},
    {type:"QSC NV-21-HU (Decoder)",mfr:"QSC",model:"NV-21-HU",price:0,w:150,h:56,color:"#f59e0b",ports:[{side:"left",signal:"cat6",dir:"in",label:"Q-LAN"},{side:"right",signal:"hdmi",dir:"out",label:"HDMI Out"},{side:"right",signal:"usb",dir:"out",label:"USB"}]},
    {type:"Generic HDBaseT TX",mfr:"Generic",model:"—",price:0,w:120,h:56,color:"#f59e0b",ports:[{side:"left",signal:"hdmi",dir:"in",label:"HDMI"},{side:"right",signal:"cat6",dir:"out",label:"Cat6"}]},
    {type:"Generic HDBaseT RX",mfr:"Generic",model:"—",price:0,w:120,h:56,color:"#f59e0b",ports:[{side:"left",signal:"cat6",dir:"in",label:"Cat6"},{side:"right",signal:"hdmi",dir:"out",label:"HDMI"}]},
  ]},
  {cat:"Audio",items:[
    {type:"Extron DMP 128 Plus",mfr:"Extron",model:"DMP 128 Plus",price:0,w:150,h:80,color:"#22c55e",ports:[{side:"left",signal:"analog",dir:"in",label:"Mic/Line In"},{side:"left",signal:"dante",dir:"in",label:"Dante In"},{side:"left",signal:"usb",dir:"in",label:"USB Audio"},{side:"right",signal:"dante",dir:"out",label:"Dante Out"},{side:"right",signal:"analog",dir:"out",label:"Line Out"},{side:"right",signal:"control",dir:"out",label:"EXP"}]},
    {type:"Extron DMP 64 Plus",mfr:"Extron",model:"DMP 64 Plus",price:0,w:140,h:70,color:"#22c55e",ports:[{side:"left",signal:"analog",dir:"in",label:"Mic/Line In"},{side:"left",signal:"usb",dir:"in",label:"USB Audio"},{side:"right",signal:"analog",dir:"out",label:"Line Out"},{side:"right",signal:"control",dir:"out",label:"EXP"}]},
    {type:"Extron NetPA Ultra",mfr:"Extron",model:"NetPA Ultra",price:0,w:140,h:56,color:"#22c55e",ports:[{side:"left",signal:"dante",dir:"in",label:"Dante In"},{side:"right",signal:"speaker",dir:"out",label:"Spkr Out"}]},
    {type:"Extron XPA Ultra",mfr:"Extron",model:"XPA Ultra",price:0,w:130,h:56,color:"#22c55e",ports:[{side:"left",signal:"analog",dir:"in",label:"Audio In"},{side:"right",signal:"speaker",dir:"out",label:"Spkr Out"}]},
    {type:"QSC Core 110f",mfr:"QSC",model:"Core 110f",price:0,w:140,h:70,color:"#22c55e",ports:[{side:"left",signal:"dante",dir:"in",label:"Dante In"},{side:"left",signal:"analog",dir:"in",label:"Analog In"},{side:"left",signal:"usb",dir:"in",label:"USB"},{side:"right",signal:"dante",dir:"out",label:"Dante Out"},{side:"right",signal:"analog",dir:"out",label:"Analog Out"}]},
    {type:"Biamp TesiraFORTÉ X",mfr:"Biamp",model:"TesiraFORTÉ X",price:0,w:150,h:70,color:"#22c55e",ports:[{side:"left",signal:"dante",dir:"in",label:"Dante In"},{side:"left",signal:"analog",dir:"in",label:"Mic/Line In"},{side:"left",signal:"usb",dir:"in",label:"USB"},{side:"right",signal:"dante",dir:"out",label:"Dante Out"},{side:"right",signal:"analog",dir:"out",label:"Line Out"}]},
    {type:"Shure MXA920",mfr:"Shure",model:"MXA920",price:0,w:130,h:56,color:"#22c55e",ports:[{side:"right",signal:"dante",dir:"out",label:"Dante"}]},
    {type:"Shure MXA710",mfr:"Shure",model:"MXA710",price:0,w:130,h:56,color:"#22c55e",ports:[{side:"right",signal:"dante",dir:"out",label:"Dante"}]},
    {type:"Sennheiser TCC2",mfr:"Sennheiser",model:"TCC2",price:0,w:130,h:56,color:"#22c55e",ports:[{side:"right",signal:"dante",dir:"out",label:"Dante"}]},
    {type:"Biamp Parlé TCM-XA",mfr:"Biamp",model:"Parlé TCM-XA",price:0,w:140,h:56,color:"#22c55e",ports:[{side:"right",signal:"dante",dir:"out",label:"Dante"}]},
    {type:"Shure ANIUSB-MATRIX",mfr:"Shure",model:"ANIUSB-MATRIX",price:0,w:150,h:56,color:"#22c55e",ports:[{side:"left",signal:"dante",dir:"in",label:"Dante"},{side:"right",signal:"usb",dir:"out",label:"USB"}]},
    {type:"Biamp Devio SCX 800",mfr:"Biamp",model:"Devio SCX 800",price:0,w:140,h:70,color:"#22c55e",ports:[{side:"left",signal:"dante",dir:"in",label:"Dante In"},{side:"left",signal:"usb",dir:"in",label:"USB"},{side:"right",signal:"dante",dir:"out",label:"Dante Out"},{side:"right",signal:"analog",dir:"out",label:"Spkr Out"}]},
    {type:"Ceiling Speaker",mfr:"Generic",model:"—",price:0,w:120,h:56,color:"#22c55e",ports:[{side:"left",signal:"speaker",dir:"in",label:"Input"}]},
    {type:"Extron FF 220T",mfr:"Extron",model:"FF 220T",price:0,w:130,h:56,color:"#22c55e",ports:[{side:"left",signal:"speaker",dir:"in",label:"70V Input"}]},
  ]},
  {cat:"Control",items:[
    {type:"Extron IPCP Pro 550",mfr:"Extron",model:"IPCP Pro 550",price:0,w:150,h:56,color:"#ef4444",ports:[{side:"left",signal:"cat6",dir:"in",label:"Network"},{side:"right",signal:"control",dir:"out",label:"RS232/IR/IO"}]},
    {type:"Extron IPCP Pro xi",mfr:"Extron",model:"IPCP Pro xi",price:0,w:150,h:56,color:"#ef4444",ports:[{side:"left",signal:"cat6",dir:"in",label:"AV LAN"},{side:"left",signal:"cat6",dir:"in",label:"LAN"},{side:"right",signal:"control",dir:"out",label:"RS232/IR/IO"}]},
    {type:"Extron TouchLink Pro",mfr:"Extron",model:"TouchLink Pro",price:0,w:140,h:56,color:"#ef4444",ports:[{side:"left",signal:"cat6",dir:"in",label:"PoE Network"}]},
    {type:"Extron NBP (Button Panel)",mfr:"Extron",model:"NBP",price:0,w:150,h:56,color:"#ef4444",ports:[{side:"left",signal:"cat6",dir:"in",label:"PoE Network"}]},
    {type:"Crestron CP4/PRO4",mfr:"Crestron",model:"CP4/PRO4",price:0,w:140,h:56,color:"#ef4444",ports:[{side:"left",signal:"cat6",dir:"in",label:"Network"},{side:"right",signal:"control",dir:"out",label:"COM/IR/IO"}]},
    {type:"Crestron TSW-1070",mfr:"Crestron",model:"TSW-1070",price:0,w:140,h:56,color:"#ef4444",ports:[{side:"left",signal:"cat6",dir:"in",label:"PoE Network"}]},
    {type:"Logitech Tap",mfr:"Logitech",model:"Tap",price:0,w:120,h:56,color:"#ef4444",ports:[{side:"left",signal:"cat6",dir:"in",label:"PoE Network"}]},
    {type:"UC Compute (MTR)",mfr:"Generic",model:"—",price:0,w:130,h:56,color:"#ef4444",ports:[{side:"left",signal:"usb",dir:"in",label:"USB Cam"},{side:"left",signal:"usb",dir:"in",label:"USB Audio"},{side:"right",signal:"hdmi",dir:"out",label:"HDMI"}]},
  ]},
  {cat:"Network",items:[
    {type:"NETGEAR M4250 PoE+",mfr:"NETGEAR",model:"M4250 PoE+",price:0,w:150,h:80,color:"#06b6d4",ports:[{side:"left",signal:"cat6",dir:"in",label:"Port 1"},{side:"left",signal:"cat6",dir:"in",label:"Port 2"},{side:"left",signal:"cat6",dir:"in",label:"Port 3"},{side:"right",signal:"cat6",dir:"out",label:"Port 4"},{side:"right",signal:"cat6",dir:"out",label:"Port 5"},{side:"right",signal:"fiber",dir:"out",label:"SFP+ 10G"}]},
    {type:"Cisco Catalyst 9200",mfr:"Cisco",model:"Catalyst 9200",price:0,w:150,h:70,color:"#06b6d4",ports:[{side:"left",signal:"cat6",dir:"in",label:"Port 1-2"},{side:"left",signal:"cat6",dir:"in",label:"Port 3-4"},{side:"right",signal:"cat6",dir:"out",label:"Port 5-6"},{side:"right",signal:"fiber",dir:"out",label:"10G Uplink"}]},
    {type:"Network Switch (Generic)",mfr:"Generic",model:"—",price:0,w:150,h:70,color:"#06b6d4",ports:[{side:"left",signal:"cat6",dir:"in",label:"Port 1"},{side:"left",signal:"cat6",dir:"in",label:"Port 2"},{side:"right",signal:"cat6",dir:"out",label:"Port 3"},{side:"right",signal:"cat6",dir:"out",label:"Port 4"}]},
  ]},
];

export default function SignalFlowPage() {
  const [devices, setDevices] = useState<any[]>([]);
  const [connections, setConnections] = useState<any[]>([]);
  const [dragging, setDragging] = useState<any>(null);
  const [connecting, setConnecting] = useState<any>(null);
  const [selected, setSelected] = useState<any>(null);
  const [selectedConn, setSelectedConn] = useState<any>(null);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [rooms, setRooms] = useState<any[]>([]);
  const [editingRoom, setEditingRoom] = useState<any>(null);
  const [panOffset] = useState({x:0,y:0});
  const [libOpen, setLibOpen] = useState(true);
  const [libSearch, setLibSearch] = useState("");
  const [libResults, setLibResults] = useState<any[]>([]);
  const [libLoading, setLibLoading] = useState(false);
  const [bomCollapsed, setBomCollapsed] = useState(true);
  const { updateSlice } = useBOM();
  const canvasRef = useRef<SVGSVGElement>(null);
  const nextId = useRef(1);
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef<NodeJS.Timeout | null>(null);
  const [contextMenu, setContextMenu] = useState<{x:number,y:number,roomId:string,showColors?:boolean}|null>(null);
  const [deviceContextMenu, setDeviceContextMenu] = useState<{x:number,y:number,deviceId:any}|null>(null);
  const [editingDevice, setEditingDevice] = useState<any>(null);
  const [editDeviceName, setEditDeviceName] = useState("");
  const [editDeviceMfr, setEditDeviceMfr] = useState("");
  const [editDeviceModel, setEditDeviceModel] = useState("");
  const [editDevicePorts, setEditDevicePorts] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalSearch, setModalSearch] = useState("");
  const [modalResults, setModalResults] = useState<any[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalSelected, setModalSelected] = useState<any>(null);

  const [modalDeviceName, setModalDeviceName] = useState("");
  const [modalMake, setModalMake] = useState("");
  const [modalModel, setModalModel] = useState("");

  // Annotation tools
  const [activeTool, setActiveTool] = useState<"text"|"shape"|"pencil"|"highlight"|"eraser"|null>(null);
  const [shapeSubtype, setShapeSubtype] = useState<"rect"|"circle"|"line"|"arrow">("rect");
  const [toolColor, setToolColor] = useState("#374151");
  const [hlColor, setHlColor] = useState("#fbbf24");
  const [hlSubtype, setHlSubtype] = useState<"rect"|"freehand">("rect");
  const [strokeW, setStrokeW] = useState(2);
  const [annotations, setAnnotations] = useState<any[]>([]);
  const [liveAnnot, setLiveAnnot] = useState<any>(null);
  const [textInput, setTextInput] = useState<{cssX:number,cssY:number,svgX:number,svgY:number,clientX:number,clientY:number}|null>(null);
  const [textValue, setTextValue] = useState("");
  const [textFontSize, setTextFontSize] = useState(14);
  const [textBold, setTextBold] = useState(false);
  const [textItalic, setTextItalic] = useState(false);
  const [textAlign, setTextAlign] = useState<"left"|"center"|"right">("left");
  const [editingAnnotId, setEditingAnnotId] = useState<string|null>(null);
  const editingAnnotIdRef = useRef<string|null>(null);
  const [selectedAnnotId, setSelectedAnnotId] = useState<string|null>(null);
  const drawRef = useRef<{sx:number,sy:number,pts?:{x:number,y:number}[]}|null>(null);
  const annotIdRef = useRef(1);
  const cancelTextRef = useRef(false);

  // Load
  useEffect(() => {
    loadToolData("signal-flow").then((data) => {
      if (data) {
        if (data.devices) { setDevices(data.devices as any[]); nextId.current = (data.nextId as number) || 1; }
        if (data.connections) setConnections(data.connections as any[]);
        if (data.rooms) setRooms(data.rooms as any[]);
        if (data.annotations) { setAnnotations(data.annotations as any[]); annotIdRef.current = (data.annotNextId as number) || 1; }
      }
      setLoaded(true);
    });
  }, []);

  // Auto-save
  const doSave = useCallback(() => {
    saveToolData("signal-flow", { devices, connections, rooms, nextId: nextId.current, annotations, annotNextId: annotIdRef.current });
  }, [devices, connections, rooms, annotations]);

  useEffect(() => {
    if (!loaded) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => doSave(), 1500);
  }, [devices, connections, rooms, loaded, doSave]);

  // Sync devices to shared BOM
  useEffect(() => {
    updateSlice('signal-flow', devices.map((d: any) => ({
      name: d.type,
      mfr: d.mfr || getMfr(d.type),
      cat: d.cat || d.category || '',
      listPrice: d.price || 0,
    })));
  }, [devices, updateSlice]);

  // Auto-expand BOM when a device is added (not on initial load)
  const bomBaseline = useRef(-1);
  useEffect(() => {
    if (!loaded) return;
    if (bomBaseline.current === -1) {
      bomBaseline.current = devices.length;
      return;
    }
    if (devices.length > bomBaseline.current) {
      setBomCollapsed(false);
      bomBaseline.current = devices.length;
    }
  }, [devices.length, loaded]);

  const searchLocalLibrary = useCallback((query: string) => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const results: any[] = [];
    DEVICE_LIBRARY.forEach(cat => {
      cat.items.forEach((item: any) => {
        if (
          item.type.toLowerCase().includes(q) ||
          (item.mfr || "").toLowerCase().includes(q) ||
          (item.model || "").toLowerCase().includes(q) ||
          cat.cat.toLowerCase().includes(q)
        ) {
          results.push({ ...item, cat: cat.cat });
        }
      });
    });
    return results;
  }, []);

  useEffect(() => {
    if (!libSearch.trim()) { setLibResults([]); return; }
    setLibLoading(true);
    const timer = setTimeout(async () => {
      try {
        const [dbData, localData] = await Promise.all([
          searchProducts(libSearch).catch(() => []),
          Promise.resolve(searchLocalLibrary(libSearch)),
        ]);
        const dbKeys = new Set(dbData.map((p: any) => `${p.manufacturer}::${p.type}`));
        const uniqueLocal = localData.filter((p: any) => !dbKeys.has(`${p.mfr}::${p.type}`));
        const combined = [
          ...dbData.map((p: any) => ({
            type: p.type,
            mfr: p.manufacturer,
            model: p.model_name,
            price: p.price,
            color: p.color || "#64748b",
            ports: p.ports || [],
            cat: p.category,
            w: Math.max(120, p.type.length * 7 + 30),
            h: Math.max(56, (p.ports || []).length > 4 ? 80 : (p.ports || []).length > 2 ? 70 : 56),
          })),
          ...uniqueLocal,
        ];
        setLibResults(combined);
      } finally {
        setLibLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [libSearch, searchLocalLibrary]);

  useEffect(() => {
    if (!modalSearch.trim()) { setModalResults([]); return; }
    setModalLoading(true);
    const timer = setTimeout(async () => {
      try {
        const [dbData, localData] = await Promise.all([
          searchProducts(modalSearch).catch(() => []),
          Promise.resolve(searchLocalLibrary(modalSearch)),
        ]);
        const dbKeys = new Set(dbData.map((p: any) => `${p.manufacturer}::${p.type}`));
        const uniqueLocal = localData.filter((p: any) => !dbKeys.has(`${p.mfr}::${p.type}`));
        setModalResults([
          ...dbData.map((p: any) => ({
            type: p.type, mfr: p.manufacturer, model: p.model_name, price: p.price,
            color: p.color || "#64748b", ports: p.ports || [], cat: p.category,
            w: Math.max(120, p.type.length * 7 + 30),
            h: Math.max(56, (p.ports || []).length > 4 ? 80 : (p.ports || []).length > 2 ? 70 : 56),
          })),
          ...uniqueLocal,
        ]);
      } finally { setModalLoading(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [modalSearch, searchLocalLibrary]);

  const getMfr = (type: string) => {
    if(type.startsWith("Extron")) return "Extron";
    if(type.startsWith("Crestron")) return "Crestron";
    if(type.startsWith("QSC")) return "QSC";
    if(type.startsWith("Biamp")) return "Biamp";
    if(type.startsWith("Shure")) return "Shure";
    if(type.startsWith("Sennheiser")) return "Sennheiser";
    if(type.startsWith("NETGEAR")) return "NETGEAR";
    if(type.startsWith("Cisco")) return "Cisco";
    if(type.startsWith("Logitech")) return "Logitech";
    if(type.startsWith("Barco")) return "Barco";
    return "Generic";
  };

  const generateCableSchedule = () => {
    return connections.map((conn,i) => {
      const fromDev = devices.find((d:any)=>d.id===conn.from.deviceId);
      const toDev = devices.find((d:any)=>d.id===conn.to.deviceId);
      if(!fromDev||!toDev) return null;
      const fromPort = fromDev.ports.find((p:any)=>p.id===conn.from.portId);
      const toPort = toDev.ports.find((p:any)=>p.id===conn.to.portId);
      const sig = SIGNAL_TYPES.find(s=>s.id===conn.signal)||SIGNAL_TYPES[0];
      return {id:i+1, from:fromDev.type, fromPort:fromPort?.label||"", to:toDev.type, toPort:toPort?.label||"", signal:sig.name, color:sig.color};
    }).filter(Boolean);
  };

  const addDevice = (template: any) => {
    const id = nextId.current++;
    const ports = template.ports.map((p:any,i:number)=>({...p,id:`${id}-p${i}`}));
    setDevices(prev=>[...prev,{...template,id,x:200+Math.random()*300,y:100+Math.random()*200,ports}]);
  };

  const roomColors = ["#4b5563","#6b7280","#3b82f6","#22c55e","#f59e0b","#a855f7","#ef4444","#06b6d4","#f97316","#ec4899"];
  const addRoom = () => {
    const id = "room-"+(Date.now());
    setRooms(prev=>[...prev,{id,label:"Location "+(prev.length+1),x:80+Math.random()*100,y:80+Math.random()*100,w:400,h:300,color:"#4b5563"}]);
    setSelectedRoom(id);
  };

  const handleRoomMouseDown = (e: React.MouseEvent, room: any) => {
    e.stopPropagation();
    setSelectedRoom(room.id); setSelected(null); setSelectedConn(null);
    const startX = e.clientX - room.x - panOffset.x;
    const startY = e.clientY - room.y - panOffset.y;
    const onMove = (me: MouseEvent) => {
      const nx = me.clientX - startX - panOffset.x;
      const ny = me.clientY - startY - panOffset.y;
      setRooms(prev=>prev.map(r=>r.id===room.id?{...r,x:nx,y:ny}:r));
    };
    const onUp = () => { window.removeEventListener("mousemove",onMove); window.removeEventListener("mouseup",onUp); };
    window.addEventListener("mousemove",onMove);
    window.addEventListener("mouseup",onUp);
  };

  const handleRoomResize = (e: React.MouseEvent, room: any, handle: string) => {
    e.stopPropagation();
    setSelectedRoom(room.id);
    const startX = e.clientX, startY = e.clientY;
    const origX = room.x, origY = room.y, origW = room.w, origH = room.h;
    const onMove = (me: MouseEvent) => {
      const dx = me.clientX - startX, dy = me.clientY - startY;
      setRooms(prev=>prev.map(r=>{
        if(r.id!==room.id) return r;
        let {x,y,w,h} = {x:origX,y:origY,w:origW,h:origH};
        if(handle.includes("e")) w = Math.max(150, origW+dx);
        if(handle.includes("s")) h = Math.max(100, origH+dy);
        if(handle.includes("w")){ w = Math.max(150, origW-dx); x = origX+dx; if(w<=150) x = origX+origW-150; }
        if(handle.includes("n")){ h = Math.max(100, origH-dy); y = origY+dy; if(h<=100) y = origY+origH-100; }
        return {...r,x,y,w,h};
      }));
    };
    const onUp = () => { window.removeEventListener("mousemove",onMove); window.removeEventListener("mouseup",onUp); };
    window.addEventListener("mousemove",onMove);
    window.addEventListener("mouseup",onUp);
  };

  const handleRoomContextMenu = (e: React.MouseEvent, room: any) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedRoom(room.id);
    setContextMenu({x:e.clientX, y:e.clientY, roomId:room.id});
  };

  const handleDeviceContextMenu = (e: React.MouseEvent, dev: any) => {
    e.preventDefault();
    e.stopPropagation();
    setSelected(dev.id);
    setDeviceContextMenu({x:e.clientX, y:e.clientY, deviceId:dev.id});
  };

  const finishRoomEdit = (roomId: string, newLabel: string) => {
    setRooms(prev=>prev.map(r=>r.id===roomId?{...r,label:newLabel}:r));
    setEditingRoom(null);
  };
  const deleteRoom = (roomId: string) => { setRooms(prev=>prev.filter(r=>r.id!==roomId)); if(selectedRoom===roomId) setSelectedRoom(null); };
  const setRoomColor = (roomId: string, color: string) => {
    setRooms(prev=>prev.map(r=>r.id===roomId?{...r,color}:r));
  };

  const cycleRoomColor = (roomId: string) => {
    setRooms(prev=>prev.map(r=>{
      if(r.id!==roomId) return r;
      const idx = roomColors.indexOf(r.color);
      return {...r, color: roomColors[(idx+1)%roomColors.length]};
    }));
  };

  const PORT_TOP_PAD = 26;
  const getPortPos = useCallback((device: any, port: any) => {
    const leftPorts = device.ports.filter((p:any)=>p.side==="left");
    const rightPorts = device.ports.filter((p:any)=>p.side==="right");
    const isLeft = port.side==="left";
    const arr = isLeft?leftPorts:rightPorts;
    const idx = arr.indexOf(port);
    const spacing = (device.h - PORT_TOP_PAD)/(arr.length+1);
    return {
      x: device.x + panOffset.x + (isLeft?0:device.w),
      y: device.y + panOffset.y + PORT_TOP_PAD + spacing*(idx+1)
    };
  },[panOffset]);

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (activeTool) { handleToolDown(e); return; }
    const target = e.target as Element;
    if(target===canvasRef.current || target.tagName==="svg"){
      setSelected(null); setSelectedConn(null); setSelectedRoom(null); setSelectedAnnotId(null);
    }
  };

  const handleDeviceMouseDown = (e: React.MouseEvent, dev: any) => {
    e.stopPropagation();
    setSelected(dev.id); setSelectedConn(null); setSelectedRoom(null);
    const startX = e.clientX - dev.x - panOffset.x;
    const startY = e.clientY - dev.y - panOffset.y;
    const onMove = (me: MouseEvent) => {
      const nx = me.clientX - startX - panOffset.x;
      const ny = me.clientY - startY - panOffset.y;
      setDevices(prev=>prev.map((d:any)=>d.id===dev.id?{...d,x:nx,y:ny}:d));
    };
    const onUp = () => { window.removeEventListener("mousemove",onMove); window.removeEventListener("mouseup",onUp); };
    window.addEventListener("mousemove",onMove);
    window.addEventListener("mouseup",onUp);
  };

  const handlePortClick = (e: React.MouseEvent, device: any, port: any) => {
    e.stopPropagation();
    if(!connecting){
      setConnecting({deviceId:device.id,portId:port.id,signal:port.signal});
    } else {
      if(connecting.deviceId!==device.id){
        const sig = SIGNAL_TYPES.find(s=>s.id===connecting.signal) || SIGNAL_TYPES.find(s=>s.id===port.signal) || SIGNAL_TYPES[0];
        setConnections(prev=>[...prev,{id:Date.now(),from:{deviceId:connecting.deviceId,portId:connecting.portId},to:{deviceId:device.id,portId:port.id},signal:sig.id}]);
      }
      setConnecting(null);
    }
  };

  const deleteSelected = useCallback(() => {
    if(selectedAnnotId!==null){
      setAnnotations(prev=>prev.filter((a:any)=>a.id!==selectedAnnotId));
      setSelectedAnnotId(null);
    } else if(selectedRoom!==null){
      deleteRoom(selectedRoom);
    } else if(selectedConn!==null){
      setConnections(prev=>prev.filter((c:any)=>c.id!==selectedConn));
      setSelectedConn(null);
    } else if(selected!==null){
      setConnections(prev=>prev.filter((c:any)=>c.from.deviceId!==selected&&c.to.deviceId!==selected));
      setDevices(prev=>prev.filter((d:any)=>d.id!==selected));
      setSelected(null);
    }
  }, [selected, selectedConn, selectedRoom, selectedAnnotId]);

  const getSVGCoords = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const eraseAtPoint = (x: number, y: number) => {
    const R = 15;
    setAnnotations(prev => prev.filter((a: any) => {
      if (a.type === "pencil") {
        const pts = [...a.d.matchAll(/[ML](-?\d+\.?\d*),(-?\d+\.?\d*)/g)];
        return !pts.some((m: any) => {
          const dx = parseFloat(m[1]) - x, dy = parseFloat(m[2]) - y;
          return dx*dx + dy*dy < R*R;
        });
      }
      if (a.type === "highlight") {
        if (a.sub === "freehand") {
          const pts = [...a.d.matchAll(/[ML](-?\d+\.?\d*),(-?\d+\.?\d*)/g)];
          return !pts.some((m:any) => { const dx=parseFloat(m[1])-x,dy=parseFloat(m[2])-y; return dx*dx+dy*dy<R*R*16; });
        }
        return !(x >= a.x - R && x <= a.x + a.w + R && y >= a.y - R && y <= a.y + a.h + R);
      }
      if (a.type === "shape") {
        const minX = Math.min(a.x1, a.x2), maxX = Math.max(a.x1, a.x2);
        const minY = Math.min(a.y1, a.y2), maxY = Math.max(a.y1, a.y2);
        return !(x >= minX - R && x <= maxX + R && y >= minY - R && y <= maxY + R);
      }
      if (a.type === "text") {
        const dx = a.x - x, dy = a.y - y;
        return dx*dx + dy*dy >= R*R*9;
      }
      return true;
    }));
  };

  const handleToolDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    const {x, y} = getSVGCoords(e);
    if (activeTool === "eraser") {
      eraseAtPoint(x, y);
      drawRef.current = {sx: x, sy: y};
      return;
    }
    if (activeTool === "text") {
      const rect = canvasRef.current!.getBoundingClientRect();
      const ti = {cssX: e.clientX - rect.left, cssY: e.clientY - rect.top, svgX: x, svgY: y, clientX: e.clientX, clientY: e.clientY};
      textInputRef.current = ti;
      textValueRef.current = "";
      setTextInput(ti);
      setTextValue("");
      return;
    }
    drawRef.current = {sx: x, sy: y, pts: (activeTool === "pencil" || (activeTool === "highlight" && hlSubtype === "freehand")) ? [{x, y}] : undefined};
  };

  const handleToolMove = (e: React.MouseEvent) => {
    if (!drawRef.current) return;
    const {x, y} = getSVGCoords(e);
    const {sx, sy} = drawRef.current;
    if (activeTool === "eraser") {
      eraseAtPoint(x, y);
      return;
    }
    if (activeTool === "pencil") {
      drawRef.current.pts!.push({x, y});
      const d = drawRef.current.pts!.map((p,i)=>`${i===0?"M":"L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
      setLiveAnnot({type:"pencil", d, color:toolColor, sw:strokeW});
    } else if (activeTool === "highlight") {
      if (hlSubtype === "freehand") {
        drawRef.current.pts!.push({x, y});
        const d = drawRef.current.pts!.map((p,i)=>`${i===0?"M":"L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
        setLiveAnnot({type:"highlight", sub:"freehand", d, color:hlColor});
      } else {
        setLiveAnnot({type:"highlight", sub:"rect", x:Math.min(sx,x), y:Math.min(sy,y), w:Math.abs(x-sx), h:Math.abs(y-sy), color:hlColor});
      }
    } else if (activeTool === "shape") {
      setLiveAnnot({type:"shape", sub:shapeSubtype, x1:sx, y1:sy, x2:x, y2:y, color:toolColor, sw:strokeW});
    }
  };

  const handleToolUp = () => {
    if (!drawRef.current) return;
    if (liveAnnot) {
      setAnnotations(prev=>[...prev, {...liveAnnot, id:`a${annotIdRef.current++}`}]);
      setLiveAnnot(null);
    }
    drawRef.current = null;
  };

  const textValueRef = useRef("");
  const textInputRef = useRef<{cssX:number,cssY:number,svgX:number,svgY:number,clientX:number,clientY:number}|null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const commitTextRef = useRef<()=>void>(()=>{});

  // Force-focus + select-all when editor opens
  useEffect(() => {
    if (!textInput || !textareaRef.current) return;
    const el = textareaRef.current;
    el.focus();
    el.select();
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, [textInput?.clientX, textInput?.clientY]);

  // Save on click outside the editor
  useEffect(() => {
    if (!textInput) return;
    const handler = (e: MouseEvent) => {
      if (!(e.target as Element).closest('[data-texteditor]')) {
        commitTextRef.current();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [textInput?.clientX, textInput?.clientY]);

  const commitText = () => {
    if (cancelTextRef.current) { cancelTextRef.current = false; textInputRef.current = null; setTextInput(null); setTextValue(""); setEditingAnnotId(null); editingAnnotIdRef.current = null; return; }
    const editId = editingAnnotIdRef.current;
    const val = textValueRef.current;
    const ti = textInputRef.current;
    if (ti && val.trim()) {
      if (editId) {
        setAnnotations(prev => prev.map((a:any) => a.id === editId
          ? {...a, text:val, color:toolColor, size:textFontSize, bold:textBold, italic:textItalic, align:textAlign}
          : a
        ));
      } else {
        setAnnotations(prev=>[...prev, {id:`a${annotIdRef.current++}`, type:"text", x:ti.svgX, y:ti.svgY+textFontSize, text:val, color:toolColor, size:textFontSize, bold:textBold, italic:textItalic, align:textAlign}]);
      }
    }
    textInputRef.current = null;
    setTextInput(null); setTextValue(""); setEditingAnnotId(null); editingAnnotIdRef.current = null;
  };
  commitTextRef.current = commitText;

  const renderAnnotation = (a: any, isLive = false) => {
    const key = isLive ? "live" : a.id;
    const isSel = !isLive && selectedAnnotId === a.id;
    const selRing = isSel ? {filter:"drop-shadow(0 0 3px #3b82f6)"} : {};
    if (a.type === "pencil") return (
      <path key={key} d={a.d} fill="none" stroke={a.color||"#374151"} strokeWidth={a.sw||2} strokeLinecap="round" strokeLinejoin="round" opacity={0.85} style={{cursor:"pointer",...selRing}} onClick={e=>{e.stopPropagation();if(!activeTool)setSelectedAnnotId(a.id);}}/>
    );
    if (a.type === "highlight") {
      if (a.sub === "freehand") return (
        <path key={key} d={a.d} fill="none" stroke={a.color||"#fbbf24"} strokeWidth={16} strokeLinecap="round" strokeLinejoin="round" opacity={0.4} style={{cursor:"pointer",...selRing}} onClick={e=>{e.stopPropagation();if(!activeTool)setSelectedAnnotId(a.id);}}/>
      );
      return (
        <rect key={key} x={a.x} y={a.y} width={a.w||0} height={a.h||0} fill={a.color||"#fbbf24"} opacity={0.35} rx={3} style={{cursor:"pointer",...selRing}} onClick={e=>{e.stopPropagation();if(!activeTool)setSelectedAnnotId(a.id);}}/>
      );
    }
    if (a.type === "shape") {
      const {sub,x1,y1,x2,y2,color,sw} = a;
      const stroke = color||"#374151"; const sw2 = sw||2;
      const props = {stroke, strokeWidth:sw2, fill:"none", style:{cursor:"pointer",...selRing}, onClick:(e:any)=>{e.stopPropagation();if(!activeTool)setSelectedAnnotId(a.id);}};
      if (sub==="rect") return <rect key={key} x={Math.min(x1,x2)} y={Math.min(y1,y2)} width={Math.abs(x2-x1)} height={Math.abs(y2-y1)} rx={3} {...props}/>;
      if (sub==="circle") { const cx=(x1+x2)/2,cy=(y1+y2)/2,rx2=Math.abs(x2-x1)/2,ry=Math.abs(y2-y1)/2; return <ellipse key={key} cx={cx} cy={cy} rx={rx2} ry={ry} {...props}/>; }
      if (sub==="line") return <line key={key} x1={x1} y1={y1} x2={x2} y2={y2} strokeLinecap="round" {...props}/>;
      if (sub==="arrow") {
        const ang=Math.atan2(y2-y1,x2-x1), hl=14, ha=Math.PI/6;
        const ax1=x2-hl*Math.cos(ang-ha), ay1=y2-hl*Math.sin(ang-ha), ax2=x2-hl*Math.cos(ang+ha), ay2=y2-hl*Math.sin(ang+ha);
        return <g key={key} style={{cursor:"pointer",...selRing}} onClick={(e)=>{e.stopPropagation();if(!activeTool)setSelectedAnnotId(a.id);}}>
          <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth={sw2} strokeLinecap="round"/>
          <polygon points={`${x2},${y2} ${ax1},${ay1} ${ax2},${ay2}`} fill={stroke}/>
        </g>;
      }
    }
    if (a.type === "text") return (
      <text key={key} x={a.x} y={a.y} fontSize={a.size||14} fill={a.color||"#374151"} fontFamily="Inter, sans-serif" fontWeight={a.bold?"700":"400"} fontStyle={a.italic?"italic":"normal"} textAnchor={a.align==="center"?"middle":a.align==="right"?"end":"start"} style={{cursor:"pointer",...selRing}}
        onClick={e=>{e.stopPropagation();if(!activeTool)setSelectedAnnotId(a.id);}}
        onDoubleClick={e=>{
          e.stopPropagation();
          if(activeTool)return;
          textValueRef.current = a.text;
          setTextValue(a.text);
          setTextFontSize(a.size||14);
          setTextBold(a.bold||false);
          setTextItalic(a.italic||false);
          setTextAlign(a.align||"left");
          setToolColor(a.color||"#374151");
          editingAnnotIdRef.current = a.id;
          setEditingAnnotId(a.id);
          const rect=canvasRef.current!.getBoundingClientRect();
          const ti={cssX:e.clientX-rect.left,cssY:e.clientY-rect.top,svgX:a.x,svgY:a.y-(a.size||14),clientX:e.clientX,clientY:e.clientY};
          textInputRef.current=ti;
          setTextInput(ti);
        }}
      >{a.text}</text>
    );
    return null;
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const isTyping = tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement).isContentEditable;
      if(e.key === "Escape") {
        setSelected(null); setSelectedConn(null); setSelectedRoom(null); setConnecting(null); setActiveTool(null); setLiveAnnot(null); drawRef.current=null;
        textInputRef.current = null; setTextInput(null); setTextValue(""); setEditingAnnotId(null); editingAnnotIdRef.current = null;
        return;
      }
      if(e.key !== "Delete" && e.key !== "Backspace") return;
      if(isTyping) return;
      e.preventDefault();
      deleteSelected();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deleteSelected]);

  const clearAll = () => { setDevices([]); setConnections([]); setRooms([]); setAnnotations([]); setSelected(null); setSelectedConn(null); setSelectedRoom(null); setSelectedAnnotId(null); nextId.current=1; annotIdRef.current=1; };

  const renderConnection = (conn: any) => {
    const fromDev = devices.find((d:any)=>d.id===conn.from.deviceId);
    const toDev = devices.find((d:any)=>d.id===conn.to.deviceId);
    if(!fromDev||!toDev) return null;
    const fromPort = fromDev.ports.find((p:any)=>p.id===conn.from.portId);
    const toPort = toDev.ports.find((p:any)=>p.id===conn.to.portId);
    if(!fromPort||!toPort) return null;
    const p1 = getPortPos(fromDev,fromPort);
    const p2 = getPortPos(toDev,toPort);
    const sig = SIGNAL_TYPES.find(s=>s.id===conn.signal)||SIGNAL_TYPES[0];
    const dx = Math.abs(p2.x-p1.x)*0.5;
    const path = `M${p1.x},${p1.y} C${p1.x+dx},${p1.y} ${p2.x-dx},${p2.y} ${p2.x},${p2.y}`;
    const isSelected = selectedConn===conn.id;
    const mx = (p1.x+p2.x)/2, my = (p1.y+p2.y)/2;
    return (
      <g key={conn.id} onClick={(e)=>{e.stopPropagation();setSelectedConn(conn.id);setSelected(null);}} style={{cursor:"pointer"}}>
        {isSelected && <path d={path} fill="none" stroke="#fff" strokeWidth={5} strokeOpacity={0.3} />}
        <path d={path} fill="none" stroke={sig.color} strokeWidth={isSelected?3:2} strokeOpacity={0.8} />
        <rect x={mx-24} y={my-9} width={48} height={18} rx={4} fill="rgb(var(--forge-surface))" stroke={sig.color} strokeWidth={1} opacity={0.95}/>
        <text x={mx} y={my+4} textAnchor="middle" fontSize={8} fill={sig.color} fontFamily="'JetBrains Mono', monospace" fontWeight={600}>{sig.name}</text>
        <circle cx={p1.x} cy={p1.y} r={3} fill={sig.color} />
        <circle cx={p2.x} cy={p2.y} r={3} fill={sig.color} />
      </g>
    );
  };

  const exportAsPDF = () => {
    const style = document.createElement('style');
    style.id = '__sf_print_style__';
    style.textContent = `
      @media print {
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; visibility: hidden !important; }
        #sf-canvas-export, #sf-canvas-export * { visibility: visible !important; }
        #sf-canvas-export { position: fixed !important; inset: 0 !important; width: 100vw !important; height: 100vh !important; background: #fff !important; overflow: visible !important; }
      }
    `;
    document.head.appendChild(style);
    const prev = document.title;
    document.title = 'Signal Flow Diagram';
    setTimeout(() => { window.print(); document.head.removeChild(style); document.title = prev; }, 80);
  };

  return (
    <div style={{display:"flex",flexDirection:"column",height:"calc(100vh - 72px - 85px)",overflow:"hidden"}}>

      {/* === RIBBON === */}
      <div style={{background:"rgb(var(--forge-panel))",borderBottom:"2px solid rgb(var(--border))",flexShrink:0,userSelect:"none"}}>
        {/* Tool groups */}
        <div style={{display:"flex",alignItems:"stretch",height:82,paddingLeft:4,paddingRight:12}}>

          {/* Drawing group */}
          <div style={{display:"flex",flexDirection:"column",justifyContent:"space-between",padding:"5px 6px 0"}}>
            <div style={{display:"flex",gap:2,flex:1,alignItems:"stretch"}}>
              <button onClick={()=>{setShowAddModal(true);setModalSearch("");setModalSelected(null);}} title="Add equipment to canvas"
                style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,padding:"4px 12px",background:"transparent",border:"1px solid transparent",borderRadius:4,cursor:"pointer",transition:"all 0.15s",minWidth:56}}
                onMouseEnter={e=>{e.currentTarget.style.background="rgb(var(--forge-surface))";e.currentTarget.style.borderColor="rgb(var(--border))"}}
                onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.borderColor="transparent"}}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--text-subtle))" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="18" rx="1"/><rect x="14" y="8" width="7" height="13" rx="1"/><line x1="10" y1="9" x2="14" y2="9"/><line x1="10" y1="13" x2="14" y2="13"/>
                </svg>
                <span style={{fontSize:9,color:"rgb(var(--text-subtle))",lineHeight:1.3,whiteSpace:"nowrap",textAlign:"center"}}>Add<br/>Equipment</span>
              </button>
              <button onClick={addRoom} title="Add Location boundary"
                style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,padding:"4px 12px",background:"transparent",border:"1px solid transparent",borderRadius:4,cursor:"pointer",transition:"all 0.15s",minWidth:56}}
                onMouseEnter={e=>{e.currentTarget.style.background="rgb(var(--forge-surface))";e.currentTarget.style.borderColor="rgb(var(--border))"}}
                onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.borderColor="transparent"}}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" strokeDasharray="4 2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
                </svg>
                <span style={{fontSize:9,color:"rgb(var(--text-subtle))",lineHeight:1.3,whiteSpace:"nowrap",textAlign:"center"}}>Add<br/>Location</span>
              </button>
            </div>
            <span style={{fontSize:8,color:"rgb(var(--text-subtle))",textTransform:"uppercase",letterSpacing:"0.06em",textAlign:"center",paddingBottom:2,paddingTop:2}}>Create</span>
          </div>

          {/* Divider */}
          <div style={{width:1,background:"rgb(var(--border))",margin:"6px 4px"}} />

          {/* Annotate group */}
          {(()=>{
            const toolBtn = (id: typeof activeTool, title: string, icon: React.ReactNode, label: string) => {
              const isActive = activeTool === id;
              return (
                <button key={id} onClick={()=>{if(textInput)commitText();setActiveTool(isActive?null:id);}} title={title}
                  style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,padding:"4px 10px",background:isActive?"rgba(59,130,246,0.12)":"transparent",border:`1px solid ${isActive?"#3b82f6":"transparent"}`,borderRadius:4,cursor:"pointer",transition:"all 0.15s",minWidth:48}}
                  onMouseEnter={e=>{if(!isActive){e.currentTarget.style.background="rgb(var(--forge-surface))";e.currentTarget.style.borderColor="rgb(var(--border))"}}}
                  onMouseLeave={e=>{if(!isActive){e.currentTarget.style.background="transparent";e.currentTarget.style.borderColor="transparent"}}}>
                  {icon}
                  <span style={{fontSize:9,color:isActive?"#3b82f6":"rgb(var(--text-subtle))",lineHeight:1.2,whiteSpace:"nowrap"}}>{label}</span>
                </button>
              );
            };
            return (
              <div style={{display:"flex",flexDirection:"column",justifyContent:"space-between",padding:"5px 6px 0"}}>
                <div style={{display:"flex",gap:2,flex:1,alignItems:"stretch"}}>
                  {toolBtn("text","Add Text",
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={activeTool==="text"?"#3b82f6":"rgb(var(--text-subtle))"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>,
                    "Text"
                  )}
                  {toolBtn("shape","Draw Shape",
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={activeTool==="shape"?"#3b82f6":"rgb(var(--text-subtle))"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/></svg>,
                    "Shape"
                  )}
                  {toolBtn("pencil","Freehand Draw",
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={activeTool==="pencil"?"#3b82f6":"rgb(var(--text-subtle))"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>,
                    "Pencil"
                  )}
                  {toolBtn("highlight","Highlight",
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={activeTool==="highlight"?"#3b82f6":"rgb(var(--text-subtle))"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><rect x="9" y="9" width="13" height="13" rx="2" fill={activeTool==="highlight"?"#fbbf2440":"none"}/></svg>,
                    "Highlight"
                  )}
                  {toolBtn("eraser","Erase Annotation",
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={activeTool==="eraser"?"#3b82f6":"rgb(var(--text-subtle))"} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M20 20H7L3 16l10-10 7 7-1.5 1.5"/><path d="M6.5 17.5l5-5"/></svg>,
                    "Eraser"
                  )}
                </div>
                <span style={{fontSize:8,color:"rgb(var(--text-subtle))",textTransform:"uppercase",letterSpacing:"0.06em",textAlign:"center",paddingBottom:2,paddingTop:2}}>Annotate</span>
              </div>
            );
          })()}

          {/* Tool Options (shown when annotation tool is active) */}
          {activeTool && activeTool !== "text" && (
            <>
              <div style={{width:1,background:"rgb(var(--border))",margin:"6px 4px"}} />
              <div style={{display:"flex",flexDirection:"column",justifyContent:"center",padding:"5px 10px",gap:6}}>
                {/* Shape subtypes */}
                {activeTool === "shape" && (
                  <div style={{display:"flex",gap:3}}>
                    {([["rect","□","Rect"],["circle","○","Ellipse"],["line","—","Line"],["arrow","→","Arrow"]] as const).map(([id,sym,label])=>(
                      <button key={id} onClick={()=>setShapeSubtype(id as any)} title={label}
                        style={{width:28,height:22,display:"flex",alignItems:"center",justifyContent:"center",background:shapeSubtype===id?"rgba(59,130,246,0.15)":"rgb(var(--forge-surface))",border:`1px solid ${shapeSubtype===id?"#3b82f6":"rgb(var(--border))"}`,borderRadius:3,cursor:"pointer",fontSize:12,color:shapeSubtype===id?"#3b82f6":"rgb(var(--text-subtle))"}}>
                        {sym}
                      </button>
                    ))}
                  </div>
                )}
                {/* Stroke width */}
                {(activeTool==="pencil"||activeTool==="shape") && (
                  <div style={{display:"flex",alignItems:"center",gap:4}}>
                    {[1,2,4,6].map(w=>(
                      <button key={w} onClick={()=>setStrokeW(w)} title={`${w}px`}
                        style={{width:28,height:22,display:"flex",alignItems:"center",justifyContent:"center",background:strokeW===w?"rgba(59,130,246,0.15)":"rgb(var(--forge-surface))",border:`1px solid ${strokeW===w?"#3b82f6":"rgb(var(--border))"}`,borderRadius:3,cursor:"pointer"}}>
                        <div style={{width:Math.min(w*2.5,18),height:w,background:strokeW===w?"#3b82f6":"rgb(var(--text-muted))",borderRadius:w}}/>
                      </button>
                    ))}
                  </div>
                )}
                {/* Color swatches */}
                {(activeTool==="pencil"||activeTool==="shape") && (
                  <div style={{display:"flex",gap:4}}>
                    {["#374151","#3b82f6","#ef4444","#22c55e","#f59e0b","#a855f7"].map(c=>(
                      <button key={c} onClick={()=>setToolColor(c)}
                        style={{width:16,height:16,borderRadius:"50%",background:c,border:toolColor===c?"2px solid #fff":"2px solid transparent",outline:toolColor===c?`2px solid ${c}`:"none",cursor:"pointer",padding:0,flexShrink:0}}/>
                    ))}
                  </div>
                )}
                {/* Highlight options */}
                {activeTool==="highlight" && (
                  <div style={{display:"flex",gap:8,alignItems:"center"}}>
                    {/* Subtype toggle */}
                    {[
                      {id:"rect", label:"Rect", icon:<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="3" width="12" height="8" rx="1.5" fill={hlSubtype==="rect"?"#fbbf24":"none"} stroke={hlSubtype==="rect"?"#92400e":"rgb(var(--text-subtle))"} strokeWidth="1.5" opacity={hlSubtype==="rect"?0.8:1}/></svg>},
                      {id:"freehand", label:"Pen", icon:<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 10 Q4 5 7 7 Q10 9 12 4" stroke={hlSubtype==="freehand"?"#fbbf24":"rgb(var(--text-subtle))"} strokeWidth={hlSubtype==="freehand"?3:2} strokeLinecap="round" fill="none" opacity={hlSubtype==="freehand"?0.9:1}/></svg>},
                    ].map(({id,label,icon})=>(
                      <button key={id} onClick={()=>setHlSubtype(id as "rect"|"freehand")} title={label}
                        style={{display:"flex",alignItems:"center",justifyContent:"center",width:26,height:22,background:hlSubtype===id?"rgba(251,191,36,0.15)":"rgb(var(--forge-surface))",border:`1px solid ${hlSubtype===id?"#fbbf24":"rgb(var(--border))"}`,borderRadius:4,cursor:"pointer",padding:0}}>
                        {icon}
                      </button>
                    ))}
                    <div style={{width:1,height:16,background:"rgb(var(--border))"}}/>
                    <span style={{fontSize:9,color:"rgb(var(--text-subtle))"}}>Color</span>
                    {["#fbbf24","#fb923c","#4ade80","#60a5fa","#f472b6","#c084fc"].map(c=>(
                      <button key={c} onClick={()=>setHlColor(c)}
                        style={{width:18,height:18,borderRadius:3,background:c,opacity:0.7,border:hlColor===c?"2px solid rgb(var(--text-body))":"2px solid transparent",cursor:"pointer",padding:0,flexShrink:0}}/>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Spacer pushes export button to far right */}
          <div style={{flex:1}}/>
          <div style={{display:"flex",alignItems:"center",paddingRight:4}}>
            <button onClick={exportAsPDF} title="Export canvas as PDF"
              style={{display:"flex",alignItems:"center",gap:6,padding:"7px 14px",background:"rgb(var(--forge-surface))",border:"1px solid rgb(var(--border))",borderRadius:6,cursor:"pointer",color:"rgb(var(--text-body))",fontSize:12,fontWeight:500,transition:"all 0.15s",whiteSpace:"nowrap"}}
              onMouseEnter={e=>{e.currentTarget.style.background="rgba(59,130,246,0.1)";e.currentTarget.style.borderColor="#3b82f6";e.currentTarget.style.color="#3b82f6";}}
              onMouseLeave={e=>{e.currentTarget.style.background="rgb(var(--forge-surface))";e.currentTarget.style.borderColor="rgb(var(--border))";e.currentTarget.style.color="rgb(var(--text-body))"}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                <line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 18 15 15"/>
              </svg>
              Export PDF
            </button>
          </div>
        </div>
      </div>

      {/* === Main content area === */}
      <div style={{display:"flex",flex:1,overflow:"hidden"}}>

      {/* Canvas */}
      <div id="sf-canvas-export" style={{flex:1,position:"relative",overflow:"hidden",background:"rgb(var(--forge-bg))"}}>
        {/* Connection status */}
        {connecting && (
          <div style={{position:"absolute",top:10,left:"50%",transform:"translateX(-50%)",zIndex:10,padding:"5px 12px",background:"rgba(59,130,246,0.15)",border:"1px solid rgba(59,130,246,0.3)",borderRadius:5,color:"#3b82f6",fontSize:11,whiteSpace:"nowrap"}}>
            Click a port to complete connection…
            <button onClick={()=>setConnecting(null)} style={{background:"none",border:"none",color:"#f87171",cursor:"pointer",fontSize:11,marginLeft:4}}>Cancel</button>
          </div>
        )}

        {/* SVG Canvas */}
        <svg ref={canvasRef} width="100%" height="100%" onMouseDown={handleCanvasMouseDown}
          onMouseMove={activeTool&&activeTool!=="text"?handleToolMove:undefined}
          onMouseUp={activeTool&&activeTool!=="text"?handleToolUp:undefined}
          onDoubleClick={e=>{const t=e.target as Element;if(t===canvasRef.current||t.tagName==="svg"||t.tagName==="rect"&&t.getAttribute("fill")==="url(#grid)"){setSelected(null);setSelectedConn(null);setSelectedRoom(null);}}}
          style={{cursor:activeTool==="text"?"text":activeTool?"crosshair":"default"}}>
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgb(var(--border))" strokeWidth="0.5" opacity="0.4"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Highlight annotations (below everything) */}
          {annotations.filter((a:any)=>a.type==="highlight").map(a=>renderAnnotation(a))}
          {liveAnnot?.type==="highlight" && renderAnnotation(liveAnnot, true)}

          {/* Room Boundaries */}
          {rooms.map((room:any)=>{
            const isSel = selectedRoom===room.id;
            const rx = room.x+panOffset.x, ry = room.y+panOffset.y;
            const handleSize = 8;
            return (
              <g key={room.id}>
                <rect x={rx} y={ry} width={room.w} height={room.h} rx={3} fill={room.color+"08"} stroke={room.color+(isSel?"88":"44")} strokeWidth={isSel?2.5:1.5} strokeDasharray={isSel?"8 4":"6 4"} onMouseDown={(e)=>handleRoomMouseDown(e,room)} onContextMenu={(e)=>handleRoomContextMenu(e,room)} style={{cursor:"move"}} />
                <rect x={rx} y={ry-1} width={Math.min(room.w,Math.max(100,room.label.length*9+24))} height={24} rx={3} fill={room.color+"22"} stroke={room.color+"55"} strokeWidth={1} onMouseDown={(e)=>handleRoomMouseDown(e,room)} onContextMenu={(e)=>handleRoomContextMenu(e,room)} style={{cursor:"move"}} />
                {editingRoom===room.id ? (
                  <foreignObject x={rx+4} y={ry+1} width={Math.max(160,room.label.length*9+30)} height={22}>
                    <input autoFocus defaultValue={room.label} onBlur={(e)=>finishRoomEdit(room.id,(e.target as HTMLInputElement).value)} onKeyDown={(e)=>{if(e.key==="Enter")finishRoomEdit(room.id,(e.target as HTMLInputElement).value);}} style={{width:"100%",padding:"2px 6px",background:"rgb(var(--forge-surface))",border:"1px solid "+room.color,borderRadius:3,color:"rgb(var(--text-body))",fontSize:11,fontWeight:600,fontFamily:"Inter, sans-serif",outline:"none",boxSizing:"border-box",height:"20px"}} />
                  </foreignObject>
                ) : (
                  <text x={rx+12} y={ry+15} fontSize={11} fill={room.color} fontFamily="Inter, sans-serif" fontWeight={700} style={{cursor:"pointer"}} onDoubleClick={()=>setEditingRoom(room.id)} onMouseDown={(e)=>handleRoomMouseDown(e,room)} onContextMenu={(e)=>handleRoomContextMenu(e,room)}>
                    {room.label}
                  </text>
                )}
                {isSel && <>
                  <rect x={rx+room.w-handleSize} y={ry+room.h-handleSize} width={handleSize} height={handleSize} fill={room.color} rx={2} opacity={0.7} style={{cursor:"se-resize"}} onMouseDown={(e)=>handleRoomResize(e,room,"se")} />
                  <rect x={rx+room.w-handleSize} y={ry} width={handleSize} height={handleSize} fill={room.color} rx={2} opacity={0.5} style={{cursor:"ne-resize"}} onMouseDown={(e)=>handleRoomResize(e,room,"ne")} />
                  <rect x={rx} y={ry+room.h-handleSize} width={handleSize} height={handleSize} fill={room.color} rx={2} opacity={0.5} style={{cursor:"sw-resize"}} onMouseDown={(e)=>handleRoomResize(e,room,"sw")} />
                  <rect x={rx+room.w/2-handleSize/2} y={ry+room.h-handleSize} width={handleSize} height={handleSize} fill={room.color} rx={2} opacity={0.4} style={{cursor:"s-resize"}} onMouseDown={(e)=>handleRoomResize(e,room,"s")} />
                  <rect x={rx+room.w-handleSize} y={ry+room.h/2-handleSize/2} width={handleSize} height={handleSize} fill={room.color} rx={2} opacity={0.4} style={{cursor:"e-resize"}} onMouseDown={(e)=>handleRoomResize(e,room,"e")} />
                </>}
              </g>
            );
          })}

          {/* Connections */}
          {connections.map(renderConnection)}

          {/* Devices */}
          {devices.map((dev:any)=>{
            const isSel = selected===dev.id;
            const leftPorts = dev.ports.filter((p:any)=>p.side==="left");
            const rightPorts = dev.ports.filter((p:any)=>p.side==="right");
            return (
              <g key={dev.id} onMouseDown={(e)=>handleDeviceMouseDown(e,dev)} onContextMenu={(e)=>handleDeviceContextMenu(e,dev)} style={{cursor:"grab"}}>
                <rect x={dev.x+panOffset.x+2} y={dev.y+panOffset.y+2} width={dev.w} height={dev.h} rx={6} fill="rgb(var(--text-faint))" opacity={0.15} />
                <rect x={dev.x+panOffset.x} y={dev.y+panOffset.y} width={dev.w} height={dev.h} rx={6} fill="rgb(var(--forge-surface))" stroke={isSel?"#3b82f6":"#4b5563"} strokeWidth={isSel?2:1.5} />
                <rect x={dev.x+panOffset.x} y={dev.y+panOffset.y} width={4} height={dev.h} rx={2} fill="#4b5563" opacity={0.8} />
                {(dev.mfr||dev.model)&&<text x={dev.x+panOffset.x+dev.w/2} y={dev.y+panOffset.y+13} textAnchor="middle" fontSize={11} fill="rgb(var(--text-body))" fontFamily="Inter, sans-serif" fontWeight={700}>{[dev.mfr&&dev.mfr!=="Generic"?dev.mfr:null,dev.model&&dev.model!=="—"?dev.model:null].filter(Boolean).join(" · ")}</text>}
                <text x={dev.x+panOffset.x+dev.w/2} y={dev.y+panOffset.y+(dev.mfr||dev.model?23:16)} textAnchor="middle" fontSize={8} fill="rgb(var(--text-subtle))" fontFamily="Inter, sans-serif">{dev.type}</text>
                {leftPorts.map((port:any,pi:number)=>{
                  const spacing = (dev.h-PORT_TOP_PAD)/(leftPorts.length+1);
                  const py = dev.y+panOffset.y+PORT_TOP_PAD+spacing*(pi+1);
                  const px = dev.x+panOffset.x;
                  const sig = SIGNAL_TYPES.find(s=>s.id===port.signal);
                  const isConn = connecting && connecting.portId!==port.id;
                  return (
                    <g key={port.id} onClick={(e)=>handlePortClick(e,dev,port)} style={{cursor:"pointer"}}>
                      <circle cx={px} cy={py} r={isConn?6:5} fill={sig?sig.color:"rgb(var(--text-subtle))"} stroke="rgb(var(--forge-surface))" strokeWidth={1.5} opacity={isConn?1:0.8} />
                      <text x={px+10} y={py+3} fontSize={8} fill="rgb(var(--text-muted))" fontFamily="'JetBrains Mono', monospace">{port.label}</text>
                    </g>
                  );
                })}
                {rightPorts.map((port:any,pi:number)=>{
                  const spacing = (dev.h-PORT_TOP_PAD)/(rightPorts.length+1);
                  const py = dev.y+panOffset.y+PORT_TOP_PAD+spacing*(pi+1);
                  const px = dev.x+panOffset.x+dev.w;
                  const sig = SIGNAL_TYPES.find(s=>s.id===port.signal);
                  const isConn = connecting && connecting.portId!==port.id;
                  return (
                    <g key={port.id} onClick={(e)=>handlePortClick(e,dev,port)} style={{cursor:"pointer"}}>
                      <circle cx={px} cy={py} r={isConn?6:5} fill={sig?sig.color:"rgb(var(--text-subtle))"} stroke="rgb(var(--forge-surface))" strokeWidth={1.5} opacity={isConn?1:0.8} />
                      <text x={px-10} y={py+3} fontSize={8} fill="rgb(var(--text-muted))" fontFamily="'JetBrains Mono', monospace" textAnchor="end">{port.label}</text>
                    </g>
                  );
                })}
              </g>
            );
          })}

          {devices.length===0 && (
            <text x="50%" y="50%" textAnchor="middle" fontSize={14} fill="rgb(var(--text-subtle))" fontFamily="Inter, sans-serif">Click devices from the library to add them to the canvas</text>
          )}

          {/* Pencil / Shape / Text annotations (above devices) */}
          {annotations.filter((a:any)=>a.type!=="highlight"&&a.id!==editingAnnotId).map(a=>renderAnnotation(a))}
          {liveAnnot && liveAnnot.type!=="highlight" && renderAnnotation(liveAnnot, true)}
        </svg>

        {/* Text tool overlay */}
        {textInput && (
          <>
            {/* Formatting toolbar */}
            <div data-texteditor="true" style={{position:"fixed",left:textInput.clientX,top:textInput.clientY-54,zIndex:10000,transform:"translateX(-50%)",display:"flex",alignItems:"center",gap:2,background:"rgb(var(--forge-panel))",border:"1px solid rgb(var(--border))",borderRadius:10,padding:"5px 8px",boxShadow:"0 2px 12px rgba(0,0,0,0.12)",whiteSpace:"nowrap"}}>
              <button onClick={()=>setTextFontSize(s=>Math.max(8,s-2))} style={{width:22,height:22,display:"flex",alignItems:"center",justifyContent:"center",background:"none",border:"none",color:"rgb(var(--text-subtle))",fontSize:16,cursor:"pointer",borderRadius:4}}>−</button>
              <span style={{fontSize:12,fontFamily:"monospace",color:"rgb(var(--text-body))",minWidth:24,textAlign:"center",userSelect:"none"}}>{textFontSize}</span>
              <button onClick={()=>setTextFontSize(s=>Math.min(72,s+2))} style={{width:22,height:22,display:"flex",alignItems:"center",justifyContent:"center",background:"none",border:"none",color:"rgb(var(--text-subtle))",fontSize:14,cursor:"pointer",borderRadius:4}}>+</button>
              <div style={{width:1,height:18,background:"rgb(var(--border))",margin:"0 3px"}}/>
              <button onClick={()=>setTextBold(b=>!b)} style={{width:26,height:26,display:"flex",alignItems:"center",justifyContent:"center",background:textBold?"rgba(59,130,246,0.12)":"none",border:`1px solid ${textBold?"#3b82f6":"transparent"}`,borderRadius:5,cursor:"pointer",fontWeight:700,fontSize:13,fontFamily:"Georgia,serif",color:textBold?"#3b82f6":"rgb(var(--text-body))"}}>B</button>
              <button onClick={()=>setTextItalic(i=>!i)} style={{width:26,height:26,display:"flex",alignItems:"center",justifyContent:"center",background:textItalic?"rgba(59,130,246,0.12)":"none",border:`1px solid ${textItalic?"#3b82f6":"transparent"}`,borderRadius:5,cursor:"pointer",fontStyle:"italic",fontSize:13,fontFamily:"Georgia,serif",color:textItalic?"#3b82f6":"rgb(var(--text-body))"}}>I</button>
              <div style={{width:1,height:18,background:"rgb(var(--border))",margin:"0 3px"}}/>
              {(["left","center","right"] as const).map(al=>(
                <button key={al} onClick={()=>setTextAlign(al)} title={`Align ${al}`} style={{width:26,height:26,display:"flex",alignItems:"center",justifyContent:"center",background:textAlign===al?"rgba(59,130,246,0.12)":"none",border:`1px solid ${textAlign===al?"#3b82f6":"transparent"}`,borderRadius:5,cursor:"pointer",padding:0}}>
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                    {al==="left"&&<><line x1="1" y1="2" x2="13" y2="2" stroke={textAlign===al?"#3b82f6":"rgb(var(--text-subtle))"} strokeWidth="1.4" strokeLinecap="round"/><line x1="1" y1="6" x2="9" y2="6" stroke={textAlign===al?"#3b82f6":"rgb(var(--text-subtle))"} strokeWidth="1.4" strokeLinecap="round"/><line x1="1" y1="10" x2="11" y2="10" stroke={textAlign===al?"#3b82f6":"rgb(var(--text-subtle))"} strokeWidth="1.4" strokeLinecap="round"/></>}
                    {al==="center"&&<><line x1="1" y1="2" x2="13" y2="2" stroke={textAlign===al?"#3b82f6":"rgb(var(--text-subtle))"} strokeWidth="1.4" strokeLinecap="round"/><line x1="3" y1="6" x2="11" y2="6" stroke={textAlign===al?"#3b82f6":"rgb(var(--text-subtle))"} strokeWidth="1.4" strokeLinecap="round"/><line x1="2" y1="10" x2="12" y2="10" stroke={textAlign===al?"#3b82f6":"rgb(var(--text-subtle))"} strokeWidth="1.4" strokeLinecap="round"/></>}
                    {al==="right"&&<><line x1="1" y1="2" x2="13" y2="2" stroke={textAlign===al?"#3b82f6":"rgb(var(--text-subtle))"} strokeWidth="1.4" strokeLinecap="round"/><line x1="5" y1="6" x2="13" y2="6" stroke={textAlign===al?"#3b82f6":"rgb(var(--text-subtle))"} strokeWidth="1.4" strokeLinecap="round"/><line x1="3" y1="10" x2="13" y2="10" stroke={textAlign===al?"#3b82f6":"rgb(var(--text-subtle))"} strokeWidth="1.4" strokeLinecap="round"/></>}
                  </svg>
                </button>
              ))}
              <div style={{width:1,height:18,background:"rgb(var(--border))",margin:"0 3px"}}/>
              {["#1e293b","#3b82f6","#ef4444","#10b981","#f59e0b","#a855f7"].map(c=>(
                <button key={c} onClick={()=>setToolColor(c)} style={{width:14,height:14,borderRadius:"50%",background:c,border:toolColor===c?"2px solid #3b82f6":"2px solid rgb(var(--border))",cursor:"pointer",padding:0,outline:"none",flexShrink:0}} />
              ))}
            </div>

            {/* Text input */}
            <div data-texteditor="true" style={{position:"fixed",left:textInput.clientX,top:textInput.clientY,zIndex:10000}}>
              <textarea
                ref={textareaRef}
                rows={1}
                value={textValue}
                onChange={e=>{textValueRef.current=e.target.value;setTextValue(e.target.value);e.target.style.height="auto";e.target.style.height=e.target.scrollHeight+"px";}}
                onKeyDown={e=>{e.stopPropagation();if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();commitText();}if(e.key==="Escape"){textInputRef.current=null;setTextInput(null);setTextValue("");setEditingAnnotId(null);editingAnnotIdRef.current=null;}}}
                style={{background:"rgb(var(--forge-panel))",border:"2px solid #3b82f6",borderRadius:6,outline:"none",fontSize:textFontSize,fontWeight:textBold?"700":"400",fontStyle:textItalic?"italic":"normal",textAlign,color:"rgb(var(--text-body))",fontFamily:"Inter,sans-serif",padding:"6px 10px",minWidth:140,resize:"none",overflow:"hidden",caretColor:"#3b82f6",boxShadow:"0 2px 12px rgba(59,130,246,0.2)",lineHeight:1.4}}
                placeholder="Type here…"
              />
            </div>
          </>
        )}

        {/* Signal type legend */}
        <div style={{position:"absolute",bottom:12,left:"50%",transform:"translateX(-50%)",display:"flex",gap:5,flexWrap:"wrap",justifyContent:"center",pointerEvents:"none"}}>
          {SIGNAL_TYPES.map(s=>(
            <span key={s.id} style={{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 9px",borderRadius:4,fontSize:9,background:"rgb(var(--forge-panel))",border:"1px solid rgb(var(--border))",color:s.color,whiteSpace:"nowrap"}}>
              <span style={{width:10,height:2,background:s.color,borderRadius:1,display:"inline-block",flexShrink:0}}></span>{s.name}
            </span>
          ))}
        </div>
      </div>

      {/* BOM Panel */}
      <BOMPanel
        collapsed={bomCollapsed}
        onToggle={() => setBomCollapsed(!bomCollapsed)}
        propertiesSlot={connections.length > 0 ? (
          <div>
            <div style={{padding:"14px 14px 6px",fontSize:10,fontWeight:700,color:"rgb(var(--text-subtle))",textTransform:"uppercase",letterSpacing:"0.06em"}}>Cable Schedule</div>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:10}}>
              <thead>
                <tr>
                  <th style={{padding:"5px 10px",textAlign:"left",color:"rgb(var(--text-subtle))",borderBottom:"1px solid rgb(var(--border))",fontWeight:600,fontSize:9,textTransform:"uppercase"}}>Cable</th>
                  <th style={{padding:"5px 6px",textAlign:"left",color:"rgb(var(--text-subtle))",borderBottom:"1px solid rgb(var(--border))",fontWeight:600,fontSize:9,textTransform:"uppercase"}}>From</th>
                  <th style={{padding:"5px 6px",textAlign:"left",color:"rgb(var(--text-subtle))",borderBottom:"1px solid rgb(var(--border))",fontWeight:600,fontSize:9,textTransform:"uppercase"}}>To</th>
                  <th style={{padding:"5px 6px",textAlign:"left",color:"rgb(var(--text-subtle))",borderBottom:"1px solid rgb(var(--border))",fontWeight:600,fontSize:9,textTransform:"uppercase"}}>Signal</th>
                </tr>
              </thead>
              <tbody>
                {generateCableSchedule().map((cable:any,i:number) => (
                  <tr key={i} style={{background:i%2===0?"transparent":"rgb(var(--forge-surface) / 0.3)"}}>
                    <td style={{padding:"5px 10px",color:"rgb(var(--text-muted))",borderBottom:"1px solid rgb(var(--border))",fontFamily:"'JetBrains Mono',monospace"}}>C{String(cable.id).padStart(2,"0")}</td>
                    <td style={{padding:"5px 6px",borderBottom:"1px solid rgb(var(--border))"}}>
                      <div style={{color:"rgb(var(--text-body))",fontSize:10}}>{cable.from}</div>
                      <div style={{color:"rgb(var(--text-subtle))",fontSize:9}}>{cable.fromPort}</div>
                    </td>
                    <td style={{padding:"5px 6px",borderBottom:"1px solid rgb(var(--border))"}}>
                      <div style={{color:"rgb(var(--text-body))",fontSize:10}}>{cable.to}</div>
                      <div style={{color:"rgb(var(--text-subtle))",fontSize:9}}>{cable.toPort}</div>
                    </td>
                    <td style={{padding:"5px 6px",borderBottom:"1px solid rgb(var(--border))"}}>
                      <span style={{display:"inline-flex",alignItems:"center",gap:3,color:cable.color,fontSize:10,fontWeight:500}}>
                        <span style={{width:8,height:2,background:cable.color,borderRadius:1,display:"inline-block"}}></span>{cable.signal}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      />
    </div>

    {/* Device Context Menu */}
    {deviceContextMenu && (
      <>
        <div style={{position:"fixed",inset:0,zIndex:100}} onClick={()=>setDeviceContextMenu(null)} onContextMenu={e=>{e.preventDefault();setDeviceContextMenu(null);}} />
        <div style={{position:"fixed",left:deviceContextMenu.x,top:deviceContextMenu.y,zIndex:101,background:"rgb(var(--forge-panel))",border:"1px solid rgb(var(--border))",borderRadius:6,boxShadow:"0 4px 20px rgba(0,0,0,0.35)",width:190,overflow:"hidden",padding:"4px 0"}}>
          <button onClick={()=>{
            const dev = devices.find((d:any)=>d.id===deviceContextMenu.deviceId);
            if(dev){setEditingDevice(dev);setEditDeviceName(dev.type||"");setEditDeviceMfr(dev.mfr||"");setEditDeviceModel(dev.model||"");setEditDevicePorts(dev.ports?dev.ports.map((p:any)=>({...p})):[]);}
            setDeviceContextMenu(null);
          }}
            style={{display:"flex",alignItems:"center",gap:9,width:"100%",padding:"7px 14px",background:"none",border:"none",color:"rgb(var(--text-body))",fontSize:12,cursor:"pointer",textAlign:"left"}}
            onMouseEnter={e=>e.currentTarget.style.background="rgb(var(--forge-surface))"} onMouseLeave={e=>e.currentTarget.style.background="none"}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Edit equipment
          </button>
          <div style={{height:1,background:"rgb(var(--border))",margin:"4px 0"}} />
          <button onClick={()=>{
            setConnections((prev:any[])=>prev.filter((c:any)=>c.from.deviceId!==deviceContextMenu.deviceId&&c.to.deviceId!==deviceContextMenu.deviceId));
            setDevices((prev:any[])=>prev.filter((d:any)=>d.id!==deviceContextMenu.deviceId));
            if(selected===deviceContextMenu.deviceId) setSelected(null);
            setDeviceContextMenu(null);
          }}
            style={{display:"flex",alignItems:"center",gap:9,width:"100%",padding:"7px 14px",background:"none",border:"none",color:"#f87171",fontSize:12,cursor:"pointer",textAlign:"left"}}
            onMouseEnter={e=>e.currentTarget.style.background="rgba(248,113,113,0.08)"} onMouseLeave={e=>e.currentTarget.style.background="none"}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
            Delete equipment
          </button>
        </div>
      </>
    )}

    {/* Edit Equipment Modal */}
    {editingDevice && (
      <div style={{position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.55)"}}
        onClick={()=>setEditingDevice(null)}>
        <div style={{width:520,background:"rgb(var(--forge-panel))",borderRadius:10,border:"1px solid rgb(var(--border))",boxShadow:"0 16px 48px rgba(0,0,0,0.5)",display:"flex",flexDirection:"column",maxHeight:"82vh",overflow:"hidden"}}
          onClick={e=>e.stopPropagation()}>
          {/* Header */}
          <div style={{padding:"16px 20px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:"1px solid rgb(var(--border))",flexShrink:0}}>
            <div style={{display:"flex",alignItems:"center",gap:9}}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--text-body))" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              <span style={{fontSize:14,fontWeight:700,color:"rgb(var(--text-body))"}}>Edit Equipment</span>
            </div>
            <button onClick={()=>setEditingDevice(null)} style={{background:"none",border:"none",color:"rgb(var(--text-subtle))",cursor:"pointer",fontSize:20,lineHeight:1,padding:"2px 4px"}}>×</button>
          </div>
          {/* Scrollable body */}
          <div style={{flex:1,overflowY:"auto",padding:"18px 20px",display:"flex",flexDirection:"column",gap:14}}>
            {/* Description */}
            <label style={{display:"flex",flexDirection:"column",gap:5,fontSize:12,color:"rgb(var(--text-subtle))"}}>
              Description
              <input autoFocus value={editDeviceName} onChange={e=>setEditDeviceName(e.target.value)}
                onKeyDown={e=>{if(e.key==="Escape")setEditingDevice(null);}}
                style={{padding:"9px 12px",background:"rgb(var(--forge-surface))",border:"1px solid rgb(var(--border))",borderRadius:6,color:"rgb(var(--text-body))",fontSize:13,outline:"none"}}
                onFocus={e=>e.target.style.borderColor="#3b82f6"} onBlur={e=>e.target.style.borderColor="rgb(var(--border))"}
              />
            </label>
            {/* Make / Model */}
            <div style={{display:"flex",gap:10}}>
              <label style={{flex:1,display:"flex",flexDirection:"column",gap:5,fontSize:12,color:"rgb(var(--text-subtle))"}}>
                Make
                <input value={editDeviceMfr} onChange={e=>setEditDeviceMfr(e.target.value)}
                  onKeyDown={e=>{if(e.key==="Escape")setEditingDevice(null);}}
                  style={{padding:"9px 12px",background:"rgb(var(--forge-surface))",border:"1px solid rgb(var(--border))",borderRadius:6,color:"rgb(var(--text-body))",fontSize:13,outline:"none"}}
                  onFocus={e=>e.target.style.borderColor="#3b82f6"} onBlur={e=>e.target.style.borderColor="rgb(var(--border))"}
                />
              </label>
              <label style={{flex:1,display:"flex",flexDirection:"column",gap:5,fontSize:12,color:"rgb(var(--text-subtle))"}}>
                Model
                <input value={editDeviceModel} onChange={e=>setEditDeviceModel(e.target.value)}
                  onKeyDown={e=>{if(e.key==="Escape")setEditingDevice(null);}}
                  style={{padding:"9px 12px",background:"rgb(var(--forge-surface))",border:"1px solid rgb(var(--border))",borderRadius:6,color:"rgb(var(--text-body))",fontSize:13,outline:"none"}}
                  onFocus={e=>e.target.style.borderColor="#3b82f6"} onBlur={e=>e.target.style.borderColor="rgb(var(--border))"}
                />
              </label>
            </div>
            {/* Ports */}
            <div>
              <div style={{fontSize:11,fontWeight:700,color:"rgb(var(--text-subtle))",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>Ports</div>
              <div style={{border:"1px solid rgb(var(--border))",borderRadius:6,overflow:"hidden"}}>
                {/* Left ports */}
                <div style={{padding:"10px 12px",background:"rgb(var(--forge-surface) / 0.4)"}}>
                  <div style={{fontSize:10,fontWeight:700,color:"rgb(var(--text-subtle))",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:7}}>Left</div>
                  {editDevicePorts.filter((p:any)=>p.side==="left").map((port:any)=>(
                    <div key={port.id} style={{display:"flex",alignItems:"center",gap:6,marginBottom:5}}>
                      <span style={{width:8,height:8,borderRadius:"50%",background:SIGNAL_TYPES.find(s=>s.id===port.signal)?.color||"#94a3b8",flexShrink:0}} />
                      <select value={port.signal} onChange={e=>setEditDevicePorts(prev=>prev.map((p:any)=>p.id===port.id?{...p,signal:e.target.value}:p))}
                        style={{padding:"3px 6px",background:"rgb(var(--forge-surface))",border:"1px solid rgb(var(--border))",borderRadius:4,color:"rgb(var(--text-body))",fontSize:11,outline:"none",cursor:"pointer"}}>
                        {SIGNAL_TYPES.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                      <select value={port.dir} onChange={e=>setEditDevicePorts(prev=>prev.map((p:any)=>p.id===port.id?{...p,dir:e.target.value}:p))}
                        style={{padding:"3px 6px",background:"rgb(var(--forge-surface))",border:"1px solid rgb(var(--border))",borderRadius:4,color:"rgb(var(--text-body))",fontSize:11,outline:"none",width:100,cursor:"pointer"}}>
                        <option value="in">In</option>
                        <option value="out">Out</option>
                        <option value="bi">Bidirectional</option>
                      </select>
                      <input value={port.label} onChange={e=>setEditDevicePorts(prev=>prev.map((p:any)=>p.id===port.id?{...p,label:e.target.value}:p))}
                        placeholder="Label"
                        style={{flex:1,padding:"3px 8px",background:"rgb(var(--forge-surface))",border:"1px solid rgb(var(--border))",borderRadius:4,color:"rgb(var(--text-body))",fontSize:11,outline:"none"}}
                        onFocus={e=>e.target.style.borderColor="#3b82f6"} onBlur={e=>e.target.style.borderColor="rgb(var(--border))"}
                      />
                      <button onClick={()=>setEditDevicePorts(prev=>prev.filter((p:any)=>p.id!==port.id))}
                        style={{background:"none",border:"none",color:"rgb(var(--text-muted))",cursor:"pointer",padding:"2px 5px",fontSize:15,lineHeight:1,flexShrink:0}}
                        onMouseEnter={e=>e.currentTarget.style.color="#ef4444"} onMouseLeave={e=>e.currentTarget.style.color="rgb(var(--text-muted))"}>×</button>
                    </div>
                  ))}
                  <button
                    onClick={()=>setEditDevicePorts(prev=>[...prev,{id:`new-${Date.now()}-${Math.random()}`,side:"left",signal:"hdmi",dir:"in",label:""}])}
                    style={{display:"flex",alignItems:"center",justifyContent:"center",gap:5,width:"100%",padding:"4px 0",marginTop:2,background:"none",border:"1px dashed rgb(var(--border))",borderRadius:4,color:"rgb(var(--text-subtle))",fontSize:11,cursor:"pointer"}}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor="#3b82f6";e.currentTarget.style.color="#3b82f6";}} onMouseLeave={e=>{e.currentTarget.style.borderColor="rgb(var(--border))";e.currentTarget.style.color="rgb(var(--text-subtle))";}}>
                    + Add Left Port
                  </button>
                </div>
                <div style={{height:1,background:"rgb(var(--border))"}} />
                {/* Right ports */}
                <div style={{padding:"10px 12px"}}>
                  <div style={{fontSize:10,fontWeight:700,color:"rgb(var(--text-subtle))",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:7}}>Right</div>
                  {editDevicePorts.filter((p:any)=>p.side==="right").map((port:any)=>(
                    <div key={port.id} style={{display:"flex",alignItems:"center",gap:6,marginBottom:5}}>
                      <span style={{width:8,height:8,borderRadius:"50%",background:SIGNAL_TYPES.find(s=>s.id===port.signal)?.color||"#94a3b8",flexShrink:0}} />
                      <select value={port.signal} onChange={e=>setEditDevicePorts(prev=>prev.map((p:any)=>p.id===port.id?{...p,signal:e.target.value}:p))}
                        style={{padding:"3px 6px",background:"rgb(var(--forge-surface))",border:"1px solid rgb(var(--border))",borderRadius:4,color:"rgb(var(--text-body))",fontSize:11,outline:"none",cursor:"pointer"}}>
                        {SIGNAL_TYPES.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                      <select value={port.dir} onChange={e=>setEditDevicePorts(prev=>prev.map((p:any)=>p.id===port.id?{...p,dir:e.target.value}:p))}
                        style={{padding:"3px 6px",background:"rgb(var(--forge-surface))",border:"1px solid rgb(var(--border))",borderRadius:4,color:"rgb(var(--text-body))",fontSize:11,outline:"none",width:100,cursor:"pointer"}}>
                        <option value="in">In</option>
                        <option value="out">Out</option>
                        <option value="bi">Bidirectional</option>
                      </select>
                      <input value={port.label} onChange={e=>setEditDevicePorts(prev=>prev.map((p:any)=>p.id===port.id?{...p,label:e.target.value}:p))}
                        placeholder="Label"
                        style={{flex:1,padding:"3px 8px",background:"rgb(var(--forge-surface))",border:"1px solid rgb(var(--border))",borderRadius:4,color:"rgb(var(--text-body))",fontSize:11,outline:"none"}}
                        onFocus={e=>e.target.style.borderColor="#3b82f6"} onBlur={e=>e.target.style.borderColor="rgb(var(--border))"}
                      />
                      <button onClick={()=>setEditDevicePorts(prev=>prev.filter((p:any)=>p.id!==port.id))}
                        style={{background:"none",border:"none",color:"rgb(var(--text-muted))",cursor:"pointer",padding:"2px 5px",fontSize:15,lineHeight:1,flexShrink:0}}
                        onMouseEnter={e=>e.currentTarget.style.color="#ef4444"} onMouseLeave={e=>e.currentTarget.style.color="rgb(var(--text-muted))"}>×</button>
                    </div>
                  ))}
                  <button
                    onClick={()=>setEditDevicePorts(prev=>[...prev,{id:`new-${Date.now()}-${Math.random()}`,side:"right",signal:"hdmi",dir:"out",label:""}])}
                    style={{display:"flex",alignItems:"center",justifyContent:"center",gap:5,width:"100%",padding:"4px 0",marginTop:2,background:"none",border:"1px dashed rgb(var(--border))",borderRadius:4,color:"rgb(var(--text-subtle))",fontSize:11,cursor:"pointer"}}
                    onMouseEnter={e=>{e.currentTarget.style.borderColor="#3b82f6";e.currentTarget.style.color="#3b82f6";}} onMouseLeave={e=>{e.currentTarget.style.borderColor="rgb(var(--border))";e.currentTarget.style.color="rgb(var(--text-subtle))";}}>
                    + Add Right Port
                  </button>
                </div>
              </div>
            </div>
          </div>
          {/* Footer */}
          <div style={{padding:"12px 20px",borderTop:"1px solid rgb(var(--border))",display:"flex",justifyContent:"flex-end",gap:10,flexShrink:0}}>
            <button onClick={()=>setEditingDevice(null)} style={{padding:"8px 18px",background:"transparent",border:"1px solid rgb(var(--border))",borderRadius:6,color:"rgb(var(--text-body))",fontSize:12,cursor:"pointer"}}>
              Cancel
            </button>
            <button
              disabled={!editDeviceName.trim()}
              onClick={()=>{
                const leftCount = editDevicePorts.filter((p:any)=>p.side==="left").length;
                const rightCount = editDevicePorts.filter((p:any)=>p.side==="right").length;
                const maxPorts = Math.max(leftCount, rightCount, 1);
                const newH = maxPorts <= 2 ? 56 : maxPorts <= 3 ? 70 : maxPorts <= 5 ? 80 : 90;
                const removedIds = new Set(editingDevice.ports.map((p:any)=>p.id).filter((id:string)=>!editDevicePorts.find((p:any)=>p.id===id)));
                if(removedIds.size>0) setConnections((prev:any[])=>prev.filter((c:any)=>!removedIds.has(c.from.portId)&&!removedIds.has(c.to.portId)));
                setDevices((prev:any[])=>prev.map((d:any)=>d.id===editingDevice.id?{...d,type:editDeviceName.trim()||d.type,mfr:editDeviceMfr.trim(),model:editDeviceModel.trim(),ports:editDevicePorts,h:newH}:d));
                setEditingDevice(null);
              }}
              style={{padding:"8px 18px",background:editDeviceName.trim()?"#3b82f6":"rgb(var(--forge-surface))",border:"1px solid "+(editDeviceName.trim()?"#3b82f6":"rgb(var(--border))"),borderRadius:6,color:editDeviceName.trim()?"#fff":"rgb(var(--text-subtle))",fontSize:12,cursor:editDeviceName.trim()?"pointer":"not-allowed",fontWeight:600,transition:"all 0.15s"}}>
              Save
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Add Equipment Modal */}
    {showAddModal && (
      <div style={{position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.55)"}}
        onClick={()=>{setShowAddModal(false);setModalSearch("");setModalSelected(null);setModalDeviceName("");setModalMake("");setModalModel("");}}>
        <div style={{width:560,background:"rgb(var(--forge-panel))",borderRadius:10,border:"1px solid rgb(var(--border))",boxShadow:"0 16px 48px rgba(0,0,0,0.5)",display:"flex",flexDirection:"column",maxHeight:"72vh",overflow:"hidden"}}
          onClick={e=>e.stopPropagation()}>

          {/* Header */}
          <div style={{padding:"16px 20px 14px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
            <div style={{display:"flex",alignItems:"center",gap:9}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgb(var(--text-body))" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
              </svg>
              <span style={{fontSize:15,fontWeight:700,color:"rgb(var(--text-body))"}}>Add Equipment</span>
            </div>
            <button onClick={()=>{setShowAddModal(false);setModalSearch("");setModalSelected(null);setModalDeviceName("");setModalMake("");setModalModel("");}}
              style={{background:"none",border:"none",color:"rgb(var(--text-subtle))",cursor:"pointer",fontSize:20,lineHeight:1,padding:"2px 4px"}}>×</button>
          </div>

          {/* Search bar */}
          <div style={{padding:"0 20px 14px",flexShrink:0}}>
            <div style={{display:"flex",gap:0}}>
              <input autoFocus value={modalSearch} onChange={e=>{setModalSearch(e.target.value);setModalSelected(null);}}
                placeholder="Search by Make, Model, Part#..."
                style={{flex:1,padding:"9px 14px",background:"rgb(var(--forge-surface))",border:"1px solid rgb(var(--border))",borderRight:"none",borderRadius:"6px 0 0 6px",color:"rgb(var(--text-body))",fontSize:12,outline:"none"}}
              />
              <button style={{padding:"9px 14px",background:"rgb(var(--forge-surface))",border:"1px solid rgb(var(--border))",borderRadius:"0 6px 6px 0",cursor:"pointer",color:"rgb(var(--text-subtle))"}}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Search results (only when searching) */}
          {modalSearch.trim() && (
            <div style={{maxHeight:220,overflowY:"auto",margin:"0 20px",marginBottom:8,border:"1px solid rgb(var(--border))",borderRadius:6,background:"rgb(var(--forge-surface) / 0.4)"}}>
              {modalLoading ? (
                <div style={{padding:"14px",textAlign:"center",color:"rgb(var(--text-subtle))",fontSize:12}}>Searching…</div>
              ) : modalResults.length === 0 ? (
                <div style={{padding:"14px",textAlign:"center",color:"rgb(var(--text-subtle))",fontSize:12}}>No results for &ldquo;{modalSearch}&rdquo;</div>
              ) : modalResults.map((item:any,i:number)=>{
                const isSel = modalSelected===item;
                return (
                  <div key={i} onClick={()=>setModalSelected(isSel?null:item)}
                    style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",cursor:"pointer",borderBottom:i<modalResults.length-1?"1px solid rgb(var(--border))":"none",background:isSel?"rgba(59,130,246,0.1)":"transparent",transition:"background 0.1s"}}
                    onMouseEnter={e=>{if(!isSel)e.currentTarget.style.background="rgb(var(--forge-surface))"}} onMouseLeave={e=>{if(!isSel)e.currentTarget.style.background="transparent"}}>
                    <div style={{width:8,height:8,borderRadius:2,background:item.color,flexShrink:0}} />
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,color:"rgb(var(--text-body))",fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.type}</div>
                      <div style={{fontSize:10,color:"rgb(var(--text-subtle))"}}>{item.mfr||"Generic"}{item.cat?" · "+item.cat:""}</div>
                    </div>
                    {isSel && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                  </div>
                );
              })}
            </div>
          )}

          {/* OR ADD MANUALLY divider */}
          <div style={{display:"flex",alignItems:"center",gap:12,padding:"4px 20px 14px",flexShrink:0}}>
            <div style={{flex:1,height:1,background:"rgb(var(--border))"}} />
            <span style={{fontSize:10,fontWeight:700,letterSpacing:"0.08em",color:"rgb(var(--text-subtle))",textTransform:"uppercase",whiteSpace:"nowrap"}}>Or Create New</span>
            <div style={{flex:1,height:1,background:"rgb(var(--border))"}} />
          </div>

          {/* Manual fields */}
          <div style={{display:"flex",gap:10,padding:"0 20px 18px",flexShrink:0,minWidth:0}}>
            <input value={modalDeviceName} onChange={e=>setModalDeviceName(e.target.value)}
              placeholder="Description"
              style={{flex:2,minWidth:0,padding:"9px 12px",background:"rgb(var(--forge-surface))",border:"1px solid rgb(var(--border))",borderRadius:6,color:"rgb(var(--text-body))",fontSize:12,outline:"none",boxSizing:"border-box"}}
            />
            <input value={modalMake} onChange={e=>setModalMake(e.target.value)}
              placeholder="Make"
              style={{flex:1,minWidth:0,padding:"9px 12px",background:"rgb(var(--forge-surface))",border:"1px solid rgb(var(--border))",borderRadius:6,color:"rgb(var(--text-body))",fontSize:12,outline:"none",boxSizing:"border-box"}}
            />
            <input value={modalModel} onChange={e=>setModalModel(e.target.value)}
              placeholder="Model"
              style={{flex:1,minWidth:0,padding:"9px 12px",background:"rgb(var(--forge-surface))",border:"1px solid rgb(var(--border))",borderRadius:6,color:"rgb(var(--text-body))",fontSize:12,outline:"none",boxSizing:"border-box"}}
            />
          </div>

          {/* Footer */}
          <div style={{padding:"12px 20px",borderTop:"1px solid rgb(var(--border))",display:"flex",justifyContent:"flex-end",gap:10,flexShrink:0}}>
            <button onClick={()=>{setShowAddModal(false);setModalSearch("");setModalSelected(null);setModalDeviceName("");setModalMake("");setModalModel("");}}
              style={{padding:"8px 18px",background:"transparent",border:"1px solid rgb(var(--border))",borderRadius:6,color:"rgb(var(--text-body))",fontSize:12,cursor:"pointer"}}>
              Cancel
            </button>
            <button
              disabled={!modalSelected && !modalDeviceName.trim()}
              onClick={()=>{
                if(modalSelected) { addDevice(modalSelected); }
                else if(modalDeviceName.trim()) {
                  addDevice({type:modalDeviceName.trim(),mfr:modalMake.trim()||"Generic",model:modalModel.trim(),color:"#64748b",ports:[],cat:"Custom",w:Math.max(120,modalDeviceName.length*7+30),h:56});
                }
                setShowAddModal(false);setModalSearch("");setModalSelected(null);setModalDeviceName("");setModalMake("");setModalModel("");
              }}
              style={{padding:"8px 18px",background:(!modalSelected&&!modalDeviceName.trim())?"rgb(var(--forge-surface))":"#3b82f6",border:"1px solid "+((!modalSelected&&!modalDeviceName.trim())?"rgb(var(--border))":"#3b82f6"),borderRadius:6,color:(!modalSelected&&!modalDeviceName.trim())?"rgb(var(--text-subtle))":"#fff",fontSize:12,cursor:(!modalSelected&&!modalDeviceName.trim())?"not-allowed":"pointer",fontWeight:600,transition:"all 0.15s"}}>
              + Add
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Context Menu */}
    {contextMenu && (
      <>
        <div style={{position:"fixed",inset:0,zIndex:100}} onClick={()=>setContextMenu(null)} onContextMenu={e=>{e.preventDefault();setContextMenu(null);}} />
        <div style={{position:"fixed",left:contextMenu.x,top:contextMenu.y,zIndex:101,background:"rgb(var(--forge-panel))",border:"1px solid rgb(var(--border))",borderRadius:6,boxShadow:"0 4px 20px rgba(0,0,0,0.35)",width:200,overflow:"hidden",padding:"4px 0"}}>
          <button onClick={()=>{setEditingRoom(contextMenu.roomId);setContextMenu(null);}}
            style={{display:"flex",alignItems:"center",gap:9,width:"100%",padding:"7px 14px",background:"none",border:"none",color:"rgb(var(--text-body))",fontSize:12,cursor:"pointer",textAlign:"left"}}
            onMouseEnter={e=>e.currentTarget.style.background="rgb(var(--forge-surface))"} onMouseLeave={e=>e.currentTarget.style.background="none"}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Edit Label
          </button>
          <button onClick={()=>setContextMenu(prev=>prev?{...prev,showColors:!prev.showColors}:prev)}
            style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:9,width:"100%",padding:"7px 14px",background:contextMenu.showColors?"rgb(var(--forge-surface))":"none",border:"none",color:"rgb(var(--text-body))",fontSize:12,cursor:"pointer",textAlign:"left"}}
            onMouseEnter={e=>{if(!contextMenu.showColors)e.currentTarget.style.background="rgb(var(--forge-surface))"}} onMouseLeave={e=>{if(!contextMenu.showColors)e.currentTarget.style.background="none"}}>
            <span style={{display:"flex",alignItems:"center",gap:9}}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 3C12 3 7 8 7 12s5 9 5 9 5-4 5-9-5-9-5-9z"/></svg>
              Change Color
            </span>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{opacity:0.4,transform:contextMenu.showColors?"rotate(90deg)":"none",transition:"transform 0.15s"}}>
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
          {contextMenu.showColors && (
            <div style={{padding:"6px 14px 10px",display:"flex",flexWrap:"wrap",gap:7}}>
              {roomColors.map(color=>{
                const current = rooms.find((r:any)=>r.id===contextMenu.roomId)?.color;
                return (
                  <button key={color} onClick={()=>{setRoomColor(contextMenu.roomId,color);setContextMenu(null);}}
                    title={color}
                    style={{width:22,height:22,borderRadius:"50%",background:color,border:current===color?"2px solid #fff":"2px solid transparent",outline:current===color?"2px solid "+color:"none",cursor:"pointer",padding:0,transition:"transform 0.1s",flexShrink:0}}
                    onMouseEnter={e=>e.currentTarget.style.transform="scale(1.2)"} onMouseLeave={e=>e.currentTarget.style.transform="scale(1)"} />
                );
              })}
            </div>
          )}
          <div style={{height:1,background:"rgb(var(--border))",margin:"4px 0"}} />
          <button onClick={()=>{deleteRoom(contextMenu.roomId);setContextMenu(null);}}
            style={{display:"flex",alignItems:"center",gap:9,width:"100%",padding:"7px 14px",background:"none",border:"none",color:"#f87171",fontSize:12,cursor:"pointer",textAlign:"left"}}
            onMouseEnter={e=>e.currentTarget.style.background="rgba(248,113,113,0.08)"} onMouseLeave={e=>e.currentTarget.style.background="none"}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
            Delete Location
          </button>
        </div>
      </>
    )}
    </div>
  );
}
