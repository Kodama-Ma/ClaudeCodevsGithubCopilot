/**
 * AIツール ライセンス管理 Webアプリ（GAS）
 *
 * データはマスタースプシ1枚に集約し、権限はアプリ側で出し分ける。
 * - 部長: 自部署の行だけ閲覧・編集
 * - 管理者: 全部署を閲覧・編集、費用集計を見られる
 *
 * シート構成:
 *   licenses : Github-id, 事業部, グループ, 氏名, ツール, プラン
 *   pricing  : ツール, プラン, 月額単価
 *   roles    : メール, 事業部   （事業部=ALL で管理者）
 *   log      : 日時, 操作者, 事業部, 内容   （自動追記される）
 */

// ▼ デプロイ前に、対象スプシのIDをスクリプトプロパティ SPREADSHEET_ID に設定する。
//    （拡張機能→Apps Script→プロジェクト設定→スクリプトプロパティ、または下の初期化関数）
function setSpreadsheetId(id) {
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', id);
}

const SHEETS = { LICENSES: 'licenses', PRICING: 'pricing', ROLES: 'roles', LOG: 'log' };
const LICENSE_HEADERS = ['Github-id', '事業部', 'グループ', '氏名', 'ツール', 'プラン'];

function getSpreadsheet_() {
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('SPREADSHEET_ID が未設定です。setSpreadsheetId("...") を一度実行してください。');
  return SpreadsheetApp.openById(id);
}

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('AIツール ライセンス管理')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/** シートを {header, rows(objects)} で読む */
function readSheet_(name) {
  const sh = getSpreadsheet_().getSheetByName(name);
  if (!sh) throw new Error('シートが見つかりません: ' + name);
  const values = sh.getDataRange().getValues();
  const header = values.shift().map(String);
  const rows = values
    .filter(r => r.some(c => String(c).trim() !== ''))
    .map(r => {
      const o = {};
      header.forEach((h, i) => (o[h] = r[i] === undefined ? '' : String(r[i])));
      return o;
    });
  return { header, rows };
}

/** ログイン中ユーザーの権限コンテキストを返す */
function getMyContext_() {
  const email = Session.getActiveUser().getEmail();
  const { rows } = readSheet_(SHEETS.ROLES);
  const mine = rows.filter(r => (r['メール'] || '').toLowerCase() === email.toLowerCase());
  const isAdmin = mine.some(r => (r['事業部'] || '').toUpperCase() === 'ALL');
  const depts = isAdmin
    ? [...new Set(readSheet_(SHEETS.LICENSES).rows.map(r => r['事業部']).filter(Boolean))]
    : mine.map(r => r['事業部']).filter(Boolean);
  return { email, isAdmin, depts };
}

/** 画面初期化用データ（権限でフィルタ済みのライセンス＋費用表＋自分の権限） */
function getBootstrap() {
  const ctx = getMyContext_();
  if (!ctx.email) {
    return { error: 'ログインユーザーを取得できませんでした（ドメイン内アカウントでアクセスしてください）。' };
  }
  if (ctx.depts.length === 0) {
    return { error: 'あなたの編集対象事業部が roles シートに登録されていません。管理者に連絡してください。', email: ctx.email };
  }
  const licenses = readSheet_(SHEETS.LICENSES).rows.filter(r => ctx.depts.includes(r['事業部']));
  const pricing = readSheet_(SHEETS.PRICING).rows;
  return {
    email: ctx.email,
    isAdmin: ctx.isAdmin,
    depts: ctx.depts,
    headers: LICENSE_HEADERS,
    licenses: licenses,
    pricing: pricing
  };
}

/**
 * 1事業部ぶんの行を保存する。
 * 権限チェック → その事業部の既存行を置き換え → log 追記。
 * rows: [{Github-id, 事業部, グループ, 氏名, ツール, プラン}, ...]
 */
function saveDept(dept, rows) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const ctx = getMyContext_();
    if (!ctx.depts.includes(dept)) {
      throw new Error('権限がありません: ' + dept + ' を編集できるのは担当者のみです。');
    }
    // 渡された行の事業部を強制的に dept に揃える（なりすまし防止）
    const clean = (rows || [])
      .filter(r => String(r['Github-id'] || '').trim() !== '')
      .map(r => {
        const o = { '事業部': dept };
        LICENSE_HEADERS.forEach(h => { if (h !== '事業部') o[h] = String(r[h] || '').trim(); });
        return o;
      });

    const sh = getSpreadsheet_().getSheetByName(SHEETS.LICENSES);
    const all = readSheet_(SHEETS.LICENSES).rows;
    const others = all.filter(r => r['事業部'] !== dept);
    const merged = others.concat(clean);

    // シートを書き直す（ヘッダー＋全行）
    const out = [LICENSE_HEADERS].concat(
      merged.map(r => LICENSE_HEADERS.map(h => r[h] || ''))
    );
    sh.clearContents();
    sh.getRange(1, 1, out.length, LICENSE_HEADERS.length).setValues(out);

    appendLog_(ctx.email, dept, dept + ' を ' + clean.length + ' 行で更新');
    return { ok: true, count: clean.length };
  } finally {
    lock.releaseLock();
  }
}

function appendLog_(email, dept, message) {
  const sh = getSpreadsheet_().getSheetByName(SHEETS.LOG);
  if (!sh) return;
  sh.appendRow([new Date(), email, dept, message]);
}
