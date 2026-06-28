/**
 * AIツール ライセンス管理 Webアプリ（GAS）
 *
 * 人事項目（部・グループ・氏名）は Organization シートで一元管理し、
 * licenses は「誰に・どのツール・どのプラン」だけを持つ。
 * 画面表示時に github-id をキーに Organization と join する。
 *
 * シート構成:
 *   Organization     : github-id, 部, グループ, 氏名   （人と所属のマスタ。ここでメンテ）
 *   licenses         : github-id, ツール, プラン        （ライセンス付与のみ）
 *   prices           : ツール, プラン, 月額単価
 *   roles            : メール, 部                       （部=ALL で管理者）
 *   log              : 日時, 操作者, 部, 内容           （自動追記）
 *   github_licenses  : github-id                        （GitHub Enterprise Cloud 出力CSVを貼る。突合用）
 *
 * 部のタブは Organization の「部」を読んで動的生成する。
 */

const SHEETS = {
  ORG: 'Organization',
  LICENSES: 'licenses',
  PRICES: 'prices',
  ROLES: 'roles',
  LOG: 'log',
  GH_CSV: 'github_licenses'
};

const ORG_HEADERS = ['github-id', '部', 'グループ', '氏名'];
const LICENSE_HEADERS = ['github-id', 'ツール', 'プラン'];
const PRICE_HEADERS = ['ツール', 'プラン', '月額単価'];
const ROLE_HEADERS = ['メール', '部'];
const LOG_HEADERS = ['日時', '操作者', '部', '内容'];
const NO_TOOL = '配布なし';

// ▼ デプロイ前に、対象スプシのIDをスクリプトプロパティ SPREADSHEET_ID に設定する。
function setSpreadsheetId(id) {
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', id);
}

// 1リクエスト内ではスプシのオープンを1回だけに（openById は重いのでメモ化）
let _ssCache = null;
function getSpreadsheet_() {
  if (_ssCache) return _ssCache;
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('SPREADSHEET_ID が未設定です。setSpreadsheetId("...") を一度実行してください。');
  _ssCache = SpreadsheetApp.openById(id);
  return _ssCache;
}

// ▼ エクスポート先（固定）スプシのIDを EXPORT_SPREADSHEET_ID に設定する。
//   閲覧してほしい人にだけ共有しておく専用スプシを1枚用意し、そのIDを渡す。
function setExportSpreadsheetId(id) {
  PropertiesService.getScriptProperties().setProperty('EXPORT_SPREADSHEET_ID', id);
}

function getExportSpreadsheet_() {
  const id = PropertiesService.getScriptProperties().getProperty('EXPORT_SPREADSHEET_ID');
  if (!id) throw new Error('EXPORT_SPREADSHEET_ID が未設定です。setExportSpreadsheetId("...") を一度実行してください。');
  return SpreadsheetApp.openById(id);
}

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('AIツール ライセンス管理')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// 1リクエスト内では同じシートの読み込みを1回だけに（getBootstrap は同じシートを複数回読むため）
const _sheetCache = {};
function invalidateSheetCache_(name) {
  if (name) delete _sheetCache[name]; else for (const k in _sheetCache) delete _sheetCache[k];
}

/** シートを {header, rows(objects)} で読む。シートが無ければ rows:[] */
function readSheet_(name, optional) {
  if (Object.prototype.hasOwnProperty.call(_sheetCache, name)) return _sheetCache[name];
  const sh = getSpreadsheet_().getSheetByName(name);
  if (!sh) {
    if (optional) return (_sheetCache[name] = { header: [], rows: [] });
    throw new Error('シートが見つかりません: ' + name);
  }
  const values = sh.getDataRange().getValues();
  if (values.length === 0) return (_sheetCache[name] = { header: [], rows: [] });
  const header = values.shift().map(String);
  const rows = values
    .filter(r => r.some(c => String(c).trim() !== ''))
    .map(r => {
      const o = {};
      header.forEach((h, i) => (o[h] = r[i] === undefined ? '' : String(r[i]).trim()));
      return o;
    });
  return (_sheetCache[name] = { header, rows });
}

