import * as XLSX from 'xlsx';

// Helper function to download Excel template
export function downloadExcelTemplate() {
  // Create workbook
  const wb = XLSX.utils.book_new();
  
  // Create data for the template
  const data = [
    // Row 1: Header BA Info
    ['Nama Berita Acara', 'Versi', 'Deskripsi'],
    // Row 2: Example BA Info
    ['User Management System', '1.0.0', 'Sistem manajemen user dengan fitur role-based access control'],
    // Row 3: Empty
    [],
    // Row 4: Header Table
    ['Modul Utama', 'Sub Modul', 'Nama Task'],
    // Row 5+: Example data
    ['User Management', 'User CRUD', 'Create User API'],
    ['User Management', 'User CRUD', 'Update User API'],
    ['User Management', 'User CRUD', 'Delete User API'],
    ['User Management', 'Role Management', 'Create Role API'],
    ['User Management', 'Role Management', 'Assign Role to User'],
    ['Product Management', 'Product CRUD', 'List Products API'],
    ['Product Management', 'Product CRUD', 'Create Product API'],
    ['Product Management', 'Category Management', 'Manage Categories'],
    ['Reporting', 'Sales Report', 'Generate Sales Report'],
    ['Reporting', 'User Activity Report', 'Track User Activities'],
  ];
  
  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(data);
  
  // Set column widths
  ws['!cols'] = [
    { wch: 25 }, // Modul Utama
    { wch: 25 }, // Sub Modul
    { wch: 30 }, // Nama Task
  ];
  
  // Style header rows (row 1 and row 4)
  const headerStyle = {
    font: { bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '4472C4' } },
    alignment: { horizontal: 'center', vertical: 'center' }
  };
  
  // Apply styles to headers (A1:C1 and A4:C4)
  ['A1', 'B1', 'C1', 'A4', 'B4', 'C4'].forEach(cell => {
    if (ws[cell]) {
      ws[cell].s = headerStyle;
    }
  });
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Blueprint Template');
  
  // Generate Excel file and trigger download
  XLSX.writeFile(wb, 'blueprint_template.xlsx');
}
