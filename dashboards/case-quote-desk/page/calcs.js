// Every computed number on the page is one of these calculations, so readers can open it in Sources.

dash.calc('pipeline_kpis', {
  inputs: ['cases'],
  title: 'Pipeline headline counts',
  description: 'Open cases, overdue next actions, cases waiting on review, average age of open cases, and win rate of decided cases, as of Oct 10, 2026.',
  fn: (cases) => {
    const asOf = '2026-10-10';
    const open = cases.filter(c => c.stage !== 'sold' && c.stage !== 'lost');
    const sold = cases.filter(c => c.stage === 'sold').length;
    const lost = cases.filter(c => c.stage === 'lost').length;
    return [{
      open_cases: open.length,
      overdue: open.filter(c => c.next_action_due && c.next_action_due < asOf).length,
      needs_review: cases.filter(c => c.stage === 'needs_review').length,
      avg_days_open: Math.round(open.reduce((s, c) => s + Number(c.days_open), 0) / open.length),
      win_rate: sold / (sold + lost),
    }];
  },
});

dash.calc('by_stage', {
  inputs: ['cases'],
  title: 'Cases by stage',
  description: 'Number of cases in each stage, in pipeline order, with the average days they have sat there.',
  fn: (cases) => {
    const order = [['intake', 'Intake'], ['needs_review', 'Needs review'], ['quoting', 'Quoting'], ['compared', 'Compared'], ['client_ready', 'Client ready'], ['sold', 'Sold'], ['lost', 'Lost']];
    return order.map(([stage, label]) => {
      const inStage = cases.filter(c => c.stage === stage);
      return {
        stage, label, cases: inStage.length,
        avg_days_in_stage: inStage.length ? Math.round(inStage.reduce((s, c) => s + Number(c.days_in_stage), 0) / inStage.length) : 0,
        is_open: stage !== 'sold' && stage !== 'lost',
      };
    });
  },
});

dash.calc('quote_kpis', {
  inputs: ['quotes'],
  title: 'Quote request outcomes',
  description: 'Carrier quotes requested, returned, and declined, per line and for all lines. A quote counts as returned when the carrier gave a premium.',
  fn: (quotes) => {
    const out = new Map();
    for (const q of quotes.filter(q => q.role === 'quote')) {
      for (const line of ['all', q.line]) {
        const r = out.get(line) || { line, requested: 0, quoted: 0, declined: 0 };
        r.requested += 1;
        if (q.status === 'success') r.quoted += 1;
        if (q.status === 'declined') r.declined += 1;
        out.set(line, r);
      }
    }
    return [...out.values()].map(r => ({ ...r, quote_rate: r.quoted / r.requested }));
  },
});

dash.calc('savings_by_line', {
  inputs: ['quotes', 'cases'],
  title: 'Best quote vs current',
  description: 'For each case and line with a finished comparison, the cheapest annual quote against the current annual premium, averaged per line and over all lines.',
  fn: (quotes, cases) => {
    const done = new Set(cases.filter(c => ['compared', 'client_ready', 'sold', 'lost'].includes(c.stage)).map(c => c.case_id));
    const pairs = new Map();
    for (const q of quotes.filter(q => done.has(q.case_id))) {
      const k = q.case_id + '|' + q.line;
      const p = pairs.get(k) || { line: q.line, current: null, best: null };
      if (q.role === 'current') p.current = Number(q.annual_premium);
      if (q.role === 'quote' && q.status === 'success') p.best = p.best === null ? Number(q.annual_premium) : Math.min(p.best, Number(q.annual_premium));
      pairs.set(k, p);
    }
    const out = new Map();
    for (const p of [...pairs.values()].filter(p => p.current !== null && p.best !== null)) {
      for (const line of ['all', p.line]) {
        const r = out.get(line) || { line, comparisons: 0, current: 0, best: 0, saving: 0 };
        r.comparisons += 1; r.current += p.current; r.best += p.best; if (p.best < p.current) r.saving += 1;
        out.set(line, r);
      }
    }
    return [...out.values()].map(r => ({
      line: r.line, comparisons: r.comparisons,
      avg_current: r.current / r.comparisons, avg_best: r.best / r.comparisons,
      avg_savings: (r.current - r.best) / r.comparisons,
      avg_savings_pct: (r.current - r.best) / r.current,
      share_saving: r.saving / r.comparisons,
    }));
  },
});

