// 天体の球に貼るテクスチャと背景の天の川を、公式の配布元から取得し、Web 用に加工して public/textures/ に置く道具。
// 使い方: npm run data:textures   (Node 26。package.json に依存は足さない)
// 流れ: 取得(キャッシュが無い時だけ。curl -C - で途中から再開)→ SHA-256 の照合 → EXR の展開 → 加工(process.py)→ manifest.json
// 外部の実行ファイルに頼る: curl(取得)と python3 + Pillow + numpy(加工)。この Mac に入っているものを前提にしている。
// 出どころ・利用条件・向きは docs/assets/textures.md を参照。
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, statSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EXRLoader } from '../../node_modules/three/examples/jsm/loaders/EXRLoader.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const CACHE = join(ROOT, 'tools/textures/cache');
const OUT = join(ROOT, 'public/textures');

const ASSETS = 'https://assets.science.nasa.gov/content/dam/science/esd/eo/content-feature/bluemarble/images';
const USGS = 'https://planetarymaps.usgs.gov/mosaic';

// 取得するファイル。sha256 は 2026-11-21 に取得したものの値で、壊れた取得や配布元での差し替えに気づくために照合する
const FILES = [
  { file: 'earth_ocean_ice_cloud_2048.jpg', url: `${ASSETS}/land_ocean_ice_cloud_2048.jpg`, sha256: 'fb67ac030214c1891994c8f976e7f6c9cd5b0f21586aba8567250781a4fe708e' },
  { file: 'lroc_color_poles_4k.tif', url: 'https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_poles_4k.tif', sha256: '918649a7f8ed2f1329b2cd95bb0d25483befdcb60ae1a66db681a637cc21344f' },
  { file: 'jupiter_PIA07782.jpg', url: 'https://d2pn8kiwq2w21t.cloudfront.net/original_images/jpegPIA07782.jpg', sha256: '6b835ddd8036ea9efd25def04f75aa60b69b096025a37eeae5e9b6978e0a2281' },
  { file: 'Io_GalileoSSI-Voyager_Global_Mosaic_ClrMerge_1km.tif', url: `${USGS}/Io_GalileoSSI-Voyager_Global_Mosaic_ClrMerge_1km.tif`, sha256: '135f88cb645bfdb4e045b380971ab2ba14e230590c96c9c86cfe7310fda881ac' },
  { file: 'Europa_Voyager_GalileoSSI_global_mosaic_500m.tif', url: `${USGS}/Europa_Voyager_GalileoSSI_global_mosaic_500m.tif`, sha256: 'a323f0c9ccb47d5af9902ea8297fe81f9a9708795645b80801f103c3f7c9a624' },
  { file: 'Ganymede_Voyager_GalileoSSI_global_mosaic_1km.tif', url: `${USGS}/Ganymede_Voyager_GalileoSSI_global_mosaic_1km.tif`, sha256: 'c2c8d9506b8cf8f7a0a90d823d9052e91c8d9885cf7267fdce8de8216f4df888' },
  { file: 'Callisto_Voyager_GalileoSSI_global_mosaic_1km.tif', url: `${USGS}/Callisto_Voyager_GalileoSSI_global_mosaic_1km.tif`, sha256: 'e1f0bd2e0e05de605d067d6b5f5ededddaf31ca6c064562a1ca770f15a7dbaa3' },
  { file: 'milkyway_2020_4k.exr', url: 'https://svs.gsfc.nasa.gov/vis/a000000/a004800/a004851/milkyway_2020_4k.exr', sha256: '2eb802d6e68d170b410f766c7fec07f7518619f6b6708fdc81e9302d93e74fdb' },
  { file: 'PIA23645.jpg', url: 'https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia23/pia23645/PIA23645.jpg', sha256: 'b783a29a134377ba41ffe8f644fd1f066b591b77b316daac3d32b315cc265c34' },
  { file: 'PIA00013.jpg', url: 'https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia00/pia00013/PIA00013.jpg', sha256: '62894fa8549c3ff1522c7802b78a41f1a8a16d682de201da9ada0a7851cd2b16' },
];

