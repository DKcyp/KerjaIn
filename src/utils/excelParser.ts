// Utility to parse Excel files for blueprint import
import * as XLSX from 'xlsx';

export type ParsedBAInfo = {
  nama: string;
  version: string;
  deskripsi: string;
};

export type ParsedRow = {
  mainModule: string;
  subModule: string;
  taskName: string;
  originalRowNumber: number;
};

export type ParsedExcelData = {
  baInfo: ParsedBAInfo;
  rows: ParsedRow[];
  errors: string[];
};

/**
 * Parse Excel file content into structured data
 * Expected format:
 * Row 1: Nama Berita Acara | Versi | Deskripsi
 * Row 2: [BA Name] | [Version] | [Description]
 * Row 3: (empty)
 * Row 4: Modul Utama | Sub Modul | Nama Task
 * Row 5+: [Data rows]
 */
export function parseExcelContent(arrayBuffer: ArrayBuffer): ParsedExcelData {
  const errors: string[] = [];
  
  try {
    // Read workbook from array buffer
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    
    // Get first sheet
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      errors.push('File Excel tidak memiliki sheet');
      return {
        baInfo: { nama: '', version: '', deskripsi: '' },
        rows: [],
        errors
      };
    }
    
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert sheet to JSON (array of arrays)
    const data: any[][] = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1,
      defval: '',
      blankrows: false 
    });
    
    // Validate minimum rows
    if (data.length < 5) {
      errors.push('File tidak valid: minimal harus ada 5 baris (header BA, data BA, kosong, header tabel, data)');
      return {
        baInfo: { nama: '', version: '', deskripsi: '' },
        rows: [],
        errors
      };
    }

    // Parse BA Info (row 2, index 1)
    const baInfoRow = data[1];
    const baInfo: ParsedBAInfo = {
      nama: String(baInfoRow[0] || '').trim(),
      version: String(baInfoRow[1] || '1.0.0').trim(),
      deskripsi: String(baInfoRow[2] || '').trim()
    };

    if (!baInfo.nama) {
      errors.push('Nama Berita Acara wajib diisi (Cell A2)');
    }
    
    if (!baInfo.version) {
      errors.push('Versi wajib diisi (Cell B2)');
    }

    // Parse data rows (starting from row 5, index 4)
    const rows: ParsedRow[] = [];
    for (let i = 4; i < data.length; i++) {
      const row = data[i];
      
      // Skip empty rows
      if (!row || row.length === 0 || !row.some(cell => cell)) {
        continue;
      }
      
      // Skip if not enough columns
      if (row.length < 3) {
        errors.push(`Baris ${i + 1}: Format tidak valid, harus ada 3 kolom (Modul Utama, Sub Modul, Nama Task)`);
        continue;
      }

      const mainModule = String(row[0] || '').trim();
      const subModule = String(row[1] || '').trim();
      const taskName = String(row[2] || '').trim();

      rows.push({
        mainModule,
        subModule,
        taskName,
        originalRowNumber: i + 1
      });
    }

    if (rows.length === 0) {
      errors.push('Tidak ada data modul/task yang ditemukan. Pastikan data dimulai dari baris ke-5');
    }

    return {
      baInfo,
      rows,
      errors
    };
    
  } catch (error) {
    console.error('Error parsing Excel:', error);
    errors.push(`Error parsing Excel: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return {
      baInfo: { nama: '', version: '', deskripsi: '' },
      rows: [],
      errors
    };
  }
}

/**
 * Validate file type
 */
export function validateFileType(file: File): { valid: boolean; error?: string } {
  const validTypes = [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
  
  const validExtensions = ['.xls', '.xlsx'];
  const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  
  if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
    return {
      valid: false,
      error: 'Format file tidak valid. Gunakan file Excel (.xls atau .xlsx)'
    };
  }
  
  // Check file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'Ukuran file terlalu besar. Maksimal 5MB'
    };
  }
  
  return { valid: true };
}

/**
 * Read file content as ArrayBuffer for Excel parsing
 */
export function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      resolve(arrayBuffer);
    };
    
    reader.onerror = () => {
      reject(new Error('Gagal membaca file'));
    };
    
    reader.readAsArrayBuffer(file);
  });
}
