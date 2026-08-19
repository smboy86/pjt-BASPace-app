module.exports = ({ config }) => {
  const API_URL = process.env.API_URL || 'http://localhost:3000/api/v1';
  const NODE_ENV = process.env.NODE_ENV || 'development';
  const DEBUG = process.env.DEBUG === 'true';
  const LOG_LEVEL = process.env.LOG_LEVEL || 'debug';
  const APP_VERSION = process.env.APP_VERSION || '1.1.0';
  const ANDROID_BUILD_ARCHS = process.env.ANDROID_BUILD_ARCHS
    ? process.env.ANDROID_BUILD_ARCHS.split(',').map((arch) => arch.trim())
    : ['armeabi-v7a', 'arm64-v8a', 'x86', 'x86_64'];

  return {
    ...config,
    name: '바스페이스',
    slug: 'baspace',
    owner: 'smboy86',
    version: APP_VERSION,
    orientation: 'portrait',
    userInterfaceStyle: 'automatic',
    scheme: 'baspace',
    icon: './assets/images/icon-v2.png',
    splash: {
      image: './assets/images/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#0a0a0a',
    },
    web: { bundler: 'metro', output: 'static' },
    updates: {
      url: 'https://u.expo.dev/bd03574d-0e8a-44dd-89aa-bbaaa3d3a687',
      checkAutomatically: 'ON_LOAD',
      fallbackToCacheTimeout: NODE_ENV === 'development' ? 5000 : 0,
    },
    runtimeVersion: { policy: 'appVersion' },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.baspace.app',
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSPhotoLibraryUsageDescription:
          '욕실 사진을 등록하여 더 정확한 리모델링 견적을 받을 수 있습니다.',
      },
    },
    android: {
      package: 'com.baspace.app',
      blockedPermissions: [
        'com.google.android.gms.permission.AD_ID',
        'android.permission.ACCESS_ADSERVICES_AD_ID',
        'android.permission.ACCESS_ADSERVICES_ATTRIBUTION',
        'android.permission.ACCESS_ADSERVICES_TOPICS',
      ],
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon-v2.png',
        backgroundColor: '#F7F8FA',
      },
    },
    plugins: [
      ['expo-dev-client', { launchMode: 'launcher' }],
      'expo-router',
      'expo-font',
      'expo-image',
      'expo-web-browser',
      'expo-secure-store',
      'expo-status-bar',
      [
        'expo-build-properties',
        {
          android: {
            buildArchs: ANDROID_BUILD_ARCHS,
            enableBundleCompression: true,
            enableMinifyInReleaseBuilds: true,
            enableShrinkResourcesInReleaseBuilds: true,
          },
        },
      ],
      ['./plugins/withLocalizedAppName', { ko: '바스페이스' }],
    ],
    experiments: { typedRoutes: true, reactCompiler: false },
    extra: {
      apiUrl: API_URL,
      nodeEnv: NODE_ENV,
      debug: DEBUG,
      logLevel: LOG_LEVEL,
      appVersion: APP_VERSION,
      router: {},
      eas: { projectId: 'bd03574d-0e8a-44dd-89aa-bbaaa3d3a687' },
    },
  };
};
