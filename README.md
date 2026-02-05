# デジタルID制度 国際比較データベース
（📌 このREADMEは **AIプロンプト** を兼ねています）

---

## ⚠️ IMPORTANT — AI PROMPT NOTICE
**このREADMEは、単なる説明書ではありません。**  
本READMEは、
- 本リポジトリの仕様書
- 運用ルール
- 設計思想の宣言
- **AI（Copilot / ChatGPT 等）に与える前提条件・制約（プロンプト）**
を **同時に満たす文書**として設計されています。

👉 新しいチャットを開始した場合でも、  
👉 **このREADME全文をAIに提示することで、同一の前提・制約・思想を共有できます。**

AIは、このREADMEを  
**「このプロジェクトにおける憲法」**として扱ってください。

---

## 1. プロジェクトの目的（WHY）
本リポジトリは、日本を基準に主要国の  
**デジタルID制度の「設計思想・制度構造の違い」**を比較するための  
**データ駆動型・完全静的な可視化データベース & Webサイト**です。

- 制度の「優劣」を評価・断定することは目的としません
- 「なぜその制度が、そう設計されたのか」という  
  **背景・構造・選択理由の違い**を理解することを重視します

想定読者：
- 政策担当者
- 研究者
- 行政・GovTech開発者

---

## 2. 最重要原則（ABSOLUTE RULES / PROMPT CORE）
以下は **絶対に破ってはいけない制約** です。  
AIは、本プロジェクトに関与する際、必ずこれを最優先してください。

### ✅ CSV is Source of Truth
- **CSVが唯一の正（Source of Truth）**
- CSVの内容を **解釈・補正・推測・要約・言い換えしない**
- 欠損値を推測で埋めない

### ✅ JavaScriptの役割制限
- JavaScript（app.js）は **CSV → UI変換のみ**
- 以下を **追加・提案してはならない**
  - 国別例外ロジック
  - 自動計算（※「レイアウトの均等割り」に必要な列数のCSS変数設定は例外として許容：後述）
  - 翻訳推測
  - 地図投影・補正ロジック

### ✅ 指標は固定
- 指標は **I01〜I11の11項目で固定**
- 数・順序・意味を絶対に変更しない
- 表示順は `indicators.csv` の `display_order` を最優先

### ✅ 完全静的
- GitHub Pages / ローカルHTTPサーバで動作
- 外部API・外部地図サービスに依存しない
- ※例外：国旗画像はブラウザ互換性のため FlagCDN（外部CDN）を使用する（将来 assets 化を検討）

### ✅ 見た目はCSSのみ
- UIの調整は **CSS（styles.css / theme.css）のみ**
- HTML構造やJSロジックでの見た目調整は禁止  
  - ※例外：比較表の「国列数」に応じた均等割りを実現するため、JSが列数をCSS変数へ渡すことのみ許容（後述）

---

## 3. 可視化の基本方針（WHAT）
AIは、このサイトを  
**「データを評価するUI」ではなく「データを可視化するUI」**として扱ってください。

- 表示対象：
  - `country_indicator.csv` の  
    **(version, review_status="published")** フィルタ結果のみ
- `value` 表示ルール：
  - main：原文のまま表示（英語）
  - detail：
    - `translations_ja.csv` に **完全一致** した場合のみ日本語に置換
    - 一致しない場合は原文表示（推測翻訳禁止）

### （追加）source_url の記法（重要）
`country_indicator.csv` の `source_url` は以下の **どちらの形式でも良い**（UIは両方を解釈する）。

- 推奨：JSON配列文字列  
  例：`["https://example1","https://example2"]`
- 互換：セミコロン区切り（legacy）  
  例：`https://example1;https://example2`

※URLの順序は「出典1 / 出典2 ...」の表示順になる。  
※CSV内ではJSON配列のダブルクォートが保持されるよう、CSVのクォート規則に従って保存すること（Excel保存時に崩れない形式で）。

---


## 3.2 基本情報（country_basic.csv）（追加：本チャットで実装）
制度項目（I01〜I11）とは別枠で、国ごとの「基本情報（A〜C）」を表示する仕組みを追加した。  
**重要：指標（I01〜I11）の数・順序・意味は変更しない。** 基本情報は「別CSV」で管理し、UIはCSVをそのまま表示する。  

### 3.2.1 データのSoT
- SoT（唯一の正）は `data/country_basic.csv`
- `country_indicator.csv`（制度）とは完全に別管理

