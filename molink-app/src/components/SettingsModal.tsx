import { useRef, useEffect } from 'react';
import { X, Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import AnimatedPresence from './AnimatedPresence';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { theme, setTheme } = useTheme();
  const modalRef = useRef<HTMLDivElement>(null);

  // ESC 关闭
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  return (
    <AnimatedPresence
      show={isOpen}
      duration={200}
      enterFrom="opacity-0"
      enterTo="opacity-100"
    >
    <div className="fixed inset-0 z-[70] flex items-center justify-center">
      {/* 背景遮罩（不模糊） */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div
        ref={modalRef}
        className="relative bg-card rounded-xl shadow-2xl w-full max-w-[520px] max-h-[80vh] flex flex-col overflow-hidden transition-all duration-200 ease-out"
        style={{
          opacity: isOpen ? 1 : 0,
          transform: isOpen ? 'scale(1)' : 'scale(0.95)',
        }}
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-card-foreground">设置</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 外观设置 */}
          <div className="mb-8">
            <h3 className="text-sm font-semibold text-card-foreground uppercase tracking-wide mb-4">
              外观
            </h3>

            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setTheme('light')}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  theme === 'light'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-muted-foreground'
                }`}
              >
                <Sun className={`w-6 h-6 ${theme === 'light' ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className={`text-sm font-medium ${theme === 'light' ? 'text-primary' : 'text-secondary-foreground'}`}>
                  日间
                </span>
              </button>

              <button
                onClick={() => setTheme('dark')}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  theme === 'dark'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-muted-foreground'
                }`}
              >
                <Moon className={`w-6 h-6 ${theme === 'dark' ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className={`text-sm font-medium ${theme === 'dark' ? 'text-primary' : 'text-secondary-foreground'}`}>
                  夜间
                </span>
              </button>

              <button
                onClick={() => setTheme('system')}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  theme === 'system'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-muted-foreground'
                }`}
              >
                <Monitor className={`w-6 h-6 ${theme === 'system' ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className={`text-sm font-medium ${theme === 'system' ? 'text-primary' : 'text-secondary-foreground'}`}>
                  跟随系统
                </span>
              </button>
            </div>
          </div>

          {/* 其他设置占位 */}
          <div>
            <h3 className="text-sm font-semibold text-card-foreground uppercase tracking-wide mb-4">
              通知
            </h3>
            <div className="space-y-3">
              <label className="flex items-center justify-between py-2">
                <span className="text-sm text-secondary-foreground">邮件通知</span>
                <input type="checkbox" className="w-4 h-4 rounded border-border" defaultChecked />
              </label>
              <label className="flex items-center justify-between py-2">
                <span className="text-sm text-secondary-foreground">浏览器推送</span>
                <input type="checkbox" className="w-4 h-4 rounded border-border" />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
    </AnimatedPresence>
  );
}
