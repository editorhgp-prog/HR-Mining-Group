/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, UserPlus, UserMinus, Award, ArrowRightLeft, Search, 
  HelpCircle, ChevronRight, FileSpreadsheet, Sparkles 
} from 'lucide-react';
import { CompanySummary, EmployeeRaw } from '../types';

interface AnalyticsViewProps {
  summary: CompanySummary;
  onDownload: () => void;
  activeFilters?: {
    location?: 'ALL' | 'HO' | 'SITE';
    gender?: 'ALL' | 'L' | 'P';
    empType?: 'ALL' | 'PKWTT' | 'PKWT';
    jobLevel?: 'ALL' | 'Management' | 'Supervisor' | 'Staff' | 'Non-Staff';
  };
}

type TabType = 'new' | 'resign' | 'promo' | 'mutation' | 'active';

export default function AnalyticsView({ summary, onDownload, activeFilters }: AnalyticsViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>('new');
  const [searchQuery, setSearchQuery] = useState('');

  // Assemble active filter titles for display
  const activeLabels = [];
  if (activeFilters?.location && activeFilters.location !== 'ALL') {
    activeLabels.push(activeFilters.location === 'HO' ? 'Head Office' : 'Site Operations');
  }
  if (activeFilters?.gender && activeFilters.gender !== 'ALL') {
    activeLabels.push(activeFilters.gender === 'L' ? 'Laki-laki' : 'Perempuan');
  }
  if (activeFilters?.empType && activeFilters.empType !== 'ALL') {
    activeLabels.push(activeFilters.empType);
  }
  if (activeFilters?.jobLevel && activeFilters.jobLevel !== 'ALL') {
    activeLabels.push(activeFilters.jobLevel);
  }

  // Tab counters
  const countNew = summary.newPermanent.length + summary.newContract.length;
  const countResign = summary.resignPermanent.length + summary.resignContract.length;
  const countPromo = summary.promotions.length;
  const countMutation = summary.mutations.length;
  const countActive = summary.skrg.length;

  // Filter lists based on Search Query
  const matchesSearch = (item: EmployeeRaw) => {
    const q = searchQuery.toLowerCase();
    return (
      item.id.toLowerCase().includes(q) ||
      item.name.toLowerCase().includes(q) ||
      item.department.toLowerCase().includes(q) ||
      item.designation.toLowerCase().includes(q)
    );
  };

  const filteredNewPerm = summary.newPermanent.filter(matchesSearch);
  const filteredNewCont = summary.newContract.filter(matchesSearch);
  const filteredResignPerm = summary.resignPermanent.filter(matchesSearch);
  const filteredResignCont = summary.resignContract.filter(matchesSearch);
  
  const filteredPromotions = summary.promotions.filter(p => 
    p.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.toRow.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredMutations = summary.mutations.filter(m =>
    m.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.newDept.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.oldDept.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredActive = summary.skrg.filter(matchesSearch);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Title & Sheet Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 border-b border-slate-200 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-sans font-bold text-xs border border-indigo-100/50">
              {summary.companyCode}
            </span>
            <h2 className="text-lg font-bold font-display text-slate-800">
              {summary.companyName}
            </h2>
          </div>
          {activeLabels.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans select-none">Penyaringan Aktif:</span>
              {activeLabels.map((lbl, idx) => (
                <span key={idx} className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-sans font-bold text-[10px] border border-indigo-100">
                  {lbl}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 font-sans mt-0.5 font-medium">
              Menganalisa data HR terhadap kontribusi dari Head Office (HO) dan cabang.
            </p>
          )}
        </div>

        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={onDownload}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-sans font-bold transition-all shadow-md cursor-pointer"
        >
          <FileSpreadsheet className="w-4 h-4" />
          {summary.companyCode === 'ALL' ? 'Unduh Semua Laporan (.ZIP)' : `Ekspor Laporan ${summary.companyCode}`}
        </motion.button>
      </div>

      {/* Tabs navigation */}
      <div className="flex overflow-x-auto border-b border-slate-200 bg-slate-50/50 px-4 pt-2.5 scrollbar-thin">
        {[
          { id: 'new', label: 'Karyawan Baru', count: countNew, icon: UserPlus, color: 'text-emerald-600 bg-emerald-50' },
          { id: 'resign', label: 'Karyawan Keluar', count: countResign, icon: UserMinus, color: 'text-rose-600 bg-rose-50' },
          { id: 'promo', label: 'Promosi Karyawan', count: countPromo, icon: Award, color: 'text-amber-600 bg-amber-50' },
          { id: 'mutation', label: 'Mutasi Departemen', count: countMutation, icon: ArrowRightLeft, color: 'text-sky-600 bg-sky-50' },
          { id: 'active', label: 'Roster Bulan Ini', count: countActive, icon: Users, color: 'text-indigo-600 bg-indigo-50' },
        ].map((tab) => {
          const isCurrent = activeTab === tab.id;
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as TabType);
                setSearchQuery('');
              }}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs font-bold font-sans transition-all shrink-0 cursor-pointer ${
                isCurrent
                  ? 'border-indigo-600 text-indigo-600 bg-white rounded-t-lg shadow-sm'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <TabIcon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
              <span className={`inline-flex items-center justify-center min-w-5 h-5 px-1.5 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                isCurrent 
                  ? 'bg-indigo-100 text-indigo-700' 
                  : tab.count > 0 
                  ? tab.color
                  : 'bg-slate-100 text-slate-400'
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search Filter Header */}
      <div className="p-4 bg-slate-50/50 border-b border-slate-200 flex items-center">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={`Cari berdasarkan NIK, Nama, Departemen di tab ini...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white rounded-lg border border-slate-200 focus:outline-none focus:border-indigo-500 text-xs font-sans text-slate-700 placeholder-slate-400 transition-colors shadow-2xs"
          />
        </div>
      </div>

      {/* List / Table Subview Container */}
      <div className="p-6 overflow-x-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
          >
            {/* 1. NEW EMPLOYEES VIEW */}
            {activeTab === 'new' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-bold font-sans text-emerald-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Penambahan Tetap (PKWTT) / New Hires ({filteredNewPerm.length})
                  </h4>
                  {filteredNewPerm.length === 0 ? (
                    <div className="text-center py-6 border border-dashed border-slate-100 rounded-lg text-xs font-sans text-slate-400 italic">
                      Tidak ada penambahan karyawan Tetap (PKWTT) yang cocok atau terdeteksi.
                    </div>
                  ) : (
                    <EmployeeTable employees={filteredNewPerm} badge="PKWTT" badgeColor="bg-emerald-50 text-emerald-700 border-emerald-100" />
                  )}
                </div>

                <div>
                  <h4 className="text-xs font-bold font-sans text-indigo-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                    Penambahan Kontrak (PKWT) ({filteredNewCont.length})
                  </h4>
                  {filteredNewCont.length === 0 ? (
                    <div className="text-center py-6 border border-dashed border-slate-100 rounded-lg text-xs font-sans text-slate-400 italic">
                      Tidak ada penambahan karyawan Kontrak (PKWT) yang cocok atau terdeteksi.
                    </div>
                  ) : (
                    <EmployeeTable employees={filteredNewCont} badge="PKWT" badgeColor="bg-indigo-50 text-indigo-700 border-indigo-100" />
                  )}
                </div>
              </div>
            )}

            {/* 2. RESIGNED EMPLOYEES VIEW */}
            {activeTab === 'resign' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-bold font-sans text-rose-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                    Karyawan Tetap Keluar (PKWTT) ({filteredResignPerm.length})
                  </h4>
                  {filteredResignPerm.length === 0 ? (
                    <div className="text-center py-6 border border-dashed border-slate-100 rounded-lg text-xs font-sans text-slate-400 italic">
                      Tidak ada karyawan Tetap (PKWTT) yang keluar periode ini.
                    </div>
                  ) : (
                    <EmployeeTable employees={filteredResignPerm} subtitle="Catatan: Resign / Pensiun" />
                  )}
                </div>

                <div>
                  <h4 className="text-xs font-bold font-sans text-amber-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    Karyawan Kontrak Keluar (PKWT) ({filteredResignCont.length})
                  </h4>
                  {filteredResignCont.length === 0 ? (
                    <div className="text-center py-6 border border-dashed border-slate-100 rounded-lg text-xs font-sans text-slate-400 italic">
                      Tidak ada karyawan Kontrak (PKWT) yang berakhir masa jabatannya periode ini.
                    </div>
                  ) : (
                    <EmployeeTable employees={filteredResignCont} subtitle="Catatan: Kontrak Berakhir / Resign" />
                  )}
                </div>
              </div>
            )}

            {/* 3. PROMOTIONS VIEW */}
            {activeTab === 'promo' && (
              <div>
                <h4 className="text-xs font-bold font-sans text-amber-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Alih Status Status Karyawan Kontrak ke Tetap ({filteredPromotions.length})
                </h4>
                {filteredPromotions.length === 0 ? (
                  <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl text-xs font-sans text-slate-400 italic">
                    Tidak ada karyawan yang menerima promosi kontrak ➔ permanen pada bulan ini.
                  </div>
                ) : (
                  <table className="w-full border-collapse text-left text-xs font-sans">
                    <thead>
                      <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-bold tracking-wider text-[11px] uppercase">
                        <th className="px-4 py-3">NO</th>
                        <th className="px-4 py-3">NIK / ID KARYAWAN</th>
                        <th className="px-4 py-3">NAMA LENGKAP</th>
                        <th className="px-4 py-3">DEPARTEMEN</th>
                        <th className="px-4 py-3">JABATAN LALU (PKWT)</th>
                        <th className="px-4 py-3">👉 JABATAN BARU (PKWTT)</th>
                        <th className="px-4 py-3">RIWAYAT PERUBAHAN</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans text-slate-700">
                      {filteredPromotions.map((p, idx) => (
                        <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3 font-medium text-slate-400">{idx + 1}</td>
                          <td className="px-4 py-3 font-mono font-semibold text-slate-900">{p.id}</td>
                          <td className="px-4 py-3 font-semibold text-slate-800">{p.name}</td>
                          <td className="px-4 py-3">{p.toRow.department}</td>
                          <td className="px-4 py-3 text-slate-500 italic">{p.fromRow.designation || 'Staff Kontrak'}</td>
                          <td className="px-4 py-3 font-semibold text-emerald-700 bg-emerald-50/40">{p.toRow.designation || 'Staff Tetap'}</td>
                          <td className="px-4 py-3 text-slate-550 font-mono text-[10px]">{p.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* 4. MUTATIONS VIEW */}
            {activeTab === 'mutation' && (
              <div>
                <h4 className="text-xs font-bold font-sans text-sky-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                  Mutasi Antar Departemen / Bagian Karyawan ({filteredMutations.length})
                </h4>
                {filteredMutations.length === 0 ? (
                  <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl text-xs font-sans text-slate-400 italic">
                    Tidak ada mutasi departemen internal yang terdeteksi bulan ini.
                  </div>
                ) : (
                  <table className="w-full border-collapse text-left text-xs font-sans">
                    <thead>
                      <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-bold tracking-wider text-[11px] uppercase">
                        <th className="px-4 py-3">NO</th>
                        <th className="px-4 py-3">NIK / ID KARYAWAN</th>
                        <th className="px-4 py-3">NAMA LENGKAP</th>
                        <th className="px-4 py-3">JABATAN</th>
                        <th className="px-4 py-3">🏢 DEPARTEMEN ASAL</th>
                        <th className="px-4 py-3">👉 DEPARTEMEN BARU</th>
                        <th className="px-4 py-3">RIWAYAT MUTASI</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans text-slate-700">
                      {filteredMutations.map((m, idx) => (
                        <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3 font-medium text-slate-400">{idx + 1}</td>
                          <td className="px-4 py-3 font-mono font-semibold text-slate-900">{m.id}</td>
                          <td className="px-4 py-3 font-semibold text-slate-800">{m.name}</td>
                          <td className="px-4 py-3">{m.row.designation}</td>
                          <td className="px-4 py-3 text-slate-450 line-through">{m.oldDept}</td>
                          <td className="px-4 py-3 font-semibold text-indigo-700 bg-indigo-50/20">{m.newDept}</td>
                          <td className="px-4 py-3 text-slate-500 font-mono text-[10px]">{m.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {/* 5. CURRENT ACTIVE ROSTER */}
            {activeTab === 'active' && (
              <div>
                <h4 className="text-xs font-bold font-sans text-indigo-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  Roster Karyawan Aktif Bulan Ini ({filteredActive.length})
                </h4>
                {filteredActive.length === 0 ? (
                  <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl text-xs font-sans text-slate-400 italic">
                    Tidak ada karyawan aktif yang dicocokan atau ditemukan.
                  </div>
                ) : (
                  <table className="w-full border-collapse text-left text-xs font-sans">
                    <thead>
                      <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-bold tracking-wider text-[11px] uppercase">
                        <th className="px-4 py-3">NO</th>
                        <th className="px-4 py-3">NIK / ID KARYAWAN</th>
                        <th className="px-4 py-3">NAMA LENGKAP</th>
                        <th className="px-4 py-3">DEPARTEMEN</th>
                        <th className="px-4 py-3">JABATAN</th>
                        <th className="px-4 py-3">STATUS</th>
                        <th className="px-4 py-3">DOH (JOINING DATE)</th>
                        <th className="px-4 py-3">GEN</th>
                        <th className="px-4 py-3">TTL</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans text-slate-755">
                      {filteredActive.map((e, idx) => (
                        <tr key={e.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3 text-slate-400 font-medium">{idx + 1}</td>
                          <td className="px-4 py-3 font-mono font-semibold text-slate-900">{e.id}</td>
                          <td className="px-4 py-3 font-semibold text-slate-850">{e.name}</td>
                          <td className="px-4 py-3">{e.department}</td>
                          <td className="px-4 py-3 text-slate-600 font-medium">{e.designation}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              e.employeeType === 'PKWTT' 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                            }`}>
                              {e.employeeType}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-[11px] text-slate-500">{e.dateOfJoining || '-'}</td>
                          <td className="px-4 py-3 text-center font-bold text-slate-550">{e.gender}</td>
                          <td className="px-4 py-3 text-slate-500 text-[10px]">
                            {[e.placeOfBirth, e.dateOfBirth].filter(Boolean).join(', ') || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

interface EmployeeTableProps {
  employees: EmployeeRaw[];
  badge?: string;
  badgeColor?: string;
  subtitle?: string;
}

function EmployeeTable({ employees, badge, badgeColor, subtitle }: EmployeeTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-xs font-sans">
        <thead>
          <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-bold tracking-wider text-[11px] uppercase">
            <th className="px-4 py-3">NO</th>
            <th className="px-4 py-3">NIK / ID KARYAWAN</th>
            <th className="px-4 py-3">NAMA LENGKAP</th>
            <th className="px-4 py-3">DEPARTEMEN</th>
            <th className="px-4 py-3">JABATAN</th>
            <th className="px-4 py-3">GENDER</th>
            <th className="px-4 py-3">TGL MASUK</th>
            <th className="px-4 py-3">PENDIDIKAN</th>
            <th className="px-4 py-3">TTL</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 font-sans text-slate-700">
          {employees.map((e, idx) => (
            <tr key={e.id} className="hover:bg-slate-50/50 transition-colors">
              <td className="px-4 py-3 text-slate-400 font-medium">{idx + 1}</td>
              <td className="px-4 py-3 font-mono font-semibold text-slate-900">{e.id}</td>
              <td className="px-4 py-3 font-semibold text-slate-800 flex items-center gap-2">
                {e.name}
                {badge && (
                  <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${badgeColor}`}>
                    {badge}
                  </span>
                )}
              </td>
              <td className="px-4 py-3">{e.department}</td>
              <td className="px-4 py-3 text-slate-600 font-medium">{e.designation}</td>
              <td className="px-4 py-3 text-center">{e.gender}</td>
              <td className="px-4 py-3 font-mono text-slate-500">{e.dateOfJoining || '-'}</td>
              <td className="px-4 py-3 text-slate-500">{e.education || '-'}</td>
              <td className="px-4 py-3 text-slate-500 text-[10px]">
                {[e.placeOfBirth, e.dateOfBirth].filter(Boolean).join(', ') || '-'}
                {subtitle && <div className="text-[9px] text-slate-400 mt-0.5 font-sans italic">{subtitle}</div>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
