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
- 本チャットでは `country_basic.csv` の各行を **version=2026/2/4** に揃え、`review_status=published` で表示する運用にした。
- 注意：`country_basic.csv` だけを新しい version（例：`2026/2/5`）にすると、UIの version セレクタ（主に `country_indicator.csv` 由来）と一致せず **国別ページで基本情報が表示されない**ことがある。
  - 対策：基本情報も **既存の version（例：`2026/2/4`）に揃える**か、version候補を `country_basic.csv` と `country_indicator.csv` の **和集合**にする（JS修正）。


### 3.2.6 表示場所（UI）
- 国別ページ（country.html）
  - 「基本情報」カード（`#countryBasics`）に A01〜C03 を表示
- トップページ（index.html）
  - 「横断比較」カード内で、制度比較表の上に「基本情報（抜粋）」を表示
  - 現状は A01/A02 を抜粋表示（A03以降は将来拡張）

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

### 3.2.9 C03（GTMI：GovTech成熟度）の定義（本チャットで確定）
- C03 は『デジタル政策の優先度』ではなく、World Bank の **GovTech Maturity Index (GTMI) の overall score（0〜1）** を格納する。
- 取得元：`WBG_GovTech_Dataset_Dec2025.xlsx`（GovTech Dataset Dec 2025）の `GTMI_Data` シートから **Year=2025, Code=ISO3 の `GTMI` 列**を取得する。
- `value` の1行目：GTMI（小数 **6桁** 固定）
- `value` の2行目以降：根拠文（例：『World Bank GovTech Dataset… Year:2025』）
- `source_url`：World Bank Data Catalog の Excel 直リンク + World Bank GovTech Data ページを **JSON配列文字列**で保存する。

### 3.2.10 数値フォーマット（本チャットで確定）
- 本プロジェクトでは、連続値（割合・指数など）の数値は **小数6桁** に統一する（例：`0.905044`）。
- UIは数値を計算しないため、CSV側でフォーマットを確定させる。

### 3.2.11 country.html の基本情報カード：色塗り禁止（本チャットで反映）
- country.html の『基本情報』では、B01/B03 等のカテゴリ色（nationwide/partial/planned）を付与しない。
- 実装：`app.js` の `renderCountryBasics()` で `basicCellClass()` による class 付与を無効化（フラグ `COLORIZE_COUNTRY_BASICS=false`）。

### 3.2.12 C02（プライバシー意識）の定義（本チャットで確定）
- C02 は OECD Going Digital の指標「Share of adults who avoid using certain websites, apps, or social media due to privacy concerns（indicator 84）」を格納する。citeturn4search1turn3search55
- 取得は Going Digital の indicator/84 ページの **Download data**（CSV）から行い、`Breakdown = All individuals aged 18 or older` の値を採用する。citeturn4search1turn3search55
- `value` の1行目：割合（%）を 0〜1 に正規化し **小数6桁**で固定（例：`0.361800`）。citeturn4search1
- 注意：この指標は調査（Truth Quest Survey）ベースで **国カバレッジが限定**されるため、`countries.csv` の全対象国に値が揃わないことがある。欠損を推測で埋めない（SoT原則）。citeturn4search1turn3search3turn1search2turn1search1



### 3.2.13 A06（主要言語数）の色塗りルール（追加）
- index.html の「基本情報（basicSummaryTable）」では、原則として *表示中の国* の値を相対比較して 3段階（planned/partial/nationwide）で色分けする。
- ただし **A06（主要言語数）** は値が 1/2/3… の *離散的な小さい整数* で同値（タイ）が多く、相対順位（3分位）方式だと **同じ値でも色が分かれる** ため、A06のみ **固定色** とする。
  - **A06 = 1** → `planned`（灰）
  - **A06 = 2** → `partial`（青）
  - **A06 ≥ 3** → `nationwide`（緑）
- この例外は *見た目の都合ではなく、同値＝同色（同順位）を保証するため* の運用ルールである。



## 3.3 国際ベンチマーク（digital_gov_benchmarks.csv）（追加）
制度項目（I01〜I11）や基本情報（A01〜C03）とは別枠で、各国のデジタル政府に関する国際ベンチマーク（DG01〜DG05）を表示する仕組みを追加した。

### 3.3.1 データのSoT
- SoT（唯一の正）は `data/digital_gov_benchmarks.csv`
- ベンチマークのラベルや表示順は `data/digital_gov_benchmark_defs.csv`（任意だが推奨）

