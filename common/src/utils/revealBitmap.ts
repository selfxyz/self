import { attributeToPosition } from "../constants/constants";

export function revealBitmapFromMapping(attributeToReveal: {[key: string]: boolean}): string[] {
  const reveal_bitmap = Array(88).fill('0');

  Object.entries(attributeToReveal).forEach(([attribute, reveal]) => {
    if (reveal) {
      const [start, end] = attributeToPosition[attribute as keyof typeof attributeToPosition];
      reveal_bitmap.fill('1', start, end + 1);
    }
  });

  return reveal_bitmap;
}