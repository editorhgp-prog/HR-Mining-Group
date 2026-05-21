/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, FileSpreadsheet, FolderArchive, RefreshCw, Info, HelpCircle, 
  Sparkles, CheckCircle2, AlertCircle, FileText, ChevronRight, UserCheck, ArrowRight,
  Calendar, Search, Filter
} from 'lucide-react';

import { EmployeeRaw, CompanySummary, TARGET_COMPANIES } from './types';
import FileUploader from './components/FileUploader';
import CompanyCard from './components/CompanyCard';
import AnalyticsView from './components/AnalyticsView';
import AnalyticsCharts from './components/AnalyticsCharts';

import { normalizeEmployeeRow, getEmployeeWorkArea, getEmployeeJobLevel } from './utils/parser';
import { runGlobalAnalysis } from './utils/analyzer';
import { generateCompanyExcel, buildZipOfAllReports, getFormattedReportFileName, getMonthYearInfo, getCompanyCategory } from './utils/exporter';

export default function App() {
  // Parsing states
  const [fileNameLalu, setFileNameLalu] = useState<string | null>(null);
  const [fileNameSkrg, setFileNameSkrg] = useState<string | null>(null);
  const [parsedLalu, setParsedLalu] = useState<EmployeeRaw[]>([]);
  const [parsedSkrg, setParsedSkrg] = useState<EmployeeRaw[]>([]);

  // Analytical outputs
  const [unfilteredSummaries, setUnfilteredSummaries] = useState<Record<string, CompanySummary> | null>(null);
  const [selectedCompanyCode, setSelectedCompanyCode] = useState<string | null>('ALL');
  const [isCompilingZip, setIsCompilingZip] = useState(false);

  // Month / Year override options state
  const [reportMonth, setReportMonth] = useState<number>(4); // April
  const [reportYear, setReportYear] = useState<number>(2026); // 2026

  // Cross-Company Preview Filter states (Specific 6 filters requested: Company, Company Code, HO vs Site, Gender, Employment Type, Job Level)
  const [filterCompany, setFilterCompany] = useState<string>('ALL'); // Selected Company full name or "ALL"
  const [filterCompanyCode, setFilterCompanyCode] = useState<string>('ALL'); // Selected Company Code or "ALL"
  const [filterHoSite, setFilterHoSite] = useState<'ALL' | 'HO' | 'SITE'>('ALL'); // Separation of HO / Site
  const [filterGender, setFilterGender] = useState<'ALL' | 'L' | 'P'>('ALL'); // Gender (Laki-laki / Perempuan)
  const [filterEmpType, setFilterEmpType] = useState<'ALL' | 'PKWTT' | 'PKWT'>('ALL'); // Employment Type (PKWTT / PKWT)
  const [filterJobLevel, setFilterJobLevel] = useState<'ALL' | 'Management' | 'Supervisor' | 'Staff' | 'Non-Staff'>('ALL'); // Job Level (Management, Supervisor, Staff, Non-Staff)
  const [sortBy, setSortBy] = useState<'CODE_ASC' | 'NAME_ASC' | 'HC_DESC' | 'MOVEMENT_DESC' | 'GROWTH_DESC'>('CODE_ASC');

  // Detect and update report options automatically when state is loaded
  useEffect(() => {
    const dataset = parsedSkrg.length > 0 ? parsedSkrg : parsedLalu;
    if (dataset.length > 0) {
      const info = getMonthYearInfo(dataset);
      setReportMonth(info.monthNum);
      setReportYear(info.year);
    }
  }, [parsedSkrg, parsedLalu]);

  // Parse callback for Last Month's file
  const handleLaluParsed = (sheetsData: { sheetName: string; rows: any[] }[], fileName: string) => {
    const arr: EmployeeRaw[] = [];
    sheetsData.forEach(({ sheetName, rows }) => {
      rows.forEach(row => {
        const emp = normalizeEmployeeRow(row, sheetName);
        if (emp) arr.push(emp);
      });
    });

    // Deduplicate employees by ID to shield against raw sheet multiple lines
    const uniqueMap = new Map<string, EmployeeRaw>();
    arr.forEach(e => {
      if (e.id) uniqueMap.set(e.id, e);
    });

    setParsedLalu(Array.from(uniqueMap.values()));
    setFileNameLalu(fileName);
  };

  // Parse callback for This Month's file
  const handleSkrgParsed = (sheetsData: { sheetName: string; rows: any[] }[], fileName: string) => {
    const arr: EmployeeRaw[] = [];
    sheetsData.forEach(({ sheetName, rows }) => {
      rows.forEach(row => {
        const emp = normalizeEmployeeRow(row, sheetName);
        if (emp) arr.push(emp);
      });
    });

    // Deduplicate
    const uniqueMap = new Map<string, EmployeeRaw>();
    arr.forEach(e => {
      if (e.id) uniqueMap.set(e.id, e);
    });

    setParsedSkrg(Array.from(uniqueMap.values()));
    setFileNameSkrg(fileName);
  };

  // Trigger global re-comparison using unfiltered raw datasets to preserve authentic transition paths
  useEffect(() => {
    if (fileNameLalu && fileNameSkrg && parsedLalu.length >= 0 && parsedSkrg.length >= 0) {
      const results = runGlobalAnalysis(parsedLalu, parsedSkrg);
      setUnfilteredSummaries(results);
    } else {
      setUnfilteredSummaries(null);
    }
  }, [parsedLalu, parsedSkrg, fileNameLalu, fileNameSkrg]);

  // Reactively compute filtered summaries structure based on active filter criteria
  const summaries = useMemo(() => {
    if (!unfilteredSummaries) return null;

    const filterEmployee = (emp: EmployeeRaw) => {
      // 1. Filter HO vs Site
      if (filterHoSite !== 'ALL') {
        const area = getEmployeeWorkArea(emp);
        if (area !== filterHoSite) return false;
      }
      
      // 2. Filter Gender
      if (filterGender !== 'ALL') {
        if (emp.gender !== filterGender) return false;
      }
      
      // 3. Filter Employment Type
      if (filterEmpType !== 'ALL') {
        if (emp.employeeType !== filterEmpType) return false;
      }
      
      // 4. Filter Job Level
      if (filterJobLevel !== 'ALL') {
        const jl = getEmployeeJobLevel(emp);
        if (jl !== filterJobLevel) return false;
      }
      
      return true;
    };

    const nextSummaries: Record<string, CompanySummary> = {};

    Object.keys(unfilteredSummaries).forEach(code => {
      const sum = unfilteredSummaries[code];
      nextSummaries[code] = {
        companyCode: sum.companyCode,
        companyName: sum.companyName,
        lalu: sum.lalu.filter(filterEmployee),
        skrg: sum.skrg.filter(filterEmployee),
        newPermanent: sum.newPermanent.filter(filterEmployee),
        newContract: sum.newContract.filter(filterEmployee),
        resignPermanent: sum.resignPermanent.filter(filterEmployee),
        resignContract: sum.resignContract.filter(filterEmployee),
        promotions: sum.promotions.filter(p => filterEmployee(p.toRow)),
        mutations: sum.mutations.filter(m => filterEmployee(m.row))
      };
    });

    // Create consolidated 'ALL' summary
    const allLalu: EmployeeRaw[] = [];
    const allSkrg: EmployeeRaw[] = [];
    const allNewPermanent: EmployeeRaw[] = [];
    const allNewContract: EmployeeRaw[] = [];
    const allResignPermanent: EmployeeRaw[] = [];
    const allResignContract: EmployeeRaw[] = [];
    const allPromotions: any[] = [];
    const allMutations: any[] = [];

    Object.keys(nextSummaries).forEach(code => {
      const s = nextSummaries[code];
      allLalu.push(...s.lalu);
      allSkrg.push(...s.skrg);
      allNewPermanent.push(...s.newPermanent);
      allNewContract.push(...s.newContract);
      allResignPermanent.push(...s.resignPermanent);
      allResignContract.push(...s.resignContract);
      allPromotions.push(...s.promotions);
      allMutations.push(...s.mutations);
    });

    nextSummaries['ALL'] = {
      companyCode: 'ALL',
      companyName: 'Semua Perusahaan (Gabungan)',
      lalu: allLalu,
      skrg: allSkrg,
      newPermanent: allNewPermanent,
      newContract: allNewContract,
      resignPermanent: allResignPermanent,
      resignContract: allResignContract,
      promotions: allPromotions,
      mutations: allMutations
    };

    return nextSummaries;
  }, [unfilteredSummaries, filterHoSite, filterGender, filterEmpType, filterJobLevel]);

  // Adjust auto-selection of Company Code when dataset summaries are adjusted
  useEffect(() => {
    if (summaries) {
      let bestCode = 'ALL';
      
      if (filterCompanyCode !== 'ALL') {
        bestCode = filterCompanyCode;
      } else if (filterCompany !== 'ALL') {
        const found = TARGET_COMPANIES.find(c => c.name === filterCompany);
        if (found) bestCode = found.code;
      } else {
        // Retain selection if specifically chosen by click/search and still exists, else default to 'ALL' (the consolidated view)
        bestCode = selectedCompanyCode && summaries[selectedCompanyCode] ? selectedCompanyCode : 'ALL';
      }
      setSelectedCompanyCode(bestCode);
    }
  }, [summaries, filterCompanyCode, filterCompany]);

  // Clears uploaded datasets and resets filter parameters
  const handleReset = () => {
    setFileNameLalu(null);
    setFileNameSkrg(null);
    setParsedLalu([]);
    setParsedSkrg([]);
    setUnfilteredSummaries(null);
    setSelectedCompanyCode('ALL');
    setFilterCompanyCode('ALL');
    setFilterCompany('ALL');
    setFilterHoSite('ALL');
    setFilterGender('ALL');
    setFilterEmpType('ALL');
    setFilterJobLevel('ALL');
  };

  // Triggers browser download of generated spreadsheet array buffer
  const downloadSingleExcel = async (code: string) => {
    if (!summaries || !summaries[code]) return;
    try {
      const buffer = await generateCompanyExcel(summaries[code], reportMonth, reportYear);
      const blob = new Blob([buffer], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = getFormattedReportFileName(code, summaries[code], reportMonth, reportYear);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Gagal mendownload laporan Excel: ' + err);
    }
  };

  // Compiles all companies into a single ZIP for instant bulk download
  const downloadAllInZip = async () => {
    if (!summaries) return;
    setIsCompilingZip(true);
    try {
      const allCompanyCodes = TARGET_COMPANIES.map(c => c.code);
      const zipBlob = await buildZipOfAllReports(summaries, allCompanyCodes, reportMonth, reportYear);
      const url = URL.createObjectURL(zipBlob);
      
      const link = document.createElement('a');
      link.href = url;
      
      const monthsNamesEnglishTuple = [
        'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
      ];
      const mName = monthsNamesEnglishTuple[reportMonth - 1] || 'Report';
      link.download = `Bundel_Laporan_Karyawan_Multi_Perusahaan_${mName}_${reportYear}.zip`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Gagal mengekspor berkas ZIP: ' + err);
    } finally {
      setIsCompilingZip(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col justify-between">
      {/* Prime Navigation Banner */}
      <header className="bg-white border-b border-slate-200 shadow-2xs sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-150">
              <FileSpreadsheet className="w-5.5 h-5.5" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold text-slate-800 leading-none flex items-center gap-2">
                Automation Reporting Method
              </h1>
              <p className="text-[11px] text-slate-400 font-sans mt-1 uppercase tracking-tight">
                HR Mining Group Jakarta
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-xs font-bold text-slate-700">IR ER Team</span>
              <span className="text-[9px] text-emerald-500 font-bold uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">HO Mapping Active</span>
            </div>
            <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-650 font-bold text-xs shadow-2xs">HO</div>
          </div>
        </div>
      </header>

      {/* Main Area Container - Sleek Sidebar Layout */}
      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-8 flex-1 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT SIDEBAR: File Uploaders & Status Info (Spans 4 columns on large screens) */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            
            {/* Input Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <h2 className="text-base font-bold text-slate-800">
                  1. Input Source Files
                </h2>
                {(fileNameLalu || fileNameSkrg) && (
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-rose-650 hover:bg-rose-50 border border-rose-100 transition-all text-[11px] font-bold cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Reset
                  </button>
                )}
              </div>

              <div className="space-y-4">
                <FileUploader
                  id="lalu"
                  title="Data Bulan Lalu"
                  subTitle="Upload .xlsx file data rekaman karyawan"
                  onFileParsed={handleLaluParsed}
                  fileName={fileNameLalu}
                  onClear={() => {
                    setFileNameLalu(null);
                    setParsedLalu([]);
                  }}
                />

                <FileUploader
                  id="skrg"
                  title="Data Bulan Ini"
                  subTitle="Upload .xlsx file data rekaman karyawan terbaru"
                  onFileParsed={handleSkrgParsed}
                  fileName={fileNameSkrg}
                  onClear={() => {
                    setFileNameSkrg(null);
                    setParsedSkrg([]);
                  }}
                />
              </div>
            </div>

            {/* Opsi Periode Laporan Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                <Calendar className="w-4.5 h-4.5 text-indigo-600" />
                <h2 className="text-base font-bold text-slate-800">
                  2. Periode Laporan & Tanggal
                </h2>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Bulan Laporan
                  </label>
                  <select
                    value={reportMonth}
                    onChange={(e) => setReportMonth(parseInt(e.target.value, 10))}
                    className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm font-medium bg-white text-slate-705 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-550 transition-all cursor-pointer"
                  >
                    {[
                      { val: 1, name: 'Januari' },
                      { val: 2, name: 'Februari' },
                      { val: 3, name: 'Maret' },
                      { val: 4, name: 'April' },
                      { val: 5, name: 'Mei' },
                      { val: 6, name: 'Juni' },
                      { val: 7, name: 'Juli' },
                      { val: 8, name: 'Agustus' },
                      { val: 9, name: 'September' },
                      { val: 10, name: 'Oktober' },
                      { val: 11, name: 'November' },
                      { val: 12, name: 'Desember' }
                    ].map((m) => (
                      <option key={m.val} value={m.val}>{m.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Tahun Laporan
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setReportYear(prev => prev - 1)}
                      className="px-3 py-1 bg-slate-50 hover:bg-slate-100 text-slate-650 border border-slate-200 rounded-lg text-sm font-bold transition-all cursor-pointer"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={reportYear}
                      onChange={(e) => setReportYear(parseInt(e.target.value, 10) || 2026)}
                      className="flex-1 w-full h-10 px-3 rounded-lg border border-slate-200 text-sm font-bold bg-white text-slate-750 outline-none focus:border-indigo-500 text-center"
                    />
                    <button
                      type="button"
                      onClick={() => setReportYear(prev => prev + 1)}
                      className="px-3 py-1 bg-slate-50 hover:bg-slate-100 text-slate-650 border border-slate-200 rounded-lg text-sm font-bold transition-all cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">
                    Preview Format file
                  </span>
                  <div className="font-mono text-[10px] font-medium text-slate-600 bg-white p-2 rounded-md border border-slate-150 leading-tight break-all">
                    {reportMonth}. Coal - BBE Report {[
                      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
                    ][reportMonth - 1]} {reportYear}.xlsx
                  </div>
                </div>
              </div>
            </div>

            {/* HO Auto-Mapping Card */}
            <div className="bg-indigo-900 rounded-2xl p-6 text-white shadow-md flex flex-col justify-between">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-bold text-sm tracking-wide">HO Auto-Mapping</h3>
                <span className="px-2 py-0.5 bg-indigo-400/20 rounded text-[10px] font-bold uppercase tracking-wider">Active</span>
              </div>
              <p className="text-[11px] text-indigo-200 leading-relaxed font-sans">
                System is configured to scan Company Codes in the <strong>HO Sheet</strong>. 
                Valid codes will be distributed to corresponding entity sheets. Other codes will be ignored.
              </p>
            </div>

            {/* Formatting Guide (Visible when idle) */}
            {!summaries && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Info className="w-4 h-4 text-indigo-600" />
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Standardisasi Format Kolom</h4>
                </div>
                <p className="text-[11px] text-slate-500 font-sans leading-relaxed">
                  Sistem mendukung deteksi kolom cerdas (Fuzzy Matching). Pastikan file Excel Anda menyantumkan kolom-kolom berikut dalam bahasa apapun:
                </p>
                <div className="flex flex-wrap gap-1 mt-3">
                  {['Employee ID / NIK', 'Full Name', 'Company Code', 'Department', 'Status / Status Type'].map((col) => (
                    <span key={col} className="font-mono bg-slate-550 text-[9px] px-1.5 py-0.5 rounded border border-slate-100 text-slate-650">
                      {col}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT VIEWPORT: Output Target Entities & Analytics (Spans 8 columns on large screens) */}
          <div className="lg:col-span-8 flex flex-col gap-6 w-full">
            <AnimatePresence mode="wait">
              {summaries ? (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 15 }}
                  className="space-y-6 w-full"
                  id="analysis-dashboard"
                >
                  {/* Grand Action Hub */}
                  <div className="flex flex-col sm:flex-row items-center justify-between p-6 bg-gradient-to-r from-indigo-900 to-slate-900 rounded-2xl text-white shadow-md gap-4">
                    <div className="flex items-center gap-3.5 text-left">
                      <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-white/10 text-emerald-400 border border-white/5">
                        <FolderArchive className="w-5.5 h-5.5 animate-pulse" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold tracking-tight">
                          Analisis Perbandingan Selesai!
                        </h3>
                        <p className="text-[11px] text-slate-300 font-sans mt-0.5">
                          Berhasil mengklasifikasikan karyawan per perusahaan masing-masing. Silakan unduh bundel laporan dalam ZIP.
                        </p>
                      </div>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      disabled={isCompilingZip}
                      onClick={downloadAllInZip}
                      className="flex items-center justify-center gap-2 px-5 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-700 text-white font-sans font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer"
                    >
                      {isCompilingZip ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Mengompresi Excel...</span>
                        </>
                      ) : (
                        <>
                          <FolderArchive className="w-4 h-4" />
                          <span>UNDUH SEMUA LAPORAN (.ZIP)</span>
                        </>
                      )}
                    </motion.button>
                  </div>

                  {/* Dashboard Visualisasi & Grafik Interaktif */}
                  <AnalyticsCharts summaries={summaries} />

                  {/* Target Entities Selection */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-6">
                    <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="text-base font-bold text-slate-800 italic flex items-center gap-2">
                          <Building2 className="w-4.5 h-4.5 text-indigo-600" />
                          2. Target Entities (Output Preview)
                        </h3>
                        <p className="text-xs text-slate-400 font-sans mt-0.5">
                          Klik untuk meninjau database detil karyawan masuk, keluar, promosi, dan mutasi internal dilingkup perusahaan tersebut.
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold border border-emerald-100 select-none">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div> READY
                      </div>
                    </div>

                    {/* Filters Panel (Only 6 specific filters requested) */}
                    <div className="mb-6 p-5 bg-slate-50 rounded-2xl border border-slate-150 space-y-4">
                      {/* Sort option and Reset combined in header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <Filter className="w-4 h-4 text-indigo-600" />
                          <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Penyaringan Dashboard</span>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-3">
                          {/* Sort Selector */}
                          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-2xs">
                            <span className="text-[10px] font-bold text-slate-400 uppercase select-none">Urutkan PT:</span>
                            <select
                              value={sortBy}
                              onChange={(e) => setSortBy(e.target.value as any)}
                              className="bg-transparent text-xs font-bold text-slate-650 outline-none border-none py-0.5 pr-2 focus:ring-0 cursor-pointer font-sans"
                            >
                              <option value="CODE_ASC">Kode PT (A - Z)</option>
                              <option value="NAME_ASC">Nama PT (A - Z)</option>
                              <option value="HC_DESC">Karyawan Terbanyak</option>
                              <option value="MOVEMENT_DESC">Perubahan Terbanyak</option>
                              <option value="GROWTH_DESC">Pertumbuhan Terbesar</option>
                            </select>
                          </div>

                          {/* Reset Button */}
                          {(filterCompany !== 'ALL' || filterCompanyCode !== 'ALL' || filterHoSite !== 'ALL' || filterGender !== 'ALL' || filterEmpType !== 'ALL' || filterJobLevel !== 'ALL') && (
                            <button
                              type="button"
                              onClick={() => {
                                setFilterCompany('ALL');
                                setFilterCompanyCode('ALL');
                                setFilterHoSite('ALL');
                                setFilterGender('ALL');
                                setFilterEmpType('ALL');
                                setFilterJobLevel('ALL');
                              }}
                              className="text-[11px] font-bold text-rose-600 hover:text-rose-700 hover:underline bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100 transition-colors cursor-pointer"
                            >
                              Reset Filter
                            </button>
                          )}
                        </div>
                      </div>

                      {/* 6 Grid Filter Controls */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                        {/* 1. Company Filter */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Company (Perusahaan)</label>
                          <div className="relative">
                            <select
                              value={filterCompany}
                              onChange={(e) => {
                                const val = e.target.value;
                                setFilterCompany(val);
                                // Sync Company Code automatically if a specific company is selected
                                if (val === 'ALL') {
                                  setFilterCompanyCode('ALL');
                                } else {
                                  const found = TARGET_COMPANIES.find(c => c.name === val);
                                  if (found) setFilterCompanyCode(found.code);
                                }
                              }}
                              className="w-full h-10 px-3 pr-8 rounded-lg border border-slate-205 text-xs font-bold bg-white text-slate-705 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-2xs appearance-none cursor-pointer"
                            >
                              <option value="ALL">Semua Perusahaan</option>
                              {TARGET_COMPANIES.map(c => (
                                <option key={c.code} value={c.name}>{c.name}</option>
                              ))}
                            </select>
                            <span className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none text-slate-400 text-[10px]">▼</span>
                          </div>
                        </div>

                        {/* 2. Company Code Filter */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Company Code</label>
                          <div className="relative">
                            <select
                              value={filterCompanyCode}
                              onChange={(e) => {
                                const val = e.target.value;
                                setFilterCompanyCode(val);
                                // Sync Company Name automatically
                                if (val === 'ALL') {
                                  setFilterCompany('ALL');
                                } else {
                                  const found = TARGET_COMPANIES.find(c => c.code === val);
                                  if (found) setFilterCompany(found.name);
                                }
                              }}
                              className="w-full h-10 px-3 pr-8 rounded-lg border border-slate-205 text-xs font-bold bg-white text-slate-705 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-2xs appearance-none cursor-pointer"
                            >
                              <option value="ALL">Semua Kode (ALL)</option>
                              {TARGET_COMPANIES.map(c => (
                                <option key={c.code} value={c.code}>{c.code} - {c.name.split(' PT ')[1] || c.name}</option>
                              ))}
                            </select>
                            <span className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none text-slate-400 text-[10px]">▼</span>
                          </div>
                        </div>

                        {/* 3. HO vs Site Filter */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Pisah HO dan Site</label>
                          <div className="relative">
                            <select
                              value={filterHoSite}
                              onChange={(e) => setFilterHoSite(e.target.value as any)}
                              className="w-full h-10 px-3 pr-8 rounded-lg border border-slate-205 text-xs font-bold bg-white text-slate-705 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-2xs appearance-none cursor-pointer"
                            >
                              <option value="ALL">Semua Lokasi Kerja</option>
                              <option value="HO">Head Office (HO)</option>
                              <option value="SITE">Site (Operations)</option>
                            </select>
                            <span className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none text-slate-400 text-[10px]">▼</span>
                          </div>
                        </div>

                        {/* 4. Gender Filter */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Gender</label>
                          <div className="relative">
                            <select
                              value={filterGender}
                              onChange={(e) => setFilterGender(e.target.value as any)}
                              className="w-full h-10 px-3 pr-8 rounded-lg border border-slate-205 text-xs font-bold bg-white text-slate-705 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-2xs appearance-none cursor-pointer"
                            >
                              <option value="ALL">Semua Gender</option>
                              <option value="L">Laki-laki (L)</option>
                              <option value="P">Perempuan (P)</option>
                            </select>
                            <span className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none text-slate-400 text-[10px]">▼</span>
                          </div>
                        </div>

                        {/* 5. Employment Type Filter */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Employment Type</label>
                          <div className="relative">
                            <select
                              value={filterEmpType}
                              onChange={(e) => setFilterEmpType(e.target.value as any)}
                              className="w-full h-10 px-3 pr-8 rounded-lg border border-slate-205 text-xs font-bold bg-white text-slate-705 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-2xs appearance-none cursor-pointer"
                            >
                              <option value="ALL">Semua Status</option>
                              <option value="PKWTT">PKWTT (Tetap)</option>
                              <option value="PKWT">PKWT (Kontrak)</option>
                            </select>
                            <span className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none text-slate-400 text-[10px]">▼</span>
                          </div>
                        </div>

                        {/* 6. Job Level Filter */}
                        <div className="flex flex-col gap-1.5">
                          <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Job Level</label>
                          <div className="relative">
                            <select
                              value={filterJobLevel}
                              onChange={(e) => setFilterJobLevel(e.target.value as any)}
                              className="w-full h-10 px-3 pr-8 rounded-lg border border-slate-205 text-xs font-bold bg-white text-slate-705 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-2xs appearance-none cursor-pointer"
                            >
                              <option value="ALL">Semua Level</option>
                              <option value="Management">Management</option>
                              <option value="Supervisor">Supervisor</option>
                              <option value="Staff">Staff</option>
                              <option value="Non-Staff">Non-Staff</option>
                            </select>
                            <span className="absolute inset-y-0 right-0 flex items-center pr-2.5 pointer-events-none text-slate-400 text-[10px]">▼</span>
                          </div>
                        </div>
                      </div>

                      {/* Active Filter Indicators */}
                      {(filterCompany !== 'ALL' || filterCompanyCode !== 'ALL' || filterHoSite !== 'ALL' || filterGender !== 'ALL' || filterEmpType !== 'ALL' || filterJobLevel !== 'ALL') && (
                        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-dashed border-slate-200">
                          <span className="text-[10px] font-bold text-slate-450 uppercase select-none">Penyaringan Aktif:</span>
                          {filterCompany !== 'ALL' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 border border-indigo-100 text-[10px] font-semibold text-indigo-755">
                              Perusahaan: {filterCompany}
                              <button type="button" onClick={() => { setFilterCompany('ALL'); setFilterCompanyCode('ALL'); }} className="font-bold hover:text-indigo-900 ml-0.5 text-xs select-none">×</button>
                            </span>
                          )}
                          {filterCompanyCode !== 'ALL' && filterCompany === 'ALL' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 border border-indigo-100 text-[10px] font-semibold text-indigo-755">
                              Kode: {filterCompanyCode}
                              <button type="button" onClick={() => { setFilterCompanyCode('ALL'); setFilterCompany('ALL'); }} className="font-bold hover:text-indigo-900 ml-0.5 text-xs select-none">×</button>
                            </span>
                          )}
                          {filterHoSite !== 'ALL' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 border border-indigo-100 text-[10px] font-semibold text-indigo-755">
                              Lokasi: {filterHoSite === 'HO' ? 'Head Office (HO)' : 'Site Operations'}
                              <button type="button" onClick={() => setFilterHoSite('ALL')} className="font-bold hover:text-indigo-900 ml-0.5 text-xs select-none">×</button>
                            </span>
                          )}
                          {filterGender !== 'ALL' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 border border-indigo-100 text-[10px] font-semibold text-indigo-755">
                              Gender: {filterGender === 'L' ? 'Laki-laki' : 'Perempuan'}
                              <button type="button" onClick={() => setFilterGender('ALL')} className="font-bold hover:text-indigo-900 ml-0.5 text-xs select-none font-sans">×</button>
                            </span>
                          )}
                          {filterEmpType !== 'ALL' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 border border-indigo-100 text-[10px] font-semibold text-indigo-755">
                              Status: {filterEmpType}
                              <button type="button" onClick={() => setFilterEmpType('ALL')} className="font-bold hover:text-indigo-900 ml-0.5 text-xs select-none font-sans">×</button>
                            </span>
                          )}
                          {filterJobLevel !== 'ALL' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 border border-indigo-100 text-[10px] font-semibold text-indigo-755">
                              Level: {filterJobLevel}
                              <button type="button" onClick={() => setFilterJobLevel('ALL')} className="font-bold hover:text-indigo-900 ml-0.5 text-xs select-none font-sans">×</button>
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setFilterCompany('ALL');
                              setFilterCompanyCode('ALL');
                              setFilterHoSite('ALL');
                              setFilterGender('ALL');
                              setFilterEmpType('ALL');
                              setFilterJobLevel('ALL');
                            }}
                            className="text-[10px] font-bold text-indigo-650 hover:text-indigo-850 underline ml-auto transition-colors cursor-pointer font-sans"
                          >
                            Reset Semua Filter
                          </button>
                        </div>
                      )}
                    </div>

                    {(() => {
                      const filteredCompanies = TARGET_COMPANIES.filter((company) => {
                        const sum = summaries?.[company.code];
                        if (!sum) return false;

                        // 1. Company Code Filter
                        if (filterCompanyCode !== 'ALL' && company.code !== filterCompanyCode) {
                          return false;
                        }

                        // 2. Company Name Filter
                        if (filterCompany !== 'ALL' && company.name !== filterCompany) {
                          return false;
                        }

                        return true;
                      });

                      // Sort the filtered list
                      const sortedAndFilteredCompanies = [...filteredCompanies].sort((a, b) => {
                        const sumA = summaries?.[a.code];
                        const sumB = summaries?.[b.code];
                        
                        if (sortBy === 'CODE_ASC') {
                          return a.code.localeCompare(b.code);
                        }
                        if (sortBy === 'NAME_ASC') {
                          return a.name.localeCompare(b.name);
                        }
                        
                        const hcA = sumA ? sumA.skrg.length : 0;
                        const hcB = sumB ? sumB.skrg.length : 0;
                        if (sortBy === 'HC_DESC') {
                          return hcB - hcA;
                        }

                        const movA = sumA ? (sumA.newPermanent.length + sumA.newContract.length + sumA.resignPermanent.length + sumA.resignContract.length + sumA.promotions.length + sumA.mutations.length) : 0;
                        const movB = sumB ? (sumB.newPermanent.length + sumB.newContract.length + sumB.resignPermanent.length + sumB.resignContract.length + sumB.promotions.length + sumB.mutations.length) : 0;
                        if (sortBy === 'MOVEMENT_DESC') {
                          return movB - movA;
                        }

                        const growA = sumA ? (sumA.skrg.length - sumA.lalu.length) : 0;
                        const growB = sumB ? (sumB.skrg.length - sumB.lalu.length) : 0;
                        if (sortBy === 'GROWTH_DESC') {
                          return growB - growA;
                        }

                        return 0;
                      });

                      if (sortedAndFilteredCompanies.length === 0) {
                        return (
                          <div className="flex flex-col items-center justify-center py-12 px-6 border border-dashed border-slate-200 rounded-2xl bg-slate-50 text-center">
                            <AlertCircle className="w-8 h-8 text-slate-400 mb-2 animate-pulse" />
                            <span className="text-sm font-bold text-slate-600 block">Tidak Ada Perusahaan Cocok</span>
                            <span className="text-xs text-slate-400 mt-1">Silakan sesuaikan filter pencarian atau pilihan Anda.</span>
                            <button
                              onClick={() => {
                                setFilterCompany('ALL');
                                setFilterCompanyCode('ALL');
                                setFilterHoSite('ALL');
                                setFilterGender('ALL');
                                setFilterEmpType('ALL');
                                setFilterJobLevel('ALL');
                              }}
                              className="mt-4 px-4 py-1.5 bg-slate-200 hover:bg-slate-300 transition-all rounded-lg text-xs font-bold text-slate-700 cursor-pointer"
                            >
                              Reset Semua Filter
                            </button>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-3">
                          <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 tracking-tight uppercase px-1 select-none">
                            <span>Menampilkan {sortedAndFilteredCompanies.length} Perusahaan</span>
                            {sortBy !== 'CODE_ASC' && (
                              <span>Urutan aktif: {
                                sortBy === 'NAME_ASC' ? 'Nama (A-Z)' : 
                                sortBy === 'HC_DESC' ? 'Karyawan Terbanyak' : 
                                sortBy === 'MOVEMENT_DESC' ? 'Mutasi Terbanyak' : 'Pertumbuhan Terbesar'
                              }</span>
                            )}
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                            {sortedAndFilteredCompanies.map((company) => {
                              const sum = summaries?.[company.code];
                              if (!sum) return null;
                              const isSelected = selectedCompanyCode === company.code;
                              return (
                                <CompanyCard
                                  key={company.code}
                                  summary={sum}
                                  isSelected={isSelected}
                                  onSelect={() => setSelectedCompanyCode(isSelected ? 'ALL' : company.code)}
                                  onDownload={(e) => {
                                    e.stopPropagation();
                                    downloadSingleExcel(company.code);
                                  }}
                                />
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Selected Company Details Inspector */}
                  {selectedCompanyCode && summaries[selectedCompanyCode] && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between ml-1 mr-1">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-indigo-600 font-bold" />
                          <h3 className="text-sm font-bold text-slate-800">
                            3. Rekap Panel Analitik Detail – {selectedCompanyCode === 'ALL' ? 'Semua Perusahaan (Gabungan)' : selectedCompanyCode}
                          </h3>
                        </div>
                        {selectedCompanyCode !== 'ALL' && (
                          <button
                            onClick={() => setSelectedCompanyCode('ALL')}
                            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 underline flex items-center gap-1 cursor-pointer"
                          >
                            ← Tampilkan Semua Perusahaan (Gabungan)
                          </button>
                        )}
                      </div>
                      
                      <AnalyticsView
                        summary={summaries[selectedCompanyCode]}
                        onDownload={() => {
                          if (selectedCompanyCode === 'ALL') {
                            downloadAllInZip();
                          } else {
                            downloadSingleExcel(selectedCompanyCode);
                          }
                        }}
                        activeFilters={{
                          location: filterHoSite,
                          gender: filterGender,
                          empType: filterEmpType,
                          jobLevel: filterJobLevel
                        }}
                      />
                    </div>
                  )}
                </motion.div>
              ) : (
                // Idle placeholder state
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-20 px-8 bg-white rounded-2xl border border-slate-200 text-center space-y-6 w-full shadow-sm"
                >
                  <div className="flex items-center justify-center w-16 h-16 rounded-3xl bg-indigo-50 border border-indigo-100 text-indigo-600 shadow-inner">
                    <Building2 className="w-8 h-8" />
                  </div>
                  <div className="max-w-md space-y-2">
                    <h3 className="text-base font-bold text-slate-800 italic">
                      2. Target Entities (Output Preview)
                    </h3>
                    <p className="text-xs text-slate-500 font-sans leading-relaxed">
                      Silakan unggah kedua file Excel <strong>(Data Karyawan Bulan Lalu & Bulan Ini)</strong> pada panel di samping untuk memulai analisis perbandingan multi-perusahaan.
                    </p>
                  </div>

                  {/* Interactive Steps Checklist */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-3 gap-4 max-w-xl w-full text-left pt-4">
                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex gap-3">
                      <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-150 text-indigo-600 shrink-0 font-mono font-bold text-xs select-none">
                        01
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">Unggah Excel</h4>
                        <p className="text-[10px] text-slate-500 font-sans mt-0.5 leading-tight">Seret-drop spreadsheet bulanan di samping.</p>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex gap-3">
                      <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-150 text-emerald-600 shrink-0 font-mono font-bold text-xs select-none">
                        02
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">Deteksi HO</h4>
                        <p className="text-[10px] text-slate-500 font-sans mt-0.5 leading-tight">Penyaringan kode HO ke entitas masing-masing otomatis.</p>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex gap-3">
                      <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-purple-50 border border-purple-150 text-purple-600 shrink-0 font-mono font-bold text-xs select-none">
                        03
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">ZIP / XLSX</h4>
                        <p className="text-[10px] text-slate-500 font-sans mt-0.5 leading-tight">Download laporan terkelompok lengkap instan.</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </main>

      {/* Styled Footer */}
      <footer className="bg-slate-100 border-t border-slate-200 px-8 py-6 text-[10px] text-slate-500 font-sans w-full select-none mt-16">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap gap-x-6 gap-y-2 uppercase tracking-widest font-bold">
            <span>Status: System Ready</span>
            <span>HO Mapping: Online</span>
            <span>Entities Tracked: 10</span>
          </div>
          <div className="text-center md:text-right italic font-semibold text-slate-450">
            PT Pelsart Tambang Kencana • HR Automated Reports Integration • v2.4
          </div>
        </div>
      </footer>
    </div>
  );
}
