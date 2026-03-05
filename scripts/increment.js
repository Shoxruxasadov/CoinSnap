const fs = require('fs');
const path = require('path');

const appJsonPath = path.join(__dirname, '..', 'app.json');

try {
  // Читаем app.json
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
  
  // Увеличиваем buildNumber для iOS
  if (appJson.expo.ios) {
    const currentBuildNumber = parseInt(appJson.expo.ios.buildNumber || '1', 10);
    appJson.expo.ios.buildNumber = String(currentBuildNumber + 1);
    console.log(`✅ iOS buildNumber увеличен до: ${appJson.expo.ios.buildNumber}`);
  }
  
  // Увеличиваем versionCode для Android
  if (appJson.expo.android) {
    const currentVersionCode = parseInt(appJson.expo.android.versionCode || 1, 10);
    appJson.expo.android.versionCode = currentVersionCode + 1;
    console.log(`✅ Android versionCode увеличен до: ${appJson.expo.android.versionCode}`);
  }
  
  // Сохраняем изменения
  fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n', 'utf8');
  console.log('✅ Обновлен успешно');
  
} catch (error) {
  console.error('❌ Ошибка при обновлении версии сборки:', error.message);
  process.exit(1);
}