### 3.2.2 CSVスキーマ（必須列）
`data/country_basic.csv` の列（想定・運用）:
- `country_id` : 国ID（JPN等）
- `basic_id` : 基本情報ID（A01〜C03）
- `value` : 表示値（1行目=主要値、2行目以降=補足）
- `year` : 対象年（例：2024）
- `version` : データセット版（`country_indicator.csv` と整合させる）
- `change_note` : 変更メモ
- `review_status` : `draft` / `reviewed` / `published`
- `source_url` : 出典URL（JSON配列文字列推奨。`country_indicator.csv` と同様に UI が解釈する）

### 3.2.3 value の書式（UIがそのまま表示する前提）
- `value` は改行区切りで扱う。
  - 1行目：主要値（数値など）
  - 2行目以降：補足（例：出典名、定義注意）
- UIは `splitValue()`（既存）で 1行目=main、残り=detail として表示する。

### 3.2.4 source_url の書式（制度と同じルール）
- 推奨：JSON配列文字列（例：`["https://...","https://..."]`）
- 互換：セミコロン区切り（legacy）
- UIは両方を解釈して「出典1 / 出典2 …」を表示する。

### 3.2.5 version / status の整合（重要）
- トップページの version セレクタは基本的に `country_indicator.csv` の version を基準に作られる。
- そのため、`country_basic.csv` 側も **同じ `version`** を持たないと表示がズレやすい。
- 本チャットでは `country_basic.csv` の A01/A02 を **version=2026/2/4** に揃え、`review_status=published` で表示する運用にした。

### 3.2.6 表示場所（UI）
- 国別ページ（country.html）
  - 「基本情報」カード（`#countryBasics`）に A01〜C03 を表示
- トップページ（index.html）
  - 「横断比較」カード内で、制度比較表の上に「基本情報（抜粋）」を表示
  - 現状は A01〜A06 を抜粋表示（必要に応じて app.js の BASIC_SUMMARY_IDS で調整）

### 3.2.7 実装上の注意（JSが落ちると地図ピンまで止まる）
- トップページでは `renderAll()` が `renderComparison()` の後に `renderWorldMap()` を呼ぶ。
- したがって **renderComparison 内で例外が起きると、国旗ピンが消える**（worldmap描画まで到達しない）。
- `renderBasicSummary()`（トップページ基本情報）呼び出しは `try/catch` で保護すること。

### 3.2.8 典型トラブル（実際に発生）
- トップページに基本情報が出ない
  - 原因：`renderComparison()` から `renderBasicSummary()` を呼んでいない
- 国旗ピンが消える
  - 原因：JSエラーで `renderWorldMap()` まで到達しない
- 基本情報と制度表の横幅が合わない
  - 原因：`styles.css` に basic summary のCSSが重複／列幅ロジックが不一致
  - 対処：`#basicSummaryTable` に `#comparisonTable` と同じ列幅計算（`--col-indicator` と `--country-cols`）を適用し、CSSブロックを1つに統一する

## 4. 世界地図と国旗ピンのルール（重要）

### 4.1 地図の表示方式
- 世界地図は **CSS の `background-image`** として表示する
- 現在は **PNG 画像のみを使用**
  - SVG は未使用（将来追加の可能性はあるが前提にしない）
- 使用している PNG は **日本中心（Japan-centered）に編集された世界地図**
- 一般的な経緯度（Greenwich-centered）とは一致しない

### 4.2 国旗ピン位置の Source of Truth
- 国旗ピン位置の **唯一の正（SoT）は `countries.csv`**
- 使用カラム：
  - `map_lat`
  - `map_lon`
  - `map_dx`
  - `map_dy`

これらの値は：
- 実世界の正確な緯度・経度ではない
- 日本中心の地図画像に合わせて **人間が手動で調整するための座標**である

### 4.3 国追加時の正式ルール
- 新しい国を追加する場合：
  1. `countries.csv` に国を追加
  2. 地図画像を見ながら `map_lat` / `map_lon`（必要なら `map_dx` / `map_dy`）を手動調整
- JavaScriptで：
  - 自動緯度経度変換
  - 投影計算
  - 国別補正テーブル
  を **追加してはならない**

---

## 5. 比較UIに関する運用ルール（追加）

