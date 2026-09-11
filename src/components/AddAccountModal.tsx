import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  QrCode,
  KeyRound,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  X,
  Copy,
  ExternalLink,
  ShieldCheck,
  Fish,
  Zap,
  Check,
  Clock,
  Sparkles,
} from 'lucide-react';
import { XianYuAccount } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onAddAccount: (account: XianYuAccount) => void;
}

export const AddAccountModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onAddAccount,
}) => {
  const [loginMethod, setLoginMethod] = useState<'qrcode' | 'cookie'>('qrcode');
  const [qrStep, setQrStep] = useState<'ready' | 'scanned' | 'confirmed' | 'expired'>('ready');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [qrSessionToken, setQrSessionToken] = useState<string>('');
  const [countdown, setCountdown] = useState<number>(180);
  const [copiedLink, setCopiedLink] = useState(false);

  // Cookie Form States
  const [cookieInput, setCookieInput] = useState('');
  const [nicknameInput, setNicknameInput] = useState('');
  const [proxyInput, setProxyInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [parseError, setParseError] = useState('');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Generate QR code data URL
  const generateQrCode = async () => {
    const token = 'xy_sess_' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
    setQrSessionToken(token);
    setQrStep('ready');
    setCountdown(180);

    const loginUrl = `https://login.m.taobao.com/qrcodeLogin.htm?appKey=21407387&from=xianyu_desktop&lgToken=${token}`;

    try {
      const url = await QRCode.toDataURL(loginUrl, {
        width: 240,
        margin: 1.5,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'H',
      });
      setQrCodeDataUrl(url);
    } catch (err) {
      console.error('Failed to generate QR code', err);
    }
  };

  // Generate when modal opens
  useEffect(() => {
    if (isOpen) {
      generateQrCode();
      setParseError('');
      setSuccessToast(null);
    }
  }, [isOpen]);

  // Countdown timer for QR code validity
  useEffect(() => {
    if (!isOpen || qrStep !== 'ready') return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setQrStep('expired');
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, qrStep]);

  if (!isOpen) return null;

  // Handle simulated scan & confirm
  const handleSimulateScan = () => {
    if (qrStep !== 'ready') return;
    setQrStep('scanned');

    setTimeout(() => {
      setQrStep('confirmed');

      setTimeout(() => {
        const uid = Math.floor(200000000 + Math.random() * 800000000).toString();
        const nickname = nicknameInput.trim() || `闲鱼店铺_${uid.slice(-4)}`;
        const avatarPool = [
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
          'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
        ];
        const randomAvatar = avatarPool[Math.floor(Math.random() * avatarPool.length)];

        const newAcc: XianYuAccount = {
          id: `acc_${Date.now()}`,
          nickname,
          avatar: randomAvatar,
          uid,
          status: 'online',
          cookies: `_m_h5_tk=xy_${Date.now()}_tk; unb=${uid}; cookie2=c2_${Date.now()}; sgcookie=sg_${Date.now()}`,
          mH5Tk: `xy_${Date.now()}_tk`,
          mH5TkEnc: 'enc_' + Math.random().toString(36).substring(2, 10),
          cookie2: 'c2_' + Math.random().toString(36).substring(2, 10),
          unb: uid,
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 72).toISOString(),
          todayReplies: 0,
          todayDeliveries: 0,
          proxyIp: proxyInput.trim() || '直连环境 (系统默认)',
          autoReplyEnabled: true,
          autoDeliveryEnabled: true,
          lastHeartbeat: '刚刚扫码接入',
          notes: notesInput.trim() || '闲鱼App客户端扫码授权',
        };

        onAddAccount(newAcc);
        setSuccessToast(`🎉 成功接入闲鱼账号：${nickname}！`);
        setTimeout(() => {
          onClose();
        }, 1200);
      }, 1000);
    }, 1400);
  };

  // Copy QR Link
  const handleCopyLink = () => {
    const loginUrl = `https://login.m.taobao.com/qrcodeLogin.htm?appKey=21407387&from=xianyu_desktop&lgToken=${qrSessionToken}`;
    navigator.clipboard.writeText(loginUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Handle Cookie Parsing & Import
  const handleImportCookie = () => {
    setParseError('');
    if (!cookieInput.trim()) {
      setParseError('请先粘贴完整的闲鱼 Cookie 字符串');
      return;
    }

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
      mH5TkEnc: encMatch ? encMatch[1] : 'enc_' + Math.random().toString(36).substring(2, 8),
      cookie2: cookie2Match ? cookie2Match[1] : 'c2_' + Math.random().toString(36).substring(2, 8),
      unb: uid,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(),
      todayReplies: 0,
      todayDeliveries: 0,
      proxyIp: proxyInput.trim() || '直连环境 (默认本机)',
      autoReplyEnabled: true,
      autoDeliveryEnabled: true,
      lastHeartbeat: '刚刚手动导入',
      notes: notesInput.trim() || '手动 Cookie 导入账号',
    };

    onAddAccount(newAcc);
    setSuccessToast(`🎉 成功导入闲鱼账号：${nick}！`);
    setTimeout(() => {
      onClose();
    }, 1000);
  };

  // Check detected cookies
  const hasTk = cookieInput.includes('_m_h5_tk=');
  const hasUnb = cookieInput.includes('unb=');
  const hasCookie2 = cookieInput.includes('cookie2=');

  return (
    <div
      id="add-account-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden text-slate-100 relative">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-slate-950 shadow-md shadow-amber-500/20">
              <Fish className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <span>添加与接入闲鱼账号</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-medium">
                  支持多账号矩阵
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                支持闲鱼 App 扫码免密授权登录，或一键导入全量 Cookie
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Success Toast */}
        {successToast && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in zoom-in-95">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successToast}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Method Segmented Switch */}
          <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setLoginMethod('qrcode')}
              className={`h-9 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
                loginMethod === 'qrcode'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <QrCode className="w-4 h-4 shrink-0" />
              <span>闲鱼 App 扫码登录 (推荐)</span>
            </button>
            <button
              onClick={() => setLoginMethod('cookie')}
              className={`h-9 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
                loginMethod === 'cookie'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <KeyRound className="w-4 h-4 shrink-0" />
              <span>手动导入 Cookie / Token</span>
            </button>
          </div>

          {/* TAB 1: QR Code Login */}
          {loginMethod === 'qrcode' && (
            <div className="flex flex-col items-center justify-center p-6 bg-slate-950/70 rounded-2xl border border-slate-800 text-center space-y-4">
              {/* QR Code Container */}
              <div className="relative group">
                <div className="p-3 bg-white rounded-2xl shadow-xl relative inline-block border-2 border-slate-800/80">
                  {qrCodeDataUrl ? (
                    <div className="relative w-[210px] h-[210px] flex items-center justify-center">
                      <img
                        src={qrCodeDataUrl}
                        alt="闲鱼扫码登录二维码"
                        className="w-full h-full rounded-lg object-contain"
                      />
                      {/* Xianyu Fish Center Logo */}
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 border-2 border-white shadow-md flex items-center justify-center text-slate-950">
                          <Fish className="w-5 h-5 fill-current" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-[210px] h-[210px] flex flex-col items-center justify-center gap-2 text-slate-400">
                      <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
                      <span className="text-xs">正在生成专属二维码...</span>
                    </div>
                  )}

                  {/* Scanned Mask */}
                  {qrStep === 'scanned' && (
                    <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs rounded-2xl flex flex-col items-center justify-center text-amber-300 text-xs font-bold gap-2 p-4 animate-in fade-in">
                      <RefreshCw className="w-8 h-8 animate-spin text-amber-400" />
                      <span>手机已扫描二维码</span>
                      <span className="text-[11px] text-slate-400 font-normal">
                        请在闲鱼客户端点击【确认登录】
                      </span>
                    </div>
                  )}

                  {/* Confirmed Mask */}
                  {qrStep === 'confirmed' && (
                    <div className="absolute inset-0 bg-emerald-950/95 backdrop-blur-xs rounded-2xl flex flex-col items-center justify-center text-emerald-300 text-xs font-bold gap-2.5 p-4 animate-in zoom-in-95">
                      <CheckCircle2 className="w-10 h-10 text-emerald-400 animate-bounce" />
                      <span className="text-sm">授权握手成功！</span>
                      <span className="text-[11px] text-emerald-200/80 font-normal">
                        正在同步 Session 与私信通道...
                      </span>
                    </div>
                  )}

                  {/* Expired Mask */}
                  {qrStep === 'expired' && (
                    <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xs rounded-2xl flex flex-col items-center justify-center text-slate-300 text-xs font-bold gap-2 p-4">
                      <AlertTriangle className="w-8 h-8 text-amber-400" />
                      <span>二维码已失效</span>
                      <button
                        onClick={generateQrCode}
                        className="mt-1 h-8 px-4 bg-amber-500 text-slate-950 rounded-lg text-xs font-bold hover:bg-amber-400 transition-colors shadow-md"
                      >
                        点击重新生成
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Status & Instructions */}
              <div className="space-y-1.5 max-w-sm">
                <p className="text-xs text-slate-200 font-semibold flex items-center justify-center gap-1.5">
                  <span>打开</span>
                  <span className="text-amber-400 font-bold">闲鱼 App</span>
                  <span>或</span>
                  <span className="text-amber-400 font-bold">手机淘宝</span>
                  <span>扫一扫授权登录</span>
                </p>
                <div className="flex items-center justify-center gap-3 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>
                      有效时间: {Math.floor(countdown / 60)}分{countdown % 60}秒
                    </span>
                  </span>
                  <span>•</span>
                  <button
                    onClick={generateQrCode}
                    className="text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>刷新二维码</span>
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="w-full space-y-2 pt-1">
                <button
                  onClick={handleSimulateScan}
                  disabled={qrStep !== 'ready'}
                  className="w-full h-10 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 transition-all active:scale-98"
                >
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span>
                    {qrStep === 'ready'
                      ? '⚡ 一键模拟手机扫码并授权 (开发/测试免扫)'
                      : qrStep === 'scanned'
                      ? '已扫码，等待手机确认...'
                      : '正在提取 Session Token...'}
                  </span>
                </button>

                <div className="flex items-center gap-2 text-xs">
                  <button
                    onClick={handleCopyLink}
                    className="flex-1 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 flex items-center justify-center gap-1.5 transition-colors text-[11px]"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-semibold">已复制登录网址</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                        <span>复制授权链接到手机</span>
                      </>
                    )}
                  </button>

                  <div className="text-[11px] text-slate-500 px-2 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>官方OAuth协议</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Manual Cookie / Token Import */}
          {loginMethod === 'cookie' && (
            <div className="space-y-4 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-slate-300 font-medium">
                    闲鱼 Cookie 完整字符串 <span className="text-rose-400">*</span>
                  </label>
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className={hasTk ? 'text-emerald-400 font-semibold' : 'text-slate-600'}>
                      {hasTk ? '✓' : '○'} _m_h5_tk
                    </span>
                    <span className={hasUnb ? 'text-emerald-400 font-semibold' : 'text-slate-600'}>
                      {hasUnb ? '✓' : '○'} unb (UID)
                    </span>
                    <span className={hasCookie2 ? 'text-emerald-400 font-semibold' : 'text-slate-600'}>
                      {hasCookie2 ? '✓' : '○'} cookie2
                    </span>
                  </div>
                </div>

                <textarea
                  rows={4}
                  value={cookieInput}
                  onChange={(e) => setCookieInput(e.target.value)}
                  placeholder="_m_h5_tk=xxx; _m_h5_tk_enc=xxx; unb=220192837; cookie2=xxx; sgcookie=xxx..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/80 rounded-xl p-3 font-mono text-[11px] text-slate-200 focus:outline-hidden transition-colors"
                />

                {parseError && (
                  <div className="text-rose-400 text-xs mt-1.5 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{parseError}</span>
                  </div>
                )}

                <p className="text-slate-500 text-[11px] mt-1">
                  可直接从 Chrome / Edge 开发者工具 (F12) 的 Network 请求头中复制，或从抓包软件粘贴。
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">店铺显示别名 (可选)</label>
                  <input
                    type="text"
                    value={nicknameInput}
                    onChange={(e) => setNicknameInput(e.target.value)}
                    placeholder="例如: 潮玩数码二店"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-hidden focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">独立代理 IP (可选防封)</label>
                  <input
                    type="text"
                    value={proxyInput}
                    onChange={(e) => setProxyInput(e.target.value)}
                    placeholder="例如: 127.0.0.1:7890"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-hidden focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">备注说明</label>
                <input
                  type="text"
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  placeholder="例如: 专营Switch点卡与游戏充值业务"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <button
                onClick={handleImportCookie}
                className="w-full h-10 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold rounded-xl transition-all shadow-md shadow-amber-500/20 active:scale-98 text-xs flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>解析并接入账号</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
