import { provideLottieOptions } from 'ngx-lottie';
import { makeEnvironmentProviders } from '@angular/core';
import player from 'lottie-web';

export function playerFactory() {
  return player;
}

export function provideSelfLottie() {
  return makeEnvironmentProviders([
    provideLottieOptions({
      player: playerFactory,
    }),
  ]);
}
