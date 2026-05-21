/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  BarChart3, PieChart, Users, TrendingUp, TrendingDown, 
  ArrowUpDown, UserPlus, UserMinus, Sparkles, Building2,
  Lock, Calendar
} from 'lucide-react';
import { CompanySummary, TARGET_COMPANIES } from '../types';
import { getCompanyCategory } from '../utils/exporter';

interface AnalyticsChartsProps {
  summaries: Record<string, CompanySummary>;
}

export default function AnalyticsCharts({ summaries }: AnalyticsChartsProps) {
  const [activeTab, setActiveTab] = useState<'headcount' | 'movements' | 'distribution'>('headcount');
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);

  // Prepare overall metrics
  const companiesList = TARGET_COMPANIES.map(c => {
    const sum = summaries[c.code] || {
      companyCode: c.code,
      companyName: c.name,
      lalu: [],
      skrg: [],
      newPermanent: [],
      newContract: [],
      resignPermanent: [],
      resignContract: [],
      promotions: [],
      mutations: []
    };
    const totalLalu = sum.lalu.length;
    const totalSkrg = sum.skrg.length;
    const incoming = sum.newPermanent.length + sum.newContract.length;
    const outgoing = sum.resignPermanent.length + sum.resignContract.length;
    const promo = sum.promotions.length;
    const mut = sum.mutations.length;
    const netChange = totalSkrg - totalLalu;

    // Calculate PKWTT vs PKWT
    const pkwtt = sum.skrg.filter(e => e.employeeType === 'PKWTT').length;
    const pkwt = sum.skrg.filter(e => e.employeeType === 'PKWT').length;

    return {
      code: c.code,
      name: c.name,
      lalu: totalLalu,
      skrg: totalSkrg,
      incoming,
      outgoing,
      promo,
      mut,
      netChange,
      pkwtt,
      pkwt,
      sector: getCompanyCategory(c.code)
    };
  });

  // Aggregated analytics
  const grandTotalLalu = companiesList.reduce((acc, curr) => acc + curr.lalu, 0);
  const grandTotalSkrg = companiesList.reduce((acc, curr) => acc + curr.skrg, 0);
  const grandIncoming = companiesList.reduce((acc, curr) => acc + curr.incoming, 0);
  const grandOutgoing = companiesList.reduce((acc, curr) => acc + curr.outgoing, 0);
  const grandPromo = companiesList.reduce((acc, curr) => acc + curr.promo, 0);
  const grandMut = companiesList.reduce((acc, curr) => acc + curr.mut, 0);
  const grandNetChange = grandTotalSkrg - grandTotalLalu;

  // Sektor aggregates
  const coalSkrg = companiesList.filter(c => c.sector === 'Coal').reduce((acc, curr) => acc + curr.skrg, 0);
  const goldSkrg = companiesList.filter(c => c.sector === 'Gold').reduce((acc, curr) => acc + curr.skrg, 0);

  // Contract aggregates
  const grandPkwtt = companiesList.reduce((acc, curr) => acc + curr.pkwtt, 0);
  const grandPkwt = companiesList.reduce((acc, curr) => acc + curr.pkwt, 0);

  // SVG dimensions for chart
  const paddingX = 60;
  const paddingY = 40;
  const chartWidth = 720;
  const chartHeight = 280;

  // Maximum value for scaling headcount graph
  const maxVal = Math.max(...companiesList.map(c => Math.max(c.lalu, c.skrg, 10)), 50);
  // Round to nearest neat scale step
  const gridMax = Math.ceil(maxVal * 1.1 / 10) * 10;

  // Maximum value for movements graph
  const maxMov = Math.max(...companiesList.map(c => Math.max(c.incoming, c.outgoing, 5)), 10);
  const gridMaxMov = Math.ceil(maxMov * 1.1 / 5) * 5;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-xs">
      {/* Header and Tab Selection */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="text-left">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-800 tracking-tight">
              Visualisasi & Tren Analitik Karyawan dilingkup HR Mining Group
            </h3>
          </div>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            Grafik interaktif real-time perbandingan antar PT berdasarkan unggahan spreadsheet terkini.
          </p>
        </div>

        {/* Tab buttons */}
        <div className="flex p-0.5 bg-slate-100 rounded-lg self-start sm:self-auto border border-slate-150">
          <button
            onClick={() => setActiveTab('headcount')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
              activeTab === 'headcount' 
                ? 'bg-white text-slate-800 shadow-2xs border border-slate-100' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
            <span>Headcount</span>
          </button>
          <button
            onClick={() => setActiveTab('movements')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
              activeTab === 'movements' 
                ? 'bg-white text-slate-800 shadow-2xs border border-slate-100' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-amber-550" />
            <span>Mutasi & Aktivitas</span>
          </button>
          <button
            onClick={() => setActiveTab('distribution')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
              activeTab === 'distribution' 
                ? 'bg-white text-slate-800 shadow-2xs border border-slate-100' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <PieChart className="w-3.5 h-3.5 text-emerald-555" />
            <span>Pembagian Sektor</span>
          </button>
        </div>
      </div>

      {/* Corporate Summary Scorecard */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card 1: Total Staff */}
        <div className="bg-slate-50/50 rounded-xl border border-slate-150 p-4 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans">Total Karyawan</span>
            <span className="p-1.5 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-600">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-left">
            <div className="flex items-baseline gap-2">
              <h4 className="text-2xl font-black text-slate-800">{grandTotalSkrg}</h4>
              <span className="text-[10px] text-slate-400 font-semibold font-mono">Bulan ini</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] mt-1 font-sans">
              <span className="text-slate-405 font-medium">Bulan lalu: {grandTotalLalu}</span>
              <span className={`inline-flex items-center gap-0.5 font-bold ${grandNetChange >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                ({grandNetChange >= 0 ? '+' : ''}{grandNetChange})
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: New Hires */}
        <div className="bg-slate-50/50 rounded-xl border border-slate-150 p-4 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans">Karyawan Masuk</span>
            <span className="p-1.5 bg-emerald-55 border border-emerald-100 rounded-lg text-emerald-600">
              <UserPlus className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-left">
            <h4 className="text-2xl font-black text-slate-800">{grandIncoming} <span className="text-xs font-semibold text-slate-400">Orang</span></h4>
            <div className="flex items-center gap-1 text-[10px] mt-1 text-slate-450 font-sans">
              <span>Rerata: {(grandIncoming / TARGET_COMPANIES.length).toFixed(1)} per PT</span>
            </div>
          </div>
        </div>

        {/* Card 3: Resigns */}
        <div className="bg-slate-50/50 rounded-xl border border-slate-150 p-4 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans">Karyawan Keluar</span>
            <span className="p-1.5 bg-rose-50 border border-rose-100 rounded-lg text-rose-600">
              <UserMinus className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-left">
            <h4 className="text-2xl font-black text-slate-800">{grandOutgoing} <span className="text-xs font-semibold text-slate-400">Orang</span></h4>
            <div className="flex items-center gap-1 text-[10px] mt-1 text-slate-455 font-sans">
              <span>Rerata: {(grandOutgoing / TARGET_COMPANIES.length).toFixed(1)} per PT</span>
            </div>
          </div>
        </div>

        {/* Card 4: Promotions & Mutations */}
        <div className="bg-slate-50/50 rounded-xl border border-slate-150 p-4 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-sans">Mutasi & Promosi</span>
            <span className="p-1.5 bg-amber-50 border border-amber-100 rounded-lg text-amber-600">
              <Sparkles className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-left">
            <h4 className="text-2xl font-black text-slate-800">{grandPromo + grandMut} <span className="text-xs font-semibold text-slate-400 text-slate-450 font-sans">Aktivitas</span></h4>
            <div className="flex items-center gap-2 text-[10px] mt-1 text-slate-500 font-sans">
              <span>{grandPromo} Promosi</span>
              <span>•</span>
              <span>{grandMut} Mutasi</span>
            </div>
          </div>
        </div>
      </div>

      {/* Render selected graph */}
      <div className="bg-slate-50/50 rounded-2xl border border-slate-200 p-4 overflow-x-auto">
        {activeTab === 'headcount' && (
          <div className="min-w-[760px] pb-2 text-center">
            <div className="flex items-center justify-between mb-4 px-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <BarChart3 className="w-4 h-4 text-indigo-600" />
                Perbandingan Headcount Bulan Lalu vs Bulan Ini (Perusahaan)
              </span>
              <div className="flex items-center gap-4 text-[10px] font-bold">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-indigo-200 rounded" />
                  <span className="text-slate-600">Bulan Lalu</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-indigo-600 rounded" />
                  <span className="text-slate-600">Bulan Ini</span>
                </div>
              </div>
            </div>

            {/* Custom Responsive SVG Chart */}
            <svg 
              viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
              className="w-full h-auto overflow-visible select-none"
            >
              {/* Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
                const yVal = gridMax * p;
                const plotY = chartHeight - paddingY - (yVal / gridMax) * (chartHeight - paddingY * 2);
                return (
                  <g key={i}>
                    <line 
                      x1={paddingX} 
                      y1={plotY} 
                      x2={chartWidth - paddingX} 
                      y2={plotY} 
                      stroke="#e2e8f0" 
                      strokeWidth="1" 
                      strokeDasharray="4 4" 
                    />
                    <text 
                      x={paddingX - 10} 
                      y={plotY + 4} 
                      textAnchor="end" 
                      className="fill-slate-400 font-sans font-bold text-[10px]"
                    >
                      {Math.round(yVal)}
                    </text>
                  </g>
                );
              })}

              {/* Draw Bars for each Company */}
              {companiesList.map((c, index) => {
                const stepX = (chartWidth - paddingX * 2) / companiesList.length;
                const plotX = paddingX + index * stepX + stepX / 2;
                
                // Heights
                const curLaluHeight = (c.lalu / gridMax) * (chartHeight - paddingY * 2);
                const curSkrgHeight = (c.skrg / gridMax) * (chartHeight - paddingY * 2);
                
                const yLalu = chartHeight - paddingY - curLaluHeight;
                const ySkrg = chartHeight - paddingY - curSkrgHeight;

                const barWidth = Math.max(stepX * 0.3, 10);
                const isHovered = hoveredBar === c.code;

                return (
                  <g 
                    key={c.code}
                    onMouseEnter={() => setHoveredBar(c.code)}
                    onMouseLeave={() => setHoveredBar(null)}
                    className="cursor-pointer group"
                  >
                    {/* Hover hotspot container background */}
                    <rect
                      x={plotX - stepX / 2}
                      y={paddingY}
                      width={stepX}
                      height={chartHeight - paddingY * 2}
                      fill="transparent"
                      className="group-hover:fill-slate-900/2.5 rounded-sm transition-all"
                    />

                    {/* Bar Bulan Lalu */}
                    <motion.rect
                      initial={{ height: 0, y: chartHeight - paddingY }}
                      animate={{ height: curLaluHeight, y: yLalu }}
                      transition={{ duration: 0.6, delay: index * 0.03 }}
                      x={plotX - barWidth - 2}
                      width={barWidth}
                      rx="3"
                      fill={isHovered ? '#818cf8' : '#c7d2fe'}
                      className="transition-colors"
                    />

                    {/* Bar Bulan Ini */}
                    <motion.rect
                      initial={{ height: 0, y: chartHeight - paddingY }}
                      animate={{ height: curSkrgHeight, y: ySkrg }}
                      transition={{ duration: 0.6, delay: index * 0.03 + 0.1 }}
                      x={plotX + 2}
                      width={barWidth}
                      rx="3"
                      fill={isHovered ? '#4f46e5' : '#4f46e5'}
                      className="transition-colors"
                    />

                    {/* X Axis Labels */}
                    <text
                      x={plotX}
                      y={chartHeight - paddingY + 16}
                      textAnchor="middle"
                      className={`font-mono text-[10px] font-bold uppercase transition-all ${
                        isHovered ? 'fill-indigo-600 font-extrabold text-[11px]' : 'fill-slate-500'
                      }`}
                    >
                      {c.code}
                    </text>

                    {/* Meta Value above bar when hovered */}
                    {isHovered && (
                      <g>
                        <rect
                          x={plotX - 45}
                          y={Math.min(yLalu, ySkrg) - 34}
                          width="90"
                          height="28"
                          rx="4"
                          fill="#1e293b"
                          stroke="#4338ca"
                          strokeWidth="1"
                        />
                        <text
                          x={plotX}
                          y={Math.min(yLalu, ySkrg) - 24}
                          textAnchor="middle"
                          className="fill-white font-sans text-[8px] font-semibold"
                        >
                          Lalu: {c.lalu} → Kini: {c.skrg}
                        </text>
                        <text
                          x={plotX}
                          y={Math.min(yLalu, ySkrg) - 14}
                          textAnchor="middle"
                          className="fill-emerald-400 font-sans text-[8px] font-bold"
                        >
                          Selisih: {c.netChange >= 0 ? `+${c.netChange}` : c.netChange}
                        </text>
                        {/* Little triangle pointing down */}
                        <polygon
                          points={`${plotX - 4},${Math.min(yLalu, ySkrg) - 6} ${plotX + 4},${Math.min(yLalu, ySkrg) - 6} ${plotX},${Math.min(yLalu, ySkrg) - 2}`}
                          fill="#1e293b"
                        />
                      </g>
                    )}
                  </g>
                );
              })}

              {/* Base Line */}
              <line 
                x1={paddingX} 
                y1={chartHeight - paddingY} 
                x2={chartWidth - paddingX} 
                y2={chartHeight - paddingY} 
                stroke="#94a3b8" 
                strokeWidth="1.5" 
              />
            </svg>
          </div>
        )}

        {activeTab === 'movements' && (
          <div className="min-w-[760px] pb-2 text-center">
            <div className="flex items-center justify-between mb-4 px-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <ArrowUpDown className="w-4 h-4 text-indigo-600" />
                Dinamika Keluar / Masuk Karyawan Bulanan Per PT
              </span>
              <div className="flex items-center gap-4 text-[10px] font-bold">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-emerald-500 rounded" />
                  <span className="text-slate-600">Masuk (New Hire)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 bg-rose-500 rounded" />
                  <span className="text-slate-600">Keluar (Resigned)</span>
                </div>
              </div>
            </div>

            {/* SVG Movements Multi-Bar Chart */}
            <svg 
              viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
              className="w-full h-auto overflow-visible select-none"
            >
              {/* Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
                const yVal = gridMaxMov * p;
                const plotY = chartHeight - paddingY - (yVal / gridMaxMov) * (chartHeight - paddingY * 2);
                return (
                  <g key={i}>
                    <line 
                      x1={paddingX} 
                      y1={plotY} 
                      x2={chartWidth - paddingX} 
                      y2={plotY} 
                      stroke="#e2e8f0" 
                      strokeWidth="1" 
                      strokeDasharray="4 4" 
                    />
                    <text 
                      x={paddingX - 10} 
                      y={plotY + 4} 
                      textAnchor="end" 
                      className="fill-slate-400 font-sans font-bold text-[10px]"
                    >
                      {Math.round(yVal)}
                    </text>
                  </g>
                );
              })}

              {/* Draw Bars */}
              {companiesList.map((c, index) => {
                const stepX = (chartWidth - paddingX * 2) / companiesList.length;
                const plotX = paddingX + index * stepX + stepX / 2;
                
                const inHeight = (c.incoming / gridMaxMov) * (chartHeight - paddingY * 2);
                const outHeight = (c.outgoing / gridMaxMov) * (chartHeight - paddingY * 2);
                
                const yIn = chartHeight - paddingY - inHeight;
                const yOut = chartHeight - paddingY - outHeight;

                const barWidth = Math.max(stepX * 0.3, 10);
                const isHovered = hoveredBar === c.code;

                return (
                  <g 
                    key={c.code}
                    onMouseEnter={() => setHoveredBar(c.code)}
                    onMouseLeave={() => setHoveredBar(null)}
                    className="cursor-pointer group"
                  >
                    {/* Hover highlight background */}
                    <rect
                      x={plotX - stepX / 2}
                      y={paddingY}
                      width={stepX}
                      height={chartHeight - paddingY * 2}
                      fill="transparent"
                      className="group-hover:fill-slate-900/2.5 transition-all"
                    />

                    {/* Bar Incoming (Masuk) */}
                    <motion.rect
                      initial={{ height: 0, y: chartHeight - paddingY }}
                      animate={{ height: inHeight, y: yIn }}
                      transition={{ duration: 0.6, delay: index * 0.03 }}
                      x={plotX - barWidth - 1}
                      width={barWidth}
                      rx="2"
                      fill="#10b981"
                    />

                    {/* Bar Outgoing (Keluar) */}
                    <motion.rect
                      initial={{ height: 0, y: chartHeight - paddingY }}
                      animate={{ height: outHeight, y: yOut }}
                      transition={{ duration: 0.6, delay: index * 0.03 + 0.1 }}
                      x={plotX + 1}
                      width={barWidth}
                      rx="2"
                      fill="#ef4444"
                    />

                    {/* X Code */}
                    <text
                      x={plotX}
                      y={chartHeight - paddingY + 16}
                      textAnchor="middle"
                      className={`font-mono text-[10px] font-bold uppercase transition-all ${
                        isHovered ? 'fill-indigo-600 font-extrabold text-[11px]' : 'fill-slate-500'
                      }`}
                    >
                      {c.code}
                    </text>

                    {/* Tooltip dynamic info */}
                    {isHovered && (
                      <g>
                        <rect
                          x={plotX - 50}
                          y={Math.min(yIn, yOut) - 44}
                          width="100"
                          height="38"
                          rx="4"
                          fill="#1e293b"
                          stroke="#10b981"
                          strokeWidth="1"
                        />
                        <text
                          x={plotX}
                          y={Math.min(yIn, yOut) - 30}
                          textAnchor="middle"
                          className="fill-white font-sans text-[8px] font-bold"
                        >
                          Masuk Baru: {c.incoming}
                        </text>
                        <text
                          x={plotX}
                          y={Math.min(yIn, yOut) - 20}
                          textAnchor="middle"
                          className="fill-rose-400 font-sans text-[8px] font-bold"
                        >
                          Resign/Keluar: {c.outgoing}
                        </text>
                        <text
                          x={plotX}
                          y={Math.min(yIn, yOut) - 10}
                          textAnchor="middle"
                          className="fill-amber-400 font-sans text-[8.5px] font-black"
                        >
                          Promosi: {c.promo} | Mutasi: {c.mut}
                        </text>
                        <polygon
                          points={`${plotX - 4},${Math.min(yIn, yOut) - 6} ${plotX + 4},${Math.min(yIn, yOut) - 6} ${plotX},${Math.min(yIn, yOut) - 2}`}
                          fill="#1e293b"
                        />
                      </g>
                    )}
                  </g>
                );
              })}

              <line 
                x1={paddingX} 
                y1={chartHeight - paddingY} 
                x2={chartWidth - paddingX} 
                y2={chartHeight - paddingY} 
                stroke="#94a3b8" 
                strokeWidth="1.5" 
              />
            </svg>
          </div>
        )}

        {activeTab === 'distribution' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full p-2">
            {/* Pie representation 1: Sector Comparison */}
            <div className="bg-white p-4 rounded-xl border border-slate-150 flex flex-col items-center justify-between min-h-[220px]">
              <div className="w-full text-left">
                <span className="text-[11px] font-bold text-slate-450 uppercase tracking-wide">Porsi Roster Sektor</span>
                <span className="text-xs font-bold text-slate-800 block">Coal vs Gold (Headcount Aktif)</span>
              </div>
              
              <div className="flex items-center justify-center gap-8 w-full py-4">
                <div className="relative flex items-center justify-center w-24 h-24 shrink-0 font-bold">
                  {/* Two concentric rings or nested visual parts */}
                  <svg viewBox="0 0 36 36" className="w-20 h-20 transform -rotate-90">
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                    {coalSkrg + goldSkrg > 0 && (
                      <>
                        <circle 
                          cx="18" 
                          cy="18" 
                          r="15.915" 
                          fill="none" 
                          stroke="#6366f1" 
                          strokeWidth="3.2" 
                          strokeDasharray={`${(coalSkrg / (coalSkrg + goldSkrg)) * 100} ${100 - (coalSkrg / (coalSkrg + goldSkrg)) * 100}`} 
                          strokeDashoffset="0" 
                        />
                        <circle 
                          cx="18" 
                          cy="18" 
                          r="15.915" 
                          fill="none" 
                          stroke="#fbbf24" 
                          strokeWidth="3.2" 
                          strokeDasharray={`${(goldSkrg / (coalSkrg + goldSkrg)) * 100} ${100 - (goldSkrg / (coalSkrg + goldSkrg)) * 100}`} 
                          strokeDashoffset={`${-(coalSkrg / (coalSkrg + goldSkrg)) * 100}`} 
                        />
                      </>
                    )}
                  </svg>
                  <div className="absolute flex flex-col items-center text-center leading-none">
                    <span className="text-sm font-black text-slate-700">{coalSkrg + goldSkrg}</span>
                    <span className="text-[7.5px] font-bold text-slate-400 mt-0.5">TERKUMPUL</span>
                  </div>
                </div>

                <div className="space-y-2 text-left font-sans shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 bg-indigo-550 rounded" />
                    <div>
                      <span className="text-[10px] font-bold text-slate-700 block lines-none">Sektor Coal (Batubara)</span>
                      <span className="text-[11px] font-black text-slate-800 leading-none">
                        {coalSkrg} Karyawan ({coalSkrg + goldSkrg > 0 ? Math.round((coalSkrg / (coalSkrg + goldSkrg)) * 100) : 0}%)
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 bg-amber-400 rounded" />
                    <div>
                      <span className="text-[10px] font-bold text-slate-700 block lines-none">Sektor Gold (Emas)</span>
                      <span className="text-[11px] font-black text-slate-800 leading-none">
                        {goldSkrg} Karyawan ({coalSkrg + goldSkrg > 0 ? Math.round((goldSkrg / (coalSkrg + goldSkrg)) * 100) : 0}%)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Pie representation 2: Status Comparison */}
            <div className="bg-white p-4 rounded-xl border border-slate-150 flex flex-col items-center justify-between min-h-[220px]">
              <div className="w-full text-left">
                <span className="text-[11px] font-bold text-slate-450 uppercase tracking-wide">Porsi Klasifikasi Kontrak</span>
                <span className="text-xs font-bold text-slate-800 block">Karyawan Tetap (PKWTT) vs Kontrak (PKWT)</span>
              </div>
              
              <div className="flex items-center justify-center gap-8 w-full py-4">
                <div className="relative flex items-center justify-center w-24 h-24 shrink-0 font-bold">
                  <svg viewBox="0 0 36 36" className="w-20 h-20 transform -rotate-90">
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                    {grandPkwtt + grandPkwt > 0 && (
                      <>
                        <circle 
                          cx="18" 
                          cy="18" 
                          r="15.915" 
                          fill="none" 
                          stroke="#10b981" 
                          strokeWidth="3.2" 
                          strokeDasharray={`${(grandPkwtt / (grandPkwtt + grandPkwt)) * 100} ${100 - (grandPkwtt / (grandPkwtt + grandPkwt)) * 100}`} 
                          strokeDashoffset="0" 
                        />
                        <circle 
                          cx="18" 
                          cy="18" 
                          r="15.915" 
                          fill="none" 
                          stroke="#a855f7" 
                          strokeWidth="3.2" 
                          strokeDasharray={`${(grandPkwt / (grandPkwtt + grandPkwt)) * 100} ${100 - (grandPkwt / (grandPkwtt + grandPkwt)) * 100}`} 
                          strokeDashoffset={`${-(grandPkwtt / (grandPkwtt + grandPkwt)) * 100}`} 
                        />
                      </>
                    )}
                  </svg>
                  <div className="absolute flex flex-col items-center text-center leading-none">
                    <span className="text-sm font-black text-slate-700">{grandPkwtt + grandPkwt}</span>
                    <span className="text-[7.5px] font-bold text-slate-400 mt-0.5">ROSTER</span>
                  </div>
                </div>

                <div className="space-y-2 text-left font-sans shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 bg-emerald-500 rounded" />
                    <div>
                      <span className="text-[10px] font-bold text-slate-700 block lines-none">Tetap (PKWTT)</span>
                      <span className="text-[11px] font-black text-slate-800 leading-none">
                        {grandPkwtt} Karyawan ({grandPkwtt + grandPkwt > 0 ? Math.round((grandPkwtt / (grandPkwtt + grandPkwt)) * 100) : 0}%)
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 bg-purple-500 rounded" />
                    <div>
                      <span className="text-[10px] font-bold text-slate-700 block lines-none">Kontrak (PKWT)</span>
                      <span className="text-[11px] font-black text-slate-800 leading-none">
                        {grandPkwt} Karyawan ({grandPkwtt + grandPkwt > 0 ? Math.round((grandPkwt / (grandPkwtt + grandPkwt)) * 100) : 0}%)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
