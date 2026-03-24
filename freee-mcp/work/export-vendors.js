#!/usr/bin/env node
/**
 * freee 取引先一覧エクスポートスクリプト
 *
 * 使い方:
 *   FREEE_ACCESS_TOKEN=<アクセストークン> FREEE_COMPANY_ID=<事業所ID> node export-vendors.js
 *
 * オプション:
 *   --format=csv   CSV形式で出力（デフォルト: テーブル形式）
 *   --output=<ファイル名>  ファイルに保存
 */

const https = require("https");
const fs = require("fs");

// 環境変数から設定を読み込む
const ACCESS_TOKEN = process.env.FREEE_ACCESS_TOKEN;
const COMPANY_ID = process.env.FREEE_COMPANY_ID;

// 引数パース
const args = process.argv.slice(2);
const format = (args.find((a) => a.startsWith("--format=")) || "--format=table")
  .split("=")[1];
const outputFile = (args.find((a) => a.startsWith("--output=")) || "").split(
  "="
)[1];

if (!ACCESS_TOKEN || !COMPANY_ID) {
  console.error("エラー: 環境変数を設定してください");
  console.error(
    "  FREEE_ACCESS_TOKEN=<アクセストークン> FREEE_COMPANY_ID=<事業所ID> node export-vendors.js"
  );
  process.exit(1);
}

/**
 * freee API を呼び出す
 */
function apiGet(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "api.freee.co.jp",
      path,
      method: "GET",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data));
        } else {
          reject(
            new Error(
              `API エラー: ${res.statusCode} ${res.statusMessage}\n${data}`
            )
          );
        }
      });
    });

    req.on("error", reject);
    req.end();
  });
}

/**
 * 全ページの取引先を取得する
 */
async function fetchAllPartners() {
  const partners = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const url = `/api/1/partners?company_id=${COMPANY_ID}&limit=${limit}&offset=${offset}`;
    const data = await apiGet(url);

    if (!data.partners || data.partners.length === 0) break;

    partners.push(...data.partners);
    console.error(
      `取得中: ${partners.length} 件 / 全 ${data.meta?.total_count ?? "?"} 件`
    );

    if (partners.length >= (data.meta?.total_count ?? 0)) break;
    offset += limit;
  }

  return partners;
}

/**
 * テーブル形式で出力
 */
function formatTable(partners) {
  if (partners.length === 0) {
    return "取引先が見つかりませんでした。";
  }

  const cols = [
    { key: "id", label: "ID", width: 8 },
    { key: "code", label: "コード", width: 12 },
    { key: "name", label: "取引先名", width: 30 },
    { key: "shortcut1", label: "ショートカット", width: 15 },
    { key: "contact_name", label: "担当者名", width: 15 },
    { key: "email", label: "メール", width: 25 },
    { key: "phone", label: "電話番号", width: 15 },
  ];

  const pad = (str, len) => {
    const s = String(str ?? "");
    // 全角文字は2文字分として計算
    let visLen = 0;
    for (const c of s) {
      visLen += c.charCodeAt(0) > 0x7e ? 2 : 1;
    }
    return s + " ".repeat(Math.max(0, len - visLen));
  };

  const header = cols.map((c) => pad(c.label, c.width)).join(" | ");
  const separator = cols.map((c) => "-".repeat(c.width)).join("-+-");

  const rows = partners.map((p) =>
    cols.map((c) => pad(p[c.key], c.width)).join(" | ")
  );

  return [header, separator, ...rows].join("\n");
}

/**
 * CSV形式で出力
 */
function formatCsv(partners) {
  const headers = [
    "id",
    "code",
    "name",
    "shortcut1",
    "shortcut2",
    "contact_name",
    "email",
    "phone",
    "address_zip_code",
    "address_prefecture_code",
    "address_street_name1",
    "address_street_name2",
    "country_code",
    "long_name",
    "name_kana",
    "default_title",
    "phone",
    "transfer_fee_handling_side",
  ];

  const escape = (val) => {
    const s = String(val ?? "");
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const rows = [
    headers.join(","),
    ...partners.map((p) => headers.map((h) => escape(p[h])).join(",")),
  ];

  return rows.join("\n");
}

async function main() {
  console.error(`freee 取引先一覧を取得中... (事業所ID: ${COMPANY_ID})`);

  const partners = await fetchAllPartners();
  console.error(`\n合計 ${partners.length} 件の取引先を取得しました。\n`);

  const output =
    format === "csv" ? formatCsv(partners) : formatTable(partners);

  if (outputFile) {
    fs.writeFileSync(outputFile, output, "utf8");
    console.error(`ファイルに保存しました: ${outputFile}`);
  } else {
    console.log(output);
  }
}

main().catch((err) => {
  console.error("エラーが発生しました:", err.message);
  process.exit(1);
});