dash.calc('carrier_results', {
  inputs: ['quotes', 'cases'],
  title: 'Results by carrier',
  description: 'Per carrier and line: quotes requested, returned and declined; how often a returned quote made the top 3 on a finished comparison; and how often a decided case was sold with that carrier.',
  fn: (quotes, cases) => {
    const byId = new Map(cases.map(c => [c.case_id, c]));
    const finished = ['compared', 'client_ready', 'sold', 'lost'];
    const out = new Map();
    const seen = new Set();
    for (const q of quotes.filter(q => q.role === 'quote')) {
      const c = byId.get(q.case_id);
      for (const line of ['all', q.line]) {
        const k = line + '|' + q.carrier;
        const r = out.get(k) || { line, carrier: q.carrier, requested: 0, quoted: 0, declined: 0, compared: 0, top3: 0, decided: 0, wins: 0 };
        r.requested += 1;
        if (q.status === 'declined') r.declined += 1;
        if (q.status === 'success') {
          r.quoted += 1;
          if (finished.includes(c.stage)) { r.compared += 1; if (q.on_sheet === 'yes') r.top3 += 1; }
          const dk = k + '|' + q.case_id;
          if ((c.stage === 'sold' || c.stage === 'lost') && !seen.has(dk)) {
            seen.add(dk); r.decided += 1; if (c.won_carrier === q.carrier) r.wins += 1;
          }
        }
        out.set(k, r);
      }
    }
    return [...out.values()].map(r => ({
      line: r.line, carrier: r.carrier, requested: r.requested, quoted: r.quoted, declined: r.declined,
      quote_rate: r.quoted / r.requested,
      top3_rate: r.compared ? r.top3 / r.compared : null,
      wins: r.wins, win_rate: r.decided ? r.wins / r.decided : null,
    }));
  },
});

dash.calc('case_lines', {
  inputs: ['quotes'],
  title: 'Featured case, by line',
  description: 'The featured case (Q-3C19E070E013F3B7): each line’s current policy and every quote, with its sheet status and annual change against the current premium. Top 3 by annual premium go on the sheet.',
  fn: (quotes) => {
    const rows = quotes.filter(q => q.case_id === 'Q-3C19E070E013F3B7');
    const current = new Map(rows.filter(q => q.role === 'current').map(q => [q.line, Number(q.annual_premium)]));
    const status = q => q.role === 'current' ? 'Current'
      : q.status === 'declined' ? 'Declined' : q.status === 'not_quoted' ? 'Not quoted' : q.status === 'referred' ? 'Referred'
      : Number(q.rank_in_line) <= 3 ? 'On sheet' : 'Not in top 3';
    return rows.map(q => ({
      quote_id: q.quote_id, line: q.line, carrier: q.carrier, role: q.role, sheet_status: status(q),
      term_months: Number(q.term_months),
      quoted_premium: q.quoted_premium === '' ? null : Number(q.quoted_premium),
      annual_premium: q.annual_premium === '' ? null : Number(q.annual_premium),
      rank: q.rank_in_line === '' ? null : Number(q.rank_in_line),
      change_vs_current: q.role === 'quote' && q.annual_premium !== '' ? Number(q.annual_premium) - current.get(q.line) : null,
    }));
  },
});

