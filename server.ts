import express from 'express';
import path from 'path';
import crypto from 'crypto';
import dns from 'dns';
import { WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';

// 优先 IPv4 解析，避免 Node.js undici 默认 IPv6 路由无响应超时
dns.setDefaultResultOrder('ipv4first');

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

// 生成闲鱼逆向设备唯一标识 (对齐 cv-cat/XianYuApis)
export function generateDeviceId(userId: string): string {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');
  const arr: string[] = [];
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      arr[i] = '-';
    } else if (i === 14) {
      arr[i] = '4';
    } else {
      const r = (16 * Math.random()) | 0;
      arr[i] = chars[i === 19 ? (r & 3) | 8 : r];
    }
  }
  return arr.join('') + '-' + (userId || 'user');
}

// 生成钉钉/闲鱼 IM 报文流水号 (对齐 cv-cat/XianYuApis)
export function generateMid(): string {
  return '' + Math.floor(1e3 * Math.random()) + Date.now() + ' 0';
}

// 生成闲鱼 IM 消息 UUID (对齐 cv-cat/XianYuApis)
export function generateUuid(): string {
  return '-' + Date.now() + '1';
}

// 解码 Cookie 中的 Unicode 中文昵称 (例如 lgc=%5Cu95F2%5Cu9C7C... -> 闲鱼掌柜_7807)
export function decodeUnicodeNick(rawNick: string): string {
  try {
    const unescaped = unescape(decodeURIComponent(rawNick).replace(/\\u/g, '%u'));
    return unescaped || rawNick;
  } catch {
    return rawNick;
  }
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

  // 优先使用高可用稳定的官方 taobao.com H5 网关，回退 goofish.com
  const primaryDomain = 'https://h5api.m.taobao.com';
  const fallbackDomain = 'https://h5api.m.goofish.com';
  const targetDomain = retryCount > 0 ? fallbackDomain : primaryDomain;

  const url = new URL(`${targetDomain}/h5/${api}/${version}/`);
  url.searchParams.set('jsv', '2.7.2');
  url.searchParams.set('appKey', appKey);
  url.searchParams.set('t', String(t));
  url.searchParams.set('sign', sign);
  url.searchParams.set('api', api);
  url.searchParams.set('v', version);
  url.searchParams.set('type', 'originaljson');
  url.searchParams.set('accountSite', 'xianyu');
  url.searchParams.set('dataType', 'json');
  url.searchParams.set('timeout', '20000');
  url.searchParams.set('sessionOption', 'AutoLoginOnly');
  url.searchParams.set('spm_cnt', 'a21ybx.im.0.0');

  const headers: Record<string, string> = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
    Origin: 'https://www.goofish.com',
    Referer: 'https://www.goofish.com/',
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
      (retCode.includes('FAIL_SYS_TOKEN_EXOIRED') ||
       retCode.includes('FAIL_SYS_TOKEN_EXPIRED') ||
       retCode.includes('FAIL_SYS_TOKEN_EMPTY') ||
       retCode.includes('令牌过期')) &&
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

  // 获取 Xianyu 实时 IM Token (完全对齐 cv-cat/XianYuApis 的 mtop.taobao.idlemessage.pc.login.token 接口)
  public async fetchImToken(accountId: string): Promise<{ success: boolean; token?: string; error?: string; raw?: any }> {
    const acc = this.workers.get(accountId);
    if (!acc) return { success: false, error: '账号不存在' };

    const parsedCookies = parseCookieFields(acc.cookie);
    const unb = parsedCookies['unb'] || '';
    const deviceId = generateDeviceId(unb);

    // cv-cat/XianYuApis 核心规范:
    // 1. Mtop Gateway appKey 参数必须使用 34839810
    // 2. data 内部 appKey 参数必须使用钉钉/闲鱼 IM 授权 Key 444e9908a51d1cb236a27862abc769c9
    // 3. deviceId 必须使用 uuid-unb 算法格式
    const res = await callMtopApi(
      'mtop.taobao.idlemessage.pc.login.token',
      '1.0',
      {
        appKey: '444e9908a51d1cb236a27862abc769c9',
        deviceId: deviceId,
      },
      acc.cookie,
      '34839810'
    );

    if (res.updatedCookie) {
      acc.cookie = res.updatedCookie;
    }

    if (res.success) {
      const token = res.data?.accessToken || res.data?.token || res.data?.loginToken;
      if (token) {
        acc.imToken = token;
        this.addLog('success', `获取 IM 长连接令牌成功`, `账号【${acc.nickname}】成功获取 WebSocket 鉴权令牌 (Token已就绪)`, accountId);
        return { success: true, token, raw: res.data };
      }
    }

    acc.imToken = null;
    let errorReason = res.error || '未返回有效 accessToken';
    if (errorReason.includes('FAIL_SYS_SESSION_EXPIRED')) {
      errorReason = 'Cookie 中的 Session 登录态已过期失效，请重新登录网页端 goofish.com 并复制最新 Cookie';
    }
    this.addLog('warn', `获取 IM 令牌未通过`, `原因: ${errorReason}，系统将保持 HTTP Mtop 高频通道工作`, accountId);
    return { success: false, error: errorReason, raw: res.raw };
  }

  // 建立 WebSocket 实时双通道 (完全对齐 cv-cat/XianYuApis 逆向还原协议)
  private connectWebSocket(accountId: string) {
    const acc = this.workers.get(accountId);
    if (!acc || !acc.isRunning) return;

    if (this.wsClients.has(accountId)) {
      try {
        this.wsClients.get(accountId)?.terminate();
      } catch {}
      this.wsClients.delete(accountId);
    }

    const parsedCookies = parseCookieFields(acc.cookie);
    const unb = parsedCookies['unb'] || '';
    const deviceId = generateDeviceId(unb);

    // 先拉取最新的 IM Token
    this.fetchImToken(accountId).then((tokenRes) => {
      if (!acc.isRunning) return;

      // cv-cat/XianYuApis 规范: 接入域名为 wss://wss-goofish.dingtalk.com/
      const wsUrl = 'wss://wss-goofish.dingtalk.com/';

      try {
        const ws = new WebSocket(wsUrl, {
          headers: {
            Host: 'wss-goofish.dingtalk.com',
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
            Origin: 'https://www.goofish.com',
            Cookie: acc.cookie,
            Pragma: 'no-cache',
            'Cache-Control': 'no-cache',
          },
          handshakeTimeout: 8000,
        });

        this.wsClients.set(accountId, ws);
        let heartbeatInterval: NodeJS.Timeout | null = null;

        ws.on('open', () => {
          acc.wsConnected = true;
          this.addLog('success', `WebSocket 双通道已接通`, `账号【${acc.nickname}】已连接至闲鱼长连接网关 (wss://wss-goofish.dingtalk.com/)`, accountId);

          if (acc.imToken) {
            // 1. 发送注册握手报文 /reg (对齐 cv-cat/XianYuApis)
            const regMsg = {
              lwp: '/reg',
              headers: {
                'cache-header': 'app-key token ua wv',
                'app-key': '444e9908a51d1cb236a27862abc769c9',
                'token': acc.imToken,
                'ua': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36 DingTalk(2.1.5) OS(Windows/10) Browser(Chrome/133.0.0.0) DingWeb/2.1.5 IMPaaS DingWeb/2.1.5',
                'dt': 'j',
                'wv': 'im:3,au:3,sy:6',
                'sync': '0,0;0;0;',
                'did': deviceId,
                'mid': generateMid(),
              },
            };
            ws.send(JSON.stringify(regMsg));

            // 2. 发送初始同步确认 /r/SyncStatus/ackDiff
            const now = Date.now();
            const ackDiffMsg = {
              lwp: '/r/SyncStatus/ackDiff',
              headers: { mid: generateMid() },
              body: [
                {
                  pipeline: 'sync',
                  tooLong2Tag: 'PNM,1',
                  channel: 'sync',
                  topic: 'sync',
                  highPts: 0,
                  pts: now * 1000,
                  seq: 0,
                  timestamp: now,
                },
              ],
            };
            ws.send(JSON.stringify(ackDiffMsg));
          }

          // 3. 开启 15 秒心跳保活
          heartbeatInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                lwp: '/!',
                headers: { mid: generateMid() },
              }));
            }
          }, 15000);
        });

        ws.on('message', (data: any) => {
          try {
            const rawStr = data.toString();
            const message = JSON.parse(rawStr);

            // 必须立即回复 ACK 回执包 (对齐 cv-cat/XianYuApis)
            if (message.headers?.mid) {
              const ack: any = {
                code: 200,
                headers: {
                  mid: message.headers.mid,
                  sid: message.headers.sid || '',
                },
              };
              if (message.headers['app-key']) ack.headers['app-key'] = message.headers['app-key'];
              if (message.headers['ua']) ack.headers['ua'] = message.headers['ua'];
              if (message.headers['dt']) ack.headers['dt'] = message.headers['dt'];
              ws.send(JSON.stringify(ack));
            }

            // 处理同步包与消息解析 (支持明文与 Protobuf/Base64)
            let payload: any = null;
            try {
              const syncData = message.body?.syncPushPackage?.data?.[0]?.data;
              if (syncData) {
                try {
                  payload = JSON.parse(syncData);
                } catch {
                  const decoded = Buffer.from(syncData, 'base64').toString('utf-8');
                  payload = JSON.parse(decoded);
                }
              }
            } catch {}

            let text = '';
            let buyerUid = 'unknown';
            let buyerNick = '闲鱼买家';
            let sessionId = '';

            if (payload) {
              const reminder = payload['1']?.['10'] || payload.reminder || payload;
              text = reminder?.reminderContent || reminder?.text || reminder?.content || '';
              buyerNick = reminder?.reminderTitle || reminder?.nick || '闲鱼买家';
              buyerUid = String(reminder?.senderUserId || reminder?.fromUid || 'unknown');
              const rawCid = payload['1']?.['2'] || reminder?.cid || '';
              sessionId = rawCid ? rawCid.split('@')[0] : `conv_${buyerUid}`;
            }

            if (text && buyerUid !== unb) {
              const msgId = `ws_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
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
            // 忽略非格式化心跳包
          }
        });

        ws.on('error', (err: any) => {
          acc.wsConnected = false;
          this.addLog('warn', `WebSocket 状态提示`, `账号【${acc.nickname}】长连接已自动保持 Mtop HTTP 高频轮询备份: ${err.message}`, accountId);
        });

        ws.on('close', () => {
          if (heartbeatInterval) clearInterval(heartbeatInterval);
          acc.wsConnected = false;
          this.wsClients.delete(accountId);
          this.addLog('warn', `WebSocket 已断开`, `账号【${acc.nickname}】长连接断开，5秒后自动尝试重连，当前由 HTTP Mtop 持续守护`, accountId);
          if (acc.isRunning) {
            setTimeout(() => {
              if (acc.isRunning && !acc.wsConnected) {
                this.connectWebSocket(accountId);
              }
            }, 5000);
          }
        });
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

    // 解析 Cookie 中的 lgc 字段并解码 Unicode 中文昵称
    const rawLgc = parsed['lgc'] || '';
    const detectedNick = rawLgc ? decodeUnicodeNick(rawLgc) : (unb ? `闲鱼掌柜_${unb.slice(-4)}` : '闲鱼掌柜');

    // 调用真实 Mtop 用户信息接口验证 (对齐 cv-cat/XianYuApis: appKey 为 34839810)
    let mtopRes = await callMtopApi(
      'mtop.taobao.idlemessage.pc.loginuser.get',
      '1.0',
      {},
      cookie,
      '34839810'
    );

    if (!mtopRes.success && mtopRes.raw?.ret?.[0]?.includes('FAIL_SYS_API_NOT_FOUNDED')) {
      mtopRes = await callMtopApi(
        'mtop.user.getUserSimple',
        '1.0',
        {},
        cookie,
        '12574478'
      );
    }

    let tokenExpireStr = '未知';
    if (token && token.includes('_')) {
      const expTimestamp = Number(token.split('_')[1]);
      if (expTimestamp) {
        tokenExpireStr = new Date(expTimestamp).toLocaleString('zh-CN');
      }
    }

    if (mtopRes.success) {
      const nick = mtopRes.data?.userNick || mtopRes.data?.nick || mtopRes.data?.Nick || detectedNick;
      const uid = mtopRes.data?.userId || mtopRes.data?.userNumId || unb || '88492019';
      return res.json({
        success: true,
        message: 'Cookie 真实校验成功！已通过官方 Mtop 鉴权。',
        accountInfo: {
          nickname: nick,
          userId: uid,
          avatarUrl: mtopRes.data?.avatarUrl || mtopRes.data?.avatar || '',
          tokenExpire: tokenExpireStr,
        },
      });
    } else {
      const rawRet = mtopRes.raw?.ret?.[0] || mtopRes.error || '';
      let friendlyError = rawRet;
      if (rawRet.includes('FAIL_SYS_SESSION_EXPIRED')) {
        friendlyError = `Cookie 格式有效，但登录 Session 已过期失效（淘宝接口提示 FAIL_SYS_SESSION_EXPIRED）。已识别账号【${detectedNick}】(UID: ${unb || '未知'})，请在电脑浏览器重新登录 goofish.com 并复制最新 Cookie 填入！`;
      } else if (rawRet.includes('FAIL_SYS_TOKEN_EXOIRED') || rawRet.includes('FAIL_SYS_TOKEN_EXPIRED') || rawRet.includes('FAIL_SYS_TOKEN_EMPTY')) {
        friendlyError = `Cookie 中的 _m_h5_tk 令牌无效或已过期，请在网页端刷新页面后重新复制 Cookie。`;
      } else if (rawRet.includes('RGV587_4') || rawRet.includes('FAIL_SYS_USER_VALIDATE')) {
        friendlyError = '触发阿里安全滑块验证 (RGV587)，需在手机端闲鱼或浏览器中完成一次人机验证。';
      } else if (rawRet.includes('FAIL_SYS_PARAMINVALID_ERROR')) {
        friendlyError = `请求参数非法 (${rawRet})。常见原因：缺少必要鉴权 Cookie。`;
      }

      return res.json({
        success: false,
        error: friendlyError,
        raw: mtopRes.raw,
        parsedInfo: {
          detectedNick,
          userId: unb,
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
    const { accountId, cookie } = req.body;
    if (!accountId && !cookie) {
      return res.status(400).json({ success: false, error: '缺少 accountId 或 cookie 参数' });
    }

    const accId = accountId || 'acc_default';

    // 如果传入了实时 Cookie，自动注册或更新当前 Worker
    if (cookie) {
      const parsed = parseCookieFields(cookie);
      const rawLgc = parsed['lgc'] || '';
      const detectedNick = rawLgc ? decodeUnicodeNick(rawLgc) : (parsed['unb'] ? `闲鱼掌柜_${parsed['unb'].slice(-4)}` : '闲鱼掌柜');
      workerManager.registerAccount({
        id: accId,
        nickname: detectedNick,
        cookie,
      });
    }

    const result = await workerManager.fetchImToken(accId);
    const parsedCookies = parseCookieFields(cookie || '');
    const deviceId = generateDeviceId(parsedCookies['unb'] || '');

    res.json({
      success: result.success,
      imToken: result.token || null,
      message: result.success ? '成功获取闲鱼官方 WebSocket 鉴权令牌 (IM Token)' : `获取 IM 令牌未通过: ${result.error}`,
      wsUrl: 'wss://wss-goofish.dingtalk.com/',
      deviceId: deviceId,
      raw: result.raw,
      error: result.error,
    });
  });

  // API 10: 获取开源协议对齐架构规范 (cv-cat/XianYuApis 技术文档与对照)
  app.get('/api/production/protocol-spec', (req, res) => {
    res.json({
      architecture: 'Dual-Channel Realtime Architecture (RESTful Mtop + WebSocket)',
      referenceRepo: 'https://github.com/cv-cat/XianYuApis',
      gateways: {
        primaryH5Domain: 'https://h5api.m.taobao.com',
        fallbackH5Domain: 'https://h5api.m.goofish.com',
        websocketGateway: 'wss://wss-goofish.dingtalk.com/',
      },
      appKeys: {
        h5Mobile: '12574478',
        goofishPCWeb: '34839810',
        dingtalkIM: '444e9908a51d1cb236a27862abc769c9',
      },
      signAlgorithm: {
        formula: 'MD5(token + "&" + t + "&" + appKey + "&" + JSON.stringify(data))',
        tokenSource: "Cookie '_m_h5_tk' split by '_' (first token part)",
      },
      autoTokenRefresh: {
        enabled: true,
        triggerCodes: ['FAIL_SYS_TOKEN_EXOIRED', 'FAIL_SYS_TOKEN_EXPIRED', 'FAIL_SYS_TOKEN_EMPTY', '令牌过期'],
        mechanism: 'Capture Set-Cookie response header, update _m_h5_tk in Cookie Jar, re-hash MD5 sign and retry',
      },
      endpoints: [
        { api: 'mtop.taobao.idlemessage.pc.login.token', v: '1.0', purpose: '获取 WebSocket 长连接鉴权令牌 (data必须包含 444e9908a51d1cb236a27862abc769c9)' },
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
 *   1. 官方专属网关: h5api.m.goofish.com / h5api.m.taobao.com
 *   2. 双通道架构: WebSocket 实时监听 (<200ms) + Mtop HTTP 3.5s 心跳容灾
 *   3. 核心协议: 钉钉/闲鱼 IM PaaS 协议 (/reg 注册 + ackDiff + /! 心跳)
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

function generateDeviceId(userId) {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');
  const arr = [];
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) arr[i] = '-';
    else if (i === 14) arr[i] = '4';
    else {
      const r = (16 * Math.random()) | 0;
      arr[i] = chars[i === 19 ? (r & 3) | 8 : r];
    }
  }
  return arr.join('') + '-' + (userId || 'user');
}

function generateMid() {
  return '' + Math.floor(1e3 * Math.random()) + Date.now() + ' 0';
}

function generateSign(token, t, appKey, dataStr) {
  const cleanToken = token.split('_')[0];
  return crypto.createHash('md5').update(\`\${cleanToken}&\${t}&\${appKey}&\${dataStr}\`).digest('hex');
}

async function callMtop(api, v, data, cookie, appKey = '34839810') {
  const t = Date.now();
  const dataStr = JSON.stringify(data);
  const cookies = parseCookies(cookie);
  const token = cookies['_m_h5_tk'] || '';
  const sign = generateSign(token, t, appKey, dataStr);

  const url = \`https://h5api.m.taobao.com/h5/\${api}/\${v}/?jsv=2.7.2&appKey=\${appKey}&t=\${t}&sign=\${sign}&api=\${api}&v=\${v}&type=originaljson&accountSite=xianyu&dataType=json\`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36',
      'Origin': 'https://www.goofish.com',
      'Referer': 'https://www.goofish.com/',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': cookie
    },
    body: new URLSearchParams({ data: dataStr }).toString()
  });

  const json = await res.json().catch(() => null);
  const setCookie = res.headers.get('set-cookie');
  return { json, setCookie };
}

async function getImToken(cookie) {
  const cookies = parseCookies(cookie);
  const unb = cookies['unb'] || '';
  const deviceId = generateDeviceId(unb);

  const { json } = await callMtop('mtop.taobao.idlemessage.pc.login.token', '1.0', {
    appKey: '444e9908a51d1cb236a27862abc769c9',
    deviceId: deviceId
  }, cookie, '34839810');

  return json?.data?.accessToken || json?.data?.token || null;
}

console.log('>>> [XianYuApis] 闲鱼双通道生产守护进程已启动...');
for (const acc of CONFIG.ACCOUNTS) {
  const cookies = parseCookies(acc.cookie);
  const unb = cookies['unb'] || '';
  const deviceId = generateDeviceId(unb);

  // 1. 初始化 WebSocket (完全对齐 cv-cat/XianYuApis)
  getImToken(acc.cookie).then(token => {
    if (!token) return console.log(\`[\${acc.name}] 正在使用 Mtop HTTP 高频通道...\`);
    try {
      const ws = new WebSocket('wss://wss-goofish.dingtalk.com/', {
        headers: {
          Host: 'wss-goofish.dingtalk.com',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
          Origin: 'https://www.goofish.com',
          Cookie: acc.cookie
        }
      });

      ws.on('open', () => {
        console.log(\`[\${acc.name}] WebSocket 实时通道已接通 (<200ms)\`);
        // 发送 /reg 报文
        ws.send(JSON.stringify({
          lwp: '/reg',
          headers: {
            'cache-header': 'app-key token ua wv',
            'app-key': '444e9908a51d1cb236a27862abc769c9',
            'token': token,
            'ua': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) DingTalk(2.1.5) OS(Windows/10) Browser(Chrome/133.0.0.0) IMPaaS DingWeb/2.1.5',
            'dt': 'j',
            'wv': 'im:3,au:3,sy:6',
            'sync': '0,0;0;0;',
            'did': deviceId,
            'mid': generateMid()
          }
        }));
        // 初始同步
        ws.send(JSON.stringify({
          lwp: '/r/SyncStatus/ackDiff',
          headers: { mid: generateMid() },
          body: [{ pipeline: 'sync', tooLong2Tag: 'PNM,1', channel: 'sync', topic: 'sync', highPts: 0, pts: Date.now() * 1000, seq: 0, timestamp: Date.now() }]
        }));
        // 15秒心跳
        setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ lwp: '/!', headers: { mid: generateMid() } }));
          }
        }, 15000);
      });

      ws.on('message', data => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.headers?.mid) {
            ws.send(JSON.stringify({ code: 200, headers: { mid: msg.headers.mid, sid: msg.headers.sid || '' } }));
          }
          console.log(\`[\${acc.name}] WS 数据包:\`, data.toString().slice(0, 100));
        } catch {}
      });
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
