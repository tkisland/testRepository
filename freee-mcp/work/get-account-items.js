/**
 * freee 勘定科目一覧取得スクリプト
 *
 * 使い方:
 *   FREEE_ACCESS_TOKEN=<トークン> FREEE_COMPANY_ID=<事業所ID> node get-account-items.js
 */

const https = require('https');

const ACCESS_TOKEN = process.env.FREEE_ACCESS_TOKEN;
const COMPANY_ID = process.env.FREEE_COMPANY_ID;

if (!ACCESS_TOKEN || !COMPANY_ID) {
  console.error('エラー: 環境変数 FREEE_ACCESS_TOKEN と FREEE_COMPANY_ID を設定してください');
  console.error('例: FREEE_ACCESS_TOKEN=xxx FREEE_COMPANY_ID=12345 node get-account-items.js');
  process.exit(1);
}

const options = {
  hostname: 'api.freee.co.jp',
  path: `/api/1/account_items?company_id=${COMPANY_ID}`,
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  },
};

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode !== 200) {
      console.error(`エラー: HTTP ${res.statusCode}`);
      console.error(data);
      process.exit(1);
    }

    const json = JSON.parse(data);
    const items = json.account_items;

    console.log(`勘定科目一覧 (${items.length}件)\n`);
    console.log('ID\t\t勘定科目名\t\t\t種別');
    console.log('-'.repeat(60));

    for (const item of items) {
      console.log(`${item.id}\t\t${item.name}\t\t\t${item.account_category}`);
    }
  });
});

req.on('error', (e) => {
  console.error('リクエストエラー:', e.message);
  process.exit(1);
});

req.end();
