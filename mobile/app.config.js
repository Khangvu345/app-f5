const app = require('./app.json');

// The native iOS callback scheme is derived from the public iOS OAuth client ID.
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '';
const suffix = '.apps.googleusercontent.com';
const iosScheme = iosClientId.endsWith(suffix)
  ? `com.googleusercontent.apps.${iosClientId.slice(0, -suffix.length)}`
  : '';

module.exports = {
  ...app.expo,
  plugins: [
    ...app.expo.plugins,
    ...(iosScheme
      ? [['@react-native-google-signin/google-signin', { iosUrlScheme: iosScheme }]]
      : []),
  ],
};
