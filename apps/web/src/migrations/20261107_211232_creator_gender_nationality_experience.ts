import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_creator_profiles_gender" AS ENUM('woman', 'man');
  CREATE TYPE "public"."enum__creator_profiles_v_version_gender" AS ENUM('woman', 'man');
  ALTER TABLE "creator_profiles" ADD COLUMN "gender" "enum_creator_profiles_gender";
  ALTER TABLE "creator_profiles" ADD COLUMN "nationality" varchar;
  ALTER TABLE "creator_profiles" ADD COLUMN "years_experience" numeric;
  ALTER TABLE "_creator_profiles_v" ADD COLUMN "version_gender" "enum__creator_profiles_v_version_gender";
  ALTER TABLE "_creator_profiles_v" ADD COLUMN "version_nationality" varchar;
  ALTER TABLE "_creator_profiles_v" ADD COLUMN "version_years_experience" numeric;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "creator_profiles" DROP COLUMN "gender";
  ALTER TABLE "creator_profiles" DROP COLUMN "nationality";
  ALTER TABLE "creator_profiles" DROP COLUMN "years_experience";
  ALTER TABLE "_creator_profiles_v" DROP COLUMN "version_gender";
  ALTER TABLE "_creator_profiles_v" DROP COLUMN "version_nationality";
  ALTER TABLE "_creator_profiles_v" DROP COLUMN "version_years_experience";
  DROP TYPE "public"."enum_creator_profiles_gender";
  DROP TYPE "public"."enum__creator_profiles_v_version_gender";`)
}
