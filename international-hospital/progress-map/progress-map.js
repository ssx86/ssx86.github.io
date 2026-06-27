const statusLabel = {
  verified: '已验证',
  partial: '部分验证',
  blocked: '阻塞',
  documented: '未验证',
  'dev-only': '缺少 png.txt',
  'missing-doc': '缺少文档'
};

const sideLabel = {
  patient: '患者端',
  doctor: '医生端',
  common: '通用'
};

const moduleOrder = [
  '首页',
  '登录',
  '预诊',
  '问诊',
  '个人中心',
  '处方',
  '购药',
  '缴费',
  '报告',
  '慢病',
  '患者管理',
  '病历',
  '实名认证',
  '资讯',
  '验证码输入',
  '未匹配目标'
];

const state = {
  data: null,
  positions: new Map(),
  activeNodeId: null,
  query: '',
  status: 'all'
};

const els = {
  summary: document.querySelector('#summary'),
  graphMeta: document.querySelector('#graphMeta'),
  stage: document.querySelector('#graphStage'),
  edgeLayer: document.querySelector('#edgeLayer'),
  laneLayer: document.querySelector('#laneLayer'),
  nodeLayer: document.querySelector('#nodeLayer'),
  detail: document.querySelector('#detailPanel'),
  search: document.querySelector('#searchInput'),
  status: document.querySelector('#statusFilter'),
  reset: document.querySelector('#resetView')
};

init().catch((error) => {
  console.error(error);
  els.detail.innerHTML = `<h2>图谱加载失败</h2><p>${escapeHtml(error.message)}</p>`;
});

async function init() {
  const response = await fetch('./graph-data.json', { cache: 'no-store' });
  if (!response.ok) throw new Error(`graph-data.json load failed: ${response.status}`);
  state.data = await response.json();
  renderSummary();
  layoutGraph();
  bindEvents();
}

function renderSummary() {
  const { source, nodes, edges, unmatchedTargetCount, generatedAt } = state.data;
  const byStatus = countBy(nodes, 'status');
  els.summary.innerHTML = [
    stat('png.txt 页面状态', source.pngTxtCount),
    stat('DEV.md', source.devMdCount),
    stat('页面节点', nodes.length),
    stat('状态节点', source.stateNodeCount),
    stat('关系线', edges.length),
    stat('患者注册页', source.patientRegisteredPages),
    stat('医生注册页', source.doctorRegisteredPages),
    stat('缺文档目标', unmatchedTargetCount),
    stat('已验证节点', byStatus.verified || 0),
    stat('部分验证节点', byStatus.partial || 0),
    stat('生成时间', new Date(generatedAt).toLocaleString('zh-CN'))
  ].join('');
}

function stat(label, value) {
  return `<div class="stat">${escapeHtml(label)}：<strong>${escapeHtml(String(value))}</strong></div>`;
}

function layoutGraph() {
  const nodes = [...state.data.nodes].sort(compareNodes);
  const lanes = buildLanes(nodes);
  const left = 36;
  const top = 76;
  const column = 254;
  const row = 112;
  const nodeHeight = 82;
  const width = Math.max(lanes.length * column + left * 2, 960);
  const maxRows = Math.max(...lanes.map((lane) => lane.nodes.length), 1);
  const height = top + maxRows * row + nodeHeight + 36;

  els.stage.style.width = `${width}px`;
  els.stage.style.height = `${height}px`;
  els.edgeLayer.setAttribute('width', width);
  els.edgeLayer.setAttribute('height', height);
  els.edgeLayer.setAttribute('viewBox', `0 0 ${width} ${height}`);
  els.edgeLayer.innerHTML = '';
  els.laneLayer.innerHTML = '';
  els.nodeLayer.innerHTML = '';
  state.positions.clear();

  lanes.forEach((lane, laneIndex) => {
    const x = left + laneIndex * column;
    const laneEl = document.createElement('div');
    laneEl.className = `lane ${lane.side}`;
    laneEl.style.left = `${x}px`;
    laneEl.style.top = '18px';
    laneEl.style.width = '210px';
    laneEl.textContent = `${sideLabel[lane.side] || lane.side} / ${lane.module}`;
    els.laneLayer.appendChild(laneEl);

    lane.nodes.forEach((node, rowIndex) => {
      const y = top + rowIndex * row;
      state.positions.set(node.id, { x, y, cx: x + 105, cy: y + 41 });
      els.nodeLayer.appendChild(renderNode(node, x, y));
    });
  });

  renderEdges();
  applyFilters();
  els.graphMeta.textContent = `${lanes.length} 组模块，${nodes.length} 个节点，${state.data.edges.length} 条关系线`;
}

