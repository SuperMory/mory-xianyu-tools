import React from 'react';
import {
  Fish,
  Minus,
  Square,
  X,
  ShieldCheck,
  Bell,
  RefreshCw,
  Sliders,
  Radio,
} from 'lucide-react';
import { XianYuAccount } from '../types';

interface Props {
  accounts: XianYuAccount[];
  activeAccountId: string;
  onSelectAccount: (id: string) => void;
  globalBotActive: boolean;
  onToggleGlobalBot: () => void;
  desktopNotifications: boolean;
  onToggleDesktopNotifications: () => void;
  onOpenSpecs: () => void;
  onOpenPackager: () => void;
}

export const DesktopHeader: React.FC<Props> = ({
  accounts,
  activeAccountId,
  onSelectAccount,
  globalBotActive,
  onToggleGlobalBot,
  desktopNotifications,
  onToggleDesktopNotifications,
  onOpenSpecs,
  onOpenPackager,
}) => {
  const activeAccount = accounts.find((a) => a.id === activeAccountId) || accounts[0];

  return (
    <header className="h-12 bg-slate-950 border-b border-slate-800 flex items-center justify-between px-4 select-none shrink-0 z-40">
      {/* Left: Brand & Drag Area */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/20">
            <Fish className="w-4 h-4" />
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-bold text-sm tracking-wide text-white">魔力咸鱼助手</span>
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
              Desktop v3.2 Pro
            </span>
          </div>
        </div>

        {/* WebSocket Ping status */}
        <div className="hidden lg:flex items-center space-x-1.5 text-xs px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-slate-400 font-mono text-[11px]">WS 28ms</span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-300 text-[11px]">Mtop v7.8 已注入</span>
        </div>
      </div>

      {/* Middle: Active Account Switcher & Global Control */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Account Selector */}
        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs shrink-0">
          <span className="text-slate-400 hidden lg:inline whitespace-nowrap">工作账号:</span>
          <select
            value={activeAccountId}
            onChange={(e) => onSelectAccount(e.target.value)}
            className="bg-transparent text-slate-200 font-medium focus:outline-hidden cursor-pointer max-w-[130px] sm:max-w-[160px] truncate"
          >
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id} className="bg-slate-900 text-slate-200">
                {acc.nickname} ({acc.status === 'online' ? '🟢在线' : acc.status === 'busy' ? '🟡忙碌' : '🔴离线'})
              </option>
            ))}
          </select>
        </div>

        {/* Global Bot Toggle */}
        <button
          onClick={onToggleGlobalBot}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 whitespace-nowrap ${
            globalBotActive
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 shadow-xs'
              : 'bg-rose-500/15 text-rose-400 border border-rose-500/30 hover:bg-rose-500/25 shadow-xs'
          }`}
          title={globalBotActive ? '点击暂停所有账号自动回复' : '点击启动所有账号自动回复'}
        >
          <Radio className={`w-3.5 h-3.5 shrink-0 ${globalBotActive ? 'animate-pulse' : ''}`} />
          <span className="hidden xl:inline">{globalBotActive ? '自动化监控运行中' : '自动化已全局暂停'}</span>
          <span className="xl:hidden">{globalBotActive ? '监控中' : '已暂停'}</span>
        </button>

        {/* Quick Notification Toggle */}
        <button
          onClick={onToggleDesktopNotifications}
          className={`p-1.5 rounded-lg border transition-colors shrink-0 ${
            desktopNotifications
              ? 'bg-slate-800 border-slate-700 text-amber-400'
              : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
          }`}
          title={desktopNotifications ? '桌面通知已开启' : '桌面通知已关闭'}
        >
          <Bell className="w-4 h-4" />
        </button>
      </div>

      {/* Right: Technical reference + Packager + Windows-like Window Controls */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onOpenSpecs}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-amber-400 transition-colors whitespace-nowrap shrink-0"
        >
          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
          <span>技术协议参考</span>
        </button>

        <button
          onClick={onOpenPackager}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 transition-colors whitespace-nowrap shrink-0"
        >
          <Sliders className="w-3.5 h-3.5 shrink-0" />
          <span>打包EXE</span>
        </button>

        {/* Window controls simulation */}
        <div className="flex items-center space-x-1 pl-2 border-l border-slate-800 text-slate-400">
          <button
            onClick={() => alert('已触发模拟窗口最小化 (已常驻后台托盘)')}
            className="w-7 h-7 flex items-center justify-center hover:bg-slate-800 hover:text-white rounded transition-colors"
            title="最小化到托盘"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => alert('已最大化/还原当前魔力咸鱼助手窗口')}
            className="w-7 h-7 flex items-center justify-center hover:bg-slate-800 hover:text-white rounded transition-colors"
            title="最大化"
          >
            <Square className="w-3 h-3" />
          </button>
          <button
            onClick={() => {
              if (confirm('确定要退出魔力咸鱼助手吗？正在进行的自动回复与订单监听将挂起。')) {
                alert('魔力咸鱼助手已安全停止后台任务并保存当前状态。');
              }
            }}
            className="w-7 h-7 flex items-center justify-center hover:bg-rose-600 hover:text-white rounded transition-colors"
            title="关闭窗口"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
