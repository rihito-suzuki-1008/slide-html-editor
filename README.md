# Slide HTML Editor & Generator

HTML/CSS で 1 枚ずつ作成したスライドを **AI 生成 → 編集 → 全体表示／印刷** まで
完結できるツールセットです。  編集からPDF化までローカルだけで完結します。

- **PROMPT.md** に書いたプロンプトを丸ごと AI（ChatGPT など）へ投げれば  
  `slide-01.html` 以降の雛形が生成できます。  
- 生成した HTML を本リポジトリに配置し、ローカルサーバーで編集／プレビュー。  
- 完全オフラインで PDF 書き出しにも対応。

---

## 1. クイックスタート

```bash
# 1) リポジトリを取得
git clone https://github.com/rihito-suzuki-1008/slide-editor.git
cd slide-editor

# 2) 依存ライブラリをインストール
npm install          # package.json に定義 :contentReference[oaicite:0]{index=0}

# 3) ローカルサーバーを起動
npm start            # → http://localhost:3000/ が開通（PORT=3000）:contentReference[oaicite:1]{index=1}
````

ブラウザで `http://localhost:3000/` を開き、以下の手順で操作します。

1. **プロジェクト選択画面（index.html）**
   既存フォルダを選択するか、新規作成ボタンで空プロジェクトを生成します。
   スライド枚数・更新日時がカードに表示されます。
2. **エディター（editor/slide-editor.html）**

   * 左ペイン：スライド一覧（クリックで読み込み）
   * 右上ツールバー：

     * 💾 **Ctrl+S** 保存
     * 🔄 再読み込み
     * 👁️ **Ctrl+P** 全体プレビュー
     * ✏️ テキスト編集モード
     * 🎨 レイアウト編集モード（要素ドラッグ＆リサイズ）
3. **全体プレビュー／印刷（slide\_all\_display.html）**
   `?project=<フォルダ名>` クエリ付きで自動連結表示。直接開けば手動で
   ディレクトリ選択 → PDF 出力にも使えます。

---

## 2. AI でスライドを生成する

1. `PROMPT.md` を開き、必要に応じてセクションを編集
2. ChatGPT などに「以下の Markdown を元に各スライド (slide-01.html …) を生成して」
   と投げる
3. **生成された HTML ファイル** を `/sample-slide` など任意フォルダに保存
4. エディターでフォルダを選択して編集開始

---

## 3. ディレクトリ構成（抜粋）

```
.
├── editor/                 # フロントエンド UI
│   ├── index.html          # プロジェクト選択
│   └── slide-editor.html   # スライド編集画面
├── sample-slide/           # 生成スライドの実体 (slide-01.html…)
├── slide_all_display.html  # 全ページ連結表示・印刷用
├── slide-editor-server.js  # Express サーバー本体
├── package.json            # npm スクリプト
└── PROMPT.md               # AI 生成用プロンプト
```

---

## 4. エディターの主な機能

| 機能         | 操作               | 備考                                 |
| ---------- | ---------------- | ---------------------------------- |
| スライドの読み込み  | サイドバーでクリック       | 未保存の場合はアスタリスク表示                    |
| テキスト編集モード  | `✏️` トグル         | 指定要素がフォームで編集可能                     |
| レイアウト編集モード | `🎨` トグル         | オーバーレイ上でドラッグ＆リサイズ                  |
| 保存         | **Ctrl+S / 💾**  | 変更差分があるとボタンが有効                     |
| 全体プレビュー    | **Ctrl+P / 👁️** | 新規タブで `slide_all_display.html` を開く |
| キーボード      | Ctrl+S / Ctrl+P  | Mac は ⌘ でも可                        |

---

## 5. 技術スタック & 仕組み

| レイヤ     | 採用技術                                                              | 補足                                 |
| ------- | ----------------------------------------------------------------- | ---------------------------------- |
| フロントエンド | Vanilla JS + HTML/CSS                                             | Canvas や外部 FW なしで軽量                |
| サーバー    | **Express 4** + CORS + body‑parser                                | `slide-editor-server.js` 1 ファイル構成  |
| API     | `/api/projects`, `/api/slides`, `/api/current-project` など REST 形式 |                                    |
| プレビュー   | `/preview/:file` ルートでプロジェクト内 HTML を配信                             |                                    |
| バックアップ  | 保存時に `backups/slide-xx.html.<timestamp>.bak` を自動生成                |                                    |
| 依存      | express, cors, body‑parser, node‑html‑parser だけで最小限               |                                    |

---

## 6. よくある質問

<details>
<summary>Q. Node.js の推奨バージョンは？</summary>

A. LTS 版 (v18 以降) を推奨します。古いバージョンでも動作しますが、
ESM 対応やパフォーマンスの観点から最新版を選択してください。

</details>

<details>
<summary>Q. ポートを変更したい</summary>

`PORT` 定数を `slide-editor-server.js` 冒頭で書き換えてください。
（環境変数などへの抽出は TODO）

</details>

---

## 7. 今後のロードマップ

* AI から直接 POST でスライドを生成するエンドポイント
* 画像アセット管理（ドラッグ＆ドロップ／自動リサイズ）
* Undo/Redo, マルチユーザー同期編集

---

### Enjoy your slide‑making! 🚀