function buildLanes(nodes) {
  const laneMap = new Map();
  for (const node of nodes) {
    const key = `${node.side}::${node.module}`;
    if (!laneMap.has(key)) laneMap.set(key, { side: node.side, module: node.module, nodes: [] });
    laneMap.get(key).nodes.push(node);
  }
  const lanes = [...laneMap.values()];
  lanes.sort((a, b) => sideRank(a.side) - sideRank(b.side) || moduleRank(a.module) - moduleRank(b.module) || a.module.localeCompare(b.module, 'zh-CN'));
  for (const lane of lanes) lane.nodes.sort(compareNodes);
  return lanes;
}

function renderNode(node, x, y) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = `node ${node.status}`;
  el.dataset.nodeId = node.id;
  el.dataset.status = node.status;
  el.dataset.search = [
    node.title,
    node.route,
    node.designPath,
    statusLabel[node.status],
    (node.states || []).map((item) => `${item.title} ${item.docPath} ${item.devPath}`).join(' '),
    node.module,
    node.side,
    node.page
  ].filter(Boolean).join(' ').toLowerCase();
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.innerHTML = `
    <span class="node-title">${escapeHtml(node.title)}</span>
    <span class="node-route">${escapeHtml(node.route || node.designPath || '未映射路由')}</span>
    <span class="node-state">${escapeHtml(`${node.stateCount || 1} 个状态 / ${node.pngCount || 0} 个 png.txt`)}</span>
    <span class="status-pill"><i class="dot ${node.status}"></i>${escapeHtml(statusLabel[node.status] || node.status)}</span>
  `;
  el.addEventListener('click', () => selectNode(node.id));
  return el;
}

function renderEdges() {
  for (const edge of state.data.edges) {
    const from = state.positions.get(edge.from);
    const to = state.positions.get(edge.to);
    if (!from || !to) continue;
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('class', `edge ${edge.status || 'documented'}`);
    path.setAttribute('data-from', edge.from);
    path.setAttribute('data-to', edge.to);
    path.setAttribute('data-status', edge.status || 'documented');
    path.setAttribute('d', edgePath(from, to));
    els.edgeLayer.appendChild(path);
  }
}

function edgePath(from, to) {
  const startX = from.cx + (to.cx >= from.cx ? 104 : -104);
  const endX = to.cx + (to.cx >= from.cx ? -104 : 104);
  const control = Math.max(64, Math.abs(endX - startX) * 0.42);
  const c1 = startX + (to.cx >= from.cx ? control : -control);
  const c2 = endX - (to.cx >= from.cx ? control : -control);
  return `M ${startX} ${from.cy} C ${c1} ${from.cy}, ${c2} ${to.cy}, ${endX} ${to.cy}`;
}

function selectNode(nodeId) {
  state.activeNodeId = nodeId;
  document.querySelectorAll('.node').forEach((nodeEl) => {
    nodeEl.classList.toggle('active', nodeEl.dataset.nodeId === nodeId);
  });
  applyFilters();
  renderDetail(nodeId);
}

function renderDetail(nodeId) {
  const node = state.data.nodes.find((item) => item.id === nodeId);
  const outgoing = state.data.edges.filter((edge) => edge.from === nodeId);
  const incoming = state.data.edges.filter((edge) => edge.to === nodeId);
  els.detail.innerHTML = `
    <h2>${escapeHtml(node.title)}</h2>
    <div class="detail-grid">
      <strong>状态</strong><span>${escapeHtml(statusLabel[node.status] || node.status)}</span>
      <strong>端</strong><span>${escapeHtml(sideLabel[node.side] || node.side)}</span>
      <strong>模块</strong><span>${escapeHtml(node.module)}</span>
      <strong>注册路由</strong><span>${escapeHtml(node.route || '未映射')}</span>
      <strong>设计路径</strong><span>${escapeHtml(node.designPath || '无 DEV Path')}</span>
      <strong>注册状态</strong><span>${node.registered ? '已在 app.json 注册' : '未确认注册或为旧设计路径'}</span>
      <strong>状态数量</strong><span>${escapeHtml(`${node.stateCount || 1} 个状态，其中 ${node.pngCount || 0} 个 png.txt，${node.devOnlyCount || 0} 个 DEV-only`)}</span>
      <strong>截图证据</strong><span>${evidenceList(node.evidence || [])}</span>
      <strong>状态清单</strong><span>${stateList(node.states || [])}</span>
    </div>
    <div class="edge-list">
      ${edgeList('出线', outgoing)}
      ${edgeList('入线', incoming)}
    </div>
  `;
}

