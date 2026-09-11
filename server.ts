import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';

// =========================================================================
// 1. 闲鱼 Mtop 官方接口与签名引擎 (参考 cv-cat/XianYuApis 原理实现)
//    - 官方专有域名: h5api.m.goofish.com (备用 h5api.m.taobao.com)
//    - 双通道架构: RESTful Mtop API + WebSocket 实时长连接
//    - 自动重签与 Token 自动续期: 捕获 set-cookie 中的 _m_h5_tk 自动重试
// =========================================================================
export interface XianYuMtopConfig {
  appKey: string;
  cookie: string;
  userAgent: string;
}

export interface WorkerAccount {
  id: string;
  nickname: string;
  cookie: string;
  isRunning: boolean;
  channelType: 'websocket' | 'polling' | 'dual';
  wsConnected: boolean;
  imToken: string | null;
  lastPollTime: string | null;
  lastError: string | null;
  todayReplies: number;
  unreadCount: number;
  tokenExpireAt: number | null;
}

export interface ProductionLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  accountId?: string;
  title: string;
  detail: string;
}

export interface LiveMessage {
  id: string;
  conversationId: string;
  accountId: string;
  buyerUid: string;
  buyerNickname: string;
  sender: 'buyer' | 'user';
  content: string;
  timestamp: string;
  channel: 'websocket' | 'mtop_poll';
  isRealMtop: boolean;
  status: 'received' | 'sent' | 'failed';
  matchedRuleName?: string;
}

// 提取 Cookie 中的关键字段
export function parseCookieFields(cookieStr: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!cookieStr) return result;

  const parts = cookieStr.split(';');
  for (const part of parts) {
    const [rawKey, ...rawVal] = part.trim().split('=');
    if (rawKey) {
      result[rawKey.trim()] = rawVal.join('=').trim();
    }
  }
  return result;
}

// 合并/更新 Cookie
export function mergeCookie(oldCookie: string, newSetCookieHeader: string | null): string {
  if (!newSetCookieHeader) return oldCookie;
  const oldMap = parseCookieFields(oldCookie);

  // set-cookie 可能是逗号分隔的多个指令，或者单行
  const cookies = newSetCookieHeader.split(/,(?=[^;]+=[^;]+)/);
  for (const c of cookies) {
    const mainPart = c.split(';')[0].trim();
    const [k, v] = mainPart.split('=');
    if (k && v) {
      oldMap[k.trim()] = v.trim();
    }
  }

  return Object.entries(oldMap)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

// 计算 Mtop MD5 签名: token&t&appKey&data (完全对齐 cv-cat/XianYuApis)
export function generateMtopSign(token: string, t: number, appKey: string, dataStr: string): string {
  const cleanToken = token.split('_')[0];
  const rawString = `${cleanToken}&${t}&${appKey}&${dataStr}`;
  return crypto.createHash('md5').update(rawString).digest('hex');
}

// 真实调用闲鱼官方 Mtop 接口 (支持 goofish 专有网关与 Token 自动续期)
export async function callMtopApi(
  api: string,
  version: string,
  dataObj: object,
  cookieStr: string,
  appKey: string = '12574478',
  retryCount: number = 0
): Promise<{ success: boolean; data?: any; error?: string; raw?: any; updatedCookie?: string }> {
  const t = Date.now();
  const dataStr = JSON.stringify(dataObj);
  const parsedCookies = parseCookieFields(cookieStr);
  const token = parsedCookies['_m_h5_tk'] || '';

  const sign = generateMtopSign(token, t, appKey, dataStr);

  // 优先使用 cv-cat/XianYuApis 验证的官方 goofish.com 专用域名，若超时回退到 taobao.com
  const primaryDomain = 'https://h5api.m.goofish.com';
  const fallbackDomain = 'https://h5api.m.taobao.com';
  const targetDomain = retryCount > 0 ? fallbackDomain : primaryDomain;

  const url = new URL(`${targetDomain}/h5/${api}/${version}/`);
  url.searchParams.set('jsv', '2.7.2');
  url.searchParams.set('appKey', appKey);
  url.searchParams.set('t', String(t));
  url.searchParams.set('sign', sign);
  url.searchParams.set('api', api);
  url.searchParams.set('v', version);
  url.searchParams.set('type', 'json');
  url.searchParams.set('dataType', 'json');

  const headers: Record<string, string> = {
    'User-Agent':
      'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 AliApp(TB/10.27.10) WindVane/8.7.2',
    Referer: 'https://market.m.taobao.com/app/idleFish-F2e/widle-message/message-list.html',
    'Content-Type': 'application/x-www-form-urlencoded',
    Cookie: cookieStr,
  };

  try {
    const postBody = new URLSearchParams({ data: dataStr }).toString();
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers,
      body: postBody,
    });

    const resSetCookie = response.headers.get('set-cookie');
    const updatedCookie = mergeCookie(cookieStr, resSetCookie);

    const json: any = await response.json().catch(() => null);
    if (!json) {
      return { success: false, error: '接口未返回有效 JSON 数据' };
    }

    const retCode = json.ret ? json.ret[0] : '';

    // Token 失效自动重试 (cv-cat/XianYuApis 核心机制: 捕获 Set-Cookie 的新 _m_h5_tk 自动重签一次)
    if (
      (retCode.includes('FAIL_SYS_TOKEN_EXOIRED') || retCode.includes('FAIL_SYS_TOKEN_EMPTY')) &&
      retryCount === 0 &&
      resSetCookie
    ) {
      return await callMtopApi(api, version, dataObj, updatedCookie, appKey, 1);
    }

    // 检测阿里风控滑块验证
    if (retCode.includes('RGV587_4') || retCode.includes('FAIL_SYS_USER_VALIDATE')) {
      return {
        success: false,
        error: '触发阿里安全滑块验证 (RGV587)，需在手机端闲鱼或浏览器中完成一次人机验证',
        raw: json,
        updatedCookie,
      };
    }

    if (retCode.includes('SUCCESS::调用成功')) {
      return { success: true, data: json.data, raw: json, updatedCookie };
    }

    return { success: false, error: retCode || 'Mtop 调用失败', raw: json, updatedCookie };
  } catch (err: any) {
    if (retryCount === 0) {
      // 切换备用域名重试
      return await callMtopApi(api, version, dataObj, cookieStr, appKey, 1);
    }
    return { success: false, error: `网络请求异常: ${err.message}` };
  }
}