### 3.3.2 CSVスキーマ（必須列）
`data/digital_gov_benchmarks.csv` の列（想定・運用）:
- `country_id` : 国ID（ISO3：JPN等）
- `benchmark_id` : ベンチマークID（DG01〜DG05）
- `value` : 表示値（1行目=主要値、2行目以降=補足）
- `year` : 対象年（例：2024）
- `version` : データセット版（`country_indicator.csv` と整合させる）
- `review_status` : `draft` / `reviewed` / `published`
- `change_note` : 変更メモ
- `source_url` : 出典URL（JSON配列文字列推奨。UIが解釈して「出典1/2…」を表示）

`data/digital_gov_benchmark_defs.csv` の列（推奨）:
- `benchmark_id` : DG01〜DG05
- `label` : 表示名
- `display_order` : 表示順

### 3.3.3 value の書式（UIがそのまま表示する前提）
- `value` は改行区切りで扱う。
  - 1行目：主要値（スコアや順位など）
  - 2行目以降：補足（例：Rank 12/193、カバレッジ注意、スコア定義）
- 欠損は推測で埋めない。対象外（未掲載）の場合は `N/A` を用いてよい。

### 3.3.4 DG01〜DG05 の定義（固定）
- **DG01 = UN EGDI**（E-Government Development Index）
  - 0〜1のスコア（EGDI）および必要に応じて順位を記録する。
- **DG02 = OECD DGI**（Digital Government Index）
  - 0〜1のCompositeスコア（DGI）および必要に応じて順位を記録する。
- **DG03 = Waseda World Digital Government Ranking**
  - 100点満点系のスコア（Score）および順位を記録する。
- **DG04 = IMD World Digital Competitiveness Ranking**
  - 1/69等の順位（Rank）を記録する（スコアが入手できない場合も多い）。
- **DG05 = World Bank GTMI**（GovTech Maturity Index）
  - GTMIのoverall score（0〜1）および必要に応じて分類（Group等）を記録する。

### 3.3.5 source_url の運用ルール（重要）
- 出典は必ず `source_url` に保存する。
- 推奨：JSON配列文字列（例：`["https://...","https://..."]`）
- 1つのDGについて、少なくとも以下のどちらか（または両方）を含めること：
  - 公式のデータ/データセンター（ダウンロード元）
  - 公式レポート（方法論・表の根拠）
- URLの順序は UI の「出典1 / 出典2 …」の表示順になる。

### 3.3.6 version / status の整合（重要）
- トップページの version セレクタは基本的に `country_indicator.csv` の version を基準に作られる。
- そのため `digital_gov_benchmarks.csv` 側も **同じ version** を持たないと表示がズレやすい。

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



### 5.4 国際ベンチマークのトグル（自動スクロール禁止）
- 「国際ベンチマークを表示」ボタンは、開閉によってページが自動スクロールしない（基本情報トグルと同じ挙動）。
- 目的：比較中に視点（スクロール位置）が突然移動して読みにくくなることを防ぐ。
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



---
## 6.1 detail翻訳に関する重要な注意（CSV設計とJS動作）

### 6.1.1 detailは「結合後の1文字列」として翻訳される
- `country_indicator.csv` / `country_basic.csv` の `value` は改行区切りで記述できる。
- UI側（`app.js`）では `splitValue()` により以下の処理が行われる：
  - 1行目 → `main`
  - **2行目以降 → すべて半角スペースで結合され、1つの `detail` 文字列になる**

したがって、`translations_ja.csv` で翻訳されるキーは、**個々の行ではなく「結合後の全文」**である。

### 6.1.2 translations_ja.csv の記述ルール（detail）
- `en` 列には、**結合後の detail 英文を完全一致**で記述すること。
- `ja` 列には、その全文に対応する日本語訳を記述すること。
- 個々の文や行の部分一致では翻訳されない（部分翻訳・推測翻訳は禁止）。

#### ✅ 正しい例
```
# country_indicator.csv（value）
Local
Sentence A.
Sentence B.

# app.js 内で detail になる文字列
"Sentence A. Sentence B."

# translations_ja.csv
Sentence A. Sentence B.,文A。文B。
```

#### ❌ 誤った例（翻訳されない）
```
Sentence A.,文A。
Sentence B.,文B。
```

### 6.1.3 設計思想（なぜこの仕様か）
- JavaScript は **CSV→UI変換のみ**という制約を守るため、
  detail の文分割・逐語翻訳・推測翻訳を行わない。
