"use client";

import React, { useState, useRef } from "react";
import { Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2, ChevronLeft } from "lucide-react";
import Link from "next/link";
import * as XLSX from "xlsx";
import { toast } from "sonner";

export default function KeetaRawParser() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [outputBlob, setOutputBlob] = useState<Blob | null>(null);
  const [spoValue, setSpoValue] = useState<number>(2000);
  const [outValue, setOutValue] = useState<number>(5500);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

      // Find the 'riderDetail' sheet
      const sheetName = "riderDetail";
      if (!wb.SheetNames.includes(sheetName)) {
        throw new Error(`Sheet "${sheetName}" not found in the uploaded file.`);
      }

      const ws = wb.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

      if (rawData.length === 0) {
        throw new Error("The riderDetail sheet is empty.");
      }

      // Prepare the new data array
      const newData: any[][] = [];
      
      // Append the custom headers
      newData.push(["SPO", spoValue]);
      newData.push(["OUT", outValue]);

      // Append the original data (which includes the headers at index 0)
      for (const row of rawData) {
        newData.push(row);
      }

      // Create new workbook and worksheet
      const newWs = XLSX.utils.aoa_to_sheet(newData);
      const newWb = XLSX.utils.book_new();
      
      // Keeta system expects the sheet to be named "ksa_payable"
      XLSX.utils.book_append_sheet(newWb, newWs, "ksa_payable");

      // Generate Excel file buffer
      const excelBuffer = XLSX.write(newWb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      
      setOutputBlob(blob);
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
    a.download = "Keeta.xlsx";
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
            <FileSpreadsheet className="w-8 h-8 text-purple-500" />
            Keeta Raw File Parser
          </h1>
          <p className="text-zinc-400 mt-1">
            Upload the raw slab mode bill file to generate the KSA payable format.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="glass p-8 rounded-[2rem] border border-white/5 space-y-6">
          <h2 className="text-xl font-bold text-white mb-4">1. Configuration</h2>
          
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-2">SPO Value</label>
              <input 
                type="number" 
                value={spoValue}
                onChange={(e) => setSpoValue(Number(e.target.value))}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500 transition-colors"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-2">OUT Value</label>
              <input 
                type="number" 
                value={outValue}
                onChange={(e) => setOutValue(Number(e.target.value))}
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-purple-500 transition-colors"
              />
            </div>
          </div>

          <h2 className="text-xl font-bold text-white mt-8 mb-4">2. Upload Raw File</h2>
          <div 
             className="border-2 border-dashed border-white/20 rounded-2xl p-8 text-center hover:border-purple-500/50 hover:bg-purple-500/5 transition-all cursor-pointer"
             onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-10 h-10 text-zinc-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white">
              {file ? file.name : "Select XLSX File"}
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
            className="w-full py-4 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:hover:bg-purple-600 text-white font-bold transition-all"
          >
            {isProcessing ? "Processing..." : "Generate KSA Payable File"}
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
                The file has been successfully parsed and formatted. It's ready to be used in the payroll module.
              </p>
              <button
                onClick={downloadFile}
                className="px-8 py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all flex items-center gap-2 mx-auto shadow-lg shadow-emerald-500/20"
              >
                <Download className="w-5 h-5" /> Download Keeta.xlsx
              </button>
            </div>
          ) : (
            <div className="opacity-50">
              <FileSpreadsheet className="w-20 h-20 text-zinc-600 mx-auto mb-6" />
              <h2 className="text-xl font-bold text-white mb-2">No Output Yet</h2>
              <p className="text-zinc-400 max-w-sm">
                Upload and process a file to generate the Keeta format output.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
