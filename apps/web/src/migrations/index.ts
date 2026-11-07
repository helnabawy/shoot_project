import * as migration_20261106_225406_initial from './20261106_225406_initial';
import * as migration_20261107_000048_glyph_localized from './20261107_000048_glyph_localized';
import * as migration_20261107_005309_brief_multiple_personas from './20261107_005309_brief_multiple_personas';
import * as migration_20261107_073926_creator_profiles from './20261107_073926_creator_profiles';
import * as migration_20261107_114651_marketing_pages_pages from './20261107_114651_marketing_pages_pages';
import * as migration_20261107_121631_marketing_pages_legal from './20261107_121631_marketing_pages_legal';
import * as migration_20261107_122619_marketing_pages_guides from './20261107_122619_marketing_pages_guides';
import * as migration_20261107_123427_marketing_pages_intent from './20261107_123427_marketing_pages_intent';

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
    name: '20261107_005309_brief_multiple_personas',
  },
  {
    up: migration_20261107_073926_creator_profiles.up,
    down: migration_20261107_073926_creator_profiles.down,
    name: '20261107_073926_creator_profiles',
  },
  {
    up: migration_20261107_114651_marketing_pages_pages.up,
    down: migration_20261107_114651_marketing_pages_pages.down,
    name: '20261107_114651_marketing_pages_pages',
  },
  {
    up: migration_20261107_121631_marketing_pages_legal.up,
    down: migration_20261107_121631_marketing_pages_legal.down,
    name: '20261107_121631_marketing_pages_legal',
  },
  {
    up: migration_20261107_122619_marketing_pages_guides.up,
    down: migration_20261107_122619_marketing_pages_guides.down,
    name: '20261107_122619_marketing_pages_guides',
  },
  {
    up: migration_20261107_123427_marketing_pages_intent.up,
    down: migration_20261107_123427_marketing_pages_intent.down,
    name: '20261107_123427_marketing_pages_intent'
  },
];
