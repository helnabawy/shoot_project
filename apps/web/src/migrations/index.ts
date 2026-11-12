import * as migration_20261106_225406_initial from './20261106_225406_initial';
import * as migration_20261107_000048_glyph_localized from './20261107_000048_glyph_localized';
import * as migration_20261107_005309_brief_multiple_personas from './20261107_005309_brief_multiple_personas';
import * as migration_20261107_073926_creator_profiles from './20261107_073926_creator_profiles';
import * as migration_20261107_115156_landing_infographics from './20261107_115156_landing_infographics';
import * as migration_20261107_133522_marketing_pages from './20261107_133522_marketing_pages';
import * as migration_20261107_150007_quick_match from './20261107_150007_quick_match';
import * as migration_20261107_211232_creator_gender_nationality_experience from './20261107_211232_creator_gender_nationality_experience';
import * as migration_20261107_230004_creator_identity_documents_emirates from './20261107_230004_creator_identity_documents_emirates';
import * as migration_20261108_073311_hero_background_overlay from './20261108_073311_hero_background_overlay';
import * as migration_20261108_074725_user_multiple_personas from './20261108_074725_user_multiple_personas';
import * as migration_20261108_112308_media_storage_fields from './20261108_112308_media_storage_fields';
import * as migration_20261110_154146_specialty_tile_scene from './20261110_154146_specialty_tile_scene';
import * as migration_20261111_210154_users_phone_identity from './20261111_210154_users_phone_identity';
import * as migration_20261112_062929_account_finish from './20261112_062929_account_finish';
import * as migration_20261112_063030_booking_details from './20261112_063030_booking_details';

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
    name: '20261107_150007_quick_match',
  },
  {
    up: migration_20261107_211232_creator_gender_nationality_experience.up,
    down: migration_20261107_211232_creator_gender_nationality_experience.down,
    name: '20261107_211232_creator_gender_nationality_experience',
  },
  {
    up: migration_20261107_230004_creator_identity_documents_emirates.up,
    down: migration_20261107_230004_creator_identity_documents_emirates.down,
    name: '20261107_230004_creator_identity_documents_emirates',
  },
  {
    up: migration_20261108_073311_hero_background_overlay.up,
    down: migration_20261108_073311_hero_background_overlay.down,
    name: '20261108_073311_hero_background_overlay',
  },
  {
    up: migration_20261108_074725_user_multiple_personas.up,
    down: migration_20261108_074725_user_multiple_personas.down,
    name: '20261108_074725_user_multiple_personas',
  },
  {
    up: migration_20261108_112308_media_storage_fields.up,
    down: migration_20261108_112308_media_storage_fields.down,
    name: '20261108_112308_media_storage_fields',
  },
  {
    up: migration_20261110_154146_specialty_tile_scene.up,
    down: migration_20261110_154146_specialty_tile_scene.down,
    name: '20261110_154146_specialty_tile_scene',
  },
  {
    up: migration_20261111_210154_users_phone_identity.up,
    down: migration_20261111_210154_users_phone_identity.down,
    name: '20261111_210154_users_phone_identity',
  },
  {
    up: migration_20261112_062929_account_finish.up,
    down: migration_20261112_062929_account_finish.down,
    name: '20261112_062929_account_finish',
  },
  {
    up: migration_20261112_063030_booking_details.up,
    down: migration_20261112_063030_booking_details.down,
    name: '20261112_063030_booking_details'
  },
];
