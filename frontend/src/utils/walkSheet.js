import { getOutfitSprite } from './outfitSprites';

export const WALK_SHEET_BASE = '/home-walk-sit-float/walk/mascota-walk.png';

export function getWalkSheet() {
  return getOutfitSprite('walk', WALK_SHEET_BASE);
}
