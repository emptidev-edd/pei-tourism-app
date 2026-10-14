const appJson = require('./app.json');

const googleMapsAndroidApiKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY?.trim();

const mapsPlugin = googleMapsAndroidApiKey
  ? ['react-native-maps', { androidGoogleMapsApiKey: googleMapsAndroidApiKey }]
  : 'react-native-maps';

module.exports = () => ({
  expo: {
    ...appJson.expo,
    plugins: [...(appJson.expo.plugins ?? []), mapsPlugin],
  },
});
