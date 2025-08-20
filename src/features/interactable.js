export function initializeInteractables(){
  const editor = document.getElementById('qagentEditorCanvas');
  let svg = document.getElementById('wiresCanvas');

  let viewport = document.getElementById('qagentViewport');
  if (!viewport) {
    viewport = document.createElement('div');
    viewport.id = 'qagentViewport';
    viewport.className = 'qagent-viewport';
    editor.insertBefore(viewport, editor.firstChild);
    viewport.appendChild(svg);
    editor.querySelectorAll('.qagent-node').forEach(n => viewport.appendChild(n));
  }

  const state = { scale: 1, tx: 0, ty: 0 };
  const MIN_SCALE = 0.4, MAX_SCALE = 2.5;

  function applyTransform(){
    viewport.style.transform = `translate(${state.tx}px, ${state.ty}px) scale(${state.scale})`;
  }

  const connections = new Set();
  const inputMap = new Map();
  const outputMap = new Map();
  const DROP_RADIUS = 18;

  let wireDrag = null;
  let nodeCounter = 0;

  const spawnBtn = editor.querySelector('#spawnNodeBtn') || (() => {
    const b = document.createElement('button');
    b.id = 'spawnNodeBtn';
    b.className = 'spawn-node-btn';
    b.textContent = '+';
    editor.appendChild(b);
    return b;
  })();

  const palette = buildPalette();

  let overlay = editor.querySelector('#nodePalette');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'nodePalette';
    overlay.className = 'node-modal-overlay';
    overlay.innerHTML = `
      <div class="node-modal" role="dialog" aria-modal="true">
        <div class="node-modal-header">
          <div class="node-modal-title">Add node</div>
          <button class="node-modal-close" aria-label="Close">✕</button>
        </div>
        <input class="node-search" type="text" placeholder="Search nodes & constants…" />
        <div class="node-list"></div>
      </div>
    `;
    editor.appendChild(overlay);
  }
  const modal = overlay.querySelector('.node-modal');
  const search = overlay.querySelector('.node-search');
  const list = overlay.querySelector('.node-list');
  const closeBtn = overlay.querySelector('.node-modal-close');

  function openPalette(){
    renderList('');
    overlay.classList.add('open');
    search.value = '';
    setTimeout(() => search.focus(), 0);
  }
  function closePalette(){
    overlay.classList.remove('open');
  }
  spawnBtn.onclick = (e)=>{ e.stopPropagation(); openPalette(); };
  closeBtn.onclick = closePalette;
  overlay.addEventListener('click', (e)=>{ if (e.target === overlay) closePalette(); });
  editor.addEventListener('keydown', (e)=>{ if (overlay.classList.contains('open') && e.key === 'Escape') closePalette(); });

  function renderList(q){
    list.innerHTML = '';
    const items = filterPalette(palette, q);
    let lastGroup = '';
    items.forEach(item => {
      if (item.group !== lastGroup) {
        const g = document.createElement('div');
        g.className = 'node-group';
        g.textContent = item.group;
        list.appendChild(g);
        lastGroup = item.group;
      }
      const el = document.createElement('div');
      el.className = 'node-item';
      el.innerHTML = `<div>${item.label}</div><div class="badge">${item.badge}</div>`;
      el.onclick = () => {
        const { x, y } = centerContent();
        item.spawn(x + ((nodeCounter*20)%80), y + ((nodeCounter*12)%60));
        nodeCounter++;
        closePalette();
      };
      list.appendChild(el);
    });
    if (!items.length) {
      const empty = document.createElement('div');
      empty.className = 'node-item';
      empty.textContent = 'No matches';
      list.appendChild(empty);
    }
  }
  search.addEventListener('input', (e)=> renderList(e.target.value.trim().toLowerCase()));

  viewport.querySelectorAll('.qagent-node').forEach(makeNodeDraggable);

  editor.addEventListener('click', (e) => {
    const input = e.target.closest('.port.input');
    if (!input) return;
    e.preventDefault();
    e.stopPropagation();
  });
  editor.addEventListener('dblclick', (e) => {
    const input = e.target.closest('.port.input');
    if (!input) return;
    const conn = inputMap.get(input);
    if (conn) removeConnection(conn);
    e.preventDefault();
    e.stopPropagation();
  });

  editor.addEventListener('pointerdown', (e) => {
    const port = e.target.closest('.port');
    if (!port || !port.classList.contains('output')) return;
    if (e.button !== 0) return;

    e.preventDefault();
    editor.setPointerCapture(e.pointerId);

    const temp = createPath(true);
    svg.appendChild(temp);

    wireDrag = { fromEl: port, tempPath: temp };
    updateTempWireToPoint(e.clientX, e.clientY);
  });

  editor.addEventListener('pointermove', (e) => {
    if (!wireDrag) return;
    updateTempWireToPoint(e.clientX, e.clientY);
  });

  const endWireDrag = (e) => {
    if (!wireDrag) return;
    editor.releasePointerCapture?.(e.pointerId);

    const toPort = getDropTarget(e.clientX, e.clientY);
    const { fromEl, tempPath } = wireDrag;

    if (toPort && toPort !== fromEl && toPort.classList.contains('input')) {
      const existing = inputMap.get(toPort);
      if (existing) removeConnection(existing);

      tempPath.classList.remove('arrow');
      const conn = { path: tempPath, fromEl, toEl: toPort };
      connections.add(conn);
      inputMap.set(toPort, conn);
      let set = outputMap.get(fromEl);
      if (!set) { set = new Set(); outputMap.set(fromEl, set); }
      set.add(conn);

      refreshConnection(conn.path, conn.fromEl, conn.toEl);
    } else {
      tempPath.remove();
    }
    wireDrag = null;
  };
  editor.addEventListener('pointerup', endWireDrag);
  editor.addEventListener('pointercancel', endWireDrag);

  let pan = null;
  editor.addEventListener('pointerdown', (e) => {
    if (e.button !== 1) return;
    e.preventDefault();
    pan = { startX: e.clientX, startY: e.clientY, startTx: state.tx, startTy: state.ty, pointerId: e.pointerId };
    editor.setPointerCapture(e.pointerId);
    editor.style.cursor = 'grabbing';
  });
  editor.addEventListener('pointermove', (e) => {
    if (!pan) return;
    if (e.pointerId !== pan.pointerId) return;
    state.tx = pan.startTx + (e.clientX - pan.startX);
    state.ty = pan.startTy + (e.clientY - pan.startY);
    applyTransform();
  });
  function endPan(e){
    if (!pan) return;
    if (e.pointerId !== pan.pointerId) return;
    editor.releasePointerCapture?.(e.pointerId);
    pan = null;
    editor.style.cursor = '';
  }
  editor.addEventListener('pointerup', endPan);
  editor.addEventListener('pointercancel', endPan);

  editor.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = editor.getBoundingClientRect();
    const lx = e.clientX - rect.left;
    const ly = e.clientY - rect.top;

    const prev = state.scale;
    const factor = Math.exp(-e.deltaY * 0.001);
    const next = clamp(prev * factor, MIN_SCALE, MAX_SCALE);
    if (next === prev) return;

    const worldX = (lx - state.tx) / prev;
    const worldY = (ly - state.ty) / prev;

    state.scale = next;
    state.tx = lx - worldX * next;
    state.ty = ly - worldY * next;
    applyTransform();
  }, { passive: false });

  function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

  function removeConnection(conn){
    conn.path.remove();
    connections.delete(conn);
    if (inputMap.get(conn.toEl) === conn) inputMap.delete(conn.toEl);
    const set = outputMap.get(conn.fromEl);
    if (set) { set.delete(conn); if (!set.size) outputMap.delete(conn.fromEl); }
  }

  function createPath(withArrow = false) {
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('class', withArrow ? 'wire arrow' : 'wire');
    p.setAttribute('fill', 'none');
    p.setAttribute('stroke-width', '3');
    p.setAttribute('stroke-linecap', 'round');
    p.setAttribute('stroke', '#8fd3ff');
    p.setAttribute('color', '#8fd3ff');
    return p;
  }

  function clientToContent(x, y) {
    const r = editor.getBoundingClientRect();
    const lx = x - r.left, ly = y - r.top;
    return { x: (lx - state.tx) / state.scale, y: (ly - state.ty) / state.scale };
  }
  function centerContent() {
    const r = editor.getBoundingClientRect();
    return clientToContent(r.left + r.width/2, r.top + r.height/2);
  }

  function portCenter(portEl) {
    const pr = portEl.getBoundingClientRect();
    const er = editor.getBoundingClientRect();
    const lx = (pr.left - er.left) + pr.width/2;
    const ly = (pr.top  - er.top ) + pr.height/2;
    return { x: (lx - state.tx) / state.scale, y: (ly - state.ty) / state.scale };
  }

  function wirePath(x1, y1, x2, y2) {
    const dxBase = Math.abs(x2 - x1) * 0.5;
    const dx = clamp(dxBase, 40, 200);
    const c1x = x1 + (x2 >= x1 ? dx : -dx);
    const c2x = x2 - (x2 >= x1 ? dx : -dx);
    return `M ${x1} ${y1} C ${c1x} ${y1}, ${c2x} ${y2}, ${x2} ${y2}`;
  }

  function updateTempWireToPoint(clientX, clientY) {
    const { fromEl, tempPath } = wireDrag;
    const a = portCenter(fromEl);
    const b = clientToContent(clientX, clientY);
    tempPath.setAttribute('d', wirePath(a.x, a.y, b.x, b.y));
  }

  function refreshConnection(path, fromEl, toEl) {
    const a = portCenter(fromEl);
    const b = portCenter(toEl);
    path.setAttribute('d', wirePath(a.x, a.y, b.x, b.y));
  }

  function getDropTarget(clientX, clientY) {
    const direct = document.elementFromPoint(clientX, clientY)?.closest('.port.input');
    if (direct) return direct;

    const p = clientToContent(clientX, clientY);
    const inputs = viewport.querySelectorAll('.port.input');
    let best = null, bestD2 = Infinity;
    inputs.forEach(el => {
      const c = portCenter(el);
      const dx = c.x - p.x, dy = c.y - p.y;
      const d2 = dx*dx + dy*dy;
      if (d2 < bestD2) { bestD2 = d2; best = el; }
    });
    const effective = DROP_RADIUS / state.scale;
    return Math.sqrt(bestD2) <= effective ? best : null;
  }

  function makeNodeDraggable(node) {
    const header = node.querySelector('.header') || node;
    let start = null;
    header.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      header.setPointerCapture(e.pointerId);
      node.classList.add('dragging');
      start = { x: e.clientX, y: e.clientY, left: node.offsetLeft, top: node.offsetTop };
    });
    header.addEventListener('pointermove', (e) => {
      if (!start) return;
      const dx = (e.clientX - start.x) / state.scale;
      const dy = (e.clientY - start.y) / state.scale;
      node.style.left = (start.left + dx) + 'px';
      node.style.top  = (start.top  + dy) + 'px';
      connections.forEach(c => {
        if (node.contains(c.fromEl) || node.contains(c.toEl)) {
          refreshConnection(c.path, c.fromEl, c.toEl);
        }
      });
    });
    const endNodeDrag = () => { start = null; node.classList.remove('dragging'); };
    header.addEventListener('pointerup', endNodeDrag);
    header.addEventListener('pointercancel', endNodeDrag);
  }

  function spawnValueNode(x, y, opts = { type: 'string' }){
    const id = `V${++nodeCounter}`;
    const node = document.createElement('div');
    node.className = 'qagent-node value-node';
    node.style.left = `${x}px`;
    node.style.top  = `${y}px`;
    node.innerHTML = `
      <div class="header">Value</div>
      <div class="body">
        <div class="value-config">
          <select class="value-type">
            <option value="string">String</option>
            <option value="int">Integer</option>
            <option value="float">Float</option>
            <option value="bool">Boolean</option>
            <option value="list_string">List&lt;String&gt;</option>
            <option value="list_int">List&lt;Integer&gt;</option>
            <option value="list_float">List&lt;Float&gt;</option>
          </select>
          <input class="value-input" type="text" placeholder="value">
          <label class="value-bool hidden"><input type="checkbox" class="value-bool-input"> true / false</label>
        </div>
        <div class="port-row output">
          <span>value</span>
          <span class="port output" data-port-id="${id}:out:value"></span>
        </div>
      </div>
    `;
    viewport.appendChild(node);
    makeNodeDraggable(node);
    setupValueUI(node, opts.type);
  }

  function setupValueUI(node, initialType){
    const typeSel  = node.querySelector('.value-type');
    const textInp  = node.querySelector('.value-input');
    const boolWrap = node.querySelector('.value-bool');
    const updateUI = () => {
      const t = typeSel.value;
      if (t === 'bool') {
        textInp.classList.add('hidden');
        boolWrap.classList.remove('hidden');
      } else {
        boolWrap.classList.add('hidden');
        textInp.classList.remove('hidden');
        textInp.placeholder =
          t.startsWith('list_') ? 'a,b,c' :
          t === 'int' ? '123' :
          t === 'float' ? '3.14' : 'value';
      }
    };
    if (initialType) typeSel.value = initialType;
    updateUI();
    typeSel.addEventListener('change', updateUI);
  }

  function spawnDisplayNode(x, y){
    const id = `D${++nodeCounter}`;
    const node = document.createElement('div');
    node.className = 'qagent-node';
    node.style.left = `${x}px`;
    node.style.top  = `${y}px`;
    node.innerHTML = `
      <div class="header">Display</div>
      <div class="body">
        <div class="port-row">
          <span>value</span>
          <span class="port input" data-port-id="${id}:in:value"></span>
        </div>
      </div>
    `;
    viewport.appendChild(node);
    makeNodeDraggable(node);
  }

  function spawnMathAddNode(x, y){
    const id = `A${++nodeCounter}`;
    const node = document.createElement('div');
    node.className = 'qagent-node';
    node.style.left = `${x}px`;
    node.style.top  = `${y}px`;
    node.innerHTML = `
      <div class="header">Add</div>
      <div class="body">
        <div class="port-row">
          <span>a</span>
          <span class="port input" data-port-id="${id}:in:a"></span>
        </div>
        <div class="port-row">
          <span>b</span>
          <span class="port input" data-port-id="${id}:in:b"></span>
        </div>
        <div class="port-row output">
          <span>sum</span>
          <span class="port output" data-port-id="${id}:out:sum"></span>
        </div>
      </div>
    `;
    viewport.appendChild(node);
    makeNodeDraggable(node);
  }

  function buildPalette(){
    const items = [
      { id:'const:string', label:'String', group:'Constants', badge:'constant', spawn:(x,y)=>spawnValueNode(x,y,{type:'string'}) },
      { id:'const:int',    label:'Integer', group:'Constants', badge:'constant', spawn:(x,y)=>spawnValueNode(x,y,{type:'int'}) },
      { id:'const:float',  label:'Float',   group:'Constants', badge:'constant', spawn:(x,y)=>spawnValueNode(x,y,{type:'float'}) },
      { id:'const:bool',   label:'Boolean', group:'Constants', badge:'constant', spawn:(x,y)=>spawnValueNode(x,y,{type:'bool'}) },
      { id:'const:list_s', label:'List<String>', group:'Constants', badge:'constant', spawn:(x,y)=>spawnValueNode(x,y,{type:'list_string'}) },
      { id:'const:list_i', label:'List<Integer>', group:'Constants', badge:'constant', spawn:(x,y)=>spawnValueNode(x,y,{type:'list_int'}) },
      { id:'const:list_f', label:'List<Float>', group:'Constants', badge:'constant', spawn:(x,y)=>spawnValueNode(x,y,{type:'list_float'}) },

      { id:'node:add',     label:'Add (a + b)', group:'Nodes', badge:'node', spawn:spawnMathAddNode },
      { id:'node:display', label:'Display',     group:'Nodes', badge:'node', spawn:spawnDisplayNode }
    ];
    return items;
  }
  function filterPalette(items, q){
    if (!q) return items;
    const t = q.toLowerCase();
    return items.filter(i =>
      i.label.toLowerCase().includes(t) ||
      i.group.toLowerCase().includes(t) ||
      i.id.toLowerCase().includes(t)
    );
  }

  
}
