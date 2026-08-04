export function addDaysToDateOnly(dateValue: string, days: number): string {
  const date = new Date(`${dateValue}T12:00:00`);
  if (Number.isNaN(date.getTime())) return dateValue;

  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}
