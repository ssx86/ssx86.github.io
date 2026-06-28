import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DOC_ROOT = path.join(ROOT, 'DOCS', 'pages');
const OUT = path.join(ROOT, 'DOCS', 'progress-map', 'graph-data.json');

const routeAliases = {
  patient: {
    'pages/index/index': 'pages/index/index',
    'pages/login/index/index': 'pages/login/index/index',
    'pages/profile/index/index': 'pages/profile/index/index',
    'pages/profile/prescription/index': 'pages/profile/prescription/index',
    'pages/prescription/list/index': 'pages/profile/prescription/index',
    'pages/profile/patient-manage/index': 'pages/patient/manage/index',
    'pages/profile/patient-add/index': 'pages/patient/add/index',
    'pages/profile/patient-edit/index': 'pages/patient/edit/index',
    'pages/profile/personal-info/index': 'pages/profile/personal-info/index/index',
    'pages/payment/list/index': 'pages/payment/list/index/index',
    'pages/payment/detail/index': 'pages/payment/detail/index/index',
    'pages/common/health-news/index': 'pages/news/list/index',
    'pages/common/health-news-detail/index': 'pages/news/detail/index',
    'pages/common/user-agreement/index': 'pages/consent/consent/index',
    'pages/common/verify-code/index': 'pages/login/verify-code/index'
  },
  doctor: {
    'pages/consult/index/index': 'pages/index/index',
    'pages/consult/index': 'pages/index/index',
    'pages/doctor-profile/index/index': 'pages/profile/index/index',
    'pages/doctor-profile/index': 'pages/profile/index/index',
    'pages/auth/realname/index': 'pages/profile/real-name/index',
    'pages/patient/consult-detail/index': 'pages/consult/detail/index',
    'pages/prescription/submit/index': 'pages/prescription/submit/index/index'
  },
  common: {
    'pages/index/index': 'pages/index/index',
    'pages/login/index': 'pages/login/index/index',
    'pages/login/index/index': 'pages/login/index/index',
    'pages/profile/change-phone/index': 'pages/profile/change-phone/index',
    'pages/profile/personal-info/index': 'pages/profile/personal-info/index/index',
    'pages/common/health-news/index': 'pages/news/list/index',
    'pages/common/health-news-detail/index': 'pages/news/detail/index',
    'pages/common/user-agreement/index': 'pages/consent/consent/index',
    'pages/common/verify-code/index': 'pages/login/verify-code/index'
  }
};

const statusByRoute = {
  verified: new Set([
    'patient:pages/index/index',
    'patient:pages/consult/consent/index',
    'patient:pages/pre-diagnosis/questionnaire/index',
    'patient:pages/profile/index/index',
    'patient:pages/consult/list/index',
    'patient:pages/profile/my-consult/index',
    'patient:pages/consult/chat/index',
    'patient:pages/consult/records/index',
    'patient:pages/doctor/detail/index',
    'patient:pages/patient/manage/index',
    'patient:pages/patient/edit/index',
    'patient:pages/patient/add/index',
    'patient:pages/medicine/address/index',
    'patient:pages/medicine/address-edit/index',
    'patient:pages/medicine/order-list/index',
    'doctor:pages/index/index',
    'doctor:pages/profile/index/index',
    'doctor:pages/profile/verify/index',
    'doctor:pages/profile/real-name/index',
    'doctor:pages/patient/list/index',
    'doctor:pages/consult/detail/index',
    'doctor:pages/consult/doctor-chat/index',
    'doctor:pages/consult/records/index',
    'doctor:pages/prescription/western/index',
    'doctor:pages/prescription/drug-add/index',
    'doctor:pages/prescription/dosage/index',
    'doctor:pages/prescription/sign/index',
    'doctor:pages/medical-record/edit/index',
    'doctor:pages/consult/exam-apply/index',
    'doctor:pages/consult/exam-select/index'
  ]),
  partial: new Set([
    'patient:pages/medicine/hospital-preparation/index',
    'patient:pages/chronic-disease/convenient-clinic/index',
    'patient:pages/profile/personal-info/index/index',
    'doctor:pages/profile/about/index',
    'doctor:pages/profile/feedback/index'
  ]),
  blocked: new Set([
    'doctor:pages/consult/reject/index',
    'doctor:pages/consult/accept-dialog/index',
    'doctor:pages/consult/end-dialog/index'
  ])
};

