const path = require('path');
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [path.resolve(__dirname, 'node_modules/babel-preset-expo')],
    plugins: [
      '@tamagui/babel-plugin',
      'react-native-reanimated/plugin', // oxirgi bo'lishi kerak
    ],
  };
};
