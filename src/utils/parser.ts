/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmployeeRaw, TARGET_COMPANIES } from '../types';

/**
 * Normalizes string keys for fuzzy column header matching.
 */
function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Finds the actual key in a raw row object that matches a semantic category.
 */
export function findColumnKey(row: Record<string, any>, possibleNames: string[]): string {
  const keys = Object.keys(row);
  const normalizedPossibles = possibleNames.map(normalizeKey);

  for (const key of keys) {
    const normKey = normalizeKey(key);
    // Exact or contains match for normalized keys
    if (normalizedPossibles.includes(normKey)) {
      return key;
    }
  }

  // Fallback: search if any possible name is a substring of the key
  for (const key of keys) {
    const normKey = normalizeKey(key);
    for (const pos of normalizedPossibles) {
      if (normKey.includes(pos) || pos.includes(normKey)) {
        return key;
      }
    }
  }

  return '';
}

/**
 * Formats an Excel date value (which might be a serial number or a raw string/date)
 * into a clean YYYY-MM-DD string representation.
 */
export function formatExcelDate(value: any): string {
  if (!value) return '';
  
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  if (typeof value === 'number' && value > 10000 && value < 60000) {
    // Excel serial number to Javascript Date
    try {
      const date = new Date(Math.round((value - 25569) * 86400 * 1000));
      if (!isNaN(date.getTime())) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    } catch {
      // Ignored, fallback to string coercion
    }
  }

  // Handle common string dates e.g. "DD-MM-YYYY" or "DD/MM/YYYY" or "YYYY-MM-DD"
  const s = String(value).trim();
  if (s.match(/^\d{4}-\d{2}-\d{2}/)) {
    return s.slice(0, 10);
  }
  
  const slashParts = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (slashParts) {
    const [, d, m, y] = slashParts;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  return s;
}

/**
 * Detects the target company code from a row's company/perusahaan columns,
 * with a fallback check against the sheet name.
 */
export function detectCompany(row: Record<string, any>, sheetName: string): string | null {
  // Candidate columns for finding company or branch entity
  const companyKeys = [
    'companycode', 'company_code', 'empcompanycode', 'company', 
    'perusahaan', 'entity', 'businessunit', 'bu', 'workarea', 'lokasi',
    'location', 'site', 'branch', 'deskripsiperusahaan', 'companyname'
  ];

  const matchedColKey = findColumnKey(row, companyKeys);
  let companyVal = '';

  if (matchedColKey && row[matchedColKey]) {
    companyVal = String(row[matchedColKey]).trim().toUpperCase();
  }

  // Helper patterns for matching target company codes as whole tokens or specific keywords
  const checkValue = (val: string): string | null => {
    // PT Pelsart Tambang Kencana or PTK
    if (val.includes('PELSART') || val.includes('TAMBANG KENCANA') || val.includes('PTK')) {
      return 'PTK';
    }
    // KMIA
    if (val.includes('KMIA') || val.includes('KHOTAI') || val.includes('MAKMUR INSAN')) {
      return 'KMIA';
    }
    // IMK
    if (val.includes('IMK') || val.includes('INDO MURO KENCANA') || val.includes('MURO KENCANA')) {
      return 'IMK';
    }
    // Match exactly or with word margins for shorter ones (like IMA)
    const imarx = /\bIMA\b/;
    if (imarx.test(val) || val === 'IMA' || val === 'PT IMA' || val === 'PT. IMA' || val.includes('INDO MURO ANDESIT') || val.includes('MURO ANDESIT')) {
      return 'IMA';
    }
    // BBE
    if (val.includes('BBE') || val.includes('BUKIT BAIDURI') || val.includes('BAIDURI ENERGI')) {
      return 'BBE';
    }
    // BLP
    if (val.includes('BLP') || val.includes('BUMI LAKSANA') || val.includes('LAKSANA PERKASA')) {
      return 'BLP';
    }
    // KBK
    if (val.includes('KBK') || val.includes('KASONGAN') || val.includes('BUMI KENCANA')) {
      return 'KBK';
    }
    // IC (Avoid matching SERVICE, CLINIC, MECHANIC, OFFICE, GENERIC, PLASTIC, etc.)
    const icrx = /\bIC\b/;
    if (icrx.test(val) || val === 'IC' || val === 'PT IC' || val === 'PT. IC' || val.includes('INDEXIM') || val.includes('COALINDO')) {
      return 'IC';
    }
    // NM
    const nmrx = /\bNM\b/;
    if (nmrx.test(val) || val === 'NM' || val === 'PT NM' || val === 'PT. NM' || val.includes('NATARANG') || val.includes('NATARANG MINING')) {
      return 'NM';
    }
    // UAI
    if (val.includes('UAI') || val.includes('UNGGUL ABADI') || val.includes('INFRASTRUKTUR')) {
      return 'UAI';
    }

    return null;
  };

  // 1. Try resolving company from company column
  if (companyVal) {
    const match = checkValue(companyVal);
    if (match) return match;
  }

  // 2. Try scanning other properties of the row for target company code
  for (const key of Object.keys(row)) {
    const valStr = String(row[key]).toUpperCase();
    for (const comp of TARGET_COMPANIES) {
      if (valStr === comp.code || valStr === `PT ${comp.code}` || valStr === `PT. ${comp.code}`) {
        return comp.code;
      }
    }
  }

  // 3. Fallback: Parse the Excel sheet name
  const sheetUpper = sheetName.toUpperCase();
  const sheetMatch = checkValue(sheetUpper);
  if (sheetMatch) return sheetMatch;

  // Let's also check if sheet name contains any company code directly
  for (const comp of TARGET_COMPANIES) {
    if (sheetUpper.includes(comp.code)) {
      return comp.code;
    }
  }

  return null;
}

/**
 * Normalizes raw row data into an EmployeeRaw interface structure based on fuzzy matches.
 */
export function normalizeEmployeeRow(row: Record<string, any>, sheetName: string): EmployeeRaw | null {
  // Match Employee ID / NIK
  const idKey = findColumnKey(row, ['employeeid', 'id', 'nik', 'noinduk', 'noreg', 'employee_id', 'nomorinduk', 'emp_id']);
  if (!idKey || !row[idKey]) return null;

  const id = String(row[idKey]).trim();
  if (!id) return null;

  // Match Full Name
  const nameKey = findColumnKey(row, ['fullname', 'name', 'nama', 'namalengkap', 'karyawan', 'empname', 'employee_name']);
  const name = nameKey ? String(row[nameKey]).trim() : 'Unnamed Employee';

  // Detect which company the employee is assigned to
  const companyCode = detectCompany(row, sheetName);
  if (!companyCode) {
    // If we can't identify the company, we skip it (doesn't belong to any of our 10 targeted companies)
    return null;
  }

  // Match Department
  const deptKey = findColumnKey(row, ['currentdepartment', 'department', 'dept', 'divisi', 'division', 'bagian', 'empdept']);
  const department = deptKey ? String(row[deptKey]).trim() : 'Umum';

  // Match Designation / Position
  const desigKey = findColumnKey(row, ['currentdesignation', 'designation', 'designationname', 'jabatan', 'posisi', 'position', 'role']);
  const designation = desigKey ? String(row[desigKey]).trim() : '';

  // Match Gender
  const genderKey = findColumnKey(row, ['gender', 'jeniskelamin', 'sex', 'jk']);
  let gender: 'L' | 'P' | 'Unknown' = 'Unknown';
  if (genderKey && row[genderKey]) {
    const val = String(row[genderKey]).toLowerCase().trim();
    if (val.startsWith('f') || val.startsWith('p') || val === 'w' || val.includes('wanita') || val.includes('perempuan')) {
      gender = 'P';
    } else if (val.startsWith('m') || val.startsWith('l') || val.includes('laki') || val.includes('pria')) {
      gender = 'L';
    }
  }

  // Match Date of Joining
  const joinKey = findColumnKey(row, ['dateofjoining', 'joindate', 'tglmasuk', 'tanggalmasuk', 'contractstart', 'doh', 'hiredate']);
  const dateOfJoining = joinKey ? formatExcelDate(row[joinKey]) : '';

  // Match Education / Qualification
  const eduKey = findColumnKey(row, ['education', 'qualification', 'pendidikan', 'sekolah', 'gelar']);
  const education = eduKey ? String(row[eduKey]).trim() : '';

  // Match Place Of Birth
  const pobKey = findColumnKey(row, ['placeofbirth', 'birthplace', 'tempatlahir', 'pob']);
  const placeOfBirth = pobKey ? String(row[pobKey]).trim() : '';

  // Match Date Of Birth
  const dobKey = findColumnKey(row, ['dateofbirth', 'birthdate', 'tanggallahir', 'dob']);
  const dateOfBirth = dobKey ? formatExcelDate(row[dobKey]) : '';

  // Determine Employee Contract Type: PKWTT (Permanent) vs PKWT (Contract)
  const typeKey = findColumnKey(row, ['employeetype', 'employmentstatus', 'status', 'statuskaryawan', 'type', 'employeecategory', 'statuskerja']);
  let employeeType: 'PKWTT' | 'PKWT' | 'Unknown' = 'Unknown';

  // Back up checks with Sheet Name
  const sheetNameLower = sheetName.toLowerCase();
  
  if (typeKey && row[typeKey]) {
    const val = String(row[typeKey]).toLowerCase().trim();
    if (val.includes('permanent') || val.includes('permanen') || val.includes('pkwtt') || val.includes('tetap')) {
      employeeType = 'PKWTT';
    } else if (val.includes('contract') || val.includes('kontrak') || val.includes('pkwt') || val.includes('magang') || val.includes('probation')) {
      employeeType = 'PKWT';
    }
  }

  // If status is still unknown, infer from Sheet Name
  if (employeeType === 'Unknown') {
    if (sheetNameLower.includes('permanen') || sheetNameLower.includes('permanent') || sheetNameLower.includes('pkwtt')) {
      employeeType = 'PKWTT';
    } else if (sheetNameLower.includes('kontrak') || sheetNameLower.includes('contract') || sheetNameLower.includes('pkwt')) {
      employeeType = 'PKWT';
    } else {
      // Default to PKWTT to be safe or leave as Unknown. Let's make an intelligent guess if employee ID has certain patterns
      // but let's default to PKWTT for safety.
      employeeType = 'PKWTT';
    }
  }

  return {
    id,
    name,
    companyCode,
    department,
    employeeType,
    gender,
    designation,
    dateOfJoining,
    education,
    placeOfBirth,
    dateOfBirth,
    originalRow: row
  };
}

/**
 * Determines if an employee works at the Head Office (HO) or Site based primarily on company code / entity values.
 * "apabila ada 'HO' maka itu di HO, sedangkan apabila hanya code perusahaan maka itu site"
 */
export function getEmployeeWorkArea(emp: EmployeeRaw): 'HO' | 'Site' {
  // Candidate columns for finding company, company code, or branch entity
  const companyKeys = [
    'companycode', 'company_code', 'empcompanycode', 'company', 
    'perusahaan', 'entity', 'businessunit', 'bu', 'branch', 'site', 
    'lokasi', 'location', 'workarea', 'deskripsiperusahaan', 'companyname'
  ];

  if (emp.originalRow) {
    const keys = Object.keys(emp.originalRow);
    const normalizedKeys = companyKeys.map(k => k.toLowerCase().replace(/[^a-z0-9]/g, ''));

    // Try finding exact/contained match for company keys
    let matchedVal = '';
    for (const key of keys) {
      const normKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (normalizedKeys.includes(normKey)) {
        matchedVal = String(emp.originalRow[key] || '').toUpperCase();
        break;
      }
    }

    // If we didn't find an exact key match, check if any companyKey is a substring of the key
    if (!matchedVal) {
      for (const key of keys) {
        const normKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
        for (const ck of normalizedKeys) {
          if (normKey.includes(ck) || ck.includes(normKey)) {
            matchedVal = String(emp.originalRow[key] || '').toUpperCase();
            break;
          }
        }
        if (matchedVal) break;
      }
    }

    if (matchedVal) {
      // If there is "HO" (or related head office words like JAKARTA, HEAD OFFICE, PUSAT, PST) in the company code column, then it is HO
      if (
        matchedVal.includes('HO') || 
        matchedVal.includes('HEAD OFFICE') || 
        matchedVal.includes('JAKARTA') || 
        matchedVal.includes('PST') || 
        matchedVal.includes('PUSAT')
      ) {
        return 'HO';
      }
      // If it is only the company code or site code itself, it is Site
      return 'Site';
    }
  }

  // Fallback scan on properties if no company column is found or originalRow is missing
  const empId = String(emp.id || '').toUpperCase();
  const dept = String(emp.department || '').toUpperCase();
  const designation = String(emp.designation || '').toUpperCase();
  
  if (
    empId.startsWith('HO') || 
    empId.includes('/HO/') || 
    empId.includes('JAK') ||
    dept.includes('HO') || 
    dept.includes('HEAD OFFICE') || 
    dept.includes('JAKARTA') || 
    dept.includes('PST') || 
    dept.includes('PUSAT') || 
    dept.includes('OFFICE') ||
    designation.includes('HO') || 
    designation.includes('JAKARTA') ||
    designation.includes('OFFICE')
  ) {
    return 'HO';
  }

  return 'Site';
}

/**
 * Categorizes an employee's designation into a structured Job Level hierarchy: Management, Supervisor, Staff, or Non-Staff.
 */
export function getEmployeeJobLevel(emp: EmployeeRaw): 'Management' | 'Supervisor' | 'Staff' | 'Non-Staff' {
  const title = String(emp.designation || '').toUpperCase();
  if (!title) return 'Non-Staff';

  // Management (Director, GM, Superintendent, Head, etc.)
  if (
    title.includes('MANAGER') || 
    title.includes('GENERAL MANAGER') || 
    title.includes('DIREKTUR') || 
    title.includes('DIRECTOR') || 
    title.includes('KOMISARIS') || 
    title.includes('COMMISSIONER') || 
    title.includes('SUPERINTENDENT') || 
    title.includes('CHIEF') || 
    title.includes('VP') || 
    title.includes('PRESIDENT') || 
    (title.includes('HEAD') && !title.includes('SECTION HEAD'))
  ) {
    return 'Management';
  }

  // Supervisor (Section Head, Supervisor, Foreman, Lead, Coordinator)
  if (
    title.includes('SUPERVISOR') || 
    title.includes('SPV') || 
    title.includes('FOREMAN') || 
    title.includes('LEAD') || 
    title.includes('SECTION HEAD') || 
    title.includes('COORDINATOR') || 
    title.includes('KOORDINATOR')
  ) {
    return 'Supervisor';
  }

  // Staff (Staff, Officer, Specialist, Analyst, Engineer, Accountant)
  if (
    title.includes('STAFF') || 
    title.includes('OFFICER') || 
    title.includes('ADMIN') || 
    title.includes('ENGINEER') || 
    title.includes('SPECIALIST') || 
    title.includes('ANALYST') || 
    title.includes('CLERK') || 
    title.includes('SECRETARY') || 
    title.includes('ACCOUNTANT') || 
    title.includes('BUYER') || 
    title.includes('TRAINER') || 
    title.includes('NURSE')
  ) {
    return 'Staff';
  }

  // Non-Staff / Operational Roles (Operators, Drivers, Helpers, Crew)
  return 'Non-Staff';
}