// manifest に書く、天体ごとの向きと出典。向きは docs/assets/textures.md の「向きの確認」で画像の中身から確かめた値
const BODIES = {
  earth: {
    lon0: -180, lonEast: true,
    credit: 'NASA Goddard Space Flight Center (image by Reto Stöckli, enhancements by Robert Simmon)',
    source: 'https://science.nasa.gov/earth/earth-observatory/the-blue-marble-true-color-global-imagery-at-1km-resolution/',
    note: 'Blue Marble(2002年版。2001年の観測の合成。陸・海・氷・雲)の 2048 画素版。8192 画素版の配布元が応答しないため元のまま使い、拡大していない。極の行と継ぎ目をなじませた',
  },
  moon: {
    lon0: -180, lonEast: true,
    credit: "NASA's Scientific Visualization Studio (CGI Moon Kit, LRO)",
    source: 'https://svs.gsfc.nasa.gov/4720/',
    note: '2019年版の色の地図(4096×2048)を縮小。極の行と継ぎ目をなじませた',
  },
  jupiter: {
    lon0: 0, lonEast: true,
    credit: 'NASA/JPL/Space Science Institute (Cassini, December 2000)',
    source: 'https://www.jpl.nasa.gov/images/pia07782-cassinis-best-maps-of-jupiter-cylindrical-map/',
    note: '3601×1801 を 3600×1800 に揃えた。経度の基準は配布ページに無く、左端を 0 とした仮の値(木星には固定の地形が無い)。右が東であることは、大赤斑の後ろに伸びる乱れが左(西)側にあることで確認。極の行と継ぎ目をなじませた',
  },
  io: {
    lon0: -180, lonEast: true,
    credit: 'U.S. Geological Survey (Galileo SSI and Voyager images)',
    source: 'https://astrogeology.usgs.gov/search/map/io_galileo_ssi_voyager_color_merged_global_mosaic_1km',
    note: 'Galileo と Voyager の色つき全球モザイクを縮小。画像のない極などの穴は、周りの色でなだらかに埋めた。極の行と継ぎ目をなじませた',
  },
  europa: {
    lon0: 0, lonEast: true,
    credit: 'U.S. Geological Survey (Voyager and Galileo SSI images)',
    source: 'https://astrogeology.usgs.gov/search/map/europa_voyager_galileo_ssi_global_mosaic_500m',
    note: '元の地図は白黒。明るさは元のまま、黄みのある白の色を乗せた(演出)。穴は周りの明るさでなだらかに埋めた。極の行と継ぎ目をなじませた',
  },
  ganymede: {
    lon0: 0, lonEast: true,
    credit: 'U.S. Geological Survey (Voyager and Galileo SSI images)',
    source: 'https://astrogeology.usgs.gov/search/map/ganymede_voyager_galileo_ssi_global_mosaic_1km',
    note: '元の地図は白黒。明るさは元のまま、灰がかった褐色の色を乗せた(演出)。穴は周りの明るさでなだらかに埋めた。極の行と継ぎ目をなじませた',
  },
  callisto: {
    lon0: 0, lonEast: true,
    credit: 'U.S. Geological Survey (Voyager and Galileo SSI images)',
    source: 'https://astrogeology.usgs.gov/search/map/callisto_voyager_galileo_ssi_global_mosaic_1km',
    note: '元の地図は白黒。明るさは元のまま、暗い褐色の色を乗せた(演出)。穴は周りの明るさでなだらかに埋めた。極の行と継ぎ目をなじませた',
  },
  milkyway: {
    ra0: 180, raIncreasesRight: false, decUp: true,
    credit: 'NASA/Goddard Space Flight Center Scientific Visualization Studio; Gaia DR2: ESA/Gaia/DPAC',
    source: 'https://svs.gsfc.nasa.gov/4851/',
    note: '天球座標(赤道座標 J2000)の天の川。左端が赤経 180度(12h)、中央が 0h で、赤経は右へ向かって減る。上が天の北。露出とガンマで淡く調整し、8bit に落とした(調整値は docs/assets/textures.md)。Gaia のデータは CC BY-NC 3.0 IGO(非営利に限る)',
  },
};

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function fetchFile(f) {
  const dest = join(CACHE, f.file);
  if (!existsSync(dest) || sha256(dest) !== f.sha256) {
    console.log('取得: ' + f.url);
    // 大きいファイルは途中から再開できるよう curl -C - を使う。失敗したらやり直す(直列)
    let ok = false;
    for (let i = 0; i < 4 && !ok; i++) {
      const r = spawnSync('curl', ['-sSL', '-C', '-', '--fail', '--connect-timeout', '30', '-o', dest, f.url], { stdio: 'inherit' });
      ok = r.status === 0 || (r.status === 33 && existsSync(dest)); // 33: すでに全部ある
      if (!ok) console.log(`  やり直し(${i + 1})`);
    }
    if (!ok) throw new Error('取得に失敗: ' + f.url);
  }
  const sha = sha256(dest);
  if (sha !== f.sha256) {
    throw new Error(`SHA-256 が一致しません: ${f.file}\n  期待 ${f.sha256}\n  実際 ${sha}\n配布元で差し替わった可能性があります。利用条件とクレジットを読み直し、問題なければ FILES の値を更新してください。壊れた取得なら ${dest} を消して再実行してください`);
  }
}

