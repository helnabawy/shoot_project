import * as migration_20261106_225406_initial from './20261106_225406_initial';
import * as migration_20261107_000048_glyph_localized from './20261107_000048_glyph_localized';
import * as migration_20261107_005309_brief_multiple_personas from './20261107_005309_brief_multiple_personas';
import * as migration_20261107_073926_creator_profiles from './20261107_073926_creator_profiles';
import * as migration_20261107_115156_landing_infographics from './20261107_115156_landing_infographics';
import * as migration_20261107_133522_marketing_pages from './20261107_133522_marketing_pages';
import * as migration_20261107_150007_quick_match from './20261107_150007_quick_match';

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
    up: migration_20261107_115156_landing_infographics.up,
    down: migration_20261107_115156_landing_infographics.down,
    name: '20261107_115156_landing_infographics',
  },
  {
    up: migration_20261107_133522_marketing_pages.up,
    down: migration_20261107_133522_marketing_pages.down,
    name: '20261107_133522_marketing_pages',
  },
  {
    up: migration_20261107_150007_quick_match.up,
    down: migration_20261107_150007_quick_match.down,
    name: '20261107_150007_quick_match'
  },
];
