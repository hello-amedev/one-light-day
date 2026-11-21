#!/usr/bin/env python3
# テクスチャの加工(縮小・色つけ・天の川の明るさ調整・JPEG 化)。build.mjs から呼ばれる。
# 前提: python3 + Pillow + numpy(この Mac に入っているもの)。Node 側に画像処理の依存を入れないため、加工はこちらに寄せている。
# 使い方: python3 process.py <cache ディレクトリ> <出力ディレクトリ>
# 出力: <出力>/<名前>.hi.jpg / .lo.jpg と、<cache>/dims.json(各ファイルの画素数。build.mjs が manifest に写す)
import json
import os
import sys

import numpy as np
from PIL import Image

Image.MAX_IMAGE_PIXELS = None  # 元の地図は 1 億画素に近い。自分で取得した公式ファイルだけを読む

CACHE, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
dims = {}

# ---- 道具 ----------------------------------------------------------------

def load(name):
    """画像を float32 の 0..1(H,W,C)で読む"""
    im = Image.open(os.path.join(CACHE, name))
    im = im.convert('L' if im.mode in ('L', 'P') else 'RGB')
    a = np.asarray(im, dtype=np.float32) / 255.0
    return a[..., None] if a.ndim == 2 else a


def resize(a, w, h):
    """float 配列を Lanczos で縮める(チャンネルごと。8bit に丸めずに処理する)"""
    chans = [np.asarray(Image.fromarray(np.ascontiguousarray(a[..., c])).resize((w, h), Image.LANCZOS)) for c in range(a.shape[2])]
    return np.clip(np.stack(chans, axis=2), 0.0, None)


def resize_masked(a, valid, w, h):
    """データの無い画素(黒く抜けた所)を数えずに縮める。端が暗く縁取られるのを防ぐ"""
    v = valid.astype(np.float32)[..., None]
    num = resize(a * v, w, h)
    den = resize(v, w, h)
    out = num / np.maximum(den, 1e-6)
    return out, den[..., 0]


def inpaint(a, hole):
    """穴(hole が True)を、周りの値のなだらかな補間で埋める(粗い解像度へ降ろして戻す)。
    極や撮影の隙間が黒いまま球に貼られると、真っ黒な穴に見えるため"""
    if not hole.any():
        return a
    levels = []
    cur, m = a.copy(), (~hole).astype(np.float32)
    while min(cur.shape[:2]) > 4:
        w = m[..., None]
        levels.append((cur, m))
        h2, w2 = cur.shape[0] // 2, cur.shape[1] // 2
        num = resize(cur * w, w2, h2)
        den = resize(w, w2, h2)[..., 0]
        cur = num / np.maximum(den[..., None], 1e-6)
        m = np.clip(den * 2, 0, 1)
        if (m > 0.99).all():
            break
    # 一番粗い所でまだ穴が残るなら、全体の平均で埋める
    cur = np.where((m > 1e-3)[..., None], cur, (cur * m[..., None]).sum() / max(m.sum(), 1e-6))
    for (fine, fm) in reversed(levels):
        up = resize(cur, fine.shape[1], fine.shape[0])
        cur = fine * fm[..., None] + up * (1 - fm[..., None])
    return cur


def fix_poles(a, frac=0.02):
    """上端・下端の数%の行を、その行の平均色へなじませる。正距円筒は極で 1 点に縮むので、
    横にのびた筋が球の極で渦のように集まって見えるのを抑える"""
    h = a.shape[0]
    n = max(2, int(h * frac))
    out = a.copy()
    for i in range(n):
        t = 1 - i / n
        wgt = t * t * (3 - 2 * t)  # smoothstep
        for r in (i, h - 1 - i):
            mean = a[r].mean(axis=0, keepdims=True)
            out[r] = a[r] * (1 - wgt) + mean * wgt
    return out


def fix_seam(a, frac=0.005):
    """左端と右端(経度の継ぎ目)の値をそろえ、数画素かけてなじませる。球で継ぎ目の線が見えないように"""
    w = a.shape[1]
    s = max(3, int(w * frac))
    out = a.copy()
    l0, r0 = a[:, 0], a[:, -1]
    m = (l0 + r0) / 2
    for i in range(s):
        f = 1 - i / s
        out[:, i] = a[:, i] + (m - l0) * f
        out[:, w - 1 - i] = a[:, w - 1 - i] + (m - r0) * f
    return np.clip(out, 0, 1)


def save(name, a, quality, dither=False):
    if dither:
        # 暗い所のなだらかな階調は 8bit で帯になりやすい。量子化の前に 1 段階ぶんの乱数を足して帯を散らす
        rng = np.random.default_rng(1977)
        a = a + (rng.random(a.shape, dtype=np.float32) - 0.5) / 255.0
    u8 = np.clip(np.rint(a * 255.0), 0, 255).astype(np.uint8)
    im = Image.fromarray(u8[..., 0] if u8.shape[2] == 1 else u8)
    path = os.path.join(OUT, name)
    im.save(path, 'JPEG', quality=quality, optimize=True, progressive=True)
    dims[name] = {'width': im.size[0], 'height': im.size[1], 'bytes': os.path.getsize(path)}
    print('  %-22s %5d x %4d  %8d bytes' % (name, im.size[0], im.size[1], dims[name]['bytes']))


