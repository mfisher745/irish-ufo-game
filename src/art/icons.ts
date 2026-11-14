/**
 * HUD and world icons (12 x 12), effects (16 x 16) and the 1 x 1 pixel.
 * Frame names are in keys.ts.
 */

import type { AbilityId, DrinkId, FoodId } from '../core/types';
import { TEX, fx, icon } from './keys';
import type { ColourName } from './palette';
import { PixelBuffer, SheetBuilder } from './pixels';
import type { Sheet } from './pixels';

type Draw = (b: PixelBuffer) => void;

const outlined = (draw: Draw): Draw => (b) => {
  const layer = new PixelBuffer(b.width, b.height);
  draw(layer);
  layer.outline('ink');
  b.blit(layer, 0, 0);
};

/**
 * A pint glass filled to `level` of 3. Drawn with a light rim and no ink
 * outline, because it sits on the dark HUD strip where an ink outline vanishes.
 */
const pint =
  (level: 0 | 1 | 2 | 3): Draw =>
  (b) => {
    const rim = level === 0 ? 'steel' : 'bone';
    b.rect(2, 1, 8, 10, rim);
    b.rect(3, 1, 6, 9, 'coal');
    if (level > 0) {
      const h = level === 3 ? 9 : level === 2 ? 5 : 3;
      b.rect(3, 10 - h, 6, h, 'turf');
      b.rect(3, 10 - h, 6, level === 3 ? 3 : 1, 'white');
    }
  };

/** A five-fingered cannabis leaf, symmetrical about the cell's centre line, with a short stem. */
const leaf =
  (blade: ColourName, stem: ColourName): Draw =>
  (b) => {
    b.rect(5, 0, 2, 8, blade);
    b.line(4, 7, 1, 2, blade).line(4, 6, 2, 3, blade);
    b.line(7, 7, 10, 2, blade).line(7, 6, 9, 3, blade);
    b.line(4, 8, 0, 6, blade).line(7, 8, 11, 6, blade);
    b.line(4, 9, 2, 10, blade).line(7, 9, 9, 10, blade);
    b.rect(5, 8, 2, 4, stem);
  };

/** A bottle: body colour, label colour, and how tall. */
const bottle = (body: ColourName, label: ColourName, tall = true): Draw =>
  outlined((b) => {
    const top = tall ? 1 : 3;
    b.rect(5, top, 2, 3, body);
    b.rect(4, top + 3, 4, 10 - top - 3, body);
    b.rect(4, 6, 4, 2, label);
    b.set(5, top, 'bone');
  });

const can = (body: ColourName, band: ColourName): Draw =>
  outlined((b) => {
    b.rect(4, 3, 4, 7, body);
    b.hline(4, 3, 4, 'fog').hline(4, 6, 4, band).vline(7, 4, 6, 'steel');
  });

const DRINKS: Readonly<Record<DrinkId, Draw>> = {
  stout: pint(3),
  whiskey: bottle('amber', 'bone', false),
  poitin: bottle('skyPale', 'fog'),
  lightBeer: can('fog', 'navy'),
  bourbon: bottle('peat', 'amberLight', false),
  craftIpa: can('magenta', 'lime'),
  tequila: bottle('amberLight', 'alarm'),
  water: bottle('dustyBlue', 'white'),
};

const FOODS: Readonly<Record<FoodId, Draw>> = {
  crisps: outlined((b) => {
    b.rect(3, 2, 6, 8, 'grass').hline(3, 2, 6, 'moss').hline(3, 9, 6, 'moss').rect(5, 5, 2, 2, 'amberLight');
  }),
  chickenFilletRoll: outlined((b) => {
    b.rect(1, 5, 10, 4, 'tan').hline(1, 8, 10, 'tanShade').hline(2, 6, 8, 'amberLight').set(3, 6, 'grass').set(7, 6, 'grass');
  }),
  breakfastRoll: outlined((b) => {
    b.rect(1, 5, 10, 4, 'tan').hline(1, 8, 10, 'tanShade').hline(2, 6, 8, 'brick').set(4, 6, 'amberLight').set(8, 6, 'white');
  }),
  spiceBag: outlined((b) => {
    b.rect(3, 3, 6, 7, 'tan').hline(3, 9, 6, 'tanShade').hline(4, 2, 4, 'amber').set(5, 1, 'alarm').set(7, 1, 'amberLight').rect(5, 5, 2, 2, 'alarm');
  }),
  tea: outlined((b) => {
    b.rect(3, 5, 5, 5, 'white').hline(3, 9, 5, 'fog').hline(4, 5, 3, 'peat').set(8, 6, 'white').set(9, 7, 'white').set(8, 8, 'white');
    b.set(5, 2, 'fog').set(6, 3, 'fog');
  }),
};

