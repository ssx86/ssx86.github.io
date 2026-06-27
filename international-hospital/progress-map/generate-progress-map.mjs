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
    'patient:pages/medicine/order-list/index',
    'doctor:pages/index/index',
    'doctor:pages/profile/index/index',
    'doctor:pages/profile/verify/index',
    'doctor:pages/profile/real-name/index',
    'doctor:pages/patient/list/index',
    'doctor:pages/consult/doctor-chat/index',
    'doctor:pages/consult/records/index',
    'doctor:pages/medical-record/edit/index',
    'doctor:pages/consult/exam-apply/index',
    'doctor:pages/consult/exam-select/index'
  ]),
  partial: new Set([]),
  blocked: new Set([
    'doctor:pages/consult/reject/index',
    'doctor:pages/consult/accept-dialog/index'
  ])
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
  const routeKey = route ? `${side}:${route}` : '';
  let status = 'documented';
  if (statusByRoute.verified.has(routeKey)) status = 'verified';
  else if (statusByRoute.partial.has(routeKey)) status = 'partial';
  else if (statusByRoute.blocked.has(routeKey)) status = 'blocked';

  const node = {
    id: slug(rel),
    side,
    module: moduleName,
    page: pageName,
    state: stateName,
    title: stateName === pageName ? pageName : `${pageName} / ${stateName}`,
    docPath: rel.replace(/\\/g, '/'),
    devPath: devFile ? path.relative(ROOT, devFile).replace(/\\/g, '/') : '',
    designPath: dev.designPath,
    route,
    registered: route ? Boolean(appRoutes[side]?.has(route)) : false,
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
  const node = {
    id: slug(`dev-only:${relDir}`),
    side,
    module: moduleName,
    page: pageName,
    state: 'DEV-only',
    title: pageName,
    docPath: '',
    devPath: path.relative(ROOT, devFile).replace(/\\/g, '/'),
    designPath: dev.designPath,
    route,
    registered: route ? Boolean(appRoutes[side]?.has(route)) : false,
    status: 'dev-only'
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

  for (const node of rawNodes) {
    const key = node.status === 'missing-doc'
      ? `missing:${node.side}:${node.route || node.designPath || node.title}`
      : node.route
        ? `${node.side}:${node.route}`
        : `noroute:${node.side}:${node.module}:${node.page}`;

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
    const statuses = group.raw.map((node) => node.status);
    const route = first.route;
    const title = group.pages.size === 1
      ? [...group.pages][0]
      : route || [...group.pages].slice(0, 2).join(' / ');
    const pageNode = {
      id: slug(`page:${group.key}`),
      side: first.side,
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
      states: group.raw
        .map((node) => ({
          title: node.title,
          state: node.state,
          docPath: node.docPath,
          devPath: node.devPath,
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
