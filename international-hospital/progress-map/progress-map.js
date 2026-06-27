const statusLabel = {
  verified: '已验证',
  partial: '待复验',
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

init();

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
    stat('生成时间', new Date(generatedAt).toLocaleString('zh-CN'))
  ].join('');
}

function stat(label, value) {
  return `<div class="stat">${escapeHtml(label)}：<strong>${escapeHtml(String(value))}</strong></div>`;
}

function layoutGraph() {
  const nodes = [...state.data.nodes].sort(compareNodes);
  const lanes = buildLanes(nodes);
  const laneWidth = 250;
  const top = 72;
  const row = 104;
  const nodeHeight = 82;
  const leftPad = 28;
  const maxRows = Math.max(...lanes.map((lane) => lane.nodes.length), 1);
  const width = leftPad * 2 + lanes.length * laneWidth;
  const height = top + maxRows * row + nodeHeight + 36;

  els.stage.style.width = `${width}px`;
  els.stage.style.height = `${height}px`;
  els.edgeLayer.setAttribute('width', width);
  els.edgeLayer.setAttribute('height', height);
  els.edgeLayer.setAttribute('viewBox', `0 0 ${width} ${height}`);
  els.laneLayer.innerHTML = '';
  els.nodeLayer.innerHTML = '';
  state.positions.clear();

  lanes.forEach((lane, laneIndex) => {
    const x = leftPad + laneIndex * laneWidth;
    const label = document.createElement('div');
    label.className = 'lane-label';
    label.style.left = `${x}px`;
    label.style.top = '28px';
    label.textContent = `${sideLabel[lane.side] || lane.side} / ${lane.module}`;
    els.laneLayer.appendChild(label);

    lane.nodes.forEach((node, rowIndex) => {
      const y = top + rowIndex * row;
      state.positions.set(node.id, { x, y, cx: x + 105, cy: y + 41 });
      els.nodeLayer.appendChild(renderNode(node, x, y));
    });
  });

  drawEdges();
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
  return [...laneMap.values()].sort((a, b) => {
    const sideRank = sideIndex(a.side) - sideIndex(b.side);
    if (sideRank) return sideRank;
    return moduleIndex(a.module) - moduleIndex(b.module) || a.module.localeCompare(b.module, 'zh-Hans-CN');
  });
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
    (node.states || []).map((item) => `${item.title} ${item.docPath} ${item.devPath}`).join(' '),
    node.module,
    node.side,
    node.page
  ].join(' ').toLowerCase();
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

function drawEdges() {
  els.edgeLayer.innerHTML = '';
  const frag = document.createDocumentFragment();
  for (const edge of state.data.edges) {
    const from = state.positions.get(edge.from);
    const to = state.positions.get(edge.to);
    if (!from || !to) continue;
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', edgePath(from, to));
    path.setAttribute('class', `edge ${edge.status}`);
    path.dataset.from = edge.from;
    path.dataset.to = edge.to;
    path.dataset.status = edge.status;
    path.dataset.search = `${edge.trigger} ${edge.kind} ${edge.note} ${edge.targetRoute}`.toLowerCase();
    const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    title.textContent = `${edge.trigger} -> ${edge.targetRoute}`;
    path.appendChild(title);
    frag.appendChild(path);
  }
  els.edgeLayer.appendChild(frag);
}

function edgePath(from, to) {
  const dx = Math.max(60, Math.abs(to.cx - from.cx) * .45);
  const startX = from.cx + (to.cx >= from.cx ? 104 : -104);
  const endX = to.cx + (to.cx >= from.cx ? -104 : 104);
  return `M ${startX} ${from.cy} C ${startX + Math.sign(to.cx - from.cx || 1) * dx} ${from.cy}, ${endX - Math.sign(to.cx - from.cx || 1) * dx} ${to.cy}, ${endX} ${to.cy}`;
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
      <strong>状态清单</strong><span>${stateList(node.states || [])}</span>
    </div>
    <div class="edge-list">
      ${edgeList('出线', outgoing)}
      ${edgeList('入线', incoming)}
    </div>
  `;
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
    const matchesQuery = !query || edgeEl.dataset.search.includes(query);
    const matchesStatus = filterStatus === 'all' || edgeEl.dataset.status === filterStatus;
    const matchesRelated = !state.activeNodeId || edgeEl.dataset.from === state.activeNodeId || edgeEl.dataset.to === state.activeNodeId;
    edgeEl.classList.toggle('related', Boolean(state.activeNodeId && matchesRelated));
    edgeEl.classList.toggle('dim', !(matchesQuery && matchesStatus && matchesRelated));
  });
}

function relatedNodeSet(nodeId) {
  if (!nodeId) return new Set();
  const set = new Set([nodeId]);
  for (const edge of state.data.edges) {
    if (edge.from === nodeId) set.add(edge.to);
    if (edge.to === nodeId) set.add(edge.from);
  }
  return set;
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
    els.detail.innerHTML = '<h2>节点详情</h2><p>点击任一节点查看文档路径、注册路由、入线和出线。</p>';
    applyFilters();
  });
  window.addEventListener('resize', () => drawEdges());
}

function compareNodes(a, b) {
  return sideIndex(a.side) - sideIndex(b.side)
    || moduleIndex(a.module) - moduleIndex(b.module)
    || a.page.localeCompare(b.page, 'zh-Hans-CN')
    || a.state.localeCompare(b.state, 'zh-Hans-CN');
}

function sideIndex(side) {
  return { patient: 0, doctor: 1, common: 2 }[side] ?? 9;
}

function moduleIndex(moduleName) {
  const index = moduleOrder.findIndex((item) => moduleName.includes(item) || item.includes(moduleName));
  return index === -1 ? 99 : index;
}

function countBy(items, key) {
  return items.reduce((acc, item) => {
    acc[item[key]] = (acc[item[key]] || 0) + 1;
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
