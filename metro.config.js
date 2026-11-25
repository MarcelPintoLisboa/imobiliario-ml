// Ignora a pasta do app desktop (Electron, com node_modules próprio e o build web copiado).
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);
const desktop = path.resolve(__dirname, 'desktop').replace(/[/\\]/g, '[/\\\\]');
config.resolver.blockList = [...[].concat(config.resolver.blockList ?? []), new RegExp(`^${desktop}[/\\\\].*`)];

module.exports = config;
