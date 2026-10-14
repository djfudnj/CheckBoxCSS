// Check Box CSS - SillyTavern extension 
//
//  /*:: H1 ::*/    : 접고 펼 수 있는 그룹 (Custom Theme Inputs 같은 드로어)
//  /*== H2 ==*/    : 체크박스로 통째로 끄고 켜는 항목
//  /*-- H3 --*/    : H2 안의 하위 항목, 이것도 체크박스로 끄고 켬
//  /*---*/         : 멈춤 표시. 지금 열려 있는 가장 작은 제목(H3 → H2 → H1 순)이 여기서 끝납니다.
//                    멈춤 표시 뒤의 CSS는 어느 제목에도 속하지 않는 일반 CSS가 되고,
//                    멈춤 표시는 끝나는 제목과 한 덩어리라서 순서를 옮길 때 같이 움직입니다.
//  /* 그냥 주석 */  : 제목이 아니라 일반 주석으로 취급
//
//  - 기호(: = -)는 제목 앞뒤 양쪽에 2개 이상씩 있어야 제목으로 인식합니다.
//  - /* 뒤나 */ 앞의 공백은 있어도 없어도 됩니다.
//  - 여러 줄 배너도 인식합니다. (제목 줄의 기호가 단계를 결정, 위아래 줄은 장식)
//      /*-------------
//      :: 제목 ::
//      -------------*/
//
//  [라디오 그룹]
//  제목이 [1], [2] / [A], [B] 처럼 대괄호 표시로 시작하고, 같은 단계의 이웃 항목끼리 이어져 있으면
//  체크박스 대신 동그란 라디오가 되어 그룹 안에서 하나만 선택됩니다.
//      /*-- [1] 헤더 A --*/  /*-- [2] 헤더 B --*/  /*-- [3] 헤더 C --*/
//  - 그룹은 "표시가 있는 이웃 항목이 끊기지 않고 이어진 구간" 입니다. (표시 없는 항목이 끼면 끊김)
//  - 숫자 → 알파벳으로 종류가 바뀌거나 같은 표시가 다시 나오면 새 그룹이 시작됩니다.
//  - 그룹에 항목이 1개뿐이면 그냥 체크박스입니다.
//
//  [설정] Extensions → Check Box CSS 에서 설정
//  - 제목 형식 바꾸기: 예) /*++H2++*/ 라고 적으면 그 형식이 H2 규칙이 됩니다. (비워 두면 위의 기본 규칙)
//      H1 / H2 / H3 자리에 제목이 들어갑니다. 반드시 /* ... */ 주석 형식이어야 해요.
//  - 멈춤 표시 바꾸기: 예) /*end*/ (비워 두면 /*---*/)
//  - 라디오 그룹: 사용 여부 스위치와 표시 형식 설정. 예) (X) 라고 적으면 (1) (2) / (A) (B) 가 표시가 됩니다.
//      X 자리에 숫자 또는 알파벳이 들어갑니다. (비워 두면 [X])
//  - 위쪽 버튼: Group Open/Close All (접이식 그룹 전체), CSS Open/Close All (CSS 편집창 전체)