### 5.1 基準国（Baseline）
- 比較の基準国は **日本（country_id="JPN"）**
- 日本は **常に比較対象に含まれる（非表示にできない）**
- 比較表では **日本列を常に左端に固定**する

### 5.2 国選択（chips）の扱い
- 国選択UI（chips）では、日本（JPN）を **表示しない**
- 比較対象の選択は「日本と比較する相手国」を選ぶUIとする
- 「すべて解除」操作は、日本（JPN）のみが残る挙動とする

### 5.3 初期表示（デフォルト選択）
- 初期表示の国は以下とする：
  - JPN, EST, DNK, KOR

※ 本章は UI の挙動を固定するための運用ルールであり、CSVの内容を変更・推測するものではない。

### （追加）version の運用ルール（重要）
- `country_indicator.csv` の `version` は「データセットのリリース版」を表す。
- 原則として、ある version は「全ての国 × 全ての指標（I01〜I11）」が揃った完全版であること。
- 一部の国だけ更新する場合は、次のいずれかを選ぶ：
  1) 更新した内容を含めて全行の version を同じ値に揃える（推奨）  
  2) 更新は同一 version のままにし、`change_note` 等で差分管理する
- UI（version セレクタ）は「完全版（全行が揃っている version）」のみを選択肢として表示する。  
  - 不完全な version（特定国のみ更新等）は選択肢に出さない（空表示を防ぐため）。

### （追加）比較表の列幅仕様（重要）
- 比較表は、選択した国数に関わらず「右端までめいっぱい表示」する。
- 国列（日本＋選択国）は常に均等幅とする。
- 国数が多くなり1列が潰れすぎる場合は、横スクロールで閲覧できるようにする（可読性維持）。

#### 実装上の注意（例外許容）
- 上記を実現するため、JSは「表示している国列数」をCSS変数に渡すことのみ許可する。  
  例：`--country-cols` に列数をセットし、CSSで均等割り計算に使う。
- これはデータの推測や国別例外ではなく、レイアウト（幅計算）のための最小限の補助である。  
- それ以外の見た目調整（国別の幅補正・国ごとのCSS分岐等）は禁止。

### （追加）比較表：日本列固定（sticky）に関する注意
- 日本（baseline）列はスクロール時に左に固定する（sticky）。
- ただし、固定列の `td` に背景色（白など）を直接指定すると、  
  `.nationwide / .partial / .planned` の背景色が消えるため禁止。
- 固定列の `th`（ヘッダ）は白背景で良いが、`td`（データセル）は  
  セル分類色が維持される実装にする（例：overlay方式など）。

---

## 6. 翻訳CSV（translations_ja.csv）の厳格ルール（追加）
`translations_ja.csv` は、detail日本語置換の **唯一の辞書**である。

- ファイルパス：`data/translations_ja.csv`
- ヘッダは **必ず `en,ja`**
  - ヘッダ名が異なる場合、辞書化されず翻訳が適用されない
- 置換条件：
  - `en` 列に **完全一致** した場合のみ `ja` に置換
  - 一致しない場合は原文（英語）を表示（推測翻訳禁止）

---

## 7. フォルダ構成
```text
digital-id-db/
├─ assets/
├─ data/
│  ├─ countries.csv
│  ├─ country_basic.csv
│  ├─ indicators.csv
│  ├─ country_indicator.csv
│  ├─ translations_ja.csv
│  └─ events.csv
│
├─ index.html
├─ country.html
├─ app.js
├─ styles.css
├─ theme.css
└─ README.md
```

---

## 8. CSV保存時の注意（重要）
CSVは必ず UTF-8（BOM付き） で保存すること。  
（Excelでは「CSV UTF-8（コンマ区切り）」で保存しないと、Web表示で文字化けします）

---

## 9. 新しい国を追加する際のチェックリスト
1. countries.csv に国を追加する  
2. 日本中心地図PNGを見ながら map_lat / map_lon（必要なら map_dx / map_dy）を手動調整  
3. JavaScriptには一切手を入れない（※例外：比較表の列数をCSS変数に渡す用途のみ許容：5章参照）

---

## 10. AIへの行動指針（HOW TO RESPOND）
AIは、本リポジトリに関する質問・修正提案に対して：
- 最小変更を前提に提案すること
- 触るファイル名・箇所を明示すること
- 制約に抵触しない理由を必ず一言で添えること
- 判断に迷う場合は、勝手に決めず質問を返すこと

---

