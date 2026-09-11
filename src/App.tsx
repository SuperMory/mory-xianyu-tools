import React, { useState, useEffect } from 'react';
import {
  INITIAL_ACCOUNTS,
  INITIAL_RULES,
  INITIAL_CARD_VAULT,
  INITIAL_DELIVERY_RECORDS,
  INITIAL_CONVERSATIONS,
  INITIAL_MESSAGES,
  INITIAL_RISK_LOGS,
  INITIAL_ANNOUNCEMENTS,
  INITIAL_API_CONFIGS,
} from './mock/initialData';
import {
  XianYuAccount,
  AutoReplyRule,
  CardSecretItem,
  DeliveryRecord,
  Conversation,
  ChatMessage,
  RiskLog,
  SystemAnnouncement,
  AutoDeliveryApiConfig,
} from './types';
import { DesktopHeader } from './components/DesktopHeader';
import { Sidebar, NavTab } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { AccountManager } from './components/AccountManager';
import { AutoReplyEngine } from './components/AutoReplyEngine';
import { AutoDelivery } from './components/AutoDelivery';
import { ChatWorkbench } from './components/ChatWorkbench';
import { RiskControlCenter } from './components/RiskControlCenter';
import { TechnicalSpecsModal } from './components/TechnicalSpecsModal';
import { ElectronPackagerModal } from './components/ElectronPackagerModal';
import { AddAccountModal } from './components/AddAccountModal';
import { ProductionDeploymentModal } from './components/ProductionDeploymentModal';

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');

  // Core Data States with fallback to initial mock data
  const [accounts, setAccounts] = useState<XianYuAccount[]>(() => {
    const saved = localStorage.getItem('magic_xy_accounts');
    return saved ? JSON.parse(saved) : INITIAL_ACCOUNTS;
  });

  const [activeAccountId, setActiveAccountId] = useState<string>(() => {
    return accounts[0]?.id || 'acc_01';
  });

  const [rules, setRules] = useState<AutoReplyRule[]>(() => {
    const saved = localStorage.getItem('magic_xy_rules');
    return saved ? JSON.parse(saved) : INITIAL_RULES;
  });

  const [cardVault, setCardVault] = useState<CardSecretItem[]>(() => {
    const saved = localStorage.getItem('magic_xy_vault');
    return saved ? JSON.parse(saved) : INITIAL_CARD_VAULT;
  });

  const [deliveryRecords, setDeliveryRecords] = useState<DeliveryRecord[]>(() => {
    const saved = localStorage.getItem('magic_xy_deliveries');
    return saved ? JSON.parse(saved) : INITIAL_DELIVERY_RECORDS;
  });

  const [conversations, setConversations] = useState<Conversation[]>(() => {
    const saved = localStorage.getItem('magic_xy_convs');
    return saved ? JSON.parse(saved) : INITIAL_CONVERSATIONS;
  });

  const [messages, setMessages] = useState<Record<string, ChatMessage[]>>(() => {
    const saved = localStorage.getItem('magic_xy_messages');
    return saved ? JSON.parse(saved) : INITIAL_MESSAGES;
  });

  const [riskLogs, setRiskLogs] = useState<RiskLog[]>(() => {
    const saved = localStorage.getItem('magic_xy_risk_logs');
    return saved ? JSON.parse(saved) : INITIAL_RISK_LOGS;
  });

  const [announcements, setAnnouncements] = useState<SystemAnnouncement[]>(INITIAL_ANNOUNCEMENTS);

  const [apiConfigs, setApiConfigs] = useState<AutoDeliveryApiConfig[]>(() => {
    const saved = localStorage.getItem('magic_xy_api_configs');
    return saved ? JSON.parse(saved) : INITIAL_API_CONFIGS;
  });

  // App Toggles
  const [globalBotActive, setGlobalBotActive] = useState<boolean>(true);
  const [desktopNotifications, setDesktopNotifications] = useState<boolean>(true);

  // Modals
  const [showSpecsModal, setShowSpecsModal] = useState<boolean>(false);
  const [showPackagerModal, setShowPackagerModal] = useState<boolean>(false);
  const [showAddAccountModal, setShowAddAccountModal] = useState<boolean>(false);
  const [showProductionModal, setShowProductionModal] = useState<boolean>(false);

  // Sync rules with full-stack backend
  useEffect(() => {
    fetch('/api/production/sync-rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rules, globalBotActive }),
    }).catch(() => {});
  }, [rules, globalBotActive]);

  // Sync accounts with backend worker manager
  useEffect(() => {
    for (const acc of accounts) {
      if (acc.cookies && acc.cookies.length > 20) {
        fetch('/api/production/account/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: acc.id,
            nickname: acc.nickname,
            cookie: acc.cookies,
            autoStart: acc.status === 'online',
          }),
        }).catch(() => {});
      }
    }
  }, [accounts]);

  // Poll real messages from backend Mtop worker
  useEffect(() => {
    const pollRealMessages = async () => {
      try {
        const res = await fetch('/api/production/messages');
        if (res.ok) {
          const data = await res.json();
          if (data.messages && data.messages.length > 0) {
            for (const rm of data.messages) {
              setMessages((prev) => {
                const convMsgs = prev[rm.conversationId] || [];
                if (convMsgs.some((m) => m.id === rm.id)) return prev;
                return {
                  ...prev,
                  [rm.conversationId]: [
                    ...convMsgs,
                    {
                      id: rm.id,
                      conversationId: rm.conversationId,
                      sender: rm.sender,
                      type: 'text',
                      content: rm.content,
                      timestamp: rm.timestamp,
                      status: rm.status,
                      isAutoReplied: !!rm.matchedRuleName,
                      matchedRuleName: rm.matchedRuleName,
                    },
                  ],
                };
              });

              setConversations((prev) => {
                const exists = prev.find((c) => c.id === rm.conversationId);
                if (exists) {
                  return prev.map((c) =>
                    c.id === rm.conversationId
                      ? {
                          ...c,
                          lastMessage: rm.content.slice(0, 35),
                          lastMessageTime: rm.timestamp.slice(0, 5),
                          unreadCount: rm.sender === 'buyer' ? c.unreadCount + 1 : 0,
                        }
                      : c
                  );
                } else {
                  return [
                    {
                      id: rm.conversationId,
                      accountId: rm.accountId,
                      buyerUid: rm.buyerUid,
                      buyerNickname: rm.buyerNickname || '闲鱼买家',
                      buyerAvatar:
                        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
                      lastMessage: rm.content.slice(0, 35),
                      lastMessageTime: rm.timestamp.slice(0, 5),
                      unreadCount: 1,
                      isAutoReplyActive: true,
                    },
                    ...prev,
                  ];
                }
              });
            }
          }
        }
      } catch {}
    };

    const timer = setInterval(pollRealMessages, 3500);
    return () => clearInterval(timer);
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('magic_xy_accounts', JSON.stringify(accounts));
  }, [accounts]);

  useEffect(() => {
    localStorage.setItem('magic_xy_rules', JSON.stringify(rules));
  }, [rules]);

  useEffect(() => {
    localStorage.setItem('magic_xy_vault', JSON.stringify(cardVault));
  }, [cardVault]);

  useEffect(() => {
    localStorage.setItem('magic_xy_deliveries', JSON.stringify(deliveryRecords));
  }, [deliveryRecords]);

  useEffect(() => {
    localStorage.setItem('magic_xy_convs', JSON.stringify(conversations));
  }, [conversations]);

  useEffect(() => {
    localStorage.setItem('magic_xy_messages', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('magic_xy_risk_logs', JSON.stringify(riskLogs));
  }, [riskLogs]);

  useEffect(() => {
    localStorage.setItem('magic_xy_api_configs', JSON.stringify(apiConfigs));
  }, [apiConfigs]);

  // Account Handlers
  const handleUpdateAccount = (updated: XianYuAccount) => {
    setAccounts((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
  };

  const handleAddAccount = (newAcc: XianYuAccount) => {
    setAccounts((prev) => [newAcc, ...prev]);
    setActiveAccountId(newAcc.id);

    // Automatically seed an incoming test consultation from Buyer B to this new store account!
    handleCreateInboundConversation(
      newAcc.id,
      '闲鱼买家B (在线咨询)',
      '在吗？请问这个怎么发货？拍下多久能到？',
      {
        itemId: 'item_general',
        itemTitle: `【${newAcc.nickname}】自动发货数字商品/会员权益`,
        itemPrice: 88.0,
        itemCover: 'https://images.unsplash.com/photo-1612287233207-6b4d32f7e774?w=200&auto=format&fit=crop&q=80',
      }
    );
  };

  const handleDeleteAccount = (id: string) => {
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    if (activeAccountId === id) {
      setActiveAccountId(accounts.find((a) => a.id !== id)?.id || '');
    }
  };

  // Rule Handlers
  const handleAddRule = (newRule: AutoReplyRule) => {
    setRules((prev) => [newRule, ...prev]);
  };

  const handleUpdateRule = (updated: AutoReplyRule) => {
    setRules((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  };

  const handleDeleteRule = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  // Card & Delivery Handlers
  const handleAddCards = (newCards: CardSecretItem[]) => {
    setCardVault((prev) => [...newCards, ...prev]);
  };

  const handleDeleteCard = (id: string) => {
    setCardVault((prev) => prev.filter((c) => c.id !== id));
  };

  const handleSaveApiConfig = (config: AutoDeliveryApiConfig) => {
    setApiConfigs((prev) => {
      const idx = prev.findIndex((c) => c.id === config.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = config;
        return copy;
      }
      return [config, ...prev];
    });
  };

  const handleDeleteApiConfig = (id: string) => {
    setApiConfigs((prev) => prev.filter((c) => c.id !== id));
  };

  const handleToggleApiConfig = (id: string, enabled: boolean) => {
    setApiConfigs((prev) =>
      prev.map((c) => (c.id === id ? { ...c, enabled } : c))
    );
  };

  const handleReissueDelivery = (recordId: string, newContent: string) => {
    const targetRec = deliveryRecords.find((r) => r.id === recordId);
    if (!targetRec) return;

    // Update record
    const updatedRec: DeliveryRecord = {
      ...targetRec,
      content: newContent,
      status: 'reissued',
      reissueCount: targetRec.reissueCount + 1,
    };

    setDeliveryRecords((prev) => prev.map((r) => (r.id === recordId ? updatedRec : r)));

    // Send into conversation
    const conv = conversations.find((c) => c.buyerUid === targetRec.buyerUid);
    if (conv) {
      const newMsg: ChatMessage = {
        id: `msg_reissue_${Date.now()}`,
        conversationId: conv.id,
        sender: 'user',
        type: 'card',
        content: newContent,
        timestamp: new Date().toLocaleTimeString(),
        status: 'sent',
      };
      setMessages((prev) => ({
        ...prev,
        [conv.id]: [...(prev[conv.id] || []), newMsg],
      }));
    }

    alert(`订单 ${targetRec.orderId} 补发卡密已推送给买家！`);
  };

  // Chat Send Message
  const handleSendMessage = (conversationId: string, text: string, type: 'text' | 'card' = 'text') => {
    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      conversationId,
      sender: 'user',
      type,
      content: text,
      timestamp: new Date().toLocaleTimeString(),
      status: 'sent',
    };

    setMessages((prev) => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] || []), newMsg],
    }));

    // Update last message in conversation
    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              lastMessage: text.slice(0, 35) + (text.length > 35 ? '...' : ''),
              lastMessageTime: new Date().toLocaleTimeString().slice(0, 5),
            }
          : c
      )
    );
  };

  // Reusable Auto-Reply Engine Execution Core
  const runAutoReply = (conv: Conversation, text: string) => {
    if (!globalBotActive || !conv.isAutoReplyActive) return;

    // Find matching rule
    const sortedRules = [...rules].sort((a, b) => b.priority - a.priority);
    let matchedRule: AutoReplyRule | null = null;

    for (const r of sortedRules) {
      if (!r.enabled) continue;
      if (r.accountId !== 'all' && r.accountId !== conv.accountId) continue;

      if (r.matchType === 'item_specific' && conv.currentTrade?.itemId === r.targetItemId) {
        if (r.keywords.some((k) => text.includes(k))) {
          matchedRule = r;
          break;
        }
      } else if (r.matchType === 'exact' && r.keywords.some((k) => k.trim() === text.trim())) {
        matchedRule = r;
        break;
      } else if (r.matchType === 'contains' && r.keywords.some((k) => text.includes(k))) {
        matchedRule = r;
        break;
      } else if (r.matchType === 'regex') {
        const hit = r.keywords.some((pat) => {
          try {
            const cleanPat = pat.replace(/^\(\?[imsux]+\)/, '');
            return new RegExp(cleanPat, 'i').test(text);
          } catch {
            return false;
          }
        });
        if (hit) {
          matchedRule = r;
          break;
        }
      }
    }

    // Default fallback rule if none matched
    if (!matchedRule) {
      matchedRule = sortedRules.find((r) => r.matchType === 'default' && r.enabled) || null;
    }

    if (matchedRule) {
      const minDelay = Math.max(1, matchedRule.randomDelayMin || 1);
      const maxDelay = Math.max(minDelay, matchedRule.randomDelayMax || 2);
      const delaySeconds = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;

      // Dynamic slot replace
      const replyText = matchedRule.replyContent
        .replace(/{buyer_name}/g, conv.buyerNickname)
        .replace(/{item_title}/g, conv.currentTrade?.itemTitle || '闲鱼商品')
        .replace(/{order_id}/g, conv.currentTrade?.orderId || 'TB' + Date.now())
        .replace(/{time}/g, new Date().toLocaleTimeString());

      setTimeout(() => {
        const autoMsg: ChatMessage = {
          id: `automsg_${Date.now()}`,
          conversationId: conv.id,
          sender: 'user',
          type: 'text',
          content: replyText,
          timestamp: new Date().toLocaleTimeString(),
          isAutoReplied: true,
          matchedRuleName: matchedRule?.name,
          status: 'sent',
        };

        setMessages((prev) => ({
          ...prev,
          [conv.id]: [...(prev[conv.id] || []), autoMsg],
        }));

        // Also update conversation's last message on auto-reply
        setConversations((prev) =>
          prev.map((c) =>
            c.id === conv.id
              ? {
                  ...c,
                  lastMessage: replyText.slice(0, 35) + (replyText.length > 35 ? '...' : ''),
                  lastMessageTime: new Date().toLocaleTimeString().slice(0, 5),
                }
              : c
          )
        );

        // Increment rule hit count
        setRules((prev) =>
          prev.map((r) => (r.id === matchedRule?.id ? { ...r, hitCount: r.hitCount + 1 } : r))
        );

        // Increment account todayReplies count
        setAccounts((prev) =>
          prev.map((a) =>
            a.id === conv.accountId ? { ...a, todayReplies: a.todayReplies + 1 } : a
          )
        );
      }, delaySeconds * 1000);
    }
  };

  // Simulate Buyer Inbound Message on existing conversation
  const handleSimulateBuyerMessage = (conversationId: string, text: string) => {
    const conv = conversations.find((c) => c.id === conversationId);
    if (!conv) return;

    const buyerMsg: ChatMessage = {
      id: `bmsg_${Date.now()}`,
      conversationId,
      sender: 'buyer',
      type: 'text',
      content: text,
      timestamp: new Date().toLocaleTimeString(),
      status: 'received',
    };

    setMessages((prev) => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] || []), buyerMsg],
    }));

    setConversations((prev) =>
      prev.map((c) =>
        c.id === conversationId
          ? {
              ...c,
              lastMessage: text.slice(0, 35) + (text.length > 35 ? '...' : ''),
              lastMessageTime: new Date().toLocaleTimeString().slice(0, 5),
            }
          : c
      )
    );

    runAutoReply(conv, text);
  };

  // Create Brand New Inbound Buyer Conversation (e.g. Buyer B chatting with Store A)
  const handleCreateInboundConversation = (
    accountId: string,
    buyerNickname: string,
    text: string,
    itemInfo?: { itemId?: string; itemTitle?: string; itemPrice?: number; itemCover?: string }
  ) => {
    const convId = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const buyerUid = `buyer_${Math.floor(10000 + Math.random() * 90000)}`;

    const newConv: Conversation = {
      id: convId,
      accountId,
      buyerUid,
      buyerNickname: buyerNickname.trim() || '闲鱼买家B (在线咨询)',
      buyerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
      lastMessage: text.slice(0, 35) + (text.length > 35 ? '...' : ''),
      lastMessageTime: new Date().toLocaleTimeString().slice(0, 5),
      unreadCount: 1,
      isAutoReplyActive: true,
      currentTrade: {
        itemId: itemInfo?.itemId || 'item_switch_vip',
        itemTitle: itemInfo?.itemTitle || '【任天堂Switch 12个月会员兑换码】拍下自动发货',
        itemPrice: itemInfo?.itemPrice || 99.0,
        itemCover: itemInfo?.itemCover || 'https://images.unsplash.com/photo-1612287233207-6b4d32f7e774?w=200&auto=format&fit=crop&q=80',
        status: 'consulting',
      },
    };

    const initialBuyerMsg: ChatMessage = {
      id: `bmsg_${Date.now()}`,
      conversationId: convId,
      sender: 'buyer',
      type: 'text',
      content: text,
      timestamp: new Date().toLocaleTimeString(),
      status: 'received',
    };

    setConversations((prev) => [newConv, ...prev]);
    setMessages((prev) => ({
      ...prev,
      [convId]: [initialBuyerMsg],
    }));

    // Trigger auto-reply right away
    runAutoReply(newConv, text);

    return convId;
  };

  // Toggle Conversation Auto-Reply
  const handleToggleConversationAutoReply = (conversationId: string, active: boolean) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === conversationId ? { ...c, isAutoReplyActive: active } : c))
    );
  };

  // Resolve Risk Log
  const handleResolveLog = (id: string) => {
    setRiskLogs((prev) => prev.map((l) => (l.id === id ? { ...l, resolved: true } : l)));
  };

  const totalUnreadMessages = conversations.reduce((acc, c) => acc + c.unreadCount, 0);
  const totalPendingRisks = riskLogs.filter((l) => !l.resolved).length;
  const availableCardsCount = cardVault.filter((c) => c.status === 'available').length;

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 font-sans overflow-hidden select-none">
      {/* 1. Desktop Style Header Bar */}
      <DesktopHeader
        accounts={accounts}
        activeAccountId={activeAccountId}
        onSelectAccount={(id) => setActiveAccountId(id)}
        globalBotActive={globalBotActive}
        onToggleGlobalBot={() => setGlobalBotActive(!globalBotActive)}
        desktopNotifications={desktopNotifications}
        onToggleDesktopNotifications={() => setDesktopNotifications(!desktopNotifications)}
        onOpenSpecs={() => setShowSpecsModal(true)}
        onOpenPackager={() => setShowPackagerModal(true)}
        onOpenAddAccount={() => setShowAddAccountModal(true)}
        onOpenProduction={() => setShowProductionModal(true)}
      />

      {/* 2. Main Body: Sidebar + Dynamic Workspace */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Left Nav */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={(tab) => setActiveTab(tab)}
          unreadCount={totalUnreadMessages}
          riskCount={totalPendingRisks}
          availableCardsCount={availableCardsCount}
          onOpenSpecs={() => setShowSpecsModal(true)}
          onOpenPackager={() => setShowPackagerModal(true)}
        />

        {/* Right Workspace Views */}
        <main className="flex-1 bg-slate-900/40 overflow-hidden flex flex-col min-w-0">
          {activeTab === 'dashboard' && (
            <DashboardView
              accounts={accounts}
              rules={rules}
              deliveryRecords={deliveryRecords}
              riskLogs={riskLogs}
              onNavigate={(tab) => setActiveTab(tab)}
              onOpenSpecs={() => setShowSpecsModal(true)}
              onOpenPackager={() => setShowPackagerModal(true)}
              onOpenAddAccount={() => setShowAddAccountModal(true)}
            />
          )}

          {activeTab === 'accounts' && (
            <AccountManager
              accounts={accounts}
              onUpdateAccount={handleUpdateAccount}
              onAddAccount={handleAddAccount}
              onDeleteAccount={handleDeleteAccount}
              onOpenAddAccount={() => setShowAddAccountModal(true)}
              onOpenProduction={() => setShowProductionModal(true)}
            />
          )}

          {activeTab === 'replies' && (
            <AutoReplyEngine
              rules={rules}
              accounts={accounts}
              onAddRule={handleAddRule}
              onUpdateRule={handleUpdateRule}
              onDeleteRule={handleDeleteRule}
            />
          )}

          {activeTab === 'delivery' && (
            <AutoDelivery
              cardVault={cardVault}
              deliveryRecords={deliveryRecords}
              apiConfigs={apiConfigs}
              accounts={accounts}
              onAddCards={handleAddCards}
              onDeleteCard={handleDeleteCard}
              onReissueDelivery={handleReissueDelivery}
              onSaveApiConfig={handleSaveApiConfig}
              onDeleteApiConfig={handleDeleteApiConfig}
              onToggleApiConfig={handleToggleApiConfig}
            />
          )}

          {activeTab === 'chat' && (
            <ChatWorkbench
              conversations={conversations}
              messages={messages}
              accounts={accounts}
              cardVault={cardVault}
              apiConfigs={apiConfigs}
              activeAccountId={activeAccountId}
              onSendMessage={handleSendMessage}
              onToggleConversationAutoReply={handleToggleConversationAutoReply}
              onSimulateBuyerMessage={handleSimulateBuyerMessage}
              onCreateInboundConversation={handleCreateInboundConversation}
            />
          )}

          {activeTab === 'risk' && (
            <RiskControlCenter
              riskLogs={riskLogs}
              announcements={announcements}
              accounts={accounts}
              onResolveLog={handleResolveLog}
              onAddAnnouncement={(ann) => setAnnouncements((prev) => [ann, ...prev])}
            />
          )}
        </main>
      </div>

      {/* 3. Modals */}
      <TechnicalSpecsModal
        isOpen={showSpecsModal}
        onClose={() => setShowSpecsModal(false)}
      />

      <ElectronPackagerModal
        isOpen={showPackagerModal}
        onClose={() => setShowPackagerModal(false)}
      />

      <AddAccountModal
        isOpen={showAddAccountModal}
        onClose={() => setShowAddAccountModal(false)}
        onAddAccount={(newAcc) => {
          handleAddAccount(newAcc);
          setActiveAccountId(newAcc.id);
        }}
      />

      <ProductionDeploymentModal
        isOpen={showProductionModal}
        onClose={() => setShowProductionModal(false)}
        accounts={accounts}
        activeAccountId={activeAccountId}
      />
    </div>
  );
}
