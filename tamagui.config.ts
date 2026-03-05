import { defaultConfig } from '@tamagui/config/v4';
import { createTamagui } from 'tamagui';
import type { CreateTamaguiProps } from '@tamagui/core';

export const tamaguiConfig = createTamagui(
  defaultConfig as CreateTamaguiProps
);

export default tamaguiConfig;

export type Conf = typeof tamaguiConfig;

declare module 'tamagui' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface TamaguiCustomConfig extends Conf {}
}
