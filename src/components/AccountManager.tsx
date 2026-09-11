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

interface Props {
  accounts: XianYuAccount[];
  onUpdateAccount: (account: XianYuAccount) => void;
  onAddAccount: (account: XianYuAccount) => void;
  onDeleteAccount: (id: string) => void;
}

export const AccountManager: React.FC<Props> = ({
  accounts,
  onUpdateAccount,
  onAddAccount,
  onDeleteAccount,
}) => {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'qrcode' | 'cookie'>('qrcode');
  const [qrStep, setQrStep] = useState<'ready' | 'scanned' | 'confirmed'>('ready');
  const [cookieInput, setCookieInput] = useState('');
  const [nicknameInput, setNicknameInput] = useState('');
  const [proxyInput, setProxyInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [parseError, setParseError] = useState('');

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

  // Parse Raw Cookie
  const handleImportCookie = () => {
    setParseError('');
    if (!cookieInput.trim()) {
      setParseError('请输入有效的 Cookie 字符串');
      return;
    }

    // Extract _m_h5_tk, unb, cookie2
    const tkMatch = cookieInput.match(/_m_h5_tk=([^;]+)/);
    const unbMatch = cookieInput.match(/unb=([^;]+)/);
    const cookie2Match = cookieInput.match(/cookie2=([^;]+)/);
    const encMatch = cookieInput.match(/_m_h5_tk_enc=([^;]+)/);

    const uid = unbMatch ? unbMatch[1] : Math.floor(100000000 + Math.random() * 900000000).toString();
    const token = tkMatch ? tkMatch[1] : 'tk_' + Math.random().toString(36).substring(2, 12);
    const nick = nicknameInput.trim() || `闲鱼店铺_${uid.slice(-4)}`;

    const newAcc: XianYuAccount = {
      id: `acc_${Date.now()}`,
      nickname: nick,
      avatar: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80`,
      uid,
      status: 'online',
      cookies: cookieInput.trim(),
      mH5Tk: token,
      mH5TkEnc: encMatch ? encMatch[1] : 'enc_mock_hash',
      cookie2: cookie2Match ? cookie2Match[1] : 'cookie2_mock',
      unb: uid,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(),
      todayReplies: 0,
      todayDeliveries: 0,
      proxyIp: proxyInput.trim() || '直连环境 (默认本机)',
      autoReplyEnabled: true,
      autoDeliveryEnabled: true,
      lastHeartbeat: '刚刚接入',
      notes: notesInput.trim() || '手动 Cookie 导入账号',
    };

    onAddAccount(newAcc);
    setShowLoginModal(false);
    setCookieInput('');
    setNicknameInput('');
    setProxyInput('');
    setNotesInput('');
  };

  // Simulate QR Code scan
  const handleSimulateQrScan = () => {
    setQrStep('scanned');
    setTimeout(() => {
      setQrStep('confirmed');
      setTimeout(() => {
        const uid = Math.floor(200000000 + Math.random() * 800000000).toString();
        const newAcc: XianYuAccount = {
          id: `acc_${Date.now()}`,
          nickname: nicknameInput.trim() || `扫码认证店_${uid.slice(-4)}`,
          avatar: `https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&auto=format&fit=crop&q=80`,
          uid,
          status: 'online',
          cookies: `_m_h5_tk=qr_${Date.now()}; unb=${uid}; cookie2=c2_${Date.now()}`,
          mH5Tk: `qr_token_${Date.now()}`,
          mH5TkEnc: 'enc_' + Math.random().toString(36).substring(2, 8),
          cookie2: 'c2_' + Math.random().toString(36).substring(2, 8),
          unb: uid,
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 72).toISOString(),
          todayReplies: 0,
          todayDeliveries: 0,
          proxyIp: proxyInput.trim() || '直连环境 (默认本机)',
          autoReplyEnabled: true,
          autoDeliveryEnabled: true,
          lastHeartbeat: '扫码握手成功',
          notes: notesInput.trim() || '闲鱼客户端扫码登录',
        };
        onAddAccount(newAcc);
        setShowLoginModal(false);
        setQrStep('ready');
      }, 1200);
    }, 1500);
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

        <button
          onClick={() => setShowLoginModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs shadow-md shadow-amber-500/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>添加闲鱼账号</span>
        </button>
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

      {/* Account Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden text-slate-100">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">添加与接入闲鱼账号</h3>
                  <p className="text-xs text-slate-400">支持闲鱼 App 扫码登录或直接导入 Cookie</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowLoginModal(false);
                  setQrStep('ready');
                }}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Method Switch */}
              <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
                <button
                  onClick={() => setLoginMethod('qrcode')}
                  className={`py-2 rounded-md font-medium flex items-center justify-center gap-1.5 transition-colors ${
                    loginMethod === 'qrcode'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  <span>闲鱼 App 扫码登录</span>
                </button>
                <button
                  onClick={() => setLoginMethod('cookie')}
                  className={`py-2 rounded-md font-medium flex items-center justify-center gap-1.5 transition-colors ${
                    loginMethod === 'cookie'
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <KeyRound className="w-4 h-4" />
                  <span>手动导入 Cookie</span>
                </button>
              </div>

              {loginMethod === 'qrcode' ? (
                <div className="flex flex-col items-center justify-center p-6 bg-slate-950/50 rounded-xl border border-slate-800 text-center space-y-4">
                  <div className="p-3 bg-white rounded-xl shadow-lg relative">
                    {/* Simulated QR Pattern */}
                    <div className="w-44 h-44 bg-white flex flex-col items-center justify-center border-2 border-slate-900 p-2">
                      <div className="grid grid-cols-6 gap-1 w-full h-full p-2 bg-slate-100 rounded">
                        {Array.from({ length: 36 }).map((_, i) => (
                          <div
                            key={i}
                            className={`rounded-xs ${
                              (i % 2 === 0 || i % 5 === 0) && i % 7 !== 0 ? 'bg-slate-900' : 'bg-transparent'
                            }`}
                          ></div>
                        ))}
                      </div>
                    </div>

                    {qrStep === 'scanned' && (
                      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xs rounded-xl flex flex-col items-center justify-center text-amber-400 text-xs font-bold gap-2">
                        <RefreshCw className="w-6 h-6 animate-spin" />
                        <span>已扫码，请在手机上点击确认登录</span>
                      </div>
                    )}
                    {qrStep === 'confirmed' && (
                      <div className="absolute inset-0 bg-emerald-950/90 rounded-xl flex flex-col items-center justify-center text-emerald-400 text-xs font-bold gap-2">
                        <CheckCircle2 className="w-8 h-8" />
                        <span>授权成功！正在提取 Token...</span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs text-slate-300 font-medium">请打开 闲鱼 App 扫一扫 授权登录</p>
                    <p className="text-[11px] text-slate-500">
                      系统将自动截获 Session Token 与 WebSocket 私信密钥
                    </p>
                  </div>

                  <button
                    onClick={handleSimulateQrScan}
                    disabled={qrStep !== 'ready'}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold rounded-lg text-xs transition-colors"
                  >
                    {qrStep === 'ready' ? '模拟手机扫码确认' : '正在建立长连接...'}
                  </button>
                </div>
              ) : (
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-300 mb-1 font-medium">
                      闲鱼 Cookie 字符串 (必填)
                    </label>
                    <textarea
                      rows={4}
                      value={cookieInput}
                      onChange={(e) => setCookieInput(e.target.value)}
                      placeholder="_m_h5_tk=...; _m_h5_tk_enc=...; unb=...; cookie2=...; sgcookie=..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 font-mono text-[11px] text-slate-200 focus:outline-hidden focus:border-amber-500"
                    />
                    {parseError && <div className="text-rose-400 text-[11px] mt-1">{parseError}</div>}
                    <div className="text-slate-500 text-[11px] mt-1">
                      可从浏览器开发者工具 (F12) 或 XianYuApis 抓包工具中复制全量 Cookie
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-300 mb-1">店铺显示别名 (可选)</label>
                      <input
                        type="text"
                        value={nicknameInput}
                        onChange={(e) => setNicknameInput(e.target.value)}
                        placeholder="例如: 潮品二店"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-hidden focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 mb-1">独立代理 IP (可选防封)</label>
                      <input
                        type="text"
                        value={proxyInput}
                        onChange={(e) => setProxyInput(e.target.value)}
                        placeholder="例如: 112.98.21.10:8080"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-hidden focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 mb-1">备注说明</label>
                    <input
                      type="text"
                      value={notesInput}
                      onChange={(e) => setNotesInput(e.target.value)}
                      placeholder="例如: 专营Switch卡密充值"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-hidden focus:border-amber-500"
                    />
                  </div>

                  <button
                    onClick={handleImportCookie}
                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-colors mt-2"
                  >
                    解析并导入账号
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
