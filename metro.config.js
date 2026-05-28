const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Soporte para los módulos .mjs de Firebase v10+
config.resolver.sourceExts.push("mjs");

module.exports = config;