const ABILITIES: Readonly<Record<AbilityId, Draw>> = {
  punchCombo: outlined((b) => {
    b.rect(3, 4, 6, 5, 'skin').hline(3, 8, 6, 'skinShade').vline(5, 4, 2, 'skinShade').vline(7, 4, 2, 'skinShade').rect(1, 6, 2, 3, 'anorak');
  }),
  bottleThrow: outlined((b) => {
    b.line(3, 8, 7, 4, 'moss').line(4, 9, 8, 5, 'moss').set(8, 3, 'mossDark').set(2, 3, 'fog').set(1, 5, 'fog');
  }),
  stumble: outlined((b) => {
    b.rect(6, 2, 3, 3, 'skin').line(6, 5, 3, 8, 'anorak').line(4, 8, 2, 10, 'denim').line(5, 8, 7, 10, 'denim');
  }),
  stoutSlam: (b) => {
    b.rect(3, 1, 6, 8, 'bone').rect(4, 1, 4, 7, 'turf').rect(4, 1, 4, 2, 'white');
    b.hline(0, 10, 12, 'amberLight').set(1, 8, 'amber').set(10, 8, 'amber').set(0, 6, 'amber').set(11, 6, 'amber');
  },
  actNatural: outlined((b) => {
    b.rect(4, 2, 4, 3, 'skin').rect(3, 5, 6, 5, 'anorak').set(5, 3, 'ink').set(7, 3, 'ink').set(9, 1, 'fog').set(10, 2, 'fog');
  }),
  hurley: outlined((b) => {
    b.line(2, 2, 7, 7, 'peat').rect(7, 7, 3, 3, 'tan');
  }),
  sliotarStrike: outlined((b) => {
    b.ellipse(5, 2, 5, 5, 'white').line(5, 4, 9, 4, 'alarm').set(2, 8, 'fog').set(3, 7, 'fog').set(1, 9, 'fog');
  }),
  poitinBreath: outlined((b) => {
    b.rect(1, 5, 2, 2, 'skin').rect(3, 4, 3, 4, 'amber').rect(6, 3, 3, 6, 'amberLight').rect(9, 4, 2, 4, 'alarm');
  }),
  borrowedGlove: outlined((b) => {
    b.rect(3, 4, 6, 6, 'teal').hline(3, 9, 6, 'tealDark').vline(3, 2, 2, 'teal').vline(5, 1, 3, 'teal').vline(7, 2, 2, 'teal').rect(5, 6, 2, 2, 'violet');
  }),
};

export function iconSheet(): Sheet {
  const sheet = new SheetBuilder(TEX.icons, 12, 12, 8);
  sheet.cell(icon.pintFull, pint(3));
  sheet.cell(icon.pintHalf, pint(2));
  sheet.cell(icon.pintEmpty, pint(0));
  sheet.cell(icon.empty, bottle('moss', 'mossDark'));
  // Myko calls: a cannabis leaf each (the frame keys keep their old `rollie` names). No ink outline on the dark strip.
  sheet.cell(icon.rollie, leaf('grass', 'moss'));
  sheet.cell(icon.rollieSpent, leaf('slate', 'slate'));
  sheet.cell(
    icon.detection,
    outlined((b) => {
      b.rect(5, 1, 2, 6, 'amberLight').rect(5, 9, 2, 2, 'amberLight');
    }),
  );
  sheet.cell(
    icon.interact,
    outlined((b) => {
      b.rect(2, 2, 8, 8, 'bone').hline(2, 9, 8, 'fog').rect(4, 4, 1, 4, 'ink').hline(4, 4, 4, 'ink').hline(4, 5, 3, 'ink').hline(4, 7, 4, 'ink');
    }),
  );
  // Mouse buttons for the HUD: a light mouse with the button in question lit.
  const mouse = (right: boolean): Draw => (b) => {
    b.rect(3, 1, 6, 10, 'fog').rect(3, 1, 6, 4, 'steel').vline(6, 1, 4, 'coal');
    b.rect(right ? 7 : 3, 1, right ? 2 : 3, 4, 'amberLight');
    b.set(3, 1, null).set(8, 1, null).set(3, 10, null).set(8, 10, null);
  };
  sheet.cell(icon.mouseLeft, mouse(false));
  sheet.cell(icon.mouseRight, mouse(true));
  for (const [id, draw] of Object.entries(DRINKS)) sheet.cell(icon.drink(id as DrinkId), draw);
  for (const [id, draw] of Object.entries(FOODS)) sheet.cell(icon.food(id as FoodId), draw);
  for (const [id, draw] of Object.entries(ABILITIES)) sheet.cell(icon.ability(id as AbilityId), draw);
  return sheet.build();
}

