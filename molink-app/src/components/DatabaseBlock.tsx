import { useState, useCallback, useRef } from 'react';
import {
  Plus, Trash2, GripVertical, MoreHorizontal, Check, X,
  Type, Hash, ListChecks, Calendar, CheckSquare, ChevronDown
} from 'lucide-react';
import type { DatabaseColumn, DatabaseRow } from '../BlockElement';

interface DatabaseBlockProps {
  columns: DatabaseColumn[];
  rows: DatabaseRow[];
  onChange: (columns: DatabaseColumn[], rows: DatabaseRow[]) => void;
  readOnly?: boolean;
}

const COLUMN_TYPE_ICONS: Record<string, React.ElementType> = {
  text: Type,
  number: Hash,
  select: ListChecks,
  date: Calendar,
  checkbox: CheckSquare,
};

const COLUMN_TYPE_LABELS: Record<string, string> = {
  text: '文本',
  number: '数字',
  select: '选择',
  date: '日期',
  checkbox: '复选框',
};

function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

export default function DatabaseBlock({ columns, rows, onChange, readOnly }: DatabaseBlockProps) {
  const [editingCell, setEditingCell] = useState<{ rowId: string; colId: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showColMenu, setShowColMenu] = useState<string | null>(null);
  const [editingColName, setEditingColName] = useState<string | null>(null);
  const [colNameValue, setColNameValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const safeCols = columns?.length ? columns : [
    { id: 'col_1', name: '名称', type: 'text' as const },
    { id: 'col_2', name: '状态', type: 'select' as const, options: ['待办', '进行中', '已完成'] },
  ];
  const safeRows = rows?.length ? rows : [];

  const updateCell = useCallback((rowId: string, colId: string, value: any) => {
    const newRows = safeRows.map(r => r.id === rowId ? { ...r, [colId]: value } : r);
    onChange(safeCols, newRows);
  }, [safeCols, safeRows, onChange]);

  const addRow = useCallback(() => {
    const newRow: DatabaseRow = { id: generateId() };
    for (const col of safeCols) {
      newRow[col.id] = col.type === 'checkbox' ? false : '';
    }
    onChange(safeCols, [...safeRows, newRow]);
  }, [safeCols, safeRows, onChange]);

  const deleteRow = useCallback((rowId: string) => {
    onChange(safeCols, safeRows.filter(r => r.id !== rowId));
  }, [safeCols, safeRows, onChange]);

  const addColumn = useCallback((type: DatabaseColumn['type'] = 'text') => {
    const newCol: DatabaseColumn = {
      id: `col_${generateId()}`,
      name: '新列',
      type,
      options: type === 'select' ? ['选项1'] : undefined,
    };
    const newRows = safeRows.map(r => ({ ...r, [newCol.id]: type === 'checkbox' ? false : '' }));
    onChange([...safeCols, newCol], newRows);
  }, [safeCols, safeRows, onChange]);

  const deleteColumn = useCallback((colId: string) => {
    const newCols = safeCols.filter(c => c.id !== colId);
    const newRows = safeRows.map(r => {
      const { [colId]: _, ...rest } = r;
      return rest;
    });
    onChange(newCols, newRows);
  }, [safeCols, safeRows, onChange]);

  const renameColumn = useCallback((colId: string, newName: string) => {
    const newCols = safeCols.map(c => c.id === colId ? { ...c, name: newName } : c);
    onChange(newCols, safeRows);
  }, [safeCols, safeRows, onChange]);

  const changeColumnType = useCallback((colId: string, newType: DatabaseColumn['type']) => {
    const newCols = safeCols.map(c =>
      c.id === colId
        ? { ...c, type: newType, options: newType === 'select' ? ['选项1'] : undefined }
        : c
    );
    const newRows = safeRows.map(r => ({
      ...r,
      [colId]: newType === 'checkbox' ? false : '',
    }));
    onChange(newCols, newRows);
  }, [safeCols, safeRows, onChange]);

  const startEditCell = (rowId: string, colId: string, value: any) => {
    setEditingCell({ rowId, colId });
    setEditValue(value?.toString() || '');
    setTimeout(() => inputRef.current?.focus(), 10);
  };

  const commitEdit = () => {
    if (!editingCell) return;
    const col = safeCols.find(c => c.id === editingCell.colId);
    if (!col) return;
    let value: any = editValue;
    if (col.type === 'number') value = parseFloat(editValue) || 0;
    updateCell(editingCell.rowId, editingCell.colId, value);
    setEditingCell(null);
  };

  const renderCell = (row: DatabaseRow, col: DatabaseColumn) => {
    const value = row[col.id];
    const isEditing = editingCell?.rowId === row.id && editingCell?.colId === col.id;

    if (isEditing) {
      if (col.type === 'checkbox') {
        return (
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => {
              updateCell(row.id, col.id, e.target.checked);
              setEditingCell(null);
            }}
            className="w-4 h-4 rounded border-border accent-primary"
          />
        );
      }
      if (col.type === 'select') {
        return (
          <select
            value={value || ''}
            onChange={(e) => {
              updateCell(row.id, col.id, e.target.value);
              setEditingCell(null);
            }}
            className="w-full bg-transparent text-sm outline-none"
            autoFocus
          >
            {(col.options || []).map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        );
      }
      return (
        <input
          ref={inputRef}
          type={col.type === 'number' ? 'number' : 'text'}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitEdit();
            if (e.key === 'Escape') setEditingCell(null);
          }}
          className="w-full bg-transparent text-sm outline-none"
        />
      );
    }

    if (col.type === 'checkbox') {
      return (
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => updateCell(row.id, col.id, e.target.checked)}
          className="w-4 h-4 rounded border-border accent-primary cursor-pointer"
        />
      );
    }

    return (
      <button
        onClick={() => startEditCell(row.id, col.id, value)}
        className="w-full text-left text-sm text-foreground truncate hover:bg-accent/50 px-1 py-0.5 rounded transition-colors"
      >
        {value || <span className="text-muted-foreground/40">空</span>}
      </button>
    );
  };

  return (
    <div className="w-full my-1">
      {/* 表格容器 */}
      <div className="border border-border rounded-lg overflow-hidden bg-card">
        {/* 表头 */}
        <div className="flex items-center bg-muted/60 border-b border-border">
          <div className="w-8 flex-shrink-0" /> {/* 拖拽/序号占位 */}
          {safeCols.map((col) => {
            const Icon = COLUMN_TYPE_ICONS[col.type] || Type;
            return (
              <div key={col.id} className="flex-1 min-w-[100px] px-2 py-2 border-r border-border last:border-r-0 relative group/col">
                <div className="flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  {editingColName === col.id ? (
                    <input
                      value={colNameValue}
                      onChange={(e) => setColNameValue(e.target.value)}
                      onBlur={() => {
                        if (colNameValue.trim()) renameColumn(col.id, colNameValue.trim());
                        setEditingColName(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          if (colNameValue.trim()) renameColumn(col.id, colNameValue.trim());
                          setEditingColName(null);
                        }
                        if (e.key === 'Escape') setEditingColName(null);
                      }}
                      className="w-full bg-transparent text-xs font-semibold uppercase tracking-wider text-muted-foreground outline-none"
                      autoFocus
                    />
                  ) : (
                    <button
                      onClick={() => {
                        setEditingColName(col.id);
                        setColNameValue(col.name);
                      }}
                      className="text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {col.name}
                    </button>
                  )}
                  <button
                    onClick={() => setShowColMenu(showColMenu === col.id ? null : col.id)}
                    className="opacity-0 group-hover/col:opacity-100 p-0.5 rounded hover:bg-accent transition-opacity"
                  >
                    <ChevronDown className="w-3 h-3 text-muted-foreground" />
                  </button>
                </div>

                {/* 列类型菜单 */}
                {showColMenu === col.id && (
                  <div className="absolute top-full left-0 mt-1 z-20 bg-card border border-border rounded-lg shadow-lg py-1 w-36">
                    {(['text', 'number', 'select', 'date', 'checkbox'] as const).map(type => {
                      const TIcon = COLUMN_TYPE_ICONS[type];
                      return (
                        <button
                          key={type}
                          onClick={() => {
                            changeColumnType(col.id, type);
                            setShowColMenu(null);
                          }}
                          className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent transition-colors ${
                            col.type === type ? 'text-primary font-medium' : 'text-secondary-foreground'
                          }`}
                        >
                          <TIcon className="w-3.5 h-3.5" />
                          {COLUMN_TYPE_LABELS[type]}
                        </button>
                      );
                    })}
                    <div className="border-t border-border my-1" />
                    <button
                      onClick={() => {
                        deleteColumn(col.id);
                        setShowColMenu(null);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      删除列
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {/* 添加列按钮 */}
          {!readOnly && (
            <div className="flex-shrink-0 px-2">
              <button
                onClick={() => addColumn('text')}
                className="p-1 rounded hover:bg-accent text-muted-foreground transition-colors"
                title="添加列"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* 表体 */}
        <div>
          {safeRows.map((row, idx) => (
            <div
              key={row.id}
              className="flex items-center border-b border-border last:border-b-0 hover:bg-accent/30 transition-colors group/row"
            >
              <div className="w-8 flex-shrink-0 flex items-center justify-center text-xs text-muted-foreground">
                {idx + 1}
              </div>
              {safeCols.map(col => (
                <div key={col.id} className="flex-1 min-w-[100px] px-2 py-2 border-r border-border last:border-r-0">
                  {renderCell(row, col)}
                </div>
              ))}
              {!readOnly && (
                <div className="flex-shrink-0 px-2 opacity-0 group-hover/row:opacity-100 transition-opacity">
                  <button
                    onClick={() => deleteRow(row.id)}
                    className="p-1 rounded hover:bg-accent text-muted-foreground transition-colors"
                    title="删除行"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 空状态 */}
        {safeRows.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            暂无数据，点击下方按钮添加行
          </div>
        )}

        {/* 添加行 */}
        {!readOnly && (
          <div className="px-4 py-2 border-t border-border">
            <button
              onClick={addRow}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <Plus className="w-4 h-4" />
              新建
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
