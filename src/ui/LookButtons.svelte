<script lang="ts">
  // 向くボタン。地球・太陽・進む先は常に。木星・土星・月は、近い時期だけ出す。
  // 木星・土星の衛星は、位置データのある時刻でボイジャーに近い間だけ、近い順に出す。
  import type { BodyId } from '../lib/bodies';
  import type { Ephemeris } from '../lib/ephemeris';
  import { t } from '../lib/i18n';
  import type { LookTarget } from '../lib/scenes';
  import type { AppStore } from '../lib/store';
  import UiButton from './UiButton.svelte';
  import { watchStore } from './store.svelte';

  let { store, eph }: { store: AppStore; eph: Ephemeris } = $props();
  const txt = t().hud;
  const names = t().bodies;
  const view = watchStore(store);

  /** 木星・土星は、ボイジャーとの距離がこの値以内の時だけ出す(km) */
  const PLANET_NEAR_KM = 3e7;
  /** 月は、ボイジャーと地球の距離がこの値以内の時だけ出す(km) */
  const MOON_NEAR_KM = 2e6;

  /** 木星・土星の衛星は、ボイジャーとの距離がこの値以内の時だけ出す(km) */
  const SATELLITE_NEAR_KM = 2e6;
  const GAS_GIANT_MOONS = ['io', 'europa', 'ganymede', 'callisto', 'titan'] as const;

  function inCoverage(body: BodyId, et: number): boolean {
    const c = eph.coverage(body);
    return et >= c.t0 && et <= c.t1;
  }

  const targets = $derived.by(() => {
    const et = view.state.et;
    const list: LookTarget[] = ['earth', 'sun'];
    if (eph.distance('voyager1', 'jupiter', et) <= PLANET_NEAR_KM) list.push('jupiter');
    if (eph.distance('voyager1', 'saturn', et) <= PLANET_NEAR_KM) list.push('saturn');
    if (inCoverage('moon', et) && eph.distance('voyager1', 'earth', et) <= MOON_NEAR_KM) list.push('moon');
    // 衛星は近い順。位置データの範囲の外では出さない(範囲外は端に丸まって距離が当てにならない)
    const near = GAS_GIANT_MOONS.filter((m) => inCoverage(m, et))
      .map((m) => ({ m, d: eph.distance(m, 'voyager1', et) }))
      .filter((x) => x.d <= SATELLITE_NEAR_KM)
      .sort((a, b) => a.d - b.d);
    for (const x of near) list.push(x.m);
    list.push('ahead');
    return list;
  });
</script>

<div class="look" role="group" aria-label={txt.lookGroup}>
  {#each targets as target (target)}
    <UiButton onclick={() => store.lookAt(target)}>
      {target === 'ahead' ? txt.lookAhead : txt.lookAt(names[target])}
    </UiButton>
  {/each}
</div>

<style>
  .look {
    display: flex;
    flex-wrap: wrap;
    margin-left: calc(var(--space-2) * -1);
  }
</style>
