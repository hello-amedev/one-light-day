// 天体のシェーダー(GLSL)。
// 色は ColorManagement を切った画面にそのまま出るので、陰影だけは明るさが線形になる空間で計算し(2.2 乗)、出す時に戻す。
// 球は天体固定の座標で作ってあり、uRot(天体 → 世界)で向きを付ける。扁平な天体は z を uFlat 倍に縮める。
// 環の影の式は saturnRings.ts と同じ(あちらが試験できる版)。

export const RING_HALF_KM = 140_700;

/** 球(表面)の頂点。法線は扁平な楕円体の法線 */
export const surfaceVertex = /* glsl */ `
  uniform mat3 uRot;
  uniform float uFlat;
  varying vec3 vN;
  varying vec3 vBody;
  varying vec2 vUv;
  varying vec3 vView;
  void main() {
    vec3 q = vec3(position.xy, position.z * uFlat);
    vBody = q;
    vN = uRot * normalize(vec3(position.xy, position.z / uFlat));
    vUv = uv;
    vec4 wp = modelMatrix * vec4(uRot * q, 1.0);
    vView = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

/**
 * 球(表面)のフラグメント。
 * USE_TEX: 画像(uTex)と単色(uColor)を uFade でなじませる。RING_SHADOW: 土星の表面に環の影を落とす。
 */
export const surfaceFragment = /* glsl */ `
  precision highp float;
  uniform sampler2D uTex;
  uniform float uFade;
  uniform float uOffU;
  uniform vec3 uColor;
  uniform vec3 uLight;
  uniform vec2 uTerm;
  uniform float uLimb;
  uniform vec3 uNight;
  // 月明かり(地球だけ)。月への向きと、満ち欠けを含めた強さ。0 なら照らさない
  uniform vec3 uMoonDir;
  uniform float uMoonLight;
  uniform float uEmissive;
  #ifdef RING_SHADOW
  uniform sampler2D uProfile;
  uniform vec3 uLightBody;
  uniform float uEqKm;
  #endif
  varying vec3 vN;
  varying vec3 vBody;
  varying vec2 vUv;
  varying vec3 vView;

  void main() {
    vec3 n = normalize(vN);
    float l = dot(n, uLight);
    // 昼夜の境はなだらかに。uTerm.x が小さい(負)ほど境が広い
    float lit = pow(smoothstep(uTerm.x, 1.0, l), uTerm.y);
    float mu = clamp(dot(n, -normalize(vView)), 0.0, 1.0);
    float limb = 1.0 - uLimb * (1.0 - mu);

    vec3 base = uColor;
    #ifdef USE_TEX
    base = mix(uColor, texture2D(uTex, vec2(vUv.x + uOffU, vUv.y)).rgb, uFade);
    #endif

    float light = lit * limb;
    #ifdef RING_SHADOW
    // 表面の点から太陽へ向かう線が赤道面を横切る半径の環の濃さで、光を弱める
    vec3 L = uLightBody;
    if (abs(L.z) > 1e-4) {
      float t = -vBody.z / L.z;
      if (t > 0.0) {
        float rKm = length(vBody.xy + t * L.xy) * uEqKm;
        float u = (rKm - 66900.0) / (140500.0 - 66900.0);
        if (u > 0.0 && u < 1.0) {
          // 細い縞で影の縁がちらつかないよう、少しぼかして引く(LOD を上げる)
          float s = texture2D(uProfile, vec2(u, 0.5), 2.5).g;
          float tau = s * s * 3.0;
          light *= exp(-tau / max(abs(L.z), 0.04));
        }
      }
    }
    #endif

    // 夜の側だけを、月の向きから照らす(昼の側は太陽の光に埋もれるので足さない)
    float moon = max(dot(n, uMoonDir), 0.0) * uMoonLight * (1.0 - lit);
    vec3 lin = pow(base, vec3(2.2)) * (light + moon) + uNight;
    lin = mix(lin, pow(base, vec3(2.2)), uEmissive);
    gl_FragColor = vec4(pow(lin, vec3(1.0 / 2.2)), 1.0);
  }
