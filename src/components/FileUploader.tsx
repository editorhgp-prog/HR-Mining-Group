/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';

interface FileUploaderProps {
  id: string;
  title: string;
  subTitle: string;
  onFileParsed: (sheetsData: { sheetName: string; rows: any[] }[], fileName: string) => void;
  fileName: string | null;
  onClear: () => void;
}

export default function FileUploader({
  id,
  title,
  subTitle,
  onFileParsed,
  fileName,
  onClear,
}: FileUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processFile = async (file: File) => {
    if (!file) return;

    // Check file type
    const isExcel = 
      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
      file.type === 'application/vnd.ms-excel' ||
      file.name.endsWith('.xlsx') ||
      file.name.endsWith('.xls');

    if (!isExcel) {
      setErrorText('Format file tidak didukung. Harap upload file Excel (.xlsx atau .xls)');
      return;
    }

    setErrorText(null);
    setIsProcessing(true);

    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const binaryData = e.target?.result;
          if (!binaryData) {
            throw new Error('Gagal membaca data file.');
          }

          const workbook = XLSX.read(binaryData, { type: 'array' });
          const sheetsData: { sheetName: string; rows: any[] }[] = [];

          workbook.SheetNames.forEach((sheetName) => {
            const sheet = workbook.Sheets[sheetName];
            // Read rows with defval empty string to avoid missing property problems
            const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
            sheetsData.push({ sheetName, rows });
          });

          if (sheetsData.length === 0 || sheetsData.every(s => s.rows.length === 0)) {
            throw new Error('File Excel kosong atau tidak memiliki baris data.');
          }

          onFileParsed(sheetsData, file.name);
        } catch (err: any) {
          setErrorText(err.message || 'Gagal mengekstrak worksheets.');
        } finally {
          setIsProcessing(false);
        }
      };

      reader.onerror = () => {
        setErrorText('Terjadi kesalahan saat membaca file.');
        setIsProcessing(false);
      };

      reader.readAsArrayBuffer(file);
    } catch (e) {
      setErrorText('Terjadi kesalahan pemrosesan.');
      setIsProcessing(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFile(e.target.files[0]);
    }
  };

  const handleZoneClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <input
        type="file"
        id={`input-${id}`}
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".xlsx, .xls"
        className="hidden"
      />

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={fileName ? undefined : handleZoneClick}
        className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 h-48 transition-all duration-300 cursor-pointer overflow-hidden ${
          fileName
            ? 'border-emerald-200 bg-emerald-50/10'
            : isDragging
            ? 'border-indigo-400 bg-indigo-50/20 scale-[1.01]'
            : 'border-indigo-200 hover:border-indigo-300 bg-indigo-50/30 hover:bg-indigo-50/40'
        }`}
      >
        <AnimatePresence mode="wait">
          {isProcessing ? (
            <motion.div
              key="processing"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center text-center space-y-3"
            >
              <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-semibold text-slate-650 font-sans">
                Mengekstrak lembar data Excel...
              </p>
            </motion.div>
          ) : fileName ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center text-center"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 mb-2.5">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-slate-800 font-display line-clamp-1 px-4">
                {title} Terisi
              </h4>
              <p className="text-[10px] text-emerald-700 font-mono mt-1 font-bold bg-emerald-50/80 px-2 py-0.5 rounded border border-emerald-100 max-w-xs truncate">
                {fileName}
              </p>
              
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onClear();
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="mt-3 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 font-sans font-bold text-[10px] border border-rose-100 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                Hapus & Ganti
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center text-center space-y-2.5"
            >
              <div className="w-11 h-11 bg-white rounded-lg shadow-sm flex items-center justify-center text-indigo-600 mb-1 border border-indigo-100">
                <UploadCloud className="w-5 font-bold h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">
                  {title}
                </p>
                <p className="text-[10px] text-slate-500 font-sans mt-0.5 px-4 italic leading-tight">
                  {subTitle}
                </p>
              </div>
              <p className="text-[9px] text-slate-400 font-mono uppercase font-bold tracking-wider bg-white rounded-md border border-slate-200 px-2.5 py-0.5">
                .XLSX File
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {errorText && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg bg-red-50 text-red-700 border border-red-100 text-xs"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span className="font-sans font-medium">{errorText}</span>
        </motion.div>
      )}
    </div>
  );
}
