import type { PageData, User } from './App';

interface SidebarProps {
  pages: PageData[];
  activePageId: string | null;
  setActivePageId: (id: string) => void;
  addPage: () => void;
  user: User | null;
  onShowLogin?: () => void;
}

export default function Sidebar({
  pages,
  activePageId,
  setActivePageId,
  addPage,
  user,
  onShowLogin
}: SidebarProps) {
  return (
    <div className="w-64 bg-[#f9f9f9] text-gray-800 flex flex-col border-r border-gray-200 h-full shadow-sm">
      {/* 用户信息区域 */}
      <div className="p-4 border-b border-gray-200 bg-white">
        {user ? (
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden">
              <img
                src={user.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=" + user.name}
                alt="用户头像"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="ml-3">
              <div className="text-sm font-medium text-gray-900">{user.name}</div>
              <div className="text-xs text-gray-500">的 Molink</div>
            </div>
          </div>
        ) : (
          <button 
            onClick={() => onShowLogin?.()}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            登录 Molink
          </button>
        )}
      </div>

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
        <div className="flex-1"></div>
      )}
      
      {/* 底部信息 */}
      <div className="p-3 text-xs text-gray-500 border-t border-gray-200 bg-white flex justify-between">
        <span>总页面: {pages.length}</span>
        <span>v1.0.0</span>
      </div>
    </div>
  );
}