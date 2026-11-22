/** 「このサイトについて」のページの文言。見出しと段落と箇条書きの形で置き、部品はその形を並べるだけにする */

export type AboutBlock =
  /** 段落 */
  | { kind: 'p'; text: string }
  /** 節の中の小見出し */
  | { kind: 'sub'; text: string }
  /** 箇条書き */
  | { kind: 'list'; items: string[] }
  /** 項目名と説明の組（操作のしかた、再現と演出の区別、問い合わせ先） */
  | { kind: 'terms'; items: { term: string; text: string }[] }
  /** 出典。use は何に使ったか、name は出典の名前（原文のまま）、license は条件の名前（href があればリンクにする） */
  | { kind: 'credits'; items: { use: string; name: string; license?: string; href?: string; note?: string }[] };

export interface AboutSection {
  heading: string;
  blocks: AboutBlock[];
}

export const about = {
  /** 入口のボタン */
  entry: 'このサイトについて',
  /** パネルの上端の小さな題字（欧文の字体で出す） */
  kicker: 'ABOUT THIS SITE',
  /** パネルの名前（読み上げ） */
  title: 'このサイトについて',
  close: '閉じる',
  sections: [
    {
      heading: 'ボイジャー1号の旅路を再現した非公式のファンサイト',
      blocks: [
        {
          kind: 'p',
          text: 'ボイジャー1号は2026年11月18日に、人工物として初めて、地球から光の速さで1日かかる距離（約259億km）に達しました。1977年9月5日の打ち上げから17,971日後のことです。',
        },
        {
          kind: 'p',
          text: 'このサイトでは、打ち上げから今日までにボイジャー1号が辿った旅路を、NASA JPLのデータで再現しています。好きな日付へ移動すると、その日のボイジャー1号の位置から星や惑星がどう見えたかを確認できます。',
        },
        {
          kind: 'p',
          text: '個人制作の非公式サイトで、NASAとは無関係です。NASA、JPL（ジェット推進研究所）、USGS（米国地質調査所）、ESA（欧州宇宙機関）は、このサイトを推薦・承認していません。',
        },
      ],
    },
    {
      heading: '操作のしかた',
      blocks: [
        {
          kind: 'terms',
          items: [
            {
              term: '時系列',
              text: '画面下の時系列のつまみをドラッグすると、打ち上げから今日までの好きな日へ移動できます。',
            },
            {
              term: '日付の入力',
              text: '右上の日付を直接入力して移動することもできます。',
            },
            {
              term: '再生と送り',
              text: '再生ボタンを押すことで、ボイジャーの軌跡を自動再生します。速さのボタン（最初は「1秒＝1日」）を押すたびに、1秒で進む時間が1時間・1日・1か月・1年の順に切り替わります。左右の矢印では、1日ずつ（速さが1時間の時は1時間ずつ）戻したり進めたりできます。',
            },
            {
              term: 'トピック',
              text: '時系列の両脇の矢印で、前後のトピックへ移動します。',
            },
            {
              term: '視点の向き',
              text: '左下のボタンで天体を選ぶと、その天体が画面の中央に来るように向きが変わります。地球、太陽、進む先（ボイジャー1号が進んでいく方向）を選択できます。木星、土星、月、衛星は、ボイジャー1号の近くにある時だけ選択可能です。',
            },
            {
              term: '視点の切り替え',
              text: '左上の3つのボタンで視点を切り替えます。「ボイジャー視点」はボイジャー1号の位置から見た視界を、「全体を俯瞰」は太陽系を外から見渡す視界を、「ボイジャー本体」は機体を表示します。',
            },
            {
              term: '見回す・拡大する',
              text: '画面をドラッグすると視界を回転することができます。ボイジャー視点では、ホイールか2本指のつまみで約143倍まで拡大でき、右下に倍率が表示されます。最も拡大した時の視野は、ボイジャー1号の狭角カメラ（望遠のカメラ）と同じ約0.4度です。',
            },
            {
              term: 'メニュー',
              text: '右上のボタンで、天体の名前・目印、惑星の軌道、トピックの表示・非表示を切り替えられます。「星空だけを表示」を選ぶと数字と操作が非表示になり、画面をクリック・タップすると戻ります。',
            },
            {
              term: '最初から',
              text: '左上の「VOYAGER 1」を押すと、打ち上げの瞬間から自動再生し直します。',
            },
          ],
        },
      ],
    },
    {
      heading: 'データで再現した箇所と、演出として制作した箇所',
      blocks: [
        { kind: 'sub', text: 'データで再現した箇所' },
        {
          kind: 'terms',
          items: [
            {
              term: '位置',
              text: 'ボイジャー1号、惑星、月、衛星の位置は、NASA JPL Horizonsのデータです。サイトに収めるためにデータを間引いているため、地球からの距離はHorizonsの値と最大15kmほど違います。',
            },
            {
              term: '星と天の川',
              text: '星の位置、明るさの順、色と、天の川の位置は、観測のデータどおりです。',
            },
            {
              term: '天体の大きさと自転',
              text: '大きさ、自転軸の向き、自転の角度は、国際天文学連合が定めた値です。木星と土星は、自転でつぶれた形も再現しています。',
            },
            {
              term: '昼と夜',
              text: '天体の昼の側と夜の側は、太陽の方向どおりです。',
            },
            {
              term: '土星の環',
              text: '環の幅と隙間、環に落ちる土星の影、土星に落ちる環の影は、実際のサイズと位置どおりです。環の濃い部分は、太陽の当たる側から見ると明るく、裏側から見ると暗くなります。ボイジャー1号が環を裏側から撮った写真と同じ明暗です。',
            },
            {
              term: '表面の画像',
              text: '地球、月、木星、イオの表面は、探査機や人工衛星が撮った実際の画像です。ただし撮影の時期は、ボイジャー1号が通った時とは違います（下の「地球」「木星」）。',
            },
            {
              term: '写真',
              text: '文と一緒に出る地球と月の写真（1977年）とペイル・ブルー・ドット（1990年）は、ボイジャー1号が撮った実際の写真です。地球と月の写真は、月も見えるようにNASAが月を3倍明るくした版です。',
            },
          ],
        },
        { kind: 'sub', text: '演出として制作した箇所' },
        {
          kind: 'terms',
          items: [
            {
              term: '視界の向き',
              text: '自由に見回せるようにしてあり、当時カメラが実際に向いていた方向とは異なります。',
            },
            {
              term: '星と天体の明るさ',
              text: '太陽が視界にあっても、星と天の川が見えるようにしています。遠い惑星の点も、実際より明るく描いています。',
            },
            {
              term: '太陽の光',
              text: '太陽のまわりのにじみと十字の光は演出で、実際のカメラの写り方とは異なります。',
            },
            {
              term: '地球',
              text: '雲は2001年の観測をもとにした画像で、当日の雲の位置ではありません。夜の側はその日の月の向きと満ち欠けで照らしていますが、雲が見えるように実際より明るくしています。',
            },
            {
              term: '木星',
              text: '表面は2000年12月にカッシーニ（土星へ向かう途中の探査機）が撮った姿で、1979年の姿ではありません。そのため大赤斑の位置も実際とは異なります。',
            },
            {
              term: 'エウロパ、ガニメデ、カリスト',
              text: '元のデータが白黒のため、それぞれの平均的な色で表示しています。',
            },
            {
              term: '土星とタイタン',
              text: '土星の縞、環の細かな濃淡と色、タイタンのもやは、画像を使わずにプログラムで描いています。環の寸法は公表されている値を使っています。',
            },
            {
              term: '太陽圏の境',
              text: '太陽圏（太陽風が届く範囲）の境は、形がまだよく分かっていないため描いていません。',
            },
            {
              term: '衛星',
              text: '木星と土星の衛星は、最接近の前後3日だけ描いています。それ以外の時期と、イオ、エウロパ、ガニメデ、カリスト、タイタン以外の衛星は描いていません。',
            },
            {
              term: 'ボイジャー本体の向き',
              text: 'アンテナは地球に向けていますが、アンテナの向きを軸にした回転の角度は、実際の記録どおりではありません。',
            },
          ],
        },
      ],
    },
    {
      heading: 'データ・画像・フォント・プログラムの出典',
      blocks: [
        {
          kind: 'credits',
          items: [
            { use: '位置', name: 'NASA JPL Horizons' },
            {
              use: '星',
              name: 'HYG Database v4.4（David Nash）',
              license: 'CC BY-SA 4.0',
              href: 'https://creativecommons.org/licenses/by-sa/4.0/deed.ja',
              note: '8等までの星を選び、座標を変換して並べ替えています。加工したデータも同じCC BY-SA 4.0で提供しています。',
            },
            {
              use: '天の川',
              name: 'NASA/Goddard Space Flight Center Scientific Visualization Studio、Gaia DR2: ESA/Gaia/DPAC',
              license: 'CC BY-NC 3.0 IGO',
              href: 'https://creativecommons.org/licenses/by-nc/3.0/igo/',
              note: '明るさを調整しています。',
            },
            {
              use: '地球',
              name: 'NASA Goddard Space Flight Center（image by Reto Stöckli, enhancements by Robert Simmon）',
            },
            { use: '月', name: "NASA's Scientific Visualization Studio" },
            { use: '木星', name: 'NASA/JPL/Space Science Institute（Cassini, December 2000）' },
            {
              use: 'イオ・エウロパ・ガニメデ・カリスト',
              name: 'U.S. Geological Survey（Galileo SSI and Voyager images）',
            },
            { use: '地球と月の写真', name: 'NASA/JPL（PIA00013）' },
            { use: 'ペイル・ブルー・ドットの写真', name: 'NASA/JPL-Caltech（2020年の再処理版）' },
            { use: 'ボイジャー1号の3Dモデル', name: 'NASA 3D Resources（Voyager Probe (B)）' },
            {
              use: 'フォント',
              name: 'Michroma、Share Tech Mono、Zen Kaku Gothic New',
              license: 'SIL Open Font License 1.1',
              href: 'https://openfontlicense.org/',
            },
            {
              use: '3Dの表示',
              name: 'three.js',
              license: 'MIT License',
              href: 'https://opensource.org/license/mit',
            },
            {
              use: '3Dモデルの展開',
              name: 'Draco（Google）',
              license: 'Apache License 2.0',
              href: 'https://www.apache.org/licenses/LICENSE-2.0',
            },
          ],
        },
      ],
    },
    {
      heading: '問い合わせ先',
      blocks: [
        { kind: 'p', text: '表示の不具合や事実の誤りに気付いた時は、メールでお知らせください。' },
        {
          kind: 'terms',
          items: [
            { term: '作者', text: 'ame_dev' },
            { term: 'メール', text: 'amemitai@gmail.com' },
          ],
        },
      ],
    },
  ] as AboutSection[],
};
