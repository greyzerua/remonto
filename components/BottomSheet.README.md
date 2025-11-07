# BottomSheet Component

Універсальний компонент BottomSheet для React Native (Expo) з підтримкою анімацій, жестів та клавіатури.

## Особливості

✅ **Адаптивний** - працює на iPhone, Android та планшетах  
✅ **Плавні анімації** - відкриття/закриття знизу з spring-анімацією  
✅ **Напівпрозорий бекдроп** - закриває BottomSheet при натисканні  
✅ **Автоматична висота** - підлаштовується під контент  
✅ **Підтримка клавіатури** - автоматично піднімається при відкритті клавіатури  
✅ **Свайп вниз** - плавне закриття свайпом вниз  
✅ **Будь-який контент** - можна розміщувати будь-які компоненти всередині  

## Встановлення

Компонент використовує наступні залежності (вже додані в `package.json`):

```bash
npm install react-native-reanimated react-native-gesture-handler
```

### Налаштування для Expo

Для Expo потрібно налаштувати `babel.config.js`:

```javascript
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin', // Додати в кінець
    ],
  };
};
```

**Важливо:** Плаґін `react-native-reanimated/plugin` має бути останнім в масиві `plugins`.

### Налаштування для React Navigation

Якщо використовується React Navigation, `GestureHandlerRootView` вже надається автоматично. Якщо ні, обгорніть App в `GestureHandlerRootView`:

```tsx
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {/* Ваш контент */}
    </GestureHandlerRootView>
  );
}
```

## Використання

### Базовий приклад

```tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import BottomSheet from './components/BottomSheet';

export default function MyScreen() {
  const [visible, setVisible] = useState(false);

  return (
    <View>
      <TouchableOpacity onPress={() => setVisible(true)}>
        <Text>Відкрити BottomSheet</Text>
      </TouchableOpacity>

      <BottomSheet
        visible={visible}
        onClose={() => setVisible(false)}
      >
        <View style={{ padding: 20 }}>
          <Text>Ваш контент тут</Text>
        </View>
      </BottomSheet>
    </View>
  );
}
```

### Приклад з формою

```tsx
import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity } from 'react-native';
import BottomSheet from './components/BottomSheet';

export default function FormExample() {
  const [visible, setVisible] = useState(false);
  const [name, setName] = useState('');

  return (
    <BottomSheet
      visible={visible}
      onClose={() => setVisible(false)}
      enablePanDownToClose={true}
      enableBackdrop={true}
      backdropOpacity={0.5}
    >
      <ScrollView keyboardShouldPersistTaps="handled">
        <View style={{ padding: 20 }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 16 }}>
            Форма
          </Text>
          
          <TextInput
            placeholder="Введіть ім'я"
            value={name}
            onChangeText={setName}
            style={{
              borderWidth: 1,
              borderColor: '#ddd',
              borderRadius: 8,
              padding: 12,
              marginBottom: 16,
            }}
          />

          <TouchableOpacity
            onPress={() => setVisible(false)}
            style={{
              backgroundColor: '#007AFF',
              padding: 16,
              borderRadius: 8,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '600' }}>Зберегти</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </BottomSheet>
  );
}
```

## API

### Props

| Prop | Type | Default | Опис |
|------|------|---------|------|
| `visible` | `boolean` | **required** | Чи відображати BottomSheet |
| `onClose` | `() => void` | **required** | Функція, яка викликається при закритті |
| `children` | `React.ReactNode` | **required** | Контент, який відображається всередині |
| `enablePanDownToClose` | `boolean` | `true` | Дозволити закриття свайпом вниз |
| `enableBackdrop` | `boolean` | `true` | Показати напівпрозорий бекдроп |
| `backdropOpacity` | `number` | `0.5` | Прозорість бекдропу (0-1) |
| `animationConfig` | `object` | `{ damping: 20, stiffness: 300, mass: 0.5 }` | Конфігурація spring-анімації |
| `maxHeight` | `number` | `0.9` | Максимальна висота (відсоток від екрану, 0-1) |
| `minHeight` | `number` | `0` | Мінімальна висота в пікселях |
| `snapPoints` | `number[]` | `undefined` | Snap points для фіксації висоти (майбутня функція) |

### Приклади конфігурації

#### Швидка анімація

```tsx
<BottomSheet
  visible={visible}
  onClose={() => setVisible(false)}
  animationConfig={{
    damping: 15,
    stiffness: 400,
    mass: 0.3,
  }}
>
  {/* Контент */}
</BottomSheet>
```

#### Повільна анімація

```tsx
<BottomSheet
  visible={visible}
  onClose={() => setVisible(false)}
  animationConfig={{
    damping: 30,
    stiffness: 200,
    mass: 1,
  }}
>
  {/* Контент */}
</BottomSheet>
```

#### Без бекдропу

```tsx
<BottomSheet
  visible={visible}
  onClose={() => setVisible(false)}
  enableBackdrop={false}
>
  {/* Контент */}
</BottomSheet>
```

#### Без свайпу вниз

```tsx
<BottomSheet
  visible={visible}
  onClose={() => setVisible(false)}
  enablePanDownToClose={false}
>
  {/* Контент */}
</BottomSheet>
```

#### Обмежена висота

```tsx
<BottomSheet
  visible={visible}
  onClose={() => setVisible(false)}
  maxHeight={0.5} // 50% від висоти екрану
>
  {/* Контент */}
</BottomSheet>
```

## Важливі примітки

### Клавіатура

- BottomSheet автоматично піднімається при відкритті клавіатури
- Використовуйте `ScrollView` з `keyboardShouldPersistTaps="handled"` для форм
- На iOS використовується `keyboardWillShow/Hide`, на Android - `keyboardDidShow/Hide`

### Безпечні зони

- Компонент автоматично враховує safe area insets (notch, status bar тощо)
- Padding знизу додається автоматично

### Продуктивність

- Використовується `react-native-reanimated` для плавних анімацій на UI thread
- Жести обробляються на нативному рівні через `react-native-gesture-handler`

## Troubleshooting

### Анімації не працюють

1. Перевірте, що `react-native-reanimated/plugin` додано в `babel.config.js` як останній плаґін
2. Перезапустіть Metro bundler: `npm start -- --reset-cache`

### Жести не працюють

1. Перевірте, що `GestureHandlerRootView` обгортає ваш App
2. Якщо використовуєте React Navigation, це робиться автоматично

### Клавіатура перекриває контент

1. Використовуйте `ScrollView` для контенту з полями введення
2. Додайте `keyboardShouldPersistTaps="handled"` до ScrollView

## Ліцензія

Цей компонент створено для проекту Remonto.

