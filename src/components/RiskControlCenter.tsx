import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Bell,
  FileText,
  MessageSquare,
  Plus,
  Trash2,
  CheckCircle2,
  Search,
  ExternalLink,
  Download,
  Send,
  Sparkles,
} from 'lucide-react';
import { RiskLog, SystemAnnouncement, XianYuAccount } from '../types';

interface Props {
  riskLogs: RiskLog[];
  announcements: SystemAnnouncement[];
  accounts: XianYuAccount[];
  onResolveLog: (id: string) => void;
  onAddAnnouncement: (announcement: SystemAnnouncement) => void;
}

export const RiskControlCenter: React.FC<Props> = ({
  riskLogs,
  announcements,
  accounts,
  onResolveLog,
  onAddAnnouncement,
}) => {
  const [activeTab, setActiveTab] = useState<'logs' | 'blacklist' | 'announcements' | 'feedback'>('logs');
  const [logFilter, setLogFilter] = useState<'all' | 'unresolved'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Sensitive keywords list state
  const [sensitiveWords, setSensitiveWords] = useState<string[]>([
    '加微信',
    '加微',
    '微信号',
    'vx',
    'wx',
    '私聊电话',
    '私下走款',
    '脱离闲鱼',
    '淘宝代刷',
    '返现免单',
    '刷好评',
  ]);
  const [newWordInput, setNewWordInput] = useState('');

  // Feedback input
  const [feedbackCategory, setFeedbackCategory] = useState('风控规则建议');
  const [feedbackContent, setFeedbackContent] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  // Add sensitive word
  const handleAddWord = () => {
    if (!newWordInput.trim()) return;
    if (!sensitiveWords.includes(newWordInput.trim())) {
      setSensitiveWords([...sensitiveWords, newWordInput.trim()]);
    }
    setNewWordInput('');
  };

  const handleRemoveWord = (word: string) => {
    setSensitiveWords(sensitiveWords.filter((w) => w !== word));
  };

  // Filter logs
  const filteredLogs = riskLogs.filter((log) => {
    if (logFilter === 'unresolved' && log.resolved) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        log.title.toLowerCase().includes(q) ||
        log.detail.toLowerCase().includes(q) ||
        log.accountNickname.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Handle Feedback Submit
  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackContent.trim()) return;
    setFeedbackSubmitted(true);
    setTimeout(() => {
      setFeedbackContent('');
      setFeedbackSubmitted(false);
      alert('系统反馈已记录并同步至魔力开发团队！');
    }, 1000);
  };

  // Export Diagnostic Log
  const handleExportDiag = () => {
    const diagData = {
      appName: '魔力咸鱼助手',
      version: 'v3.2 Pro',
      timestamp: new Date().toISOString(),
      activeAccountsCount: accounts.length,
      unresolvedRiskCount: riskLogs.filter((r) => !r.resolved).length,
      sensitiveWordsCount: sensitiveWords.length,
      recentLogs: riskLogs,
    };

    const blob = new Blob([JSON.stringify(diagData, null, 2)], {
      type: 'application/json;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `魔力咸鱼助手_风控与运行诊断_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full text-slate-100">
      {/* Top action row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            通知与风控中枢
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            闲鱼合规审查拦截、Cookie 失效预警、违禁词词库、官方规则动态与系统反馈闭环
          </p>
        </div>

        <button
          onClick={handleExportDiag}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium rounded-lg text-xs transition-colors self-start sm:self-auto"
        >
          <Download className="w-4 h-4" />
          <span>导出风控诊断日志</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 text-xs overflow-x-auto whitespace-nowrap p-1">
        {[
          { key: 'logs', label: `风控预警与拦截日志 (${riskLogs.length})` },
          { key: 'blacklist', label: `违规导流词库 (${sensitiveWords.length})` },
          { key: 'announcements', label: `平台公告与规范 (${announcements.length})` },
          { key: 'feedback', label: '系统反馈与工单' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`h-9 px-4 rounded-lg font-semibold transition-all whitespace-nowrap shrink-0 flex items-center justify-center ${
              activeTab === tab.key
                ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30 shadow-2xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border border-transparent'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 1. Risk Logs Tab */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800 text-xs">
            <div className="flex items-center gap-2 p-0.5 bg-slate-950 rounded-lg border border-slate-800 shrink-0">
              <button
                onClick={() => setLogFilter('all')}
                className={`h-7 px-3 rounded-md font-medium transition-colors ${
                  logFilter === 'all'
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                全部日志 ({riskLogs.length})
              </button>
              <button
                onClick={() => setLogFilter('unresolved')}
                className={`h-7 px-3 rounded-md font-medium transition-colors ${
                  logFilter === 'unresolved'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                待处理告警 ({riskLogs.filter((r) => !r.resolved).length})
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索日志详情或店铺..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:border-rose-500"
              />
            </div>
          </div>

          <div className="space-y-3">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className={`p-4 rounded-xl border transition-all ${
                  log.resolved
                    ? 'bg-slate-900/60 border-slate-800 text-slate-400'
                    : log.level === 'high'
                    ? 'bg-rose-950/20 border-rose-500/40 text-slate-200 shadow-sm'
                    : 'bg-amber-950/20 border-amber-500/40 text-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                        log.level === 'high'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : log.level === 'medium'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {log.level === 'high' ? '高危拦截' : log.level === 'medium' ? '中度预警' : '常规提示'}
                    </span>
                    <h3 className="font-bold text-white text-sm">{log.title}</h3>
                    <span className="text-slate-400 text-xs font-medium">[{log.accountNickname}]</span>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <span className="font-mono text-slate-500 text-[11px]">{log.timestamp}</span>
                    {!log.resolved ? (
                      <button
                        onClick={() => onResolveLog(log.id)}
                        className="h-7 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all shrink-0 whitespace-nowrap shadow-2xs"
                      >
                        标记已处理
                      </button>
                    ) : (
                      <span className="text-emerald-400 text-[11px] flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> 已消除风险
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed mb-2.5 font-sans">{log.detail}</p>

                <div className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800/80 text-[11px] text-amber-400/90 font-mono">
                  防风控执行动作: {log.actionTaken}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Blacklist Words Tab */}
      {activeTab === 'blacklist' && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
            <h3 className="font-bold text-white text-sm">违规导流与高危敏感词库管理</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              当买家在咨询中发送包含以下词汇的内容时，系统规则引擎将自动阻断常规回复，转入合规免死话术或要求在闲鱼站内完成交易，彻底避免因“引导线下交易”被闲鱼官方禁言或扣除店铺信誉分。
            </p>

            <div className="flex gap-2 text-xs pt-1">
              <input
                type="text"
                value={newWordInput}
                onChange={(e) => setNewWordInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddWord();
                  }
                }}
                placeholder="输入要拦截的敏感词或缩写，例如：加V、企鹅号、走线下..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-hidden focus:border-rose-500"
              />
              <button
                onClick={handleAddWord}
                className="h-9 px-4 bg-rose-500 hover:bg-rose-400 text-white font-bold rounded-lg text-xs transition-all shrink-0 whitespace-nowrap shadow-md shadow-rose-500/20 active:scale-95"
              >
                添加拦截词
              </button>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="text-xs text-slate-400 mb-3 font-medium">当前已生效的拦截词汇 ({sensitiveWords.length}个):</div>
            <div className="flex flex-wrap gap-2">
              {sensitiveWords.map((word, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 bg-slate-950 border border-slate-800 text-rose-300 px-3 py-1.5 rounded-lg text-xs font-mono"
                >
                  <span>{word}</span>
                  <button
                    onClick={() => handleRemoveWord(word)}
                    className="text-slate-500 hover:text-white p-0.5 rounded transition-colors"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. Announcements Tab */}
      {activeTab === 'announcements' && (
        <div className="space-y-4">
          {announcements.map((ann) => (
            <div key={ann.id} className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                      ann.tag === '风控预警'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : ann.tag === '版本更新'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                    }`}
                  >
                    {ann.tag}
                  </span>
                  <h3 className="font-bold text-white text-sm">{ann.title}</h3>
                </div>
                <span className="text-slate-500 text-xs font-mono">{ann.date}</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">{ann.content}</p>
            </div>
          ))}
        </div>
      )}

      {/* 4. Feedback Tab */}
      {activeTab === 'feedback' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 max-w-2xl text-xs space-y-4">
          <div>
            <h3 className="font-bold text-white text-sm mb-1">系统工单与建议反馈</h3>
            <p className="text-slate-400">
              在使用魔力咸鱼助手时遇到协议报错、反爬滑块拦截或有新功能诉求，请随时在此提交。
            </p>
          </div>

          <form onSubmit={handleFeedbackSubmit} className="space-y-3">
            <div>
              <label className="block text-slate-300 mb-1">反馈类型</label>
              <select
                value={feedbackCategory}
                onChange={(e) => setFeedbackCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-hidden"
              >
                <option value="风控规则建议">风控规则建议 / 新敏感词补充</option>
                <option value="接口协议异常">Mtop / WebSocket 接口协议异常</option>
                <option value="发货功能诉求">自动发货与卡券出库功能建议</option>
                <option value="其它">其它问题咨询</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 mb-1">详细描述 (问题复现步骤或建议)</label>
              <textarea
                rows={5}
                value={feedbackContent}
                onChange={(e) => setFeedbackContent(e.target.value)}
                placeholder="请详细描述您遇到的问题现象，可包含相关接口响应或买家会话特征..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-hidden focus:border-rose-500 font-sans"
              />
            </div>

            <button
              type="submit"
              disabled={feedbackSubmitted}
              className="h-10 px-5 bg-rose-500 hover:bg-rose-400 disabled:opacity-50 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-rose-500/20 active:scale-95 shrink-0 whitespace-nowrap"
            >
              <Send className="w-4 h-4" />
              <span>{feedbackSubmitted ? '正在提交反馈...' : '提交工单'}</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
