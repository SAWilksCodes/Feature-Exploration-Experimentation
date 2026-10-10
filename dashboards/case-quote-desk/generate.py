"""Synthetic data for the Case & Quote Desk dashboard.

Everything here is fictional: no client, policy or premium comes from
real records. It follows the Quote Desk data model (lines, carriers,
6-month -> annual math, top-3 sheet rule, declines) so the dashboard can
be judged without touching PII.
"""
import csv, random, hashlib
from datetime import date, timedelta

random.seed(20261010)
AS_OF = date(2026, 10, 10)
OUT = __import__('pathlib').Path(__file__).parent / 'data'
OUT.mkdir(exist_ok=True)

CARRIERS = {
    'auto': ['Erie', 'Progressive', 'Encova', 'Liberty Mutual', 'Encompass'],
    'home': ['Erie', 'Encova', 'Liberty Mutual', 'Foremost', 'Encompass'],
    'renters': ['Erie', 'Progressive', 'Liberty Mutual', 'Foremost'],
    'dwelling_fire': ['Foremost', 'Encova', 'Erie'],
    'motorcycle': ['Progressive', 'Foremost', 'Erie'],
    'umbrella': ['Erie', 'Encova', 'Liberty Mutual'],
}
SIX_MONTH = {'Progressive', 'Encompass', 'Liberty Mutual'}  # auto-family terms
BASE = {'auto': 1650, 'home': 1450, 'renters': 210, 'dwelling_fire': 980, 'motorcycle': 420, 'umbrella': 340}
CARRIER_FACTOR = {'Erie': 0.97, 'Progressive': 0.96, 'Encova': 1.03, 'Liberty Mutual': 1.06, 'Foremost': 0.99, 'Encompass': 1.01}
BUNDLES = [
    ('Auto', ['auto'], 18), ('Auto + Renters', ['auto', 'renters'], 8), ('Home', ['home'], 10),
    ('Home + Auto', ['home', 'auto'], 14), ('Home + Auto + Umbrella', ['home', 'auto', 'umbrella'], 4),
    ('Landlord / Dwelling Fire', ['dwelling_fire'], 4), ('Motorcycle / RV / Boat', ['motorcycle'], 4), ('Renters', ['renters'], 3),
]
STAGES = [('intake', 7), ('needs_review', 8), ('quoting', 10), ('compared', 8), ('client_ready', 6), ('sold', 18), ('lost', 9)]
NEXT_ACTION = {
    'intake': 'Extract fields from ACORD app', 'needs_review': 'Confirm flagged values',
    'quoting': 'Finish carrier quotes', 'compared': 'Build comparison sheet', 'client_ready': 'Call client with options',
}
OWNERS = ['Shane', 'Ryan', 'Agent']

def case_id(n):
    return 'Q-' + hashlib.sha1(f'synthetic-{n}'.encode()).hexdigest()[:16].upper()

def family_family(line):
    return 'auto' if line in ('auto', 'motorcycle') else line

def pick(weighted):
    return random.choices([w[0:-1] if len(w) > 2 else w[0] for w in weighted], weights=[w[-1] for w in weighted])[0]

cases, quotes = [], []
qn = 0

