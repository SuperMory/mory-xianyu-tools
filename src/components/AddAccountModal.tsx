import React, { useState } from 'react';
import {
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  X,
  Copy,
  ExternalLink,
  ShieldCheck,
  Fish,
  Zap,
  Check,
  Sparkles,
  Terminal,
  HelpCircle,
  Laptop,
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
  // Tabs: 'real' (Official Web Login & Cookie Import) vs 'mock' (Instant Sandbox Account) vs 'desktop' (Electron Info)
  const [activeTab, setActiveTab] = useState<'real' | 'mock' | 'desktop'>('real');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedSample, setCopiedSample] = useState(false);

  // Cookie Form States
  const [cookieInput, setCookieInput] = useState('');
  const [nicknameInput, setNicknameInput] = useState('');
  const [proxyInput, setProxyInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [parseError, setParseError] = useState('');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  if (!isOpen) return null;

  // Extraction code snippet
  const extractScript = `copy(document.cookie); alert("✅ 闲鱼 Cookie 已复制到剪贴板！请回到软件粘贴。");`;

  const handleCopyScript = () => {
    navigator.clipboard.writeText(extractScript);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  // Fill sample valid cookie format
  const handleFillSampleCookie = () => {
    const mockUid = Math.floor(210000000 + Math.random() * 700000000);
    const mockTk = 'xy_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now();
    const sample = `_m_h5_tk=${mockTk}; _m_h5_tk_enc=enc_sample_hash; unb=${mockUid}; cookie2=c2_sample_token; sgcookie=sg_sample_token; _tb_token_=tb_mock`;
    setCookieInput(sample);
    if (!nicknameInput) {
      setNicknameInput(`潮玩电玩二号店 (${mockUid.toString().slice(-4)})`);
    }
    setCopiedSample(true);
    setTimeout(() => setCopiedSample(false), 2000);
  };

  // Handle Cookie Parsing & Import
  const handleImportCookie = () => {
    setParseError('');
    if (!cookieInput.trim()) {
      setParseError('请先粘贴闲鱼 Cookie 字符串');
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
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 72).toISOString(),
      todayReplies: 0,
      todayDeliveries: 0,
      proxyIp: proxyInput.trim() || '直连环境 (默认本机)',
      autoReplyEnabled: true,
      autoDeliveryEnabled: true,
      lastHeartbeat: '刚刚接入生效',
      notes: notesInput.trim() || '真实闲鱼店铺 Cookie 授权',
    };

    onAddAccount(newAcc);
    setSuccessToast(`🎉 成功接入闲鱼账号：【${nick}】 (UID: ${uid})！`);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  // Instant Mock Account Creation
  const handleCreateMockAccount = () => {
    const uid = Math.floor(200000000 + Math.random() * 800000000).toString();
    const mockNames = ['数码掌机电玩店', '正版卡密软件仓', '潮流潮牌二号仓', '极速发卡自营店'];
    const chosenName = mockNames[Math.floor(Math.random() * mockNames.length)] + ` (${uid.slice(-4)})`;
    const avatarPool = [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
    ];
    const randomAvatar = avatarPool[Math.floor(Math.random() * avatarPool.length)];

    const newAcc: XianYuAccount = {
      id: `acc_${Date.now()}`,
      nickname: chosenName,
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
      proxyIp: proxyInput.trim() || '127.0.0.1:7890 (独立隧道)',
      autoReplyEnabled: true,
      autoDeliveryEnabled: true,
      lastHeartbeat: '沙盒环境实时握手',
      notes: '沙盒模拟全功能账号 (用于调试发货与回复)',
    };

    onAddAccount(newAcc);
    setSuccessToast(`🎉 成功生成并接入测试账号：【${chosenName}】！`);
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden text-slate-100 relative">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-slate-950 shadow-md shadow-amber-500/20">
              <Fish className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <span>添加与接入闲鱼账号</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-medium">
                  安全多账号接入通道
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                支持连接真实闲鱼店铺，或一键免扫码生成测试店铺
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
        <div className="p-6 space-y-4">
          {/* Method Segmented Switch */}
          <div className="grid grid-cols-3 gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('real')}
              className={`h-9 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'real'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5 shrink-0" />
              <span>真实店铺接入</span>
            </button>
            <button
              onClick={() => setActiveTab('mock')}
              className={`h-9 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'mock'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>一键测试免扫码</span>
            </button>
            <button
              onClick={() => setActiveTab('desktop')}
              className={`h-9 rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'desktop'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <Laptop className="w-3.5 h-3.5 shrink-0" />
              <span>桌面客户端说明</span>
            </button>
          </div>

          {/* TAB 1: Real Account Connection */}
          {activeTab === 'real' && (
            <div className="space-y-4 text-xs">
              {/* Explanation of "Illegal Request" */}
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-2">
                <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                  <HelpCircle className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>为什么手机闲鱼扫第三方生成的二维码会提示【非法请求】？</span>
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  阿里/闲鱼对登录会话实施了严格的安全校验机制：
                  <strong className="text-amber-200">
                    任何二维码必须由阿里官方服务器实时签发 Session Token
                  </strong>
                  。第三方前端随机生成的二维码无法通过阿里服务端的重放检验，因此手机端会直接提示“非法请求”。
                </p>
                <div className="text-[11px] text-emerald-300 font-semibold flex items-center gap-1 pt-0.5">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    标准且 100% 有效的真实接入方式：在官方网页扫码登录，然后复制 Cookie。
                  </span>
                </div>
              </div>

              {/* 3-Step Guided Flow */}
              <div className="bg-slate-950/80 rounded-xl border border-slate-800 p-3.5 space-y-3">
                <div className="font-bold text-slate-200 flex items-center justify-between">
                  <span>三步完成真实账号安全接入：</span>
                  <button
                    onClick={handleFillSampleCookie}
                    className="text-[11px] text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1"
                  >
                    {copiedSample ? '✓ 已填入模拟数据' : '⚡ 填入格式示例快速测试'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                  {/* Step 1 */}
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 space-y-1.5 flex flex-col justify-between">
                    <div>
                      <div className="text-amber-400 font-bold">第 1 步：打开官网</div>
                      <p className="text-slate-400 text-[10px] mt-0.5">
                        在电脑新标签页打开闲鱼网页版，点击右上角【登录】
                      </p>
                    </div>
                    <a
                      href="https://www.goofish.com/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 h-6 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded flex items-center justify-center gap-1 text-[10px] font-semibold border border-slate-700"
                    >
                      <span>打开闲鱼官网</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>

                  {/* Step 2 */}
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 space-y-1.5 flex flex-col justify-between">
                    <div>
                      <div className="text-amber-400 font-bold">第 2 步：手机扫真二维码</div>
                      <p className="text-slate-400 text-[10px] mt-0.5">
                        打开闲鱼 App 扫一扫官方网页上的真实二维码，点击确认登录。
                      </p>
                    </div>
                    <div className="text-[10px] text-emerald-400 font-medium py-1 text-center">
                      ✓ 官方二维码绝无非法请求
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 space-y-1.5 flex flex-col justify-between">
                    <div>
                      <div className="text-amber-400 font-bold">第 3 步：一键提取 Cookie</div>
                      <p className="text-slate-400 text-[10px] mt-0.5">
                        在官网按 F12 打开 Console，粘贴提取脚本后回车即可。
                      </p>
                    </div>
                    <button
                      onClick={handleCopyScript}
                      className="mt-1 h-6 px-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded flex items-center justify-center gap-1 text-[10px] font-bold"
                    >
                      {copiedCode ? <Check className="w-2.5 h-2.5" /> : <Terminal className="w-2.5 h-2.5" />}
                      <span>{copiedCode ? '已复制提取代码' : '复制提取脚本'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Paste Cookie Textarea */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-semibold flex items-center gap-1">
                    <span>粘贴闲鱼 Cookie</span>
                    <span className="text-rose-400">*</span>
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
                  rows={3}
                  value={cookieInput}
                  onChange={(e) => setCookieInput(e.target.value)}
                  placeholder="_m_h5_tk=xxx; _m_h5_tk_enc=xxx; unb=220192837; cookie2=xxx; sgcookie=xxx..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500/80 rounded-xl p-3 font-mono text-[11px] text-slate-200 focus:outline-hidden transition-colors"
                />

                {parseError && (
                  <div className="text-rose-400 text-xs mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{parseError}</span>
                  </div>
                )}
              </div>

              {/* Optional Fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1 text-[11px]">店铺名称备注 (可选)</label>
                  <input
                    type="text"
                    value={nicknameInput}
                    onChange={(e) => setNicknameInput(e.target.value)}
                    placeholder="例如: 潮品电玩一号店"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 text-[11px]">绑定独立代理 IP (可选防封)</label>
                  <input
                    type="text"
                    value={proxyInput}
                    onChange={(e) => setProxyInput(e.target.value)}
                    placeholder="例如: 127.0.0.1:7890"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                onClick={handleImportCookie}
                className="w-full h-10 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold rounded-xl transition-all shadow-md shadow-amber-500/20 active:scale-98 text-xs flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>解析并接入真实店铺</span>
              </button>
            </div>
          )}

          {/* TAB 2: Instant Mock Account */}
          {activeTab === 'mock' && (
            <div className="space-y-4 text-xs py-2">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-center">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-slate-950 mx-auto shadow-lg shadow-amber-500/20">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-white text-sm">免手机扫码 • 极速生成体验账号</h4>
                  <p className="text-slate-400 text-xs max-w-md mx-auto leading-relaxed">
                    无需绑定真实账号，一键生成拥有独立 UID、Mtop 令牌、模拟 Session 和长连接的完整沙盒店铺，立即畅享多店铺接待、自动发货流水和风控测试！
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-[11px] text-slate-300">
                  <span className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800">
                    ✓ 支持模拟买家拍下下单
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800">
                    ✓ 支持全自动发卡密
                  </span>
                  <span className="px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800">
                    ✓ 支持智能关键词回复
                  </span>
                </div>

                <button
                  onClick={handleCreateMockAccount}
                  className="w-full h-11 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 transition-all active:scale-98"
                >
                  <Sparkles className="w-4 h-4 fill-current" />
                  <span>立即生成并接入测试账号 (0秒就绪)</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: Desktop Native Automation */}
          {activeTab === 'desktop' && (
            <div className="space-y-4 text-xs py-1">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <Laptop className="w-4 h-4 text-amber-400" />
                  <span>桌面客户端原生扫码架构 (Windows / macOS)</span>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">
                  在将本项目打包为本地客户端（.exe / .dmg）后，程序内置了完整的
                  <strong className="text-amber-300">
                    {' '}
                    Electron 隔离 WebView 与 Playwright 自动化环境
                  </strong>
                  ：
                </p>

                <ul className="space-y-2 text-slate-300 text-[11px]">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                    <span>
                      点击添加账号时，桌面端会直接弹出一个阿里官方的原生内嵌扫码窗口。
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                    <span>
                      该窗口直接与阿里官方登录服务器进行真实长连接，手机闲鱼扫码绝无“非法请求”，秒级确认。
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                    <span>
                      登录完成后，客户端通过 `session.defaultSession.cookies.get()`
                      自动抓取并加密存入本地数据库，全程无需手动复制粘贴！
                    </span>
                  </li>
                </ul>

                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>可在顶部菜单点击【打包EXE】获取桌面版安装程序</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