// ==PURE-START==
// 끄기: 안쪽을 건드리지 않고 "어떤 환경에서도 적용되지 않는" @media 로 감쌈 (안에 주석이 있어도 안전)
//  H2 : @media not all /*[OFF]*/ {  ...  }/*[OFF]*/
//  H3 : @media not all /*[OFF3]*/ { ...  }/*[OFF3]*/
const OFF_OPEN = '@media not all /*[OFF]*/ {\n';
const OFF_CLOSE = '\n}/*[OFF]*/';
const OFF3_OPEN = '@media not all /*[OFF3]*/ {\n';
const OFF3_CLOSE = '\n}/*[OFF3]*/';
const wrapRe = (open, close) => new RegExp(
    '^(\\s*)' + open.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&').replace(/\n/g, '\\n')
    + '([\\s\\S]*)' + close.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&').replace(/\n/g, '\\n') + '(\\s*)$');
const OFF_RE = wrapRe(OFF_OPEN, OFF_CLOSE);
const OFF3_RE = wrapRe(OFF3_OPEN, OFF3_CLOSE);

// ── 설정 ──
//  tpl : 레벨별 사용자 지정 제목 형식 (빈 문자열 = 기본 규칙)
//  stop : 사용자 지정 멈춤 표시 (빈 문자열 = /*---*/)
//  hiRes : 아바타 썸네일 대신 원본 이미지 사용 (고화질)
//  radio : 라디오 그룹 표시 형식 (빈 문자열 = [X])
//  radioOn : 라디오 그룹 사용 여부
const DEFAULT_CFG = { tpl: { 1: '', 2: '', 3: '' }, stop: '', hiRes: false, radio: '', radioOn: true };

function normCfg(c) {
    const src = c && typeof c === 'object' ? c : {};
    const out = {
        tpl: {},
        stop: typeof src.stop === 'string' ? src.stop.trim() : '',
        hiRes: !!src.hiRes,
        radio: typeof src.radio === 'string' ? src.radio.trim() : '',
        radioOn: src.radioOn === undefined ? true : !!src.radioOn,
    };
    [1, 2, 3].forEach((lv) => {
        out.tpl[lv] = src.tpl && typeof src.tpl[lv] === 'string' ? src.tpl[lv].trim() : '';
    });
    return out;
}

// 제목 인식: 기호 run(: = -)이 제목 앞뒤 양쪽에 모두 있어야 함.
//  한 줄 형식   /*:: 제목 ::*/
//  여러 줄 형식 /*----\n:: 제목 ::\n----*/  (위아래 줄은 장식)
const DECO = '[=\\-:~_*#]*';
const mkHeadRes = (cls) => [
    new RegExp('^[ \\t]*\\/\\*[ \\t]*([' + cls + '])\\1+[ \\t]*([^\\r\\n]*?)[ \\t]*\\1{2,}[ \\t]*\\*\\/[ \\t]*$', 'gm'),
    new RegExp('^[ \\t]*\\/\\*[ \\t]*' + DECO + '[ \\t]*\\r?\\n[ \\t]*([' + cls + '])\\1+[ \\t]*([^\\r\\n]*?)[ \\t]*\\1{2,}[ \\t]*\\r?\\n[ \\t]*' + DECO + '[ \\t]*\\*\\/[ \\t]*$', 'gm'),
];
const DEFAULT_RES = { 1: mkHeadRes(':'), 2: mkHeadRes('='), 3: mkHeadRes('\\-') };
const DEFAULT_SPEC = 4;

// 사용자 지정 형식 검사/컴파일. 예) /*++H2++*/
const PH_RE = /\bH[123]\b/i;
const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&').replace(/\s+/g, '[ \\t]*');

function checkTpl(tpl) {
    const t = (tpl || '').trim();
    if (!t) return { empty: true };
    const m = PH_RE.exec(t);
    if (!m) return { ok: false, reason: 'H1 / H2 / H3 자리가 필요해요 (예: /*++H2++*/)' };
    const pre = t.slice(0, m.index).replace(/\s+$/, '');
    const suf = t.slice(m.index + m[0].length).replace(/^\s+/, '');
    if (!pre.startsWith('/*') || !suf.endsWith('*/')) {
        return { ok: false, reason: '/* 로 시작해서 */ 로 끝나는 CSS 주석 형식이어야 해요 (예: /*++H2++*/)' };
    }
    if (pre.includes('*/') || suf.indexOf('*/') !== suf.length - 2) {
        return { ok: false, reason: '*/ 는 맨 끝에만 올 수 있어요' };
    }
    if (pre.length + suf.length <= 4) {
        return { ok: false, reason: '앞뒤에 구분용 기호나 글자를 넣어주세요 (예: /*++H2++*/)' };
    }
    return { ok: true, pre, suf };
}

const tplCache = new Map();
function compileTpl(tpl) {
    if (tplCache.has(tpl)) return tplCache.get(tpl);
    const chk = checkTpl(tpl);
    let out = null;
    if (chk.ok) {
        // 그룹 1은 비워 두고(기본 규칙과 자리를 맞춤), 그룹 2가 제목
        const re = new RegExp('^[ \\t]*()' + reEsc(chk.pre) + '[ \\t]*([^\\r\\n]*?)[ \\t]*' + reEsc(chk.suf) + '[ \\t]*$', 'gm');
        out = { re, spec: chk.pre.length + chk.suf.length };
    }
    tplCache.set(tpl, out);
    return out;
}

function headRes(cfg, lv) {
    const c = cfg.tpl[lv] ? compileTpl(cfg.tpl[lv]) : null;
    return c ? { res: [c.re], spec: c.spec } : { res: DEFAULT_RES[lv], spec: DEFAULT_SPEC };
}

// ── 멈춤 표시 ──
//  기본: /*---*/ (가운데 - 3개, 안쪽 공백은 있어도 없어도 됨)
const STOP_DEFAULT_SRC = '^[ \\t]*\\/\\*[ \\t]*-{3}[ \\t]*\\*\\/[ \\t]*$';

function checkStop(str) {
    const t = (str || '').trim();
    if (!t) return { empty: true };
    if (!t.startsWith('/*') || !t.endsWith('*/')) {
        return { ok: false, reason: '/* 로 시작해서 */ 로 끝나는 CSS 주석 형식이어야 해요 (예: /*---*/)' };
    }
    const inner = t.slice(2, -2);
    if (inner.includes('*/') || inner.includes('/*')) {
        return { ok: false, reason: '주석 안에 /* 나 */ 를 넣을 수 없어요' };
    }
    if (!inner.trim()) {
        return { ok: false, reason: '주석 안에 구분용 기호나 글자를 넣어주세요 (예: /*---*/)' };
    }
    return { ok: true, text: t };
}

function stopSource(cfg) {
    const chk = checkStop(cfg.stop);
    return chk.ok ? '^[ \\t]*' + reEsc(chk.text) + '[ \\t]*$' : STOP_DEFAULT_SRC;
}

// text 안의 멈춤 표시들 (줄 앞 들여쓰기 포함해서 raw 로 돌려줌)
function findStops(text, cfg) {
    const re = new RegExp(stopSource(cfg), 'gm');
    const out = [];
    let m;
    while ((m = re.exec(text))) {
        if (m[0] === '') { re.lastIndex++; continue; }
        out.push({ raw: m[0], start: m.index, end: m.index + m[0].length });
    }
    return out;
}

// region(제목 바로 뒤 ~ 다음 H1/H2 제목 직전) 안에서, 이 제목 자신을 끝내는 멈춤 표시.
//  H3 이 열려 있는 동안 나오는 멈춤 표시는 그 H3 을 끝내는 것이므로 건너뜀.
function findChunkStop(region, cfg) {
    const h3 = findHeads(region, headRes(cfg, 3).res).filter((h) => !isOffTitle(h.title));
    const stops = findStops(region, cfg).filter((st) => !h3.some((h) => st.start < h.end && st.end > h.start));
    const ev = h3.map((h) => ({ kind: 'h', pos: h.start }))
        .concat(stops.map((st) => ({ kind: 's', pos: st.start, stop: st })))
        .sort((a, b) => a.pos - b.pos);
    let open = false;
    for (const e of ev) {
        if (e.kind === 'h') open = true;
        else if (open) open = false;
        else return e.stop;
    }
    return null;
}

const HAS_WORD = /[\p{L}\p{N}]/u;

const validTitle = (t) => !!t && !t.includes('*/') && !t.includes('/*') && HAS_WORD.test(t);
const isOffTitle = (t) => /^\[OFF\d?\]/.test(t) || /\[OFF\d?\]$/.test(t);
const edgeSplit = (s) => s.match(/^(\s*)([\s\S]*?)(\s*)$/);

function findHeads(text, res) {
    const found = [];
    res.forEach((re) => {
        let m;
        re.lastIndex = 0;
        while ((m = re.exec(text))) {
            const title = m[2].trim();
            if (!validTitle(title)) continue;
            found.push({ ch: m[1], title, raw: m[0], start: m.index, end: m.index + m[0].length });
        }
    });
    found.sort((x, y) => x.start - y.start);
    const out = [];
    found.forEach((h) => { if (!out.length || h.start >= out[out.length - 1].end) out.push(h); });
    return out;
}

// H1/H2 제목을 한꺼번에 찾음. 같은 자리에서 겹치면 더 구체적인(긴) 형식이 우선
function findHeads12(text, cfg) {
    const all = [];
    [1, 2].forEach((lv) => {
        const r = headRes(cfg, lv);
        findHeads(text, r.res).forEach((h) => all.push({ ...h, level: lv, spec: r.spec }));
    });
    all.sort((x, y) => x.start - y.start || y.spec - x.spec);
    const out = [];
    all.forEach((h) => { if (!out.length || h.start >= out[out.length - 1].end) out.push(h); });
    return out;
}

// stop : 이 조각을 끝내는 멈춤 표시 raw (없으면 ''), post : 멈춤 표시 뒤에 보충한 줄바꿈
function mkSeg(title, raw, text, stop) {
    const st = stop || '';
    if (title !== null) {
        const off = text.match(OFF3_RE);
        if (off) return { title, raw, enabled: false, lead: off[1], body: off[2], trail: off[3], stop: st, post: '' };
    }
    const t = edgeSplit(text);
    return { title, raw, enabled: true, lead: t[1], body: t[2], trail: t[3], stop: st, post: '' };
}

// H3 본문의 끝 (꺼진 H3 /*[OFF3]...[OFF3]*/ 는 안에 줄바꿈이 있어도 닫는 표식까지를 한 덩어리로 봄)
function h3End(body, from, limit) {
    let p = from;
    while (p < limit && /\s/.test(body[p])) p++;
    if (body.startsWith(OFF3_OPEN, p)) {
        const c = body.indexOf(OFF3_CLOSE, p + OFF3_OPEN.length);
        if (c >= 0 && c + OFF3_CLOSE.length <= limit) return c + OFF3_CLOSE.length;
    }
    return limit;
}

// H3으로 본문을 쪼갬. H3은 멈춤 표시 또는 다음 제목에서 끝나고,
// 그 뒤 남은 부분은 제목 없는 조각으로 이어짐 (멈춤 표시는 끝나는 H3 조각에 붙음)
function splitSegs(body, cfg) {
    cfg = cfg || DEFAULT_CFG;
    const marks = findHeads(body, headRes(cfg, 3).res).filter((h) => !isOffTitle(h.title));
    const stops = findStops(body, cfg);
    const segs = [mkSeg(null, '', body.slice(0, marks.length ? marks[0].start : body.length))];
    marks.forEach((k, i) => {
        const limit = i + 1 < marks.length ? marks[i + 1].start : body.length;
        const stop = stops.find((st) => st.start >= k.end && st.end <= limit);
        let cut = h3End(body, k.end, stop ? stop.start : limit);
        let stopRaw = '';
        let next = cut;
        if (stop && /^\s*$/.test(body.slice(cut, stop.start))) {
            cut = stop.start;
            stopRaw = stop.raw;
            next = stop.end;
        }
        segs.push(mkSeg(k.title, k.raw, body.slice(k.end, cut), stopRaw));
        if (next < limit) segs.push(mkSeg(null, '', body.slice(next, limit)));
    });
    return segs;
}

function makeChunk(level, raw, title, body, cfg, extra) {
    let enabled = true;
    if (level === 2) {
        const off = body.match(OFF_RE);
        if (off) {
            enabled = false;
            body = off[1] + off[2] + off[3];
        }
    }
    return Object.assign(
        { level, raw, title, enabled, segs: splitSegs(body, cfg), gid: null, orphan: false, key: '', stop: '', post: '' },
        extra,
    );
}

// level 0: 첫 제목 위쪽(또는 멈춤 표시 뒤에 남은 일반 CSS = orphan), 1: H1, 2: H2
//  (각 제목은 다음 H1/H2 제목 또는 멈춤 표시 직전까지)
//  gid : 소속 H1 그룹 번호 (H1 밖이면 null)
//  멈춤 표시: 지금 열려 있는 가장 작은 제목(H3 → H2 → H1)을 끝냄. H3 은 splitSegs 에서 처리하고,
//  여기서는 H2 / H1 을 끝내는 멈춤 표시를 처리함 (그 제목 chunk 의 stop 으로 붙음)
function parse(text, cfgIn) {
    const cfg = normCfg(cfgIn);
    const heads = findHeads12(text, cfg);
    const chunks = [];
    const preEnd = heads.length ? heads[0].start : text.length;
    if (preEnd > 0) chunks.push(makeChunk(0, '', '', text.slice(0, preEnd), cfg));

    const mkOrphan = (body, g, stopRaw) => makeChunk(0, '', '', body, cfg, { gid: g, orphan: true, stop: stopRaw || '' });

    let gid = null; // 현재 H1 그룹 번호
    heads.forEach((h, i) => {
        const regionEnd = i + 1 < heads.length ? heads[i + 1].start : text.length;
        if (h.level === 1) gid = i;
        const region = text.slice(h.end, regionEnd);
        const stop = findChunkStop(region, cfg);
        const bodyText = stop ? region.slice(0, stop.start) : region;
        chunks.push(makeChunk(h.level, h.raw, h.title, bodyText, cfg, { gid, stop: stop ? stop.raw : '' }));
        if (!stop) return;

        // 제목이 멈춤 표시로 끝남 → 뒤에 남은 CSS는 제목 없는 조각(orphan)
        if (h.level === 1) gid = null; // H1 이 끝났으니 이후는 그룹 밖
        const rem = region.slice(stop.end);
        if (rem === '') return;
        // H1 안에 있는 상태(H2 가 끝난 뒤)에서 또 멈춤 표시가 나오면 그건 H1 을 끝냄
        const s2 = gid !== null ? findChunkStop(rem, cfg) : null;
        if (s2) {
            chunks.push(mkOrphan(rem.slice(0, s2.start), gid, s2.raw));
            gid = null;
            const rem2 = rem.slice(s2.end);
            if (rem2 !== '') chunks.push(mkOrphan(rem2, null, ''));
        } else {
            chunks.push(mkOrphan(rem, gid, ''));
        }
    });
    return chunks;
}

const segText = (s) => s.raw + (s.title !== null && !s.enabled
    ? s.lead + OFF3_OPEN + s.body + OFF3_CLOSE + s.trail
    : s.lead + s.body + s.trail) + s.stop + s.post;
const segsText = (c) => c.segs.map(segText).join('');

// 멈춤 표시는 @media 바깥에 둠 (꺼도 제목 범위가 그대로 유지되도록)
function chunkText(c) {
    const tail = c.stop + c.post;
    if (c.level === 2 && !c.enabled) {
        const t = edgeSplit(segsText(c));
        return c.raw + t[1] + OFF_OPEN + t[2] + OFF_CLOSE + t[3] + tail;
    }
    return c.raw + segsText(c) + tail;
}

const build = (chunks) => chunks.map(chunkText).join('');

// ── 복사용: OFF 표식 없이 제목 + 내용(+ 멈춤 표시) 그대로 ──
const plainSeg = (s) => s.raw + s.lead + s.body + s.trail + s.stop + s.post;
const plainChunk = (c) => c.raw + c.segs.map(plainSeg).join('') + c.stop + c.post;

// ── 순서 바꾸기 ──
// 이어 붙였을 때 제목이 줄 맨 앞에서 시작하도록, 줄바꿈 없이 끝난 조각 뒤에 줄바꿈을 보충
//  items: [{ text(), addNl() }]
function fixJoins(items) {
    let prev = null;
    items.forEach((it) => {
        const t = it.text();
        if (!t) return;
        if (prev && !/\n$/.test(prev.text()) && !/^\r?\n/.test(t)) prev.addNl();
        prev = it;
    });
}

// 줄바꿈 보충: 멈춤 표시가 있으면 그 뒤에, 없으면 본문 뒤에 붙임 (멈춤 표시 앞에 끼어들지 않도록)
const segAddNl = (s) => { if (s.stop) s.post += '\n'; else s.trail += '\n'; };
const chunkAddNl = (c) => { if (c.stop) c.post += '\n'; else segAddNl(c.segs[c.segs.length - 1]); };

// 내용 없이 공백만 남은 "제목 없는 조각" (항목과 함께 이동시킴)
const isBlankOrphan = (c) => c.level === 0 && c.orphan && c.segs.every((s) => s.title === null && s.body === '');

// list[i] 항목이 차지하는 범위의 끝(미포함). H1은 소속 H2들까지, 뒤따르는 빈 조각 포함
function unitEnd(list, i) {
    const c = list[i];
    let j = i + 1;
    if (c.level === 1) {
        while (j < list.length && list[j].gid === c.gid) j++;
        while (j < list.length && isBlankOrphan(list[j])) j++;
    } else {
        while (j < list.length && isBlankOrphan(list[j]) && list[j].gid === c.gid) j++;
    }
    return j;
}

// chunk(H1 그룹 또는 H2)를 before 앞으로 옮긴 새 배열을 돌려줌. before 가 null 이면 gid 그룹(없으면 맨 끝)의 끝으로.
// 바뀌는 게 없으면 null
function moveChunk(list, chunk, before, gid) {
    const from = list.indexOf(chunk);
    if (from < 0 || chunk === before) return null;
    const unit = list.slice(from, unitEnd(list, from));
    const rest = list.slice(0, from).concat(list.slice(from + unit.length));
    let at;
    if (before) {
        at = rest.indexOf(before);
        if (at < 0) return null;
    } else if (gid === null || gid === undefined) {
        at = rest.length;
    } else {
        at = 0;
        rest.forEach((c, i) => { if (c.gid === gid) at = i + 1; });
    }
    if (at === from) return null;
    const out = rest.slice(0, at).concat(unit, rest.slice(at));
    fixJoins(out.map((c) => ({
        text: () => chunkText(c),
        addNl: () => chunkAddNl(c),
    })));
    return out;
}

// chunk 안에서 H3 항목(seg)을 before 앞으로 옮김. 바뀌었으면 true
function moveSeg(chunk, seg, before) {
    const segs = chunk.segs;
    const from = segs.indexOf(seg);
    if (from < 0 || seg === before) return false;
    let to = from + 1;
    while (to < segs.length && segs[to].title === null && segs[to].body === '') to++;
    const unit = segs.slice(from, to);
    const rest = segs.slice(0, from).concat(segs.slice(to));
    const at = before ? rest.indexOf(before) : rest.length;
    if (at < 0 || at === from) return false;
    const out = rest.slice(0, at).concat(unit, rest.slice(at));
    fixJoins(out.map((s) => ({
        text: () => segText(s),
        addNl: () => segAddNl(s),
    })));
    chunk.segs = out;
    return true;
}

function buildTree(chunks) {
    const nodes = [];
    const groups = new Map();
    for (const c of chunks) {
        if (c.level === 1) {
            const g = { type: 'group', chunk: c, children: [] };
            groups.set(c.gid, g);
            nodes.push(g);
        } else if (c.gid !== null && groups.has(c.gid)) {
            groups.get(c.gid).children.push(c);
        } else if (c.level === 0) {
            nodes.push({ type: c.orphan ? 'orphan' : 'pre', chunk: c });
        } else {
            nodes.push({ type: 'section', chunk: c });
        }
    }
    return nodes;
}
// ── 라디오 그룹 ──
//  제목이 [1] / [A] / [a] 같은 표시로 시작하는 이웃 항목들이 이어져 있으면 한 그룹.
//  표시 없는 항목이 끼거나, 종류(숫자/대문자/소문자)가 바뀌거나, 같은 표시가 다시 나오면 새 그룹.
//  항목이 1개뿐인 그룹은 라디오로 치지 않음.
const RADIO_DEFAULT = '[X]';
const RADIO_PH = /(?<![\p{L}\p{N}])[Xx](?![\p{L}\p{N}])/u;
const RADIO_VAL = '([0-9]{1,3}|[A-Za-z])';

// 라디오 표시 형식 검사. 예) (X)  → (1) (2) / (A) (B)
function checkRadio(tpl) {
    const t = (tpl || '').trim();
    if (!t) return { empty: true };
    const m = RADIO_PH.exec(t);
    if (!m) return { ok: false, reason: 'X 자리가 필요해요 (예: [X], (X))' };
    const pre = t.slice(0, m.index);
    const suf = t.slice(m.index + m[0].length);
    if (!(pre + suf).trim()) return { ok: false, reason: '앞뒤에 구분용 기호를 넣어주세요 (예: [X], (X))' };
    return { ok: true, pre, suf };
}

const radioCache = new Map();
function compileRadio(tpl) {
    const key = tpl || '';
    if (radioCache.has(key)) return radioCache.get(key);
    const chk = checkRadio(key);
    const pre = chk.ok ? chk.pre : '[';
    const suf = chk.ok ? chk.suf : ']';
    // 뒤 기호가 없으면 \"[1]이름\" 처럼 붙여 쓴 글자와 구분하기 위해 단어가 이어지는 경우는 제외
    const re = new RegExp('^' + reEsc(pre) + RADIO_VAL + reEsc(suf) + (suf.trim() ? '' : '(?![\\p{L}\\p{N}])'), 'u');
    radioCache.set(key, re);
    return re;
}

// 화면에 보여줄 예시 ([X] → [1])
function radioSample(cfg, v) {
    const chk = checkRadio(cfg && cfg.radio);
    return chk.ok ? chk.pre + v + chk.suf : '[' + v + ']';
}

function radioTag(title, cfg) {
    const m = compileRadio(cfg && cfg.radio).exec((title || '').trim());
    if (!m) return null;
    const v = m[1];
    return { v, kind: /[0-9]/.test(v) ? 'n' : (v === v.toUpperCase() ? 'U' : 'L') };
}

// items: [{ title, ref }] (화면 순서) → Map(ref → 그룹 id 문자열)
function radioGroups(items, prefix, cfg) {
    const groups = [];
    if (cfg && cfg.radioOn === false) return new Map();
    let cur = null;
    items.forEach((it) => {
        const t = radioTag(it.title, cfg);
        if (!t) { cur = null; return; }
        if (!cur || cur.kind !== t.kind || cur.seen.has(t.v)) {
            cur = { kind: t.kind, seen: new Set(), refs: [] };
            groups.push(cur);
        }
        cur.seen.add(t.v);
        cur.refs.push(it.ref);
    });
    const out = new Map();
    groups.forEach((g, i) => {
        if (g.refs.length > 1) g.refs.forEach((r) => out.set(r, prefix + i));
    });
    return out;
}
// ==PURE-END==

(() => {
    const TEXTAREA_ID = 'customCSS';
    const MODE_KEY = 'csst_toggle_mode';
    const SIDE_KEY = 'csst_side_open';
    const SIDE_MODE_KEY = 'csst_side_check';
    const SIDE_POS_KEY = 'csst_side_pos';
    const HANDLE_KEY = 'csst_handle_mode';
    const OPEN_KEY = 'csst_open_groups';
    const EDIT_KEY = 'csst_open_editors';
    const SETTINGS_KEY = 'csst';
    const SETTINGS_LS = 'csst_settings';
    const PRE_TITLE = 'Default';

    const el = (tag, cls, text) => {
        const e = document.createElement(tag);
        if (cls) e.className = cls;
        if (text !== undefined) e.textContent = text;
        return e;
    };
    const loadSet = (k) => {
        try { return new Set(JSON.parse(localStorage.getItem(k) || '[]')); } catch (e) { return new Set(); }
    };
    const saveSet = (k, s) => {
        try { localStorage.setItem(k, JSON.stringify([...s])); } catch (e) { /* ignore */ }
    };
    const autosize = (t) => {
        t.style.height = 'auto';
        t.style.height = Math.min(t.scrollHeight + 2, Math.round(window.innerHeight * 0.5)) + 'px';
    };
    const autosizeIn = (root) => root.querySelectorAll('textarea.csst-edit').forEach(autosize);

    const makeHandle = () => {
        const h = el('i', 'fa-solid fa-grip-vertical csst-handle');
        h.title = '끌어서 순서 바꾸기';
        return h;
    };

    // 클립보드 복사 (https 가 아닌 환경 대비 폴백 포함)
    function copyText(text) {
        if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
        return new Promise((resolve, reject) => {
            const t = document.createElement('textarea');
            t.value = text;
            t.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;';
            document.body.appendChild(t);
            t.select();
            let ok = false;
            try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
            t.remove();
            if (ok) resolve(); else reject(new Error('copy failed'));
        });
    }

    // SillyTavern 채팅 메시지의 복사 버튼과 같은 모양 (mes_copy 클래스는 ST 전용 동작이 걸려 있어 쓰지 않음)
    function makeCopyBtn(getText) {
        const b = el('div', 'mes_button fa-solid fa-copy interactable csst-copy');
        b.title = 'Copy';
        b.tabIndex = 0;
        b.addEventListener('click', (e) => {
            e.stopPropagation();
            copyText(getText()).then(() => {
                b.classList.replace('fa-copy', 'fa-check');
                setTimeout(() => b.classList.replace('fa-check', 'fa-copy'), 1000);
            }).catch(() => {
                if (window.toastr) window.toastr.error('복사에 실패했어요');
            });
        });
        return b;
    }

    function scrollParent(node) {
        for (let p = node.parentElement; p && p !== document.body; p = p.parentElement) {
            const o = getComputedStyle(p).overflowY;
            if ((o === 'auto' || o === 'scroll') && p.scrollHeight > p.clientHeight) return p;
        }
        return window;
    }

    // ── 설정 저장/불러오기 (SillyTavern 설정 + localStorage 백업) ──
    const stContext = () => {
        try {
            const c = window.SillyTavern && window.SillyTavern.getContext && window.SillyTavern.getContext();
            return c && c.extensionSettings ? c : null;
        } catch (e) { return null; }
    };
    function loadCfg() {
        let raw = null;
        const c = stContext();
        if (c) raw = c.extensionSettings[SETTINGS_KEY];
        if (!raw) {
            try { raw = JSON.parse(localStorage.getItem(SETTINGS_LS) || 'null'); } catch (e) { raw = null; }
        }
        return normCfg(raw);
    }
    function saveCfg(cfg) {
        const c = stContext();
        if (c) {
            c.extensionSettings[SETTINGS_KEY] = cfg;
            if (typeof c.saveSettingsDebounced === 'function') c.saveSettingsDebounced();
        }
        try { localStorage.setItem(SETTINGS_LS, JSON.stringify(cfg)); } catch (e) { /* ignore */ }
    }
    let CFG = null;
    const cfg = () => CFG || (CFG = loadCfg());

    // ── 고화질 아바타: /thumbnail?type=avatar|persona&file=... 주소를 원본 파일 주소로 바꿔치기 ──
    const HR_ATTR = 'data-csst-orig';
    function hiResUrl(src) {
        try {
            const u = new URL(src, location.origin);
            if (u.pathname !== '/thumbnail') return null;
            const type = u.searchParams.get('type');
            const file = u.searchParams.get('file');
            if (!file) return null;
            if (type === 'avatar') return '/characters/' + encodeURIComponent(file);
            if (type === 'persona') return '/User Avatars/' + encodeURIComponent(file);
        } catch (e) { /* ignore */ }
        return null;
    }
    function hrApply(img, on) {
        if (!(img instanceof HTMLImageElement)) return;
        if (on) {
            const cur = img.getAttribute('src');
            const hi = cur ? hiResUrl(cur) : null;
            if (hi) {
                img.setAttribute(HR_ATTR, cur);
                img.setAttribute('src', hi);
            }
        } else {
            const orig = img.getAttribute(HR_ATTR);
            if (orig) {
                img.removeAttribute(HR_ATTR);
                img.setAttribute('src', orig);
            }
        }
    }
    let hrObs = null;
    function setHiRes(on) {
        if (hrObs) { hrObs.disconnect(); hrObs = null; }
        document.querySelectorAll('img').forEach((i) => hrApply(i, on));
        if (!on) return;
        hrObs = new MutationObserver((muts) => {
            muts.forEach((m) => {
                if (m.type === 'attributes') {
                    hrApply(m.target, true);
                } else {
                    m.addedNodes.forEach((n) => {
                        if (n.nodeType !== 1) return;
                        if (n.tagName === 'IMG') hrApply(n, true);
                        else if (n.querySelectorAll) n.querySelectorAll('img').forEach((i) => hrApply(i, true));
                    });
                }
            });
        });
        hrObs.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] });
    }

    // 같은 textarea(#customCSS)를 보는 뷰(인라인 패널 / 사이드 패널)들
    const views = [];

    function createView(ta, container, ns) {
        let chunks = [];
        let lastSynced = null;
        let editorCtl = [];
        let groupCtl = [];
        let updateToolBtn = () => {};
        // 라디오 그룹: 그룹 id → 멤버들 [{ set(on) }], H2 → 그룹 id
        let radioReg = new Map();
        let chunkRadio = new Map();
        let radioSeq = 0;
        const radioJoin = (id, member) => {
            if (!radioReg.has(id)) radioReg.set(id, []);
            radioReg.get(id).push(member);
        };
        const radioPick = (id, member) => (radioReg.get(id) || []).forEach((m) => m.set(m === member));
        const openGroups = loadSet(OPEN_KEY + ns);
        const openEditors = loadSet(EDIT_KEY + ns);
        let handleOn = false;
        try { handleOn = localStorage.getItem(HANDLE_KEY + ns) === '1'; } catch (e) { /* ignore */ }
        container.classList.toggle('csst-handle-on', handleOn);

        function commit() {
            ta.value = build(chunks);
            lastSynced = ta.value;
            ta.dispatchEvent(new Event('input', { bubbles: true }));
        }

        function moveChunkTo(c, before, gid) {
            const next = moveChunk(chunks, c, before, gid);
            if (!next) return;
            chunks = next;
            commit();
            render();
        }

        // 핸들을 끌어서 같은 목록(list) 안에서 순서 바꾸기.
        //  list: [{ el, ref }] (화면 순서), onDrop(ref, beforeRef | null)
        function attachSort(handle, entry, list, onDrop) {
            handle.addEventListener('click', (e) => e.stopPropagation());
            handle.addEventListener('pointerdown', (e) => {
                if (e.pointerType === 'mouse' && e.button !== 0) return;
                e.preventDefault();
                e.stopPropagation();
                try { handle.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
                const scroller = scrollParent(container);
                let y = e.clientY;
                let target = null;
                let raf = 0;
                entry.el.classList.add('csst-dragging');

                const clear = () => list.forEach((x) => x.el.classList.remove('csst-drop-before', 'csst-drop-end'));
                const mark = () => {
                    clear();
                    const others = list.filter((x) => x !== entry);
                    target = null;
                    for (const x of others) {
                        const r = x.el.getBoundingClientRect();
                        if (y < r.top + Math.min(r.height / 2, 24)) { target = x; break; }
                    }
                    if (target) target.el.classList.add('csst-drop-before');
                    else if (others.length) others[others.length - 1].el.classList.add('csst-drop-end');
                };
                const tick = () => {
                    const box = scroller === window
                        ? { top: 0, bottom: window.innerHeight } : scroller.getBoundingClientRect();
                    let dy = 0;
                    if (y < box.top + 36) dy = -14; else if (y > box.bottom - 36) dy = 14;
                    if (dy) {
                        if (scroller === window) window.scrollBy(0, dy); else scroller.scrollTop += dy;
                        mark();
                    }
                    raf = requestAnimationFrame(tick);
                };
                const onMove = (ev) => { y = ev.clientY; mark(); };
                const finish = (apply) => {
                    cancelAnimationFrame(raf);
                    handle.removeEventListener('pointermove', onMove);
                    handle.removeEventListener('pointerup', onUp);
                    handle.removeEventListener('pointercancel', onCancel);
                    try { handle.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
                    clear();
                    entry.el.classList.remove('csst-dragging');
                    if (apply) onDrop(entry.ref, target ? target.ref : null);
                };
                const onUp = () => finish(true);
                const onCancel = () => finish(false);
                handle.addEventListener('pointermove', onMove);
                handle.addEventListener('pointerup', onUp);
                handle.addEventListener('pointercancel', onCancel);
                mark();
                raf = requestAnimationFrame(tick);
            });
        }

        function makeEditor(seg) {
            const ed = el('div', 'csst-editor');
            const area = el('textarea', 'csst-edit text_pole');
            area.spellcheck = false;
            area.value = seg.body;
            area.addEventListener('input', () => {
                seg.body = area.value;
                autosize(area);
                commit();
            });
            ed.appendChild(area);
            return { ed, area };
        }

        // 체크박스(선택) + 제목 + [</>] 편집 버튼 한 줄. 편집창은 평소엔 접혀 있음
        function makeRow(o) {
            // 제목 없이 CSS 편집창만 바로 보여주는 모드
            if (o.bare) {
                const item = el('div', 'csst-item csst-bare');
                const { ed, area } = makeEditor(o.seg);
                item.appendChild(ed);
                return { item, cb: null, area };
            }

            const item = el('div', 'csst-item' + (o.sub ? ' csst-sub' : ''));
            const row = el('div', 'csst-row');
            let handle = null;
            if (o.handle) {
                handle = makeHandle();
                row.appendChild(handle);
            }
            const title = el('span', 'csst-title', o.title);
            let cb = null;
            if (o.toggle) {
                const label = el('label', 'checkbox_label csst-label');
                cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.checked = o.checked;
                if (o.radio) {
                    cb.classList.add('csst-radio-cb');
                    label.classList.add('csst-radio-label');
                    item.classList.add('csst-radio');
                }
                cb.addEventListener('change', () => {
                    // 라디오: 누르면 항상 "이 항목 선택" (이미 선택된 걸 눌러도 해제되지 않고, 다른 항목은 꺼짐)
                    if (o.radio) { cb.checked = true; o.onChange(true); return; }
                    o.onChange(cb.checked);
                });
                label.append(cb, title);
                row.appendChild(label);
            } else {
                const label = el('div', 'csst-label');
                label.appendChild(title);
                row.appendChild(label);
            }

            // 복사 버튼은 항상 줄의 맨 오른쪽 (</> 버튼이 없어도 위치 고정, </> 버튼은 그 왼쪽)
            const copyBtn = o.copy ? makeCopyBtn(o.copy) : null;

            let area = null;
            if (o.seg) {
                const editBtn = el('i', 'fa-solid fa-code csst-edit-btn');
                editBtn.title = 'CSS 편집';
                const made = makeEditor(o.seg);
                const ed = made.ed;
                area = made.area;
                const setEd = (open, persist) => {
                    ed.style.display = open ? 'block' : 'none';
                    editBtn.classList.toggle('csst-active', open);
                    if (open) autosize(area);
                    if (persist) {
                        if (open) openEditors.add(o.key); else openEditors.delete(o.key);
                        saveSet(EDIT_KEY + ns, openEditors);
                    }
                };
                editBtn.addEventListener('click', () => {
                    setEd(ed.style.display === 'none', true);
                    updateToolBtn();
                });
                editorCtl.push({ set: setEd, isOpen: () => ed.style.display !== 'none' });
                row.appendChild(editBtn);
                if (copyBtn) row.appendChild(copyBtn);
                item.append(row, ed);
                setEd(openEditors.has(o.key), false);
            } else {
                if (copyBtn) row.appendChild(copyBtn);
                item.appendChild(row);
            }
            return { item, cb, area, handle };
        }

        // H2(체크박스) 또는 H1/머리말의 자체 CSS + 그 아래 H3 항목들
        function makeBlock(chunk, o) {
            const seg0 = chunk.segs[0];
            // 첫 조각 이후: H3 항목, 그리고 H3이 끝난 뒤 남은 제목 없는 조각
            const rest = chunk.segs.slice(1).filter((s) => s.title !== null || s.body !== '');
            const showMain = o.toggle || seg0.body !== '';
            if (!showMain && !rest.length) return null;

            const locked = chunk.level === 0 && !chunk.orphan; // 맨 위 Default 영역: 끄기 불가
            const wrap = el('div', 'csst-block' + (o.radio ? ' csst-radio-block' : ''));
            const subs = [];
            let main = null;
            let mainMem = null;

            const refresh = () => {
                const parentOff = chunk.level === 2 && !chunk.enabled;
                if (main) {
                    main.item.classList.toggle('csst-off', parentOff);
                    if (main.area) main.area.readOnly = parentOff;
                }
                subs.forEach(({ row, seg }) => {
                    const off = parentOff || !seg.enabled;
                    row.item.classList.toggle('csst-off', off);
                    if (row.cb) row.cb.disabled = parentOff;
                    if (row.area) row.area.readOnly = off;
                });
            };

            if (showMain) {
                main = makeRow({
                    title: o.title,
                    toggle: o.toggle,
                    bare: o.bare,
                    checked: chunk.enabled,
                    seg: (seg0.body !== '' || !rest.length) ? seg0 : null,
                    key: o.key,
                    handle: !!o.handle,
                    radio: o.radio || null,
                    copy: o.toggle ? () => plainChunk(chunk).trim() : null,
                    onChange: (v) => {
                        if (mainMem) radioPick(o.radio, mainMem); else chunk.enabled = v;
                        refresh();
                        commit();
                    },
                });
                if (o.radio) {
                    mainMem = { set: (on) => { chunk.enabled = on; if (main.cb) main.cb.checked = on; refresh(); } };
                    radioJoin(o.radio, mainMem);
                }
                wrap.appendChild(main.item);
                wrap.csstHandle = main.handle;
            }
            const h3List = [];
            const subRadio = radioGroups(
                rest.filter((sg) => sg.title !== null).map((sg) => ({ title: sg.title, ref: sg })),
                'h3-' + (radioSeq++) + ':',
                cfg(),
            );
            rest.forEach((seg, i) => {
                const rid = seg.title !== null && !locked ? (subRadio.get(seg) || null) : null;
                let mem = null;
                const row = seg.title !== null
                    ? makeRow({
                        title: seg.title,
                        toggle: !locked,
                        checked: seg.enabled,
                        sub: !o.bare,
                        seg,
                        key: o.key + '>' + seg.title,
                        handle: true,
                        radio: rid,
                        copy: () => plainSeg(seg).trim(),
                        onChange: (v) => {
                            if (mem) radioPick(rid, mem); else seg.enabled = v;
                            refresh();
                            commit();
                        },
                    })
                    : makeRow({ bare: true, seg, key: o.key + '#rest' + i });
                if (rid) {
                    mem = { set: (on) => { seg.enabled = on; if (row.cb) row.cb.checked = on; refresh(); } };
                    radioJoin(rid, mem);
                }
                subs.push({ row, seg });
                wrap.appendChild(row.item);
                if (row.handle) {
                    const entry = { el: row.item, ref: seg };
                    h3List.push(entry);
                    attachSort(row.handle, entry, h3List, (s, before) => {
                        if (moveSeg(chunk, s, before)) { commit(); render(); }
                    });
                }
            });
            refresh();
            return wrap;
        }

        // 제목 없이 이어지는 조각(엔터 n번으로 제목 범위가 끝난 뒤 남은 CSS)
        const makeOrphan = (c) => makeBlock(c, { title: '', toggle: false, bare: true, key: c.key });

        // H1 = Custom Theme Inputs 같은 접이식 드로어
        function makeGroup(chunk, title, children, key, movable) {
            const g = el('div', 'csst-drawer');
            const head = el('div', 'csst-drawer-head');
            const icon = el('i', 'fa-solid fa-chevron-right csst-fold');
            const left = el('div', 'csst-drawer-left');
            const right = el('div', 'csst-drawer-right');
            left.appendChild(icon);
            if (movable) {
                g.csstHandle = makeHandle();
                left.appendChild(g.csstHandle);
            }
            left.appendChild(el('b', '', title));
            right.append(makeCopyBtn(() => [chunk, ...children].map(plainChunk).join('').trim()));
            head.append(left, right);
            const body = el('div', 'csst-drawer-body');

            const own = makeBlock(chunk, { title: '', toggle: false, bare: true, key: key + '#own' });
            if (own) body.appendChild(own);
            const kids = [];
            children.forEach((c) => {
                const b = c.orphan
                    ? makeOrphan(c)
                    : makeBlock(c, { title: c.title, toggle: true, handle: true, key: c.title, radio: chunkRadio.get(c) || null });
                if (!b) return;
                body.appendChild(b);
                if (!c.orphan && b.csstHandle) {
                    const entry = { el: b, ref: c };
                    kids.push(entry);
                    attachSort(b.csstHandle, entry, kids, (cc, before) => moveChunkTo(cc, before, chunk.gid));
                }
            });

            const setOpen = (o) => {
                body.style.display = o ? 'block' : 'none';
                icon.classList.toggle('csst-open', o);
                if (o) { autosizeIn(body); openGroups.add(key); } else openGroups.delete(key);
                saveSet(OPEN_KEY + ns, openGroups);
            };
            head.addEventListener('click', () => {
                setOpen(body.style.display === 'none');
                updateToolBtn();
            });

            g.append(head, body);
            groupCtl.push({ set: setOpen, isOpen: () => body.style.display !== 'none' });
            setOpen(openGroups.has(key));
            return g;
        }

        function render() {
            chunks = parse(ta.value, cfg());
            lastSynced = ta.value;
            container.innerHTML = '';
            editorCtl = [];
            groupCtl = [];
            radioReg = new Map();
            chunkRadio = new Map();
            radioSeq = 0;
            // H2 라디오 그룹: 같은 H1 그룹(또는 그룹 밖) 안의 H2 들을 순서대로 훑어서 묶음
            const h2ByGid = new Map();
            chunks.forEach((c) => {
                if (c.level !== 2) return;
                const k = String(c.gid);
                if (!h2ByGid.has(k)) h2ByGid.set(k, []);
                h2ByGid.get(k).push({ title: c.title, ref: c });
            });
            h2ByGid.forEach((list, k) => radioGroups(list, 'h2-' + k + ':', cfg()).forEach((id, c) => chunkRadio.set(c, id)));

            if (!chunks.some((c) => c.level > 0)) {
                const hint = el('div', 'csst-hint');
                hint.innerHTML = '제목이 없어요. CSS에 아래처럼 주석을 넣으면 여기에 나타납니다.<br>'
                    + '<code>/*:: H1 ::*/</code> 접기/펼치기 그룹<br>'
                    + '<code>/*== H2 ==*/</code> 체크박스로 끄고 켜기<br>'
                    + '<code>/*-- H3 --*/</code> 하위 체크박스로 끄고 켜기<br>'
                    + '<code>/*---*/</code> 가장 작은 제목을 여기서 끝냄<br>'
                    + (cfg().radioOn ? '제목을 <code>' + radioSample(cfg(), '1') + ' 이름</code>, <code>' + radioSample(cfg(), 'A') + ' 이름</code> 처럼 쓰면 같은 그룹에서 하나만 선택돼요.<br>' : '')
                    + '제목 형식은 Extensions → Check Box CSS 에서 수정할 수 있습니다.';
                container.appendChild(hint);
                return;
            }

            // 상단 버튼: 접이식 그룹 / CSS 편집창 전체 열기·닫기 (열기 위, 닫기 아래로 따로 배치)
            const tools = el('div', 'csst-tools');
            const groupOpenBtn = el('div', 'menu_button', 'Group Open All');
            const groupCloseBtn = el('div', 'menu_button', 'Group Close All');
            const cssOpenBtn = el('div', 'menu_button', 'CSS Open All');
            const cssCloseBtn = el('div', 'menu_button', 'CSS Close All');
            const groupCol = el('div', 'csst-tool-col');
            const cssCol = el('div', 'csst-tool-col');
            groupCol.append(groupOpenBtn, groupCloseBtn);
            cssCol.append(cssOpenBtn, cssCloseBtn);
            const handleBtn = el('div', 'menu_button', 'Handle Mode');
            handleBtn.classList.toggle('csst-on', handleOn);
            handleBtn.title = '핸들을 끌어서 H1 / H2 / H3 순서 바꾸기';
            handleBtn.addEventListener('click', () => {
                handleOn = !handleOn;
                container.classList.toggle('csst-handle-on', handleOn);
                handleBtn.classList.toggle('csst-on', handleOn);
                try { localStorage.setItem(HANDLE_KEY + ns, handleOn ? '1' : '0'); } catch (e) { /* ignore */ }
            });
            updateToolBtn = () => {
                groupCol.style.display = groupCtl.length ? '' : 'none';
                cssCol.style.display = (editorCtl.length || groupCtl.length) ? '' : 'none';
                tools.style.display = '';
            };
            groupOpenBtn.addEventListener('click', () => {
                groupCtl.forEach((c) => c.set(true));
                updateToolBtn();
            });
            groupCloseBtn.addEventListener('click', () => {
                groupCtl.forEach((c) => c.set(false));
                updateToolBtn();
            });
            cssOpenBtn.addEventListener('click', () => {
                groupCtl.forEach((c) => c.set(true));
                editorCtl.forEach((c) => c.set(true, true));
                updateToolBtn();
            });
            cssCloseBtn.addEventListener('click', () => {
                editorCtl.forEach((c) => c.set(false, true));
                groupCtl.forEach((c) => c.set(false));
                updateToolBtn();
            });
            tools.append(handleBtn, groupCol, cssCol);
            container.appendChild(tools);

            // 최상위(H1 그룹 / 그룹 밖 H2) 순서 바꾸기용 목록
            const topList = [];
            const addTop = (elm, handle, chunk) => {
                if (!handle) return;
                const entry = { el: elm, ref: chunk };
                topList.push(entry);
                attachSort(handle, entry, topList, (c, before) => moveChunkTo(c, before, null));
            };

            buildTree(chunks).forEach((n) => {
                if (n.type === 'pre') {
                    const hasAny = n.chunk.segs.some((s) => s.body || s.title);
                    if (hasAny) container.appendChild(makeGroup(n.chunk, PRE_TITLE, [], '__pre__', false));
                } else if (n.type === 'group') {
                    const g = makeGroup(n.chunk, n.chunk.title, n.children, n.chunk.title, true);
                    container.appendChild(g);
                    addTop(g, g.csstHandle, n.chunk);
                } else if (n.type === 'orphan') {
                    const b = makeOrphan(n.chunk);
                    if (b) container.appendChild(b);
                } else {
                    const b = makeBlock(n.chunk, { title: n.chunk.title, toggle: true, handle: true, key: n.chunk.title, radio: chunkRadio.get(n.chunk) || null });
                    if (b) {
                        container.appendChild(b);
                        addTop(b, b.csstHandle, n.chunk);
                    }
                }
            });
            updateToolBtn();
        }

        const isVisible = () => container.getClientRects().length > 0;

        // 외부(다른 뷰, 테마 변경 등)에서 CSS가 바뀌었으면 다시 그림
        function sync() {
            if (isVisible()
                && ta.value !== lastSynced
                && !container.contains(document.activeElement)) {
                render();
            }
        }

        // 설정이 바뀌었을 때: 보이는 뷰는 바로, 숨은 뷰는 나중에 보일 때 다시 그림
        function refresh() {
            lastSynced = null;
            if (isVisible()) render();
        }

        const api = { render, sync, refresh };
        views.push(api);
        return api;
    }

    function init() {
        const ta = document.getElementById(TEXTAREA_ID);
        if (!ta) return false;
        if (ta.dataset.csstInit) return true;
        ta.dataset.csstInit = '1';

        // ── 인라인 패널 (textarea 대체) ──
        const panel = el('div', 'csst-panel');
        panel.style.display = 'none';
        ta.insertAdjacentElement('afterend', panel);
        const inline = createView(ta, panel, '');

        // ── 사이드 패널 ──
        const side = el('div', 'csst-side');
        side.style.display = 'none';
        const sideHead = el('div', 'csst-side-head');
        const sideClose = el('i', 'fa-solid fa-xmark csst-side-close interactable');
        sideClose.title = '닫기';
        sideClose.tabIndex = 0;
        const sideModeBtn = el('i', 'fa-regular fa-square-check csst-side-btn interactable');
        sideModeBtn.title = '체크박스 모드 / 통 CSS 창 전환';
        sideModeBtn.tabIndex = 0;
        const sidePosBtn = el('i', 'fa-solid fa-arrow-left csst-side-btn interactable');
        sidePosBtn.title = '패널을 왼쪽으로 이동';
        sidePosBtn.tabIndex = 0;
        const sideTools = el('div', 'csst-side-tools');
        sideTools.append(sidePosBtn, sideModeBtn, sideClose);
        sideHead.append(el('b', '', 'CSS Sections'), sideTools);
        const sideBody = el('div', 'csst-side-body');
        // 통 CSS 창 (체크박스 모드를 끈 상태)
        const sideRaw = el('textarea', 'csst-side-raw text_pole');
        sideRaw.spellcheck = false;
        sideRaw.style.display = 'none';
        sideRaw.addEventListener('input', () => {
            ta.value = sideRaw.value;
            ta.dispatchEvent(new Event('input', { bubbles: true }));
        });
        side.append(sideHead, sideBody, sideRaw);
        document.body.appendChild(side);
        const sideView = createView(ta, sideBody, '_side');
        let sideCheck = true;

        // ── 버튼 2개: 체크박스 모드 전환 / 사이드 패널 ──
        const btn = el('i', 'fa-regular fa-square-check csst-switch interactable');
        btn.title = '체크박스 모드 전환';
        btn.tabIndex = 0;
        const sideBtn = el('i', 'fa-solid fa-table-columns csst-switch csst-side-toggle interactable');
        sideBtn.title = '오른쪽 CSS 패널 열기/닫기';
        sideBtn.tabIndex = 0;

        // 전체 Custom CSS 복사 (인라인 헤더용 / 사이드 패널용)
        const allCopy = makeCopyBtn(() => ta.value);
        allCopy.classList.add('csst-all');
        allCopy.title = 'Copy all CSS';
        const sideCopy = makeCopyBtn(() => ta.value);
        sideCopy.classList.add('csst-all');
        sideCopy.title = 'Copy all CSS';
        sideTools.insertBefore(sideCopy, sideClose);

        const maxBtn = document.querySelector(`.editor_maximize[data-for="${TEXTAREA_ID}"]`);
        if (maxBtn) {
            maxBtn.parentElement.classList.add('csst-head');
            maxBtn.insertAdjacentElement('afterend', btn);
            btn.insertAdjacentElement('afterend', sideBtn);
            sideBtn.insertAdjacentElement('afterend', allCopy);
        } else {
            const bar = el('div', 'csst-bar');
            bar.append(btn, sideBtn, allCopy);
            ta.insertAdjacentElement('beforebegin', bar);
        }

        function setMode(on) {
            ta.style.display = on ? 'none' : '';
            panel.style.display = on ? 'block' : 'none';
            if (on) inline.render();
            btn.classList.toggle('csst-active', on);
            try { localStorage.setItem(MODE_KEY, on ? '1' : '0'); } catch (e) { /* ignore */ }
        }

        // 사이드 패널 위치/크기를 SillyTavern 기본 Character Management 패널과 맞춤
        let sideLeft = false;
        function syncSideGeometry() {
            const ref = document.getElementById('right-nav-panel');
            if (!ref) return;
            const prev = { d: ref.style.display, v: ref.style.visibility };
            const hidden = getComputedStyle(ref).display === 'none';
            if (hidden) { ref.style.visibility = 'hidden'; ref.style.display = 'flex'; }
            const cs = getComputedStyle(ref);
            const r = ref.getBoundingClientRect();
            const snap = {
                width: r.width, top: r.top, height: r.height, zIndex: cs.zIndex,
                bg: cs.backgroundColor, filter: cs.backdropFilter || cs.webkitBackdropFilter,
                border: cs.border, shadow: cs.boxShadow, radius: cs.borderRadius,
            };
            if (hidden) { ref.style.display = prev.d; ref.style.visibility = prev.v; }
            if (!snap.width || !snap.height) return;
            side.style.width = snap.width + 'px';
            // top/bottom은 CSS 기본값(상단바 아래 ~ 화면 맨 아래) 유지: 숨겨진 패널에서 잰 높이는 부정확함
            side.style.maxWidth = '100vw';
            if (snap.bg) side.style.background = snap.bg;
            if (snap.filter && snap.filter !== 'none') {
                side.style.backdropFilter = snap.filter;
                side.style.webkitBackdropFilter = snap.filter;
            }
            if (snap.border) side.style.border = snap.border;
            if (snap.shadow) side.style.boxShadow = snap.shadow;
            if (snap.radius) side.style.borderRadius = snap.radius;
            const z = parseInt(snap.zIndex, 10);
            side.style.zIndex = String((Number.isFinite(z) ? z : 3000) + 1);
        }

        function setSidePos(left) {
            sideLeft = left;
            side.classList.toggle('csst-left', left);
            sidePosBtn.className = 'fa-solid csst-side-btn interactable '
                + (left ? 'fa-arrow-right' : 'fa-arrow-left');
            sidePosBtn.title = left ? '패널을 오른쪽으로 이동' : '패널을 왼쪽으로 이동';
            try { localStorage.setItem(SIDE_POS_KEY, left ? 'left' : 'right'); } catch (e) { /* ignore */ }
        }

        window.addEventListener('resize', () => {
            if (side.style.display !== 'none') syncSideGeometry();
        });

        function setSide(on) {
            if (on) syncSideGeometry();
            side.style.display = on ? 'flex' : 'none';
            sideBtn.classList.toggle('csst-active', on);
            if (on) {
                if (sideCheck) sideView.render(); else sideRaw.value = ta.value;
            }
            try { localStorage.setItem(SIDE_KEY, on ? '1' : '0'); } catch (e) { /* ignore */ }
        }

        // 사이드 패널: 체크박스 모드 ↔ 통 CSS 창
        function setSideMode(on) {
            sideCheck = on;
            sideBody.style.display = on ? '' : 'none';
            sideRaw.style.display = on ? 'none' : 'block';
            sideModeBtn.classList.toggle('csst-active', on);
            if (side.style.display !== 'none') {
                if (on) sideView.render(); else sideRaw.value = ta.value;
            }
            try { localStorage.setItem(SIDE_MODE_KEY, on ? '1' : '0'); } catch (e) { /* ignore */ }
        }

        const bindBtn = (b, fn) => {
            b.addEventListener('click', fn);
            b.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); }
            });
        };
        bindBtn(btn, () => setMode(panel.style.display === 'none'));
        bindBtn(sideBtn, () => setSide(side.style.display === 'none'));
        bindBtn(sideClose, () => setSide(false));
        bindBtn(sideModeBtn, () => setSideMode(!sideCheck));
        bindBtn(sidePosBtn, () => setSidePos(!sideLeft));

        setInterval(() => {
            views.forEach((v) => v.sync());
            if (!sideCheck && side.style.display !== 'none'
                && document.activeElement !== sideRaw && sideRaw.value !== ta.value) {
                sideRaw.value = ta.value;
            }
        }, 1000);

        let saved = null;
        let savedSide = null;
        let savedSideMode = null;
        let savedPos = null;
        try {
            savedPos = localStorage.getItem(SIDE_POS_KEY);
            saved = localStorage.getItem(MODE_KEY);
            savedSide = localStorage.getItem(SIDE_KEY);
            savedSideMode = localStorage.getItem(SIDE_MODE_KEY);
        } catch (e) { /* ignore */ }
        if (saved === '1') setMode(true);
        setSidePos(savedPos === 'left');
        setSideMode(savedSideMode !== '0');
        if (savedSide === '1') setSide(true);

        return true;
    }

    // ── Extensions 패널의 설정 UI ──
    function initSettingsUI() {
        if (document.getElementById('csst_settings')) return true;
        const host = document.getElementById('extensions_settings2') || document.getElementById('extensions_settings');
        if (!host) return false;
        const c = cfg();

        const LV = {
            1: { name: 'H1 · 접이식 그룹', sample: '/*:: H1 ::*/' },
            2: { name: 'H2 · 체크박스 항목', sample: '/*== H2 ==*/' },
            3: { name: 'H3 · 하위 체크박스', sample: '/*-- H3 --*/' },
        };
        const STOP_SAMPLE = '/*---*/';

        const root = el('div', 'csst-set');
        root.id = 'csst_settings';
        const drawer = el('div', 'inline-drawer');
        const head = el('div', 'inline-drawer-toggle inline-drawer-header');
        head.append(el('b', '', 'Check Box CSS'), el('div', 'inline-drawer-icon fa-solid fa-circle-chevron-down down'));
        const content = el('div', 'inline-drawer-content');
        drawer.append(head, content);
        root.appendChild(drawer);

        // 얇은 선 박스 하나 안에 H1 / H2 / H3 를 수평선으로 나눠서 배치
        const group = el('fieldset', 'csst-set-group');
        group.appendChild(el('legend', 'csst-set-gtitle', 'Heading Format'));
        content.appendChild(group);

        const ctl = {};
        [1, 2, 3].forEach((lv) => {
            if (lv > 1) group.appendChild(el('div', 'csst-set-hr'));
            const box = el('div', 'csst-set-sec');
            box.appendChild(el('div', 'csst-set-title', LV[lv].name));

            const r1 = el('div', 'csst-set-row');
            r1.appendChild(el('span', 'csst-set-lab', '제목 형식'));
            const tpl = el('input', 'text_pole csst-tpl');
            tpl.type = 'text';
            tpl.spellcheck = false;
            tpl.placeholder = LV[lv].sample + '  (기본값)';
            tpl.value = c.tpl[lv];
            r1.appendChild(tpl);
            const warn = el('div', 'csst-set-warn');

            box.append(r1, warn);

            ctl[lv] = { tpl, warn };
            group.appendChild(box);
        });
        const headNote = el('div', 'csst-set-note');
        headNote.innerHTML = '비워 두면 기본 규칙을 사용합니다.<br><code>/* ... */</code> 주석 형식과 H1, H2, H3 플레이스 홀더를 통해 직접 규칙을 설정할 수 있습니다.';
        group.appendChild(headNote);

        // 라디오 그룹 (Heading Format 바로 아래 박스): 사용 스위치 + 표시 형식
        let radioOn = c.radioOn;
        const radioGroup = el('fieldset', 'csst-set-group');
        radioGroup.appendChild(el('legend', 'csst-set-gtitle', 'Radio Group'));
        const radioBox = el('div', 'csst-set-sec');

        const togRow = el('div', 'csst-tog-row');
        const togText = el('div', 'csst-tog-text');
        togText.append(
            el('div', 'csst-tog-title', 'Enable Radio Group'),
            el('div', 'csst-tog-desc', '켜면 표시가 이어진 이웃 항목들 중 하나만 선택돼요. 끄면 모두 일반 체크박스예요.'),
        );
        const tog = el('div', 'csst-tog');
        tog.setAttribute('role', 'switch');
        tog.tabIndex = 0;
        togRow.append(togText, tog);

        const rr = el('div', 'csst-set-row');
        rr.appendChild(el('span', 'csst-set-lab', '표시 형식'));
        const radioInput = el('input', 'text_pole csst-tpl');
        radioInput.type = 'text';
        radioInput.spellcheck = false;
        radioInput.placeholder = RADIO_DEFAULT + '  (기본값)';
        radioInput.value = c.radio;
        rr.appendChild(radioInput);
        const radioWarn = el('div', 'csst-set-warn');
        const radioNote = el('div', 'csst-set-note');
        radioNote.innerHTML = 'X로 표시된 자리에는 숫자 또는 알파벳이 들어갈 수 있습니다.<br> ex1) 표시형식 [X] → [1], [2] 또는 [A], [B] 형식으로 라디오 그룹을 생성 가능<br> ex2) 표시형식 (X) → (1), (2) 또는 (A), (B) 형식으로 라디오 그룹을 생성 가능';
        radioBox.append(togRow, rr, radioWarn, radioNote);
        
        radioGroup.appendChild(radioBox);
        content.appendChild(radioGroup);
        const paintTog = () => {
            tog.classList.toggle('csst-on', radioOn);
            tog.setAttribute('aria-checked', radioOn ? 'true' : 'false');
            rr.classList.toggle('csst-dim', !radioOn);
            radioNote.classList.toggle('csst-dim', !radioOn);
        };
        paintTog();

        // 멈춤 표시 (별도 박스)
        const stopGroup = el('fieldset', 'csst-set-group');
        stopGroup.appendChild(el('legend', 'csst-set-gtitle', 'Stop Marker'));
        const stopBox = el('div', 'csst-set-sec');
        const sr = el('div', 'csst-set-row');
        sr.appendChild(el('span', 'csst-set-lab', '멈춤 표시'));
        const stopInput = el('input', 'text_pole csst-tpl');
        stopInput.type = 'text';
        stopInput.spellcheck = false;
        stopInput.placeholder = STOP_SAMPLE + '  (기본값)';
        stopInput.value = c.stop;
        sr.appendChild(stopInput);
        const stopWarn = el('div', 'csst-set-warn');
        const stopNote = el('div', 'csst-set-note', '지금 열려 있는 가장 작은 제목(H3 → H2 → H1)이 여기서 끝나요. 제목을 옮기면 같이 움직여요.');
        const stopNote2 = el('div', 'csst-set-note');
        stopNote2.innerHTML = '제목을 끝내는 표시도 직접 정할 수 있어요. (기본 <code>/*---*/</code>)';
        stopBox.append(sr, stopWarn, stopNote2, stopNote);
        stopGroup.appendChild(stopBox);
        content.appendChild(stopGroup);

        // 1. 기본값으로 되돌리기 버튼
        const resetBtn = el('div', 'menu_button csst-set-reset', '기본값으로 되돌리기');
        content.appendChild(resetBtn);

        // 2. 고화질 썸네일 버튼 + 오른쪽 설명 문구
        let hrOn = c.hiRes;
        const hrRow = el('div', 'csst-set-row');
        hrRow.style.cssText = 'margin-top: 6px; display: flex; align-items: center; gap: 8px;';

        const hrBtn = el('div', 'menu_button csst-set-reset', '고화질 썸네일');
        hrBtn.style.margin = '0';
        hrBtn.classList.toggle('csst-on', hrOn);

        const hrDesc = el('span', 'csst-set-note', '(캐릭터 썸네일 대신 원본이미지 사용)');

        hrRow.append(hrBtn, hrDesc);
        content.appendChild(hrRow);

        hrBtn.addEventListener('click', () => {
            hrOn = !hrOn;
            hrBtn.classList.toggle('csst-on', hrOn);
            CFG = normCfg(Object.assign({}, CFG, { hiRes: hrOn }));
            saveCfg(CFG);
            setHiRes(CFG.hiRes);
        });

        const showWarn = () => {
            const seen = new Map();
            [1, 2, 3].forEach((lv) => {
                const chk = checkTpl(CFG.tpl[lv]);
                let msg = '';
                if (chk.ok === false) {
                    msg = '⚠ ' + chk.reason + ' → 지금은 기본 규칙을 쓰고 있어요';
                } else if (chk.ok) {
                    const sig = chk.pre + '\u0000' + chk.suf;
                    if (seen.has(sig)) msg = '⚠ H' + seen.get(sig) + ' 와 같은 형식이라 구분이 안 돼요';
                    else seen.set(sig, lv);
                }
                ctl[lv].warn.textContent = msg;
                ctl[lv].warn.style.display = msg ? '' : 'none';
            });
            const sc = checkStop(CFG.stop);
            const smsg = sc.ok === false ? '⚠ ' + sc.reason + ' → 지금은 기본값(' + STOP_SAMPLE + ')을 쓰고 있어요' : '';
            const rc = checkRadio(CFG.radio);
            const rmsg = rc.ok === false ? '⚠ ' + rc.reason + ' → 지금은 기본값(' + RADIO_DEFAULT + ')을 쓰고 있어요' : '';
            radioWarn.textContent = rmsg;
            radioWarn.style.display = rmsg ? '' : 'none';
            stopWarn.textContent = smsg;
            stopWarn.style.display = smsg ? '' : 'none';
        };

        const apply = () => {
            const next = { tpl: {}, stop: stopInput.value, hiRes: hrOn, radio: radioInput.value, radioOn };
            [1, 2, 3].forEach((lv) => {
                next.tpl[lv] = ctl[lv].tpl.value;
            });
            CFG = normCfg(next);
            saveCfg(CFG);
            showWarn();
            views.forEach((v) => v.refresh());
        };
        let timer = null;
        const later = () => { clearTimeout(timer); timer = setTimeout(apply, 250); };

        [1, 2, 3].forEach((lv) => {
            ctl[lv].tpl.addEventListener('input', later);
        });
        stopInput.addEventListener('input', later);
        radioInput.addEventListener('input', later);
        const flipTog = () => {
            radioOn = !radioOn;
            paintTog();
            apply();
        };
        tog.addEventListener('click', flipTog);
        tog.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); flipTog(); }
        });
        resetBtn.addEventListener('click', () => {
            [1, 2, 3].forEach((lv) => {
                ctl[lv].tpl.value = DEFAULT_CFG.tpl[lv];
            });
            stopInput.value = DEFAULT_CFG.stop;
            radioInput.value = DEFAULT_CFG.radio;
            radioOn = DEFAULT_CFG.radioOn;
            paintTog();
            apply();
        });

        showWarn();
        host.appendChild(root);
        return true;
    }

    // ── UI Theme 이름 수정 버튼 (저장 버튼 오른쪽) ──
    function initThemeRename() {
        if (document.getElementById('csst-theme-rename')) return true;
        const saveBtn = document.getElementById('ui-preset-save-button');
        const sel = document.getElementById('themes');
        if (!saveBtn || !sel) return false;

        const btn = el('div', 'menu_button margin0 interactable');
        btn.id = 'csst-theme-rename';
        btn.title = 'Rename current theme';
        btn.tabIndex = 0;
        btn.appendChild(el('i', 'fa-solid fa-pencil'));
        saveBtn.insertAdjacentElement('afterend', btn);

        const hdr = () => {
            const c = stContext();
            return c && c.getRequestHeaders ? c.getRequestHeaders() : { 'Content-Type': 'application/json' };
        };
        const post = (url, body) => fetch(url, { method: 'POST', headers: hdr(), body: JSON.stringify(body) });
        const say = (type, msg) => { if (window.toastr) window.toastr[type](msg); };

        let busy = false;
        btn.addEventListener('click', async () => {
            if (busy) return;
            const ctx = stContext();
            const oldName = ctx && ctx.powerUserSettings && ctx.powerUserSettings.theme;
            if (!oldName) { say('info', 'No theme selected.'); return; }
            busy = true;
            try {
                let input;
                if (ctx.callGenericPopup && ctx.POPUP_TYPE) {
                    input = await ctx.callGenericPopup('Enter a new theme name:', ctx.POPUP_TYPE.INPUT, oldName);
                } else {
                    input = window.prompt('Enter a new theme name:', oldName);
                }
                if (!input || typeof input !== 'string') return;
                let newName = input.trim();
                try {
                    const r = await post('/api/files/sanitize-filename', { fileName: newName });
                    if (r.ok) newName = ((await r.json()).fileName || newName).trim();
                } catch (e) { /* ignore */ }
                if (!newName || newName === oldName) return;
                if ([...sel.options].some((o) => o.value === newName)) {
                    say('error', 'Theme with that name already exists');
                    return;
                }

                // 서버에 저장돼 있는 원래 테마 파일 내용을 가져옴
                const sr = await post('/api/settings/get', {});
                if (!sr.ok) throw new Error('settings');
                const data = await sr.json();
                const list = Array.isArray(data.themes) ? data.themes : [];
                const old = list.find((t) => t && t.name === oldName);
                if (!old) throw new Error('theme not found');
                const renamed = Object.assign({}, old, { name: newName });

                // SillyTavern 내부 목록에도 등록되도록 '테마 가져오기' 입력을 통해 추가
                const fileInput = document.getElementById('ui_preset_import_file');
                if (!fileInput) throw new Error('import input');
                const dt = new DataTransfer();
                dt.items.add(new File([JSON.stringify(renamed)], newName + '.json', { type: 'application/json' }));
                fileInput.files = dt.files;
                fileInput.dispatchEvent(new Event('change', { bubbles: true }));
                for (let i = 0; i < 40 && ![...sel.options].some((o) => o.value === newName); i++) {
                    await new Promise((r) => setTimeout(r, 50));
                }
                if (![...sel.options].some((o) => o.value === newName)) throw new Error('import failed');

                // 옛 파일 삭제 + 목록에서 제거 + 새 이름 선택
                const dr = await post('/api/themes/delete', { name: oldName });
                if (!dr.ok) throw new Error('delete');
                [...sel.options].forEach((o) => { if (o.value === oldName) o.remove(); });
                sel.value = newName;
                jQuery(sel).trigger('change');
                say('success', 'Theme renamed.');
            } catch (e) {
                console.error('[Check Box CSS] theme rename failed', e);
                say('error', 'Failed to rename theme. Check the console.');
            } finally {
                busy = false;
            }
        });
        btn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); btn.click(); }
        });
        return true;
    }

    jQuery(() => {
        if (cfg().hiRes) setHiRes(true);
        let tries = 0;
        const timer = setInterval(() => {
            const a = init();
            const b = initSettingsUI();
            const t = initThemeRename();
            if ((a && b && t) || ++tries > 60) clearInterval(timer);
        }, 500);
    });
})();