def emit(name, hi, hi_w, lo_w, quality=86, dither=False):
    """hi を保存し、hi から lo を作って保存する(2:1 の高さは幅の半分)"""
    save(name + '.hi.jpg', hi, quality, dither)
    lo = resize(hi, lo_w, lo_w // 2)
    save(name + '.lo.jpg', np.clip(lo, 0, 1), quality, dither)


# ---- 衛星の白黒地図に色を乗せる -----------------------------------------------
# 明るさ(輝度)は元の地図のまま、色相と彩度だけ与える。tint は「この衛星の平均的な色」の相対値
TINTS = {
    'europa': (1.00, 0.98, 0.88),    # 黄みのある白(氷。筋は赤みを帯びる)
    'ganymede': (1.00, 0.93, 0.84),  # 灰がかった褐色
    'callisto': (1.00, 0.86, 0.70),  # 暗い褐色(元の地図が暗いので、色は少し強め)
}


def colorize(gray, tint):
    t = np.array(tint, dtype=np.float32)
    t = t / (0.299 * t[0] + 0.587 * t[1] + 0.114 * t[2])  # 輝度を 1 にそろえて、明るさを変えない
    return np.clip(gray * t[None, None, :], 0, 1)


# ---- 各天体 ---------------------------------------------------------------

def photo(name, src, hi_w, lo_w, quality=86, size_hi=None):
    a = load(src)
    h, w = a.shape[:2]
    hi_h = hi_w // 2
    hi = a if (w, h) == (hi_w, hi_h) else resize(a, hi_w, hi_h)
    hi = np.clip(hi, 0, 1)
    hi = fix_seam(fix_poles(hi))
    emit(name, hi, hi_w, lo_w, quality)


def galilean(name, src, color, hi_w=2048, lo_w=1024):
    a = load(src)  # 元は 1 億画素級。穴(値が 0 の画素)を数えずに縮める
    valid = a.max(axis=2) > 0.0
    hi_h = hi_w // 2
    hi, cover = resize_masked(a, valid, hi_w, hi_h)
    hole = cover < 0.5
    # 縁の中途半端な画素も穴に含め、少し広げてから埋める
    k = np.asarray(Image.fromarray(hole.astype(np.uint8) * 255).filter(__import__('PIL.ImageFilter', fromlist=['x']).MaxFilter(5))) > 0
    hi = np.clip(inpaint(hi, k), 0, 1)
    if color is not None:
        hi = colorize(hi, color)
    hi = fix_seam(fix_poles(hi))
    emit(name, hi, hi_w, lo_w)


# 天の川: 露出とガンマ。値を変えたら docs/assets/textures.md の「天の川の調整」も直す
MW_BLACK = 0.0065     # この値以下は黒(淡い背景の光を沈めて、空を黒に近づける)
MW_EXPOSURE = 2.4     # 線形の値にかける倍率
MW_SHOULDER = 0.9     # 明るい所を白飛びさせない肩の強さ(大きいほど強く抑える)
MW_GAMMA = 2.2        # 表示用のガンマ


def tonemap(lin):
    x = np.maximum(lin - MW_BLACK, 0.0) * MW_EXPOSURE
    x = x / (1.0 + x * MW_SHOULDER)  # Reinhard 型。中心部が 1.0 に張りつかない
    return np.power(x, 1.0 / MW_GAMMA)


def milkyway():
    raw = np.fromfile(os.path.join(CACHE, 'milkyway_2020_4k.rgba16f.raw'), dtype=np.float16)
    a = raw.reshape(2048, 4096, 4)[..., :3].astype(np.float32)
    a = a[::-1].copy()  # three.js の EXRLoader は行を下から上の順で返す。北が上になる向きへ戻す
    a = fix_poles(a, 0.03)  # 極の近くは元の画像でも星の粒が横にのびてざらつく。球の極で目立たないよう、行の平均になじませる
    save('milkyway.hi.jpg', tonemap(a), 84, dither=True)
    # lo は線形の値のまま 2x2 の平均で縮めてから明るさを調整する(8bit にしてから縮めると暗部がずれる)
    lo = a.reshape(1024, 2, 2048, 2, 3).mean(axis=(1, 3))
    save('milkyway.lo.jpg', tonemap(lo), 84, dither=True)


print('加工:')
photo('earth', 'earth_ocean_ice_cloud_2048.jpg', 2048, 1024)
photo('moon', 'lroc_color_poles_4k.tif', 2048, 1024)
photo('jupiter', 'jupiter_PIA07782.jpg', 3600, 2048)
galilean('io', 'Io_GalileoSSI-Voyager_Global_Mosaic_ClrMerge_1km.tif', None)
galilean('europa', 'Europa_Voyager_GalileoSSI_global_mosaic_500m.tif', TINTS['europa'])
galilean('ganymede', 'Ganymede_Voyager_GalileoSSI_global_mosaic_1km.tif', TINTS['ganymede'])
galilean('callisto', 'Callisto_Voyager_GalileoSSI_global_mosaic_1km.tif', TINTS['callisto'])
milkyway()

with open(os.path.join(CACHE, 'dims.json'), 'w') as f:
    json.dump(dims, f, indent=1)
