import React from 'react';
import type { PageData } from './App';

interface SidebarProps {
  pages: PageData[];
  activePageId: string | null;
  setActivePageId: (id: string) => void;
  addPage: () => void;
}

export default function Sidebar({
  pages,
  activePageId,
  setActivePageId,
  addPage
}: SidebarProps) {
  return (
    <div className="w-64 bg-gray-900 text-white flex flex-col">
      <div className="p-4 font-bold border-b border-gray-700 flex justify-between items-center">
        Pages
        <button
          onClick={addPage}
          className="bg-blue-500 hover:bg-blue-600 px-2 py-1 rounded"
        >
          +
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {pages.map(page => (
          <div
            key={page.id}
            onClick={() => setActivePageId(page.id)}
            className={`p-3 cursor-pointer hover:bg-gray-700 ${
              activePageId === page.id ? 'bg-gray-700' : ''
            }`}
          >
            {page.title || '未命名页面'}
          </div>
        ))}
      </div>
    </div>
  );
}
