// Learn more: https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
// expo-sqlite (key-value storage) ships a wasm worker for the web build
config.resolver.assetExts.push('wasm');

module.exports = config;