/** Organization を github-id -> {部, グループ, 氏名} のマップで返す */
function orgById_() {
  const map = {};
  readSheet_(SHEETS.ORG).rows.forEach(r => {
    if (r['github-id']) map[r['github-id']] = r;
  });
  return map;
}

/** Organization に出てくる部を出現順でユニーク化 */
function deptsInOrder_() {
  const seen = [];
  readSheet_(SHEETS.ORG).rows.forEach(r => {
    const d = r['部'];
    if (d && seen.indexOf(d) === -1) seen.push(d);
  });
  return seen;
}

/** ログイン中ユーザーの権限コンテキスト */
function getMyContext_() {
  const email = Session.getActiveUser().getEmail();
  const roles = readSheet_(SHEETS.ROLES).rows;
  const mine = roles.filter(r => (r['メール'] || '').toLowerCase() === email.toLowerCase());
  const authorized = mine.length > 0;            // roles にメールが載っている人だけ利用可
  const isAdmin = mine.some(r => (r['部'] || '').toUpperCase() === 'ALL');
  const allDepts = deptsInOrder_();
  const myDeptNames = mine.map(r => r['部']).filter(Boolean);
  const depts = isAdmin ? allDepts : allDepts.filter(d => myDeptNames.indexOf(d) !== -1);
  return { email, authorized, isAdmin, depts };
}

/** 指定した部のメンバーを Organization 基準で join して返す（ライセンス未設定は配布なし） */
function buildPeople_(depts) {
  const licMap = {};
  readSheet_(SHEETS.LICENSES).rows.forEach(r => {
    if (r['github-id']) licMap[r['github-id']] = r;
  });
  return readSheet_(SHEETS.ORG).rows
    .filter(o => depts.indexOf(o['部']) !== -1)
    .map(o => {
      const lic = licMap[o['github-id']] || {};
      return {
        'github-id': o['github-id'],
        '部': o['部'],
        'グループ': o['グループ'],
        '氏名': o['氏名'],
        'ツール': lic['ツール'] || NO_TOOL,
        'プラン': lic['プラン'] || ''
      };
    });
}

/** ツール×プラン -> 月額単価 のマップ */
function priceMap_() {
  const map = {};
  readSheet_(SHEETS.PRICES).rows.forEach(p => {
    map[p['ツール'] + '||' + p['プラン']] = Number(p['月額単価']) || 0;
  });
  return map;
}

/** 画面初期化用データ */
function getBootstrap() {
  const ctx = getMyContext_();
  if (!ctx.email) {
    return { error: 'ログインユーザーを取得できませんでした（ドメイン内アカウントでアクセスしてください）。' };
  }
  // roles に載っていない人にはデータを一切返さない（権限なし画面を出す）
  if (!ctx.authorized) {
    return { forbidden: true, email: ctx.email };
  }
  if (ctx.depts.length === 0) {
    return { error: 'あなたのアカウントには担当部が割り当てられていません。管理者に連絡してください。', email: ctx.email };
  }

  const result = {
    email: ctx.email,
    isAdmin: ctx.isAdmin,
    depts: ctx.depts,
    people: buildPeople_(ctx.depts),            // 編集用：自分の担当部だけ
    allPeople: buildPeople_(deptsInOrder_()),   // Allタブ用：全社（閲覧専用）
    allDepts: deptsInOrder_(),                  // 全社の部一覧（表示順）
    prices: readSheet_(SHEETS.PRICES).rows
  };

  if (ctx.isAdmin) {
    result.warnings = reconcileWithGithub_(readSheet_(SHEETS.ORG).rows, readSheet_(SHEETS.LICENSES).rows);
  }
  return result;
}

