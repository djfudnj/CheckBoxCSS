// Check Box CSS - SillyTavern extension (v1.0.0)
//
//  /*:: H1 ::*/    : 접고 펼 수 있는 그룹 (Custom Theme Inputs 같은 드로어)
//  /*== H2 ==*/    : 체크박스로 통째로 끄고 켜는 항목
//  /*-- H3 --*/    : H2 안의 하위 항목, 이것도 체크박스로 끄고 켬
//  /* 그냥 주석 */  : 제목이 아니라 일반 주석으로 취급
//
//  - 기호(: = -)는 제목 앞뒤 양쪽에 2개 이상씩 있어야 제목으로 인식합니다.
//  - /* 뒤나 */ 앞의 공백은 있어도 없어도 됩니다.
//  - 여러 줄 배너도 인식합니다. (제목 줄의 기호가 단계를 결정, 위아래 줄은 장식)
//      /*-------------
//      :: 제목 ::
//      -------------*/
//  끄면 해당 부분이 /*[OFF] ... [OFF]*/ (H3은 /*[OFF3] ... [OFF3]*/) 로 감싸집니다.
//  H2를 끄면 그 아래 H3도 모두 꺼진 것으로 취급됩니다.
//
//  [v1.0 추가]
//  - 사이드 패널 상단 버튼으로 체크박스 모드 / 통 CSS 창 전환
//  - H1/H2/H3 옆 복사 버튼: 해당 부분 CSS(제목 포함)를 클립보드로 복사
//  - Handle Mode 버튼: 핸들(≡)을 끌어서 같은 단계끼리 순서 바꾸기
//
//  [설정] Extensions → Check Box CSS 에서 설정
//  - 제목 형식 바꾸기: 예) /*++H2++*/ 라고 적으면 그 형식이 H2 규칙이 됩니다. (비워 두면 위의 기본 규칙)
//      H1 / H2 / H3 자리에 제목이 들어갑니다. 반드시 /* ... */ 주석 형식이어야 해요.
//      (v3.6: Head1/Head2/Head3 표기는 더 이상 인식하지 않고, H1/H2/H3 만 인식합니다.)
//  - H3 "헤딩 바로 다음 줄만 적용" 옵션
//  - 위쪽 버튼: Group Open/Close All (접이식 그룹 전체), CSS Open/Close All (CSS 편집창 전체)

// ==PURE-START==
const OFF_OPEN = '/*[OFF]';
const OFF_CLOSE = '[OFF]*/';
const OFF3_OPEN = '/*[OFF3]';
const OFF3_CLOSE = '[OFF3]*/';

