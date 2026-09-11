import React, { useState } from 'react';
import { X, BookOpen, Code2, ShieldAlert, Cpu, Layers, Copy, Check, Terminal, ExternalLink } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const TechnicalSpecsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'mtop' | 'websocket' | 'keyword_engine' | 'delivery' | 'code_sample'>('overview');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const MTOP_SIGN_CODE = `// 闲鱼 Mtop H5 核心签名算法 (cv-cat/XianYuApis 参考实现)
import crypto from 'crypto';

export function generateMtopSign(token: string, t: number, appKey: string, data: object): string {
  // 1. 从 Cookie 中的 _m_h5_tk 获取 token 前缀 (例如: '728bf9a1c804f9e12891d09230fa982a')
  const cleanToken = token.split('_')[0];
  const dataStr = JSON.stringify(data);
  
  // 2. 拼接待签名原文: token + "&" + timestamp + "&" + appKey + "&" + data
  const rawString = \`\${cleanToken}&\${t}&\${appKey}&\${dataStr}\`;
  
  // 3. 计算 MD5 散列摘要
  const sign = crypto.createHash('md5').update(rawString).digest('hex');
  return sign;
}

// 示例调用:
// appKey: "12574478" (闲鱼无线 H5 通用 key)
// t: 1726058921000
// data: {"itemId": "item_switch_vip", "text": "亲在的，拍下自动发货"}`;

  const KEYWORD_PIPELINE_CODE = `# 关键词过滤与优先判定流水线 (zhinianboke/xianyu-auto-reply 核心逻辑)
import re
import time
from typing import Optional, Dict

class KeywordReplyEngine:
    def __init__(self, rules: list, buyer_cooldown_map: dict):
        self.rules = rules # 已按 priority 降序排列
        self.cooldown_map = buyer_cooldown_map

    def evaluate(self, msg: str, buyer_uid: str, item_id: Optional[str] = None, img_labels: list = []) -> Optional[Dict]:
        now = time.time()
        
        # 1. 检查买家冷却 CD (防高频轰炸/风控触发)
        if buyer_uid in self.cooldown_map and now < self.cooldown_map[buyer_uid]:
            return None # 处于冷却期，跳过自动响应

        # 2. 遍历匹配规则 (高优先级优先匹配)
        for rule in self.rules:
            if not rule.get('enabled', True):
                continue
            
            match_type = rule['match_type']
            
            # (A) 商品专属绑定匹配 (Item-Specific)
            if match_type == 'item_specific':
                if item_id and item_id == rule.get('target_item_id'):
                    if any(kw in msg for kw in rule['keywords']):
                        return self._build_reply(rule, buyer_uid)

            # (B) 精确匹配 (Exact Match)
            elif match_type == 'exact':
                if msg.strip() in rule['keywords']:
                    return self._build_reply(rule, buyer_uid)

            # (C) 包含匹配 / 模糊词 (Contains)
            elif match_type == 'contains':
                if any(kw in msg for kw in rule['keywords']):
                    return self._build_reply(rule, buyer_uid)

            # (D) 正则表达式 (Regex) - 适用于屏蔽微信号/联系方式等
            elif match_type == 'regex':
                for pattern in rule['keywords']:
                    if re.search(pattern, msg, re.IGNORECASE):
                        return self._build_reply(rule, buyer_uid)

            # (E) 图片关键词标签 (Image OCR / Multimodal)
            elif match_type == 'image':
                if img_labels and any(kw in label for kw in rule.get('image_keywords', []) for label in img_labels):
                    return self._build_reply(rule, buyer_uid)

            # (F) 默认回复 (Default Fallback)
            elif match_type == 'default':
                return self._build_reply(rule, buyer_uid)

        return None

    def _build_reply(self, rule: dict, buyer_uid: str) -> dict:
        # 更新该买家冷却周期
        self.cooldown_map[buyer_uid] = time.time() + rule.get('cooldown_seconds', 60)
        return {
            'rule_name': rule['name'],
            'reply_content': rule['reply_content'],
            'delay_min': rule.get('random_delay_min', 2),
            'delay_max': rule.get('random_delay_max', 4)
        }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                技术参考与架构梳理
                <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-normal">
                  XianYuApis & xianyu-auto-reply
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                深入解析闲鱼协议逆向、Mtop签名、WebSocket Protobuf通讯与关键词规则引擎
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

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-900/90 px-6 gap-2 text-sm overflow-x-auto">
          {[
            { key: 'overview', label: '两项目对比与技术栈', icon: Layers },
            { key: 'mtop', label: 'Mtop 接口与 Sign 签名', icon: Code2 },
            { key: 'websocket', label: 'WebSocket 实时通讯', icon: Cpu },
            { key: 'keyword_engine', label: '关键词过滤与防风控', icon: ShieldAlert },
            { key: 'delivery', label: '自动发货流转闭环', icon: Terminal },
            { key: 'code_sample', label: '核心代码实现参考', icon: Code2 },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-2 px-3 py-2.5 font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'border-amber-400 text-amber-400 bg-amber-500/5'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-sm">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-800/60 rounded-lg border border-slate-700/80">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-white flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                      cv-cat / XianYuApis
                    </h3>
                    <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded">
                      底层协议逆向库
                    </span>
                  </div>
                  <p className="text-slate-300 text-xs leading-relaxed mb-3">
                    专注于闲鱼算法逆向、Mtop API 解密、WebSocket 私聊长连接协议解析与 Protobuf 解包，为上层应用提供稳定的通信基座。
                  </p>
                  <ul className="text-xs text-slate-400 space-y-1.5 list-disc pl-4">
                    <li><strong className="text-slate-200">技术栈:</strong> Node.js, TypeScript, Protobuf, Crypto</li>
                    <li><strong className="text-slate-200">核心能力:</strong> 破解 Mtop H5 Token 签名、WebSocket 私信发送与事件监听</li>
                    <li><strong className="text-slate-200">关键输出:</strong> Session Cookie 维护，二进制长连接心跳维持与消息解包</li>
                  </ul>
                </div>

                <div className="p-4 bg-slate-800/60 rounded-lg border border-slate-700/80">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-white flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span>
                      zhinianboke / xianyu-auto-reply
                    </h3>
                    <span className="text-xs bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded">
                      业务自动化系统
                    </span>
                  </div>
                  <p className="text-slate-300 text-xs leading-relaxed mb-3">
                    基于上述协议构建的闲鱼全自动化卖家管理系统，集成多账号管理、智能自动回复、虚拟卡密自动发货、Playwright 自动化保活。
                  </p>
                  <ul className="text-xs text-slate-400 space-y-1.5 list-disc pl-4">
                    <li><strong className="text-slate-200">技术栈:</strong> Python (FastAPI), React / Vue, Playwright, MySQL/Redis</li>
                    <li><strong className="text-slate-200">核心能力:</strong> 规则引擎、延时防风控打字模拟、卡密库存去重出库、订单状态流转</li>
                    <li><strong className="text-slate-200">关键输出:</strong> Web UI 管理面板与桌面端运行形态，自动化订单与发货日志</li>
                  </ul>
                </div>
              </div>

              <div className="bg-slate-800/40 p-4 rounded-lg border border-slate-700/60">
                <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-amber-400" />
                  魔力咸鱼助手的融合落地设计
                </h4>
                <p className="text-slate-300 text-xs leading-relaxed">
                  本系统吸收了两者精髓：不仅拥有 <strong>XianYuApis</strong> 的底层协议逆向结构与 <strong>xianyu-auto-reply</strong> 的高可靠关键词匹配策略，更通过本地化桌面架构将两者封装为开箱即用的交互工作台，配备卡券仓库、IM聊天联动、独立代理与风控防护网，并支持一键打包为桌面 EXE。
                </p>
              </div>
            </div>
          )}

          {activeTab === 'mtop' && (
            <div className="space-y-4">
              <div className="bg-slate-800/60 p-4 rounded-lg border border-slate-700">
                <h3 className="font-semibold text-white mb-2">1. 闲鱼 Mtop 网关调用规范</h3>
                <p className="text-xs text-slate-300 mb-3">
                  闲鱼大部分后台与客户端接口均基于阿里统一移动开放平台 (Mtop) 协议。所有 HTTP 请求均通过 POST 发送至统一网关：
                  <code className="text-amber-300 bg-slate-900 px-2 py-0.5 rounded mx-1">
                    https://acs.m.taobao.com/gw/[api_name]/[api_version]/
                  </code>
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-900/80 rounded border border-slate-700/50">
                    <span className="text-amber-400 font-semibold block mb-1">关键 HTTP Headers:</span>
                    <ul className="space-y-1 text-slate-400 font-mono">
                      <li>User-Agent: Mozilla/5.0 ... XianYu/7.x</li>
                      <li>Content-Type: application/x-www-form-urlencoded</li>
                      <li>Cookie: _m_h5_tk=...; unb=...; cookie2=...</li>
                    </ul>
                  </div>
                  <div className="p-3 bg-slate-900/80 rounded border border-slate-700/50">
                    <span className="text-amber-400 font-semibold block mb-1">关键 Query 参数:</span>
                    <ul className="space-y-1 text-slate-400 font-mono">
                      <li>appKey: 12574478 (闲鱼无线H5通用)</li>
                      <li>t: 当前时间戳 (毫秒)</li>
                      <li>sign: MD5(token &amp; t &amp; appKey &amp; data)</li>
                      <li>data: JSON 序列化业务入参</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/60 p-4 rounded-lg border border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-white">2. Token 刷新与签名计算算法</h3>
                  <button
                    onClick={() => handleCopy('mtop_sign', MTOP_SIGN_CODE)}
                    className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 bg-amber-500/10 px-2 py-1 rounded"
                  >
                    {copiedKey === 'mtop_sign' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    复制代码
                  </button>
                </div>
                <pre className="bg-slate-950 p-3 rounded font-mono text-xs text-slate-300 overflow-x-auto">
                  {MTOP_SIGN_CODE}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'websocket' && (
            <div className="space-y-4">
              <div className="bg-slate-800/60 p-4 rounded-lg border border-slate-700">
                <h3 className="font-semibold text-white mb-2">闲鱼 WebSocket 长连接逆向架构</h3>
                <p className="text-xs text-slate-300 mb-3">
                  在 cv-cat/XianYuApis 中，实时消息收发不采用轮询，而是建立 WebSocket 长连接通道。这样可以在买家发送消息的 100ms 内捕获消息并触发自动回复。
                </p>
                <div className="space-y-2 text-xs text-slate-300">
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-amber-400 font-bold shrink-0">1</span>
                    <div>
                      <strong className="text-white">握手与鉴权:</strong> 建立连接至 <code className="text-amber-300 font-mono">wss://acs.m.taobao.com/accs/</code>，携带从当前有效 Cookie 计算出的 WebSocket 专有 Token 和签名。
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-amber-400 font-bold shrink-0">2</span>
                    <div>
                      <strong className="text-white">Protobuf 二进制包编码:</strong> 闲鱼聊天消息内容使用 Google Protocol Buffers 格式打包，包含发送者 UID、会话 ID、消息类型（文本/卡券/图片）、时间戳与客户端序列号。
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-amber-400 font-bold shrink-0">3</span>
                    <div>
                      <strong className="text-white">心跳保活机制:</strong> 客户端每隔 25~30 秒发送特定 Ping 帧，若 3 次未收到 Pong 响应则触发自动断线重连与 Cookie 状态有效性自检。
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'keyword_engine' && (
            <div className="space-y-4">
              <div className="bg-slate-800/60 p-4 rounded-lg border border-slate-700">
                <h3 className="font-semibold text-white mb-2">关键词过滤与规则引擎分级策略</h3>
                <p className="text-xs text-slate-300 mb-3">
                  在 zhinianboke/xianyu-auto-reply 中，关键词匹配并非单层 if-else，而是采用分级过滤管道，避免回复混淆或命中误答：
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs mb-4">
                  <div className="p-3 bg-slate-900/90 rounded border-l-4 border-amber-500">
                    <h5 className="font-bold text-amber-300 mb-1">第一优先级：商品专属绑定</h5>
                    <p className="text-slate-400">优先匹配买家正在浏览或发起咨询的 Item ID。针对不同商品提供定制化规格/兑换码使用说明。</p>
                  </div>
                  <div className="p-3 bg-slate-900/90 rounded border-l-4 border-rose-500">
                    <h5 className="font-bold text-rose-300 mb-1">第二优先级：风控与联系方式拦截</h5>
                    <p className="text-slate-400">正则过滤微信号、手机号、外部链接、违禁导流词，触发安全免死话术，避免店铺封禁。</p>
                  </div>
                  <div className="p-3 bg-slate-900/90 rounded border-l-4 border-sky-500">
                    <h5 className="font-bold text-sky-300 mb-1">第三优先级：通用词 &amp; 兜底</h5>
                    <p className="text-slate-400">精确词 &gt; 模糊包含词 &gt; 图片识别关键词 &gt; 默认兜底回复，层次分明保证问答准确率。</p>
                  </div>
                </div>

                <div className="p-3 bg-slate-900 rounded border border-slate-800">
                  <h4 className="font-semibold text-amber-400 text-xs mb-2">防风控与拟人化机制 (Anti-Risk Control):</h4>
                  <ul className="text-xs text-slate-300 space-y-1 list-disc pl-4">
                    <li><strong>随机延时 (Random Typing Delay):</strong> 收到买家消息后不立刻秒回，而是配置 1.5 ~ 4.5 秒随机延时，模拟真人输入习惯，避免被风控反爬判定为机器人。</li>
                    <li><strong>同买家冷却 CD:</strong> 同一买家在指定秒数内连续发问，系统不重复发送相同话术，防止刷屏封号。</li>
                    <li><strong>变量动态插槽:</strong> 支持在回复模板中注入 <code className="text-amber-300">&#123;buyer_name&#125;</code>, <code className="text-amber-300">&#123;item_title&#125;</code>, <code className="text-amber-300">&#123;time&#125;</code> 提高互动真实度。</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'delivery' && (
            <div className="space-y-4">
              <div className="bg-slate-800/60 p-4 rounded-lg border border-slate-700">
                <h3 className="font-semibold text-white mb-2">虚拟商品自动发货全链路</h3>
                <p className="text-xs text-slate-300 mb-3">
                  自动发货是闲鱼卖家被动收益的核心。魔力咸鱼助手借鉴了 xianyu-auto-reply 的库存原子出库与防重发设计：
                </p>
                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-slate-900/70 rounded border border-slate-700/60">
                    <div className="text-amber-400 font-bold mb-1">Step 1: 订单轮询与实时监听</div>
                    <div className="text-slate-300">通过 Mtop 接口 <code className="text-slate-200">mtop.taobao.idle.order.list</code> 监听状态变更为 <span className="text-emerald-400 font-semibold">PAID (买家已付款)</span> 的新订单。</div>
                  </div>
                  <div className="p-3 bg-slate-900/70 rounded border border-slate-700/60">
                    <div className="text-amber-400 font-bold mb-1">Step 2: 卡券仓库原子出库 (防超卖/防并发重发)</div>
                    <div className="text-slate-300">根据订单中的商品 ID 锁定关联卡密库，从库存中提取一条标记为 <code>available</code> 的卡密，将其状态更新为 <code>dispatched</code> 并绑定当前 OrderID。</div>
                  </div>
                  <div className="p-3 bg-slate-900/70 rounded border border-slate-700/60">
                    <div className="text-amber-400 font-bold mb-1">Step 3: 聊天窗私信下发 &amp; 闲鱼订单标记已发货</div>
                    <div className="text-slate-300">调用消息发送接口将格式化卡券信息推送到买家聊天窗口，随后调用无需物流发货接口，使订单状态同步为已发货。</div>
                  </div>
                  <div className="p-3 bg-slate-900/70 rounded border border-slate-700/60">
                    <div className="text-amber-400 font-bold mb-1">Step 4: 自动补发与售后回执</div>
                    <div className="text-slate-300">若买家反馈卡密异常或复制不全，客服人员可在发货记录中一键执行“自动补发”，系统将重新从备用库分配新卡密并归档补发记录。</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'code_sample' && (
            <div className="space-y-4">
              <div className="bg-slate-800/60 p-4 rounded-lg border border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-white">Python 关键词决策与买家冷却引擎核心实现</h3>
                  <button
                    onClick={() => handleCopy('pipeline_code', KEYWORD_PIPELINE_CODE)}
                    className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 bg-amber-500/10 px-2 py-1 rounded"
                  >
                    {copiedKey === 'pipeline_code' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    复制代码
                  </button>
                </div>
                <pre className="bg-slate-950 p-3 rounded font-mono text-xs text-slate-300 overflow-x-auto max-h-96">
                  {KEYWORD_PIPELINE_CODE}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>参考源:</span>
            <a
              href="https://github.com/cv-cat/XianYuApis"
              target="_blank"
              rel="noreferrer"
              className="text-amber-400 hover:underline flex items-center gap-0.5"
            >
              cv-cat/XianYuApis <ExternalLink className="w-3 h-3" />
            </a>
            <span>•</span>
            <a
              href="https://github.com/zhinianboke/xianyu-auto-reply"
              target="_blank"
              rel="noreferrer"
              className="text-amber-400 hover:underline flex items-center gap-0.5"
            >
              zhinianboke/xianyu-auto-reply <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold rounded-lg transition-colors"
          >
            完成学习并返回
          </button>
        </div>
      </div>
    </div>
  );
};