- どの英文がどの和訳に対応するかは **常にCSV側で明示的に定義**する。
- これにより、翻訳の再現性・差分管理・AI介入抑制を担保する。

---
## 7. フォルダ構成
```text
digital-id-db/
├─ assets/
├─ data/
│  ├─ countries.csv
│  ├─ indicators.csv
│  ├─ country_indicator.csv
│  ├─ country_basic.csv
│  ├─ digital_gov_benchmark_defs.csv
│  ├─ digital_gov_benchmarks.csv
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


### （追加）トラブルシュート：C03などが枠からはみ出る（多国表示時）
- 現象：index.html の基本情報サマリ（`#basicSummaryTable`）で、14か国など列数が多いと **C03等の文字がセル枠からはみ出す**。citeturn8search182
- 原因：列幅が狭い状況で、`flex` の子要素が縮まない（`min-width` 問題）＋長い英数字が折返しされない。citeturn8search182
- 対策：**CSSのみで修正**する（JS/HTMLは触らない）。`styles.css` に以下を追加する：
  - `#basicSummaryTable .basic-cell { min-width: 0; }`
  - `#basicSummaryTable td, th { overflow: hidden; }`
  - `.basic-main` は `text-overflow: ellipsis`（1行固定）
  - `.basic-sub` は `overflow-wrap: anywhere`（折返し）
  - 必要に応じて `#comparisonTable` 側にも同様の保険を入れる。citeturn8file183turn8search182


### （追加）トラブルシュート：国際ベンチマーク（benchmarksTable）が表示されない
- `index.html` に `#benchmarksTable` が存在するか確認する。
- `data/digital_gov_benchmarks.csv` が存在するか確認する（存在しない場合は『データなし』表示になる）。
- `digital_gov_benchmarks.csv` の `version` / `review_status` が、表示中のセレクタ値と一致しているか確認する。


---
## 13. I01（住民登録）指標の定義・分類方法（本チャットで確定）

### （追加）I02（住民情報ネットワーク）の位置づけ
I02 は「住民登録に基づく全国参照の有無」を評価する指標であり、デジタルID、認証基盤、API やデータ連携基盤そのものは評価対象に含まない。
（参考）I04（データ連携基盤）は、X-Road や MyInfo、India Stack のような相互運用・同意型データ連携の基盤を扱う。

### 13.1 I01（Resident / Population Registration）の定義
I01 は、**住所（居住地）の登録を必須要素**とする住民登録制度を指す。以下の要件をすべて満たす場合に I01 に該当すると判定する。

1. **通常居住者（usual residents）**を対象とすること
2. **個人の識別情報と住所（居住地）を登録**すること（※住所は必須）
3. **転居・出生・死亡等が制度として継続的に更新**されること
4. **選挙、税、社会保障、行政通知等の行政事務の基盤**として利用されること
5. **法令または政府公式説明により制度的に担保**されていること

> 注意：
> - 生体IDや番号付与のみで、住所登録を伴わない制度（例：純粋なID番号制度）は I01 に含めない。
> - 国勢調査のみを根拠とする人口把握は、I01 に該当しない。

---
### 13.2 I01 の分類基準（National / Local / Developing / None）

#### Local（自治体主体型）
以下を満たす場合、I01 は **Local** に分類する。

- 住民登録台帳（population register / resident register）の
  **作成・保管・更新の法的主体が自治体（地方政府）**である
- 自治体の台帳が **原簿（system of record）** である
- **全国照会・相互参照を可能にするITネットワークや中央的基盤の存在は妨げない**

> 重要：
> **「全国照会ネットワークが存在しても、原簿が自治体にある限り Local と分類する」**
> IT実装の中央集約度ではなく、**法的構造（誰が台帳を持つか）**を基準とする。

#### National（国家主体型）
- 国家機関が、**単一の住民登録簿を法的に保有・管理**する
- 自治体は入力窓口または委任機関にとどまる

#### Developing（制度途上型）
- 住所を含む住民登録制度の**法的枠組みは存在**するが、
  - 更新が不定期（例：国勢調査と連動）
  - 日常行政の基盤としての恒常運用が未確立
- 成熟した I01 とは区別し、**発展途上として分類**する

#### None
- 住所登録を中核とする住民登録制度が存在しない

---
### 13.3 I01 分類の代表例（横並び確認済み）

（UI表示方針）
- I01の定義文および分類（National/Local/None/Developing）の定義文は、`indicators.csv` に保持する（定義のSoT）。
- UI上の表示は、制度一覧の可読性を優先し、**凡例（Legend）の直下にまとめて表形式で表示する**方針とする（個別セル直下への長文表示は避ける）。



