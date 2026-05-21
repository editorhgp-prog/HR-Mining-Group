/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface EmployeeRaw {
  id: string; // Resolved Employee ID / NIK
  name: string; // Full Name
  companyCode: string; // Resolved normalized company code (e.g. "KMIA", "PTK")
  department: string; // Department
  employeeType: 'PKWTT' | 'PKWT' | 'Unknown'; // PKWTT (Permanent) vs PKWT (Contract/Kontrak)
  gender: 'L' | 'P' | 'Unknown'; // Gender: L (Laki-laki / Male) or P (Perempuan / Female)
  designation: string; // Current Designation / Jabatan
  dateOfJoining: string; // Date Of Joining / Tgl Masuk
  education: string; // Education
  placeOfBirth: string; // Tempat Lahir
  dateOfBirth: string; // Tanggal Lahir
  originalRow: Record<string, any>; // Original parsed object for preserving keys
}

export interface EmployeePromoDetail {
  id: string;
  name: string;
  fromRow: EmployeeRaw;
  toRow: EmployeeRaw;
  reason: string;
}

export interface EmployeeMutationDetail {
  id: string;
  name: string;
  oldDept: string;
  newDept: string;
  row: EmployeeRaw;
  reason: string;
}

export interface CompanySummary {
  companyCode: string; // e.g. "PTK", "KMIA"
  companyName: string; // Full official / display name
  lalu: EmployeeRaw[]; // Last month's employees
  skrg: EmployeeRaw[]; // This month's employees
  
  // Categorized changes
  newPermanent: EmployeeRaw[]; // New PKWTT
  newContract: EmployeeRaw[]; // New PKWT
  resignPermanent: EmployeeRaw[]; // Left PKWTT
  resignContract: EmployeeRaw[]; // Left PKWT
  promotions: EmployeePromoDetail[]; // PKWT (lalu) -> PKWTT (sekarang)
  mutations: EmployeeMutationDetail[]; // Dept change (sekarang !== lalu Department)
}

export const TARGET_COMPANIES = [
  { code: 'IC', name: 'PT Indexim Coalindo' },
  { code: 'BLP', name: 'PT Bumi Laksana Perkasa' },
  { code: 'BBE', name: 'PT Bukit Baiduri Energi' },
  { code: 'KMIA', name: 'PT Khotai Makmur Insan Abadi' },
  { code: 'IMK', name: 'PT Indo Muro Kencana' },
  { code: 'IMA', name: 'PT Indo Muro Andesit' },
  { code: 'NM', name: 'PT Natarang Mining' },
  { code: 'KBK', name: 'PT Kasongan Bumi Kencana' },
  { code: 'PTK', name: 'PT Pelsart Tambang Kencana' },
  { code: 'UAI', name: 'PT Unggul Abadi Infrastruktur' }
] as const;
