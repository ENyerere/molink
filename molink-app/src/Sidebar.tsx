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
    <div className="w-64 bg-[#f9f9f9] text-gray-800 flex flex-col border-r border-gray-200 h-full shadow-sm">
      {/* 标题区域 */}
      <div className="p-4 font-bold border-b border-gray-200 flex justify-between items-center bg-white">
        <span className="text-lg font-semibold tracking-tight">我的页面</span>
        <button
          onClick={addPage}
          className="text-gray-800 bg-white hover:bg-gray-100 px-3 py-2 rounded-lg 
                     transition-all duration-200 ease-in-out border border-gray-300
                     flex items-center justify-center focus:ring-2 focus:ring-gray-300 focus:outline-none
                     shadow-sm hover:shadow"
          aria-label="添加新页面"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          <span className="ml-2 text-sm">新建</span>
        </button>
      </div>
      
      {/* 页面列表 */}
      <div className="flex-1 overflow-y-auto py-2 px-2">
        {pages.map(page => (
          <div
            key={page.id}
            onClick={() => setActivePageId(page.id)}
            className={`px-4 py-2 cursor-pointer transition-all duration-200 ease-in-out rounded
              my-1
              ${
                activePageId === page.id 
                  ? 'bg-gray-100 font-medium' 
                  : 'hover:bg-gray-100'
              }`}
          >
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-3 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
              </svg>
              <span className="truncate">{page.title || '未命名页面'}</span>
            </div>
          </div>
        ))}
      </div>
      
      {/* 空状态 */}
      {pages.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-gray-500">
          <div className="relative mb-4">
            <div className="w-16 h-20 bg-gray-200 rounded shadow-inner"></div>
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-white border border-gray-300 rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <p className="mb-4 text-gray-600">暂无页面</p>
          <button
            onClick={addPage}
            className="text-sm px-4 py-2 bg-white hover:bg-gray-100 rounded transition-colors
                      border border-gray-300 shadow-sm hover:shadow"
          >
            创建第一个页面
          </button>
        </div>
      )}
      
      {/* 底部信息 */}
      <div className="p-3 text-xs text-gray-500 border-t border-gray-200 bg-white flex justify-between">
        <span>总页面: {pages.length}</span>
        <span>v1.0.0</span>
      </div>
    </div>
  );
}