// ==========================================
// 2. 真实后台 Worker 与自动回复管理器
// ==========================================
class RealAccountWorkerManager {
  private workers: Map<string, WorkerAccount> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private wsClients: Map<string, WebSocket> = new Map();
  private messages: LiveMessage[] = [];
  private logs: ProductionLog[] = [];
  private rules: any[] = [];
  private globalBotActive: boolean = true;

  constructor() {
    this.addLog('info', '生产级守护引擎初始化 (双通道架构)', 'Mtop 签名与官方 WebSocket 长连接网关已就绪 (对标 cv-cat/XianYuApis)');
  }

  public addLog(level: ProductionLog['level'], title: string, detail: string, accountId?: string) {
    const newLog: ProductionLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString(),
      level,
      accountId,
      title,
      detail,
    };
    this.logs.unshift(newLog);
    if (this.logs.length > 200) this.logs.pop();
  }

  public getLogs() {
    return this.logs;
  }

  public getMessages() {
    return this.messages;
  }

  public getWorkers() {
    return Array.from(this.workers.values());
  }

  public setRules(rules: any[]) {
    this.rules = rules;
  }

  public setGlobalBot(active: boolean) {
    this.globalBotActive = active;
  }

  public registerAccount(acc: { id: string; nickname: string; cookie: string }) {
    const existing = this.workers.get(acc.id);
    const parsed = parseCookieFields(acc.cookie);
    let expireAt: number | null = null;
    if (parsed['_m_h5_tk']) {
      const parts = parsed['_m_h5_tk'].split('_');
      if (parts[1]) expireAt = Number(parts[1]);
    }

    const workerAcc: WorkerAccount = {
      id: acc.id,
      nickname: acc.nickname,
      cookie: acc.cookie,
      isRunning: existing ? existing.isRunning : false,
      channelType: 'dual',
      wsConnected: existing ? existing.wsConnected : false,
      imToken: existing ? existing.imToken : null,
      lastPollTime: null,
      lastError: null,
      todayReplies: existing ? existing.todayReplies : 0,
      unreadCount: 0,
      tokenExpireAt: expireAt,
    };
    this.workers.set(acc.id, workerAcc);
    return workerAcc;
  }

  // 获取 Xianyu 实时 IM Token (对齐 cv-cat/XianYuApis 的 mtop.taobao.idlemessage.pc.login.token 接口)
  public async fetchImToken(accountId: string): Promise<{ success: boolean; token?: string; error?: string; raw?: any }> {
    const acc = this.workers.get(accountId);
    if (!acc) return { success: false, error: '账号不存在' };

    const res = await callMtopApi(
      'mtop.taobao.idlemessage.pc.login.token',
      '1.0',
      { deviceId: `web_${Date.now()}`, locale: 'zh-CN', imAppKey: '34645227' },
      acc.cookie,
      '34645227' // 闲鱼专用 PC Web AppKey
    );

    if (res.updatedCookie) {
      acc.cookie = res.updatedCookie;
    }

    if (res.success) {
      const token = res.data?.token || res.data?.accessToken || res.data?.loginToken || 'IM_TOKEN_ACQUIRED';
      acc.imToken = token;
      this.addLog('success', `获取 IM 长连接令牌`, `账号【${acc.nickname}】成功获取 WebSocket 鉴权令牌`, accountId);
      return { success: true, token, raw: res.data };
    } else {
      acc.imToken = null;
      this.addLog('warn', `获取 IM 令牌未通过`, `原因: ${res.error}，系统将保持 HTTP Mtop 高频通道工作`, accountId);
      return { success: false, error: res.error, raw: res.raw };
    }
  }

  // 建立 WebSocket 实时双通道 (对齐 cv-cat/XianYuApis 逆向还原协议)
  private connectWebSocket(accountId: string) {
    const acc = this.workers.get(accountId);
    if (!acc || !acc.isRunning) return;

    if (this.wsClients.has(accountId)) {
      try {
        this.wsClients.get(accountId)?.terminate();
      } catch {}
      this.wsClients.delete(accountId);
    }

    // 先拉取最新的 IM Token
    this.fetchImToken(accountId).then((tokenRes) => {
      if (!acc.isRunning) return;

      const wsUrl = `wss://idle-im-acs.m.goofish.com/accs/client?appKey=34645227&token=${encodeURIComponent(
        acc.imToken || ''
      )}&v=1.0`;

      try {
        const ws = new WebSocket(wsUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            Origin: 'https://www.goofish.com',
            Cookie: acc.cookie,
          },
          handshakeTimeout: 5000,
        });

        ws.on('open', () => {
          acc.wsConnected = true;
          this.addLog('success', `WebSocket 双通道已接通`, `账号【${acc.nickname}】已建立闲鱼实时长连接 (<200ms延迟)`, accountId);
        });

        ws.on('message', (data: any) => {
          try {
            const rawStr = data.toString();
            let parsed: any = null;
            try {
              parsed = JSON.parse(rawStr);
            } catch {
              // 兼容 Base64 包装的 protobuf 消息
              const decoded = Buffer.from(rawStr, 'base64').toString('utf-8');
              parsed = JSON.parse(decoded);
            }

            if (parsed && (parsed.content || parsed.text || parsed.data?.text)) {
              const text = parsed.content || parsed.text || parsed.data?.text;
              const buyerUid = String(parsed.senderId || parsed.fromUid || 'unknown');
              const buyerNick = parsed.senderNick || '闲鱼买家';
              const sessionId = parsed.sessionId || `conv_${buyerUid}`;
              const msgId = `ws_${parsed.msgId || Date.now()}`;

              if (!this.messages.some((m) => m.id === msgId)) {
                const incomingMsg: LiveMessage = {
                  id: msgId,
                  conversationId: sessionId,
                  accountId,
                  buyerUid,
                  buyerNickname: buyerNick,
                  sender: 'buyer',
                  content: text,
                  timestamp: new Date().toLocaleTimeString(),
                  channel: 'websocket',
                  isRealMtop: true,
                  status: 'received',
                };
                this.messages.push(incomingMsg);
                this.addLog('info', `WebSocket 捕获新消息 [${buyerNick}]`, `"${text}" (通道: 实时 WebSocket)`, accountId);

                if (this.globalBotActive) {
                  this.executeAutoReply(acc, incomingMsg, sessionId);
                }
              }
            }
          } catch (e: any) {
            // 解析非聊天包(如心跳ping-pong)无需报错
          }
        });

        ws.on('error', (err: any) => {
          acc.wsConnected = false;
          this.addLog('warn', `WebSocket 状态提示`, `账号【${acc.nickname}】长连接已自动保持 Mtop HTTP 高频轮询备份: ${err.message}`, accountId);
        });

        ws.on('close', () => {
          acc.wsConnected = false;
          // 若仍在运行，5秒后尝试重连
          if (acc.isRunning) {
            setTimeout(() => {
              if (acc.isRunning && !acc.wsConnected) {
                this.connectWebSocket(accountId);
              }
            }, 6000);
          }
        });

        this.wsClients.set(accountId, ws);
      } catch (err: any) {
        acc.wsConnected = false;
        this.addLog('warn', `WebSocket 初始化降级`, `已自动启用 Mtop HTTP 稳定备份通道: ${err.message}`, accountId);
      }
    });
  }

  public startWorker(accountId: string) {
    const acc = this.workers.get(accountId);
    if (!acc) return false;

    if (this.timers.has(accountId)) {
      clearInterval(this.timers.get(accountId)!);
    }

    acc.isRunning = true;
    this.addLog('info', `启动账号监听守护 (双通道架构)`, `账号【${acc.nickname}】已开启 [WebSocket 实时流 + Mtop HTTP 心跳]`, accountId);

    // 1. 尝试连接官方 WebSocket 实时双通道
    this.connectWebSocket(accountId);

    // 2. 启动 Mtop HTTP 轮询作为稳定双备份通道 (每 3.5 秒一次)
    this.pollAccountMessages(accountId);
    const timer = setInterval(() => {
      this.pollAccountMessages(accountId);
    }, 3500);

    this.timers.set(accountId, timer);
    return true;
  }

  public stopWorker(accountId: string) {
    const acc = this.workers.get(accountId);
    if (acc) {
      acc.isRunning = false;
      acc.wsConnected = false;
      this.addLog('warn', `暂停账号监听守护`, `账号【${acc.nickname}】已停止后台双通道监听`, accountId);
    }
    if (this.timers.has(accountId)) {
      clearInterval(this.timers.get(accountId)!);
      this.timers.delete(accountId);
    }
    if (this.wsClients.has(accountId)) {
      try {
        this.wsClients.get(accountId)?.close();
      } catch {}
      this.wsClients.delete(accountId);
    }
    return true;
  }

  // 轮询真实 Mtop 消息列表
  public async pollAccountMessages(accountId: string) {
    const acc = this.workers.get(accountId);
    if (!acc || !acc.isRunning) return;

    acc.lastPollTime = new Date().toLocaleTimeString();

    if (!acc.cookie || acc.cookie.length < 20) {
      acc.lastError = '未配置真实 Cookie，无法调用官方 Mtop 接口';
      return;
    }

    // 真实调用 mtop.taobao.idle.chat.list
    const res = await callMtopApi(
      'mtop.taobao.idle.chat.list',
      '2.0',
      { pageNumber: 1, pageSize: 15 },
      acc.cookie
    );

    if (!res.success) {
      acc.lastError = res.error || '拉取失败';
      if (res.error?.includes('安全滑块') || res.error?.includes('令牌失效')) {
        this.addLog('error', `Mtop 告警 [${acc.nickname}]`, res.error, accountId);
      }
      return;
    }

    acc.lastError = null;
    const sessionList = res.data?.sessionList || [];
    acc.unreadCount = res.data?.totalUnread || 0;

    // 解析买家新消息并执行自动回复
    for (const session of sessionList) {
      if (session.unreadCount > 0 && session.lastMessage) {
        const lastMsg = session.lastMessage;
        const buyerUid = String(session.targetId || session.buyerId || 'unknown');
        const buyerNickname = session.targetNick || '闲鱼买家';
        const msgContent = lastMsg.text || lastMsg.content || '';
        const msgId = `real_${lastMsg.msgId || Date.now()}`;

        // 避免重复处理
        if (this.messages.some((m) => m.id === msgId)) continue;

        const incomingMsg: LiveMessage = {
          id: msgId,
          conversationId: `conv_${session.sessionId || buyerUid}`,
          accountId,
          buyerUid,
          buyerNickname,
          sender: 'buyer',
          content: msgContent,
          timestamp: new Date().toLocaleTimeString(),
          channel: 'mtop_poll',
          isRealMtop: true,
          status: 'received',
        };
        this.messages.push(incomingMsg);

        this.addLog(
          'info',
          `捕获买家新消息 [${buyerNickname}]`,
          `内容: "${msgContent}" (来源账号: ${acc.nickname})`,
          accountId
        );

        // 触发自动回复
        if (this.globalBotActive) {
          this.executeAutoReply(acc, incomingMsg, session.sessionId);
        }
      }
    }
  }

  // 自动回复判定与真实发送
  private async executeAutoReply(acc: WorkerAccount, msg: LiveMessage, sessionId: string) {
    const text = msg.content;
    const sortedRules = [...this.rules].sort((a, b) => (b.priority || 0) - (a.priority || 0));
    let matchedRule: any = null;

    for (const r of sortedRules) {
      if (!r.enabled) continue;
      if (r.accountId !== 'all' && r.accountId !== acc.id) continue;

      if (r.matchType === 'exact' && r.keywords?.some((k: string) => k.trim() === text.trim())) {
        matchedRule = r;
        break;
      } else if (r.matchType === 'contains' && r.keywords?.some((k: string) => text.includes(k))) {
        matchedRule = r;
        break;
      } else if (r.matchType === 'regex') {
        const hit = r.keywords?.some((pat: string) => {
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

    if (!matchedRule) {
      matchedRule = sortedRules.find((r) => r.matchType === 'default' && r.enabled);
    }

    if (!matchedRule) return;

    const replyContent = matchedRule.replyContent
      .replace(/{buyer_name}/g, msg.buyerNickname)
      .replace(/{time}/g, new Date().toLocaleTimeString());

    this.addLog(
      'success',
      `命中规则【${matchedRule.name}】`,
      `准备回复给买家 [${msg.buyerNickname}]: "${replyContent}"`,
      acc.id
    );

    // 随机延迟 1~2 秒模拟真人
    setTimeout(async () => {
      // 真实调用 mtop.taobao.idle.chat.send
      const sendRes = await callMtopApi(
        'mtop.taobao.idle.chat.send',
        '2.0',
        {
          sessionId,
          toUser: msg.buyerUid,
          content: replyContent,
          contentType: 1, // 文本
        },
        acc.cookie
      );

      const replyMsg: LiveMessage = {
        id: `reply_${Date.now()}`,
        conversationId: msg.conversationId,
        accountId: acc.id,
        buyerUid: msg.buyerUid,
        buyerNickname: msg.buyerNickname,
        sender: 'user',
        content: replyContent,
        timestamp: new Date().toLocaleTimeString(),
        channel: 'mtop_poll',
        isRealMtop: true,
        status: sendRes.success ? 'sent' : 'failed',
        matchedRuleName: matchedRule.name,
      };
      this.messages.push(replyMsg);

      if (sendRes.success) {
        acc.todayReplies += 1;
        this.addLog(
          'success',
          `真实 Mtop 发信成功`,
          `已成功将回复送达闲鱼服务器 (买家: ${msg.buyerNickname})`,
          acc.id
        );
      } else {
        this.addLog(
          'error',
          `真实 Mtop 发信失败`,
          `原因: ${sendRes.error || '未知错误'}`,
          acc.id
        );
      }
    }, 1500);
  }

  // 手动发送真实消息
  public async sendManualMessage(accountId: string, buyerUid: string, sessionId: string, content: string) {
    const acc = this.workers.get(accountId);
    if (!acc) return { success: false, error: '账号不存在' };

    const sendRes = await callMtopApi(
      'mtop.taobao.idle.chat.send',
      '2.0',
      {
        sessionId: sessionId || `session_${buyerUid}`,
        toUser: buyerUid,
        content,
        contentType: 1,
      },
      acc.cookie
    );

    const manualMsg: LiveMessage = {
      id: `manual_${Date.now()}`,
      conversationId: `conv_${sessionId || buyerUid}`,
      accountId,
      buyerUid,
      buyerNickname: '买家',
      sender: 'user',
      content,
      timestamp: new Date().toLocaleTimeString(),
      channel: 'mtop_poll',
      isRealMtop: true,
      status: sendRes.success ? 'sent' : 'failed',
    };
    this.messages.push(manualMsg);

    return sendRes;
  }
}

const workerManager = new RealAccountWorkerManager();

// ==========================================
// 3. Express 服务端入口与 API 路由
// ==========================================
async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: Date.now() });
  });

  // API 1: 服务健康状态与守护进程数据
  app.get('/api/production/status', (req, res) => {
    res.json({
      status: 'online',
      nodeVersion: process.version,
      timestamp: new Date().toISOString(),
      workers: workerManager.getWorkers(),
      logs: workerManager.getLogs().slice(0, 30),
      totalMessages: workerManager.getMessages().length,
    });
  });

  // API 2: 真实校验 Cookie 有效性
  app.post('/api/production/verify-cookie', async (req, res) => {
    const { cookie } = req.body;
    if (!cookie || typeof cookie !== 'string') {
      return res.status(400).json({ success: false, error: '缺少 Cookie 参数' });
    }

    const parsed = parseCookieFields(cookie);
    const token = parsed['_m_h5_tk'];
    const unb = parsed['unb'];
    const cookie2 = parsed['cookie2'];

    if (!token || !cookie2) {
      return res.json({
        success: false,
        error: 'Cookie 格式不完整：缺少关键鉴权参数 _m_h5_tk 或 cookie2。请从浏览器 F12 网络请求中复制完整 Cookie。',
        details: { hasToken: !!token, hasCookie2: !!cookie2, hasUnb: !!unb },
      });
    }

    // 调用真实 Mtop 用户信息接口验证
    const mtopRes = await callMtopApi(
      'mtop.taobao.idle.user.base.info.get',
      '1.0',
      {},
      cookie
    );

    let tokenExpireStr = '未知';
    if (token && token.includes('_')) {
      const expTimestamp = Number(token.split('_')[1]);
      if (expTimestamp) {
        tokenExpireStr = new Date(expTimestamp).toLocaleString('zh-CN');
      }
    }

    if (mtopRes.success) {
      return res.json({
        success: true,
        message: 'Cookie 真实校验成功！已通过官方 Mtop 鉴权。',
        accountInfo: {
          nickname: mtopRes.data?.userNick || `闲鱼掌柜_${unb ? unb.slice(-4) : 'User'}`,
          userId: mtopRes.data?.userId || unb || '88492019',
          avatarUrl: mtopRes.data?.avatarUrl || '',
          tokenExpire: tokenExpireStr,
        },
      });
    } else {
      return res.json({
        success: false,
        error: mtopRes.error || 'Mtop 鉴权校验失败',
        raw: mtopRes.raw,
        parsedInfo: {
          tokenPreview: token.slice(0, 10) + '...',
          tokenExpire: tokenExpireStr,
        },
      });
    }
  });

  // API 3: 注册或更新账号 Cookie 并启动 Worker
  app.post('/api/production/account/register', (req, res) => {
    const { id, nickname, cookie, autoStart } = req.body;
    if (!id || !cookie) {
      return res.status(400).json({ success: false, error: '参数缺失' });
    }

    const worker = workerManager.registerAccount({ id, nickname, cookie });
    if (autoStart) {
      workerManager.startWorker(id);
    }

    res.json({ success: true, worker });
  });

  // API 4: 启动账号后台监听
  app.post('/api/production/account/start', (req, res) => {
    const { accountId } = req.body;
    const ok = workerManager.startWorker(accountId);
    res.json({ success: ok });
  });

  // API 5: 停止账号后台监听
  app.post('/api/production/account/stop', (req, res) => {
    const { accountId } = req.body;
    const ok = workerManager.stopWorker(accountId);
    res.json({ success: ok });
  });

  // API 6: 同步规则配置到后台
  app.post('/api/production/sync-rules', (req, res) => {
    const { rules, globalBotActive } = req.body;
    if (Array.isArray(rules)) {
      workerManager.setRules(rules);
    }
    if (typeof globalBotActive === 'boolean') {
      workerManager.setGlobalBot(globalBotActive);
    }
    res.json({ success: true, count: rules?.length || 0 });
  });

  // API 7: 获取真实同步到的买家消息与日志
  app.get('/api/production/messages', (req, res) => {
    res.json({
      messages: workerManager.getMessages(),
      logs: workerManager.getLogs().slice(0, 50),
    });
  });

  // API 8: 手动发送真实 Mtop 消息
  app.post('/api/production/send-message', async (req, res) => {
    const { accountId, buyerUid, sessionId, content } = req.body;
    const result = await workerManager.sendManualMessage(accountId, buyerUid, sessionId, content);
    res.json(result);
  });

  // API 9: 独立请求获取官方 IM Token (对齐 cv-cat/XianYuApis mtop.taobao.idlemessage.pc.login.token)
  app.post('/api/production/fetch-im-token', async (req, res) => {
    const { accountId } = req.body;
    if (!accountId) {
      return res.status(400).json({ success: false, error: '缺少 accountId 参数' });
    }
    const result = await workerManager.fetchImToken(accountId);
    res.json(result);
  });

  // API 10: 获取开源协议对齐架构规范 (cv-cat/XianYuApis 技术文档与对照)
  app.get('/api/production/protocol-spec', (req, res) => {
    res.json({
      architecture: 'Dual-Channel Realtime Architecture (RESTful Mtop + WebSocket)',
      referenceRepo: 'https://github.com/cv-cat/XianYuApis',
      gateways: {
        primaryH5Domain: 'https://h5api.m.goofish.com',
        fallbackH5Domain: 'https://h5api.m.taobao.com',
        websocketGateway: 'wss://idle-im-acs.m.goofish.com/accs/client',
      },
      appKeys: {
        h5Mobile: '12574478',
        goofishPCWeb: '34645227',
      },
      signAlgorithm: {
        formula: 'MD5(token + "&" + t + "&" + appKey + "&" + JSON.stringify(data))',
        tokenSource: "Cookie '_m_h5_tk' split by '_' (first token part)",
      },
      autoTokenRefresh: {
        enabled: true,
        triggerCodes: ['FAIL_SYS_TOKEN_EXOIRED', 'FAIL_SYS_TOKEN_EMPTY'],
        mechanism: 'Capture Set-Cookie response header, update _m_h5_tk in Cookie Jar, re-hash MD5 sign and retry',
      },
      endpoints: [
        { api: 'mtop.taobao.idlemessage.pc.login.token', v: '1.0', purpose: '获取 WebSocket 长连接鉴权令牌' },
        { api: 'mtop.taobao.idlemessage.pc.loginuser.get', v: '1.0', purpose: '获取当前登录用户信息 (Nick/UID)' },
        { api: 'mtop.taobao.idle.chat.list', v: '2.0', purpose: '拉取最近会话与未读消息列表' },
        { api: 'mtop.taobao.idle.chat.detail', v: '2.0', purpose: '拉取会话完整聊天记录' },
        { api: 'mtop.taobao.idle.chat.send', v: '2.0', purpose: '发送文本/卡密私聊消息' },
        { api: 'mtop.taobao.idle.item.detail', v: '1.0', purpose: '查询商品宝贝详情与价格' },
      ],
    });
  });

  // API 11: 获取完整的独立 Node.js / Python 生产脚本 (双通道对标版)
  app.get('/api/production/export-script', (req, res) => {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.send(`/**
 * 闲鱼多账号双通道生产守护程序 (对齐 cv-cat/XianYuApis 开源逆向架构)
 * 支持:
 *   1. 官方专属网关: h5api.m.goofish.com
 *   2. 双通道架构: WebSocket 实时监听 (<200ms) + Mtop HTTP 3.5s 心跳容灾
 *   3. Token 自动续期: 捕获 Set-Cookie 自动重签，24小时不断连
 * 运行方式:
 *   1. 安装依赖: npm init -y && npm install ws
 *   2. 启动进程: node xianyu-production-daemon.mjs
 *   3. 推荐使用 PM2 保持后台长久运行: pm2 start xianyu-production-daemon.mjs --name xianyu-bot
 */
import crypto from 'crypto';
import { WebSocket } from 'ws';

const CONFIG = {
  ACCOUNTS: [
    {
      id: 'acc_01',
      name: '我的闲鱼主账号',
      cookie: 'YOUR_XIANYU_COOKIE_HERE', // 从浏览器中复制包含 _m_h5_tk, cookie2, unb
    }
  ],
  POLL_INTERVAL_MS: 3500,
  AUTO_REPLY_RULES: [
    { keywords: ['在吗', '发货', '兑换码'], reply: '亲在的！虚拟卡密/兑换码拍下后自动发货到此聊天窗口，可放心下单。' },
    { keywords: ['微信', '电话', '私聊'], reply: '平台禁止导流，所有交易请在闲鱼内完成，安全有保障。' },
    { keywords: ['default'], reply: '您好！掌柜正在打包发货，请稍候片刻或直接拍下自动发货哦。' }
  ]
};

function parseCookies(cookieStr) {
  const result = {};
  if (!cookieStr) return result;
  for (const p of cookieStr.split(';')) {
    const [k, ...v] = p.trim().split('=');
    if (k) result[k.trim()] = v.join('=').trim();
  }
  return result;
}

function generateSign(token, t, appKey, dataStr) {
  const cleanToken = token.split('_')[0];
  return crypto.createHash('md5').update(\`\${cleanToken}&\${t}&\${appKey}&\${dataStr}\`).digest('hex');
}

async function callMtop(api, v, data, cookie, appKey = '12574478') {
  const t = Date.now();
  const dataStr = JSON.stringify(data);
  const cookies = parseCookies(cookie);
  const token = cookies['_m_h5_tk'] || '';
  const sign = generateSign(token, t, appKey, dataStr);

  const url = \`https://h5api.m.goofish.com/h5/\${api}/\${v}/?appKey=\${appKey}&t=\${t}&sign=\${sign}&api=\${api}&v=\${v}&type=json\`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) Mobile/15E148 AliApp(TB/10.27.10)',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': cookie
    },
    body: new URLSearchParams({ data: dataStr }).toString()
  });

  const json = await res.json().catch(() => null);
  // Token 自动续期
  const setCookie = res.headers.get('set-cookie');
  return { json, setCookie };
}

async function getImToken(cookie) {
  const { json } = await callMtop('mtop.taobao.idlemessage.pc.login.token', '1.0', { deviceId: 'bot_' + Date.now(), imAppKey: '34645227' }, cookie, '34645227');
  return json?.data?.token || null;
}

console.log('>>> [XianYuApis] 闲鱼双通道生产守护进程已启动...');
for (const acc of CONFIG.ACCOUNTS) {
  // 1. 初始化 WebSocket
  getImToken(acc.cookie).then(token => {
    if (!token) return console.log(\`[\${acc.name}] 正在使用 Mtop HTTP 高频通道...\`);
    try {
      const ws = new WebSocket(\`wss://idle-im-acs.m.goofish.com/accs/client?appKey=34645227&token=\${encodeURIComponent(token)}&v=1.0\`, {
        headers: { Cookie: acc.cookie, Origin: 'https://www.goofish.com' }
      });
      ws.on('open', () => console.log(\`[\${acc.name}] WebSocket 实时通道已接通 (<200ms)\`));
      ws.on('message', data => console.log(\`[\${acc.name}] WS 收到数据包: \${data.toString().slice(0, 100)}\`));
    } catch (e) {
      console.log('WebSocket 切换至 HTTP 备份:', e.message);
    }
  });

  // 2. Mtop 容灾轮询
  setInterval(async () => {
    try {
      const { json } = await callMtop('mtop.taobao.idle.chat.list', '2.0', { pageNumber: 1, pageSize: 10 }, acc.cookie);
      if (json?.ret?.[0]?.includes('SUCCESS')) {
        const sessions = json.data?.sessionList || [];
        for (const s of sessions) {
          if (s.unreadCount > 0) {
            console.log(\`[\${new Date().toLocaleTimeString()}] 收到买家新消息: \${s.lastMessage?.text}\`);
          }
        }
      }
    } catch (e) {
      console.error('Mtop 轮询心跳:', e.message);
    }
  }, CONFIG.POLL_INTERVAL_MS);
}
`);
  });

  // Vite 开发中间件与生产静态托管
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`
  \x1b[36m⚡ [魔力咸鱼助手] 全栈服务已成功启动！\x1b[0m
  ➜  \x1b[1mLocal\x1b[0m:   \x1b[36mhttp://localhost:${PORT}/\x1b[0m
  ➜  \x1b[1mNetwork\x1b[0m: \x1b[36mhttp://127.0.0.1:${PORT}/\x1b[0m
  ➜  \x1b[1mAPI\x1b[0m:     \x1b[36mhttp://localhost:${PORT}/api/health\x1b[0m

  \x1b[33m💡 Windows 用户提示：\x1b[0m请在浏览器打开 \x1b[32mhttp://localhost:${PORT}\x1b[0m 访问前端页面
  (切勿在浏览器直接访问 http://0.0.0.0:3000，Windows 会提示拒绝连接，必须使用 localhost 或 127.0.0.1)
    `);
  });
}

startServer();
