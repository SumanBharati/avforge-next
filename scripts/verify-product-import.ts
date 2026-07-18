import * as XLSX from "xlsx";
import { parseProductRows } from "../lib/product-import";

for(const file of ["data/1. Extron Devices_old.xlsx","data/1. Extron Devices.xlsx"]){
  const workbook=XLSX.readFile(file);
  const sheet=workbook.Sheets[workbook.SheetNames[0]];
  const rows=XLSX.utils.sheet_to_json(sheet,{header:1,raw:false,defval:"",blankrows:false}) as unknown[][];
  const result=parseProductRows(rows);
  const signalCounts=new Map<string,number>();
  for(const product of result.products)for(const port of product.ports)signalCounts.set(port.signal,(signalCounts.get(port.signal)??0)+1);
  const invalidPorts=result.products.flatMap(product=>product.ports.filter(port=>!['hdmi','dante','usb','cat6','analog','speaker','control','fiber','sdi'].includes(port.signal)).map(port=>`${product.model_name}:${port.signal}`));
  console.log(JSON.stringify({file,products:result.products.length,warnings:result.errors.length,rackMounted:result.products.filter(product=>product.rack_mounted).length,withPower:result.products.filter(product=>product.power_watts!=null).length,withPartNumber:result.products.filter(product=>product.part_number).length,totalPorts:result.products.reduce((sum,product)=>sum+product.ports.length,0),signals:Object.fromEntries(signalCounts),invalidPorts:invalidPorts.slice(0,10),sample:result.products[0]},null,2));
}