export function fxSheet(): Sheet {
  const sheet = new SheetBuilder(TEX.fx, 16, 16, 8);
  sheet.cell(fx.bottle, outlined((b) => void b.rect(6, 4, 3, 7, 'moss').rect(7, 2, 1, 2, 'mossDark').vline(6, 5, 5, 'grass')));
  fx.bottleSmash.forEach((name, i) =>
    sheet.cell(name, (b) => {
      const r = 2 + i * 2;
      for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1], [1, 0]] as const) b.set(8 + dx * r, 8 + dy * r, i === 2 ? 'mossDark' : 'grass');
      if (i === 0) b.rect(7, 7, 2, 2, 'white');
    }),
  );
  sheet.cell(fx.sliotar, outlined((b) => void b.ellipse(5, 5, 5, 5, 'white').line(6, 7, 8, 7, 'alarm')));
  sheet.cell(fx.dart, (b) => void b.rect(5, 7, 5, 1, 'amberLight').set(10, 7, 'white').set(4, 7, 'amber'));
  sheet.cell(fx.bolt, (b) => void b.rect(5, 6, 6, 3, 'alarm').rect(6, 7, 4, 1, 'amberLight'));
  sheet.cell(fx.ray, (b) => void b.rect(4, 7, 8, 2, 'teal').rect(5, 7, 6, 1, 'fluoro'));
  sheet.cell(fx.box, outlined((b) => void b.rect(4, 4, 8, 8, 'peat').hline(4, 4, 8, 'tan').vline(11, 5, 7, 'turf').hline(4, 7, 8, 'turf')));
  sheet.cell(fx.bale, outlined((b) => void b.rect(3, 5, 10, 7, 'corn').hline(3, 11, 10, 'cornShade').vline(6, 5, 7, 'cornShade').vline(10, 5, 7, 'cornShade')));
  fx.fire.forEach((name, i) =>
    sheet.cell(name, (b) => {
      b.ellipse(3, 4 + i, 10, 9 - i, 'alarm').ellipse(5, 6 + i, 6, 6 - i, 'amber').ellipse(6, 8, 4, 3, 'amberLight');
      b.set(4 + i * 3, 2 + i, 'amber');
    }),
  );
  fx.stunRing.forEach((name, i) =>
    sheet.cell(name, (b) => {
      const c = i === 0 ? 'teal' : 'violet';
      b.ellipse(1 + i, 1 + i, 14 - i * 2, 14 - i * 2, c).ellipse(3 + i, 3 + i, 10 - i * 2, 10 - i * 2, null);
    }),
  );
  fx.smokePuff.forEach((name, i) => sheet.cell(name, (b) => void b.ellipse(6 - i, 7 - i * 2, 4 + i * 2, 4 + i, i === 2 ? 'steel' : 'fog')));
  sheet.cell(fx.shadow, (b) => void b.ellipse(2, 10, 12, 5, 'ink'));
  sheet.cell(fx.groundMarker, (b) => {
    b.ellipse(0, 0, 16, 16, 'alarm').ellipse(1, 1, 14, 14, null);
    b.hline(6, 8, 4, 'alarm').vline(8, 6, 4, 'alarm');
  });
  fx.pickupGlint.forEach((name, i) =>
    sheet.cell(name, (b) => {
      b.set(8, 8, 'white');
      if (i === 1) b.set(8, 6, 'white').set(8, 10, 'white').set(6, 8, 'white').set(10, 8, 'white');
    }),
  );
  return sheet.build();
}

export function pixelSheet(): Sheet {
  return new SheetBuilder(TEX.pixel, 1, 1, 1).cell('pixel', (b) => void b.set(0, 0, 'white')).build();
}
