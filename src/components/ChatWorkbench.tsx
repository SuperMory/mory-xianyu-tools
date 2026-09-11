import React, { useState, useRef, useEffect } from 'react';
import {
  MessageCircle,
  Search,
  Send,
  Image as ImageIcon,
  Key,
  ShoppingBag,
  Clock,
  CheckCheck,
  Bot,
  User,
  Shield,
  Zap,
  MoreVertical,
  ExternalLink,
  ChevronRight,
  Sparkles,
  X,
  Play,
  Plus,
} from 'lucide-react';
import {
  Conversation,
  ChatMessage,
  XianYuAccount,
  CardSecretItem,
  AutoDeliveryApiConfig,
} from '../types';

interface Props {
  conversations: Conversation[];
  messages: Record<string, ChatMessage[]>;
  accounts: XianYuAccount[];
  cardVault: CardSecretItem[];
  apiConfigs?: AutoDeliveryApiConfig[];
  activeAccountId: string;
  onSendMessage: (conversationId: string, text: string, type?: 'text' | 'card') => void;
  onToggleConversationAutoReply: (conversationId: string, active: boolean) => void;
  onSimulateBuyerMessage: (conversationId: string, text: string) => void;
  onCreateInboundConversation?: (
    accountId: string,
    buyerNickname: string,
    text: string,
    itemInfo?: { itemId?: string; itemTitle?: string; itemPrice?: number; itemCover?: string }
  ) => string;
}

