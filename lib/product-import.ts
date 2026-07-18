import type { AVProduct } from "@/lib/av-products";

type ImportProduct = Omit<AVProduct,"id">;

const text=(value:unknown)=>String(value??"").trim();
const numeric=(value:unknown)=>{
  const match=text(value).replace(/,/g,"").match(/-?\d+(?:\.\d+)?/);
  return match?Number(match[0]):null;
};
const yes=(value:unknown)=>/^(yes|true|1)\b/i.test(text(value));

function inferSignal(connector:string,label:string){
  const value=`${connector} ${label}`.toLowerCase();
  if(value.includes("dante"))return "dante";
  if(value.includes("hdmi"))return "hdmi";
  if(value.includes("usb"))return "usb";
  if(value.includes("sdi")||value.includes("bnc"))return "sdi";
  if(value.includes("speaker")||value.includes("spkr")||value.includes("70v")||value.includes("100v"))return "speaker";
  if(value.includes("fiber")||value.includes("sfp"))return "fiber";
  if(/rs-?232|rs-?422|ir\b|relay|control|gpio|com\b/.test(value))return "control";
  if(/audio|mic|line|xlr|rca|captive screw/.test(value))return "analog";
  if(/rj-?45|network|ethernet|lan\b|dtp|xtp|nav|stream|ip\b/.test(value))return "cat6";
  return "analog";
}

function parsePorts(value:unknown,rowNumber:number,errors:string[]):AVProduct["ports"]{
  return text(value).split("|").map(entry=>entry.trim()).filter(Boolean).map(entry=>{
    const parts=entry.split(":").map(part=>part.trim());
    if(parts.length<3){errors.push(`Row ${rowNumber}: invalid port "${entry}"`);return null;}
    const side=parts[0].toLowerCase()==="right"?"right":"left";
    if(parts.length>=4&&["in","out","bi"].includes(parts[2].toLowerCase())){
      return {side,signal:parts[1].toLowerCase(),dir:parts[2].toLowerCase(),label:parts.slice(3).join(":")};
    }
    const connector=parts[1];
    const label=parts.slice(2).join(":");
    return {side,signal:inferSignal(connector,label),dir:side==="left"?"in":"out",label};
  }).filter(Boolean) as AVProduct["ports"];
}

export function parseProductRows(rows:unknown[][]):{products:ImportProduct[];errors:string[]}{
  const products:ImportProduct[]=[];
  const errors:string[]=[];
  if(rows.length<2)return {products,errors:["File has no data rows"]};
  const headers=rows[0].map(value=>text(value).toLowerCase());
  const col=(...names:string[])=>headers.findIndex(header=>names.some(name=>header===name.toLowerCase()));
  const indexes={
    category:col("category"),type:col("type"),manufacturer:col("manufacturer"),model:col("model"),part:col("part","part number"),
    msrp:col("msrp"),cost:col("cost"),price:col("price"),margin:col("margin"),markup:col("markup"),color:col("color"),ports:col("ports"),
    height:col("height","heightin"),width:col("width","widthin"),depth:col("depth","depthin"),diameter:col("diameter","diameterin"),weight:col("weight","weightlb"),
    rackMounted:col("rack mountable","rackmounted"),rackEar:col("rack ear included"),shelf:col("shelf requirement"),rackUnits:col("rack units","rackunits"),
    voltage:col("voltage","volt"),amps:col("current (amps)","current","amp"),watts:col("power consumption","watts"),btu:col("btu/hr","btu"),
    powerSupply:col("power supply type"),notes:col("notes"),
  };
  if(indexes.type<0&&indexes.model<0)return {products,errors:["Missing required Type or Model column"]};
  if(indexes.ports<0)return {products,errors:["Missing required Ports column"]};
  for(let rowIndex=1;rowIndex<rows.length;rowIndex++){
    const row=rows[rowIndex];
    const get=(index:number)=>index>=0?text(row[index]):"";
    const model=get(indexes.model);
    const explicitType=get(indexes.type);
    if(!explicitType&&!model)continue;
    const manufacturer=get(indexes.manufacturer)||"Generic";
    const type=explicitType||[manufacturer,model].filter(Boolean).join(" ");
    const msrp=numeric(get(indexes.msrp));
    const explicitPrice=numeric(get(indexes.price));
    const rackDetail=get(indexes.rackMounted);
    const rackEarDetail=get(indexes.rackEar);
    const shelfDetail=get(indexes.shelf);
    const voltageDetail=get(indexes.voltage);
    const currentDetail=get(indexes.amps);
    products.push({
      manufacturer,model_name:model||type,category:get(indexes.category)||"Other",type,
      price:explicitPrice??msrp??0,part_number:get(indexes.part)||null,msrp,cost:numeric(get(indexes.cost)),margin:numeric(get(indexes.margin)),markup:numeric(get(indexes.markup)),
      color:get(indexes.color)||"#64748b",ports:parsePorts(get(indexes.ports),rowIndex+1,errors),
      amp_draw:numeric(currentDetail),voltage:numeric(voltageDetail),power_watts:numeric(get(indexes.watts)),btu_hr:numeric(get(indexes.btu)),
      rack_mounted:yes(rackDetail),rack_units:numeric(get(indexes.rackUnits)),width_in:numeric(get(indexes.width)),height_in:numeric(get(indexes.height)),depth_in:numeric(get(indexes.depth)),
      diameter_in:numeric(get(indexes.diameter)),weight_lb:numeric(get(indexes.weight)),rack_mountable_detail:rackDetail||null,rack_ear_included:rackEarDetail?yes(rackEarDetail):null,rack_ear_detail:rackEarDetail||null,
      shelf_required:shelfDetail?yes(shelfDetail):null,shelf_requirement:shelfDetail||null,voltage_detail:voltageDetail||null,current_detail:currentDetail||null,power_supply_type:get(indexes.powerSupply)||null,notes:get(indexes.notes)||null,
      rd_type:null,rd_wall:null,rd_width_ft:null,rd_height_ft:null,rd_icon:null,
    });
  }
  return {products,errors};
}
