import { getOutfitSprite } from './outfitSprites';

export const WALK_SHEET_BASE = '/mascota-walk.png';

export function getWalkSheet() {
  return getOutfitSprite('walk', WALK_SHEET_BASE);
}
