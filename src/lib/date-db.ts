/** تحويل YYYY-MM-DD إلى Date لحقول @db.Date في Prisma */
export function parseBusinessDate(iso: string): Date {
  return new Date(`${iso}T12:00:00.000Z`);
}
