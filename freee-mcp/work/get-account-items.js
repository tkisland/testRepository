/**
 * freee 勘定科目一覧取得スクリプト
 *
 * 使い方:
 *   1. .env ファイルに FREEE_CLIENT_ID / FREEE_CLIENT_SECRET / FREEE_COMPANY_ID を設定
 *   2. node get-account-items.js
 *   3. ブラウザで表示された URL を開き、freee でログイン・認可する
 *   4. リダイレクト先の URL に含まれる code= の値をターミナルに貼り付ける
 *   5. 勘定科目一覧が JSON で出力される
 */

const http = require("http");
const https = require("https");
const readline = require("readline");
const url = require("url");

// ── 設定 ────────────────────────────────────────────
// 環境変数 or 直接書き換えて使用
const CLIENT_ID = process.env.FREEE_CLIENT_ID || "YOUR_CLIENT_ID";
const CLIENT_SECRET = process.env.FREEE_CLIENT_SECRET || "YOUR_CLIENT_SECRET";
const COMPANY_ID = process.env.FREEE_COMPANY_ID || "YOUR_COMPANY_ID";
const REDIRECT_URI = "urn:ietf:wg:oauth:2.0:oob"; // コピー&ペースト方式
// ────────────────────────────────────────────────────

const FREEE_AUTH_URL = "https://accounts.secure.freee.co.jp/public_api/authorize";
const FREEE_TOKEN_URL = "https://accounts.secure.freee.co.jp/public_api/token";
const FREEE_API_BASE = "https://api.freee.co.jp";

function httpsPost(postUrl, body) {
  return new Promise((resolve, reject) => {
    const parsed = new url.URL(postUrl);
    const data = JSON.stringify(body);
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data),
      },
    };
    const req = https.request(options, (res) => {
      let raw = "";
      res.on("data", (chunk) => (raw += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(raw));
        } catch (e) {
          reject(new Error(`JSON parse error: ${raw}`));
        }
      });
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

function httpsGet(getUrl, accessToken) {
  return new Promise((resolve, reject) => {
    const parsed = new url.URL(getUrl);
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    };
    const req = https.request(options, (res) => {
      let raw = "";
      res.on("data", (chunk) => (raw += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(raw));
        } catch (e) {
          reject(new Error(`JSON parse error: ${raw}`));
        }
      });
    });
    req.on("error", reject);
    req.end();
  });
}

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function getAccessToken(code) {
  const body = {
    grant_type: "authorization_code",
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code,
    redirect_uri: REDIRECT_URI,
  };
  const result = await httpsPost(FREEE_TOKEN_URL, body);
  if (!result.access_token) {
    throw new Error(`トークン取得失敗: ${JSON.stringify(result)}`);
  }
  return result.access_token;
}

async function getAccountItems(accessToken, companyId) {
  const apiUrl = `${FREEE_API_BASE}/api/1/account_items?company_id=${companyId}`;
  const result = await httpsGet(apiUrl, accessToken);
  if (result.errors) {
    throw new Error(`API エラー: ${JSON.stringify(result.errors)}`);
  }
  return result.account_items || result;
}

async function main() {
  if (CLIENT_ID === "YOUR_CLIENT_ID") {
    console.error("エラー: FREEE_CLIENT_ID 環境変数を設定してください");
    console.error("  例: set FREEE_CLIENT_ID=xxxxxxxx (Windows)");
    console.error("      export FREEE_CLIENT_ID=xxxxxxxx (Mac/Linux)");
    process.exit(1);
  }

  // Step 1: 認可 URL を表示
  const authUrl =
    `${FREEE_AUTH_URL}` +
    `?client_id=${encodeURIComponent(CLIENT_ID)}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    `&response_type=code`;

  console.log("\n===== freee 勘定科目一覧取得 =====\n");
  console.log("1. 以下の URL をブラウザで開いてください:\n");
  console.log("  " + authUrl);
  console.log("\n2. freee にログインし、アプリを認可してください");
  console.log("3. 画面に表示された「認可コード」をコピーして以下に貼り付けてください\n");

  // Step 2: 認可コード入力
  const code = await prompt("認可コードを貼り付けてください: ");
  if (!code) {
    console.error("認可コードが入力されていません");
    process.exit(1);
  }

  // Step 3: アクセストークン取得
  console.log("\nアクセストークンを取得中...");
  const accessToken = await getAccessToken(code);
  console.log("アクセストークン取得成功 ✓");

  // Step 4: 勘定科目一覧取得
  console.log(`勘定科目一覧を取得中 (company_id: ${COMPANY_ID})...`);
  const items = await getAccountItems(accessToken, COMPANY_ID);

  console.log(`\n===== 勘定科目一覧 (${items.length} 件) =====\n`);
  items.forEach((item) => {
    console.log(`[${item.account_category}] ${item.name} (ID: ${item.id})`);
  });

  console.log("\n----- JSON 出力 -----");
  console.log(JSON.stringify(items, null, 2));
}

main().catch((err) => {
  console.error("\nエラー:", err.message);
  process.exit(1);
});
