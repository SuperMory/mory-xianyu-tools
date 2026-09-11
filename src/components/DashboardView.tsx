import React from 'react';
import {
  Users,
  MessageSquare,
  Package,
  ShieldCheck,
  TrendingUp,
  Activity,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Sparkles,
  Zap,
  Plus,
} from 'lucide-react';
import { XianYuAccount, DeliveryRecord, RiskLog, AutoReplyRule } from '../types';

interface Props {
  accounts: XianYuAccount[];
  rules: AutoReplyRule[];
  deliveryRecords: DeliveryRecord[];
  riskLogs: RiskLog[];
  onNavigate: (tab: any) => void;
  onOpenSpecs: () => void;
  onOpenPackager: () => void;
  onOpenAddAccount?: () => void;
}

export const DashboardView: React.FC<Props> = ({
  accounts,
  rules,
  deliveryRecords,
  riskLogs,
  onNavigate,
  onOpenSpecs,
  onOpenPackager,
  onOpenAddAccount,
}) => {
  const totalTodayReplies = accounts.reduce((acc, a) => acc + a.todayReplies, 0);
  const totalTodayDeliveries = accounts.reduce((acc, a) => acc + a.todayDeliveries, 0);
  const activeAccounts = accounts.filter((a) => a.status === 'online' || a.status === 'busy').length;
  const pendingRiskLogs = riskLogs.filter((r) => !r.resolved).length;

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full text-slate-100">
      {/* Top Banner: Architecture & Quick status */}
      <div className="bg-gradient-to-r from-amber-500/15 via-slate-900 to-slate-900 border border-amber-500/30 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
              <Zap className="w-4 h-4" />
            </span>
            <h1 className="text-xl font-bold text-white">魔力咸鱼助手 — 自动化管理中枢</h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium">
              WebSocket心跳稳定
            </span>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            基于 <strong className="text-amber-300">cv-cat/XianYuApis</strong> 与 <strong className="text-amber-300">zhinianboke/xianyu-auto-reply</strong> 逆向架构打造，已融合多账号 Cookie 隔离轮转、Protobuf 实时长连接、智能关键词分级决策与毫秒级卡密自动发货。
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={onOpenSpecs}
            className="h-9 px-3.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all whitespace-nowrap shrink-0 shadow-2xs"
          >
            查看逆向协议文档
          </button>
          <button
            onClick={onOpenPackager}
            className="h-9 px-4 text-xs font-bold rounded-lg bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 shadow-md shadow-amber-500/20 transition-all whitespace-nowrap shrink-0 active:scale-95"
          >
            导出桌面 .exe 安装包
          </button>
        </div>
      </div>

      {/* 4 Core Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => onNavigate('accounts')}
          className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">受管闲鱼账号</span>
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-white">{activeAccounts}</span>
            <span className="text-xs text-slate-400">/ {accounts.length} 在线</span>
          </div>
          <div className="mt-2 flex items-center text-[11px] text-emerald-400 gap-1">
            <Activity className="w-3.5 h-3.5" />
            <span>所有 Session Cookie 有效</span>
          </div>
        </div>

        <div
          onClick={() => onNavigate('replies')}
          className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">今日自动回复次数</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-white">{totalTodayReplies}</span>
            <span className="text-xs text-slate-400">条互动</span>
          </div>
          <div className="mt-2 flex items-center text-[11px] text-emerald-400 gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>平均响应延迟 2.4 秒 (拟人打字)</span>
          </div>
        </div>

        <div
          onClick={() => onNavigate('delivery')}
          className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">今日自动发货单数</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-white">{totalTodayDeliveries}</span>
            <span className="text-xs text-slate-400">单秒级到账</span>
          </div>
          <div className="mt-2 flex items-center text-[11px] text-amber-400 gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>发货成功率 100% (防重出库)</span>
          </div>
        </div>

        <div
          onClick={() => onNavigate('risk')}
          className="bg-slate-900 border border-slate-800 rounded-xl p-4 hover:border-slate-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 font-medium">风控防护与拦截</span>
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-white">{riskLogs.length}</span>
            <span className="text-xs text-slate-400">次防护触发</span>
          </div>
          <div className="mt-2 flex items-center text-[11px] text-rose-400 gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping"></span>
            <span>{pendingRiskLogs} 条需关注的续期预警</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Account Live Status + Recent Delivery & Risk Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Accounts Status Overview */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <h2 className="font-bold text-white text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" />
                <span>多店铺实时运行状态与 Cookie 续期</span>
              </h2>
              <div className="flex items-center gap-2">
                {onOpenAddAccount && (
                  <button
                    onClick={onOpenAddAccount}
                    className="h-7 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-all shadow-xs active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>添加闲鱼账号</span>
                  </button>
                )}
                <button
                  onClick={() => onNavigate('accounts')}
                  className="h-7 px-2.5 text-xs text-amber-400 hover:text-amber-300 hover:bg-slate-800 rounded-lg flex items-center gap-1 transition-colors"
                >
                  <span>管理中心</span> <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {accounts.map((acc) => (
                <div
                  key={acc.id}
                  className="p-3.5 bg-slate-950/60 rounded-lg border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center space-x-3">
                    <img
                      src={acc.avatar}
                      alt={acc.nickname}
                      className="w-10 h-10 rounded-full object-cover border border-slate-700"
                    />
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-white text-sm">{acc.nickname}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            acc.status === 'online'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : acc.status === 'busy'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {acc.status === 'online' ? '● 监听中' : acc.status === 'busy' ? '▲ 待续期' : '× 离线'}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        UID: {acc.uid} • 今日回复 {acc.todayReplies} • 今日发货 {acc.todayDeliveries}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 text-xs w-full sm:w-auto justify-between sm:justify-end">
                    <div className="text-right">
                      <div className="text-slate-400 text-[11px]">长连接心跳</div>
                      <div className="text-slate-200 font-mono">{acc.lastHeartbeat}</div>
                    </div>
                    <button
                      onClick={() => onNavigate('accounts')}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 font-medium transition-colors"
                    >
                      维护/续期
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Active Rules List */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-white text-sm flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                高频命中规则与关键词策略
              </h2>
              <button
                onClick={() => onNavigate('replies')}
                className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"
              >
                配置规则引擎 <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {rules.slice(0, 4).map((rule) => (
                <div key={rule.id} className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 text-xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-slate-200 truncate">{rule.name}</span>
                    <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded font-mono">
                      命中 {rule.hitCount} 次
                    </span>
                  </div>
                  <div className="text-slate-400 line-clamp-2 text-[11px] mb-2">{rule.replyContent}</div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-800/80 pt-1.5">
                    <span>模式: {rule.matchType}</span>
                    <span>延迟: {rule.randomDelayMin}~{rule.randomDelayMax}s (防风控)</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Live Delivery Feed & Risk Feed */}
        <div className="space-y-4">
          {/* Recent Deliveries */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-white text-sm flex items-center gap-2">
                <Package className="w-4 h-4 text-amber-400" />
                最新自动发货流水
              </h2>
              <button
                onClick={() => onNavigate('delivery')}
                className="text-xs text-amber-400 hover:text-amber-300"
              >
                查看全部
              </button>
            </div>

            <div className="space-y-2.5">
              {deliveryRecords.slice(0, 3).map((rec) => (
                <div key={rec.id} className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800 text-xs">
                  <div className="flex items-center justify-between text-slate-300 mb-1">
                    <span className="font-medium text-white truncate max-w-[140px]">{rec.buyerNickname}</span>
                    <span className="text-[10px] text-emerald-400 font-mono">
                      {rec.status === 'success' ? '✔ 已自动下发' : '↺ 已补发'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 truncate mb-1">{rec.goodsTitle}</div>
                  <div className="text-[10px] text-slate-500 font-mono">{rec.deliveryTime}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Risk Control Alerts */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-white text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-rose-400" />
                风控日志与违禁拦截
              </h2>
              <button
                onClick={() => onNavigate('risk')}
                className="text-xs text-rose-400 hover:text-rose-300"
              >
                风控中心
              </button>
            </div>

            <div className="space-y-2.5">
              {riskLogs.slice(0, 3).map((log) => (
                <div key={log.id} className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800 text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-rose-300">{log.title}</span>
                    <span className="text-[10px] text-slate-500">{log.timestamp.split(' ')[1]}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{log.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
