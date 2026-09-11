import React from 'react';
import {
  LayoutDashboard,
  Users,
  MessageSquareReply,
  PackageCheck,
  MessageCircle,
  ShieldAlert,
  Terminal,
  Download,
  Info,
} from 'lucide-react';

export type NavTab = 'dashboard' | 'accounts' | 'replies' | 'delivery' | 'chat' | 'risk';

interface Props {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  unreadCount: number;
  riskCount: number;
  availableCardsCount: number;
  onOpenSpecs: () => void;
  onOpenPackager: () => void;
}

export const Sidebar: React.FC<Props> = ({
  activeTab,
  onSelectTab,
  unreadCount,
  riskCount,
  availableCardsCount,
  onOpenSpecs,
  onOpenPackager,
}) => {
  const navItems = [
    { id: 'dashboard', label: '运行总览', icon: LayoutDashboard, badge: null },
    { id: 'accounts', label: '多账号管理', icon: Users, badge: '3店' },
    { id: 'replies', label: '自动回复', icon: MessageSquareReply, badge: '活跃' },
    {
      id: 'delivery',
      label: '自动发货',
      icon: PackageCheck,
      badge: availableCardsCount > 0 ? `${availableCardsCount}库存` : '无库存',
      badgeType: availableCardsCount > 0 ? 'amber' : 'gray',
    },
    {
      id: 'chat',
      label: '在线聊天',
      icon: MessageCircle,
      badge: unreadCount > 0 ? `${unreadCount}` : null,
      badgeType: 'red',
    },
    {
      id: 'risk',
      label: '通知与风控',
      icon: ShieldAlert,
      badge: riskCount > 0 ? `${riskCount}预警` : null,
      badgeType: 'rose',
    },
  ];

  return (
    <aside className="w-56 bg-slate-950 border-r border-slate-800 flex flex-col justify-between shrink-0 select-none">
      {/* Navigation list */}
      <div className="p-3 space-y-1">
        <div className="px-3 py-2 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
          业务功能模块
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id as NavTab)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all group ${
                isActive
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                  : 'text-slate-300 hover:text-white hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Icon
                  className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                    isActive ? 'text-slate-950' : 'text-slate-400 group-hover:text-amber-400'
                  }`}
                />
                <span>{item.label}</span>
              </div>

              {item.badge && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                    isActive
                      ? 'bg-slate-950/20 text-slate-950'
                      : item.badgeType === 'red' || item.badgeType === 'rose'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse'
                      : item.badgeType === 'amber'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bottom reference & desktop tools */}
      <div className="p-3 border-t border-slate-800 space-y-1.5 bg-slate-950/80 text-xs">
        <div className="px-3 py-1 text-[11px] font-semibold text-slate-500 uppercase">
          技术与工程
        </div>
        <button
          onClick={onOpenSpecs}
          className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-slate-300 hover:text-amber-400 hover:bg-slate-900 transition-colors text-left"
        >
          <Terminal className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="truncate">协议逆向与技术栈</span>
        </button>

        <button
          onClick={onOpenPackager}
          className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-slate-300 hover:text-amber-300 hover:bg-amber-500/10 border border-transparent hover:border-amber-500/30 transition-colors text-left"
        >
          <Download className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="truncate">打包为桌面 EXE</span>
        </button>

        <div className="pt-2 px-2 text-[10px] text-slate-500 flex items-center justify-between">
          <span>协议架构: Mtop/WS</span>
          <span className="text-emerald-500">Node/Python</span>
        </div>
      </div>
    </aside>
  );
};
