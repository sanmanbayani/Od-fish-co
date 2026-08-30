const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Native release builds bundle through `expo export:embed`, invoked by Gradle
// (and by Xcode's build phase on iOS).
// Gradle makes the `--entry-file` argument relative to this app directory, but
// Metro resolves that argument against its *server root*, which in a pnpm
// workspace is the repository root. The two disagree by the depth of this
// directory, so :app:createBundleReleaseJsAndAssets dies with
// "Unable to resolve module ./../../node_modules/.pnpm/.../expo-router/entry.js".
//
// Pin the server root for that one command only. The dev server and the web
// export must keep the workspace root, or they cannot serve the shared
// workspace packages (and the Expo web preview 404s on its entry bundle).
if (process.argv.includes('export:embed')) {
  config.server = { ...config.server, unstable_serverRoot: __dirname };
}

module.exports = config;