#### 13.3.1 分類別の代表国（全14か国）

| 分類 | 代表国（本データセット） | 補足 |
|---|---|---|
| National | DNK, EST, SWE, SGP | 国家が単一の住民登録簿（人口登録簿）を法的に保有・管理。自治体が更新窓口でも National とする。 |
| Local | JPN, DEU, KOR | 原簿（system of record）は自治体。全国照会・相互参照ネットワークがあっても Local とする。 |
| None | USA, AUS, CAN, NZL, GBR, FRA | 行政的な住民登録簿（人口登録簿）がない。人口は国勢調査・調査・推計で把握。 |
| Developing | IND | 住所を含む登録の法的枠組みはあるが、更新が不定期・国勢調査連動などで恒常運用が未確立。 |

#### Local の代表例
- **KOR（韓国）**：自治体（Si/Gun/Gu）が住民登録簿を保有。全国照会可能な中央IT基盤あり。
- **JPN（日本）**：市町村が住民基本台帳を保有。住基ネットにより全国相互参照可。
- **DEU（ドイツ）**：自治体（Meldebehörde）が人口登録簿を保有。全国単一原簿は存在しない。

#### Developing の対照例
- **IND（インド）**：NPR（National Population Register）は法的枠組みあり。
  2010作成・2015更新の実績はあるが、更新は国勢調査と連動し、恒常運用が未確立。

---
### 13.4 今後 I01 を更新・追加調査する際の指針（重要）

I01 の更新・新規国追加時には、以下を必ず確認・記録すること。

1. **住所登録が必須か**（制度説明・法令条文で明示されているか）
2. **更新の性質**
   - 日常的・恒常的更新か
   - 国勢調査等に依存した不定期更新か
3. **台帳の原簿主体**
   - 国家か
   - 自治体か
4. **分類が曖昧な場合の対応**
   - 無理に National / Local に断定しない
   - `Local（全国IT基盤あり）` 等、**注記付き分類を許容**
5. **説明責任の重視**
   - 分類根拠は `change_note` や README に文章で明示
   - 将来の制度変更に備え、更新履歴を追跡可能にする

> 本プロジェクトでは、
> **曖昧な制度を無理に単純化することよりも、正確に説明することを優先**する。

---

## 13.5 I01 定義・分類定義のUI表示方針（凡例直下・表形式）【追加】

### 13.5.1 目的
- I01（基礎住民登録）は制度概念・法的構造の説明量が多く、**比較表セル直下に長文を表示すると可読性が著しく低下**する。
- そのため、**概念の定義（項目定義・分類定義）を比較表から分離**し、**凡例（Legend）の直下に固定表示**する。
- 本表示は制度の「評価」ではなく、**制度概念の理解を補助する凡例拡張**として位置付ける。

### 13.5.2 表示場所（UI）
- 対象ページ：**トップページ（index.html）**
- 表示位置：
  - **凡例（Legend）カードの直後**
  - 結果としてページ下部側に表示される
- トグルや自動スクロールは行わず、**常時表示（固定表示）**とする。

### 13.5.3 表示内容と構造
- 表示は**表形式（table）**とし、次の2セクションで構成する。

#### セクションA：項目の定義
- 左列：**「基礎住民登録」**
  - 指標ID（I01）は表示しない
- 右列：`indicators.csv` の **`definition_ja`** をそのまま表示
- 表示言語：**日本語のみ**

#### セクションB：分類の定義
- 行：`National / Local / None / Developing`
- 左列：分類ラベル（日本語表記を含む）
- 右列：各分類の定義文
- 定義文は `indicators.csv` の **`classification_ja`** を使用し、
  - **1行＝1分類（改行区切り）**を前提とする。

### 13.5.4 データの Source of Truth（SoT）
- 定義文・分類定義文の SoT は **`data/indicators.csv`** とする。
- 使用カラム：
  - `definition_ja`
  - `classification_ja`
- JavaScript（`app.js`）は、
  - CSVを**解釈・要約・補完せず**、
  - **CSV → UI の機械的変換のみ**を行う。

### 13.5.5 JavaScript / CSS の役割分担
- JavaScript：
  - `indicators.csv` から I01 行を取得し、
  - 表（DOM）を生成して所定のコンテナに挿入するのみ。
  - 分類ロジックや条件分岐、国別例外は追加しない。