def add_quotes(cid, lines, stage, opened, risk):
    """Current policy plus carrier quotes for each line; returns lines' best carrier."""
    global qn
    current_carrier = random.choice(['Erie', 'Erie', 'Progressive', 'Encova', 'State Auto', 'Nationwide'])
    full = stage in ('compared', 'client_ready', 'sold', 'lost')
    rows = []
    for line in lines:
        base = BASE[line] * risk
        cur_annual = round(base * random.uniform(0.9, 1.18), 2)
        qn += 1
        rows.append(dict(quote_id=f'QT-{qn:05d}', case_id=cid, line=line, role='current', carrier=current_carrier,
                         status='in_force', term_months=12, quoted_premium=cur_annual, annual_premium=cur_annual,
                         quote_date=opened.isoformat()))
        carriers = CARRIERS[line][:]
        random.shuffle(carriers)
        if not full:
            carriers = carriers[:random.randint(1, 3)]
        for c in carriers:
            qn += 1
            status = random.choices(['success', 'declined', 'not_quoted', 'referred'], [78, 9, 9, 4])[0]
            term = 6 if (family_family(line) == 'auto' and c in SIX_MONTH) else 12
            annual = round(base * CARRIER_FACTOR[c] * random.uniform(0.82, 1.18), 2) if status == 'success' else None
            premium = round(annual * term / 12, 2) if annual else None
            rows.append(dict(quote_id=f'QT-{qn:05d}', case_id=cid, line=line, role='quote', carrier=c, status=status,
                             term_months=term, quoted_premium=premium, annual_premium=annual,
                             quote_date=min(AS_OF, opened + timedelta(days=random.randint(1, 6))).isoformat()))
    # rank successes per line by annual premium; top 3 go on the sheet
    for line in lines:
        ok = sorted([r for r in rows if r['line'] == line and r['role'] == 'quote' and r['status'] == 'success'],
                    key=lambda r: r['annual_premium'])
        for i, r in enumerate(ok, 1):
            r['rank_in_line'] = i
    for r in rows:
        r.setdefault('rank_in_line', '')
        r['on_sheet'] = 'yes' if (r['role'] == 'current' or (r['rank_in_line'] != '' and r['rank_in_line'] <= 3 and full)) else 'no'
    quotes.extend(rows)
    return current_carrier, rows

n = 0
for stage, count in STAGES:
    for _ in range(count):
        n += 1
        label, lines, _w = random.choices(BUNDLES, weights=[b[2] for b in BUNDLES])[0]
        age = {'intake': (0, 4), 'needs_review': (1, 9), 'quoting': (3, 18), 'compared': (6, 24),
               'client_ready': (8, 30), 'sold': (10, 120), 'lost': (10, 120)}[stage]
        opened = AS_OF - timedelta(days=random.randint(*age))
        stage_since = opened + timedelta(days=random.randint(0, max(0, (AS_OF - opened).days)))
        if stage in ('sold', 'lost'):
            stage_since = min(AS_OF, opened + timedelta(days=random.randint(6, 25)))
        cid = case_id(n)
        risk = random.uniform(0.75, 1.5)
        cur, rows = add_quotes(cid, lines, stage, opened, risk) if stage not in ('intake', 'needs_review') else (random.choice(['Erie', 'Progressive', 'Encova', 'State Auto']), [])
        won = ''
        if stage == 'sold':
            first = [r for r in rows if r['rank_in_line'] == 1 and r['line'] == lines[0]]
            second = [r for r in rows if r['rank_in_line'] == 2 and r['line'] == lines[0]]
            pool = first * 3 + second
            won = random.choice(pool)['carrier'] if pool else ''
        due = ''
        if stage not in ('sold', 'lost'):
            due = max(opened + timedelta(days=1), AS_OF + timedelta(days=random.randint(-6, 7))).isoformat()
        cases.append(dict(
            case_id=cid, client=f'Sample client {n:03d}', lines=label, stage=stage, owner=random.choice(OWNERS),
            opened_on=opened.isoformat(), stage_since=stage_since.isoformat(),
            days_open=(AS_OF - opened).days, days_in_stage=(AS_OF - stage_since).days,
            next_action=NEXT_ACTION.get(stage, ''), next_action_due=due, current_carrier=cur, won_carrier=won,
            lost_reason=random.choice(['Stayed with current carrier', 'Price', 'No response', 'Coverage gap']) if stage == 'lost' else '',
        ))

# ---- One featured case for the comparison view, written out by hand ----
FEAT = case_id(999)
cases.append(dict(case_id=FEAT, client='Sample client 999 (featured)', lines='Home + Auto + Umbrella', stage='compared',
                  owner='Ryan', opened_on='2026-09-29', stage_since='2026-10-07', days_open=11, days_in_stage=3,
                  next_action='Build comparison sheet', next_action_due='2026-10-11', current_carrier='Erie', won_carrier='',
                  lost_reason=''))
