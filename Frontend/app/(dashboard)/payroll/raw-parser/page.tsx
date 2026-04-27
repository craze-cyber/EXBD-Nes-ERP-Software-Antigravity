"use client";

import React, { useState, useRef } from "react";
import { UploadCloud, FileSpreadsheet, Download, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";

export default function RawFileParserPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setIsDone(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
      setIsDone(false);
    }
  };

  const processFile = async () => {
    if (!file) return;

    setIsProcessing(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });

      if (workbook.SheetNames.length < 2) {
        throw new Error("Invalid raw file format: Expected at least 2 sheets (Summary + Data).");
      }

      // The actual data is usually in the second sheet in Keeta raw files
      const dataSheetName = workbook.SheetNames[1];
      const dataSheet = workbook.Sheets[dataSheetName];
      
      const rawData = XLSX.utils.sheet_to_json(dataSheet, { header: 1 });

      if (rawData.length === 0) {
         throw new Error("The data sheet is empty.");
      }

      // Create new structure matching Keeta_ABha.xlsx
      const newSheetData = [
        ['SPO', 2000],
        ['OUT', 5500],
        ...rawData
      ];

      // Generate new workbook
      const newWs = XLSX.utils.aoa_to_sheet(newSheetData);
      const newWb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(newWb, newWs, "ksa_payable");

      // Download it
      XLSX.writeFile(newWb, "Keeta_Payable_Generated.xlsx");
      
      setIsDone(true);
      toast.success("Successfully parsed and generated payable file!");
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Failed to process raw file");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-8 space-y-10 max-w-[1000px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <header className="space-y-2">
         <h1 className="text-4xl font-black text-white tracking-tighter">
            RAW FILE <span className="text-fuchsia-500 font-light underline decoration-fuchsia-500/20 underline-offset-8">PARSER</span>
         </h1>
         <p className="text-zinc-400 font-medium text-lg">Upload raw Keeta payroll export to format it for the Payroll Engine.</p>
      </header>

      <div className="bg-[#121214] border border-white/5 rounded-3xl p-8 relative overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-fuchsia-500/10 blur-[100px] pointer-events-none"></div>

        <div className="space-y-8 relative z-10">
          <div 
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center min-h-[300px]
              ${file ? 'border-fuchsia-500/50 bg-fuchsia-500/5' : 'border-white/10 hover:border-white/20 hover:bg-white/[0.02]'}
            `}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".xlsx,.xls" 
              onChange={handleFileChange}
            />

            {!file ? (
              <div className="space-y-4 flex flex-col items-center">
                <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center">
                  <UploadCloud className="w-8 h-8 text-zinc-400" />
                </div>
                <div>
                  <p className="text-xl font-bold text-white">Click or drag raw Excel file here</p>
                  <p className="text-sm text-zinc-500 mt-2">Supports Keeta Establishment Export format (.xlsx)</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6 flex flex-col items-center">
                <div className="w-20 h-20 bg-fuchsia-500/20 rounded-3xl flex items-center justify-center ring-4 ring-fuchsia-500/10 animate-in zoom-in duration-300">
                  <FileSpreadsheet className="w-10 h-10 text-fuchsia-400" />
                </div>
                <div className="space-y-1">
                  <p className="text-xl font-bold text-white">{file.name}</p>
                  <p className="text-sm text-zinc-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); setFile(null); setIsDone(false); }}
                  className="text-sm text-zinc-400 hover:text-white transition-colors underline underline-offset-4"
                >
                  Choose a different file
                </button>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-4 border-t border-white/5 pt-6">
            <button
              disabled={!file || isProcessing}
              onClick={processFile}
              className={`
                flex items-center gap-3 px-8 py-4 rounded-2xl font-bold transition-all
                ${!file || isProcessing ? 'bg-white/5 text-zinc-500 cursor-not-allowed' : 'bg-fuchsia-500 text-white hover:bg-fuchsia-400 hover:-translate-y-1 hover:shadow-lg hover:shadow-fuchsia-500/25'}
              `}
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : isDone ? (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Generated Successfully
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Generate KSA Payable File
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-[#121214]/50 border border-amber-500/20 rounded-2xl p-6 flex gap-4">
         <div className="bg-amber-500/10 p-3 rounded-xl h-fit border border-amber-500/20">
            <AlertCircle className="w-5 h-5 text-amber-500" />
         </div>
         <div className="space-y-2">
            <h3 className="font-bold text-white">How it works</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              This parser extracts the Courier Data Sheet (usually Sheet 2) from the Raw Keeta Establishment Export. 
              It then automatically adds the required formatting headers (`SPO: 2000` and `OUT: 5500`) to match the KSA Payable File structure required by the Sovereign Payroll Engine.
            </p>
         </div>
      </div>
    </div>
  );
}