dash.calc('case_columns', {
  inputs: ['case_lines'],
  title: 'Featured case, by carrier',
  description: 'Each carrier’s annual total across the lines it quoted for the featured case. The change against current is shown only when it quotes the same lines as the current policy; otherwise "Lines differ".',
  fn: (case_lines) => {
    const currentLines = case_lines.filter(r => r.role === 'current');
    const currentTotal = currentLines.reduce((s, r) => s + r.annual_premium, 0);
    const want = currentLines.map(r => r.line).sort().join(',');
    const out = [{ column: 'Current', carrier: currentLines[0].carrier, lines: want.replace(/,/g, ', '), total_annual: currentTotal, change_vs_current: null, note: 'In force' }];
    const carriers = [...new Set(case_lines.filter(r => r.role === 'quote').map(r => r.carrier))];
    for (const carrier of carriers) {
      const ok = case_lines.filter(r => r.role === 'quote' && r.carrier === carrier && r.annual_premium !== null);
      const lines = ok.map(r => r.line).sort().join(',');
      const total = ok.reduce((s, r) => s + r.annual_premium, 0);
      out.push({ column: carrier, carrier, lines: lines.replace(/,/g, ', '), total_annual: total,
        change_vs_current: lines === want ? total - currentTotal : null, note: lines === want ? 'Same lines' : 'Lines differ' });
    }
    return out.sort((a, b) => (a.column === 'Current' ? -1 : b.column === 'Current' ? 1 : (a.note === b.note ? a.total_annual - b.total_annual : a.note === 'Same lines' ? -1 : 1)));
  },
});

dash.calc('parser_trend', {
  inputs: ['parser_weeks'],
  title: 'Parser accuracy by week',
  description: 'Share of extracted fields the user left unedited when the sheet was generated, per carrier per week. Edited fields count as wrong.',
  fn: (parser_weeks) => parser_weeks.map(w => ({
    week: w.week, carrier: w.carrier,
    accuracy: 1 - Number(w.fields_overridden) / Number(w.fields_extracted),
  })),
});

dash.calc('parser_carriers', {
  inputs: ['parser_weeks'],
  title: 'Parser accuracy by carrier',
  description: 'Per carrier over the last 8 weeks: fields extracted and edited, overall accuracy, latest week, change from the first week, and values flagged to confirm last week.',
  fn: (parser_weeks) => {
    const carriers = [...new Set(parser_weeks.map(w => w.carrier))];
    return carriers.map(carrier => {
      const ws = parser_weeks.filter(w => w.carrier === carrier).sort((a, b) => a.week < b.week ? -1 : 1);
      const acc = w => 1 - Number(w.fields_overridden) / Number(w.fields_extracted);
      const extracted = ws.reduce((s, w) => s + Number(w.fields_extracted), 0);
      const overridden = ws.reduce((s, w) => s + Number(w.fields_overridden), 0);
      return {
        carrier, extracted, overridden, accuracy: 1 - overridden / extracted,
        last_week: acc(ws[ws.length - 1]), change: acc(ws[ws.length - 1]) - acc(ws[0]),
        to_confirm: Number(ws[ws.length - 1].fields_to_confirm),
      };
    });
  },
});

dash.calc('rules_status', {
  inputs: ['parser_rules'],
  title: 'Learned rule status',
  description: 'A learned rule disables itself once it has 2 or more misses and more misses than hits; a rule with any miss is being watched.',
  fn: (parser_rules) => parser_rules.map(r => ({
    rule_id: r.rule_id,
    status: Number(r.misses) >= 2 && Number(r.misses) > Number(r.hits) ? 'Disabled' : Number(r.misses) > 0 ? 'Watching' : 'Active',
    hit_rate: Number(r.hits) + Number(r.misses) ? Number(r.hits) / (Number(r.hits) + Number(r.misses)) : null,
  })),
});

dash.calc('parser_kpis', {
  inputs: ['parser_weeks', 'rules_status'],
  title: 'Parser headline numbers',
  description: 'All carriers together: accuracy in the latest week and the first of the 8 weeks, values to confirm in the latest week, and learned rules now disabled.',
  fn: (parser_weeks, rules_status) => {
    const weeks = [...new Set(parser_weeks.map(w => w.week))].sort();
    const acc = week => {
      const ws = parser_weeks.filter(w => w.week === week);
      return 1 - ws.reduce((s, w) => s + Number(w.fields_overridden), 0) / ws.reduce((s, w) => s + Number(w.fields_extracted), 0);
    };
    const last = weeks[weeks.length - 1];
    return [{
      last_week_accuracy: acc(last),
      first_week_accuracy: acc(weeks[0]),
      change: acc(last) - acc(weeks[0]),
      to_confirm: parser_weeks.filter(w => w.week === last).reduce((s, w) => s + Number(w.fields_to_confirm), 0),
      rules_disabled: rules_status.filter(r => r.status === 'Disabled').length,
    }];
  },
});
