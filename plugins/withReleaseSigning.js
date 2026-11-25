// Config plugin: faz o build "release" do Android usar uma keystore própria quando
// as variáveis de ambiente abaixo existirem (no GitHub Actions vêm dos Secrets).
// Sem elas, o APK continua sendo assinado com a chave de debug (instala normalmente,
// mas não serve para publicar na Play Store).
//
//   ANDROID_KEYSTORE_PATH, ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS, ANDROID_KEY_PASSWORD
const { withAppBuildGradle } = require('expo/config-plugins');

const MARCA = '// [withReleaseSigning]';

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let g = cfg.modResults.contents;
    if (g.includes(MARCA)) return cfg;

    g = g.replace(
      /signingConfigs\s*\{/,
      `signingConfigs {
        ${MARCA}
        release {
            def ksPath = System.getenv("ANDROID_KEYSTORE_PATH")
            if (ksPath) {
                storeFile file(ksPath)
                storePassword System.getenv("ANDROID_KEYSTORE_PASSWORD")
                keyAlias System.getenv("ANDROID_KEY_ALIAS")
                keyPassword System.getenv("ANDROID_KEY_PASSWORD")
            }
        }`,
    );

    g = g.replace(
      /(release\s*\{[^}]*?)signingConfig\s+signingConfigs\.debug/,
      `$1signingConfig System.getenv("ANDROID_KEYSTORE_PATH") ? signingConfigs.release : signingConfigs.debug`,
    );

    // versionCode vindo do CI (número da execução) para cada APK novo instalar por cima do anterior
    g = g.replace(/versionCode\s+(\d+)/, 'versionCode((System.getenv("ANDROID_VERSION_CODE") ?: "$1").toInteger())');

    cfg.modResults.contents = g;
    return cfg;
  });
};
