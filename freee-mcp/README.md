# freee MCP セットアップガイド

Claude (Desktop / Code) から freee の会計データを取得できるようにする手順です。

---

## 前提条件

- Windows PC
- Node.js インストール済み（`node -v` で確認）
- freee アカウント（事業所あり）

---

## ステップ 1: freee アプリを登録する

1. freee にログインして以下にアクセス：
   `https://app.secure.freee.co.jp/oauth/applications`
2. 「新しいアプリケーション」を作成
3. リダイレクト URI に `urn:ietf:wg:oauth:2.0:oob` を入力
4. **Client ID** と **Client Secret** を控える

---

## ステップ 2: アクセストークンを取得する

ブラウザで以下の URL にアクセス（`CLIENT_ID` を置き換える）：

```
https://accounts.secure.freee.co.jp/public_api/authorize?client_id=CLIENT_ID&redirect_uri=urn:ietf:wg:oauth:2.0:oob&response_type=token
```

ログイン・認可後に **アクセストークン** が表示されるので控える。

---

## ステップ 3: 事業所 ID を確認する

freee にログイン後、右上のアカウント設定から **事業所 ID（数字）** を確認する。

---

## ステップ 4: 設定ファイルを編集する

### Claude Desktop の場合

以下のファイルを開く：
```
C:\Users\<ユーザー名>\AppData\Roaming\Claude\claude_desktop_config.json
```

以下を追記：

```json
{
  "mcpServers": {
    "freee": {
      "command": "npx",
      "args": ["-y", "@freee/freee-mcp"],
      "env": {
        "FREEE_ACCESS_TOKEN": "取得したアクセストークン",
        "FREEE_COMPANY_ID": "事業所ID（数字のみ）"
      }
    }
  }
}
```

### Claude Code の場合

ターミナルで以下を実行：

```bash
claude mcp add freee -- npx -y @freee/freee-mcp
```

または `%USERPROFILE%\.claude\settings.json` に同じ形式で追記。

---

## ステップ 5: 再起動して動作確認

1. Claude Desktop を完全に終了して再起動
2. チャットで以下のように入力して確認：

```
freee の勘定科目一覧を取得して
```

freee のデータが返ってくれば設定完了です。

---

## トラブルシューティング

| 症状 | 対処 |
|------|------|
| MCP セクションに「エラー」と表示 | `FREEE_ACCESS_TOKEN` / `FREEE_COMPANY_ID` の値を再確認 |
| MCP セクション自体が見当たらない | JSON の構文エラーを確認（カンマ・括弧の閉じ忘れなど） |
| 再起動後も同じエラー | Node.js のバージョンを確認（v18 以上推奨） |
