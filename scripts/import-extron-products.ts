import dotenv from "dotenv";
import * as XLSX from "xlsx";
import { createClient } from "@supabase/supabase-js";
import { parseProductRows } from "../lib/product-import";

dotenv.config({path:".env.local"});
async function main(){
  const commit=process.argv.includes("--commit");
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url||!key)throw new Error("Missing Supabase URL or service-role key");

const workbook=XLSX.readFile("data/1. Extron Devices.xlsx");
const sheet=workbook.Sheets[workbook.SheetNames[0]];
const rows=XLSX.utils.sheet_to_json(sheet,{header:1,raw:false,defval:"",blankrows:false}) as unknown[][];
const {products,errors}=parseProductRows(rows);
const deduped=Array.from(new Map(products.map(product=>[`${product.manufacturer}::${product.model_name}`,product])).values());
if(errors.length)throw new Error(`Parser returned ${errors.length} warning(s): ${errors.slice(0,5).join("; ")}`);
const keyCounts=new Map<string,number>();
for(const product of products){const key=`${product.manufacturer}::${product.model_name}`;keyCounts.set(key,(keyCounts.get(key)??0)+1);}
const duplicateKeys=[...keyCounts].filter(([,count])=>count>1).map(([key,count])=>`${key} (${count})`);
if(deduped.length!==products.length)console.warn(`Deduplicating ${products.length-deduped.length} row(s): ${duplicateKeys.join(", ")}`);

const supabase=createClient(url,key,{auth:{persistSession:false}});
const schemaCheck=await supabase.from("av_products").select("id,part_number,voltage_detail,current_detail").limit(1);
if(schemaCheck.error)throw new Error(`Database migration 010 is not applied: ${schemaCheck.error.message}`);

if(!commit){
  console.log(JSON.stringify({mode:"dry-run",products:deduped.length,rackMounted:deduped.filter(product=>product.rack_mounted).length,withPower:deduped.filter(product=>product.power_watts!=null).length},null,2));
  process.exit(0);
}

let imported=0;
for(let index=0;index<deduped.length;index+=100){
  const batch=deduped.slice(index,index+100);
  const {data,error}=await supabase.from("av_products").upsert(batch,{onConflict:"manufacturer,model_name"}).select("id");
  if(error)throw new Error(`Import failed at row ${index+2}: ${error.message}`);
  imported+=data?.length??0;
}
console.log(JSON.stringify({mode:"commit",imported},null,2));
}

main().catch(error=>{console.error(error instanceof Error?error.message:error);process.exit(1);});
