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

  // Simulate Buyer Inbound Message (runs auto-reply engine & auto delivery check!)
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
              lastMessage: text,
              lastMessageTime: new Date().toLocaleTimeString().slice(0, 5),
            }
          : c
      )
    );

    // If global bot active and conversation auto reply enabled
    if (globalBotActive && conv.isAutoReplyActive) {
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
              return new RegExp(pat, 'i').test(text);
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
        const delaySeconds = Math.max(
          1,
          Math.floor(
            Math.random() * (matchedRule.randomDelayMax - matchedRule.randomDelayMin) +
              matchedRule.randomDelayMin
          )
        );

        // Dynamic slot replace
        const replyText = matchedRule.replyContent
          .replace(/{buyer_name}/g, conv.buyerNickname)
          .replace(/{item_title}/g, conv.currentTrade?.itemTitle || '闲鱼商品')
          .replace(/{order_id}/g, conv.currentTrade?.orderId || 'TB' + Date.now())
          .replace(/{time}/g, new Date().toLocaleTimeString());

        setTimeout(() => {
          const autoMsg: ChatMessage = {
            id: `automsg_${Date.now()}`,
            conversationId,
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
            [conversationId]: [...(prev[conversationId] || []), autoMsg],
          }));

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
    }
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
    </div>
  );
}
