import { useState, useCallback, useRef, useMemo } from 'react';
import {
  Plus, Trash2,
  Type, Hash, ListChecks, Calendar, CheckSquare, ChevronDown
} from 'lucide-react';
import type { DatabaseCellValue, DatabaseColumn, DatabaseRow } from '../BlockElement';
import { MenuItem, MenuPopup } from './ui';

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

// 聚焦/编辑中单元格的 --selection 描边：用 inset box-shadow 实现 ring，
// 避免普通 ring 向单元格外扩时被相邻单元格/容器裁切
const CELL_FOCUS_RING =
  'focus-within:shadow-[inset_0_0_0_2px_hsl(var(--selection)/0.5)]';

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

  // 用 useMemo 保持引用稳定，避免下方各 useCallback 每次渲染都失效
  const safeCols = useMemo(() => columns?.length ? columns : [
    { id: 'col_1', name: '名称', type: 'text' as const },
    { id: 'col_2', name: '状态', type: 'select' as const, options: ['待办', '进行中', '已完成'] },
  ], [columns]);
  const safeRows = useMemo(() => rows?.length ? rows : [], [rows]);

  const updateCell = useCallback((rowId: string, colId: string, value: DatabaseCellValue) => {
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
      const rest = { ...r };
      delete rest[colId];
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

  const startEditCell = (rowId: string, colId: string, value: DatabaseCellValue | undefined) => {
    setEditingCell({ rowId, colId });
    setEditValue(value?.toString() || '');
    setTimeout(() => inputRef.current?.focus(), 10);
  };

  const commitEdit = () => {
    if (!editingCell) return;
    const col = safeCols.find(c => c.id === editingCell.colId);
    if (!col) return;
    let value: DatabaseCellValue = editValue;
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
            className="h-4 w-4 rounded border-border accent-primary"
          />
        );
      }
      if (col.type === 'select') {
        return (
          <select
            value={(value || '') as string}
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
            // 中文输入法组词期间不拦截按键（候选词选择、上屏）
            if (e.nativeEvent.isComposing) return;
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
          className="h-4 w-4 cursor-pointer rounded border-border accent-primary"
        />
      );
    }

    return (
      <button
        onClick={() => startEditCell(row.id, col.id, value)}
        className="w-full truncate rounded px-1 py-0.5 text-left text-sm text-foreground outline-none"
      >
        {value || <span className="text-muted-foreground/40">空</span>}
      </button>
    );
  };

  return (
    <div className="my-1 w-full">
      {/* 表格容器 */}
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        {/* 表头：置于滚动容器之外，滚动时天然吸顶（同时避免列菜单被 overflow 裁切） */}
        <div className="flex items-center border-b border-border bg-surface-2">
          <div className="w-8 flex-shrink-0" /> {/* 序号占位 */}
          {safeCols.map((col) => {
            const Icon = COLUMN_TYPE_ICONS[col.type] || Type;
            return (
              <div key={col.id} className="group/col relative min-w-[100px] flex-1 px-2 py-2">
                <div className="flex items-center gap-1.5">
                  <Icon className="h-4 w-4 flex-shrink-0 text-muted-foreground" strokeWidth={1.75} />
                  {editingColName === col.id ? (
                    <input
                      value={colNameValue}
                      onChange={(e) => setColNameValue(e.target.value)}
                      onBlur={() => {
                        if (colNameValue.trim()) renameColumn(col.id, colNameValue.trim());
                        setEditingColName(null);
                      }}
                      onKeyDown={(e) => {
                        // 中文输入法组词期间不拦截按键（候选词选择、上屏）
                        if (e.nativeEvent.isComposing) return;
                        if (e.key === 'Enter') {
                          if (colNameValue.trim()) renameColumn(col.id, colNameValue.trim());
                          setEditingColName(null);
                        }
                        if (e.key === 'Escape') setEditingColName(null);
                      }}
                      className="w-full bg-transparent text-xs font-medium text-muted-foreground outline-none"
                      autoFocus
                    />
                  ) : (
                    <button
                      onClick={() => {
                        setEditingColName(col.id);
                        setColNameValue(col.name);
                      }}
                      className="truncate text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {col.name}
                    </button>
                  )}
                  <button
                    onClick={() => setShowColMenu(showColMenu === col.id ? null : col.id)}
                    className="rounded p-0.5 opacity-0 transition-opacity hover:bg-accent group-hover/col:opacity-100"
                  >
                    <ChevronDown className="h-3 w-3 text-muted-foreground" strokeWidth={1.75} />
                  </button>
                </div>

                {/* 列类型菜单 */}
                {showColMenu === col.id && (
                  <MenuPopup className="absolute left-0 top-full z-dropdown mt-1 w-36 py-1">
                    {(['text', 'number', 'select', 'date', 'checkbox'] as const).map(type => {
                      const TIcon = COLUMN_TYPE_ICONS[type];
                      return (
                        <MenuItem
                          key={type}
                          bleed
                          size="sm"
                          className={`gap-2 ${col.type === type ? 'font-medium text-primary' : ''}`}
                          icon={<TIcon className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />}
                          onClick={() => {
                            changeColumnType(col.id, type);
                            setShowColMenu(null);
                          }}
                        >
                          {COLUMN_TYPE_LABELS[type]}
                        </MenuItem>
                      );
                    })}
                    <div className="my-1 border-t border-border" />
                    <MenuItem
                      bleed
                      size="sm"
                      tone="danger"
                      className="gap-2"
                      icon={<Trash2 className="h-4 w-4" strokeWidth={1.75} />}
                      onClick={() => {
                        deleteColumn(col.id);
                        setShowColMenu(null);
                      }}
                    >
                      删除列
                    </MenuItem>
                  </MenuPopup>
                )}
              </div>
            );
          })}
          {/* 添加列按钮 */}
          {!readOnly && (
            <div className="flex-shrink-0 px-2">
              <button
                onClick={() => addColumn('text')}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                title="添加列"
              >
                <Plus className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </div>
          )}
        </div>

        {/* 表体：限高滚动，表头保持吸顶；分隔线统一走 divide，新增行为底部虚线行 */}
        <div className="max-h-[480px] divide-y divide-border overflow-y-auto">
          {safeRows.map((row, idx) => (
            <div
              key={row.id}
              className="group/row flex items-center transition-colors hover:bg-surface-1"
            >
              <div className="flex w-8 flex-shrink-0 items-center justify-center text-caption tabular-nums text-muted-foreground">
                {idx + 1}
              </div>
              {safeCols.map(col => (
                <div key={col.id} className={`min-w-[100px] flex-1 px-2 py-2 ${CELL_FOCUS_RING}`}>
                  {renderCell(row, col)}
                </div>
              ))}
              {!readOnly && (
                <div className="flex flex-shrink-0 items-center px-2 opacity-0 transition-opacity group-hover/row:opacity-100">
                  <button
                    onClick={() => deleteRow(row.id)}
                    className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    title="删除行"
                  >
                    <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                  </button>
                </div>
              )}
            </div>
          ))}

          {/* 空状态 */}
          {safeRows.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              暂无数据，点击下方新增一行
            </div>
          )}

          {/* 新增行：表格底部虚线行，hover 实色化 */}
          {!readOnly && (
            <button
              onClick={addRow}
              className="flex w-full items-center gap-2 border-dashed px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-surface-1 hover:text-foreground"
            >
              <Plus className="h-4 w-4" strokeWidth={1.75} />
              新增行
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