// EXR(浮動小数点の画像)を、半精度のまま生のバイト列にして保存する(加工側の python は EXR を読めないため)
function dumpExr() {
  const raw = join(CACHE, 'milkyway_2020_4k.rgba16f.raw');
  const src = join(CACHE, 'milkyway_2020_4k.exr');
  if (existsSync(raw) && statSync(raw).mtimeMs >= statSync(src).mtimeMs) return;
  const b = readFileSync(src);
  const r = new EXRLoader().parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
  if (r.width !== 4096 || r.height !== 2048 || !(r.data instanceof Uint16Array) || r.data.length !== 4096 * 2048 * 4) {
    throw new Error(`EXR の形が想定と違います: ${r.width}x${r.height}`);
  }
  writeFileSync(raw, Buffer.from(r.data.buffer, r.data.byteOffset, r.data.byteLength));
}

mkdirSync(CACHE, { recursive: true });
mkdirSync(OUT, { recursive: true });
for (const f of FILES) fetchFile(f);
dumpExr();

const py = spawnSync('python3', [join(ROOT, 'tools/textures/process.py'), CACHE, OUT], { stdio: 'inherit' });
if (py.status !== 0) throw new Error('加工(process.py)に失敗しました。python3 と Pillow・numpy が入っているか確認してください');

// 写真は、配布されている版が 5230×5175 画素ある(元の 666×659 を NASA が拡大したもの)。
// そのまま表示するとスマホでは展開に 100MB 以上のメモリを使うので、長辺 1600 画素に縮めて置く(色や明るさは変えない)
const pbd = spawnSync('sips', ['-Z', '1600', '-s', 'format', 'jpeg', '-s', 'formatOptions', '90', join(CACHE, 'PIA23645.jpg'), '--out', join(OUT, 'pbd.jpg')], { stdio: 'ignore' });
if (pbd.status !== 0) throw new Error('failed to resize the Pale Blue Dot photo with sips');

// 地球と月の写真(PIA00013)は、配布されている版が 565×790 画素と小さいので、そのまま置く(名場面の文と一緒に浮かばせる)
copyFileSync(join(CACHE, 'PIA00013.jpg'), join(OUT, 'earthmoon.jpg'));

const dims = JSON.parse(readFileSync(join(CACHE, 'dims.json'), 'utf8'));
const manifest = {};
for (const [name, meta] of Object.entries(BODIES)) {
  manifest[name] = { hi: { file: `${name}.hi.jpg`, ...dims[`${name}.hi.jpg`] }, lo: { file: `${name}.lo.jpg`, ...dims[`${name}.lo.jpg`] }, ...meta };
}
manifest.pbd = {
  file: 'pbd.jpg', width: 1600, height: 1583, bytes: statSync(join(OUT, 'pbd.jpg')).size,
  credit: 'NASA/JPL-Caltech',
  source: 'https://science.nasa.gov/photojournal/pale-blue-dot-revisited/',
  note: 'PIA23645(2020年の再処理版)。配布されている 5230×5175 画素の版を、長辺 1600 画素に縮めただけ。地図ではなく写真',
};
manifest.earthmoon = {
  file: 'earthmoon.jpg', width: 565, height: 790, bytes: statSync(join(OUT, 'earthmoon.jpg')).size,
  credit: 'NASA/JPL',
  source: 'https://science.nasa.gov/photojournal/crescent-earth-and-moon/',
  note: 'PIA00013(1977-09-18 撮影)。3 枚の色の画像の合成で、月は 3 倍明るくしてある(NASA の処理)。配布されている版のまま',
};
writeFileSync(join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

const total = readdirSync(OUT).filter((n) => n.endsWith('.jpg')).reduce((s, n) => s + statSync(join(OUT, n)).size, 0);
console.log(`完了: public/textures/ の画像の合計 ${(total / 1e6).toFixed(2)} MB`);
