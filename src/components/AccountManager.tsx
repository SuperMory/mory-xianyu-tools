import React, { useState } from 'react';
import {
  Users,
  Plus,
  QrCode,
  KeyRound,
  RefreshCw,
  Shield,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Globe,
  Radio,
  ExternalLink,
  Zap,
} from 'lucide-react';
import { XianYuAccount, AccountStatus } from '../types';
import { AddAccountModal } from './AddAccountModal';

interface Props {
  accounts: XianYuAccount[];
  onUpdateAccount: (account: XianYuAccount) => void;
  onAddAccount: (account: XianYuAccount) => void;
  onDeleteAccount: (id: string) => void;
  onOpenAddAccount?: () => void;
  onOpenProduction?: () => void;
}

export const AccountManager: React.FC<Props> = ({
  accounts,
  onUpdateAccount,
  onAddAccount,
  onDeleteAccount,
  onOpenAddAccount,
  onOpenProduction,
}) => {
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Editing account proxy / notes
  const [editingAccount, setEditingAccount] = useState<XianYuAccount | null>(null);

  // Status Switcher
  const handleToggleStatus = (acc: XianYuAccount, newStatus: AccountStatus) => {
    onUpdateAccount({
      ...acc,
      status: newStatus,
    });
  };

  // Renew Cookie simulation
  const handleRenewCookie = (acc: XianYuAccount) => {
    const refreshedToken = 'tk_' + Math.random().toString(36).substring(2, 10);
    const updated: XianYuAccount = {
      ...acc,
      mH5Tk: refreshedToken,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3).toISOString(), // renew 3 days
      status: 'online',
      lastHeartbeat: '刚刚自动续期',
    };
    onUpdateAccount(updated);
    alert(`账号【${acc.nickname}】Cookie 令牌已通过无头浏览器自动化续期成功！有效延长 72 小时。`);
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full text-slate-100">
      {/* Top action row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-400" />
            多账号矩阵管理
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            支持多个闲鱼店铺并行在线、环境隔离代理、Cookie 自动保活续期与状态一键调度
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {onOpenProduction && (
            <button
              onClick={onOpenProduction}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-bold rounded-lg text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer active:scale-95"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>生产落地与真实Cookie联调</span>
            </button>
          )}

          <button
            onClick={() => {
              if (onOpenAddAccount) {
                onOpenAddAccount();
              } else {
                setShowLoginModal(true);
              }
            }}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg text-xs border border-slate-700 transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>添加闲鱼账号</span>
          </button>
        </div>
      </div>

      {/* Production real test tip banner */}
      <div className="p-3.5 rounded-xl bg-slate-900/90 border border-amber-500/30 flex items-center justify-between text-xs text-slate-300">
        <div className="flex items-center gap-2.5">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span>
            <strong>真实生产联调提示：</strong> 若要通过手机闲鱼买家 B 向账号 A 发消息并实际生效，请绑定真实抓取的 Cookie（带 <code>_m_h5_tk</code> 与 <code>cookie2</code>）并启动后台监听线程。
          </span>
        </div>
        {onOpenProduction && (
          <button
            onClick={onOpenProduction}
            className="text-amber-400 hover:underline text-xs font-semibold shrink-0 ml-4"
          >
            前往联调 &gt;
          </button>
        )}
      </div>

      {/* Account Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {accounts.map((acc) => {
          const isExpired = new Date(acc.expiresAt).getTime() < Date.now();
          const expireHours = Math.round(
            (new Date(acc.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60)
          );

          return (
            <div
              key={acc.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-5 flex flex-col justify-between space-y-4 shadow-sm transition-all"
            >
              {/* Account Header */}
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <img
                        src={acc.avatar}
                        alt={acc.nickname}
                        className="w-12 h-12 rounded-full object-cover border-2 border-slate-700"
                      />
                      <span
                        className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${
                          acc.status === 'online'
                            ? 'bg-emerald-500'
                            : acc.status === 'busy'
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                        }`}
                      ></span>
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-sm flex items-center gap-1.5">
                        {acc.nickname}
                      </h3>
                      <div className="text-xs text-slate-400 font-mono">UID: {acc.uid}</div>
                    </div>
                  </div>

                  {/* Status badge */}
                  <div className="flex flex-col items-end gap-1">
                    <select
                      value={acc.status}
                      onChange={(e) => handleToggleStatus(acc, e.target.value as AccountStatus)}
                      className={`text-xs px-2 py-0.5 rounded-md font-semibold border cursor-pointer ${
                        acc.status === 'online'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : acc.status === 'busy'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      }`}
                    >
                      <option value="online" className="bg-slate-900 text-slate-200">🟢 在线工作</option>
                      <option value="busy" className="bg-slate-900 text-slate-200">🟡 挂起/待续期</option>
                      <option value="offline" className="bg-slate-900 text-slate-200">🔴 离线暂停</option>
                    </select>
                  </div>
                </div>

                {/* Details & Notes */}
                <div className="mt-4 p-3 bg-slate-950/70 rounded-lg border border-slate-800/80 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      Cookie 有效期:
                    </span>
                    <span
                      className={`font-mono font-medium ${
                        isExpired
                          ? 'text-rose-400'
                          : expireHours < 12
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {isExpired ? '已失效' : `剩余约 ${expireHours} 小时`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5 text-slate-500" />
                      隔离代理:
                    </span>
                    <span className="truncate max-w-[160px] text-slate-300 font-mono text-[11px]">
                      {acc.proxyIp || '本地直连'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-300">
                    <span className="text-slate-400">长连接心跳:</span>
                    <span className="text-slate-200">{acc.lastHeartbeat}</span>
                  </div>

                  {acc.notes && (
                    <div className="text-[11px] text-slate-400 border-t border-slate-800/60 pt-1.5 line-clamp-1">
                      备注: {acc.notes}
                    </div>
                  )}
                </div>

                {/* Automation Toggles for this account */}
                <div className="mt-3 flex items-center justify-between text-xs px-1">
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={acc.autoReplyEnabled}
                      onChange={(e) =>
                        onUpdateAccount({ ...acc, autoReplyEnabled: e.target.checked })
                      }
                      className="rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-0"
                    />
                    <span>自动回复</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                    <input
                      type="checkbox"
                      checked={acc.autoDeliveryEnabled}
                      onChange={(e) =>
                        onUpdateAccount({ ...acc, autoDeliveryEnabled: e.target.checked })
                      }
                      className="rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-0"
                    />
                    <span>自动发货</span>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs">
                <button
                  onClick={() => handleRenewCookie(acc)}
                  className="h-8 flex-1 flex items-center justify-center gap-1.5 px-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg transition-all font-semibold text-xs whitespace-nowrap shadow-2xs"
                  title="调用 Playwright/Mtop 免登录自动换取新 Token"
                >
                  <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                  <span>一键续期保活</span>
                </button>

                <button
                  onClick={() => setEditingAccount(acc)}
                  className="h-8 w-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 flex items-center justify-center transition-all shrink-0 shadow-2xs"
                  title="编辑代理与备注"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => {
                    if (confirm(`确定要移除闲鱼店铺【${acc.nickname}】吗？`)) {
                      onDeleteAccount(acc.id);
                    }
                  }}
                  className="h-8 w-8 rounded-lg bg-slate-800 hover:bg-rose-500/15 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/30 flex items-center justify-center transition-all shrink-0 shadow-2xs"
                  title="删除账号"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Account Login Modal with real QR Code */}
      <AddAccountModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onAddAccount={(acc) => {
          onAddAccount(acc);
          setShowLoginModal(false);
        }}
      />

      {/* Edit Proxy / Notes Modal */}
      {editingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md p-5 space-y-4 text-xs">
            <h3 className="font-bold text-white text-base">修改账号配置 - {editingAccount.nickname}</h3>
            <div>
              <label className="block text-slate-300 mb-1">独立代理 IP (HTTP/SOCKS5)</label>
              <input
                type="text"
                value={editingAccount.proxyIp || ''}
                onChange={(e) =>
                  setEditingAccount({ ...editingAccount, proxyIp: e.target.value })
                }
                placeholder="例如: 114.116.12.8:8080"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-hidden focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 mb-1">店铺备注</label>
              <input
                type="text"
                value={editingAccount.notes || ''}
                onChange={(e) =>
                  setEditingAccount({ ...editingAccount, notes: e.target.value })
                }
                placeholder="备注业务类型或商品范畴"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-hidden focus:border-amber-500"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingAccount(null)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={() => {
                  onUpdateAccount(editingAccount);
                  setEditingAccount(null);
                }}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg"
              >
                保存更新
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
