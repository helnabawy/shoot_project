import * as migration_20261106_225406_initial from './20261106_225406_initial';
import * as migration_20261107_000048_glyph_localized from './20261107_000048_glyph_localized';
import * as migration_20261107_005309_brief_multiple_personas from './20261107_005309_brief_multiple_personas';

export const migrations = [
  {
    up: migration_20261106_225406_initial.up,
    down: migration_20261106_225406_initial.down,
    name: '20261106_225406_initial',
  },
  {
    up: migration_20261107_000048_glyph_localized.up,
    down: migration_20261107_000048_glyph_localized.down,
    name: '20261107_000048_glyph_localized',
  },
  {
    up: migration_20261107_005309_brief_multiple_personas.up,
    down: migration_20261107_005309_brief_multiple_personas.down,
    name: '20261107_005309_brief_multiple_personas'
  },
];
