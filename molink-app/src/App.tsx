import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Editor from './Editor';
import { v4 as uuidv4 } from 'uuid';
import type { Descendant, Element } from 'slate';

export interface PageData {
  id: string;
  title: string;
  content: Descendant[];
  cover?: string; // 新增，用于存封面图片 URL
}

export default function App() {
  const [pages, setPages] = useState<PageData[]>([]);
  const [activePageId, setActivePageId] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('molink-pages');
    if (saved) {
      const parsed: PageData[] = JSON.parse(saved);
      setPages(parsed);
      if (parsed.length) setActivePageId(parsed[0].id);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('molink-pages', JSON.stringify(pages));
  }, [pages]);

  const addPage = () => {
    const id = uuidv4();
    const newPage: PageData = {
      id,
      title: '新页面',
      content: [{
        type: 'paragraph',
        children: [{ text: '' }]
      } as Element]
    };
    setPages(prev => [...prev, newPage]);
    setActivePageId(id);
  };

  const updatePage = (id: string, newData: Partial<PageData>) => {
    setPages(prev => prev.map(p => p.id === id ? { ...p, ...newData } : p));
  };

  return (
    <div className="flex h-screen">
      <Sidebar
        pages={pages}
        activePageId={activePageId}
        setActivePageId={setActivePageId}
        addPage={addPage}
      />
      <div className="flex-1 overflow-auto">
        {activePageId && (
          <Editor
            page={pages.find(p => p.id === activePageId)!}
            updatePage={updatePage}
          />
        )}
      </div>
    </div>
  );
}
