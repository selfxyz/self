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

export function formatProof(proof: any) {
  const formattedProof: { [key: string]: any } = {};

  for (const key in proof) {
    if (Object.hasOwnProperty.call(proof, key)) {
      const element = proof[key];

      if (key === 'b') {
        // Special formatting for 'b'
        formattedProof[key] = element.map((complex: string) => {
          const matches = complex.match(/QuadExtField\(([^)]+)\)/);
          if (matches && matches[1]) {
            return matches[1].split(' + ').map(num => {
              return num.replace(' * u', '').trim();
            });
          }
          return [];
        });
      } else {
        // Direct copy for 'a' and 'c'
        formattedProof[key] = [...element];
      }
    }
  }

  return formattedProof;
}