## 11. 最後に
このREADMEは、
- 仕様書
- 運用ルール
- 設計憲法
- AIプロンプト
を兼ねています。

AIは、このREADMEを「このプロジェクトに参加する前に必ず読む前提条件」として扱ってください。

---

## 12. トラブルシュート（ローカルサーバ / CSSが効かない場合）

### ✅ まず確認すること（最優先）
- `country.html` は `<body class="page-country">` であること
  - `class="page-country"` や `class=\"page-country\"` のように **バックスラッシュが混入**すると、  
    `.page-country ...` のCSSが一切マッチせず、レイアウトが崩れます。

### ✅ CSSが反映されないとき（ローカルサーバ）
- DevTools の Network で `styles.css` が 200 で取得できているか確認する
- 直接 `http://localhost:PORT/.../styles.css` を開いて内容が取れるか確認する
  - 取れない場合は **サーバの配信ルートと編集しているフォルダが違う**可能性が高い

### （追加）CSS読み込み順（重要）
- `theme.css` はベースのテーマ（色・背景）を定義する。
- `styles.css` はレイアウト・比較表・sticky等の挙動を定義する。
- 読み込み順は必ず `theme.css` → `styles.css` とする（後勝ちで styles が最終決定するため）。

### （追加）比較表の表示崩れ（日本列の色が消える／被る等）
- 日本列（baseline）を sticky で固定している場合、`td` に白背景を直指定するとセル色が消える。
- 1列目（制度項目）ヘッダーと `--col-indicator` の幅がズレると、固定列の left 計算と一致せず被りが発生する。
- 国数が少ないと右に余白が出る場合は、「均等割り（列数をCSS変数へ渡す）」仕様になっているか確認する（5章参照）。


### （追加）トラブルシュート：トップページ基本情報（basicSummary）が表示されない
- `index.html` に `#basicSummary` が存在するか確認する。
- `app.js` が `data/country_basic.csv` を読み込んでいるか確認する（optionalでも良いが、存在しないと「データなし」になる）。
- `renderComparison()` 内で `renderBasicSummary(countryIds, version, status)` を呼んでいるか確認する。
  - 呼び忘れると `#basicSummary` は空のまま。
- DevTools Console を確認し、JSエラーが出ていないか確認する。
  - エラーがあると地図ピン（worldmap）も消える可能性がある。

### （追加）トラブルシュート：基本情報（basicSummaryTable）の横幅が制度表と合わない
- `styles.css` に basic summary のCSSブロックが重複していないか確認（重複すると勝ち負けで見え方が変わる）。
- `#basicSummaryTable` に `#comparisonTable` と同じ列幅計算が入っているか確認：
  - 左列：`var(--col-indicator)`
  - 国列：`calc((100% - var(--col-indicator)) / var(--country-cols, 1))`


### 3.2.9 A03〜A05（インターネット普及率／スマホ普及率の代理指標／1人あたりGDP（PPP））を World Bank から追加する手順（運用メモ）

本プロジェクトでは、基本情報（`data/country_basic.csv`）の **A03/A04 を World Bank（WDI）由来の数値**で埋める運用を採用する。

- **A03**：Individuals using the Internet (% of population) / `IT.NET.USER.ZS`
- **A04（代理指標）**：Mobile cellular subscriptions (per 100 people) / `IT.CEL.SETS.P2`
  - “スマホ普及率”そのものではなく、公開データで安定して取得できる **携帯契約数/100人**を代理指標として扱う。
- **A05（PPP）**：GDP per capita, PPP (current international $) / `NY.GDP.PCAP.PP.CD`
  - 表示は **整数（四捨五入）＋カンマ区切り**（例：51,685）を採用（見た目統一）。

#### 3.2.9.1 データ取得（JSON）
World Bank API は `format=json` で取得でき、国コードは `;` 区切りでまとめて取得できる（大量データなので `per_page=20000` 推奨）。

- 対象14か国：`JPN,KOR,EST,FRA,DEU,GBR,USA,CAN,AUS,NZL,SWE,DNK,SGP,IND`

**A03（IT.NET.USER.ZS）**
```text
https://api.worldbank.org/v2/country/JPN;KOR;EST;FRA;DEU;GBR;USA;CAN;AUS;NZL;SWE;DNK;SGP;IND/indicator/IT.NET.USER.ZS?format=json&per_page=20000
```

