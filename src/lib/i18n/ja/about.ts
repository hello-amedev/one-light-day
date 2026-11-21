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
      heading: 'ボイジャー1号の位置を再現した非公式のファンサイト',
      blocks: [
        {
          kind: 'p',
          text: 'ボイジャー1号は2026年11月18日に、人工物として初めて、地球から光で1日かかる距離（約259億km）に達しました。1977年9月5日の打ち上げから17,971日後のことで、サイト名の「17,971 EARTH DAYS」はこの日数です。',
        },
        {
          kind: 'p',
          text: 'このサイトでは、打ち上げから今日までにボイジャー1号が実際にいた位置を、NASA JPLのデータで再現しています。好きな日付へ移ると、その日のボイジャー1号の位置から星や惑星がどう見えたかを確かめられます。',
        },
        {
          kind: 'p',
          text: '個人が作った非公式のサイトで、NASAとは関係がありません。NASA、JPL（ジェット推進研究所）、USGS（米国地質調査所）、ESA（欧州宇宙機関）は、このサイトを推薦・承認していません。',
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
              term: '時間軸',
              text: '画面下の時間軸のつまみをドラッグすると、打ち上げから今日までの好きな日へ移れます。長い金色の刻みは名場面、短い刻みは木星の環の発見などの出来事で、押すとその日へ移ります。',
            },
            {
              term: '再生と送り',
              text: '再生のボタンで時間が進みます。隣の速さのボタン（最初は「1秒＝1日」）を押すたびに、1秒で進む時間が1時間・1日・1か月・1年の順に切り替わります。左右の矢印では、1日ずつ（速さが1時間の時は1時間ずつ）戻したり進めたりできます。',
            },
            {
              term: '名場面',
              text: '時間軸の両脇の矢印で、前後の名場面へ移ります。移ると再生が止まり、その場面の短い説明が出ます。',
            },
            {
              term: '向く',
              text: '左下のボタンで天体を選ぶと、その天体が画面の中央に来るように向きが変わります。地球、太陽、進む先（ボイジャー1号が進んでいく方向）はいつでも選べます。木星、土星、月、衛星は、ボイジャー1号の近くにある時期だけ選べます。',
            },
            {
              term: '視点の切り替え',
              text: '左上の3つのボタンで眺めを切り替えます。「ボイジャーの視界」はボイジャー1号の位置から見た眺め、「引きの眺め」は太陽系を外から見渡す眺め、「ボイジャー本体」は機体をそばから見る眺めです。',
            },
            {
              term: '見回しと拡大',
              text: '画面をドラッグすると見回せます。ボイジャーの視界では、ホイールか2本指のつまみで約143倍まで拡大でき、右下に倍率が出ます。いちばん拡大した時の視野は、ボイジャー1号の狭角カメラ（望遠のカメラ）と同じ約0.4度です。',
            },
            {
              term: 'メニュー',
              text: '右上のボタンで、天体の名前と目印、惑星の軌道、名場面と出来事の文を、表示するかどうか切り替えられます。「星空だけを表示」を選ぶと数字と操作が隠れ、画面を押すと戻ります。',
            },
          ],
        },
      ],
    },
    {
      heading: 'データで再現した部分と、見せ方として作った部分',
      blocks: [
        { kind: 'sub', text: 'データで再現した部分' },
        {
          kind: 'terms',
          items: [
            {
              term: '位置',
              text: 'ボイジャー1号、惑星、月、衛星の位置は、NASA JPL Horizonsのデータです。サイトに収めるためにデータを間引いているので、地球からの距離はHorizonsの値と最大15kmほど違います。',
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
              text: '環の幅と隙間、環に落ちる土星の影、土星に落ちる環の影は、実際の寸法と位置どおりです。環の濃い部分は、太陽の当たる側から見ると明るく、裏側から見ると暗くなります。ボイジャー1号が環を裏側から撮った写真と同じ明暗です。',
            },
            {
              term: '表面の画像',
              text: '地球、月、木星、イオの表面は、探査機や人工衛星が撮った実際の画像です。ただし撮影の時期は、ボイジャー1号が通った時とは違います（下の「地球」「木星」）。',
            },
            {
              term: 'ペイル・ブルー・ドット',
              text: '名場面「ペイル・ブルー・ドット」で地球を向いた時に出る写真は、1990年にボイジャー1号が撮った実際の写真です。',
            },
          ],
        },
        { kind: 'sub', text: '見せ方として作った部分' },
        {
          kind: 'terms',
          items: [
            {
              term: '視界の向き',
              text: '自由に見回せるようにしてあり、当時カメラが実際に向いていた方向とは違います。',
            },
            {
              term: '星と天体の明るさ',
              text: '太陽が視界にあっても、星と天の川が見えるようにしています。遠い惑星の点も、実際より明るく描いています。',
            },
            {
              term: '太陽の光',
              text: '太陽のまわりのにじみと十字の光は見せ方で、実際のカメラの写り方とは違います。',
            },
            {
              term: '地球',
              text: '雲は2001年の観測をもとにした画像で、その日の雲ではありません。縁の青い光と、夜の側のごく薄い明るさは演出です。街の灯りは描いていません。',
            },
            {
              term: '木星',
              text: '表面は2000年12月にカッシーニ（土星へ向かう途中の探査機）が撮った姿で、1979年の姿ではありません。大赤斑の位置も実際とは合いません。',
            },
            {
              term: 'エウロパ、ガニメデ、カリスト',
              text: '元の地図が白黒のため、それぞれの平均的な色を付けています。',
            },
            {
              term: '土星とタイタン',
              text: '土星の縞、環の細かな濃淡と色、タイタンのもやは、画像を使わずにプログラムで描いた絵です。環の寸法は公表されている値を使っています。',
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