/**
 * 全体（自分が見える全部署）の「全メンバー一覧」を、固定のエクスポート先スプシに上書き出力する。
 * 新規作成はしない。「メンバー一覧」シートを毎回まるごと書き換える。金額は出さない。
 * 戻り値の url を開けば最新のスプシに行ける（＝アプリ⇔スプシを行き来できるだけ）。
 */
function exportAll() {
  const ctx = getMyContext_();
  if (!ctx.authorized) throw new Error('権限がありません。');
  const depts = deptsInOrder_();   // Allタブと同じく全社メンバーを書き出す

  const people = buildPeople_(depts);
  const headers = ['github-id', '部', 'グループ', '氏名', 'ツール', 'プラン'];
  const rows = people.map(r => [r['github-id'], r['部'], r['グループ'], r['氏名'], r['ツール'], r['プラン']]);

  const ss = getExportSpreadsheet_();
  writeSheet_(ss, 'メンバー一覧', headers, rows);

  const stamp = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd HH:mm');
  ss.getSheetByName('メンバー一覧').getRange(rows.length + 3, 1)
    .setValue('最終更新: ' + stamp + ' / ' + ctx.email);

  appendLog_(ctx.email, 'All', 'エクスポート（メンバー一覧を更新）');
  return { url: ss.getUrl(), title: ss.getName() };
}

/** 指定シートを毎回まるごと書き換える（無ければ作る） */
function writeSheet_(ss, name, headers, rows) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  sh.clear();
  const out = [headers].concat(rows);
  sh.getRange(1, 1, out.length, headers.length).setValues(out);
  sh.getRange(1, 1, 1, headers.length).setFontWeight('bold');
}

/**
 * GitHub Enterprise Cloud 出力CSV（github_licenses シート）と突合し、要確認リストを返す。
 * - unregistered : CSVにいるが Organization 未登録（＝アプリに登録すべき人）
 * - leftover     : ライセンス付与済みなのに CSV にいない（＝退職・剥奪漏れの疑い）
 */
function reconcileWithGithub_(org, licenses) {
  const csv = readSheet_(SHEETS.GH_CSV, true).rows;
  if (csv.length === 0) return { unregistered: [], leftover: [], csvLoaded: false };

  const csvIds = new Set(csv.map(r => r['github-id']).filter(Boolean));
  const orgIds = new Set(org.map(r => r['github-id']).filter(Boolean));

  const unregistered = [...csvIds].filter(id => !orgIds.has(id));
  const leftover = licenses
    .filter(r => r['ツール'] && r['ツール'] !== NO_TOOL)
    .map(r => r['github-id'])
    .filter(id => id && !csvIds.has(id));

  return { unregistered, leftover, csvLoaded: true };
}

/**
 * 1部ぶんのライセンスを保存する。
 * 権限チェック → その部のメンバー（Organization由来）の付与だけを licenses に反映 → log 追記。
 * rows: [{github-id, ツール, プラン}, ...]
 */
function saveDept(dept, rows) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const ctx = getMyContext_();
    if (ctx.depts.indexOf(dept) === -1) {
      throw new Error('権限がありません: ' + dept + ' を編集できるのは担当者のみです。');
    }

    // その部に本当に所属する github-id だけを受理（なりすまし防止）
    const org = orgById_();
    const deptIds = new Set(
      Object.keys(org).filter(id => org[id]['部'] === dept)
    );

    const incoming = (rows || [])
      .filter(r => deptIds.has(r['github-id']))
      .filter(r => r['ツール'] && r['ツール'] !== NO_TOOL)  // 配布なしは licenses に残さない
      .map(r => ({
        'github-id': r['github-id'],
        'ツール': String(r['ツール']).trim(),
        'プラン': String(r['プラン'] || '').trim()
      }));

    // 既存 licenses から この部のメンバー分を除去 → incoming を追加
    const all = readSheet_(SHEETS.LICENSES).rows;
    const others = all.filter(r => !deptIds.has(r['github-id']));
    const merged = others.concat(incoming);

    const sh = getSpreadsheet_().getSheetByName(SHEETS.LICENSES);
    const out = [LICENSE_HEADERS].concat(merged.map(r => LICENSE_HEADERS.map(h => r[h] || '')));
    sh.clearContents();
    sh.getRange(1, 1, out.length, LICENSE_HEADERS.length).setValues(out);
    invalidateSheetCache_(SHEETS.LICENSES);

    appendLog_(ctx.email, dept, dept + ' のライセンスを更新（付与 ' + incoming.length + ' 件）');
    return { ok: true, count: incoming.length };
  } finally {
    lock.releaseLock();
  }
}