const evidenceByRoute = {
  'doctor:pages/consult/end-dialog/index': [
    {
      type: 'screenshot',
      title: 'D026 双选项确认页 MCP 截图',
      path: 'evidence/doctor-end-dialog-fixed.png'
    }
  ],
  'doctor:pages/consult/records/index': [
    {
      type: 'screenshot',
      title: '医生端诊疗记录 MCP 截图',
      path: 'evidence/doctor-current-mcp-screenshot.png'
    }
  ],
  'patient:pages/medicine/hospital-preparation/index': [
    {
      type: 'screenshot',
      title: 'P078 院内制剂空态',
      path: 'evidence/patient-hospital-preparation-empty.png'
    },
    {
      type: 'screenshot',
      title: 'P078 院内制剂分类空态',
      path: 'evidence/patient-hospital-preparation-internal-empty.png'
    },
    {
      type: 'screenshot',
      title: 'P078 院内制剂搜索空态',
      path: 'evidence/patient-hospital-preparation-search-empty.png'
    }
  ],
  'patient:pages/chronic-disease/convenient-clinic/index': [
    {
      type: 'runtime',
      title: 'P081 便民门诊空态运行时证据',
      summary: '患者首页第四个功能入口自然进入；page_data 显示 showEmpty=true、emptyText=暂无医生；8 秒 console 采样 0 warning/error/exception；wechat_screenshot 多次 UNKNOWN_ERROR daemon 超时，截图缺失。'
    }
  ],
  'doctor:pages/profile/about/index': [
    {
      type: 'runtime',
      title: 'D039 关于我们运行时证据',
      summary: '医生首页底部导航进入我的，再点服务菜单第一项关于我们；page_data 显示 appInfo、companyIntro、contactItems；8 秒 console 采样 0 warning/error/exception；wechat_screenshot UNKNOWN_ERROR daemon 超时，截图缺失。'
    }
  ],
  'patient:pages/profile/index/index': [
    {
      type: 'screenshot',
      title: 'P052 个人中心 MCP 截图',
      path: 'evidence/patient-profile-screenshot-probe.png'
    },
    {
      type: 'runtime',
      title: 'P052 个人中心手机号展示修复证据',
      summary: '通过原生 tabBar switchTab 进入个人中心；修复后 page_data 显示 userInfo.phone=159****7669，与 P057 personal-info 的手机号来源一致；患者端编译成功，8 秒 console 采样 0 warning/error/exception。'
    }
  ],
  'patient:pages/profile/personal-info/index/index': [
    {
      type: 'runtime',
      title: 'P057 个人信息运行时证据',
      summary: '患者个人中心 more-list 第一项自然进入；page_data 显示 nickname=用户:15901447669、phone=15901447669、maskedPhone=159****7669、showAvatarModal=false；8 秒 console 采样 0 warning/error/exception；截图通道仍超时。'
    }
  ],
  'doctor:pages/profile/feedback/index': [
    {
      type: 'runtime',
      title: 'D041 意见反馈空表单校验证据',
      summary: '医生首页底部导航进入我的，再点服务菜单第二项意见反馈；初始 page_data 显示 feedbackTypes 和空表单；点击 .submit-section button 后仅触发前端校验 errors.type=请选择反馈类型、errors.content=请至少输入10个字符；8 秒 console 采样 0 warning/error/exception。'
    }
  ],
  'patient:pages/medicine/address/index': [
    {
      type: 'runtime',
      title: 'P029 地址管理运行时证据',
      summary: '患者个人中心第三个更多项 .more-list .more-item:nth-child(3) 文本为地址管理；点击后进入 pages/medicine/address/index；page_data 显示 showAddressList=true、showEmpty=false，地址 JSON 已规范化为省市区和 detail；3 秒 console 采样 0 warning/error/exception；截图通道仍为 UNKNOWN_ERROR daemon 超时。'
    }
  ],
  'patient:pages/medicine/address-edit/index': [
    {
      type: 'runtime',
      title: 'P073 新增地址表单校验证据',
      summary: '从 P029 点击原生 button.add-btn 进入 pages/medicine/address-edit/index；page_data 显示 title=新增地址、form 为空、regionText=请选择省市区；点击原生 button.submit-btn 空提交后仍停留本页且 submitting=false，未保存后端数据；3 秒 console 采样 0 warning/error/exception。'
    }
  ],
  'patient:pages/patient/manage/index': [
    {
      type: 'runtime',
      title: 'P051 就诊人管理运行时证据',
      summary: '患者个人中心第二个更多项 .more-list .more-item:nth-child(2) 文本为就诊人管理；点击后进入 pages/patient/manage/index；page_data 显示真实就诊人列表、maskedIdCard、cardClass、sideLabel；卡片整体点击会切换默认就诊人，读-only 验证应使用 .detail-link。console 采样 0 warning/error/exception。'
    }
  ],
  'patient:pages/patient/edit/index': [
    {
      type: 'runtime',
      title: 'P056 就诊人详情运行时证据',
      summary: '从 P051 的 .detail-link 进入 pages/patient/edit/index?id=<patientId>；page_data 显示 patientId、姓名、证件类型、手机号、住址，并将后端 birthday=636768000000 格式化为 birthDate=1990-03-07；删除/修改动作未执行；console 采样 0 warning/error/exception。'
    }
  ],
  'patient:pages/patient/add/index': [
    {
      type: 'runtime',
      title: 'P055 添加就诊人空表单校验证据',
      summary: '从 P051 点击 .add-btn 进入 pages/patient/add/index；初始 page_data 显示身份证/男等默认字典值、民族和地区占位；点击原生 button.btn-primary 空提交后仍停留本页、submitting=false，未写后端；console 采样 0 warning/error/exception。'
    }
  ],
  'doctor:pages/patient/list/index': [
    {
      type: 'runtime',
      title: 'D006/D007/D008 患者管理三 tab 运行时证据',
      summary: '医生个人中心第二个主菜单 .menu-section .menu-item:nth-child(2) 文本为患者管理；进入 pages/patient/list/index 后待接诊 tab 为空，切换问诊中 tab 得到 consultId=428197448779345920 等状态 2 卡片，切换已完成 tab 得到状态 3 卡片；每次切换后 console 采样 0 warning/error/exception；截图通道仍为 UNKNOWN_ERROR daemon 超时。'
    }
  ],
  'doctor:pages/consult/detail/index': [
    {
      type: 'runtime',
      title: 'D029 问诊详情运行时证据',
      summary: '医生首页恢复到个人中心 -> 患者管理 -> 已完成 tab -> 第一张 completed patient-card 自然进入；实际路由为 pages/consult/detail/index 而非旧设计路径 pages/patient/consult-detail/index；page_data 显示 consultStatus=已完成、consultType=图文、patientInfo、medicalRecord 和空处方/检查列表；.consult-header 与 .chat-history-card 元素存在，console 采样 0 warning/error/exception。'
    },
    {
      type: 'runtime',
      title: 'D029 到只读聊天运行时证据',
      summary: '从 D029 点击 .chat-history-card 进入 pages/consult/doctor-chat/index?readonly=true；page_data 显示 readonly=true、isEnded=true、canSendMessage=false、emptyMessages=true；.readonly-banner 可见，.input-area 不存在；console 采样 0 warning/error/exception。'
    }
  ]
};