**A04（IT.CEL.SETS.P2）**
```text
https://api.worldbank.org/v2/country/JPN;KOR;EST;FRA;DEU;GBR;USA;CAN;AUS;NZL;SWE;DNK;SGP;IND/indicator/IT.CEL.SETS.P2?format=json&per_page=20000

**A05（NY.GDP.PCAP.PP.CD）**
```text
https://api.worldbank.org/v2/country/JPN;KOR;EST;FRA;DEU;GBR;USA;CAN;AUS;NZL;SWE;DNK;SGP;IND/indicator/NY.GDP.PCAP.PP.CD?format=json&per_page=20000
```
```

> 補足：年 `2024` が `null` になっている国があり得る（World Bank 側の更新待ち）。その場合は **「2024固定で N/A」**か、**「最新年（2024優先→直近）で埋める」**のどちらかの方針を選ぶ。

#### 3.2.9.2 CSVへの反映（重要：置き換えではなくマージ）
**最重要**：`data/country_basic.csv` は A01/A02 など他の基本情報も含むため、A03/A04 のみのCSVで **置き換えてはいけない**。

- 正しい手順：
  1) 既存の `data/country_basic.csv`（A01/A02 などを含む）を保持
  2) A03/A04 の行を **追加/上書き（マージ）**する
  3) `version` と `review_status` が UI 選択値と一致するように揃える（例：`version=2026/2/4`、`review_status=published`）

**マージの考え方（キー）**
- 置換のキー：`country_id + basic_id + version + review_status`
- 同じキーの行が既にある場合は、A03/A04 の値で上書き
- 無い場合は追記

#### 3.2.9.3 表示上の仕様（index と country の違い）
- `country.html` は `BASIC_ORDER`（A01〜C03）を全て表示するため、A03/A04 を埋めれば国別ページに表示される。
- `index.html` の基本情報サマリは、表示対象が `BASIC_SUMMARY_IDS` に **明示されたIDのみ**（初期は A01/A02）なので、A03/A04 を index に出す場合は `app.js` の設定変更が必要。


### 3.2.10 A06（主要言語数＝公用語数）の定義と作り方（運用メモ）
A06 は『主要言語数』として **公用語数（公式言語数）**を採用する。
- 対象：**全国（statewide / national）レベル**の公用語
- **de facto** は『de facto official』等、**公式扱いとして明確に記述がある場合のみ**カウントする（推測で追加しない）
- 地域限定（州・地方のみの公用語）は原則数えない
- 出典URLは `source_url` に **JSON配列文字列**で保存し、UIはそのまま『出典1』として表示する

（注意）A06 は制度指標（I01〜I11）ではなく `country_basic.csv` 側の基本情報。`version` と `review_status` の一致が表示条件になる（3.2.5参照）。


### （追加）トラブルシュート：index に A03〜A06 が出ない（country は出る）

**原因の大半は次の2点**。

1. **index の基本情報サマリは `BASIC_SUMMARY_IDS` に列挙されたものしか表示しない**（A05/A06 を出すにはリストに含める）
   - 例：A03/A04 も出したい場合は、`app.js` の `BASIC_SUMMARY_IDS` を `['A01','A02','A03','A04']` のように変更する。
2. **編集したファイルと、ブラウザが実際に読んでいる `app.js` が違う**（別ディレクトリ/別デプロイ/キャッシュ）
   - DevTools → Network で `app.js` の Response を確認し、変更が反映されているか確認する。

#### キャッシュが疑わしい場合（確実な対処）
`index.html` の script 読み込みにクエリを付けてキャッシュを回避する。

```html
<!-- 例：キャッシュバスター -->
<script src="./app.js?v=20260204"></script>
```

> `Ctrl+F5`（強制リロード）でも直らない場合に有効。

### （追加）トラブルシュート：A05 が N/A になる
- 原因：`country_basic.csv` の A05 行が **空欄（value/year が未入力）**のままになっている（テンプレ行のまま）。
- 対処：A05（PPP）を **上書き（マージ）**して `value` と `year` を埋める。A05 の置換キーは `country_id + basic_id + version + review_status`。

### （追加）トラブルシュート：A01/A02 が N/A になる

- `data/country_basic.csv` を A03/A04 だけのCSVで **置き換える**と、A01/A02 の行が消え、UI が見つけられず N/A になる。
- 対処：元の `data/country_basic.csv` を復元し、A03/A04 を **マージ**する。

