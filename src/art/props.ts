/**
 * Props and furniture that are sprites rather than tiles: things Andrew can
 * push, examine or hide beside, and large set dressing. Interactable props are
 * outlined in ink (docs/style-guide.md section 1). Frames live in one atlas,
 * `PROPS_KEY`; use the names in `PROP`.
 *
 * Chapter-specific props are added here as each chapter is built.
 */

import { PROPS_KEY } from './keys';
import { AtlasBuilder, PixelBuffer } from './pixels';
import type { Sheet } from './pixels';

export const PROP = {
  // Shared
  keg: 'keg',
  crate: 'crate',
  noticeboard: 'noticeboard',
  vendingMachine: 'vendingMachine',
  bins: 'bins',
  // Breakables (DESIGN.md 7.1). Each breaks into `debris`.
  barrel: 'barrel',
  bottleCrate: 'bottleCrate',
  cardboardBox: 'cardboardBox',
  flowerPot: 'flowerPot',
  sack: 'sack',
  debris: ['debris.0', 'debris.1'],
  // Chapter 1
  fruitMachine: 'fruitMachine',
  dartboard: 'dartboard',
  trophyShelf: 'trophyShelf',
  teamPhoto: 'teamPhoto',
  beerTaps: 'beerTaps',
  telly: 'telly',
  tractor: 'tractor',
  churchGate: 'churchGate',
  chipperSign: 'chipperSign',
  bookiesSign: 'bookiesSign',
  pubSign: 'pubSign',
  foldedJacket: 'foldedJacket',
  bogLights: ['bogLights.0', 'bogLights.1', 'bogLights.2'],
} as const;

type Draw = (b: PixelBuffer) => void;

const outlined =
  (draw: Draw): Draw =>
  (b) => {
    const layer = new PixelBuffer(b.width, b.height);
    draw(layer);
    layer.outline('ink');
    b.blit(layer, 0, 0);
  };

