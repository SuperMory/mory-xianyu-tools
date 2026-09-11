import React, { useState } from 'react';
import { X, Package, Download, Terminal, Check, Copy, Monitor, Cpu, Sparkles } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ElectronPackagerModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const PACKAGE_JSON_SNIPPET = `{
  "main": "electron/main.cjs",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "electron:dev": "concurrently \\"vite\\" \\"wait-on http://localhost:3000 && electron .\\"",
    "electron:build": "vite build && electron-builder --win --x64"
  },
  "build": {
    "appId": "com.magic.xianyu.assistant",
    "productName": "魔力咸鱼助手",
    "directories": {
      "output": "release"
    },
    "win": {
      "target": "nsis",
      "icon": "public/icon.ico"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true
    }
  }
}`;

  const BUILD_CMD = `# 1. 安装 Electron 打包依赖
npm install -D electron electron-builder concurrently wait-on

# 2. 本地以桌面原生窗口模式调试运行
npm run electron:dev

# 3. 编译打包生成 Windows 可执行安装程序 (魔力咸鱼助手.exe)
npm run electron:build`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                桌面客户端 (EXE) 打包与发布指引
              </h2>
              <p className="text-xs text-slate-400">
                支持打包为 Windows 独立执行程序 (.exe)，具备无边框原生窗体与系统级托盘通知
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 text-sm max-h-[75vh] overflow-y-auto">
          {/* Status Box */}
          <div className="p-4 bg-gradient-to-r from-amber-500/10 via-slate-800/50 to-slate-800/20 border border-amber-500/30 rounded-lg flex items-start gap-3">
            <div className="p-2 bg-amber-500/20 rounded-md text-amber-400 shrink-0 mt-0.5">
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold text-white mb-1 flex items-center gap-2">
                原生桌面特性已就绪
                <span className="text-xs font-normal text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Ready for Electron
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                当前项目已配置好了仿原生桌面标题栏、托盘缩放支持、本地持久化存储与 <code className="text-amber-300 font-mono">electron/main.cjs</code>、<code className="text-amber-300 font-mono">electron/preload.cjs</code> 入口文件。直接通过下列命令即可生成独立 EXE 安装包。
              </p>
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-3">
            <h3 className="font-semibold text-white flex items-center gap-2 text-sm">
              <Terminal className="w-4 h-4 text-amber-400" />
              打包生成 .exe 步骤
            </h3>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-slate-400">命令行运行:</span>
                <button
                  onClick={() => handleCopy('build_cmd', BUILD_CMD)}
                  className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded"
                >
                  {copiedKey === 'build_cmd' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  复制终端命令
                </button>
              </div>
              <pre className="text-xs font-mono text-amber-300/90 whitespace-pre-wrap leading-relaxed">
                {BUILD_CMD}
              </pre>
            </div>
          </div>

          {/* Configuration */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white text-xs">package.json 桌面打包配置清单</h3>
              <button
                onClick={() => handleCopy('pkg_json', PACKAGE_JSON_SNIPPET)}
                className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded"
              >
                {copiedKey === 'pkg_json' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                复制配置
              </button>
            </div>
            <pre className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto max-h-48">
              {PACKAGE_JSON_SNIPPET}
            </pre>
          </div>

          {/* Features note */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-800/40 rounded-lg border border-slate-700/50">
              <span className="font-semibold text-white block mb-1">⚡ 原生进程保活</span>
              <span className="text-slate-400">支持最小化至 Windows 系统任务栏托盘，后台持续运行 WebSocket 自动回复与发货服务。</span>
            </div>
            <div className="p-3 bg-slate-800/40 rounded-lg border border-slate-700/50">
              <span className="font-semibold text-white block mb-1">🛡️ 独立环境隔离</span>
              <span className="text-slate-400">支持每个闲鱼账号配置独立 Proxy 代理，多账号 Cookie 隔离防关联。</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors text-xs"
          >
            关闭指引
          </button>
        </div>
      </div>
    </div>
  );
};
