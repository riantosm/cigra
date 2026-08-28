module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['.'],
        alias: {
          '@': './src',
        },
        extensions: ['.ios.js', '.android.js', '.js', '.jsx', '.json', '.ts', '.tsx'],
      },
    ],
    // react-native-reanimated/plugin WAJIB baris terakhir di plugins array
    'react-native-reanimated/plugin',
  ],
};
