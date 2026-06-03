import GameMapService from './src/services/GameMapService';

const region = GameMapService.getRegionByCoordinate({
  x: -6575,
  y: -80771,
  z: -8671
});
console.log('Region:', region);
