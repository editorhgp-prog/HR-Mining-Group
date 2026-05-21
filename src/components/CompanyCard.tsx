/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Building2, Users, Download, ArrowRight, UserPlus, UserMinus, Award, ArrowRightLeft } from 'lucide-react';
import { CompanySummary } from '../types';

interface CompanyCardProps {
  summary: CompanySummary;
  isSelected: boolean;
  onSelect: () => void;
  onDownload: (e: React.MouseEvent) => void;
  key?: string;
}

export default function CompanyCard({
  summary,
  isSelected,
  onSelect,
  onDownload,
}: CompanyCardProps) {
  const activeLalu = summary.lalu.length;
  const activeSkrg = summary.skrg.length;
  const hasEmployees = activeLalu > 0 || activeSkrg > 0;

  // Aggregate modification counts
  const addCount = summary.newPermanent.length + summary.newContract.length;
  const subCount = summary.resignPermanent.length + summary.resignContract.length;
  const promoCount = summary.promotions.length;
  const mutCount = summary.mutations.length;

  return (
    <motion.div
      whileHover={{ y: -3 }}
      className={`relative flex flex-col justify-between p-5 bg-white rounded-2xl border transition-all duration-300 shadow-sm cursor-pointer select-none ${
        isSelected
          ? 'border-indigo-600 ring-4 ring-indigo-500/10'
          : hasEmployees
          ? 'border-slate-200 hover:border-slate-300 hover:shadow-md'
          : 'border-slate-250 hover:border-slate-300 opacity-60'
      }`}
      onClick={onSelect}
    >
      {/* Upper Brand Info */}
      <div>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300 ${
                isSelected
                  ? 'bg-indigo-600 text-white'
                  : hasEmployees
                  ? 'bg-indigo-50 text-indigo-600 border border-indigo-100/50'
                  : 'bg-slate-100 text-slate-400 border border-slate-200'
              }`}
            >
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-bold font-display text-slate-800 tracking-tight">
                  {summary.companyCode}
                </span>
                {hasEmployees ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold font-sans bg-emerald-50 text-emerald-600 border border-emerald-100">
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold font-sans bg-slate-100 text-slate-400 border border-slate-200">
                    Empty
                  </span>
                )}
              </div>
              <h3 className="text-xs text-slate-500 font-sans font-semibold line-clamp-1 mt-0.5" title={summary.companyName}>
                {summary.companyName}
              </h3>
            </div>
          </div>

          {hasEmployees && (
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={onDownload}
              title={`Unduh Laporan Excel - {summary.companyCode}`}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
            </motion.button>
          )}
        </div>

        {/* HR Counting Indicators */}
        <div className="grid grid-cols-2 gap-2 py-3 border-y border-slate-100 mb-4 bg-slate-50/50 rounded-xl px-3 my-3">
          <div>
            <div className="text-[10px] text-slate-400 font-sans font-bold uppercase tracking-wider">Bulan Lalu</div>
            <div className="flex items-center gap-1 mt-0.5">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-sm font-bold font-mono text-slate-700">
                {activeLalu}
              </span>
              <span className="text-[10px] text-slate-400 font-sans">ID</span>
            </div>
          </div>
          <div>
            <div className="text-[10px] text-indigo-500 font-sans font-bold uppercase tracking-wider">Bulan Ini</div>
            <div className="flex items-center gap-1 mt-0.5">
              <Users className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
              <span className="text-sm font-bold font-mono text-indigo-600">
                {activeSkrg}
              </span>
              <span className="text-[10px] text-slate-400 font-sans">ID</span>
            </div>
          </div>
        </div>

        {/* Breakdown of Changes metrics */}
        {hasEmployees ? (
          <div className="grid grid-cols-4 gap-1 text-center">
            <div className={`p-1.5 rounded-lg border ${addCount > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-50 text-slate-400 border-transparent'}`}>
              <UserPlus className="w-3.5 h-3.5 mx-auto mb-0.5" />
              <span className="text-xs font-bold font-mono">{addCount}</span>
            </div>
            <div className={`p-1.5 rounded-lg border ${subCount > 0 ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-slate-50 text-slate-400 border-transparent'}`}>
              <UserMinus className="w-3.5 h-3.5 mx-auto mb-0.5" />
              <span className="text-xs font-bold font-mono">{subCount}</span>
            </div>
            <div className={`p-1.5 rounded-lg border ${promoCount > 0 ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-slate-50 text-slate-400 border-transparent'}`}>
              <Award className="w-3.5 h-3.5 mx-auto mb-0.5" />
              <span className="text-xs font-bold font-mono">{promoCount}</span>
            </div>
            <div className={`p-1.5 rounded-lg border ${mutCount > 0 ? 'bg-sky-50 text-sky-700 border-sky-100' : 'bg-slate-50 text-slate-400 border-transparent'}`}>
              <ArrowRightLeft className="w-3.5 h-3.5 mx-auto mb-0.5" />
              <span className="text-xs font-bold font-mono">{mutCount}</span>
            </div>
          </div>
        ) : (
          <div className="text-xs text-center text-slate-300 italic py-2 font-sans font-medium">
            Tidak ada perubahan terdeteksi
          </div>
        )}
      </div>

      {/* Footer link to Inspect */}
      <div className="flex items-center justify-between text-xs font-semibold font-sans mt-4 pt-3 border-t border-slate-100 text-slate-400 group-hover:text-indigo-600 transition-colors">
        <span className={isSelected ? 'text-indigo-600 font-bold' : ''}>
          {isSelected ? 'Sedang Diperiksa' : 'Klik untuk Detail'}
        </span>
        <ArrowRight className={`w-3.5 h-3.5 transition-transform duration-200 ${isSelected ? 'translate-x-0.5 text-indigo-600' : ''}`} />
      </div>
    </motion.div>
  );
}
