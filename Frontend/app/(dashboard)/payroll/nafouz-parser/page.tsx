"use client";

import React, { useState, useRef, useEffect } from "react";
import { Upload, Download, FileSpreadsheet, CheckCircle2, ChevronLeft, MapPin } from "lucide-react";
import Link from "next/link";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { insforge } from "@/lib/insforge";

export default function NafouzParser() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [outputBlob, setOutputBlob] = useState<Blob | null>(null);
  const [outputFileName, setOutputFileName] = useState("Salary Sheet Nafouz.xlsx");
  const [region, setRegion] = useState<"Abha" | "RUH">("Abha");
  const [workersMap, setWorkersMap] = useState<Record<string, string>>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Pre-fetch all workers to map Iqama by emp_id (Courier ID)
    const fetchWorkers = async () => {
      const { data } = await insforge.database.from("workers").select("emp_id, iqama_no");
      if (data) {
        const map: Record<string, string> = {};
        data.forEach(w => {
          if (w.emp_id && w.iqama_no) {
            map[w.emp_id.toString().trim()] = w.iqama_no;
          }
        });
        setWorkersMap(map);
      }
    };
    fetchWorkers();
  }, []);

  const handleFileDrop = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setOutputBlob(null);
    }
  };

  const processFile = async () => {
    if (!file) return;
    setIsProcessing(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const wb = XLSX.read(arrayBuffer, { type: "array" });

      // Usually it's the first sheet, or named "ksa_payable"
      const sheetName = wb.SheetNames.includes("ksa_payable") ? "ksa_payable" : wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

      if (rawData.length < 4) {
        throw new Error("Invalid file format. Expected KSA Payable format with headers at row 3.");
      }

      // Extract basic values
      let basicSalary = 2000;
      if (rawData[0] && rawData[0][0] === "SPO" && rawData[0][1]) {
        basicSalary = Number(rawData[0][1]) || 2000;
      }

      // The header is at index 2
      const headers = rawData[2];
      const courierIdIndex = headers.indexOf("Courier ID");
      const courierNameIndex = headers.indexOf("Courier name");
      const deliveredIndex = headers.indexOf("Delivered Orders");
      const statusIndex = headers.indexOf("Is Valid");
      const deductionIndex = headers.indexOf("Deduction");
      const foodCompIndex = headers.indexOf("food compensation");

      if (courierIdIndex === -1 || deliveredIndex === -1) {
        throw new Error("Missing required columns (Courier ID, Delivered Orders) in the input file.");
      }

      const outHeaders = [
        "Region", "id", "Id name", "Real Rider Name", "ID User Iqama", "Business Unit", 
        "Designation", "Location", "VENDOR", "Basic Salary", "Order Delivered", 
        "Delivered by Reliver", "Total Orders", "OT Orders", "Status", "Salary", 
        "Incentive from nafouz", "Net bill", "Total Salary", "Iqama Renewal", 
        "Traffic violation", "Vehicle Repairing Cost", "Driving License Cost", 
        "Advance Amount", "Deduction", "food compensation", "Total Payable", 
        "IBAN", "Signature", "Salary Status"
      ];

      const outData: any[][] = [outHeaders];

      // Process rows starting from index 3
      for (let i = 3; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || row.length === 0 || !row[courierIdIndex]) continue;

        const cId = String(row[courierIdIndex]).trim();
        const cName = row[courierNameIndex] || "";
        const orders = Number(row[deliveredIndex]) || 0;
        const status = row[statusIndex] || "";
        const deduction = Number(row[deductionIndex]) || 0;
        let foodCompStr = String(row[foodCompIndex] || "0").replace(/[^0-9.-]+/g, "");
        const foodComp = Math.round(Number(foodCompStr) || 0);

        const otOrders = orders - 350;
        
        let salary = 0;
        if (otOrders > 0) {
          salary = basicSalary + (otOrders * 5);
        } else {
          salary = Math.round((basicSalary / 350) * orders);
        }

        const netBill = 200;
        const incentive = 0;
        const totalSalary = salary + incentive + netBill;
        
        const iqama = workersMap[cId] || "";

        const outRow = Array(outHeaders.length).fill("");
        
        outRow[0] = region; // Region
        outRow[1] = cId; // id
        outRow[2] = cName.toUpperCase(); // Id name
        outRow[3] = cName.toUpperCase(); // Real Rider Name
        outRow[4] = iqama; // ID User Iqama
        outRow[5] = "Keeta"; // Business Unit
        outRow[6] = "Driver"; // Designation
        outRow[7] = region; // Location
        outRow[8] = "SPO"; // VENDOR
        outRow[9] = basicSalary; // Basic Salary
        outRow[10] = orders; // Order Delivered
        outRow[11] = ""; // Delivered by Reliver
        outRow[12] = orders; // Total Orders
        outRow[13] = otOrders; // OT Orders
        outRow[14] = status; // Status
        outRow[15] = salary; // Salary
        outRow[16] = incentive; // Incentive from nafouz
        outRow[17] = netBill; // Net bill
        outRow[18] = totalSalary; // Total Salary
        outRow[19] = 0; // Iqama Renewal
        outRow[20] = ""; // Traffic violation
        outRow[21] = ""; // Vehicle Repairing Cost
        outRow[22] = ""; // Driving License Cost
        outRow[23] = ""; // Advance Amount
        outRow[24] = deduction; // Deduction
        outRow[25] = foodComp; // food compensation
        
        // Total Payable = Total Salary + Deduction + food compensation + ...
        // We leave the formula logic out and just sum what we know
        const totalPayable = totalSalary + deduction + foodComp;
        outRow[26] = totalPayable; // Total Payable
        
        outRow[27] = ""; // IBAN
        outRow[28] = ""; // Signature
        outRow[29] = ""; // Salary Status

        outData.push(outRow);
      }

      const newWs = XLSX.utils.aoa_to_sheet(outData);
      const newWb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(newWb, newWs, "Sheet1");

      const excelBuffer = XLSX.write(newWb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      
      setOutputBlob(blob);
      const dateStr = new Date().toISOString().slice(0, 7).toUpperCase();
      setOutputFileName(`${region.toUpperCase()}_Keeta Salary Sheet Nafouz - ${dateStr}.xlsx`);
      toast.success("File processed successfully!");

    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to process the file.");
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadFile = () => {
    if (!outputBlob) return;
    const url = URL.createObjectURL(outputBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = outputFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-8 max-w-[1000px] mx-auto space-y-8 animate-in fade-in">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/payroll" className="p-2 hover:bg-white/10 rounded-full transition-colors text-zinc-400">
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <FileSpreadsheet className="w-8 h-8 text-blue-500" />
            Nafouz Salary Sheet Generator
          </h1>
          <p className="text-zinc-400 mt-1">
            Convert KSA Payable format (Keeta_ABha / Keeta_Ruh) into Nafouz Final Salary Sheet.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="glass p-8 rounded-[2rem] border border-white/5 space-y-6">
          <h2 className="text-xl font-bold text-white mb-4">1. Region Settings</h2>
          
          <div className="flex gap-4">
            <button
              onClick={() => setRegion("Abha")}
              className={`flex-1 py-4 rounded-xl border flex items-center justify-center gap-2 font-bold transition-all ${
                region === "Abha" 
                  ? "bg-blue-600/20 border-blue-500 text-blue-400" 
                  : "bg-black/20 border-white/10 text-zinc-400 hover:bg-white/5"
              }`}
            >
              <MapPin className="w-5 h-5" /> ABHA
            </button>
            <button
              onClick={() => setRegion("RUH")}
              className={`flex-1 py-4 rounded-xl border flex items-center justify-center gap-2 font-bold transition-all ${
                region === "RUH" 
                  ? "bg-blue-600/20 border-blue-500 text-blue-400" 
                  : "bg-black/20 border-white/10 text-zinc-400 hover:bg-white/5"
              }`}
            >
              <MapPin className="w-5 h-5" /> RUYADH (RUH)
            </button>
          </div>

          <h2 className="text-xl font-bold text-white mt-8 mb-4">2. Upload KSA Payable</h2>
          <div 
             className="border-2 border-dashed border-white/20 rounded-2xl p-8 text-center hover:border-blue-500/50 hover:bg-blue-500/5 transition-all cursor-pointer"
             onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-10 h-10 text-zinc-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white">
              {file ? file.name : "Select Keeta_ABha.xlsx"}
            </h3>
            <p className="text-sm text-zinc-400 mt-2">
              {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : "Click to browse"}
            </p>
            <input 
              type="file" 
              accept=".xlsx,.xls" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileDrop} 
            />
          </div>

          <button
            onClick={processFile}
            disabled={!file || isProcessing}
            className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white font-bold transition-all"
          >
            {isProcessing ? "Processing..." : "Generate Nafouz Sheet"}
          </button>
        </div>

        <div className="glass p-8 rounded-[2rem] border border-white/5 flex flex-col items-center justify-center text-center space-y-6">
          {outputBlob ? (
            <div className="animate-in zoom-in-95 duration-500">
              <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/30">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Ready for Download</h2>
              <p className="text-zinc-400 mb-8 max-w-sm">
                The Nafouz structural template has been generated with salary logic calculated.
              </p>
              <button
                onClick={downloadFile}
                className="px-8 py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all flex items-center gap-2 mx-auto shadow-lg shadow-emerald-500/20"
              >
                <Download className="w-5 h-5" /> Download Nafouz Sheet
              </button>
            </div>
          ) : (
            <div className="opacity-50">
              <FileSpreadsheet className="w-20 h-20 text-zinc-600 mx-auto mb-6" />
              <h2 className="text-xl font-bold text-white mb-2">No Output Yet</h2>
              <p className="text-zinc-400 max-w-sm">
                Upload and process a file to generate the final Nafouz Salary Sheet.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
