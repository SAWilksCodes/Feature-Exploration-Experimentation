(() => {
  const FEATURED = 'Q-3C19E070E013F3B7';
  const AS_OF = '2026-10-10';
  const fmtInt = d3.format(',');
  const fmtPct = d3.format('.0%');
  const fmtMoney = d3.format('$,.0f');
  const fmtMoney2 = d3.format('$,.2f');
  const fmtSigned = v => (v > 0 ? '+' : v < 0 ? '−' : '') + fmtMoney(Math.abs(v));
  const fmtPts = v => (v > 0 ? '+' : v < 0 ? '−' : '') + d3.format('.1f')(Math.abs(v) * 100) + ' pts';
  const fmtDate = s => d3.utcFormat('%b %-d')(new Date(s + 'T00:00:00Z'));
  const LINE_LABEL = { all: 'All lines', auto: 'Auto', home: 'Home', renters: 'Renters', dwelling_fire: 'Dwelling fire', motorcycle: 'Motorcycle / RV / Boat', umbrella: 'Umbrella' };
  const STAGE_LABEL = { intake: 'Intake', needs_review: 'Needs review', quoting: 'Quoting', compared: 'Compared', client_ready: 'Client ready', sold: 'Sold', lost: 'Lost' };
  const enc = s => String(s).replace(/%/g, '%25').replace(/&/g, '%26').replace(/=/g, '%3D');
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  const td = (text, cls) => el('td', cls, text);

  const fail = box => { box.classList.remove('dash-skeleton'); box.replaceChildren(el('div', 'cq-fail', 'Failed to load')); };
  const ready = (...ids) => ids.every(id => dash.data(id).status === 'ok');
  const failed = (...ids) => ids.some(id => dash.data(id).status === 'error');

  // ---------- tabs ----------
  const tabs = [...document.querySelectorAll('.cq-tab')];
  let current = 'pipeline';
  const show = (page, link) => {
    current = page;
    tabs.forEach(t => t.setAttribute('aria-selected', String(t.dataset.page === page)));
    document.querySelectorAll('.cq-page').forEach(p => { p.hidden = p.id !== page; });
    if (link) dash.setLink(page);
    draw();
  };
  tabs.forEach(t => t.addEventListener('click', () => show(t.dataset.page, true)));

  // Fill marked tiles from one row of a calculation
  function tiles(id, scope, fmt) {
    const d = dash.data(id);
    const els = [...scope].filter(e => e.dataset.source === id);
    if (d.status !== 'ok') {
      els.forEach(e => { if (d.status === 'error') fail(e); else if (e.classList.contains('cq-value')) { e.classList.add('dash-skeleton'); e.textContent = '—'; } });
      return null;
    }
    return els;
  }

  // ---------- horizontal bars ----------
  function hbars(box, rows, { label, value, fmt, color, tip }) {
    box.replaceChildren();
    const width = box.clientWidth || 600;
    const rowH = 30, gap = 8;
    const height = rows.length * (rowH + gap);
    box.style.minHeight = height + 'px';
    const svg = d3.select(box).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${width} ${height}`);
    const probe = svg.append('text').style('font-size', 'var(--cds-font-size-caption)');
    const labelW = d3.max(rows, r => { probe.text(label(r)); return probe.node().getComputedTextLength(); }) + 12;
    const valW = d3.max(rows, r => { probe.text(fmt(value(r))); return probe.node().getComputedTextLength(); }) + 10;
    probe.remove();
    const x = d3.scaleLinear([0, d3.max(rows, value) || 1], [0, Math.max(10, width - labelW - valW)]);
    const tipEl = el('div', 'cq-tip'); box.appendChild(tipEl);
    const g = svg.selectAll('g').data(rows).join('g').attr('transform', (r, i) => `translate(0,${i * (rowH + gap)})`);
    g.append('text').attr('x', labelW - 12).attr('y', rowH / 2).attr('dy', '0.32em').attr('text-anchor', 'end')
      .attr('fill', 'var(--color-fg)').style('font-size', 'var(--cds-font-size-caption)').text(label);
    g.append('rect').attr('x', labelW).attr('y', 4).attr('height', rowH - 8).attr('rx', 4)
      .attr('width', r => Math.max(2, x(value(r)))).attr('fill', color)
      .on('mouseenter mousemove', (ev, r) => {
        tipEl.replaceChildren(...tip(r).map((t, i) => el('div', i === 0 ? 'cq-tip-k' : '', t)));
        tipEl.style.display = 'block';
        const [mx, my] = d3.pointer(ev, box);
        tipEl.style.left = Math.max(0, Math.min(mx + 12, box.clientWidth - tipEl.offsetWidth)) + 'px';
        tipEl.style.top = Math.max(0, my - tipEl.offsetHeight - 8) + 'px';
      })
      .on('mouseleave', () => { tipEl.style.display = 'none'; });
    g.append('text').attr('x', r => labelW + Math.max(2, x(value(r))) + 6).attr('y', rowH / 2).attr('dy', '0.32em')
      .attr('fill', 'var(--color-fg-muted)').style('font-size', 'var(--cds-font-size-caption)').text(r => fmt(value(r)));
  }

  // ---------- Pipeline ----------
  const ownerSel = document.getElementById('owner-filter');
  ownerSel.addEventListener('change', () => dash.setParams({ owner: ownerSel.value || null }));

  function drawPipeline() {
    const page = document.getElementById('pipeline');
    const k = tiles('pipeline_kpis', page.querySelectorAll('[data-source]'));
    if (k) {
      const row = dash.data('pipeline_kpis').data[0];
      k.forEach(e => {
        e.classList.remove('dash-skeleton');
        const v = row[e.dataset.field];
        e.textContent = e.dataset.field === 'win_rate' ? fmtPct(v) : fmtInt(v);
        if (e.dataset.field === 'overdue') e.classList.toggle('cq-bad', v > 0);
      });
    }

    const box = document.getElementById('stage-chart');
    const s = dash.data('by_stage');
    if (s.status === 'error') fail(box);
    else if (s.status !== 'ok') { box.replaceChildren(); box.classList.add('dash-skeleton'); }
    else {
      box.classList.remove('dash-skeleton');
      hbars(box, s.data, {
        label: r => r.label, value: r => r.cases, fmt: fmtInt,
        color: r => r.is_open ? dash.colors[0] : 'var(--cds-chart-muted)',
        tip: r => [r.label, `${fmtInt(r.cases)} case${r.cases === 1 ? '' : 's'}`, `${fmtInt(r.avg_days_in_stage)} days in stage on average`],
      });
    }

    const c = dash.data('cases');
    const body = document.querySelector('#open-table tbody');
    body.replaceChildren();
    if (c.status !== 'ok') return;
    const owners = [...new Set(c.data.map(r => r.owner))].sort();
    ownerSel.replaceChildren(new Option('All owners', ''), ...owners.map(o => new Option(o, o)));
    const owner = dash.params().owner || '';
    ownerSel.value = owner;
    const open = c.data.filter(r => r.stage !== 'sold' && r.stage !== 'lost' && (!owner || r.owner === owner))
      .sort((a, b) => a.next_action_due < b.next_action_due ? -1 : a.next_action_due > b.next_action_due ? 1 : 0);
    for (const r of open) {
      const tr = el('tr'); tr.dataset.key = r.case_id;
      const due = td(fmtDate(r.next_action_due)); if (r.next_action_due < AS_OF) due.classList.add('cq-bad');
      tr.append(td(r.client), td(r.lines, 'cq-hide-narrow'), td(STAGE_LABEL[r.stage] || r.stage), td(r.owner, 'cq-hide-narrow'),
        td(fmtInt(Number(r.days_in_stage)), 'cq-num'), td(r.next_action, 'cq-hide-narrow'), due);
      body.appendChild(tr);
    }
  }

  // ---------- Quote results ----------
  const lineSel = document.getElementById('line-filter');
  lineSel.addEventListener('change', () => dash.setParams({ line: lineSel.value }));

  function barCell(v, max, fmt) {
    const cell = el('td', 'cq-num');
    if (v === null || v === undefined) { cell.textContent = '—'; return cell; }
    const wrap = el('div', 'cq-barcell');
    const bar = el('div', 'cq-bar'); bar.style.width = Math.max(2, (v / max) * 60) + 'px';
    wrap.append(bar, el('span', '', fmt(v))); cell.appendChild(wrap);
    return cell;
  }

  function drawQuotes() {
    const line = dash.params().line || 'all';
    const page = document.getElementById('quotes');
    page.querySelectorAll('.q-tile').forEach(e => e.dataset.where = 'line=' + enc(line));

    if (dash.data('quote_kpis').status === 'ok') {
      const lines = dash.data('quote_kpis').data.map(r => r.line).sort((a, b) => a === 'all' ? -1 : b === 'all' ? 1 : (LINE_LABEL[a] || a).localeCompare(LINE_LABEL[b] || b));
      lineSel.replaceChildren(...lines.map(l => new Option(LINE_LABEL[l] || l, l)));
      lineSel.value = line;
    }
    for (const id of ['quote_kpis', 'savings_by_line']) {
      const els = tiles(id, page.querySelectorAll('.q-tile'));
      if (!els) continue;
      const row = dash.data(id).data.find(r => r.line === line);
      els.forEach(e => {
        e.classList.remove('dash-skeleton');
        const f = e.dataset.field;
        if (!row) { e.textContent = '—'; return; }
        const v = row[f];
        e.textContent = f === 'requested' ? fmtInt(v) : f === 'avg_savings' ? fmtMoney(v)
          : fmtPct(v);
      });
    }

    const body = document.querySelector('#carrier-table tbody');
    body.replaceChildren();
    if (dash.data('carrier_results').status === 'ok') {
      const rows = dash.data('carrier_results').data.filter(r => r.line === line).sort((a, b) => b.requested - a.requested);
      for (const r of rows) {
        const tr = el('tr'); tr.dataset.key = enc(r.line).replace(/,/g, '%2C') + ',' + enc(r.carrier).replace(/,/g, '%2C');
        tr.append(td(r.carrier), td(fmtInt(r.requested), 'cq-num cq-hide-narrow'), td(fmtInt(r.declined), 'cq-num cq-hide-narrow'),
          barCell(r.quote_rate, 1, fmtPct), barCell(r.top3_rate, 1, fmtPct), td(fmtInt(r.wins), 'cq-num cq-hide-narrow'), barCell(r.win_rate, 1, fmtPct));
        body.appendChild(tr);
      }
    }

    const box = document.getElementById('savings-chart');
    const sv = dash.data('savings_by_line');
    if (sv.status === 'error') fail(box);
    else if (sv.status !== 'ok') { box.replaceChildren(); box.classList.add('dash-skeleton'); }
    else {
      box.classList.remove('dash-skeleton');
      const rows = sv.data.filter(r => r.line !== 'all').sort((a, b) => b.avg_savings - a.avg_savings);
      hbars(box, rows, {
        label: r => LINE_LABEL[r.line] || r.line, value: r => Math.max(0, r.avg_savings), fmt: fmtMoney,
        color: r => r.line === line ? dash.colors[0] : (line === 'all' ? dash.colors[0] : 'var(--cds-chart-muted)'),
        tip: r => [LINE_LABEL[r.line] || r.line, `Current ${fmtMoney(r.avg_current)} → best ${fmtMoney(r.avg_best)}`, `Saves ${fmtMoney(r.avg_savings)} (${fmtPct(r.avg_savings_pct)}) on average`, `${fmtInt(r.comparisons)} comparisons`],
      });
    }
  }

  // ---------- Case comparison ----------
  const covSel = document.getElementById('cov-line');
  covSel.addEventListener('change', () => drawCoverage());

  function changeCell(v, note) {
    const cell = el('td', 'cq-num');
    if (v === null || v === undefined) { cell.textContent = note || '—'; cell.classList.add('cq-warn'); if (!note) cell.className = 'cq-num'; return cell; }
    cell.textContent = fmtSigned(v);
    cell.classList.add(v < 0 ? 'cq-ok' : v > 0 ? 'cq-bad' : 'cq-num');
    return cell;
  }

  function drawCase() {
    const page = document.getElementById('case');
    page.querySelectorAll('#case-head [data-source="cases"]').forEach(e => {
      const c = dash.data('cases');
      if (c.status !== 'ok') return;
      const row = c.data.find(r => r.case_id === FEATURED);
      e.classList.remove('dash-skeleton');
      e.textContent = row ? row[e.dataset.field] : '—';
    });

    const cbody = document.querySelector('#columns-table tbody');
    cbody.replaceChildren();
    if (dash.data('case_columns').status === 'ok') {
      for (const r of dash.data('case_columns').data) {
        const tr = el('tr'); tr.dataset.key = r.column;
        if (r.note === 'Lines differ') tr.className = 'cq-muted';
        tr.append(td(r.column), td(r.lines), td(fmtMoney(r.total_annual), 'cq-num'),
          r.column === 'Current' ? td('—', 'cq-num') : changeCell(r.change_vs_current, r.note === 'Lines differ' ? 'Lines differ' : null));
        cbody.appendChild(tr);
      }
    }

    const grid = document.getElementById('line-cards');
    grid.replaceChildren();
    const cl = dash.data('case_lines');
    if (cl.status === 'ok') {
      for (const line of ['home', 'auto', 'umbrella']) {
        const rows = cl.data.filter(r => r.line === line).sort((a, b) =>
          (a.role === 'current' ? -1 : b.role === 'current' ? 1 : 0) ||
          ((a.annual_premium === null) - (b.annual_premium === null)) ||
          ((a.annual_premium || 0) - (b.annual_premium || 0)));
        if (!rows.length) continue;
        const card = el('div', 'cq-card'); card.id = 'line-' + line;
        card.append(el('h2', 'cq-h', LINE_LABEL[line] || line), el('p', 'cq-note', 'Current first, then quotes cheapest to most expensive. 6-month premiums are shown annualized.'));
        const table = el('table', 'cq-table');
        table.dataset.source = 'case_lines'; table.dataset.rowKey = 'quote_id';
        const head = el('tr');
        [['carrier', 'Carrier'], ['sheet_status', 'Sheet'], ['quoted_premium', 'Quoted', 'cq-num cq-hide-narrow'], ['annual_premium', 'Annual', 'cq-num'], ['change_vs_current', 'Change', 'cq-num']]
          .forEach(([f, t, cls]) => { const th = el('th', cls || '', t); th.dataset.field = f; head.appendChild(th); });
        const thead = el('thead'); thead.appendChild(head);
        const tbody = el('tbody');
        for (const r of rows) {
          const tr = el('tr'); tr.dataset.key = r.quote_id;
          if (r.sheet_status === 'Not in top 3' || r.annual_premium === null) tr.className = 'cq-muted';
          const quoted = r.quoted_premium === null ? '—' : `${fmtMoney2(r.quoted_premium)} / ${r.term_months} mo`;
          tr.append(td(r.carrier), td(r.sheet_status), td(quoted, 'cq-num cq-hide-narrow'),
            td(r.annual_premium === null ? '—' : fmtMoney2(r.annual_premium), 'cq-num'),
            r.role === 'current' ? td('—', 'cq-num') : changeCell(r.change_vs_current, null));
          tbody.appendChild(tr);
        }
        table.append(thead, tbody);
        card.appendChild(table);
        grid.appendChild(card);
      }
    }
    drawCoverage();
  }

  function drawCoverage() {
    const wrap = document.getElementById('coverage-wrap');
    const picked = document.getElementById('coverage-picked');
    const v = dash.data('case_values');
    wrap.replaceChildren();
    if (v.status === 'error') return fail(wrap);
    if (v.status !== 'ok') return;
    const line = covSel.value;
    const rows = v.data.filter(r => r.case_id === FEATURED && r.line === line);
    const fields = [...new Set(rows.map(r => r.field))];
    // Columns: current first, then quote carriers in the order of their annual premium on this line
    const cl = dash.data('case_lines').status === 'ok' ? dash.data('case_lines').data.filter(r => r.line === line && r.role === 'quote' && r.annual_premium !== null) : [];
    const order = new Map(cl.map(r => [r.carrier, r.annual_premium]));
    const cols = [...new Set(rows.map(r => r.role + '|' + r.carrier))].sort((a, b) => {
      const [ra, ca] = a.split('|'), [rb, cb] = b.split('|');
      if (ra !== rb) return ra === 'current' ? -1 : 1;
      return (order.get(ca) ?? Infinity) - (order.get(cb) ?? Infinity);
    });
    const table = el('table', 'cq-table');
    const head = el('tr'); head.appendChild(el('th', '', 'Coverage'));
    cols.forEach(c => { const [role, carrier] = c.split('|'); head.appendChild(el('th', '', role === 'current' ? `${carrier} (current)` : carrier)); });
    const thead = el('thead'); thead.appendChild(head);
    const tbody = el('tbody');
    for (const f of fields) {
      const tr = el('tr'); tr.appendChild(td(f));
      for (const c of cols) {
        const [role, carrier] = c.split('|');
        const r = rows.find(x => x.field === f && x.role === role && x.carrier === carrier);
        const cell = el('td');
        if (r) {
          const b = el('button', 'cq-cell');
          b.dataset.source = 'case_values'; b.dataset.field = 'value';
          b.dataset.where = `case_id=${enc(FEATURED)}&role=${enc(role)}&carrier=${enc(carrier)}&line=${enc(line)}&field=${enc(f)}`;
          b.append(el('span', 'cq-dot cq-dot-' + r.source), document.createTextNode(r.value));
          b.addEventListener('click', () => {
            picked.textContent = r.source === 'calculated'
              ? `${carrier} · ${f}: ${r.value} — calculated from other values on the page`
              : `${carrier} · ${f}: ${r.value} — ${r.document}, page ${r.page}${r.source === 'confirm' ? ' · needs confirmation' : ''}`;
          });
          cell.appendChild(b);
        } else cell.textContent = '—';
        tr.appendChild(cell);
      }
      tbody.appendChild(tr);
    }
    table.append(thead, tbody);
    wrap.appendChild(table);
  }

  // ---------- Parser accuracy ----------
  function drawParser() {
    const page = document.getElementById('parser');
    const k = tiles('parser_kpis', page.querySelectorAll('[data-source]'));
    if (k) {
      const row = dash.data('parser_kpis').data[0];
      k.forEach(e => {
        e.classList.remove('dash-skeleton');
        const f = e.dataset.field, v = row[f];
        if (f === 'change') { e.textContent = `${fmtPts(v)} since 8 weeks ago`; e.className = 'cq-delta ' + (v >= 0 ? 'cq-ok' : 'cq-bad'); }
        else e.textContent = f === 'last_week_accuracy' ? d3.format('.1%')(v) : fmtInt(v);
      });
    }

    const body = document.querySelector('#parser-table tbody');
    body.replaceChildren();
    if (dash.data('parser_carriers').status === 'ok') {
      for (const r of dash.data('parser_carriers').data.slice().sort((a, b) => a.last_week - b.last_week)) {
        const tr = el('tr'); tr.dataset.key = r.carrier;
        const ch = td(fmtPts(r.change), 'cq-num ' + (r.change >= 0 ? 'cq-ok' : 'cq-bad'));
        tr.append(td(r.carrier), td(fmtInt(r.extracted), 'cq-num cq-hide-narrow'), td(fmtInt(r.overridden), 'cq-num cq-hide-narrow'),
          td(d3.format('.1%')(r.last_week), 'cq-num'), ch, td(fmtInt(r.to_confirm), 'cq-num'));
        body.appendChild(tr);
      }
    }

    const rbody = document.querySelector('#rules-table tbody');
    rbody.replaceChildren();
    if (ready('parser_rules', 'rules_status')) {
      const st = new Map(dash.data('rules_status').data.map(r => [r.rule_id, r.status]));
      const rank = { Disabled: 0, Watching: 1, Active: 2 };
      for (const r of dash.data('parser_rules').data.slice().sort((a, b) => rank[st.get(a.rule_id)] - rank[st.get(b.rule_id)] || Number(b.misses) - Number(a.misses))) {
        const tr = el('tr'); tr.dataset.key = r.rule_id;
        const s = st.get(r.rule_id);
        const sc = td(s, s === 'Disabled' ? 'cq-bad' : s === 'Watching' ? 'cq-warn' : '');
        tr.append(td(r.rule_id), td(r.carrier), td(r.field, 'cq-hide-narrow'), td(fmtInt(Number(r.hits)), 'cq-num'), td(fmtInt(Number(r.misses)), 'cq-num'), sc);
        rbody.appendChild(tr);
      }
    }

    drawTrend();
  }

  function drawTrend() {
    const box = document.getElementById('trend-chart');
    const t = dash.data('parser_trend');
    box.replaceChildren();
    if (t.status === 'error') return fail(box);
    if (t.status !== 'ok') { box.classList.add('dash-skeleton'); return; }
    box.classList.remove('dash-skeleton');
    const series = d3.groups(t.data.map(r => ({ ...r, date: new Date(r.week + 'T00:00:00Z') })), r => r.carrier)
      .map(([carrier, pts]) => ({ carrier, pts: pts.sort((a, b) => a.date - b.date) }));
    const width = box.clientWidth || 600, height = 280;
    const svg = d3.select(box).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${width} ${height}`);
    const probe = svg.append('text').style('font-size', 'var(--cds-font-size-caption)');
    const endW = d3.max(series, s => { probe.text(`${s.carrier} ${d3.format('.0%')(s.pts[s.pts.length - 1].accuracy)}`); return probe.node().getComputedTextLength(); }) + 10;
    probe.text('100%'); const tickW = probe.node().getComputedTextLength() + 8; probe.remove();
    const narrow = width < 480;
    const m = { top: 12, right: narrow ? 8 : endW, bottom: 26, left: tickW };
    const all = t.data.map(r => r.accuracy);
    const x = d3.scaleUtc(d3.extent(series[0].pts, p => p.date), [m.left, width - m.right]);
    const y = d3.scaleLinear([Math.max(0, d3.min(all) - 0.02), 1], [height - m.bottom, m.top]).nice();
    svg.append('g').selectAll('line').data(y.ticks(4)).join('line').attr('x1', m.left).attr('x2', width - m.right)
      .attr('y1', d => y(d)).attr('y2', d => y(d)).attr('stroke', 'var(--cds-chart-grid)');
    svg.append('g').selectAll('text').data(y.ticks(4)).join('text').attr('x', m.left - 6).attr('y', d => y(d)).attr('dy', '0.32em')
      .attr('text-anchor', 'end').attr('fill', 'var(--color-fg-muted)').style('font-size', 'var(--cds-font-size-caption)').text(d3.format('.0%'));
    const xt = x.ticks(Math.max(2, Math.floor((width - m.left - m.right) / 90)));
    svg.append('g').selectAll('text').data(xt).join('text').attr('x', d => x(d)).attr('y', height - 6).attr('text-anchor', 'middle')
      .attr('fill', 'var(--color-fg-muted)').style('font-size', 'var(--cds-font-size-caption)').text(d => d3.utcFormat('%b %-d')(d));
    const line = d3.line().x(p => x(p.date)).y(p => y(p.accuracy));
    const color = (s, i) => dash.colors[i % dash.colors.length];
    const paths = svg.append('g').selectAll('path').data(series).join('path').attr('fill', 'none').attr('stroke-width', 2)
      .attr('stroke-linecap', 'round').attr('stroke-linejoin', 'round').attr('stroke', color).attr('d', s => line(s.pts));
    if (!narrow) {
      // End labels, nudged apart so they never touch
      const ends = series.map((s, i) => ({ s, i, y: y(s.pts[s.pts.length - 1].accuracy) })).sort((a, b) => a.y - b.y);
      for (let i = 1; i < ends.length; i++) ends[i].y = Math.max(ends[i].y, ends[i - 1].y + 13);
      svg.append('g').selectAll('text').data(ends).join('text').attr('x', width - m.right + 6).attr('y', d => d.y).attr('dy', '0.32em')
        .attr('fill', d => color(d.s, d.i)).style('font-size', 'var(--cds-font-size-caption)')
        .text(d => `${d.s.carrier} ${d3.format('.0%')(d.s.pts[d.s.pts.length - 1].accuracy)}`);
    }
    // Tooltip: nearest week, every carrier
    const tipEl = el('div', 'cq-tip'); box.appendChild(tipEl);
    const rule = svg.append('line').attr('stroke', 'var(--cds-chart-axis)').attr('y1', m.top).attr('y2', height - m.bottom).style('display', 'none');
    const dates = series[0].pts.map(p => p.date);
    svg.append('rect').attr('x', m.left).attr('y', m.top).attr('width', width - m.left - m.right).attr('height', height - m.top - m.bottom)
      .attr('fill', 'transparent')
      .on('mousemove', ev => {
        const [mx] = d3.pointer(ev);
        const d = dates[d3.minIndex(dates, dd => Math.abs(x(dd) - mx))];
        rule.style('display', null).attr('x1', x(d)).attr('x2', x(d));
        const lines = series.map((s, i) => ({ s, i, p: s.pts.find(p => +p.date === +d) })).sort((a, b) => b.p.accuracy - a.p.accuracy);
        tipEl.replaceChildren(el('div', 'cq-tip-k', 'Week of ' + d3.utcFormat('%b %-d')(d)), ...lines.map(l => {
          const row = el('div'); const dot = el('span', 'cq-dot'); dot.style.background = color(l.s, l.i);
          row.append(dot, document.createTextNode(`${l.s.carrier} ${d3.format('.1%')(l.p.accuracy)}`)); return row;
        }));
        tipEl.style.display = 'block';
        const [bx, by] = d3.pointer(ev, box);
        tipEl.style.left = Math.max(0, Math.min(bx + 12, box.clientWidth - tipEl.offsetWidth)) + 'px';
        tipEl.style.top = Math.max(0, by - tipEl.offsetHeight / 2) + 'px';
        paths.attr('opacity', 1);
      })
      .on('mouseleave', () => { tipEl.style.display = 'none'; rule.style('display', 'none'); });
  }

  // ---------- takeaway ----------
  function drawTakeaway() {
    const e = document.getElementById('takeaway');
    if (!ready('pipeline_kpis')) { if (failed('pipeline_kpis')) fail(e); return; }
    const k = dash.data('pipeline_kpis').data[0];
    e.classList.remove('dash-skeleton');
    e.textContent = `${fmtInt(k.open_cases)} cases are open; ${fmtInt(k.overdue)} have an overdue next action and ${fmtInt(k.needs_review)} are waiting on review. ${fmtPct(k.win_rate)} of decided cases were sold.`;
  }

  function draw() {
    drawTakeaway();
    if (current === 'pipeline') drawPipeline();
    if (current === 'quotes') drawQuotes();
    if (current === 'case') drawCase();
    if (current === 'parser') drawParser();
  }

  const start = (location.hash || '').slice(1);
  show(tabs.some(t => t.dataset.page === start) ? start : 'pipeline', false);
  dash.onData(draw);
})();
