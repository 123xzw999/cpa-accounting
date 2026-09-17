/* =========================================================
   CPA一遍过 · 应用逻辑
   专业阶段六科：会计 / 审计 / 财务成本管理 / 税法 / 经济法 / 公司战略与风险管理
   主观题透明书写模块（可换色、字体不粗不细）
   主观题逐小题标注分值
   客观题自动判分（客观题总分）＋ 主观题自评（主观题总分）→ 计算总分
   ========================================================= */
(function () {
  "use strict";

  /* ---------------- 基础工具 ---------------- */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  };
  var LETTERS = ["A", "B", "C", "D", "E", "F"];
  var LS_KEY = "cpa_yibian_guo";

  /* ---------------- 账号 ---------------- */
  var ACCOUNT = { user: "123456", pass: "xiaoxiang888" };

  /* ---------------- 判分规则 ----------------
     CPA 专业阶段多项选择题「不设部分分」：不答、错答、漏答均不得分。
     若想改回按比例给分，把下面这行改成 true 即可。 */
  var PARTIAL_CREDIT = false;

  /* ---------------- 六科数据 ---------------- */
  var SUBJECTS = {
    accounting: { key: "accounting", name: "会计",              full: "会计",              kb: window.KB_ACCOUNTING, qb: window.QB_ACCOUNTING, exam: window.EXAM_ACCOUNTING },
    audit:      { key: "audit",      name: "审计",              full: "审计",              kb: window.KB_AUDIT,      qb: window.QB_AUDIT,      exam: window.EXAM_AUDIT },
    fm:         { key: "fm",         name: "财务成本管理",       full: "财务成本管理",       kb: window.KB_FM,         qb: window.QB_FM,         exam: window.EXAM_FM },
    tax:        { key: "tax",        name: "税法",              full: "税法",              kb: window.KB_TAX,        qb: window.QB_TAX,        exam: window.EXAM_TAX },
    law:        { key: "law",        name: "经济法",            full: "经济法",            kb: window.KB_LAW,        qb: window.QB_LAW,        exam: window.EXAM_LAW },
    strategy:   { key: "strategy",   name: "公司战略与风险管理",  full: "公司战略与风险管理",  kb: window.KB_STRATEGY,   qb: window.QB_STRATEGY,   exam: window.EXAM_STRATEGY }
  };
  /* 官方考试顺序 */
  var ORDER = ["accounting", "audit", "fm", "tax", "law", "strategy"];

  var TYPE_LABEL = { single: "单项选择题", multi: "多项选择题", judge: "判断题", entry: "计算题", essay: "主观题" };
  var TYPE_CLASS = { single: "t-single", multi: "t-multi", judge: "t-judge", entry: "t-entry", essay: "t-essay" };

  /* 主观题书写模块可选用色（浅底上用深色，才看得清） */
  var PAD_COLORS = [
    { c: "#1f2937", n: "墨黑" },
    { c: "#1d4ed8", n: "深蓝" },
    { c: "#047857", n: "墨绿" },
    { c: "#b91c1c", n: "绛红" },
    { c: "#7c3aed", n: "紫" },
    { c: "#92400e", n: "棕" }
  ];

  /* ---------------- 全局状态 ---------------- */
  var state = {
    view: "login",
    subject: "accounting",
    kb: { chapter: "all", search: "", flash: false, favOnly: false },
    pr: { type: "all", chapter: "all" },
    exam: {
      stage: "intro",
      cur: "accounting",
      answers: {},
      locked: {},
      pads: {},
      done: {},
      papers: {},       // key -> 批改结果
      startAt: 0,
      timerId: null
    }
  };

  /* ---------------- 持久化（收藏 / 登录） ---------------- */
  function store() {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); } catch (e) { return {}; }
  }
  function save(patch) {
    var s = store();
    for (var k in patch) { if (Object.prototype.hasOwnProperty.call(patch, k)) s[k] = patch[k]; }
    try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch (e) { /* ignore */ }
  }
  function favList() { return store().fav || []; }
  function toggleFav(id) {
    var f = favList(), i = f.indexOf(id);
    if (i >= 0) f.splice(i, 1); else f.push(id);
    save({ fav: f });
    return i < 0;
  }

  /* ---------------- toast ---------------- */
  var toastTimer = null;
  function toast(msg, isErr) {
    var el = $("#toast");
    el.textContent = msg;
    el.className = "toast show" + (isErr ? " err" : "");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.className = "toast"; }, 2200);
  }

  /* ---------------- 视图切换 ---------------- */
  function show(view) {
    state.view = view;
    $$(".view").forEach(function (v) { v.classList.remove("is-active"); });
    var el = $("#view-" + view);
    if (el) el.classList.add("is-active");
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (view !== "exam") stopTimer();
  }
  function backHome() {
    stopTimer();
    show("home");
  }

  /* =========================================================
     登录
     ========================================================= */
  function initLogin() {
    $("#login-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var u = $("#login-user").value.trim();
      var p = $("#login-pass").value.trim();
      var msg = $("#login-msg");
      if (u === ACCOUNT.user && p === ACCOUNT.pass) {
        msg.style.color = "#0f9d58";
        msg.textContent = "登录成功，正在进入…";
        save({ user: u });
        $("#home-user-name").textContent = "当前用户：" + u;
        setTimeout(function () {
          msg.textContent = "";
          msg.style.color = "";
          show("home");
        }, 420);
      } else {
        msg.style.color = "";
        msg.textContent = "用户名或密码不正确，请重新输入（默认 123456 / xiaoxiang888）";
        toast("登录失败：账号或密码错误", true);
      }
    });
    $("#btn-logout").addEventListener("click", function () {
      save({ user: "" });
      show("login");
      toast("已退出登录");
    });
    var saved = store().user;
    if (saved) $("#home-user-name").textContent = "当前用户：" + saved;
  }

  /* =========================================================
     首页：六科模块
     ========================================================= */
  function renderModules() {
    var html = "";
    ORDER.forEach(function (k, i) {
      var sub = SUBJECTS[k];
      var ex = sub.exam || {};
      var desc = (sub.kb ? sub.kb.chapters.length : 0) + " 章 · 客观题 " + (ex.objectiveScore || 0) + " 分 ＋ 主观题 " + (ex.subjectiveScore || 0) + " 分";
      html += '<article class="card-module" data-subject="' + k + '">' +
        '<div class="card-top">' +
        '<div class="card-badge">科目' + "一二三四五六".charAt(i) + '</div>' +
        '<h3>' + esc(sub.name) + '</h3>' +
        '<p class="card-desc">' + desc + '</p>' +
        '</div>' +
        '<ul class="card-actions">' +
        '<li><button data-open="knowledge" data-subject="' + k + '"><i>1</i><span>全知识点巧记<em>章节口诀 · 快速记忆 · 闪卡</em></span></button></li>' +
        '<li><button data-open="practice" data-subject="' + k + '"><i>2</i><span>全题型精刷<em>单选 · 多选 · 计算分析 · 简答 · 综合</em></span></button></li>' +
        '<li><button data-open="exam" data-subject="' + k + '"><i>3</i><span>历年真题考试<em>六科联考 · 全部交卷批改</em></span></button></li>' +
        '</ul></article>';
    });
    $("#modules").innerHTML = html;
  }

  /* =========================================================
     全知识点巧记
     ========================================================= */
  function kbPoints() {
    var sub = SUBJECTS[state.subject];
    var out = [];
    sub.kb.chapters.forEach(function (ch) {
      ch.points.forEach(function (pt, i) {
        out.push({ id: sub.key + "|" + ch.id + "|" + i, chId: ch.id, chName: ch.name, p: pt });
      });
    });
    return out;
  }

  function openKnowledge(subjectKey) {
    state.subject = subjectKey;
    state.kb.chapter = "all";
    state.kb.search = "";
    state.kb.favOnly = false;
    state.kb.flash = false;
    $("#kb-title").textContent = SUBJECTS[subjectKey].name + " · 全知识点巧记";
    $("#kb-search").value = "";
    $("#kb-flash").classList.remove("on");
    $("#kb-flash").textContent = "闪卡模式：关";
    $("#kb-fav").classList.remove("on");
    renderKbChapters();
    renderKbList();
    show("knowledge");
  }

  function renderKbChapters() {
    var sub = SUBJECTS[state.subject];
    var box = $("#kb-chapters");
    var html = '<h4>章节导航</h4>';
    var total = kbPoints().length;
    html += '<button class="' + (state.kb.chapter === "all" ? "on" : "") + '" data-ch="all">全部章节<small>共 ' + total + ' 个知识点</small></button>';
    sub.kb.chapters.forEach(function (ch) {
      html += '<button class="' + (state.kb.chapter === ch.id ? "on" : "") + '" data-ch="' + ch.id + '">' +
        esc(ch.name) + '<small>' + ch.points.length + ' 个知识点</small></button>';
    });
    box.innerHTML = html;
    $$("button", box).forEach(function (b) {
      b.onclick = function () {
        state.kb.chapter = b.getAttribute("data-ch");
        renderKbChapters();
        renderKbList();
      };
    });
  }

  function renderKbList() {
    var sub = SUBJECTS[state.subject];
    var box = $("#kb-list");
    var kw = state.kb.search.trim().toLowerCase();
    var favs = favList();
    var html = "";
    var shown = 0;

    sub.kb.chapters.forEach(function (ch) {
      if (state.kb.chapter !== "all" && state.kb.chapter !== ch.id) return;
      var items = [];
      ch.points.forEach(function (pt, i) {
        var id = sub.key + "|" + ch.id + "|" + i;
        if (state.kb.favOnly && favs.indexOf(id) < 0) return;
        if (kw) {
          var hay = (pt.t + " " + pt.p + " " + pt.m + " " + pt.e + " " + (pt.tags || []).join(" ")).toLowerCase();
          if (hay.indexOf(kw) < 0) return;
        }
        items.push({ id: id, pt: pt });
      });
      if (!items.length) return;
      shown += items.length;
      html += '<h3 class="kb-sec-title">' + esc(ch.name) + ' <small style="font-weight:600;font-size:12px;color:#96607f">' + items.length + ' 条</small></h3>';
      items.forEach(function (it) {
        var pt = it.pt;
        var tags = (pt.tags || []).map(function (t) { return '<span class="kb-tag">' + esc(t) + '</span>'; }).join("");
        html += '<article class="kb-card" data-id="' + it.id + '">' +
          '<div class="kb-head"><h5>' + esc(pt.t) + '</h5>' +
          '<button class="kb-star ' + (favs.indexOf(it.id) >= 0 ? "on" : "") + '" data-fav="' + it.id + '" title="收藏">★</button></div>' +
          '<div class="kb-tags">' + tags + '</div>' +
          '<div class="kb-body">' +
          (pt.p ? '<p class="kb-point"><b>【知识点】</b>' + esc(pt.p) + '</p>' : "") +
          (pt.m ? '<p class="kb-mn"><b>口诀</b>' + esc(pt.m) + '</p>' : "") +
          (pt.e ? '<p class="kb-exp"><b>【口诀详解】</b>' + esc(pt.e) + '</p>' : "") +
          '</div></article>';
      });
    });

    if (!shown) {
      html = '<div class="q-card" style="text-align:center;color:#96607f;font-size:14px;padding:40px 20px">' +
        (state.kb.favOnly ? "还没有收藏任何知识点，点击卡片右上角的 ★ 即可收藏。" : "没有找到匹配的知识点，换个关键词试试～") + '</div>';
    }
    box.className = "kb-list" + (state.kb.flash ? " flash" : "");
    box.innerHTML = html;

    $$(".kb-star", box).forEach(function (b) {
      b.onclick = function (e) {
        e.stopPropagation();
        var id = b.getAttribute("data-fav");
        var added = toggleFav(id);
        b.classList.toggle("on", added);
        toast(added ? "已收藏" : "已取消收藏");
        if (state.kb.favOnly) renderKbList();
      };
    });
    if (state.kb.flash) {
      $$(".kb-card", box).forEach(function (c) {
        c.onclick = function () { c.classList.toggle("flipped"); };
      });
    }
  }

  function initKnowledge() {
    $("#kb-search").addEventListener("input", function () {
      state.kb.search = this.value;
      renderKbList();
    });
    $("#kb-flash").addEventListener("click", function () {
      state.kb.flash = !state.kb.flash;
      this.classList.toggle("on", state.kb.flash);
      this.textContent = "闪卡模式：" + (state.kb.flash ? "开" : "关");
      renderKbList();
      if (state.kb.flash) toast("闪卡模式：点击卡片查看口诀详解");
    });
    $("#kb-fav").addEventListener("click", function () {
      state.kb.favOnly = !state.kb.favOnly;
      this.classList.toggle("on", state.kb.favOnly);
      renderKbList();
    });
  }

  /* =========================================================
     主观题书写模块（透明 · 可换色 · 字体不粗不细）
     ========================================================= */
  function padBlock(qid, mode) {
    var sw = PAD_COLORS.map(function (c, i) {
      return '<button class="swatch' + (i === 0 ? " active" : "") + '" data-color="' + c.c +
        '" style="background:' + c.c + '" title="' + c.n + '"></button>';
    }).join("");
    var h = '<div class="pad-bar">' +
      '<span class="tip">✎ 点击此处可直接书写</span>' + sw +
      '<button class="padbtn" data-pad-clear="' + qid + '">清空</button>' +
      '</div>';
    h += '<div class="pad" contenteditable="true" spellcheck="false" data-pad="' + qid +
      '" data-ph="点击此处可直接书写…"></div>';
    h += '<div class="pad-tools">';
    if (mode === "pr") {
      h += '<button class="padbtn" data-reveal="' + qid + '">对照标准答案</button>';
    } else {
      h += '<span style="font-size:11.5px;color:#96607f">书写内容将在交卷后保留，用于自评估分</span>';
    }
    h += '</div>';
    return h;
  }

  function subsBlock(q) {
    var h = '<ul class="essay-subs">';
    (q.subs || []).forEach(function (s) {
      h += '<li><span class="sq">' + esc(s.q) + '</span><span class="ss">' + s.score + ' 分</span></li>';
    });
    h += '</ul>';
    return h;
  }

  function bindPadTools(box, mode) {
    box.onclick = (function (prev) {
      return function (e) {
        var sw = e.target.closest(".swatch");
        if (sw) {
          var bar = sw.closest(".pad-bar");
          var pad = bar ? bar.nextElementSibling : null;
          if (pad && pad.classList.contains("pad")) {
            pad.style.color = sw.getAttribute("data-color");
            $$(".swatch", bar).forEach(function (b) { b.classList.remove("active"); });
            sw.classList.add("active");
          }
          return;
        }
        var cl = e.target.closest("[data-pad-clear]");
        if (cl) {
          var card = cl.closest("[data-qid]");
          var p = card ? $(".pad", card) : null;
          if (p) { p.innerHTML = ""; }
          var qid0 = cl.getAttribute("data-pad-clear");
          if (mode === "ex") state.exam.pads[qid0] = "";
          return;
        }
        var rv = e.target.closest("[data-reveal]");
        if (rv) {
          var card2 = rv.closest("[data-qid]");
          if (!card2) return;
          var qid = rv.getAttribute("data-reveal");
          var slot = $(".sol-slot", card2);
          if (slot) {
            if (slot.innerHTML.trim()) { slot.innerHTML = ""; rv.textContent = "对照标准答案"; }
            else {
              var qq = findPracticeQ(qid);
              slot.innerHTML = (qq && qq.type === "entry") ? renderEntrySolution(qq) : renderEssaySolution(qq);
              rv.textContent = "收起标准答案";
            }
          }
          return;
        }
        if (prev) prev.call(box, e);
      };
    })(box.onclick);

    box.oninput = function (e) {
      var pad = e.target.closest ? e.target.closest(".pad") : null;
      if (!pad) return;
      if (pad.textContent.trim() === "") pad.innerHTML = "";
      var qid = pad.getAttribute("data-pad");
      if (qid && mode === "ex") state.exam.pads[qid] = pad.innerHTML;
    };
  }

  /* =========================================================
     全题型精刷
     ========================================================= */
  function findPracticeQ(qid) {
    var sub = SUBJECTS[state.subject];
    for (var i = 0; i < sub.qb.length; i++) { if (sub.qb[i].id === qid) return sub.qb[i]; }
    return null;
  }

  function prFiltered() {
    var sub = SUBJECTS[state.subject];
    return sub.qb.filter(function (q) {
      if (state.pr.type !== "all" && q.type !== state.pr.type) return false;
      if (state.pr.chapter !== "all" && q.chapter !== state.pr.chapter) return false;
      return true;
    });
  }

  function openPractice(subjectKey) {
    state.subject = subjectKey;
    state.pr.type = "all";
    state.pr.chapter = "all";
    var sub = SUBJECTS[subjectKey];
    $("#pr-title").textContent = sub.name + " · 全题型精刷";

    var types = [
      { v: "all", n: "全部题型" },
      { v: "single", n: "单项选择题" },
      { v: "multi", n: "多项选择题" },
      { v: "entry", n: "计算题" },
      { v: "essay", n: "主观题（计算分析 / 简答 / 综合 / 案例分析）" }
    ];
    $("#pr-type").innerHTML = types.map(function (t) {
      return '<option value="' + t.v + '">' + t.n + '</option>';
    }).join("");

    var chs = [];
    sub.qb.forEach(function (q) { if (chs.indexOf(q.chapter) < 0) chs.push(q.chapter); });
    $("#pr-chapter").innerHTML = '<option value="all">全部章节</option>' + chs.map(function (c) {
      return '<option value="' + esc(c) + '">' + esc(c) + '</option>';
    }).join("");

    renderPractice();
    show("practice");
  }

  function renderPractice() {
    var list = prFiltered();
    var box = $("#pr-stage");
    var html = "";
    var idx = 0;
    list.forEach(function (q) {
      idx++;
      html += renderQuestionCard(q, idx, "pr");
    });
    if (!list.length) {
      html = '<div class="q-card" style="text-align:center;color:#96607f;padding:40px 20px;font-size:14px">该筛选条件下暂无题目，请更换题型或章节。</div>';
    }
    box.innerHTML = html;
    $("#pr-bar").style.width = "0%";
    bindQuestionCards(box, list, "pr");
  }

  function renderQuestionCard(q, idx, mode) {
    var isJudge = q.type === "judge";
    var isMulti = q.type === "multi";
    var isEntry = q.type === "entry";
    var isEssay = q.type === "essay";
    var label = isEssay ? (q.kind || "主观题") : (TYPE_LABEL[q.type] || "试题");
    var cls = TYPE_CLASS[q.type] || "t-single";

    var h = '<article class="q-card" data-qid="' + q.id + '">';
    h += '<div class="q-meta"><span class="q-type ' + cls + '">' + esc(label) + '</span>' +
      '<span class="q-idx">第 ' + idx + ' 题</span>' +
      (q.chapter ? '<span class="q-chap">' + esc(q.chapter) + '</span>' : "") +
      (isEssay && q.score ? '<span class="q-score">本题 ' + q.score + ' 分</span>' : "") +
      '</div>';
    h += '<p class="q-stem">' + esc(q.stem) + '</p>';

    if (isEssay) {
      h += '<div class="essay">' + subsBlock(q) + padBlock(q.id, mode) + '</div>';
    } else if (isEntry) {
      h += '<div class="essay">' + padBlock(q.id, mode) + '</div>';
    } else if (isJudge) {
      h += '<ul class="opts judge-opts">';
      ["对", "错"].forEach(function (t, i) {
        h += '<li><button class="opt judge" data-i="' + i + '"><span class="k"></span>' + t + '</button></li>';
      });
      h += '</ul>';
    } else {
      h += '<ul class="opts">';
      (q.options || []).forEach(function (o, i) {
        h += '<li><button class="opt" data-i="' + i + '"><span class="k">' + LETTERS[i] + '</span><span class="t">' + esc(o) + '</span></button></li>';
      });
      h += '</ul>';
    }

    if (isMulti && mode === "pr") {
      h += '<div class="pr-foot" style="margin-top:14px"><button class="btn-primary" data-confirm="' + q.id + '" disabled>确认答案</button></div>';
    }
    h += '<div class="sol-slot"></div>';
    h += '</article>';
    return h;
  }

  function renderSolution(q, picked, mode) {
    var isMulti = q.type === "multi";
    var isEntry = q.type === "entry";

    var correct = q.answer.slice().sort().join(",");
    var sel = picked.slice().sort().join(",");
    var resClass = "res-bad", resText = "答错";
    if (!picked.length) { resText = "未作答"; }
    else if (sel === correct) { resClass = "res-ok"; resText = "答对"; }
    else if (isMulti && PARTIAL_CREDIT && picked.every(function (i) { return q.answer.indexOf(i) >= 0; })) {
      resClass = "res-part"; resText = "少选（按比例得分）";
    }

    var ansText = q.answer.map(function (i) {
      return q.type === "judge" ? (i === 0 ? "对" : "错") : LETTERS[i];
    }).join("、");

    var h = '<div class="sol">';
    if (mode === "pr") {
      h += '<p class="sol-row"><span class="lab lab-res">判　定</span><span class="' + resClass + '">' + resText + '</span>' +
        '　正确答案：<b>' + ansText + '</b></p>';
    } else {
      h += '<p class="sol-row"><span class="lab lab-res">正确答案</span><b>' + ansText + '</b></p>';
    }
    if (q.point) h += '<p class="sol-row"><span class="lab lab-kp">考　点</span>' + esc(q.point) + '</p>';
    if (q.analysis) h += '<p class="sol-row"><span class="lab lab-exp">解　析</span>' + esc(q.analysis) + '</p>';
    if (q.mnemonic) h += '<p class="sol-row"><span class="lab lab-mn">口　诀</span><span class="mn-inline" style="margin-top:0">' + esc(q.mnemonic) + '</span></p>';
    h += '</div>';
    return h;
  }

  function errBox(errors) {
    var h = '<div class="err-box"><span class="err-t">⚠ 易错点提示</span><ul>';
    errors.forEach(function (e) { h += '<li>' + e + '</li>'; });
    h += '</ul></div>';
    return h;
  }

  function renderEssaySolution(q) {
    if (!q) return "";
    var h = '<div class="sol">';
    h += '<p class="sol-row"><span class="lab lab-res">本题分值</span><b>' + (q.score || 0) + ' 分</b>' +
      '　<span style="font-size:12px;color:#96607f">（主观题不自动判分，请自行对照估分）</span></p>';
    if (q.subs && q.subs.length) {
      h += '<p class="sol-row"><span class="lab lab-kp">小题分值</span>' +
        q.subs.map(function (s, i) { return "第" + (i + 1) + "小题 " + s.score + " 分"; }).join("　｜　") + '</p>';
    }
    if (q.point) h += '<p class="sol-row"><span class="lab lab-kp">考　点</span>' + esc(q.point) + '</p>';
    h += '<p class="sol-row"><span class="lab lab-exp">标准答案</span></p>';
    h += '<pre>' + esc(q.answer || "") + '</pre>';
    if (q.analysis) h += '<p class="sol-row" style="margin-top:12px"><span class="lab lab-exp">解　析</span>' + esc(q.analysis) + '</p>';
    if (q.mnemonic) h += '<p class="sol-row"><span class="lab lab-mn">口　诀</span><span class="mn-inline" style="margin-top:0">' + esc(q.mnemonic) + '</span></p>';
    if (q.errors && q.errors.length) h += errBox(q.errors);
    h += '</div>';
    return h;
  }

  function renderEntrySolution(q) {
    if (!q) return "";
    var h = '<div class="sol">';
    h += '<p class="sol-row"><span class="lab lab-res">标准答案</span></p>';
    h += '<pre>' + esc(q.answer || q.entry || "") + '</pre>';
    if (q.point) h += '<p class="sol-row" style="margin-top:12px"><span class="lab lab-kp">考　点</span>' + esc(q.point) + '</p>';
    if (q.analysis) h += '<p class="sol-row"><span class="lab lab-exp">解　析</span>' + esc(q.analysis) + '</p>';
    if (q.mnemonic) h += '<p class="sol-row"><span class="lab lab-mn">口　诀</span><span class="mn-inline" style="margin-top:0">' + esc(q.mnemonic) + '</span></p>';
    if (q.errors && q.errors.length) h += errBox(q.errors);
    h += '</div>';
    return h;
  }

  /* 判定得分（CPA：多选不设部分分） */
  function scoreOf(q, picked, perScore) {
    if (!picked.length) return 0;
    var correct = q.answer.slice().sort().join(",");
    var sel = picked.slice().sort().join(",");
    if (sel === correct) return perScore;
    if (PARTIAL_CREDIT) {
      var subset = picked.every(function (i) { return q.answer.indexOf(i) >= 0; });
      if (subset) return Math.round(perScore * picked.length / q.answer.length * 100) / 100;
    }
    return 0;
  }

  function bindQuestionCards(box, list, mode) {
    var byId = {};
    list.forEach(function (q) { byId[q.id] = q; });
    var picked = {};
    var locked = {};
    var done = {};

    function updateBar() {
      if (mode !== "pr") return;
      var n = Object.keys(done).length;
      var pct = list.length ? Math.round(n / list.length * 100) : 0;
      $("#pr-bar").style.width = pct + "%";
    }

    function paint(qid) {
      var card = box.querySelector('[data-qid="' + qid + '"]');
      if (!card) return;
      var q = byId[qid];
      var sel = picked[qid] || [];
      $$(".opt", card).forEach(function (b) {
        var i = parseInt(b.getAttribute("data-i"), 10);
        b.classList.add("locked");
        b.classList.remove("sel");
        if (q.answer.indexOf(i) >= 0) b.classList.add("correct");
        if (sel.indexOf(i) >= 0 && q.answer.indexOf(i) < 0) b.classList.add("wrong");
        if (sel.indexOf(i) >= 0 && q.answer.indexOf(i) >= 0 && q.type !== "single") b.classList.add("sel");
      });
      var slot = $(".sol-slot", card);
      if (slot) slot.innerHTML = renderSolution(q, sel, mode);
      var cf = $("[data-confirm]", card);
      if (cf) cf.parentNode.style.display = "none";
    }

    bindPadTools(box, mode);

    var padInput = box.oninput;
    box.oninput = function (e) {
      if (padInput) padInput.call(box, e);
      var pad = e.target.closest ? e.target.closest(".pad") : null;
      if (!pad) return;
      var card = pad.closest("[data-qid]");
      if (!card) return;
      var qid = card.getAttribute("data-qid");
      if (pad.textContent.trim()) done[qid] = true; else delete done[qid];
      updateBar();
    };

    var padHandler = box.onclick;
    box.onclick = function (e) {
      var confirmBtn = e.target.closest("[data-confirm]");
      if (confirmBtn) {
        var qid2 = confirmBtn.getAttribute("data-confirm");
        if (locked[qid2]) return;
        if (!(picked[qid2] || []).length) { toast("请先选择答案", true); return; }
        locked[qid2] = true;
        done[qid2] = true;
        updateBar();
        paint(qid2);
        return;
      }

      var optBtn = e.target.closest(".opt");
      if (!optBtn) { padHandler.call(box, e); return; }
      var card = optBtn.closest("[data-qid]");
      if (!card) { padHandler.call(box, e); return; }
      var qid = card.getAttribute("data-qid");
      if (locked[qid]) return;
      var q = byId[qid];
      var i = parseInt(optBtn.getAttribute("data-i"), 10);
      var isMulti = q.type === "multi";

      if (!picked[qid]) picked[qid] = [];
      var arr = picked[qid];

      if (isMulti) {
        var p = arr.indexOf(i);
        if (p >= 0) arr.splice(p, 1); else arr.push(i);
        $$(".opt", card).forEach(function (b) {
          var bi = parseInt(b.getAttribute("data-i"), 10);
          b.classList.toggle("sel", arr.indexOf(bi) >= 0);
        });
        var cf = $("[data-confirm]", card);
        if (cf) cf.disabled = arr.length === 0;
        return;
      }

      picked[qid] = [i];
      locked[qid] = true;
      done[qid] = true;
      updateBar();
      paint(qid);
    };
  }

  function initPractice() {
    $("#pr-type").addEventListener("change", function () {
      state.pr.type = this.value;
      renderPractice();
    });
    $("#pr-chapter").addEventListener("change", function () {
      state.pr.chapter = this.value;
      renderPractice();
    });
    $("#pr-reset").addEventListener("click", function () {
      renderPractice();
      toast("已重新开始，答题记录已清空");
    });
  }

  /* =========================================================
     历年真题考试（六科联考）
     ========================================================= */
  function fmtTime(sec) {
    var m = Math.floor(sec / 60), s = sec % 60;
    return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
  }
  function startTimer() {
    stopTimer();
    state.exam.startAt = Date.now();
    state.exam.timerId = setInterval(function () {
      var el = $("#ex-timer");
      if (!el) return;
      el.textContent = fmtTime(Math.floor((Date.now() - state.exam.startAt) / 1000));
    }, 500);
  }
  function stopTimer() {
    if (state.exam.timerId) { clearInterval(state.exam.timerId); state.exam.timerId = null; }
  }

  function renderExamTrack(cur) {
    var box = $("#ex-track");
    if (state.exam.stage === "intro" || state.exam.stage === "result") { box.innerHTML = ""; return; }
    var html = '<span style="font-size:12px;font-weight:700;color:#96607f">联考进度</span>';
    ORDER.forEach(function (k, i) {
      var cls = "tk";
      if (k === cur) cls += " cur";
      else if (state.exam.done[k]) cls += " done";
      html += '<span class="' + cls + '">' + (i + 1) + '. ' + esc(SUBJECTS[k].name) + (state.exam.done[k] ? " ✓" : "") + '</span>';
    });
    box.innerHTML = html;
  }

  function openExam(subjectKey) {
    state.subject = subjectKey || "accounting";
    state.exam.stage = "intro";
    state.exam.cur = "accounting";
    state.exam.answers = {};
    state.exam.locked = {};
    state.exam.pads = {};
    state.exam.done = {};
    state.exam.papers = {};
    $("#ex-title").textContent = "历年真题考试";
    $("#ex-timer").textContent = "00:00";
    $("#ex-subject").textContent = "六科联考";
    renderExamIntro();
    show("exam");
  }

  function renderExamIntro() {
    var rules = ORDER.map(function (k, i) {
      var p = SUBJECTS[k].exam || {};
      var subj = 0;
      (p.sections || []).forEach(function (s) {
        if (s.type === "essay") s.questions.forEach(function (q) { subj += q.score || 0; });
      });
      return '<li><b>' + (i + 1) + '. ' + esc(SUBJECTS[k].name) + '</b>　共 ' +
        (p.sections || []).reduce(function (a, s) { return a + s.questions.length; }, 0) +
        ' 题　客观 ' + (p.objectiveScore || 0) + ' 分 ＋ 主观 ' + subj + ' 分　建议用时 ' + (p.duration || 0) + ' 分钟</li>';
    }).join("");

    var html =
      '<div class="ex-hero">' +
      '<h3>注册会计师 · 专业阶段六科真题联考</h3>' +
      '<p>本卷为专业阶段<b>六科联考</b>，每科满分 100 分，六科合计 600 分，60 分为单科合格线。</p>' +
      '<ul class="ex-rules">' + rules + '</ul>' +
      '<ul class="ex-rules">' +
      '<li><b>考试流程：</b>按官方顺序逐科作答，每科交卷后<b>自动跳转</b>到下一科；六科全部完成后点击「<b>全部交卷</b>」触发批改。</li>' +
      '<li><b>客观题分类：</b>单项选择题与多项选择题<b>分开作答</b>。专业阶段<b>不设判断题</b>。</li>' +
      '<li><b>多选题评分：</b>CPA 规则为<b>不设部分分</b> —— 全部选对得满分，<b>不答、错答、漏答均不得分</b>。</li>' +
      '<li><b>主观题书写：</b>题目下方有<b>透明书写模块</b>，点击即可直接书写，可自由换色，字体不粗不细。</li>' +
      '<li><b>主观题分值：</b>每道主观题标注本题总分，并<b>精细到每个小题</b>的分值。</li>' +
      '<li><b>成绩构成：</b>客观题自动判分得出「<b>客观题总分</b>」；主观题对照标准答案自行估分后填入「<b>主观题总分</b>」；点击「<b>计算总分</b>」得出各科总分与六科总分。</li>' +
      '</ul>' +
      '<button class="btn-primary" id="ex-start">开始考试（先考会计）</button>' +
      '</div>';
    $("#ex-stage").innerHTML = html;
    renderExamTrack("");
    $("#ex-start").onclick = function () {
      state.exam.stage = "paper";
      state.exam.cur = "accounting";
      state.exam.answers = {};
      state.exam.locked = {};
      state.exam.pads = {};
      state.exam.done = {};
      renderExamPaper("accounting");
      startTimer();
    };
  }

  function renderExamPaper(which) {
    var paper = SUBJECTS[which].exam;
    var totalQ = 0;
    paper.sections.forEach(function (sec) { totalQ += sec.questions.length; });

    $("#ex-subject").textContent = SUBJECTS[which].name;
    renderExamTrack(which);

    var h = '<div class="ex-paper-head"><h3>' + esc(paper.name) + ' · 历年真题精选卷</h3>' +
      '<span>共 ' + totalQ + ' 题　满分 100 分　建议用时 ' + paper.duration + ' 分钟</span></div>';

    var n = 0;
    paper.sections.forEach(function (sec) {
      var isEssaySec = sec.type === "essay";
      var secScore = isEssaySec
        ? sec.questions.reduce(function (a, q) { return a + (q.score || 0); }, 0)
        : sec.questions.length * sec.perScore;
      h += '<h3 class="ex-sec-title' + (isEssaySec ? " subjective" : "") + '">' + esc(sec.name) +
        '<small>共 ' + sec.questions.length + ' 题，合计 ' + secScore + ' 分' +
        (isEssaySec ? '（主观题 · 不自动判分）' : '（每题 ' + sec.perScore + ' 分）') + '</small></h3>';

      sec.questions.forEach(function (q) {
        n++;
        h += '<article class="q-card" data-qid="' + q.id + '">';
        h += '<div class="q-meta"><span class="q-type ' + (TYPE_CLASS[sec.type] || "t-single") + '">' + esc(sec.name) + '</span>' +
          '<span class="q-idx">第 ' + n + ' 题' + (isEssaySec ? '' : '（' + sec.perScore + ' 分）') + '</span>' +
          (isEssaySec && q.score ? '<span class="q-score">本题 ' + q.score + ' 分</span>' : '') +
          '</div>';
        h += '<p class="q-stem">' + esc(q.stem) + '</p>';

        if (isEssaySec) {
          h += '<div class="essay">' + subsBlock(q) + padBlock(q.id, "ex") + '</div>';
        } else if (sec.type === "judge") {
          h += '<ul class="opts">';
          ["对", "错"].forEach(function (t, i) {
            h += '<li><button class="opt judge" data-i="' + i + '">' + t + '</button></li>';
          });
          h += '</ul>';
        } else {
          h += '<ul class="opts">';
          (q.options || []).forEach(function (o, i) {
            h += '<li><button class="opt" data-i="' + i + '"><span class="k">' + LETTERS[i] + '</span><span class="t">' + esc(o) + '</span></li>';
          });
          h += '</ul>';
        }
        h += '</article>';
      });
    });

    var idx = ORDER.indexOf(which);
    var isLast = idx === ORDER.length - 1;
    h += '<div class="ex-hero" style="padding:22px">';
    h += '<p style="margin-bottom:14px">' + (isLast
      ? '《' + esc(paper.name) + '》是六科中的最后一科，作答完成后点击「<b>全部交卷</b>」，系统将批改六科客观题并给出「客观题总分」。'
      : '《' + esc(paper.name) + '》作答完成后点击下方按钮交卷，将<b>自动跳转</b>到《' + esc(SUBJECTS[ORDER[idx + 1]].name) + '》。') + '</p>';
    h += '<button class="btn-primary" id="ex-submit">' + (isLast ? "全部交卷" : "交卷并进入" + SUBJECTS[ORDER[idx + 1]].name) + '</button>';
    h += '</div>';

    $("#ex-stage").innerHTML = h;
    bindExamPaper(which);

    $("#ex-submit").onclick = function () {
      var unanswered = countUnanswered(paper);
      if (unanswered > 0) {
        if (!window.confirm("本科还有 " + unanswered + " 题未作答，确定要交卷吗？")) return;
      }
      state.exam.papers[which] = gradePaper(which);
      state.exam.done[which] = true;
      if (isLast) {
        stopTimer();
        finishExam();
      } else {
        toast("《" + paper.name + "》已交卷，正在进入《" + SUBJECTS[ORDER[idx + 1]].name + "》…");
        state.exam.cur = ORDER[idx + 1];
        renderExamPaper(ORDER[idx + 1]);
      }
    };
  }

  function countUnanswered(paper) {
    var c = 0;
    paper.sections.forEach(function (sec) {
      sec.questions.forEach(function (q) {
        if (sec.type === "essay") {
          if (!String(state.exam.pads[q.id] || "").replace(/<[^>]*>/g, "").trim()) c++;
        } else if (!(state.exam.answers[q.id] || []).length) c++;
      });
    });
    return c;
  }

  function bindExamPaper(which) {
    var box = $("#ex-stage");
    bindPadTools(box, "ex");

    var padHandler = box.onclick;
    box.onclick = function (e) {
      var btn = e.target.closest(".opt");
      if (!btn) { padHandler.call(box, e); return; }
      var card = btn.closest("[data-qid]");
      if (!card) { padHandler.call(box, e); return; }
      var qid = card.getAttribute("data-qid");
      if (state.exam.locked[qid]) return;

      var paper = SUBJECTS[which].exam;
      var q = null, secType = "single";
      paper.sections.forEach(function (sec) {
        sec.questions.forEach(function (item) {
          if (item.id === qid) { q = item; secType = sec.type; }
        });
      });
      if (!q) return;

      var i = parseInt(btn.getAttribute("data-i"), 10);
      var isMulti = secType === "multi";
      if (!state.exam.answers[qid]) state.exam.answers[qid] = [];
      var arr = state.exam.answers[qid];

      if (isMulti) {
        var p = arr.indexOf(i);
        if (p >= 0) arr.splice(p, 1); else arr.push(i);
        $$(".opt", card).forEach(function (b) {
          var bi = parseInt(b.getAttribute("data-i"), 10);
          b.classList.toggle("sel", arr.indexOf(bi) >= 0);
        });
      } else {
        state.exam.answers[qid] = [i];
        state.exam.locked[qid] = true;
        $$(".opt", card).forEach(function (b) {
          b.classList.remove("sel");
          if (b === btn) b.classList.add("sel");
        });
      }
    };
  }

  /* 批改：只批客观题（单选 / 多选） */
  function gradePaper(which) {
    var paper = SUBJECTS[which].exam;
    var answers = state.exam.answers;
    var objDetail = [];
    var subList = [];
    var got = 0, objFull = 0, subFull = 0;

    paper.sections.forEach(function (sec) {
      if (sec.type === "essay") {
        sec.questions.forEach(function (q) {
          subFull += (q.score || 0);
          subList.push({
            id: q.id, name: sec.name, score: q.score || 0,
            subs: (q.subs || []).map(function (s) { return s.score; }),
            written: String(state.exam.pads[q.id] || "").replace(/<[^>]*>/g, "").trim().length > 0
          });
        });
        return;
      }
      var sGot = 0, sFull = sec.questions.length * sec.perScore;
      sec.questions.forEach(function (q) {
        sGot += scoreOf(q, answers[q.id] || [], sec.perScore);
      });
      got += sGot; objFull += sFull;
      objDetail.push({
        name: sec.name, count: sec.questions.length, perScore: sec.perScore,
        got: Math.round(sGot * 100) / 100, full: sFull
      });
    });

    return {
      subject: which, name: paper.name,
      got: Math.round(got * 100) / 100,
      objFull: objFull,
      subFull: subFull,
      objDetail: objDetail,
      subList: subList
    };
  }

  function finishExam() {
    ORDER.forEach(function (k) {
      if (!state.exam.papers[k]) state.exam.papers[k] = gradePaper(k);
    });
    state.exam.stage = "result";
    renderExamTrack("");
    renderExamResult();
    show("exam");
  }

  function renderExamResult() {
    var results = ORDER.map(function (k) { return state.exam.papers[k]; });

    function subjectCard(r) {
      var h = '<div class="score-card" data-res="' + r.subject + '">';
      h += '<h3>' + esc(r.name) + '</h3>';
      h += '<div class="sub">客观题满分 ' + r.objFull + ' 分 · 主观题满分 ' + r.subFull + ' 分 · 单科满分 ' + (r.objFull + r.subFull) + ' 分</div>';
      h += '<div class="score-total">';
      h += '<div><b>' + r.got + '</b><span>客观题总分（自动判分）</span></div>';
      h += '<div><b id="ss-show-' + r.subject + '">—</b><span>主观题总分（自评）</span></div>';
      h += '<div><b id="tot-' + r.subject + '">—</b><span>本科总分</span></div>';
      h += '</div>';

      h += '<div class="score-detail" style="margin-top:18px">';
      r.objDetail.forEach(function (d) {
        h += '<div><span>' + esc(d.name) + '（' + d.count + ' 题 × ' + d.perScore + ' 分）</span><b>' + d.got + ' / ' + d.full + '</b></div>';
      });
      h += '</div>';

      h += '<div class="self-score">';
      h += '<h4>主观题自评（客观题已自动判分，此处由你自行填写）</h4>';
      h += '<p>主观题不自动判分，请对照标准答案自行估分。主观题满分 <b style="color:#a3134f">' + r.subFull + ' 分</b>。</p>';
      h += '<ul class="essay-subs" style="margin-bottom:12px">';
      r.subList.forEach(function (s, i) {
        h += '<li><span class="sq">第 ' + (i + 1) + ' 题　' + esc(s.name) +
          (s.written ? '　<span style="color:#0f9d58;font-size:12px">已书写</span>' : '　<span style="color:#d92b2b;font-size:12px">未书写</span>') +
          (s.subs.length ? '　<span style="color:#96607f;font-size:12px">（小题分值：' + s.subs.join(" / ") + '）</span>' : "") +
          '</span><span class="ss">' + s.score + ' 分</span></li>';
      });
      h += '</ul>';
      h += '<div class="row"><input id="ss-input-' + r.subject + '" type="number" min="0" max="' + r.subFull +
        '" step="0.5" placeholder="0 ~ ' + r.subFull + '"><span class="hint">主观题总分（满分 ' + r.subFull + ' 分）</span></div>';
      h += '</div>';

      h += '<div class="pad-tools" style="justify-content:center;margin-top:16px">' +
        '<button class="padbtn" data-show-answer="' + r.subject + '">查看主观题标准答案</button></div>';
      h += '<div class="answer-slot" id="ans-slot-' + r.subject + '"></div>';
      h += '</div>';
      return h;
    }

    var h = '<div class="score-wrap">';
    h += '<div class="ex-hero"><h3>六科客观题已批改完成</h3>' +
      '<p>客观题（单选 / 多选）已自动判分。请对照标准答案为主观题自评，填入各科「主观题总分」后点击「<b>计算总分</b>」。</p></div>';
    results.forEach(function (r) { h += subjectCard(r); });

    var gObj = Math.round(results.reduce(function (a, r) { return a + r.got; }, 0) * 100) / 100;
    h += '<div class="score-card">' +
      '<h3>计算总分</h3>' +
      '<div class="sub">客观题总分已自动判分，填写各科主观题总分后点击下方按钮计算最终成绩</div>' +
      '<div class="score-total">' +
      '<div><b id="grand-obj">' + gObj + '</b><span>六科客观题总分</span></div>' +
      '<div><b id="grand-sub">—</b><span>六科主观题总分</span></div>' +
      '<div><b id="grand-tot">—</b><span>六科总分（满分 600）</span></div>' +
      '</div>' +
      '<div id="grand-verdict" style="margin-top:16px;font-size:13.5px;color:#6b2a4a;line-height:1.9"></div>' +
      '<div style="margin-top:20px;display:flex;gap:12px;justify-content:center;flex-wrap:wrap">' +
      '<button class="btn-primary" id="ex-calc">计 算 总 分</button>' +
      '<button class="btn-ghost" id="ex-again">再考一次</button>' +
      '<button class="btn-ghost" id="ex-home">返回首页</button>' +
      '</div>' +
      '<p style="margin:18px 0 0;font-size:12.5px;color:#96607f;line-height:1.9">多项选择题按 CPA 规则计分：全部选对得满分，不答、错答、漏答均不得分（不设部分分）。</p>' +
      '</div>';
    h += '</div>';

    $("#ex-stage").innerHTML = h;

    $$("[data-show-answer]").forEach(function (btn) {
      btn.onclick = function () {
        var key = btn.getAttribute("data-show-answer");
        var slot = $("#ans-slot-" + key);
        if (!slot) return;
        if (slot.innerHTML.trim()) { slot.innerHTML = ""; btn.textContent = "查看主观题标准答案"; return; }
        var sub = SUBJECTS[key];
        var html = "";
        sub.exam.sections.forEach(function (sec) {
          if (sec.type !== "essay") return;
          html += '<h3 class="ex-sec-title subjective">' + esc(sec.name) + '</h3>';
          sec.questions.forEach(function (q, i) {
            html += '<div class="q-card" style="margin-top:10px">';
            html += '<div class="q-meta"><span class="q-type t-essay">' + esc(sec.name) + '</span>' +
              '<span class="q-idx">第 ' + (i + 1) + ' 题</span><span class="q-score">本题 ' + q.score + ' 分</span></div>';
            html += '<p class="q-stem">' + esc(q.stem) + '</p>';
            html += subsBlock(q);
            html += renderEssaySolution(q);
            html += '</div>';
          });
        });
        slot.innerHTML = html;
        btn.textContent = "收起主观题标准答案";
      };
    });

    $("#ex-calc").onclick = function () {
      var acc = [];
      var bad = false;
      results.forEach(function (r) {
        var input = $("#ss-input-" + r.subject);
        var raw = input.value.trim();
        var v = raw === "" ? 0 : Number(raw);
        if (isNaN(v) || v < 0) { bad = true; v = 0; }
        if (v > r.subFull) { v = r.subFull; input.value = r.subFull; toast("《" + r.name + "》主观题总分已按满分 " + r.subFull + " 分封顶", true); }
        $("#ss-show-" + r.subject).textContent = Math.round(v * 100) / 100;
        var total = Math.round((r.got + v) * 100) / 100;
        $("#tot-" + r.subject).textContent = total;
        acc.push({ r: r, sub: Math.round(v * 100) / 100, total: total, pass: total >= 60 });
      });
      if (bad) toast("请输入 0 ~ 满分之间的数字", true);

      var gObj2 = Math.round(results.reduce(function (a, r) { return a + r.got; }, 0) * 100) / 100;
      var gSub = Math.round(acc.reduce(function (a, x) { return a + x.sub; }, 0) * 100) / 100;
      var gTot = Math.round((gObj2 + gSub) * 100) / 100;
      $("#grand-obj").textContent = gObj2;
      $("#grand-sub").textContent = gSub;
      $("#grand-tot").textContent = gTot;

      var lines = acc.map(function (x) {
        return '<div style="display:flex;justify-content:space-between;gap:10px;padding:8px 12px;border-radius:10px;background:rgba(255,255,255,.8);border:1px solid rgba(190,90,140,.26);margin-bottom:6px">' +
          '<span>' + esc(x.r.name) + '　客观 ' + x.r.got + ' ＋ 主观 ' + x.sub + '　＝　<b style="color:#b8175a">' + x.total + ' / 100</b></span>' +
          '<span style="font-weight:800;color:' + (x.pass ? "#0f9d58" : "#d92b2b") + '">' + (x.pass ? "合格 ✓" : "未达合格线 ✗") + '</span></div>';
      }).join("");
      var passCount = acc.filter(function (x) { return x.pass; }).length;
      lines += '<div style="margin-top:12px;text-align:center;font-size:15px;font-weight:800;color:' + (passCount === 6 ? "#0f9d58" : "#b8175a") + '">' +
        '六科中 ' + passCount + ' 科达到 60 分合格线' + (passCount === 6 ? "，全部通过，恭喜！" : "，继续加油！") + '</div>';
      $("#grand-verdict").innerHTML = lines;
      toast("总分计算完成");
    };

    $("#ex-again").onclick = function () { openExam("accounting"); };
    $("#ex-home").onclick = backHome;
  }

  /* =========================================================
     事件绑定
     ========================================================= */
  function initNav() {
    $("#modules").onclick = function (e) {
      var btn = e.target.closest("[data-open]");
      if (!btn) return;
      var target = btn.getAttribute("data-open");
      var subject = btn.getAttribute("data-subject");
      if (target === "knowledge") openKnowledge(subject);
      else if (target === "practice") openPractice(subject);
      else if (target === "exam") openExam(subject);
    };
    $$("[data-back]").forEach(function (b) {
      b.onclick = backHome;
    });
  }

  /* =========================================================
     启动
     ========================================================= */
  function boot() {
    renderModules();
    initLogin();
    initNav();
    initKnowledge();
    initPractice();
    show("login");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
