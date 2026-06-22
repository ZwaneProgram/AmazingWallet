// Modern Expo (SDK 50+) Metro config. Web also runs through Metro now, so the
// react-native-svg-transformer setup here makes .svg imports work as React
// components on native AND web (fixing the old webpack SVG crash).
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.transformer.babelTransformerPath = require.resolve("react-native-svg-transformer/expo");
config.resolver.assetExts = config.resolver.assetExts.filter((ext) => ext !== "svg");
config.resolver.sourceExts = [...config.resolver.sourceExts, "svg"];

module.exports = config;
