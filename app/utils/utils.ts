export function getFirstName(mrz: string): string {
  const names = mrz.split("<<");
  const firstName = names[1].split("<")[0].trim();
  const capitalized = firstName.charAt(0) + firstName.slice(1).toLowerCase();
  return capitalized || "Unknown";
}

export function formatDuration(durationInMs: number) {
  const durationInSeconds = durationInMs / 1000;
  const minutes = Math.floor((durationInSeconds % 3600) / 60);
  const seconds = Math.floor(durationInSeconds % 60);

  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}