export function propsSheet(): Sheet {
  const atlas = new AtlasBuilder(PROPS_KEY, 256);

  atlas.add(PROP.keg, 16, 16, outlined((b) => {
    b.ellipse(2, 1, 12, 14, 'steel');
    b.ellipse(3, 2, 10, 8, 'fog');
    b.ellipse(6, 4, 4, 3, 'slate');
    b.hline(3, 11, 10, 'slate').hline(4, 13, 8, 'coal');
  }));
  atlas.add(PROP.crate, 16, 16, outlined((b) => {
    b.rect(1, 1, 14, 14, 'peat').rect(1, 10, 14, 5, 'turf');
    b.hline(1, 1, 14, 'tan').line(2, 2, 13, 9, 'turf').line(13, 2, 2, 9, 'turf').vline(8, 10, 5, 'turfDark');
  }));
  atlas.add(PROP.noticeboard, 16, 24, outlined((b) => {
    b.rect(1, 2, 14, 12, 'peat').rect(2, 3, 12, 10, 'tan');
    b.rect(3, 4, 4, 3, 'white').rect(8, 4, 5, 4, 'bone').rect(4, 8, 5, 4, 'amberLight').set(10, 10, 'alarm');
    b.rect(3, 14, 2, 9, 'turfDark').rect(11, 14, 2, 9, 'turfDark');
  }));
  atlas.add(PROP.vendingMachine, 16, 24, outlined((b) => {
    b.rect(1, 1, 14, 22, 'navy').vline(14, 2, 21, 'navyDark').hline(1, 1, 14, 'dustyBlue');
    b.rect(3, 3, 8, 12, 'fluoro');
    for (let y = 4; y < 14; y += 3) for (let x = 4; x < 10; x += 2) b.set(x, y, y % 2 === 0 ? 'alarm' : 'amber');
    b.rect(12, 5, 2, 4, 'coal').rect(3, 18, 8, 3, 'ink');
  }));
  atlas.add(PROP.bins, 16, 16, outlined((b) => {
    b.rect(1, 4, 6, 11, 'moss').hline(1, 4, 6, 'grass').rect(0, 3, 8, 1, 'mossDark');
    b.ellipse(8, 7, 7, 8, 'coal').set(11, 6, 'slate');
  }));

  atlas.add(PROP.barrel, 16, 16, outlined((b) => {
    b.ellipse(2, 1, 12, 14, 'peat').rect(3, 3, 10, 10, 'peat');
    b.hline(2, 4, 12, 'steel').hline(2, 11, 12, 'steel').vline(6, 2, 12, 'turf').vline(10, 2, 12, 'turf').hline(4, 1, 8, 'tan');
  }));
  atlas.add(PROP.bottleCrate, 16, 16, outlined((b) => {
    b.rect(1, 6, 14, 9, 'amber').hline(1, 14, 14, 'peat').vline(5, 7, 7, 'peat').vline(10, 7, 7, 'peat');
    for (const x of [3, 7, 12]) b.rect(x, 2, 2, 5, 'moss').set(x, 1, 'bone');
  }));
  atlas.add(PROP.cardboardBox, 16, 16, outlined((b) => {
    b.rect(2, 4, 12, 11, 'tan').hline(2, 14, 12, 'tanShade').vline(13, 5, 10, 'tanShade').hline(2, 4, 12, 'sand').vline(8, 4, 5, 'tanShade');
  }));
  atlas.add(PROP.flowerPot, 16, 16, outlined((b) => {
    b.rect(5, 9, 6, 6, 'brick').hline(4, 9, 8, 'brickDark').ellipse(3, 2, 10, 8, 'grass').set(5, 4, 'motelPink').set(9, 3, 'amberLight').set(8, 6, 'motelPink');
  }));
  atlas.add(PROP.sack, 16, 16, outlined((b) => {
    b.ellipse(3, 4, 10, 11, 'bone').hline(4, 14, 8, 'fog').rect(6, 2, 4, 3, 'bone').hline(6, 4, 4, 'peat');
  }));
  PROP.debris.forEach((name, i) => {
    atlas.add(name, 16, 16, (b) => {
      // Splinters and shards on the ground; not solid, no outline.
      const bits: [number, number, number, number][] = i === 0 ? [[3, 10, 4, 2], [9, 12, 3, 1], [6, 13, 2, 2], [11, 9, 2, 2]] : [[2, 12, 3, 1], [7, 13, 4, 1], [12, 11, 2, 2], [5, 10, 2, 1]];
      for (const [x, y, w, h] of bits) b.rect(x, y, w, h, 'turf');
      b.set(8, 11, 'fog').set(4, 13, 'tan').set(12, 13, 'fog');
    });
  });

  atlas.add(PROP.fruitMachine, 16, 24, outlined((b) => {
    b.rect(1, 1, 14, 22, 'brickDark').vline(14, 2, 21, 'ink').hline(1, 1, 14, 'brick');
    b.rect(3, 3, 10, 5, 'amberLight').rect(3, 9, 10, 5, 'coal');
    b.rect(4, 10, 2, 3, 'alarm').rect(7, 10, 2, 3, 'amber').rect(10, 10, 2, 3, 'grass');
    b.rect(4, 16, 3, 2, 'amber').rect(9, 16, 3, 2, 'alarm').rect(5, 20, 6, 2, 'ink');
  }));
  atlas.add(PROP.dartboard, 16, 16, outlined((b) => {
    b.ellipse(2, 2, 12, 12, 'coal').ellipse(4, 4, 8, 8, 'bone').ellipse(6, 6, 4, 4, 'moss').rect(7, 7, 2, 2, 'alarm');
    b.line(10, 3, 12, 1, 'fog');
  }));
  atlas.add(PROP.trophyShelf, 32, 16, outlined((b) => {
    b.rect(1, 12, 30, 3, 'peat').hline(1, 12, 30, 'tan');
    for (const x of [5, 14, 23]) {
      b.rect(x, 3, 5, 5, 'amberLight').rect(x + 1, 8, 3, 2, 'amber').rect(x, 10, 5, 2, 'turfDark');
      b.set(x - 1, 4, 'amber').set(x + 5, 4, 'amber');
    }
  }));
  atlas.add(PROP.teamPhoto, 16, 16, outlined((b) => {
    b.rect(1, 2, 14, 11, 'peat').rect(2, 3, 12, 9, 'bone');
    for (let x = 3; x < 13; x += 2) b.set(x, 5, 'skin').set(x, 6, 'grass').set(x, 9, 'skin').set(x, 10, 'grass');
  }));
  atlas.add(PROP.beerTaps, 16, 16, outlined((b) => {
    for (const x of [3, 7, 11]) b.rect(x, 3, 2, 9, 'fog').rect(x - 1, 2, 4, 3, x === 7 ? 'coal' : 'amber');
    b.rect(1, 12, 14, 2, 'steel');
  }));
  atlas.add(PROP.telly, 16, 16, outlined((b) => {
    b.rect(1, 2, 14, 10, 'coal').rect(2, 3, 12, 8, 'dustyBlue').rect(3, 4, 4, 2, 'skyPale').rect(6, 12, 4, 2, 'slate');
  }));
  atlas.add(PROP.tractor, 48, 32, outlined((b) => {
    b.rect(8, 10, 24, 12, 'alarm').hline(8, 21, 24, 'brickDark').vline(31, 11, 11, 'brickDark');
    b.rect(20, 2, 12, 10, 'coal').rect(22, 4, 8, 6, 'skyPale');
    b.rect(32, 14, 10, 8, 'alarm').hline(32, 21, 10, 'brickDark').rect(40, 8, 2, 6, 'coal');
    b.ellipse(8, 14, 18, 18, 'ink').ellipse(13, 19, 8, 8, 'slate').ellipse(15, 21, 4, 4, 'fog');
    b.ellipse(33, 21, 11, 11, 'ink').ellipse(36, 24, 5, 5, 'slate');
  }));
  atlas.add(PROP.churchGate, 32, 32, outlined((b) => {
    b.rect(1, 6, 5, 25, 'slate').rect(26, 6, 5, 25, 'slate').rect(0, 4, 7, 3, 'steel').rect(25, 4, 7, 3, 'steel');
    for (let x = 8; x < 25; x += 3) b.rect(x, 9, 1, 21, 'coal').set(x, 8, 'fog');
    b.hline(6, 12, 20, 'coal').hline(6, 26, 20, 'coal');
    b.rect(15, 1, 2, 6, 'fog').rect(13, 3, 6, 1, 'fog');
  }));
  const sign = (name: string, base: 'amberLight' | 'grass' | 'brick', accent: 'alarm' | 'white' | 'amberLight'): void => {
    atlas.add(name, 32, 16, outlined((b) => {
      b.rect(1, 2, 30, 11, base).hline(1, 2, 30, 'white').hline(1, 12, 30, 'coal');
      // Shapes that suggest lettering without being text (text is never drawn into art).
      for (let x = 4; x < 28; x += 4) b.rect(x, 5, 3, 5, accent);
    }));
  };
  sign(PROP.chipperSign, 'amberLight', 'alarm');
  sign(PROP.bookiesSign, 'grass', 'white');
  sign(PROP.pubSign, 'brick', 'amberLight');
  atlas.add(PROP.foldedJacket, 16, 16, outlined((b) => {
    b.rect(3, 8, 10, 5, 'turfDark').hline(3, 8, 10, 'turf').vline(8, 9, 4, 'ink');
  }));
  PROP.bogLights.forEach((name, i) => {
    atlas.add(name, 48, 16, (b) => {
      // Three soft lights in a row; they pulse out of step. No outline: they are not solid.
      [6, 22, 38].forEach((x, n) => {
        const big = (n + i) % 3 === 0;
        b.ellipse(x - (big ? 1 : 0), 5 - (big ? 1 : 0), big ? 8 : 6, big ? 8 : 6, 'fluoro');
        b.ellipse(x + 1, 6, 4, 4, 'white');
        b.set(x + 3, 13, 'skyPale');
      });
    });
  });

  return atlas.build();
}
