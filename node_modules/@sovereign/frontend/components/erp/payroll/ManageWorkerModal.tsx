import React, { useState } from 'react';
import { X, FileText, CheckCircle2, Download, Upload } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';

export default function ManageWorkerModal({ worker, onClose, period, clientSlug }: any) {
  const [status, setStatus] = useState("PENDING");

  const generatePDF = (preview = false) => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text("Your Private Solution for Transporting Parcels", 14, 22);
    doc.setFontSize(10);
    doc.text("SAUCR: 1010879538", 14, 30);
    doc.text("VAT: 310045757400003", 14, 36);
    
    // Title
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("OFFICIAL SALARY SLIP", 105, 50, { align: "center" });
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Period: ${period}`, 105, 58, { align: "center" });

    // Data for tables
    const workerDetails = [
      ["Associate Name", worker.name || "N/A", "Basic Salary", `${worker.total_basic || 0} SAR`],
      ["EMP ID", worker.emp_id || "N/A", "Allowances/Reward", "0 SAR"],
      ["Designation", worker.position || "N/A", "Overtime (OT)", `${worker.total_ot_pay || 0} SAR`],
      ["Iqama Number", worker.iqama || "N/A", "Advances Paid", "0 SAR"],
      ["Business Unit", clientSlug.toUpperCase(), "Total Fines/Penalties", "0 SAR"],
      ["VENDOR", worker.vendor_name || "N/A", "Liability Recovery", "0 SAR"],
      ["Region", worker.region || "Riyadh", "Absent Days", "0"],
      ["Location", worker.location || "Riyadh", "Working Days", `${worker.working_days || 0}`],
      ["Bank Name", worker.bank_name || "Al Rajhi Bank", "Weekly Off", "0"],
      ["IBAN", worker.iban || "-", "Per Day Rate", "0 SAR"],
      ["Payment Status", status === "PAID" ? "Paid" : "Process", "OT Hours", `${worker.ot_hours || 0}`],
      ["", "", "OT Amount", `${worker.ot_amount || 0} SAR`],
      ["", "", "OTD Hours", `${worker.otd_hours || 0}`],
      ["", "", "OTD Amount", `${worker.otd_amount || 0} SAR`],
      ["", "", "Other Adjustment", "0 SAR"],
      ["", "", "Total Salary", `${worker.net_payable || 0} SAR`],
    ];

    autoTable(doc, {
      startY: 65,
      head: [["Worker Details", "Value", "Salary Breakdown", "Amount"]],
      body: workerDetails,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      styles: { fontSize: 9 },
      columnStyles: {
        0: { fontStyle: 'bold', fillColor: [245, 245, 245] },
        2: { fontStyle: 'bold', fillColor: [245, 245, 245] }
      }
    });

    const finalY = (doc as any).lastAutoTable.finalY || 150;
    
    // Total
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`TOTAL PAYABLE SALARY: ${worker.net_payable || 0} SAR`, 14, finalY + 15);

    // Signatures
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Employee Signature", 14, finalY + 40);
    doc.text("Authorized Signatory", 140, finalY + 40);
    
    // Footer
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text("This is a computer-generated document and does not require a physical stamp.", 105, 280, { align: "center" });

    if (preview) {
      window.open(doc.output('bloburl'), '_blank');
    } else {
      doc.save(`Payslip_${worker.emp_id || worker.name}_${period}.pdf`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#121214] w-full max-w-2xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#18181b] px-6 py-4 flex items-center justify-between border-b border-white/5">
          <div>
            <h2 className="text-xl font-black text-white">Worker Compensation Management</h2>
            <p className="text-zinc-500 text-xs font-bold uppercase mt-1">{worker.name}</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8">
          <div className="bg-white rounded-2xl p-6 flex items-center justify-between shadow-inner">
            <div>
              <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest">Total Payable Salary</p>
              <h3 className="text-3xl font-black text-black mt-1">{worker.net_payable?.toLocaleString() || 0} SAR</h3>
            </div>
            <div className="text-right">
              <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest">Workflow State</p>
              <span className={`inline-block mt-2 px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider ${status === 'PENDING' ? 'bg-orange-100 text-orange-600' : 'bg-emerald-100 text-emerald-600'}`}>
                {status}
              </span>
            </div>
          </div>

          <button className="flex items-center gap-2 text-blue-500 font-bold text-sm hover:text-blue-400 transition-colors">
            + VIEW COMPREHENSIVE BREAKDOWN
          </button>

          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => generatePDF(true)}
              className="flex items-center justify-center gap-2 bg-white text-black border border-zinc-200 py-4 rounded-xl font-bold hover:bg-zinc-50 transition-colors shadow-sm"
            >
              <FileText className="w-5 h-5 text-red-500" /> PREVIEW SLIP
            </button>
            <button 
              onClick={() => {
                setStatus("PAID");
                toast.success("Worker marked as paid!");
              }}
              className="flex items-center justify-center gap-2 bg-orange-600 text-white py-4 rounded-xl font-bold hover:bg-orange-700 transition-colors shadow-lg shadow-orange-600/20"
            >
              <CheckCircle2 className="w-5 h-5" /> MARK AS PAID
            </button>
          </div>

          <div className="space-y-3">
            <p className="text-center text-zinc-500 text-xs font-bold uppercase tracking-widest">Finalize: Upload Signed Acknowledgment</p>
            <div className="border-2 border-dashed border-emerald-500/30 bg-emerald-500/5 rounded-xl p-4 flex items-center justify-center cursor-pointer hover:bg-emerald-500/10 transition-colors">
              <span className="text-emerald-500 text-sm font-medium flex items-center gap-2">
                <Upload className="w-4 h-4" /> Choose file <span className="text-emerald-500/70">No file chosen</span>
              </span>
            </div>
          </div>

          <button 
            onClick={() => generatePDF(false)}
            className="w-full flex items-center justify-center gap-2 bg-zinc-100 text-zinc-800 py-4 rounded-xl font-bold hover:bg-zinc-200 transition-colors"
          >
            <Download className="w-5 h-5 text-blue-500" /> DOWNLOAD OFFICIAL PDF
          </button>
        </div>
      </div>
    </div>
  );
}