function walk(dir, predicate, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, predicate, out);
    else if (predicate(full)) out.push(full);
  }
  return out;
}

function readText(file) {
  return fs.readFileSync(file, 'utf8');
}

function cleanRoute(raw) {
  if (!raw) return '';
  let route = raw
    .replace(/\\/g, '/')
    .replace(/^apps\/(patient|doctor)\//, '')
    .replace(/[（(].*$/, '')
    .replace(/\s+.*$/, '')
    .replace(/^\/+|\/+$/g, '')
    .trim();

  if (route === 'pages/index') route = 'pages/index/index';
  if (route === 'pages/profile/index') route = 'pages/profile/index/index';
  if (route.startsWith('pages/') && !route.endsWith('/index')) route += '/index';
  return route;
}

function detectSide(relativeParts) {
  const first = relativeParts[0] || '';
  if (first.includes('患者')) return 'patient';
  if (first.includes('医生')) return 'doctor';
  return 'common';
}

function routeForSide(side, route) {
  const aliased = routeAliases[side]?.[route] || routeAliases.common[route] || route;
  const candidates = [
    aliased,
    aliased.endsWith('/index') ? `${aliased}/index` : '',
    route,
    route.endsWith('/index') ? `${route}/index` : ''
  ].filter(Boolean);
  const routeSet = appRoutes?.[side];
  if (routeSet) {
    const registered = candidates.find((candidate) => routeSet.has(candidate));
    if (registered) return registered;
  }
  if (side === 'common') {
    const registered = candidates.find((candidate) => appRoutes.patient.has(candidate) || appRoutes.doctor.has(candidate));
    if (registered) return registered;
  }
  return aliased;
}

function graphSideForRoute(sourceSide, route) {
  if (sourceSide !== 'common' || !route) return sourceSide;
  const patientHasRoute = appRoutes.patient.has(route);
  const doctorHasRoute = appRoutes.doctor.has(route);
  if (patientHasRoute && !doctorHasRoute) return 'patient';
  if (doctorHasRoute && !patientHasRoute) return 'doctor';
  return sourceSide;
}

function slug(input) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
  return `n${Math.abs(hash).toString(36)}`;
}

function parseDev(file) {
  const text = readText(file);
  const pathMatch = text.match(/\*\*Path\*\*:\s*([^\r\n]+)/);
  const designPath = pathMatch ? cleanRoute(pathMatch[1]) : '';
  const edges = [];
  const linePattern = /\|\s*([^|\r\n]+?)\s*\|\s*((?:(?:JUMPTO|SWITCHTAB|wx\.switchTab):[^\r\n|]+)(?:\s*\/\s*(?:JUMPTO|SWITCHTAB|wx\.switchTab):[^\r\n|]+)*)\s*\|\s*([^|\r\n]*)\|/g;
  for (const match of text.matchAll(linePattern)) {
    const trigger = match[1].trim();
    const targetText = match[2];
    const note = match[3].trim();
    for (const targetMatch of targetText.matchAll(/(JUMPTO|SWITCHTAB|wx\.switchTab):\s*([^/\s|]+(?:\/[^/\s|]+)*\/?)/g)) {
      edges.push({
        trigger,
        kind: targetMatch[1],
        targetDesignPath: cleanRoute(targetMatch[2]),
        note
      });
    }
  }
  return { designPath, edges };
}

function getAppRoutes(app) {
  const file = path.join(ROOT, 'apps', app, 'app.json');
  const json = JSON.parse(readText(file));
  return new Set(json.pages || []);
}

const appRoutes = {
  patient: getAppRoutes('patient'),
  doctor: getAppRoutes('doctor')
};

const pngFiles = walk(DOC_ROOT, (file) => file.endsWith('.png.txt')).sort((a, b) => a.localeCompare(b, 'zh-Hans-CN'));
const devFiles = new Map(
  walk(DOC_ROOT, (file) => path.basename(file) === 'DEV.md').map((file) => [path.dirname(file), file])
);

const nodes = [];
const nodesByDir = new Map();
const nodesByRoute = new Map();

for (const file of pngFiles) {
  const rel = path.relative(DOC_ROOT, file);
  const parts = rel.split(path.sep);
  const side = detectSide(parts);
  const moduleName = parts[1] || parts[0] || '未分组';
  const pageName = parts[2] || path.basename(file, '.png.txt');
  const stateName = path.basename(file, '.png.txt').replace(/\.png$/, '');
  const devFile = devFiles.get(path.dirname(file));
  const dev = devFile ? parseDev(devFile) : { designPath: '', edges: [] };
  const route = routeForSide(side, dev.designPath);
  const graphSide = graphSideForRoute(side, route);
  const routeKey = route ? `${side}:${route}` : '';
  let status = 'documented';
  if (statusByRoute.verified.has(routeKey)) status = 'verified';
  else if (statusByRoute.partial.has(routeKey)) status = 'partial';
  else if (statusByRoute.blocked.has(routeKey)) status = 'blocked';

  const node = {
    id: slug(rel),
    sourceSide: side,
    side: graphSide,
    module: moduleName,
    page: pageName,
    state: stateName,
    title: stateName === pageName ? pageName : `${pageName} / ${stateName}`,
    docPath: rel.replace(/\\/g, '/'),
    devPath: devFile ? path.relative(ROOT, devFile).replace(/\\/g, '/') : '',
    designPath: dev.designPath,
    route,
    registered: route ? Boolean(appRoutes[graphSide]?.has(route) || appRoutes[side]?.has(route)) : false,
    status
  };
  nodes.push(node);
  if (!nodesByDir.has(path.dirname(file))) nodesByDir.set(path.dirname(file), []);
  nodesByDir.get(path.dirname(file)).push(node);
  if (route) {
    const key = `${side}:${route}`;
    if (!nodesByRoute.has(key)) nodesByRoute.set(key, []);
    nodesByRoute.get(key).push(node);
  }
}

for (const [dir, devFile] of devFiles.entries()) {
  if (nodesByDir.has(dir)) continue;
  const relDir = path.relative(DOC_ROOT, dir);
  const parts = relDir.split(path.sep);
  const side = detectSide(parts);
  const moduleName = parts[1] || parts[0] || '未分组';
  const pageName = parts[2] || path.basename(dir);
  const dev = parseDev(devFile);
  const route = routeForSide(side, dev.designPath);
  const graphSide = graphSideForRoute(side, route);
  const routeKey = route ? `${graphSide}:${route}` : '';
  let status = 'dev-only';
  if (statusByRoute.verified.has(routeKey)) status = 'verified';
  else if (statusByRoute.partial.has(routeKey)) status = 'partial';
  else if (statusByRoute.blocked.has(routeKey)) status = 'blocked';
  const node = {
    id: slug(`dev-only:${relDir}`),
    sourceSide: side,
    side: graphSide,
    module: moduleName,
    page: pageName,
    state: 'DEV-only',
    title: pageName,
    docPath: '',
    devPath: path.relative(ROOT, devFile).replace(/\\/g, '/'),
    designPath: dev.designPath,
    route,
    registered: route ? Boolean(appRoutes[graphSide]?.has(route) || appRoutes[side]?.has(route)) : false,
    status
  };
  nodes.push(node);
  nodesByDir.set(dir, [node]);
  if (route) {
    const key = `${side}:${route}`;
    if (!nodesByRoute.has(key)) nodesByRoute.set(key, []);
    nodesByRoute.get(key).push(node);
  }
}

const edges = [];
const missingTargets = new Map();

for (const [dir, devFile] of devFiles.entries()) {
  const sources = nodesByDir.get(dir) || [];
  if (!sources.length) continue;
  const side = sources[0].side;
  const dev = parseDev(devFile);
  for (const edge of dev.edges) {
    const targetRoute = routeForSide(side, edge.targetDesignPath);
    const targetKey = `${side}:${targetRoute}`;
    let targets = nodesByRoute.get(targetKey) || [];
    if (!targets.length && side !== 'common') {
      const commonKey = `common:${routeAliases.common[targetRoute] || targetRoute}`;
      targets = nodesByRoute.get(commonKey) || [];
    }
    if (!targets.length && side === 'common') {
      targets = nodesByRoute.get(`patient:${targetRoute}`) || nodesByRoute.get(`doctor:${targetRoute}`) || [];
    }
    if (!targets.length) {
      const missingKey = `${side}:${targetRoute}`;
      if (!missingTargets.has(missingKey)) {
        const virtual = {
          id: slug(`missing:${missingKey}`),
          side,
          module: '未匹配目标',
          page: targetRoute,
          state: 'no png.txt',
          title: targetRoute,
          docPath: '',
          devPath: '',
          designPath: edge.targetDesignPath,
          route: targetRoute,
          registered: Boolean(appRoutes[side]?.has(targetRoute)),
          status: 'missing-doc'
        };
        missingTargets.set(missingKey, virtual);
      }
      targets = [missingTargets.get(missingKey)];
    }
    const selectedTargets = targets.length > 3 ? targets.slice(0, 1) : targets;
    for (const source of sources) {
      for (const target of selectedTargets) {
        edges.push({
          id: slug(`${source.id}->${target.id}:${edge.trigger}:${edge.kind}`),
          from: source.id,
          to: target.id,
          trigger: edge.trigger,
          kind: edge.kind,
          note: edge.note,
          targetDesignPath: edge.targetDesignPath,
          targetRoute,
          status: source.status === 'verified' && target.status === 'verified' ? 'verified' : target.status === 'missing-doc' ? 'missing-doc' : 'documented'
        });
      }
    }
  }
}

const virtualNodes = [...missingTargets.values()].sort((a, b) => a.title.localeCompare(b.title, 'zh-Hans-CN'));
nodes.push(...virtualNodes);

function aggregateGraph(rawNodes, rawEdges) {
  const groups = new Map();
  const oldToPage = new Map();
  const routeOwners = new Map();

  for (const node of rawNodes) {
    if (!node.route || node.side === 'common') continue;
    if (!routeOwners.has(node.route)) routeOwners.set(node.route, new Set());
    routeOwners.get(node.route).add(node.side);
  }

  for (const node of rawNodes) {
    const owners = node.route ? routeOwners.get(node.route) : null;
    const effectiveSide = node.side === 'common' && owners?.size === 1
      ? [...owners][0]
      : node.side;
    const key = node.status === 'missing-doc'
      ? `missing:${effectiveSide}:${node.route || node.designPath || node.title}`
      : node.route
        ? `${effectiveSide}:${node.route}`
        : `noroute:${effectiveSide}:${node.module}:${node.page}`;

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        raw: [],
        modules: new Set(),
        pages: new Set(),
        designPaths: new Set(),
        registered: false
      });
    }
    const group = groups.get(key);
    group.raw.push(node);
    group.modules.add(node.module);
    group.pages.add(node.page);
    if (node.designPath) group.designPaths.add(node.designPath);
    group.registered = group.registered || node.registered;
  }

  const pageNodes = [];
  for (const group of groups.values()) {
    const first = group.raw[0];
    const displaySide = group.raw.find((node) => node.side !== 'common')?.side || first.side;
    const statuses = group.raw.map((node) => node.status);
    const route = first.route;
    const title = group.pages.size === 1
      ? [...group.pages][0]
      : route || [...group.pages].slice(0, 2).join(' / ');
    const pageNode = {
      id: slug(`page:${group.key}`),
      side: displaySide,
      module: [...group.modules].join(' / '),
      page: title,
      title,
      route,
      designPath: [...group.designPaths][0] || first.designPath,
      registered: group.registered,
      status: aggregateStatus(statuses),
      stateCount: group.raw.length,
      pngCount: group.raw.filter((node) => node.docPath).length,
      devOnlyCount: group.raw.filter((node) => node.status === 'dev-only').length,
      evidence: evidenceByRoute[`${displaySide}:${route}`] || evidenceByRoute[group.key] || [],
      states: group.raw
        .map((node) => ({
          title: node.title,
          state: node.state,
          docPath: node.docPath,
          devPath: node.devPath,
          sourceSide: node.sourceSide || node.side,
          status: node.status,
          registered: node.registered
        }))
        .sort((a, b) => a.title.localeCompare(b.title, 'zh-Hans-CN'))
    };
    pageNodes.push(pageNode);
    for (const node of group.raw) oldToPage.set(node.id, pageNode.id);
  }

  const edgeMap = new Map();
  for (const edge of rawEdges) {
    const from = oldToPage.get(edge.from);
    const to = oldToPage.get(edge.to);
    if (!from || !to || from === to) continue;
    const key = `${from}->${to}:${edge.trigger}:${edge.kind}`;
    if (!edgeMap.has(key)) {
      edgeMap.set(key, {
        id: slug(`edge:${key}`),
        from,
        to,
        trigger: edge.trigger,
        kind: edge.kind,
        note: edge.note,
        targetDesignPath: edge.targetDesignPath,
        targetRoute: edge.targetRoute,
        status: edge.status,
        rawCount: 1
      });
    } else {
      const existing = edgeMap.get(key);
      existing.rawCount += 1;
      existing.status = aggregateStatus([existing.status, edge.status]);
    }
  }

  return {
    nodes: pageNodes.sort((a, b) => a.side.localeCompare(b.side) || a.module.localeCompare(b.module, 'zh-Hans-CN') || a.title.localeCompare(b.title, 'zh-Hans-CN')),
    edges: [...edgeMap.values()].sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to))
  };
}

