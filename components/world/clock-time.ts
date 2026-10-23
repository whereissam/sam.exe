/** Clockwise rotations from twelve, using the visitor's local wall clock. */
export function clockHandAngles(date: Date) {
  const seconds = date.getSeconds();
  const minutes = date.getMinutes() + seconds / 60;
  const hours = (date.getHours() % 12) + minutes / 60;
  return {
    hour: (-hours * Math.PI) / 6,
    minute: (-minutes * Math.PI) / 30,
    second: (-seconds * Math.PI) / 30,
  };
}