`;

/** 環の頂点: 天体固定の xy(土星の赤道半径の単位)と、世界の位置 */
export const ringVertex = /* glsl */ `
  uniform mat3 uRot;
  uniform float uHalfRatio;
  varying vec2 vPb;
  varying vec3 vWorld;
  void main() {
    vPb = position.xy * uHalfRatio;
    vec4 wp = modelMatrix * vec4(uRot * vec3(vPb, 0.0), 1.0);
    vWorld = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

/**
 * 環のフラグメント。奥の半分(uHalf > 0)と手前の半分(uHalf < 0)を別々に描く。
 * 太陽の側から見た面(反射)と、裏側から見た面(透けた光)で明るさを変える。
 * 土星の影は、環の点から太陽へ向かう線が扁平な球に当たるかで求める。
 */
export const ringFragment = /* glsl */ `
  precision highp float;
  uniform sampler2D uProfile;
  uniform mat3 uRot;
  uniform vec3 uLightBody;
  uniform vec3 uTint;
  uniform float uFlat;
  uniform float uEqKm;
  uniform float uRadius;
  uniform float uHalf;
  uniform vec3 uCenter;
  varying vec2 vPb;
  varying vec3 vWorld;

  void main() {
    float rKm = length(vPb) * uEqKm;
    float u = (rKm - 66900.0) / (140500.0 - 66900.0);
    if (u <= 0.0 || u >= 1.0) discard;

    // 土星の中心を通り視線に垂直な面より奥か手前か(奥の半分は土星の前に描き、手前の半分は後に描く)
    vec3 pRel = uRot * vec3(vPb, 0.0) * uRadius;
    bool behind = dot(pRel, normalize(uCenter)) > 0.0;
    if ((uHalf > 0.0) != behind) discard;

    vec4 s = texture2D(uProfile, vec2(u, 0.5));
    float albedo = s.r;
    float tau = s.g * s.g * 3.0;
    if (tau < 0.002) discard;

    vec3 vv = normalize(-vWorld);
    vec3 vb = vv * uRot;                 // 世界 → 天体固定(転置を掛ける)
    float mv = max(abs(vb.z), 0.015);
    vec3 L = uLightBody;
    float m0 = max(abs(L.z), 0.05);
    bool sameSide = vb.z * L.z > 0.0;

    // 土星の影(扁平な球に当たるか。縁はなだらかに)
    vec3 P = vec3(vPb, 0.0);
    vec3 Ls = vec3(L.xy, L.z / uFlat);
    float a = dot(Ls, Ls);
    float bq = dot(P, Ls);
    float lit = 1.0;
    if (bq < 0.0) {
      float miss = sqrt(max(0.0, dot(P, P) - bq * bq / a));
      lit = smoothstep(0.988, 1.012, miss);
    }

    float alpha = 1.0 - exp(-tau / mv);
    // 太陽が環の面に近い時も環が見えるよう、明るさの係数だけ太陽の高さに下限を置く(演出)
    float m0b = max(m0, 0.28);
    float k = 2.3 * albedo * m0b / (m0b + mv);
    float rad;
    if (sameSide) {
      // 太陽の側から見る: 環の粒が跳ね返した光(1 回の散乱)。薄い C 環でも、太陽が低いと光は斜めに長く通るので十分に光る
      rad = k * (1.0 - exp(-tau * (1.0 / m0 + 1.0 / mv)));
    } else {
      // 裏側から見る: 環を通り抜けながら散った光(1 回の散乱)。
      // 濃い B 環は光を通さず暗く、薄い C 環・カッシーニの間隙・A 環のほうが明るい(ボイジャーが裏側から撮った写真と同じ並び)
      float dd = 1.0 - m0 / mv;
      dd = abs(dd) < 0.05 ? (dd < 0.0 ? -0.05 : 0.05) : dd;
      rad = k * max(0.0, (exp(-tau / mv) - exp(-tau / m0)) / dd);
    }
    rad = rad * lit + 0.012 * albedo * alpha;
    // 色は「環そのものが出す光」をそのまま足し、背景(星)は濃さの分だけ隠す(alpha は隠す割合)。
    // 以前は光を alpha で割ってから混ぜていたので、薄い環の光が実際より弱く出て、C 環がほとんど見えなかった
    vec3 col = uTint * rad;
    gl_FragColor = vec4(pow(min(col, vec3(1.6)), vec3(1.0 / 2.2)), alpha);
  }
`;

/** 大気・もやの外側の光の頂点 */
export const haloVertex = /* glsl */ `
  varying vec3 vPos;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

/**
 * 大気・もやの光。球より少し大きい殻を描き、視線が球の中心の近くをかすめる距離(b、球の半径が 1)から光の強さを決める。
 * 球の外(b > 1)は縁からにじむ光、球の中(b < 1)は縁に近いほど強い薄い光。
 * 太陽が球の後ろにある時は、縁を取り巻く光(前方散乱)が強くなる。加算で重ねる。
 */
export const haloFragment = /* glsl */ `
  precision highp float;
  uniform vec3 uCenter;
  uniform float uRadius;
  uniform vec3 uLight;
  uniform vec3 uColor;
  uniform vec3 uColorCore;
  uniform float uH;
  uniform float uOuter;
  uniform float uRim;
  uniform float uAmbient;
  uniform float uForward;
  uniform float uInner;
  uniform float uInnerPow;
  varying vec3 vPos;

  void main() {
    vec3 v = normalize(vPos);
    vec3 c = uCenter / uRadius;
    float tc = dot(c, v);
    float b = length(cross(c, v));
    vec3 q = v * tc - c;
    vec3 n = b > 1e-4 ? q / b : vec3(0.0, 0.0, 1.0);
    float fwd = pow(max(dot(v, uLight), 0.0), 4.0) * uForward;
    vec3 rgb;
    if (b >= 1.0) {
      float e = b - 1.0;
      float glow = exp(-e / uH) * (1.0 - smoothstep(0.5 * uOuter, uOuter, e));
      float sun = smoothstep(-0.35, 0.55, dot(n, uLight));
      rgb = mix(uColorCore, uColor, smoothstep(0.0, 4.0 * uH, e)) * glow * (uAmbient + uRim * sun + fwd);
    } else {
      float cz = sqrt(max(0.0, 1.0 - b * b));
      vec3 hit = v * (tc - cz) - c;
      float sun = smoothstep(-0.25, 0.5, dot(hit, uLight));
      float rim = pow(1.0 - cz, uInnerPow);
      rgb = uColor * rim * uInner * (sun + 0.5 * fwd + 0.06);
    }
    gl_FragColor = vec4(rgb, 1.0);
  }
`;