export const ChatWorkbench: React.FC<Props> = ({
  conversations,
  messages,
  accounts,
  cardVault,
  apiConfigs = [],
  activeAccountId,
  onSendMessage,
  onToggleConversationAutoReply,
  onSimulateBuyerMessage,
  onCreateInboundConversation,
}) => {
  const [selectedConvId, setSelectedConvId] = useState<string>(conversations[0]?.id || '');
  const [inputText, setInputText] = useState('');
  const [searchBuyer, setSearchBuyer] = useState('');
  const [filterAccount, setFilterAccount] = useState<string>('all');
  const [showSimulateModal, setShowSimulateModal] = useState(false);
  const [simulateInput, setSimulateInput] = useState('在吗？请问兑换码怎么发货？');

  // Modal for new buyer B inbound consultation
  const [showNewInboundModal, setShowNewInboundModal] = useState(false);
  const [inboundAccountId, setInboundAccountId] = useState<string>(accounts[0]?.id || '');
  const [inboundBuyerName, setInboundBuyerName] = useState('闲鱼买家B (在线咨询)');
  const [inboundItemTitle, setInboundItemTitle] = useState('【任天堂Switch 12个月会员兑换码】拍下自动发货');
  const [inboundMessage, setInboundMessage] = useState('在吗？请问兑换码怎么发货？');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Quick reply shortcuts
  const QUICK_REPLIES = [
    '亲在的呢，拍下系统立刻自动发货，请放心购买~ ✨',
    '兑换码使用教程已推送给您，进入eshop输入序列号即可生效！',
    '已核查您的订单，已为您执行极速补发出库，请查收！',
    '所有咨询与发货均在闲鱼平台内进行，不支持添加站外联系方式哦~ 🛡️',
  ];

  const activeConv = conversations.find((c) => c.id === selectedConvId) || conversations[0];
  const activeAccount = accounts.find((a) => a.id === activeConv?.accountId) || accounts[0];
  const activeMessages = selectedConvId ? messages[selectedConvId] || [] : [];

  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    if (filterAccount !== 'all' && c.accountId !== filterAccount) return false;
    if (searchBuyer.trim()) {
      return (
        c.buyerNickname.toLowerCase().includes(searchBuyer.toLowerCase()) ||
        c.lastMessage.toLowerCase().includes(searchBuyer.toLowerCase())
      );
    }
    return true;
  });

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages.length, selectedConvId]);

  const handleSend = () => {
    if (!inputText.trim() || !selectedConvId) return;
    onSendMessage(selectedConvId, inputText.trim(), 'text');
    setInputText('');
  };

  const handleSendQuickPhrase = (text: string) => {
    if (!selectedConvId) return;
    onSendMessage(selectedConvId, text, 'text');
  };

  // One click dispatch available card (supports external API or local vault)
  const handleDispatchCardDirectly = () => {
    if (!selectedConvId) return;

    // Check if an external API is configured for this item or globally
    const matchedApi = apiConfigs.find(
      (a) => a.enabled && (a.targetItemId === 'all' || a.targetItemId === activeConv?.currentTrade?.itemId)
    );

    if (matchedApi) {
      const simulatedGeneratedCard =
        matchedApi.responseSecretPath.includes('link') || matchedApi.url.includes('link')
          ? `https://pan.baidu.com/s/1xy9_${Date.now().toString().slice(-5)} 提取码: auto2026`
          : `API-TOKEN-${Date.now().toString().slice(-4)}-${Math.random().toString(36).substring(2, 6).toUpperCase()} 密码: 8891`;

      const cardMsg = matchedApi.customMessageTemplate
        .replace(/{secret}/g, simulatedGeneratedCard)
        .replace(/{order_id}/g, activeConv?.currentTrade?.orderId || 'TB' + Date.now())
        .replace(/{buyer_name}/g, activeConv?.buyerNickname || '客户');

      onSendMessage(selectedConvId, cardMsg, 'card');
      return;
    }

    const available = cardVault.find((c) => c.status === 'available');
    if (available) {
      const cardMsg = `【魔力自动出库】卡券内容如下：\n${available.secretContent}\n请在5分钟内核销使用，如有疑问请留言！`;
      onSendMessage(selectedConvId, cardMsg, 'card');
    } else {
      alert('卡券仓库暂无未售库存，且未配置第三方发卡接口。请在【自动发货】模块配置发卡接口或批量导入卡密！');
    }
  };

  return (
    <div className="h-full flex overflow-hidden text-slate-100 select-none">
      {/* 1. Left: Conversation List */}
      <div className="w-80 border-r border-slate-800 bg-slate-950 flex flex-col shrink-0">
        {/* Top filter and search */}
        <div className="p-3 border-b border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-white flex items-center gap-1.5">
              <MessageCircle className="w-4 h-4 text-amber-400" />
              闲鱼在线客服工作台
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              {conversations.length} 会话
            </span>
          </div>

          <div className="flex gap-2 text-xs">
            <select
              value={filterAccount}
              onChange={(e) => setFilterAccount(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-slate-300 focus:outline-hidden text-xs"
            >
              <option value="all">全部店铺会话</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nickname}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchBuyer}
              onChange={(e) => setSearchBuyer(e.target.value)}
              placeholder="搜索买家昵称或消息..."
              className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:border-amber-500"
            />
          </div>

          {/* Simulate Buyer B Inbound Button */}
          <button
            onClick={() => {
              setInboundAccountId(filterAccount !== 'all' ? filterAccount : accounts[0]?.id || '');
              setShowNewInboundModal(true);
            }}
            className="w-full h-8 px-2 bg-gradient-to-r from-amber-500/20 to-amber-500/10 hover:from-amber-500/30 hover:to-amber-500/20 text-amber-300 hover:text-amber-200 border border-amber-500/35 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs"
            title="让买家B向指定店铺账号(如新接入的账号A)发起进线咨询，测试自动回复"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span>模拟买家B进线咨询 (测试A账号)</span>
          </button>
        </div>

        {/* Conversation List Items */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-900">
          {filteredConversations.length === 0 ? (
            <div className="p-5 text-center space-y-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
                <MessageCircle className="w-5 h-5 text-amber-400/80" />
              </div>
              <div className="space-y-1">
                <p className="font-bold text-xs text-white">
                  {filterAccount !== 'all'
                    ? `【${accounts.find((a) => a.id === filterAccount)?.nickname || '该店铺'}】暂无咨询`
                    : '暂无符合条件的会话'}
                </p>
                <p className="text-[11px] text-slate-400 leading-relaxed max-w-[200px] mx-auto">
                  该账号尚未有买家进线。点击下方按钮即可让买家B向该店铺发送首条咨询，并立即测试自动回复！
                </p>
              </div>
              <button
                onClick={() => {
                  setInboundAccountId(filterAccount !== 'all' ? filterAccount : accounts[0]?.id || '');
                  setShowNewInboundModal(true);
                }}
                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-all shadow-md shadow-amber-500/20 inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>立即模拟买家B进线</span>
              </button>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isSelected = conv.id === selectedConvId;
              const ownerAcc = accounts.find((a) => a.id === conv.accountId);

              return (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConvId(conv.id)}
                  className={`p-3 cursor-pointer transition-colors flex items-start gap-3 relative ${
                    isSelected ? 'bg-slate-900 border-l-4 border-amber-400' : 'hover:bg-slate-900/60'
                  }`}
                >
                  <div className="relative shrink-0">
                    <img
                      src={conv.buyerAvatar}
                      alt={conv.buyerNickname}
                      className="w-10 h-10 rounded-full object-cover border border-slate-800"
                    />
                    {conv.unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="font-semibold text-xs text-white truncate">
                        {conv.buyerNickname}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">{conv.lastMessageTime}</span>
                    </div>

                    <p className="text-[11px] text-slate-400 truncate mb-1">{conv.lastMessage}</p>

                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-500 truncate max-w-[120px]">
                        {ownerAcc?.nickname}
                      </span>
                      {conv.isAutoReplyActive ? (
                        <span className="text-emerald-400 font-medium">● 机器人托管</span>
                      ) : (
                        <span className="text-amber-400 font-medium">▲ 人工接管中</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 2. Middle: Live Chat Stream & Composer */}
      <div className="flex-1 flex flex-col bg-slate-900/50 min-w-0">
        {activeConv ? (
          <>
            {/* Chat Header */}
            <div className="h-14 px-5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3">
                <img
                  src={activeConv.buyerAvatar}
                  alt={activeConv.buyerNickname}
                  className="w-8 h-8 rounded-full object-cover border border-slate-700"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">{activeConv.buyerNickname}</span>
                    <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                      UID: {activeConv.buyerUid}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    当前接待店铺: <strong className="text-slate-200">{activeAccount?.nickname}</strong>
                  </div>
                </div>
              </div>

              {/* Bot takeover toggle */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() =>
                    onToggleConversationAutoReply(activeConv.id, !activeConv.isAutoReplyActive)
                  }
                  className={`h-8 flex items-center gap-1.5 px-3 rounded-lg text-xs font-semibold border transition-all shrink-0 whitespace-nowrap shadow-2xs ${
                    activeConv.isAutoReplyActive
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
                      : 'bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/25'
                  }`}
                  title="点击切换：在自动回复与人工接管间切换"
                >
                  <Bot className="w-3.5 h-3.5 shrink-0" />
                  <span>{activeConv.isAutoReplyActive ? '机器人托管中' : '人工接管中'}</span>
                </button>

                {/* Simulate Buyer Inbound Message (for testing live chat) */}
                <button
                  onClick={() => {
                    setSimulateInput('在吗？请问兑换码发货了吗？');
                    setShowSimulateModal(true);
                  }}
                  className="h-8 px-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-amber-200 text-xs font-semibold rounded-lg border border-amber-500/40 transition-colors shrink-0 whitespace-nowrap flex items-center gap-1.5 shadow-sm"
                  title="模拟买家发消息，测试自动机规则命中与回复"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>模拟买家发言</span>
                </button>
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {activeMessages.map((msg) => {
                const isBuyer = msg.sender === 'buyer';
                const isSystem = msg.sender === 'system' || msg.type === 'order_notice';

                if (isSystem) {
                  return (
                    <div key={msg.id} className="flex justify-center">
                      <div className="bg-slate-950/80 border border-slate-800 px-3 py-1.5 rounded-lg text-[11px] text-amber-400/90 flex items-center gap-1.5 shadow-xs">
                        <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
                        <span>{msg.content}</span>
                        <span className="text-[10px] text-slate-500 font-mono">({msg.timestamp})</span>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-2.5 ${isBuyer ? 'justify-start' : 'justify-end'}`}
                  >
                    {isBuyer && (
                      <img
                        src={activeConv.buyerAvatar}
                        alt="buyer"
                        className="w-7 h-7 rounded-full object-cover border border-slate-800 mt-1"
                      />
                    )}

                    <div className={`max-w-md ${isBuyer ? 'items-start' : 'items-end'} flex flex-col`}>
                      {/* Sender tag / AutoReply Badge */}
                      <div className="text-[10px] text-slate-500 mb-1 flex items-center gap-1.5">
                        <span>{isBuyer ? activeConv.buyerNickname : activeAccount?.nickname}</span>
                        {msg.isAutoReplied && (
                          <span className="bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded text-[9px] border border-emerald-500/30">
                            🤖 自动应答: {msg.matchedRuleName || '规则命中'}
                          </span>
                        )}
                        <span className="font-mono">{msg.timestamp}</span>
                      </div>

                      {/* Bubble */}
                      <div
                        className={`p-3 rounded-2xl text-xs leading-relaxed font-sans shadow-sm select-text whitespace-pre-wrap ${
                          isBuyer
                            ? 'bg-slate-800 text-slate-100 rounded-tl-xs border border-slate-700/80'
                            : msg.type === 'card'
                            ? 'bg-gradient-to-br from-amber-500/20 to-slate-900 border border-amber-500/40 text-amber-200 rounded-tr-xs font-mono'
                            : 'bg-amber-500 text-slate-950 font-medium rounded-tr-xs'
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>

                    {!isBuyer && (
                      <img
                        src={activeAccount?.avatar}
                        alt="seller"
                        className="w-7 h-7 rounded-full object-cover border border-slate-800 mt-1"
                      />
                    )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Reply Bar */}
            <div className="px-5 py-2 bg-slate-950/60 border-t border-slate-800 flex items-center gap-2 overflow-x-auto text-xs">
              <span className="text-[11px] text-slate-500 shrink-0 font-medium">常用短语:</span>
              {QUICK_REPLIES.map((phrase, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendQuickPhrase(phrase)}
                  className="h-7 px-3 rounded-md bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white whitespace-nowrap text-xs transition-all shrink-0 shadow-2xs"
                >
                  {phrase}
                </button>
              ))}
            </div>

            {/* Message Input Box */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDispatchCardDirectly}
                    className="h-7 px-2.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/30 text-amber-400 hover:text-amber-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
                    title="从库存中抽取一张可用卡券并格式化下发"
                  >
                    <Key className="w-3.5 h-3.5 shrink-0" />
                    <span>插入卡密</span>
                  </button>
                  <button
                    onClick={() => alert('已触发商品图文快照发送')}
                    className="h-7 px-2.5 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
                    <span>推商品</span>
                  </button>
                </div>
                <span className="text-[11px] text-slate-500 font-mono">
                  按 Enter 发送，Shift+Enter 换行
                </span>
              </div>

              <div className="flex gap-2">
                <textarea
                  rows={2}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="输入向买家回复的内容..."
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-hidden focus:border-amber-500 resize-none font-sans"
                />
                <button
                  onClick={handleSend}
                  className="w-14 sm:w-16 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold rounded-lg flex items-center justify-center shadow-md shadow-amber-500/20 transition-all active:scale-95 shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center shadow-lg">
              <MessageCircle className="w-7 h-7 text-amber-400" />
            </div>
            <div className="space-y-1 max-w-sm">
              <h3 className="font-bold text-sm text-white">暂未打开任何会话窗口</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                请在左侧选择买家会话；如果您刚刚添加了新账号 A，可点击下方按钮模拟买家 B 向店铺 A 发起进线咨询，立即测试规则自动回复！
              </p>
            </div>
            <button
              onClick={() => {
                setInboundAccountId(filterAccount !== 'all' ? filterAccount : accounts[0]?.id || '');
                setShowNewInboundModal(true);
              }}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all active:scale-95"
            >
              <Sparkles className="w-4 h-4 fill-current" />
              <span>模拟买家B进线咨询 (测试A账号)</span>
            </button>
          </div>
        )}
      </div>

      {/* 3. Right: Trade Context & Buyer Details */}
      {activeConv && (
        <div className="w-72 border-l border-slate-800 bg-slate-950 p-4 space-y-4 overflow-y-auto shrink-0 text-xs">
          {/* Current Trading Item Card */}
          <div>
            <div className="font-bold text-white text-xs mb-2 flex items-center gap-1.5">
              <ShoppingBag className="w-4 h-4 text-amber-400" />
              <span>买家当前咨询/拍下商品</span>
            </div>

            {activeConv.currentTrade ? (
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2.5">
                <div className="flex gap-2.5">
                  <img
                    src={activeConv.currentTrade.itemCover}
                    alt="cover"
                    className="w-14 h-14 rounded-lg object-cover border border-slate-800 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-slate-200 text-xs line-clamp-2 leading-snug">
                      {activeConv.currentTrade.itemTitle}
                    </h4>
                    <div className="text-amber-400 font-bold text-sm mt-1">
                      ¥{activeConv.currentTrade.itemPrice.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">交易流程状态:</span>
                  <span
                    className={`font-semibold ${
                      activeConv.currentTrade.status === 'completed'
                        ? 'text-emerald-400'
                        : activeConv.currentTrade.status === 'delivered'
                        ? 'text-sky-400'
                        : activeConv.currentTrade.status === 'ordered'
                        ? 'text-amber-400'
                        : 'text-slate-300'
                    }`}
                  >
                    {activeConv.currentTrade.status === 'completed'
                      ? '已完成 (已好评)'
                      : activeConv.currentTrade.status === 'delivered'
                      ? '已发货 (无需物流)'
                      : activeConv.currentTrade.status === 'paid'
                      ? '已付款 (待自动出库)'
                      : '浏览咨询中'}
                  </span>
                </div>

                {activeConv.currentTrade.orderId && (
                  <div className="text-[10px] text-slate-500 font-mono truncate">
                    订单号: {activeConv.currentTrade.orderId}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800 text-slate-500 text-center">
                暂无关联正在拍下的商品
              </div>
            )}
          </div>

          {/* Buyer Profile & Risk Info */}
          <div className="space-y-2">
            <div className="font-bold text-white text-xs flex items-center gap-1.5">
              <User className="w-4 h-4 text-sky-400" />
              <span>买家风控与画像</span>
            </div>

            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2 text-slate-300">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">芝麻信用分:</span>
                <span className="text-emerald-400 font-semibold">极好 (750+)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">历史成单:</span>
                <span className="text-white font-mono">14 笔交易</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">好评率:</span>
                <span className="text-emerald-400 font-mono">100%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">违规风险等级:</span>
                <span className="text-emerald-400 font-semibold">极低风险</span>
              </div>
            </div>
          </div>

          {/* Fast Actions */}
          <div className="space-y-2.5 pt-3 border-t border-slate-800">
            <button
              onClick={handleDispatchCardDirectly}
              className="w-full h-10 px-3 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold rounded-lg text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 transition-all active:scale-98"
            >
              <Zap className="w-4 h-4 shrink-0" />
              <span>一键直发卡密给该买家</span>
            </button>

            <button
              onClick={() => alert('已调用无需物流标记发货接口 (mtop.taobao.idle.order.send)')}
              className="w-full h-9 px-3 bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-800 hover:border-slate-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
            >
              <span>标记订单已发货 (免运费)</span>
            </button>
          </div>
        </div>
      )}

      {/* In-app Simulator Dialog (replaces browser prompt for reliable iframe execution) */}
      {showSimulateModal && activeConv && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-md p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-sm text-white">模拟买家发送消息</h3>
              </div>
              <button
                onClick={() => setShowSimulateModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              向当前买家 <strong className="text-amber-300">【{activeConv.buyerNickname}】</strong> 发送模拟咨询，系统自动回复引擎将检测匹配规则并在 1-2 秒内自动响应：
            </p>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 mb-1.5 block">快捷预设测试用例：</label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  '在吗？怎么发货？',
                  '请问兑换码发货了吗？',
                  '加一下微信私聊 vx1892837492',
                  '发货教程发我一份',
                  '这个还有货吗？最低多少出？',
                ].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setSimulateInput(preset)}
                    className="text-[11px] px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded border border-slate-700 transition-colors text-left"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 mb-1 block">模拟买家输入的文本：</label>
              <textarea
                value={simulateInput}
                onChange={(e) => setSimulateInput(e.target.value)}
                placeholder="输入买家想说的话..."
                className="w-full h-20 bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-400 resize-none font-sans"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowSimulateModal(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg font-medium transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => {
                  if (simulateInput.trim()) {
                    onSimulateBuyerMessage(activeConv.id, simulateInput.trim());
                    setShowSimulateModal(false);
                  }
                }}
                disabled={!simulateInput.trim()}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>立即发送并触发回复</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Buyer B Inbound Consultation (New Chat Session for Multi-account) */}
      {showNewInboundModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-sm text-white">模拟买家 B 向店铺进线咨询</h3>
              </div>
              <button
                onClick={() => setShowNewInboundModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              测试场景：您使用买家 B 账号向您多账号管理中的店铺账号（如账号 A）发起咨询，系统将生成新的在线聊天窗口，并执行自动回复规则。
            </p>

            {/* Target Account Selector */}
            <div>
              <label className="text-[11px] font-semibold text-slate-400 mb-1 block">
                接收咨询的店铺账号（卖家）：
              </label>
              <select
                value={inboundAccountId}
                onChange={(e) => setInboundAccountId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-hidden focus:border-amber-400"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.nickname} ({acc.accountName}) - {acc.status === 'online' ? '🟢 在线' : '⚪ 离线'}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 mb-1 block">
                  买家 B 昵称：
                </label>
                <input
                  type="text"
                  value={inboundBuyerName}
                  onChange={(e) => setInboundBuyerName(e.target.value)}
                  placeholder="买家昵称"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-hidden focus:border-amber-400"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-400 mb-1 block">
                  咨询商品标题：
                </label>
                <input
                  type="text"
                  value={inboundItemTitle}
                  onChange={(e) => setInboundItemTitle(e.target.value)}
                  placeholder="商品标题"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-hidden focus:border-amber-400"
                />
              </div>
            </div>

            {/* Quick Presets */}
            <div>
              <label className="text-[11px] font-semibold text-slate-400 mb-1.5 block">
                买家 B 快捷咨询语（点击填入）：
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  '在吗？请问兑换码怎么发货？',
                  '拍下了多久能发货？',
                  '老板这个还有货吗？最低多少能出？',
                  '加一下微信私聊 vx1892837492',
                  '发货教程发我一份',
                ].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setInboundMessage(preset)}
                    className="text-[11px] px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded border border-slate-700 transition-colors text-left"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Inbound Message */}
            <div>
              <label className="text-[11px] font-semibold text-slate-400 mb-1 block">
                买家 B 首条咨询消息：
              </label>
              <textarea
                value={inboundMessage}
                onChange={(e) => setInboundMessage(e.target.value)}
                rows={2}
                placeholder="买家第一句话..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-400 resize-none font-sans"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowNewInboundModal(false)}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg font-medium transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => {
                  if (onCreateInboundConversation && inboundMessage.trim() && inboundAccountId) {
                    const newId = onCreateInboundConversation(
                      inboundAccountId,
                      inboundBuyerName.trim() || '闲鱼买家B',
                      inboundMessage.trim(),
                      {
                        itemId: 'item_inbound',
                        itemTitle: inboundItemTitle.trim(),
                        itemPrice: 88.0,
                        itemCover:
                          'https://images.unsplash.com/photo-1612287233207-6b4d32f7e774?w=200&auto=format&fit=crop&q=80',
                      }
                    );
                    setSelectedConvId(newId);
                    setFilterAccount('all');
                    setShowNewInboundModal(false);
                  }
                }}
                disabled={!inboundMessage.trim() || !inboundAccountId}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-md shadow-amber-500/20"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>立即进线并开启会话</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