# column, carrier, line, status, term, premium
FQ = [
    ('Current', 'Erie', 'home', 'in_force', 12, 3260.00), ('Current', 'Erie', 'auto', 'in_force', 12, 3912.00), ('Current', 'Erie', 'umbrella', 'in_force', 12, 468.00),
    ('Quote', 'Foremost', 'home', 'success', 12, 2318.00), ('Quote', 'Foremost', 'auto', 'not_quoted', 12, None),
    ('Quote', 'Encova', 'home', 'success', 12, 2794.00), ('Quote', 'Encova', 'auto', 'success', 12, 3488.00), ('Quote', 'Encova', 'umbrella', 'success', 12, 402.00),
    ('Quote', 'Erie', 'home', 'success', 12, 2986.00), ('Quote', 'Erie', 'auto', 'success', 12, 3720.00), ('Quote', 'Erie', 'umbrella', 'success', 12, 412.00),
    ('Quote', 'Progressive', 'auto', 'success', 6, 1563.40), ('Quote', 'Progressive', 'home', 'declined', 12, None),
    ('Quote', 'Liberty Mutual', 'home', 'success', 12, 3105.00), ('Quote', 'Liberty Mutual', 'auto', 'success', 6, 1897.12), ('Quote', 'Liberty Mutual', 'umbrella', 'success', 12, 455.00),
    ('Quote', 'Encompass', 'auto', 'success', 6, 1702.55), ('Quote', 'Encompass', 'home', 'success', 12, 3349.00),
]
frows = []
for col, c, line, status, term, prem in FQ:
    qn += 1
    annual = round(prem * 12 / term, 2) if prem else None
    frows.append(dict(quote_id=f'QT-{qn:05d}', case_id=FEAT, line=line, role='current' if col == 'Current' else 'quote', carrier=c,
                      status=status, term_months=term, quoted_premium=prem, annual_premium=annual, quote_date='2026-10-02'))
for line in ('home', 'auto', 'umbrella'):
    ok = sorted([r for r in frows if r['line'] == line and r['role'] == 'quote' and r['status'] == 'success'], key=lambda r: r['annual_premium'])
    for i, r in enumerate(ok, 1):
        r['rank_in_line'] = i
for r in frows:
    r.setdefault('rank_in_line', '')
    r['on_sheet'] = 'yes' if (r['role'] == 'current' or (r['rank_in_line'] != '' and r['rank_in_line'] <= 3)) else 'no'
quotes.extend(frows)

# Per-field values for the featured case: where each value came from
def v(carrier, line, field, value, source='document', page=1):
    role = 'current' if carrier.endswith('(current)') else 'quote'
    name = carrier.replace(' (current)', '')
    doc = f'{name} {line} {"declarations" if role == "current" else "quote"}.pdf'
    return dict(case_id=FEAT, role=role, carrier=name, line=line, field=field, value=value, source=source,
                document=doc if source != 'calculated' else '', page=page if source != 'calculated' else '')