// 꺼진 영역 안의 */ 가 주석을 조기 종료시키지 않도록 이스케이프 (중제목/소제목 서로 다른 표식)
const esc = (s) => s.replace(/\*\//g, '*\\/');
const unesc = (s) => s.replace(/\*\\\//g, '*/');
const esc3 = (s) => s.replace(/\*\//g, '*\\3/');
const unesc3 = (s) => s.replace(/\*\\3\//g, '*/');

// ── 설정 ──
//  tpl : 레벨별 사용자 지정 제목 형식 (빈 문자열 = 기본 규칙)
//  h3Next : H3을 헤딩 바로 다음 줄에만 적용
//  hiRes : 아바타 썸네일 대신 원본 이미지 사용 (고화질)
const DEFAULT_CFG = { tpl: { 1: '', 2: '', 3: '' }, h3Next: false, hiRes: false };

function normCfg(c) {
    const src = c && typeof c === 'object' ? c : {};
    const out = { tpl: {}, h3Next: !!src.h3Next, hiRes: !!src.hiRes };
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

function mkSeg(title, raw, text) {
    if (title !== null) {
        const off = text.match(/^(\s*)\/\*\[OFF3\]([\s\S]*)\[OFF3\]\*\/(\s*)$/);
        if (off) return { title, raw, enabled: false, lead: off[1], body: unesc3(off[2]), trail: off[3] };
    }
    const t = edgeSplit(text);
    return { title, raw, enabled: true, lead: t[1], body: t[2], trail: t[3] };
}

// 헤딩 뒤 첫 내용이 있는 줄의 끝 (줄바꿈 직전)
function nextLineEnd(s, from, limit) {
    let p = from;
    while (p < limit && /\s/.test(s[p])) p++;
    if (p >= limit) return limit;
    const i = s.indexOf('\n', p);
    let end = i < 0 || i >= limit ? limit : i;
    if (end > p && s[end - 1] === '\r') end--;
    return end;
}

// H3 본문의 끝 (꺼진 H3 /*[OFF3]...[OFF3]*/ 는 안에 줄바꿈이 있어도 닫는 표식까지를 한 덩어리로 봄)
function h3End(body, from, limit, cfg) {
    let p = from;
    while (p < limit && /\s/.test(body[p])) p++;
    if (body.startsWith(OFF3_OPEN, p)) {
        const c = body.indexOf(OFF3_CLOSE, p + OFF3_OPEN.length);
        if (c >= 0 && c + OFF3_CLOSE.length <= limit) return c + OFF3_CLOSE.length;
    }
    let cut = limit;
    if (cfg.h3Next) cut = Math.min(cut, nextLineEnd(body, from, limit));
    return cut;
}

// H3으로 본문을 쪼갬. H3은 다음 제목(또는 "헤딩 바로 다음 줄만" 옵션)에서 끝나고,
// 그 뒤 남은 부분은 제목 없는 조각으로 이어짐
function splitSegs(body, cfg) {
    cfg = cfg || DEFAULT_CFG;
    const marks = findHeads(body, headRes(cfg, 3).res).filter((h) => !isOffTitle(h.title));
    const segs = [mkSeg(null, '', body.slice(0, marks.length ? marks[0].start : body.length))];
    marks.forEach((k, i) => {
        const limit = i + 1 < marks.length ? marks[i + 1].start : body.length;
        const cut = h3End(body, k.end, limit, cfg);
        segs.push(mkSeg(k.title, k.raw, body.slice(k.end, cut)));
        if (cut < limit) segs.push(mkSeg(null, '', body.slice(cut, limit)));
    });
    return segs;
}

function makeChunk(level, raw, title, body, cfg, extra) {
    let enabled = true;
    if (level === 2) {
        const off = body.match(/^(\s*)\/\*\[OFF\]([\s\S]*)\[OFF\]\*\/(\s*)$/);
        if (off) {
            enabled = false;
            body = off[1] + unesc(off[2]) + off[3];
        }
    }
    return Object.assign(
        { level, raw, title, enabled, segs: splitSegs(body, cfg), gid: null, orphan: false, key: '' },
        extra,
    );
}

// level 0: 첫 제목 위쪽, 1: H1, 2: H2 (각 제목은 다음 H1/H2 제목 직전까지)
//  gid : 소속 H1 그룹 번호 (첫 H1보다 앞이면 null)
function parse(text, cfgIn) {
    const cfg = normCfg(cfgIn);
    const heads = findHeads12(text, cfg);
    const chunks = [];
    const preEnd = heads.length ? heads[0].start : text.length;
    if (preEnd > 0) chunks.push(makeChunk(0, '', '', text.slice(0, preEnd), cfg));

    let gid = null; // 현재 H1 그룹 번호
    heads.forEach((h, i) => {
        const regionEnd = i + 1 < heads.length ? heads[i + 1].start : text.length;
        if (h.level === 1) gid = i;
        chunks.push(makeChunk(h.level, h.raw, h.title, text.slice(h.end, regionEnd), cfg, { gid }));
    });
    return chunks;
}

const segText = (s) => s.raw + (s.title !== null && !s.enabled
    ? s.lead + OFF3_OPEN + esc3(s.body) + OFF3_CLOSE + s.trail
    : s.lead + s.body + s.trail);
const segsText = (c) => c.segs.map(segText).join('');

function chunkText(c) {
    if (c.level === 2 && !c.enabled) {
        const t = edgeSplit(segsText(c));
        return c.raw + t[1] + OFF_OPEN + esc(t[2]) + OFF_CLOSE + t[3];
    }
    return c.raw + segsText(c);
}

const build = (chunks) => chunks.map(chunkText).join('');

// ── 복사용: OFF 표식 없이 제목 + 내용 그대로 ──
const plainSeg = (s) => s.raw + s.lead + s.body + s.trail;
const plainChunk = (c) => c.raw + c.segs.map(plainSeg).join('');

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
        addNl: () => { c.segs[c.segs.length - 1].trail += '\n'; },
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
        addNl: () => { s.trail += '\n'; },
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
                cb.addEventListener('change', () => o.onChange(cb.checked));
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

            const wrap = el('div', 'csst-block');
            const subs = [];
            let main = null;

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
                    copy: o.toggle ? () => plainChunk(chunk).trim() : null,
                    onChange: (v) => { chunk.enabled = v; refresh(); commit(); },
                });
                wrap.appendChild(main.item);
                wrap.csstHandle = main.handle;
            }
            const h3List = [];
            rest.forEach((seg, i) => {
                const row = seg.title !== null
                    ? makeRow({
                        title: seg.title,
                        toggle: true,
                        checked: seg.enabled,
                        sub: !o.bare,
                        seg,
                        key: o.key + '>' + seg.title,
                        handle: true,
                        copy: () => plainSeg(seg).trim(),
                        onChange: (v) => { seg.enabled = v; refresh(); commit(); },
                    })
                    : makeRow({ bare: true, seg, key: o.key + '#rest' + i });
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
            const icon = el('div', 'inline-drawer-icon fa-solid fa-circle-chevron-down down');
            const left = el('div', 'csst-drawer-left');
            const right = el('div', 'csst-drawer-right');
            if (movable) {
                g.csstHandle = makeHandle();
                left.appendChild(g.csstHandle);
            }
            left.appendChild(el('b', '', title));
            right.append(makeCopyBtn(() => [chunk, ...children].map(plainChunk).join('').trim()), icon);
            head.append(left, right);
            const body = el('div', 'csst-drawer-body');

            const own = makeBlock(chunk, { title: '', toggle: false, bare: true, key: key + '#own' });
            if (own) body.appendChild(own);
            const kids = [];
            children.forEach((c) => {
                const b = c.orphan
                    ? makeOrphan(c)
                    : makeBlock(c, { title: c.title, toggle: true, handle: true, key: c.title });
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
                icon.classList.toggle('fa-circle-chevron-up', o);
                icon.classList.toggle('up', o);
                icon.classList.toggle('fa-circle-chevron-down', !o);
                icon.classList.toggle('down', !o);
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

            if (!chunks.some((c) => c.level > 0)) {
                const hint = el('div', 'csst-hint');
                hint.innerHTML = '제목이 없어요. CSS에 아래처럼 주석을 넣으면 여기에 나타납니다.<br>'
                    + '<code>/*:: H1 ::*/</code> 접기/펼치기 그룹<br>'
                    + '<code>/*== H2 ==*/</code> 체크박스로 끄고 켜기<br>'
                    + '<code>/*-- H3 --*/</code> 하위 체크박스로 끄고 켜기<br>'
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
                    const b = makeBlock(n.chunk, { title: n.chunk.title, toggle: true, handle: true, key: n.chunk.title });
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

        const maxBtn = document.querySelector(`.editor_maximize[data-for="${TEXTAREA_ID}"]`);
        if (maxBtn) {
            maxBtn.parentElement.classList.add('csst-head');
            maxBtn.insertAdjacentElement('afterend', btn);
            btn.insertAdjacentElement('afterend', sideBtn);
        } else {
            const bar = el('div', 'csst-bar');
            bar.append(btn, sideBtn);
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

        const root = el('div', 'csst-set');
        root.id = 'csst_settings';
        const drawer = el('div', 'inline-drawer');
        const head = el('div', 'inline-drawer-toggle inline-drawer-header');
        head.append(el('b', '', 'Check Box CSS'), el('div', 'inline-drawer-icon fa-solid fa-circle-chevron-down down'));
        const content = el('div', 'inline-drawer-content');
        drawer.append(head, content);
        root.appendChild(drawer);

        const help = el('div', 'csst-set-help');
        help.innerHTML = '<b>Heading Format</b>: 비워 두면 기본 규칙을 사용합니다.<br>'
           + '<code>/* ... */</code> 주석 형식과 H1, H2, H3 플레이스 홀더를 통해 직접 규칙을 설정할 수 있습니다.';
        content.appendChild(help);

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

            if (lv === 3) {
                const r3 = el('div', 'csst-set-row');
                const label = el('label', 'checkbox_label');
                const chk = document.createElement('input');
                chk.type = 'checkbox';
                chk.checked = c.h3Next;
                label.append(chk, el('span', '', '헤딩 바로 다음 줄만 적용 (한 줄짜리 규칙용)'));
                r3.appendChild(label);
                box.appendChild(r3);
                ctl.h3Next = chk;
            }

            ctl[lv] = { tpl, warn };
            group.appendChild(box);
        });

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
        };

        const apply = () => {
            const next = { tpl: {}, h3Next: ctl.h3Next.checked, hiRes: hrOn };
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
        ctl.h3Next.addEventListener('change', apply);
        resetBtn.addEventListener('click', () => {
            [1, 2, 3].forEach((lv) => {
                ctl[lv].tpl.value = DEFAULT_CFG.tpl[lv];
            });
            ctl.h3Next.checked = DEFAULT_CFG.h3Next;
            apply();
        });

        showWarn();
        host.appendChild(root);
        return true;
    }

    jQuery(() => {
        if (cfg().hiRes) setHiRes(true);
        let tries = 0;
        const timer = setInterval(() => {
            const a = init();
            const b = initSettingsUI();
            if ((a && b) || ++tries > 60) clearInterval(timer);
        }, 500);
    });
})();