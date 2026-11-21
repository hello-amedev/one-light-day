/** 「このサイトについて」のページの文言。見出しと段落と箇条書きの形で置き、部品はその形を並べるだけにする */

export type AboutBlock =
  /** 段落 */
  | { kind: 'p'; text: string }
  /** 節の中の小見出し */
  | { kind: 'sub'; text: string }
  /** 箇条書き */
  | { kind: 'list'; items: string[] }
  /** 項目名と説明の組（操作のしかた、問い合わせ先） */
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
      heading: 'ボイジャー1号の位置を再現した、非公式のファンサイトです',
      blocks: [
        {
          kind: 'p',
          text: '1977年9月5日の打ち上げから今日まで、ボイジャー1号が実際にいた位置を再現し、その日の眺めを見られます。',
        },
        { kind: 'p', text: 'NASAとは関係のない非公式のサイトです。' },
        {
          kind: 'p',
          text: 'NASA、JPL（ジェット推進研究所）、USGS（米国地質調査所）、ESA（欧州宇宙機関）が、このサイトを推薦・承認しているわけではありません。',
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
              text: '画面下の軸のつまみをドラッグすると、打ち上げから今日までの好きな日へ移れます。金の刻みは名場面です。',
            },
            { term: '送りダイヤル', text: '「1日」「1時間」の左右の矢印で、時刻を戻し、進めます。' },
            { term: '再生', text: '押すと時間が進みます。「1秒＝1日」のように、進む速さを選べます。' },
            {
              term: '名場面',
              text: '時間軸の両脇の矢印で、前後の名場面へ移ります。移ると再生が止まり、短い説明が出ます。',
            },
            {
              term: '向くボタン',
              text: '「地球を向く」のように、見る向きをその天体へ合わせます。木星・土星・月のボタンは、近い時期だけ出ます。',
            },
            {
              term: '視点の切り替え',
              text: '「ボイジャーの視界」は探査機から見た眺め、「引きの眺め」は太陽系を外から見渡す眺めです。',
            },
            {
              term: '見回しと視野',
              text: 'ドラッグで見回します。ホイールか2本指のつまみで、視野を広げたり狭めたりできます。',
            },
          ],
        },
      ],
    },
    {
      heading: '再現していることと、見せ方として作っていること',
      blocks: [
        { kind: 'sub', text: '再現していること' },
        {
          kind: 'list',
          items: [
            'ボイジャー1号、惑星、月、衛星の位置（NASA JPL Horizonsのデータ。地球からの距離の差は最大15kmほど）',
            '星の位置・明るさの順・色と、天の川の位置',
            '天体の大きさ、自転軸の向き、自転の角度（国際天文学連合が定めた値）と、自転でつぶれた木星と土星の形',
            '昼と夜の向き（太陽の当たる方向）',
            '土星の環の幅と隙間、環に落ちる土星の影、土星に落ちる環の影',
            '土星の環の明るさ。太陽の当たる側から見ると濃い部分が明るく、裏側から見ると暗くなります。ボイジャー1号が裏側から撮った写真と同じ並びです',
            '地球、月、木星、イオの表面。ペイル・ブルー・ドット（1990年にボイジャー1号が撮った地球の写真）は実際の写真です',
          ],
        },
        { kind: 'sub', text: '見せ方として作っていること' },
        {
          kind: 'list',
          items: [
            '視界の向き。自由に見回せますが、当時カメラが実際に向いていた方向ではありません',
            '星と天体の明るさ。太陽が視界にあっても星と天の川が見えます。遠い惑星の点は、実際より明るく描いています',
            '太陽の光。にじみと十字の光は見せ方で、実際のカメラの写り方ではありません',
            '地球の雲は2001年の観測の合成で、打ち上げの日の雲ではありません。縁の青い光と夜の側のごく薄い明るさは演出で、街の灯りは描いていません',
            '木星の表面は2000年にカッシーニ（探査機）が撮った姿で、1979年の姿ではありません。大赤斑の位置も実際と合いません',
            'エウロパ・ガニメデ・カリストは、元の地図が白黒のため、それぞれの平均的な色を乗せています',
            '土星の縞と環の濃淡・色、タイタンのもやは、公表されている寸法をもとに、プログラムで描いた絵です',
            '太陽圏（太陽の風が届く範囲）の境は、形が分かっていないので描いていません',
            '木星と土星の衛星は、通過の前後3日だけ描きます。ほかの時期と、ほかの衛星は描いていません',
          ],
        },
      ],
    },
    {
      heading: '位置・星・画像・フォントの出典',
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
          ],
        },
      ],
    },
    {
      heading: '問い合わせ先',
      blocks: [
        {
          kind: 'terms',
          items: [
            { term: '作者', text: 'ame_dev' },
            { term: 'メール', text: 'amemitai@gmail.com' },
          ],
        },
        { kind: 'p', text: '不具合や誤りは、こちらへお知らせください。' },
      ],
    },
  ] as AboutSection[],
};
