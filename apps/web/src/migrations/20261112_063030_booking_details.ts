import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "bookings" ADD COLUMN "details_start_time" varchar;
  ALTER TABLE "bookings" ADD COLUMN "details_duration" varchar;
  ALTER TABLE "bookings" ADD COLUMN "details_venue" varchar;
  ALTER TABLE "bookings" ADD COLUMN "details_note" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "bookings" DROP COLUMN "details_start_time";
  ALTER TABLE "bookings" DROP COLUMN "details_duration";
  ALTER TABLE "bookings" DROP COLUMN "details_venue";
  ALTER TABLE "bookings" DROP COLUMN "details_note";`)
}