function evidenceList(evidence) {
  if (!evidence.length) return '暂无 MCP 截图';
  return evidence.map((item) => {
    if (item.type === 'runtime') {
      return `
        <div class="runtime-evidence">
          <strong>${escapeHtml(item.title || '运行时证据')}</strong>
          <p>${escapeHtml(item.summary || '已记录 page_data / console 证据，截图缺失。')}</p>
        </div>
      `;
    }
    return `
      <figure class="evidence-shot">
        <img src="${escapeAttribute(item.path)}" alt="${escapeAttribute(item.title || 'MCP 截图证据')}" loading="lazy">
        <figcaption>${escapeHtml(item.title || item.path)}</figcaption>
      </figure>
    `;
  }).join('');
}

function stateList(states) {
  if (!states.length) return '无';
  return states.map((item) => {
    const pathText = item.docPath || item.devPath || '无路径';
    return `<span class="state-row">${escapeHtml(item.title)}<br><em>${escapeHtml(pathText)}</em></span>`;
  }).join('');
}

function edgeList(title, edges) {
  if (!edges.length) return `<div class="edge-item">${escapeHtml(title)}：无</div>`;
  const lines = edges.slice(0, 18).map((edge) => {
    const peer = state.data.nodes.find((node) => node.id === (title === '出线' ? edge.to : edge.from));
    return `<div class="edge-item"><strong>${escapeHtml(edge.trigger)}</strong> ${escapeHtml(edge.kind)} ${escapeHtml(peer?.title || edge.targetRoute)}<br>${escapeHtml(edge.note || edge.targetRoute || '')}</div>`;
  }).join('');
  const more = edges.length > 18 ? `<div class="edge-item">还有 ${edges.length - 18} 条关系未展开。</div>` : '';
  return `<div><h3>${escapeHtml(title)} ${edges.length}</h3>${lines}${more}</div>`;
}

function bindEvents() {
  els.search.addEventListener('input', (event) => {
    state.query = event.target.value;
    applyFilters();
  });
  els.status.addEventListener('change', (event) => {
    state.status = event.target.value;
    applyFilters();
  });
  els.reset.addEventListener('click', () => {
    state.activeNodeId = null;
    document.querySelectorAll('.node.active').forEach((node) => node.classList.remove('active'));
    renderDetailFallback();
    applyFilters();
  });
}

function applyFilters() {
  const query = state.query.trim().toLowerCase();
  const filterStatus = state.status;
  const related = relatedNodeSet(state.activeNodeId);

  document.querySelectorAll('.node').forEach((nodeEl) => {
    const matchesQuery = !query || nodeEl.dataset.search.includes(query);
    const matchesStatus = filterStatus === 'all' || nodeEl.dataset.status === filterStatus;
    const matchesRelated = !state.activeNodeId || related.has(nodeEl.dataset.nodeId);
    nodeEl.classList.toggle('dim', !(matchesQuery && matchesStatus && matchesRelated));
  });

  document.querySelectorAll('.edge').forEach((edgeEl) => {
    const fromVisible = related.has(edgeEl.dataset.from) || !state.activeNodeId;
    const toVisible = related.has(edgeEl.dataset.to) || !state.activeNodeId;
    const statusVisible = filterStatus === 'all' || edgeEl.dataset.status === filterStatus;
    edgeEl.classList.toggle('dim', !(fromVisible && toVisible && statusVisible));
  });
}

function relatedNodeSet(nodeId) {
  if (!nodeId) return new Set(state.data.nodes.map((node) => node.id));
  const set = new Set([nodeId]);
  for (const edge of state.data.edges) {
    if (edge.from === nodeId) set.add(edge.to);
    if (edge.to === nodeId) set.add(edge.from);
  }
  return set;
}

function renderDetailFallback() {
  els.detail.innerHTML = '<h2>节点详情</h2><p>点击任一节点查看文档路径、注册路由、截图证据、入线和出线。</p>';
}

function compareNodes(a, b) {
  return sideRank(a.side) - sideRank(b.side)
    || moduleRank(a.module) - moduleRank(b.module)
    || String(a.route || a.designPath || '').localeCompare(String(b.route || b.designPath || ''), 'zh-CN')
    || String(a.title || '').localeCompare(String(b.title || ''), 'zh-CN');
}

function sideRank(side) {
  return { patient: 0, doctor: 1, common: 2 }[side] ?? 9;
}

function moduleRank(module) {
  const index = moduleOrder.indexOf(module);
  return index === -1 ? 99 : index;
}

function countBy(items, key) {
  return items.reduce((acc, item) => {
    const value = item[key] || 'unknown';
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}
