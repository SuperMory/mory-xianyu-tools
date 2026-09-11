import React, { useState } from 'react';
import {
  MessageSquareReply,
  Plus,
  Search,
  Filter,
  Image as ImageIcon,
  Sparkles,
  Tag,
  Clock,
  Zap,
  Sliders,
  Play,
  Trash2,
  Edit,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Shield,
  Layers,
} from 'lucide-react';
import { AutoReplyRule, MatchType, XianYuAccount } from '../types';

interface Props {
  rules: AutoReplyRule[];
  accounts: XianYuAccount[];
  onAddRule: (rule: AutoReplyRule) => void;
  onUpdateRule: (rule: AutoReplyRule) => void;
  onDeleteRule: (id: string) => void;
}

export const AutoReplyEngine: React.FC<Props> = ({
  rules,
  accounts,
  onAddRule,
  onUpdateRule,
  onDeleteRule,
}) => {
  const [filterType, setFilterType] = useState<'all' | MatchType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingRule, setEditingRule] = useState<AutoReplyRule | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  // Keyword tag input temporary state
  const [keywordInput, setKeywordInput] = useState('');

  // Sandbox Tester State
  const [sandboxAccount, setSandboxAccount] = useState(accounts[0]?.id || 'all');
  const [sandboxItem, setSandboxItem] = useState('item_switch_vip');
  const [sandboxMessage, setSandboxMessage] = useState('老板在吗，现在拍能发货吗？');
  const [sandboxHasImage, setSandboxHasImage] = useState(false);
  const [sandboxImageLabel, setSandboxImageLabel] = useState('付款截图');
  const [sandboxResult, setSandboxResult] = useState<{
    matchedRule: AutoReplyRule | null;
    processedReply: string;
    delay: number;
    log: string[];
  } | null>(null);

  // Filtered Rules
  const filteredRules = rules.filter((r) => {
    if (filterType !== 'all' && r.matchType !== filterType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        r.name.toLowerCase().includes(q) ||
        r.replyContent.toLowerCase().includes(q) ||
        r.keywords.some((k) => k.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Open editor for new rule
  const handleCreateNew = () => {
    setEditingRule({
      id: `rule_${Date.now()}`,
      name: '',
      accountId: 'all',
      matchType: 'contains',
      keywords: [],
      imageKeywords: [],
      targetItemId: '',
      targetItemTitle: '',
      replyContent: '',
      randomDelayMin: 2,
      randomDelayMax: 4,
      cooldownSeconds: 120,
      enabled: true,
      priority: 50,
      hitCount: 0,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
    });
    setKeywordInput('');
    setShowEditor(true);
  };

  // Add keyword tag
  const handleAddKeyword = () => {
    if (!keywordInput.trim() || !editingRule) return;
    if (!editingRule.keywords.includes(keywordInput.trim())) {
      setEditingRule({
        ...editingRule,
        keywords: [...editingRule.keywords, keywordInput.trim()],
      });
    }
    setKeywordInput('');
  };

  const handleRemoveKeyword = (kw: string) => {
    if (!editingRule) return;
    setEditingRule({
      ...editingRule,
      keywords: editingRule.keywords.filter((k) => k !== kw),
    });
  };

  // Insert variable into reply
  const handleInsertVariable = (v: string) => {
    if (!editingRule) return;
    setEditingRule({
      ...editingRule,
      replyContent: editingRule.replyContent + v,
    });
  };

  // Save rule
  const handleSaveRule = () => {
    if (!editingRule || !editingRule.name.trim() || !editingRule.replyContent.trim()) {
      alert('请填写完整的规则名称和回复话术！');
      return;
    }

    const existingIndex = rules.findIndex((r) => r.id === editingRule.id);
    if (existingIndex >= 0) {
      onUpdateRule(editingRule);
    } else {
      onAddRule(editingRule);
    }
    setShowEditor(false);
    setEditingRule(null);
  };

  // Execute Sandbox Test Pipeline
  const runSandboxTest = () => {
    const logs: string[] = [];
    logs.push(`[1/4] 开始对买家消息进行决策分析: "${sandboxMessage}"`);
    if (sandboxHasImage) {
      logs.push(`[提示] 买家伴随附带图片附件 (OCR识别标签: ${sandboxImageLabel})`);
    }

    // Sort rules by priority descending
    const sorted = [...rules].sort((a, b) => b.priority - a.priority);

    let matched: AutoReplyRule | null = null;

    for (const rule of sorted) {
      if (!rule.enabled) continue;
      if (rule.accountId !== 'all' && rule.accountId !== sandboxAccount) continue;

      // 1. Item specific
      if (rule.matchType === 'item_specific') {
        if (rule.targetItemId && rule.targetItemId === sandboxItem) {
          const hit = rule.keywords.some((k) => sandboxMessage.includes(k));
          if (hit) {
            logs.push(`[命中] 优先命中商品专属规则:【${rule.name}】(绑定商品: ${rule.targetItemTitle || rule.targetItemId})`);
            matched = rule;
            break;
          }
        }
      }

      // 2. Exact match
      if (rule.matchType === 'exact') {
        if (rule.keywords.some((k) => k.trim() === sandboxMessage.trim())) {
          logs.push(`[命中] 命中精确匹配规则:【${rule.name}】`);
          matched = rule;
          break;
        }
      }

      // 3. Contains match
      if (rule.matchType === 'contains') {
        const hit = rule.keywords.some((k) => sandboxMessage.includes(k));
        if (hit) {
          logs.push(`[命中] 命中包含关键词规则:【${rule.name}】`);
          matched = rule;
          break;
        }
      }

      // 4. Regex match
      if (rule.matchType === 'regex') {
        const hit = rule.keywords.some((pat) => {
          try {
            const cleanPat = pat.replace(/^\(\?[imsux]+\)/, '');
            return new RegExp(cleanPat, 'i').test(sandboxMessage);
          } catch {
            return false;
          }
        });
        if (hit) {
          logs.push(`[命中] 正则匹配命中风控或高优先级规则:【${rule.name}】`);
          matched = rule;
          break;
        }
      }

      // 5. Image keywords
      if (rule.matchType === 'image' && sandboxHasImage) {
        const hit = (rule.imageKeywords || []).some((ik) => sandboxImageLabel.includes(ik));
        if (hit) {
          logs.push(`[命中] 图像特征识别命中:【${rule.name}】(匹配标签: ${sandboxImageLabel})`);
          matched = rule;
          break;
        }
      }
    }

    // Fallback default rule
    if (!matched) {
      const defaultRule = sorted.find((r) => r.matchType === 'default' && r.enabled);
      if (defaultRule) {
        logs.push(`[兜底] 未命中具体关键词，落入默认兜底回复规则:【${defaultRule.name}】`);
        matched = defaultRule;
      } else {
        logs.push(`[结束] 未命中任何规则且无开启的默认回复，系统将转交人工。`);
      }
    }

    if (matched) {
      const delay = +(
        Math.random() * (matched.randomDelayMax - matched.randomDelayMin) +
        matched.randomDelayMin
      ).toFixed(1);

      // Variable substitutions
      let text = matched.replyContent
        .replace(/{buyer_name}/g, '测试买家_小明')
        .replace(/{item_title}/g, '【任天堂Switch 12个月会员兑换码】')
        .replace(/{order_id}/g, 'TB' + Date.now())
        .replace(/{time}/g, new Date().toLocaleTimeString());

      logs.push(`[延迟] 拟人打字随机延迟: ${delay} 秒 (已启动买家冷却 CD: ${matched.cooldownSeconds}秒)`);

      setSandboxResult({
        matchedRule: matched,
        processedReply: text,
        delay,
        log: logs,
      });
    } else {
      setSandboxResult({
        matchedRule: null,
        processedReply: '（无匹配规则触发，将静默等待人工客服接入）',
        delay: 0,
        log: logs,
      });
    }
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full text-slate-100">
      {/* Top action row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <MessageSquareReply className="w-5 h-5 text-emerald-400" />
            自动回复规则引擎
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            支持文本关键词、图片凭据识别、商品专属绑定与默认兜底，内置防风控打字延迟机制
          </p>
        </div>

        <button
          onClick={handleCreateNew}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs shadow-md shadow-emerald-500/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>新建回复规则</span>
        </button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
        {/* Match Type Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs p-1">
          {[
            { id: 'all', label: '全部规则' },
            { id: 'contains', label: '包含/模糊词' },
            { id: 'exact', label: '精确匹配' },
            { id: 'item_specific', label: '商品专属' },
            { id: 'image', label: '图片识别' },
            { id: 'regex', label: '正则/防风控' },
            { id: 'default', label: '默认兜底' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id as any)}
              className={`h-8 px-3 rounded-lg font-medium transition-all whitespace-nowrap text-xs shrink-0 flex items-center justify-center ${
                filterType === tab.id
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search box */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索规则名/关键词/回复..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Rules Table / Cards */}
      <div className="space-y-3">
        {filteredRules.map((rule) => (
          <div
            key={rule.id}
            className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-4 transition-all"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2.5">
                <input
                  type="checkbox"
                  checked={rule.enabled}
                  onChange={(e) => onUpdateRule({ ...rule, enabled: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-0 cursor-pointer"
                  title="启用/禁用规则"
                />
                <span className="font-bold text-white text-sm">{rule.name}</span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                    rule.matchType === 'item_specific'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : rule.matchType === 'image'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      : rule.matchType === 'regex'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : rule.matchType === 'default'
                      ? 'bg-slate-700 text-slate-300'
                      : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                  }`}
                >
                  {rule.matchType === 'item_specific'
                    ? '商品专属'
                    : rule.matchType === 'image'
                    ? '图片触发'
                    : rule.matchType === 'regex'
                    ? '正则表达式'
                    : rule.matchType === 'default'
                    ? '默认兜底'
                    : rule.matchType === 'exact'
                    ? '精确匹配'
                    : '包含匹配'}
                </span>

                <span className="text-[11px] text-slate-400">
                  优先级: <strong className="text-slate-200">{rule.priority}</strong>
                </span>

                <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                  已命中 {rule.hitCount} 次
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
                <button
                  onClick={() => {
                    setEditingRule({ ...rule });
                    setShowEditor(true);
                  }}
                  className="h-7 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition-all shadow-2xs whitespace-nowrap"
                >
                  <Edit className="w-3 h-3 text-slate-400" />
                  <span>编辑</span>
                </button>
                <button
                  onClick={() => {
                    if (confirm(`确定要删除规则【${rule.name}】吗？`)) {
                      onDeleteRule(rule.id);
                    }
                  }}
                  className="h-7 w-7 rounded-lg bg-slate-800 hover:bg-rose-500/15 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/30 text-xs flex items-center justify-center transition-all shrink-0"
                  title="删除规则"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Keyword tags */}
            {rule.keywords.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                <span className="text-[11px] text-slate-400 flex items-center gap-1 mr-1">
                  <Tag className="w-3 h-3 text-slate-500" />
                  触发词:
                </span>
                {rule.keywords.map((kw, idx) => (
                  <span
                    key={idx}
                    className="text-[11px] bg-slate-950 border border-slate-800 px-2 py-0.5 rounded text-amber-300 font-mono"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            )}

            {/* If Item Specific */}
            {rule.matchType === 'item_specific' && rule.targetItemTitle && (
              <div className="text-[11px] text-amber-400/90 mb-2 flex items-center gap-1 bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/20">
                <span>绑定闲鱼商品:</span>
                <span className="font-semibold text-white">{rule.targetItemTitle}</span>
                <span className="text-slate-400">({rule.targetItemId})</span>
              </div>
            )}

            {/* Reply Content Box */}
            <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800/80 text-xs text-slate-300 leading-relaxed font-sans">
              <span className="text-slate-500 text-[11px] block mb-1">自动应答话术:</span>
              {rule.replyContent}
            </div>

            {/* Footer meta */}
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 pt-1">
              <div className="flex items-center gap-3">
                <span>
                  拟人延迟: {rule.randomDelayMin}s ~ {rule.randomDelayMax}s
                </span>
                <span>•</span>
                <span>买家CD冷却: {rule.cooldownSeconds}秒</span>
              </div>
              <div className="font-mono text-[10px]">创建于 {rule.createdAt}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Sandbox Test Simulator Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Play className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">规则决策测试沙盒 (Sandbox Simulator)</h3>
              <p className="text-[11px] text-slate-400">
                模拟买家发送咨询或图片，毫秒级可视化走查规则管道命中情况与回复生成
              </p>
            </div>
          </div>

          <button
            onClick={runSandboxTest}
            className="h-8 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-2 shadow-md shadow-emerald-500/20 transition-all shrink-0 whitespace-nowrap active:scale-95"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>执行规则匹配测试</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block text-slate-300 mb-1">测试闲鱼账号</label>
            <select
              value={sandboxAccount}
              onChange={(e) => setSandboxAccount(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-hidden"
            >
              <option value="all">全部账号 (公共策略)</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nickname}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-slate-300 mb-1">买家浏览商品</label>
            <select
              value={sandboxItem}
              onChange={(e) => setSandboxItem(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-hidden"
            >
              <option value="item_switch_vip">任天堂Switch 12个月会员兑换码 (item_switch_vip)</option>
              <option value="item_ui_assets">2026最新UI设计与平面素材大合集 (item_ui_assets)</option>
              <option value="item_music_vip">音乐流媒体黑胶年卡 (item_music_vip)</option>
              <option value="other">普通无绑定商品</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-300 mb-1">附加图片特征 (模拟买家传图)</label>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={sandboxHasImage}
                  onChange={(e) => setSandboxHasImage(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-0"
                />
                <span>携带截图</span>
              </label>
              {sandboxHasImage && (
                <select
                  value={sandboxImageLabel}
                  onChange={(e) => setSandboxImageLabel(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-slate-200 focus:outline-hidden"
                >
                  <option value="付款截图">付款截图 / 支付成功凭据</option>
                  <option value="好评截图">好评晒单截图</option>
                  <option value="商品故障截图">故障报错截图</option>
                </select>
              )}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-slate-300 text-xs mb-1">买家发送的咨询内容</label>
          <input
            type="text"
            value={sandboxMessage}
            onChange={(e) => setSandboxMessage(e.target.value)}
            placeholder="输入买家发送的问题，例如：老板在吗、微信能加一下吗、付款了发货吧..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-hidden focus:border-emerald-500"
          />
        </div>

        {/* Sandbox Output Result */}
        {sandboxResult && (
          <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                沙盒判定输出结果:
              </span>
              {sandboxResult.matchedRule ? (
                <span className="text-emerald-400 font-medium">
                  命中规则:【{sandboxResult.matchedRule.name}】
                </span>
              ) : (
                <span className="text-rose-400 font-medium">未命中回复规则</span>
              )}
            </div>

            {/* Generated Message Bubble Preview */}
            <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-xs">
              <div className="text-[11px] text-slate-400 mb-1 flex items-center justify-between">
                <span>客服自动机应答预览 (延迟 {sandboxResult.delay} 秒发出):</span>
                <span className="text-amber-400">已自动完成变量插槽替换</span>
              </div>
              <p className="text-slate-100 leading-relaxed font-sans">{sandboxResult.processedReply}</p>
            </div>

            {/* Decision Trail logs */}
            <div className="text-[11px] font-mono text-slate-400 space-y-1 bg-slate-950 p-2 rounded border border-slate-900">
              {sandboxResult.log.map((l, i) => (
                <div key={i}>{l}</div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Rule Creator / Editor Drawer */}
      {showEditor && editingRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4 text-xs text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">
                {rules.some((r) => r.id === editingRule.id) ? '编辑自动回复规则' : '新建自动回复规则'}
              </h3>
              <button
                onClick={() => setShowEditor(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 mb-1">规则名称 (必填)</label>
                <input
                  type="text"
                  value={editingRule.name}
                  onChange={(e) => setEditingRule({ ...editingRule, name: e.target.value })}
                  placeholder="例如: 虚拟商品自动发货引导"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">生效账号范围</label>
                <select
                  value={editingRule.accountId}
                  onChange={(e) => setEditingRule({ ...editingRule, accountId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-hidden"
                >
                  <option value="all">全部闲鱼店铺账号 (全局生效)</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nickname} (仅此店)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 mb-1">匹配类型模式</label>
                <select
                  value={editingRule.matchType}
                  onChange={(e) =>
                    setEditingRule({ ...editingRule, matchType: e.target.value as MatchType })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-hidden"
                >
                  <option value="contains">包含关键词 (模糊匹配)</option>
                  <option value="exact">完全匹配 (一字不差)</option>
                  <option value="item_specific">商品专属回复 (绑定商品ID)</option>
                  <option value="image">图片关键词 (买家上传截图识别)</option>
                  <option value="regex">正则表达式 (复杂词汇/防风控拦截)</option>
                  <option value="default">默认回复 (未命中时兜底)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">匹配优先级 (1-100，数值越大越先匹配)</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={editingRule.priority}
                  onChange={(e) =>
                    setEditingRule({ ...editingRule, priority: Number(e.target.value) || 50 })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-hidden"
                />
              </div>
            </div>

            {/* If Item-specific */}
            {editingRule.matchType === 'item_specific' && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg space-y-2">
                <div className="font-semibold text-amber-300 text-xs">商品绑定配置:</div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={editingRule.targetItemId || ''}
                    onChange={(e) =>
                      setEditingRule({ ...editingRule, targetItemId: e.target.value })
                    }
                    placeholder="商品 Item ID (例如: item_switch_vip)"
                    className="bg-slate-950 border border-slate-800 rounded p-2 text-slate-200"
                  />
                  <input
                    type="text"
                    value={editingRule.targetItemTitle || ''}
                    onChange={(e) =>
                      setEditingRule({ ...editingRule, targetItemTitle: e.target.value })
                    }
                    placeholder="商品标题/别名"
                    className="bg-slate-950 border border-slate-800 rounded p-2 text-slate-200"
                  />
                </div>
              </div>
            )}

            {/* Keyword tags inputs */}
            {editingRule.matchType !== 'default' && (
              <div>
                <label className="block text-slate-300 mb-1">
                  关键词列表 ({editingRule.matchType === 'regex' ? '正则表达式 pattern' : '触发词'})
                </label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddKeyword();
                      }
                    }}
                    placeholder="输入触发词后按回车添加..."
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-hidden focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddKeyword}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg"
                  >
                    添加词
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-slate-950/60 rounded border border-slate-800">
                  {editingRule.keywords.map((kw, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 bg-slate-900 border border-slate-800 text-amber-300 px-2 py-0.5 rounded text-[11px]"
                    >
                      {kw}
                      <button
                        type="button"
                        onClick={() => handleRemoveKeyword(kw)}
                        className="text-slate-400 hover:text-white"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Reply Content */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-300">自动回复模板内容 (必填)</label>
                <div className="flex items-center gap-1 text-[11px]">
                  <span className="text-slate-500">插入动态变量:</span>
                  <button
                    type="button"
                    onClick={() => handleInsertVariable('{buyer_name}')}
                    className="text-emerald-400 hover:underline"
                  >
                    买家昵称
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => handleInsertVariable('{item_title}')}
                    className="text-emerald-400 hover:underline"
                  >
                    商品名
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => handleInsertVariable('{time}')}
                    className="text-emerald-400 hover:underline"
                  >
                    时间
                  </button>
                </div>
              </div>
              <textarea
                rows={4}
                value={editingRule.replyContent}
                onChange={(e) => setEditingRule({ ...editingRule, replyContent: e.target.value })}
                placeholder="输入准备回复给买家的文字或指引..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-hidden focus:border-emerald-500 font-sans leading-relaxed"
              />
            </div>

            {/* Anti-risk delays */}
            <div className="grid grid-cols-3 gap-3 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
              <div>
                <label className="block text-slate-400 text-[11px] mb-1">拟人延迟最小值 (秒)</label>
                <input
                  type="number"
                  min={0}
                  max={30}
                  value={editingRule.randomDelayMin}
                  onChange={(e) =>
                    setEditingRule({ ...editingRule, randomDelayMin: Number(e.target.value) || 1 })
                  }
                  className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-slate-200"
                />
              </div>
              <div>
                <label className="block text-slate-400 text-[11px] mb-1">拟人延迟最大值 (秒)</label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={editingRule.randomDelayMax}
                  onChange={(e) =>
                    setEditingRule({ ...editingRule, randomDelayMax: Number(e.target.value) || 3 })
                  }
                  className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-slate-200"
                />
              </div>
              <div>
                <label className="block text-slate-400 text-[11px] mb-1">买家冷却CD周期 (秒)</label>
                <input
                  type="number"
                  min={0}
                  max={3600}
                  value={editingRule.cooldownSeconds}
                  onChange={(e) =>
                    setEditingRule({ ...editingRule, cooldownSeconds: Number(e.target.value) || 60 })
                  }
                  className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-slate-200"
                />
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowEditor(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium"
              >
                取消
              </button>
              <button
                onClick={handleSaveRule}
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg shadow-md shadow-emerald-500/20"
              >
                保存规则
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