function appendLog_(email, dept, message) {
  const sh = getSpreadsheet_().getSheetByName(SHEETS.LOG);
  if (!sh) return;
  sh.appendRow([new Date(), email, dept, message]);
}

/**
 * スプシの各シートを seeds データで初期化する。
 *
 * 使い方:
 *   1. setSpreadsheetId('...') 済みであること
 *   2. initSheets を選び▶実行（既存データは上書きされる）
 *   3. roles のメールを実アドレスに、prices を実額に、Organization を実データに置換
 *      github_licenses には GitHub Enterprise Cloud の出力CSVを貼る
 */
function initSheets() {
  const ss = getSpreadsheet_();

  const seeds = {
    Organization: {
      headers: ORG_HEADERS,
      rows: [
        ['aaa', '開発1部', '1グループ', 'アルファ'],
        ['bbb', '開発1部', '2グループ', 'ベータ'],
        ['eee', '開発1部', '1グループ', 'イプシロン'],  // ライセンス未付与の人（配布なし表示のデモ）
        ['ccc', '開発2部', '1グループ', 'ラムダ'],
        ['ddd', '開発3部', '1グループ', 'ガンマ'],
      ]
    },
    licenses: {
      headers: LICENSE_HEADERS,
      rows: [
        ['aaa', 'ClaudeCode', 'Premium'],
        ['bbb', 'ClaudeCode', 'Standard'],
        ['ccc', 'Codex',      'Business'],
        // ddd, eee は付与なし → licenses に行を持たない（＝配布なし）
      ]
    },
    prices: {
      headers: PRICE_HEADERS,
      rows: [
        ['ClaudeCode', 'Premium',  3000],
        ['ClaudeCode', 'Standard', 2000],
        ['Codex',      'Business', 4000],
      ]
    },
    roles: {
      headers: ROLE_HEADERS,
      rows: [
        // ▼ 実際の部長・管理者メールアドレスに置換して再実行
        ['dev1-lead@example.com', '開発1部'],
        ['dev2-lead@example.com', '開発2部'],
        ['dev3-lead@example.com', '開発3部'],
        ['admin@example.com',     'ALL'],
      ]
    },
    github_licenses: {
      headers: ['github-id'],
      rows: [
        // GitHub Enterprise Cloud の出力CSV相当（在籍・ライセンス対象者）
        ['aaa'], ['bbb'], ['ccc'], ['ddd'], ['eee'],
        ['zzz'],  // Organization 未登録 → 「登録漏れ」検出デモ
      ]
    },
    log: { headers: LOG_HEADERS, rows: [] }
  };

  Object.entries(seeds).forEach(([name, { headers, rows }]) => {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    sh.clearContents();
    const data = [headers, ...rows];
    sh.getRange(1, 1, data.length, headers.length).setValues(data);
  });

  // 旧シート名（事業部時代の pricing）が残っていれば掃除
  const old = ss.getSheetByName('pricing');
  if (old && ss.getSheets().length > 1) ss.deleteSheet(old);

  console.log('initSheets 完了。Organization / roles / prices / github_licenses を実データに置き換えてください。');
}
