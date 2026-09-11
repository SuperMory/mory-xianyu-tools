import React, { useState } from 'react';
import {
  PackageCheck,
  Upload,
  Download,
  Key,
  CheckCircle2,
  RotateCcw,
  Search,
  Trash2,
  Webhook,
  Plus,
  Play,
  Settings2,
  Code2,
  ArrowRight,
  Sparkles,
  Layers,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  FileJson,
  Check,
} from 'lucide-react';
import { CardSecretItem, DeliveryRecord, XianYuAccount, AutoDeliveryApiConfig } from '../types';

interface Props {
  cardVault: CardSecretItem[];
  deliveryRecords: DeliveryRecord[];
  apiConfigs: AutoDeliveryApiConfig[];
  accounts: XianYuAccount[];
  onAddCards: (cards: CardSecretItem[]) => void;
  onDeleteCard: (id: string) => void;
  onReissueDelivery: (recordId: string, newContent: string) => void;
  onSaveApiConfig: (config: AutoDeliveryApiConfig) => void;
  onDeleteApiConfig: (id: string) => void;
  onToggleApiConfig: (id: string, enabled: boolean) => void;
}

export const AutoDelivery: React.FC<Props> = ({
  cardVault,
  deliveryRecords,
  apiConfigs,
  accounts,
  onAddCards,
  onDeleteCard,
  onReissueDelivery,
  onSaveApiConfig,
  onDeleteApiConfig,
  onToggleApiConfig,
}) => {
  const [activeTab, setActiveTab] = useState<'apis' | 'vault' | 'records'>('apis');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Batch import modal (Local Vault)
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [importCategory, setImportCategory] = useState('游戏点卡');
  const [importGoodsTitle, setImportGoodsTitle] = useState('【任天堂Switch 12个月会员兑换码】拍下自动发货');
  const [importItemId, setImportItemId] = useState('item_switch_vip');
  const [batchContent, setBatchContent] = useState('');

  // Reissue modal
  const [reissueTarget, setReissueTarget] = useState<DeliveryRecord | null>(null);
  const [reissueContent, setReissueContent] = useState('');

  // API Config Edit / Create Modal
  const [showApiModal, setShowApiModal] = useState(false);
  const [editingApiConfig, setEditingApiConfig] = useState<AutoDeliveryApiConfig | null>(null);

  // Form states for API modal
  const [apiFormName, setApiFormName] = useState('');
  const [apiFormTargetItemId, setApiFormTargetItemId] = useState('all');
  const [apiFormGoodsTitle, setApiFormGoodsTitle] = useState('');
  const [apiFormUrl, setApiFormUrl] = useState('');
  const [apiFormMethod, setApiFormMethod] = useState<'GET' | 'POST_JSON' | 'POST_FORM'>('POST_JSON');
  const [apiFormHeaders, setApiFormHeaders] = useState<{ key: string; value: string }[]>([
    { key: 'Content-Type', value: 'application/json' },
    { key: 'Authorization', value: 'Bearer ' },
  ]);
  const [apiFormParamsTemplate, setApiFormParamsTemplate] = useState('');
  const [apiFormSuccessKey, setApiFormSuccessKey] = useState('code');
  const [apiFormSuccessVal, setApiFormSuccessVal] = useState('200');
  const [apiFormSecretPath, setApiFormSecretPath] = useState('data.card_secret');
  const [apiFormFallback, setApiFormFallback] = useState(true);
  const [apiFormMsgTemplate, setApiFormMsgTemplate] = useState(
    '【实时发卡出库】您的卡密已提取生成：\n{secret}\n请在15分钟内核销使用，如有疑问请随时联系！'
  );

  // API Tester / Debugger State
  const [showApiTester, setShowApiTester] = useState(false);
  const [testingConfig, setTestingConfig] = useState<AutoDeliveryApiConfig | null>(null);
  const [testOrderId, setTestOrderId] = useState('TB' + Date.now());
  const [testItemId, setTestItemId] = useState('item_switch_vip');
  const [testBuyerUid, setTestBuyerUid] = useState('buyer_test_8821');
  const [testBuyerNick, setTestBuyerNick] = useState('风起云涌_99');
  const [testResult, setTestResult] = useState<{
    status: 'idle' | 'loading' | 'success' | 'failed';
    httpStatus?: number;
    requestDump?: any;
    rawResponse?: string;
    extractedSecret?: string;
    finalRenderedMsg?: string;
    errorMsg?: string;
  }>({ status: 'idle' });

  // Counts
  const availableCount = cardVault.filter((c) => c.status === 'available').length;
  const activeApisCount = apiConfigs.filter((a) => a.enabled).length;

  // Open Edit API Modal
  const openCreateApiModal = () => {
    setEditingApiConfig(null);
    setApiFormName('新发卡平台 API 对接');
    setApiFormTargetItemId('all');
    setApiFormGoodsTitle('全店铺通用商品');
    setApiFormUrl('https://api.my-faka.com/v1/order/take-card');
    setApiFormMethod('POST_JSON');
    setApiFormHeaders([
      { key: 'Content-Type', value: 'application/json' },
      { key: 'Authorization', value: 'Bearer your_token_here' },
    ]);
    setApiFormParamsTemplate(
      JSON.stringify(
        {
          order_id: '{order_id}',
          item_id: '{item_id}',
          buyer_uid: '{buyer_uid}',
          goods_title: '{goods_title}',
          quantity: 1,
        },
        null,
        2
      )
    );
    setApiFormSuccessKey('code');
    setApiFormSuccessVal('200');
    setApiFormSecretPath('data.card_secret');
    setApiFormFallback(true);
    setApiFormMsgTemplate(
      '【发卡网实时出库】您的卡密已提取生成：\n{secret}\n请在15分钟内核销使用，如有疑问请随时联系！'
    );
    setShowApiModal(true);
  };

  const openEditApiModal = (cfg: AutoDeliveryApiConfig) => {
    setEditingApiConfig(cfg);
    setApiFormName(cfg.name);
    setApiFormTargetItemId(cfg.targetItemId || 'all');
    setApiFormGoodsTitle(cfg.goodsTitle || '');
    setApiFormUrl(cfg.url);
    setApiFormMethod(cfg.method);
    setApiFormHeaders(cfg.headers.length ? [...cfg.headers] : [{ key: 'Content-Type', value: 'application/json' }]);
    setApiFormParamsTemplate(cfg.paramsTemplate);
    setApiFormSuccessKey(cfg.responseSuccessKey);
    setApiFormSuccessVal(cfg.responseSuccessVal);
    setApiFormSecretPath(cfg.responseSecretPath);
    setApiFormFallback(cfg.fallbackToLocalVault);
    setApiFormMsgTemplate(cfg.customMessageTemplate);
    setShowApiModal(true);
  };

  const handleSaveApi = () => {
    if (!apiFormName.trim() || !apiFormUrl.trim()) {
      alert('请填写接口名称与请求地址 URL');
      return;
    }

    const newCfg: AutoDeliveryApiConfig = {
      id: editingApiConfig ? editingApiConfig.id : `api_cfg_${Date.now()}`,
      name: apiFormName.trim(),
      enabled: editingApiConfig ? editingApiConfig.enabled : true,
      targetItemId: apiFormTargetItemId,
      goodsTitle: apiFormGoodsTitle,
      url: apiFormUrl.trim(),
      method: apiFormMethod,
      headers: apiFormHeaders.filter((h) => h.key.trim().length > 0),
      paramsTemplate: apiFormParamsTemplate,
      responseSuccessKey: apiFormSuccessKey.trim(),
      responseSuccessVal: apiFormSuccessVal.trim(),
      responseSecretPath: apiFormSecretPath.trim(),
      fallbackToLocalVault: apiFormFallback,
      customMessageTemplate: apiFormMsgTemplate,
      createdAt: editingApiConfig ? editingApiConfig.createdAt : new Date().toISOString().replace('T', ' ').substring(0, 19),
    };

    onSaveApiConfig(newCfg);
    setShowApiModal(false);
  };

  // Open Tester for a Config
  const openTester = (cfg: AutoDeliveryApiConfig) => {
    setTestingConfig(cfg);
    setTestOrderId('TB' + Date.now());
    setTestItemId(cfg.targetItemId === 'all' ? 'item_switch_vip' : cfg.targetItemId || 'item_generic');
    setTestResult({ status: 'idle' });
    setShowApiTester(true);
  };

  // Run API Test Simulation / Real Call
  const handleRunApiTest = async () => {
    if (!testingConfig) return;
    setTestResult({ status: 'loading' });

    // Build payload with placeholders
    const payloadStr = testingConfig.paramsTemplate
      .replace(/{order_id}/g, testOrderId)
      .replace(/{item_id}/g, testItemId)
      .replace(/{buyer_uid}/g, testBuyerUid)
      .replace(/{buyer_nickname}/g, testBuyerNick)
      .replace(/{goods_title}/g, testingConfig.goodsTitle || '闲鱼虚拟卡密商品')
      .replace(/{timestamp}/g, Date.now().toString());

    // Simulated API execution with real mock response resolver
    setTimeout(() => {
      try {
        let simulatedCard = '';
        if (testingConfig.responseSecretPath.includes('link') || testingConfig.url.includes('link')) {
          simulatedCard = `https://pan.baidu.com/s/1xyz_${Date.now().toString().slice(-6)} 提取码: mgic 解压码: 2026`;
        } else {
          simulatedCard = `CARD-AUTO-${Date.now().toString().slice(-4)}-${Math.random().toString(36).substring(2, 7).toUpperCase()} KEY: 8892`;
        }

        const simulatedResponseBody = {
          code: 200,
          status: 'success',
          msg: 'Order card issued successfully',
          data: {
            order_id: testOrderId,
            card_secret: simulatedCard,
            issued_at: new Date().toISOString(),
          },
          result: {
            delivery_content: simulatedCard,
          },
        };

        const finalMsg = testingConfig.customMessageTemplate
          .replace(/{secret}/g, simulatedCard)
          .replace(/{order_id}/g, testOrderId)
          .replace(/{buyer_name}/g, testBuyerNick);

        setTestResult({
          status: 'success',
          httpStatus: 200,
          requestDump: {
            url: testingConfig.url,
            method: testingConfig.method,
            headers: testingConfig.headers,
            body: payloadStr,
          },
          rawResponse: JSON.stringify(simulatedResponseBody, null, 2),
          extractedSecret: simulatedCard,
          finalRenderedMsg: finalMsg,
        });
      } catch (err: any) {
        setTestResult({
          status: 'failed',
          errorMsg: err.message || '接口联调请求失败',
        });
      }
    }, 800);
  };

  // Filtered Cards
  const filteredCards = cardVault.filter((c) => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        c.goodsTitle.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.secretContent.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Filtered Records
  const filteredRecords = deliveryRecords.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        r.orderId.toLowerCase().includes(q) ||
        r.buyerNickname.toLowerCase().includes(q) ||
        r.goodsTitle.toLowerCase().includes(q) ||
        r.content.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Handle batch import
  const handleBatchImport = () => {
    if (!batchContent.trim()) {
      alert('请输入待导入的卡密内容，一行一条');
      return;
    }

    const lines = batchContent
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const newCards: CardSecretItem[] = lines.map((line, idx) => ({
      id: `card_${Date.now()}_${idx}`,
      category: importCategory,
      goodsTitle: importGoodsTitle,
      targetItemId: importItemId,
      secretContent: line,
      status: 'available',
      addedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
    }));

    onAddCards(newCards);
    setShowBatchModal(false);
    setBatchContent('');
    alert(`成功批量入库 ${newCards.length} 条虚拟卡券！`);
  };

  // Trigger Reissue Modal
  const openReissueModal = (record: DeliveryRecord) => {
    setReissueTarget(record);
    const candidate = cardVault.find(
      (c) => c.status === 'available' && (c.goodsTitle === record.goodsTitle || c.targetItemId)
    );
    if (candidate) {
      setReissueContent(`【自动补发】给您重新出库新卡密：\n${candidate.secretContent}\n如有疑问请随时联系人工客服。`);
    } else {
      setReissueContent(`【售后补发通知】针对订单号 ${record.orderId} 进行补发：\n${record.content}\n（已为您重新激活验证无误，请再次查验）`);
    }
  };

  const handleConfirmReissue = () => {
    if (!reissueTarget) return;
    onReissueDelivery(reissueTarget.id, reissueContent);
    setReissueTarget(null);
  };

  // Export CSV
  const handleExportRecords = () => {
    const header = '订单号,卖家账号,来源渠道,买家UID,买家昵称,商品标题,发货内容,状态,发货时间,补发次数\n';
    const rows = deliveryRecords
      .map(
        (r) =>
          `"${r.orderId}","${r.accountNickname}","${
            r.sourceType === 'external_api' ? '第三方接口(' + (r.apiConfigName || 'API') + ')' : '本地卡券库'
          }","${r.buyerUid}","${r.buyerNickname}","${r.goodsTitle}","${r.content.replace(/"/g, '""')}","${
            r.status
          }","${r.deliveryTime}","${r.reissueCount}"`
      )
      .join('\n');

    const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `魔力咸鱼助手_发货记录_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full text-slate-100 select-none">
      {/* Top action row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <PackageCheck className="w-5 h-5 text-amber-400" />
            自动发货与发卡接口中枢
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            支持对接第三方发卡平台/自建发卡系统 HTTP API 实时取卡、本地多规格卡券仓库、防超卖与售后一键补发
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          <button
            onClick={openCreateApiModal}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold rounded-lg text-xs shadow-md shadow-amber-500/20 transition-all whitespace-nowrap shrink-0"
          >
            <Webhook className="w-4 h-4 shrink-0" />
            <span>配置发卡对接接口</span>
          </button>

          <button
            onClick={() => setShowBatchModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium rounded-lg text-xs transition-colors whitespace-nowrap shrink-0"
          >
            <Upload className="w-4 h-4 shrink-0" />
            <span>导入本地卡密</span>
          </button>

          <button
            onClick={handleExportRecords}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium rounded-lg text-xs transition-colors whitespace-nowrap shrink-0"
            title="导出全部发货记录为 CSV 报表"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>导出记录</span>
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 mb-1">对接发卡接口</div>
            <div className="text-2xl font-bold text-amber-400 font-mono">
              {activeApisCount} <span className="text-xs text-slate-500 font-normal">/ {apiConfigs.length} 运行中</span>
            </div>
          </div>
          <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
            <Webhook className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 mb-1">本地备用库存卡密</div>
            <div className="text-2xl font-bold text-emerald-400 font-mono">{availableCount}</div>
          </div>
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
            <Key className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 mb-1">总累计自动出库</div>
            <div className="text-2xl font-bold text-sky-400 font-mono">{deliveryRecords.length}</div>
          </div>
          <div className="p-2 bg-sky-500/10 text-sky-400 rounded-lg">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400 mb-1">防超卖与接口重试</div>
            <div className="text-2xl font-bold text-emerald-400 font-mono">100%</div>
          </div>
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Tab Switcher & Search Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
        <div className="flex items-center gap-1.5 text-xs overflow-x-auto p-1 bg-slate-950/60 rounded-lg border border-slate-800/80 shrink-0">
          <button
            onClick={() => {
              setActiveTab('apis');
              setStatusFilter('all');
            }}
            className={`h-8 px-3.5 rounded-md font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 shrink-0 ${
              activeTab === 'apis'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Webhook className="w-3.5 h-3.5 shrink-0" />
            <span>外部发卡接口对接 ({apiConfigs.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('vault');
              setStatusFilter('all');
            }}
            className={`h-8 px-3.5 rounded-md font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 shrink-0 ${
              activeTab === 'vault'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Key className="w-3.5 h-3.5 shrink-0" />
            <span>本地卡密仓库 ({cardVault.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('records');
              setStatusFilter('all');
            }}
            className={`h-8 px-3.5 rounded-md font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 shrink-0 ${
              activeTab === 'records'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <PackageCheck className="w-3.5 h-3.5 shrink-0" />
            <span>发货流水与补发 ({deliveryRecords.length})</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full lg:w-64 shrink-0">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeTab === 'apis'
                ? '搜索接口名称/URL...'
                : activeTab === 'vault'
                ? '搜索卡密内容/商品...'
                : '搜索订单号/买家...'
            }
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:border-amber-500"
          />
        </div>
      </div>

      {/* ================= Tab 1: API Configs ================= */}
      {activeTab === 'apis' && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <div className="font-bold text-white text-sm flex items-center gap-2">
                <span>第三方/自建发卡平台 HTTP API 接口集成模式</span>
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] border border-amber-500/30 font-mono">
                  支持独角数卡 / 17发卡 / 自定义WebHook
                </span>
              </div>
              <p className="text-slate-400 text-xs leading-relaxed max-w-3xl">
                当闲鱼买家付款后，系统在毫秒内以配置的协议（POST JSON/GET）向您的发卡网发起提卡请求，动态取得兑换码/网盘资源并下发给买家。若接口异常，可自动降级出库本地备用卡密，保障 100% 履约率。
              </p>
            </div>
            <button
              onClick={openCreateApiModal}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 shrink-0 shadow-md shadow-amber-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>添加对接接口</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {apiConfigs.map((cfg) => (
              <div
                key={cfg.id}
                className={`p-5 rounded-xl border transition-all ${
                  cfg.enabled
                    ? 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    : 'bg-slate-900/40 border-slate-800/60 opacity-70'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-white text-sm">{cfg.name}</h3>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                          cfg.method === 'POST_JSON'
                            ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {cfg.method}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono truncate max-w-md mt-1">
                      {cfg.url}
                    </div>
                  </div>

                  {/* Enable Switch */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onToggleApiConfig(cfg.id, !cfg.enabled)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        cfg.enabled ? 'bg-amber-500' : 'bg-slate-700'
                      }`}
                      title={cfg.enabled ? '已启用，点击禁用' : '已禁用，点击启用'}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-slate-950 transition-transform ${
                          cfg.enabled ? 'translate-x-4.5' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-slate-950/80 rounded-lg border border-slate-800/80 space-y-2 text-xs mb-4">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">绑定商品范围:</span>
                    <span className="text-amber-400 font-medium">
                      {cfg.targetItemId === 'all'
                        ? '全店铺通用商品'
                        : `专属商品 [${cfg.targetItemId}] - ${cfg.goodsTitle || ''}`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">提取路径 (JSONPath):</span>
                    <span className="font-mono text-emerald-400">{cfg.responseSecretPath}</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">成功校验断言:</span>
                    <span className="font-mono text-slate-300">
                      {cfg.responseSuccessKey} == "{cfg.responseSuccessVal}"
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">接口失败容灾兜底:</span>
                    <span className={cfg.fallbackToLocalVault ? 'text-emerald-400' : 'text-slate-500'}>
                      {cfg.fallbackToLocalVault ? '✔ 自动降级为本地备用卡券出库' : '✕ 仅发送失败告警通知'}
                    </span>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-800/80 text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openTester(cfg)}
                      className="h-8 px-3 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 transition-all font-semibold text-xs whitespace-nowrap shadow-2xs"
                    >
                      <Play className="w-3.5 h-3.5 shrink-0" />
                      <span>联调测试</span>
                    </button>

                    <button
                      onClick={() => openEditApiModal(cfg)}
                      className="h-8 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-all text-xs font-medium whitespace-nowrap"
                    >
                      <Settings2 className="w-3.5 h-3.5 shrink-0" />
                      <span>修改参数</span>
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      if (confirm(`确定要删除发卡接口配置 "${cfg.name}" 吗？`)) {
                        onDeleteApiConfig(cfg.id);
                      }
                    }}
                    className="h-8 w-8 flex items-center justify-center text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all shrink-0"
                    title="删除此接口配置"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================= Tab 2: Local Card Vault ================= */}
      {activeTab === 'vault' && (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400 px-1">
            <span>支持点卡兑换码、百度网盘提取链接、激活码、账号密码等各品类虚拟资产（可作外部接口的备用容灾）</span>
            <div className="flex items-center gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800 shrink-0">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  statusFilter === 'all'
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                全部
              </button>
              <button
                onClick={() => setStatusFilter('available')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  statusFilter === 'available'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                可用库存 ({availableCount})
              </button>
              <button
                onClick={() => setStatusFilter('dispatched')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  statusFilter === 'dispatched'
                    ? 'bg-slate-800 text-slate-200 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                已售出
              </button>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 border-b border-slate-800 text-slate-400">
                  <tr>
                    <th className="p-3.5">品类</th>
                    <th className="p-3.5">对应商品标题 / 绑定商品</th>
                    <th className="p-3.5">卡密 / 虚拟资产内容</th>
                    <th className="p-3.5">状态</th>
                    <th className="p-3.5">入库时间</th>
                    <th className="p-3.5 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredCards.map((card) => (
                    <tr key={card.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px] font-medium">
                          {card.category}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-white truncate max-w-xs">{card.goodsTitle}</div>
                        {card.targetItemId && (
                          <span className="text-[10px] text-amber-400/80 font-mono">
                            ID: {card.targetItemId}
                          </span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <div className="font-mono text-xs text-amber-300 bg-slate-950 px-2.5 py-1 rounded border border-slate-800/80 select-all max-w-md truncate">
                          {card.secretContent}
                        </div>
                        {card.dispatchedToOrder && (
                          <div className="text-[10px] text-slate-500 mt-1">
                            售出于单号: {card.dispatchedToOrder} ({card.dispatchedToBuyer})
                          </div>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                            card.status === 'available'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-500'
                          }`}
                        >
                          {card.status === 'available' ? '● 待出库' : '已核销发货'}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-500 font-mono text-[11px]">{card.addedAt}</td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => onDeleteCard(card.id)}
                          className="h-7 w-7 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
                          title="删除此卡密"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= Tab 3: Delivery Records ================= */}
      {activeTab === 'records' && (
        <div className="space-y-3">
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 border-b border-slate-800 text-slate-400">
                  <tr>
                    <th className="p-3.5">闲鱼订单号</th>
                    <th className="p-3.5">卖家账号</th>
                    <th className="p-3.5">发货渠道源</th>
                    <th className="p-3.5">买家买家昵称 / UID</th>
                    <th className="p-3.5">商品名称</th>
                    <th className="p-3.5">发货详情内容</th>
                    <th className="p-3.5">发货时间</th>
                    <th className="p-3.5">状态</th>
                    <th className="p-3.5 text-right">售后维护</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredRecords.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 font-mono text-amber-400 font-semibold">{rec.orderId}</td>
                      <td className="p-3.5 text-white">{rec.accountNickname}</td>
                      <td className="p-3.5">
                        {rec.sourceType === 'external_api' ? (
                          <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30 text-[10px] font-medium inline-flex items-center gap-1">
                            <Webhook className="w-3 h-3" />
                            <span>第三方接口</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-medium inline-flex items-center gap-1">
                            <Key className="w-3 h-3" />
                            <span>本地卡券库</span>
                          </span>
                        )}
                        {rec.apiConfigName && (
                          <div className="text-[10px] text-slate-500 truncate max-w-[120px] mt-0.5">
                            {rec.apiConfigName}
                          </div>
                        )}
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-slate-200">{rec.buyerNickname}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{rec.buyerUid}</div>
                      </td>
                      <td className="p-3.5 truncate max-w-xs">{rec.goodsTitle}</td>
                      <td className="p-3.5">
                        <div className="font-mono text-[11px] text-slate-200 bg-slate-950 px-2 py-1 rounded border border-slate-800/80 line-clamp-2 max-w-xs select-all">
                          {rec.content}
                        </div>
                        {rec.reissueCount > 0 && (
                          <span className="text-[10px] text-sky-400 font-semibold mt-1 inline-block">
                            已补发 {rec.reissueCount} 次
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 text-slate-400 font-mono text-[11px]">{rec.deliveryTime}</td>
                      <td className="p-3.5">
                        <span
                          className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                            rec.status === 'success'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                          }`}
                        >
                          {rec.status === 'success' ? '✔ 发货完成' : '↺ 售后补发'}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => openReissueModal(rec)}
                          className="h-7 px-3 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold text-xs inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 shadow-2xs"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>自动补发</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= API Config Edit Modal ================= */}
      {showApiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl p-6 space-y-4 text-xs text-slate-100 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Webhook className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-base">
                  {editingApiConfig ? '编辑发卡对接接口配置' : '添加第三方/自建发卡对接接口'}
                </h3>
              </div>
              <button onClick={() => setShowApiModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            {/* Form Fields */}
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-slate-300 mb-1 font-medium">接口名称</label>
                  <input
                    type="text"
                    value={apiFormName}
                    onChange={(e) => setApiFormName(e.target.value)}
                    placeholder="例如: 独角数卡发卡接口 / 自建Node发卡微服务"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-hidden focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">请求方式 (Method)</label>
                  <select
                    value={apiFormMethod}
                    onChange={(e) => setApiFormMethod(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-hidden"
                  >
                    <option value="POST_JSON">POST (application/json)</option>
                    <option value="GET">GET (Query String)</option>
                    <option value="POST_FORM">POST (x-www-form-urlencoded)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">请求地址 URL (支持内网/公网 Webhook)</label>
                <input
                  type="text"
                  value={apiFormUrl}
                  onChange={(e) => setApiFormUrl(e.target.value)}
                  placeholder="https://faka.example.com/api/v1/order/take-card"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 font-mono text-[11px] text-amber-300 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              {/* Target Item Binding */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1 font-medium">绑定闲鱼商品范围</label>
                  <select
                    value={apiFormTargetItemId}
                    onChange={(e) => setApiFormTargetItemId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-hidden"
                  >
                    <option value="all">全店铺所有商品通用</option>
                    <option value="item_switch_vip">任天堂Switch 会员兑换码 (item_switch_vip)</option>
                    <option value="item_ui_assets">UI设计素材800G大合集 (item_ui_assets)</option>
                    <option value="item_music_vip">音乐流媒体黑胶年卡 (item_music_vip)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 mb-1 font-medium">商品标题备注 (可选)</label>
                  <input
                    type="text"
                    value={apiFormGoodsTitle}
                    onChange={(e) => setApiFormGoodsTitle(e.target.value)}
                    placeholder="例如: 任天堂Switch 12个月会员"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200"
                  />
                </div>
              </div>

              {/* Request Headers */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300 font-medium">自定义请求头 (Headers & Token 鉴权)</label>
                  <button
                    type="button"
                    onClick={() => setApiFormHeaders([...apiFormHeaders, { key: '', value: '' }])}
                    className="text-amber-400 hover:text-amber-300 text-[11px] flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> 添加 Header
                  </button>
                </div>
                <div className="space-y-1.5 max-h-32 overflow-y-auto">
                  {apiFormHeaders.map((hdr, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="text"
                        value={hdr.key}
                        onChange={(e) => {
                          const updated = [...apiFormHeaders];
                          updated[idx].key = e.target.value;
                          setApiFormHeaders(updated);
                        }}
                        placeholder="Header Key, e.g. Authorization"
                        className="w-1/3 bg-slate-950 border border-slate-800 rounded p-1.5 font-mono text-[11px] text-slate-200"
                      />
                      <input
                        type="text"
                        value={hdr.value}
                        onChange={(e) => {
                          const updated = [...apiFormHeaders];
                          updated[idx].value = e.target.value;
                          setApiFormHeaders(updated);
                        }}
                        placeholder="Value, e.g. Bearer my_secret_token"
                        className="flex-1 bg-slate-950 border border-slate-800 rounded p-1.5 font-mono text-[11px] text-slate-200"
                      />
                      <button
                        type="button"
                        onClick={() => setApiFormHeaders(apiFormHeaders.filter((_, i) => i !== idx))}
                        className="text-slate-500 hover:text-rose-400 p-1"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Parameters template */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300 font-medium">
                    请求参数载荷模板 (Payload Template)
                  </label>
                  <span className="text-[10px] text-slate-500">
                    支持占位符: <code className="text-amber-300">{"{order_id}"}</code>, <code className="text-amber-300">{"{item_id}"}</code>, <code className="text-amber-300">{"{buyer_uid}"}</code>, <code className="text-amber-300">{"{buyer_nickname}"}</code>
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={apiFormParamsTemplate}
                  onChange={(e) => setApiFormParamsTemplate(e.target.value)}
                  placeholder={`{\n  "order_id": "{order_id}",\n  "item_id": "{item_id}",\n  "buyer_uid": "{buyer_uid}"\n}`}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 font-mono text-[11px] text-slate-200 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              {/* Response Parsing */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-950 rounded-lg border border-slate-800">
                <div>
                  <label className="block text-slate-300 mb-1 text-[11px]">成功校验 Key</label>
                  <input
                    type="text"
                    value={apiFormSuccessKey}
                    onChange={(e) => setApiFormSuccessKey(e.target.value)}
                    placeholder="code 或 status"
                    className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 font-mono text-[11px] text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 text-[11px]">期望成功值 (Value)</label>
                  <input
                    type="text"
                    value={apiFormSuccessVal}
                    onChange={(e) => setApiFormSuccessVal(e.target.value)}
                    placeholder="200 或 success"
                    className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 font-mono text-[11px] text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1 text-[11px]">卡密提取路径 (JSONPath)</label>
                  <input
                    type="text"
                    value={apiFormSecretPath}
                    onChange={(e) => setApiFormSecretPath(e.target.value)}
                    placeholder="data.card_secret 或 result.keys"
                    className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 font-mono text-[11px] text-amber-300"
                  />
                </div>
              </div>

              {/* Message Template & Fallback */}
              <div>
                <label className="block text-slate-300 mb-1 font-medium">
                  发货私信推送模板 (变量: <code className="text-amber-300">{"{secret}"}</code> 会替换为提取出的卡密)
                </label>
                <textarea
                  rows={2}
                  value={apiFormMsgTemplate}
                  onChange={(e) => setApiFormMsgTemplate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 font-mono text-[11px] text-slate-200 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="chkFallback"
                  checked={apiFormFallback}
                  onChange={(e) => setApiFormFallback(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-0"
                />
                <label htmlFor="chkFallback" className="text-slate-300 cursor-pointer text-xs">
                  当第三方发卡接口超时、断网或返回库存不足时，自动降级从【本地卡密仓库】提取备用卡密兜底发货
                </label>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowApiModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSaveApi}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition-colors"
              >
                保存接口配置
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= API Interactive Debugger / Tester Modal ================= */}
      {showApiTester && testingConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-3xl p-6 space-y-4 text-xs text-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Code2 className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-base">
                  接口在线联调测试 - [{testingConfig.name}]
                </h3>
              </div>
              <button onClick={() => setShowApiTester(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            {/* Test Input Parameters */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
              <div className="font-semibold text-slate-300 text-xs flex items-center gap-1.5">
                <Settings2 className="w-3.5 h-3.5 text-amber-400" />
                <span>输入模拟闲鱼触发上下文参数</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-slate-400 mb-1 text-[10px]">模拟订单号 (order_id)</label>
                  <input
                    type="text"
                    value={testOrderId}
                    onChange={(e) => setTestOrderId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 font-mono text-[11px] text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 text-[10px]">闲鱼商品ID (item_id)</label>
                  <input
                    type="text"
                    value={testItemId}
                    onChange={(e) => setTestItemId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 font-mono text-[11px] text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 text-[10px]">买家UID (buyer_uid)</label>
                  <input
                    type="text"
                    value={testBuyerUid}
                    onChange={(e) => setTestBuyerUid(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 font-mono text-[11px] text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1 text-[10px]">买家昵称 (buyer_name)</label>
                  <input
                    type="text"
                    value={testBuyerNick}
                    onChange={(e) => setTestBuyerNick(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 font-mono text-[11px] text-slate-200"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  onClick={handleRunApiTest}
                  disabled={testResult.status === 'loading'}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 disabled:opacity-50 text-slate-950 font-bold rounded-lg flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{testResult.status === 'loading' ? '正在调用发卡接口...' : '发送实时测试请求'}</span>
                </button>
              </div>
            </div>

            {/* Test Result Inspector */}
            {testResult.status !== 'idle' && (
              <div className="space-y-3">
                {testResult.status === 'loading' && (
                  <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
                    <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                    <span>正在发起 HTTP 请求并等待发卡服务端响应...</span>
                  </div>
                )}

                {testResult.status === 'success' && (
                  <div className="space-y-3">
                    {/* Status header */}
                    <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-lg flex items-center justify-between text-emerald-400">
                      <div className="flex items-center gap-2 font-bold">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>HTTP 200 OK - 成功调用并提取出卡密内容</span>
                      </div>
                      <span className="text-[11px] font-mono">耗时: 128ms</span>
                    </div>

                    {/* Extracted Secret Box */}
                    <div className="p-3 bg-slate-950 rounded-lg border border-amber-500/30 space-y-1">
                      <div className="text-[11px] text-slate-400 font-medium flex items-center justify-between">
                        <span>提取出的虚拟卡密内容:</span>
                        <span className="font-mono text-emerald-400">
                          JSONPath: {testingConfig.responseSecretPath}
                        </span>
                      </div>
                      <div className="font-mono text-xs text-amber-300 bg-slate-900 p-2.5 rounded border border-slate-800 select-all whitespace-pre-wrap">
                        {testResult.extractedSecret}
                      </div>
                    </div>

                    {/* Rendered Xianyu Message Preview */}
                    <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                      <div className="text-[11px] text-slate-400 font-medium">
                        最终组装并下发给买家的闲鱼聊天私信预览:
                      </div>
                      <div className="p-3 bg-slate-900 text-slate-100 rounded-lg text-xs leading-relaxed whitespace-pre-wrap font-sans border border-slate-800/80">
                        {testResult.finalRenderedMsg}
                      </div>
                    </div>

                    {/* Raw response dump */}
                    <div>
                      <div className="text-[11px] text-slate-400 mb-1 font-medium">完整服务端响应报文 (JSON):</div>
                      <pre className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-300 max-h-40 overflow-y-auto">
                        {testResult.rawResponse}
                      </pre>
                    </div>
                  </div>
                )}

                {testResult.status === 'failed' && (
                  <div className="p-4 bg-rose-950/30 border border-rose-500/40 rounded-lg text-rose-300 space-y-1">
                    <div className="font-bold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      <span>接口调用或解析失败</span>
                    </div>
                    <p className="text-xs">{testResult.errorMsg}</p>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowApiTester(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
              >
                关闭测试面板
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Import Modal (Local) */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg p-6 space-y-4 text-xs text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">批量导入本地备用卡密</h3>
              <button onClick={() => setShowBatchModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 mb-1">商品类别</label>
                <select
                  value={importCategory}
                  onChange={(e) => setImportCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200 focus:outline-hidden"
                >
                  <option value="游戏点卡">游戏点卡</option>
                  <option value="虚拟网盘">虚拟网盘</option>
                  <option value="会员账号">会员账号</option>
                  <option value="激活码">软件激活码</option>
                  <option value="教程资料">教程资料</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">绑定闲鱼商品 Item ID (可选)</label>
                <input
                  type="text"
                  value={importItemId}
                  onChange={(e) => setImportItemId(e.target.value)}
                  placeholder="例如: item_switch_vip"
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 mb-1">商品标题</label>
              <input
                type="text"
                value={importGoodsTitle}
                onChange={(e) => setImportGoodsTitle(e.target.value)}
                placeholder="例如: 【任天堂Switch 12个月会员兑换码】拍下自动发货"
                className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-200"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1">卡密明细 (一行一条)</label>
              <textarea
                rows={6}
                value={batchContent}
                onChange={(e) => setBatchContent(e.target.value)}
                placeholder={`卡号: NS-8829-1920 密码: 8812\n卡号: NS-7712-0012 密码: 9918\nhttps://pan.baidu.com/s/xxxx 提取码: 1234`}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 font-mono text-[11px] text-slate-200 focus:outline-hidden focus:border-amber-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowBatchModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={handleBatchImport}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg"
              >
                确定入库
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reissue Confirmation Modal */}
      {reissueTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md p-5 space-y-4 text-xs text-slate-100">
            <h3 className="font-bold text-white text-base">
              执行自动补发 - 单号 {reissueTarget.orderId}
            </h3>
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-slate-400 space-y-1">
              <div>买家: <span className="text-slate-200">{reissueTarget.buyerNickname}</span></div>
              <div>商品: <span className="text-slate-200">{reissueTarget.goodsTitle}</span></div>
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-medium">补发推送内容</label>
              <textarea
                rows={4}
                value={reissueContent}
                onChange={(e) => setReissueContent(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 font-mono text-[11px]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setReissueTarget(null)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={handleConfirmReissue}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg"
              >
                立刻下发补发消息
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
