import { darkTheme, lightTheme } from '@rainbow-me/rainbowkit';

export const customTheme = {
  ...lightTheme(),
  colors: {
    ...lightTheme().colors,
    accentColor: '#7b3fe4',
  },
};