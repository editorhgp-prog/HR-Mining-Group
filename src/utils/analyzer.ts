/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmployeeRaw, CompanySummary, TARGET_COMPANIES } from '../types';

/**
 * Runs the comparison matching engine globally for all 10 target companies.
 * Takes the raw list of employees from last month (lalu) and this month (sekarang),
 * groups them by target company code, and computes detailed mutations.
 */
export function runGlobalAnalysis(
  laluEmployees: EmployeeRaw[],
  skrgEmployees: EmployeeRaw[]
): Record<string, CompanySummary> {
  const summaries: Record<string, CompanySummary> = {};

  // First, initialize data nodes for all 10 target companies
  for (const company of TARGET_COMPANIES) {
    summaries[company.code] = {
      companyCode: company.code,
      companyName: company.name,
      lalu: [],
      skrg: [],
      newPermanent: [],
      newContract: [],
      resignPermanent: [],
      resignContract: [],
      promotions: [],
      mutations: []
    };
  }

  // Group last month's employees into respective companies
  for (const emp of laluEmployees) {
    if (summaries[emp.companyCode]) {
      summaries[emp.companyCode].lalu.push(emp);
    }
  }

  // Group this month's employees into respective companies
  for (const emp of skrgEmployees) {
    if (summaries[emp.companyCode]) {
      summaries[emp.companyCode].skrg.push(emp);
    }
  }

  // Perform per-company comparative analysis
  for (const companyCode of Object.keys(summaries)) {
    const sum = summaries[companyCode];
    
    // Create maps for instant key lookup by Employee ID
    const laluMap = new Map<string, EmployeeRaw>();
    sum.lalu.forEach(e => {
      if (e.id) laluMap.set(e.id, e);
    });

    const skrgMap = new Map<string, EmployeeRaw>();
    sum.skrg.forEach(e => {
      if (e.id) skrgMap.set(e.id, e);
    });

    // 1. Scan this month's list to detect additions (New Hires), Promotions, and Mutations
    for (const [id, empSkrg] of skrgMap.entries()) {
      const empLalu = laluMap.get(id);

      if (!empLalu) {
        // Was not in last month's records -> Classified as New Hire
        if (empSkrg.employeeType === 'PKWTT') {
          sum.newPermanent.push(empSkrg);
        } else {
          sum.newContract.push(empSkrg);
        }
      } else {
        // Exist in both months -> Check for promotional status shift
        // If contract last month but permanent this month
        if (empLalu.employeeType === 'PKWT' && empSkrg.employeeType === 'PKWTT') {
          sum.promotions.push({
            id,
            name: empSkrg.name,
            fromRow: empLalu,
            toRow: empSkrg,
            reason: `Promosi PKWT ➔ PKWTT (${empLalu.designation || 'Kontrak'} ke ${empSkrg.designation || 'Tetap'})`
          });
        }

        // Check for department transfer / mutation
        if (empLalu.department && empSkrg.department && empLalu.department !== empSkrg.department) {
          sum.mutations.push({
            id,
            name: empSkrg.name,
            oldDept: empLalu.department,
            newDept: empSkrg.department,
            row: empSkrg,
            reason: `Mutasi Departemen (${empLalu.department} ➔ ${empSkrg.department})`
          });
        }
      }
    }

    // 2. Scan last month's list to detect removals (Resigned)
    for (const [id, empLalu] of laluMap.entries()) {
      if (!skrgMap.has(id)) {
        if (empLalu.employeeType === 'PKWTT') {
          sum.resignPermanent.push(empLalu);
        } else {
          sum.resignContract.push(empLalu);
        }
      }
    }
  }

  return summaries;
}