- CSS：
  - 表の余白、折返し、スマホ表示時の可読性調整のみを担当。
  - 見た目調整は **CSS のみ**で行う。

### 13.5.6 他指標（I02〜I11）への拡張方針
- 本方式は **I01 を先行実装**とする。
- 将来、I02〜I11 についても同様に概念定義を表示する場合は、
  - 同一コンテナ内に**指標ごとの表を追加**する。
  - 指標ID・順序は `indicators.csv` の `display_order` に従う。
- 既存の比較表セル直下に長文定義を表示する実装は行わない。

> 本プロジェクトでは、**比較表の可読性と概念定義の説明責任を分離**することを優先し、
> I01 のように概念的に重い指標については、凡例直下での表形式説明を標準とする。

---

## 指標設計に関する補足（重要）

### I02（住民情報ネットワーク）の解釈範囲

I02 は **「住民登録に基づく全国参照の有無」** を評価する指標であり、
デジタルID、認証基盤、API、データ連携基盤そのものは評価対象に含まない。

このため、以下のような仕組みは **I02 ではなく I04（相互運用・データ連携）** 側で扱う。

- X-Road（エストニア等）
- MyInfo（シンガポール）
- India Stack / DigiLocker / Account Aggregator（インド）

I02 はあくまで、**住民登録（人口登録）を基盤とした全国的な参照の「背骨」が制度として存在するか**
という観点に限定して評価する。

### 指標間の役割分担

- **I01**：住民登録（人口登録）制度そのものの有無・性質
- **I02**：住民登録に基づく全国参照・照会の可否
- **I03**：個人識別子（ID）の制度的位置づけと付与のされ方
- **I04**：API・データ交換・同意管理などの相互運用基盤

各指標は相互に関連するが、**評価対象は意図的に分離**されている。

---


---
## 指標 I03（個人識別子）の設計思想と実装上の注意点（2026-02 整理）

### 1. I03の位置づけ
I03（個人識別子）は、I01〜I11の中でも特に**各国の制度思想の違いが最も明確に表れる指標**である。ここで評価対象とするのは、

- 国家または公的制度により付与・管理される
- 個人を一意に識別する「番号そのもの」

であり、**デジタルIDアプリ、eID、認証方式、同意型データ連携基盤は含まない**。それらはI04（データ連携）やI08（認証基盤）の論点として明確に切り分けている。

### 2. 3値分類（Common / Restricted / None）の考え方
I03は従来の2値分類では各国の差異を十分に表現できないため、以下の3値モデルを採用した。

- **Common**：共通個人識別子が存在し、行政の複数分野で横断的に利用され、民間でも本人確認・取引等で広く用いられる（官民横断の共通キー）。
- **Restricted**：共通個人識別子は存在するが、用途が分野限定である、または民間利用が原則として抑制・禁止されており、万能IDとしては設計されていない。
- **None**：国家として単一の共通個人識別子（官民横断の共通番号）を制度上採用しておらず、識別子は分野別に分離されている。

この枠組みにより、例えば以下のような差異を同一指標内で説明可能になった。

- 日本：共通番号はあるが、法令により分野限定（Restricted：日本型）
- 韓国：分野横断的だが民間利用が強く制限（Restricted：民間抑制型）
- カナダ：全国単一番号は存在するが、用途限定・秘匿設計（Restricted）
- ドイツ・英国・オーストラリア：共通番号モデルを採らない（None）

### 3. detail（説明文）の設計方針
I03は分類ラベルだけでは誤解されやすいため、**全対象国について詳細な説明文（detail）を必須**とした。特にカナダとインドは制度が複雑であり、Restrictedの中でも性格が大きく異なるため、長めで丁寧な説明を付している。

### 4. サイト表示・データ構造上のトラブルと教訓
I03の整理過程で、以下の重要な実装上の注意点が明らかになった。

- `country_indicator.csv` の `value` は **必ず改行（
）で「分類ラベル」と「detail」を分離する必要がある**。
- 改行が欠落すると、detail が空文字として扱われ、翻訳（translations_ja.csv）が一切ヒットしなくなる。
- 翻訳は **detail文字列の完全一致**で行われるため、改行位置・句読点・スペースの差異でも表示崩れが発生する。

このため、I03では以下を厳格な運用ルールとした。

- value = 「1行目：分類ラベル」「2行目以降：detail」
- valueを変更した場合は、必ずtranslations_ja.csv側のenキーも同時に更新する

これらの教訓は、今後I04以降の指標設計・実装においても必ず踏襲すること。
