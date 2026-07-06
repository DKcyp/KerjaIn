import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Folder, File } from 'lucide-react';

export interface TreeNode {
  id: number;
  name: string;
  children?: TreeNode[];
  isLeaf?: boolean;
  data?: any;
  type?: 'project' | 'module' | 'task';
  progress?: number;
  taskCount?: number;
}

interface TreeViewProps {
  data: TreeNode[];
  onNodeClick?: (node: TreeNode) => void;
  renderNode?: (node: TreeNode) => React.ReactNode;
}

export const TreeView = ({ data, onNodeClick, renderNode }: TreeViewProps) => {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const toggleExpand = (id: number) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderTreeNode = (node: TreeNode, depth = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expanded.has(node.id);

    return (
      <div key={node.id} className="w-full">
        <div 
          className={`flex items-center py-1 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer ${depth > 0 ? 'pl-6' : ''}`}
          style={{ paddingLeft: `${depth * 1}rem` }}
          onClick={() => onNodeClick?.(node)}
        >
          {hasChildren && (
            <button 
              className="p-1 mr-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(node.id);
              }}
            >
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          )}
          
          {!hasChildren && <div className="w-6" />}
          
          <div className="flex items-center flex-1 min-w-0">
            {node.type === 'project' && <Folder className="mr-2 text-blue-500 flex-shrink-0" size={16} />}
            {node.type === 'module' && <Folder className="mr-2 text-yellow-500 flex-shrink-0" size={16} />}
            {node.type === 'task' && <File className="mr-2 text-gray-400 flex-shrink-0" size={16} />}
            
            <span className="truncate">
              {node.name}
              {node.taskCount !== undefined && (
                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                  ({node.taskCount} tasks)
                </span>
              )}
            </span>
            
            {node.progress !== undefined && (
              <div className="ml-auto flex items-center w-32">
                <div className="h-2 flex-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${
                      node.progress < 30 ? 'bg-red-500' : 
                      node.progress < 70 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${node.progress}%` }}
                  />
                </div>
                <span className="ml-2 text-xs text-gray-500 dark:text-gray-400 w-8">
                  {node.progress}%
                </span>
              </div>
            )}
          </div>
        </div>
        
        {hasChildren && isExpanded && (
          <div className="ml-4">
            {node.children?.map(child => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full border rounded-md overflow-hidden">
      {data.map(node => renderTreeNode(node))}
    </div>
  );
};
