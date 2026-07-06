// Utility functions for module handling

export const getModuleDisplayName = (
  moduleId: number | null,
  moduleLabelCache: Record<number, string>
): string | null => {
  if (!moduleId) return null;
  
  // Return from cache if available
  if (moduleLabelCache[moduleId]) {
    return moduleLabelCache[moduleId];
  }
  
  // Fallback to ID-based display
  return `Modul #${moduleId}`;
};

export const loadModuleDisplayName = async (
  moduleId: number
): Promise<string> => {
  try {
    const res = await fetch(`/api/modules/${moduleId}`, { 
      credentials: 'include' 
    });
    
    if (res.ok) {
      const data = await res.json();
      return data.module?.displayName || `Modul #${moduleId}`;
    }
  } catch (error) {
    console.error('Failed to load module name:', error);
  }
  
  return `Modul #${moduleId}`;
};

export const buildModuleLabelCache = (
  tree: Array<{ id: number; nama: string; kode?: string; children?: any[] }>
): Record<number, string> => {
  const labels: Record<number, string> = {};
  const codeMap = new Map<number, string>();
  
  const walk = (nodes: any[], parentPath: string | null) => {
    for (const node of nodes) {
      const label = parentPath ? `${parentPath} - ${node.nama}` : node.nama;
      
      if (typeof node.kode === 'string' && node.kode) {
        codeMap.set(node.id, node.kode);
      }
      
      const code = codeMap.get(node.id);
      labels[node.id] = code ? `${code} — ${label}` : label;
      
      if (node.children && node.children.length) {
        walk(node.children, label);
      }
    }
  };
  
  walk(tree, null);
  return labels;
};