function aggregateStatus(statuses) {
  if (statuses.includes('verified')) return 'verified';
  if (statuses.includes('partial')) return 'partial';
  if (statuses.includes('blocked')) return 'blocked';
  if (statuses.every((status) => status === 'missing-doc')) return 'missing-doc';
  if (statuses.every((status) => status === 'dev-only')) return 'dev-only';
  if (statuses.includes('dev-only') && statuses.length === 1) return 'dev-only';
  return 'documented';
}

const pageGraph = aggregateGraph(nodes, edges);

const data = {
  generatedAt: new Date().toISOString(),
  source: {
    pngTxtCount: pngFiles.length,
    devMdCount: devFiles.size,
    devOnlyCount: nodes.filter((node) => node.status === 'dev-only').length,
    stateNodeCount: nodes.length,
    pageNodeCount: pageGraph.nodes.length,
    patientRegisteredPages: appRoutes.patient.size,
    doctorRegisteredPages: appRoutes.doctor.size
  },
  legend: {
    verified: 'MCP natural path and console verified',
    partial: 'fixed or analyzed, runtime recheck pending',
    blocked: 'blocked by data condition or intentional mutation guard',
    documented: 'documented product page, not verified yet',
    'dev-only': 'DEV.md exists but no png.txt state was found',
    'missing-doc': 'route referenced by docs but no png.txt node was found'
  },
  nodes: pageGraph.nodes,
  edges: pageGraph.edges,
  unmatchedTargetCount: virtualNodes.length
};

fs.writeFileSync(OUT, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
console.log(`Wrote ${OUT}`);
console.log(JSON.stringify({
  nodes: pageGraph.nodes.length,
  rawStateNodes: nodes.length,
  documentedNodes: pngFiles.length,
  virtualNodes: virtualNodes.length,
  edges: pageGraph.edges.length,
  rawEdges: edges.length,
  unmatchedTargetCount: virtualNodes.length
}, null, 2));
