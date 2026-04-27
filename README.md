# NatsumeWatch — Mobile (React Native / Expo)

Нативное Android-приложение для [NatsumeWatch](https://github.com/kaisenlihs-ux/natsumewatch) на React Native + Expo.

- **Стек:** Expo SDK 54, React Native 0.81, TypeScript, React Navigation, TanStack Query, Zustand, expo-video (HLS), react-native-webview (Kodik).
- **API:** `https://natsumewatch-backend-wsjmfcnv.fly.dev` (тот же backend, что и у сайта).
- **Дизайн:** тёмная тема, основной цвет `#f43f5e`, шрифт Rubik — как на сайте.
- **Экраны:** Главная, Каталог (поиск + фильтры), Случайное, Тайтл, Плеер (HLS / Kodik), Login, Register, Профиль, Мои списки.
- **Package id:** `com.natsumewatch.app`.

## Запуск

```bash
npm install
npx expo start
```

Сканируйте QR-код приложением **Expo Go** на Android-устройстве (для большинства фич — кроме нативного плеера, для которого нужен dev client / EAS Build).

### Запуск на эмуляторе / устройстве

```bash
npx expo run:android   # требует установленного Android SDK и подключённого устройства
```

## Сборка APK / AAB

Сборка через [EAS Build](https://docs.expo.dev/build/introduction/) (бесплатный план, нужен Expo-аккаунт):

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build -p android --profile preview     # APK для установки на устройстве
eas build -p android --profile production   # AAB для Google Play
```

После первого `eas build:configure` появится `eas.json` с профилями.

## Структура

```
.
├── App.tsx                 # provider + navigation root
├── app.json                # Expo config (name, icons, package, plugins)
├── src/
│   ├── api/                # client.ts (fetch+JWT), types.ts, posters.ts
│   ├── components/         # Hero, PosterCard, PosterRow, RatingsBar,
│   │                       # DubSwitcher, EpisodeGrid, ListPicker, Pill
│   ├── navigation/         # RootNavigator (stack) + TabNavigator (bottom tabs)
│   ├── screens/            # Home, Catalog, Random, Anime, Player,
│   │                       # KodikPlayer, Login, Register, Profile, MyList
│   ├── store/              # Zustand auth store
│   ├── theme/              # Colors / radii / spacing
│   └── utils/              # format helpers
```

## Что дальше

- Загрузка аватара / баннера
- Комментарии и рецензии
- Друзья и сообщения
- История просмотра
- Графики статистики
- Торренты (открытие magnet через Intent)
- OAuth-провайдеры
- iOS-сборка (бесплатно с Expo, бандл уже готов)