values = []
AUTO_FIELDS = ['Liability (BI/PD)', 'UM / UIM', 'Medical payments', 'Comprehensive deductible', 'Collision deductible', 'Rental', 'Towing']
HOME_FIELDS = ['Dwelling', 'Other structures', 'Personal property', 'Loss of use', 'Liability', 'Deductible']
auto_cov = {
    'Erie (current)': ['250/500/100', '250/500', '$5,000', '$500', '$500', '$30/day', 'Included'],
    'Erie': ['250/500/100', '250/500', '$5,000', '$500', '$500', '$30/day', 'Included'],
    'Encova': ['250/500/100', '250/500', '$5,000', '$500', '$1,000', '$40/day', 'Included'],
    'Progressive': ['250/500/100', '100/300', '$5,000', '$500', '$500', '$30/day', 'Included'],
    'Liberty Mutual': ['250/500/100', '250/500', '$2,000', '$500', '$500', 'Not included', 'Included'],
    'Encompass': ['250/500/100', '250/500', '$5,000', '$1,000', '$1,000', '$30/day', 'Not included'],
}
home_cov = {
    'Erie (current)': ['$412,000', '$41,200', '$288,400', 'Actual loss sustained', '$500,000', '$1,000'],
    'Erie': ['$425,000', '$42,500', '$297,500', 'Actual loss sustained', '$500,000', '$1,000'],
    'Encova': ['$425,000', '$42,500', '$297,500', '$85,000', '$500,000', '$1,000'],
    'Foremost': ['$400,000', '$40,000', '$200,000', '$80,000', '$300,000', '$2,500'],
    'Liberty Mutual': ['$425,000', '$42,500', '$212,500', '$85,000', '$500,000', '$1,000'],
    'Encompass': ['$425,000', '$42,500', '$297,500', '$127,500', '$500,000', '$1,000'],
}
confirm = {('Encova', 'Rental'), ('Progressive', 'UM / UIM'), ('Foremost', 'Personal property'), ('Liberty Mutual', 'Loss of use'), ('Encompass', 'Towing')}
for carrier, covs in auto_cov.items():
    for f, val in zip(AUTO_FIELDS, covs):
        base_c = carrier.replace(' (current)', '')
        src = 'confirm' if (base_c, f) in confirm else ('calculated' if f == 'Liability (BI/PD)' else 'document')
        values.append(v(carrier, 'auto', f, val, src, page=2))
for carrier, covs in home_cov.items():
    for f, val in zip(HOME_FIELDS, covs):
        base_c = carrier.replace(' (current)', '')
        src = 'confirm' if (base_c, f) in confirm else ('calculated' if f == 'Other structures' else 'document')
        values.append(v(carrier, 'home', f, val, src, page=1))

# ---- Parser learning: per carrier per week, and per rule ----
learning = []
for carrier, acc in [('Erie', 0.93), ('Progressive', 0.95), ('Encova', 0.86), ('Liberty Mutual', 0.9), ('Foremost', 0.82), ('Encompass', 0.88)]:
    for w in range(8):
        week = AS_OF - timedelta(days=AS_OF.weekday()) - timedelta(weeks=7 - w)
        extracted = random.randint(60, 180)
        a = min(0.99, acc + 0.012 * w + random.uniform(-0.03, 0.03))
        overridden = round(extracted * (1 - a))
        learning.append(dict(week=week.isoformat(), carrier=carrier, fields_extracted=extracted, fields_overridden=overridden,
                             fields_to_confirm=random.randint(0, 9)))
rules = []
RULE_FIELDS = ['Annual premium', 'Term', 'Liability (BI/PD)', 'UM / UIM', 'Dwelling', 'Deductible', 'Rental', 'Quote date', 'Named insured']
rid = 0
for carrier in ['Erie', 'Progressive', 'Encova', 'Liberty Mutual', 'Foremost', 'Encompass']:
    for f in random.sample(RULE_FIELDS, 4):
        rid += 1
        hits = random.randint(0, 40)
        misses = random.choice([0, 0, 0, 1, 1, 2, 3, 5]) if hits > 3 else random.randint(1, 4)
        rules.append(dict(rule_id=f'R{rid:03d}', carrier=carrier, field=f, hits=hits, misses=misses))

def write(name, rows):
    with open(OUT / name, 'w', newline='') as fh:
        w = csv.DictWriter(fh, fieldnames=list(rows[0].keys()), lineterminator='\n')
        w.writeheader(); w.writerows(rows)
    print(name, len(rows))

write('cases.csv', cases); write('quotes.csv', quotes); write('case_values.csv', values)
write('parser_weeks.csv', learning); write('parser_rules.csv', rules)
print('featured', FEAT)
