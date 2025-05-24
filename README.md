# Sort Imports

<p align="center">
  <img src="./icon.png" alt="Sort Imports Logo" width="128" />
</p>

Автоматически сортирует и организует импорты в JavaScript и TypeScript файлах по длине строки.

## Возможности

- 🚀 **Умная сортировка:** Импорты группируются по типам и сортируются по длине
- ⚙️ **Настраиваемость:** Возможность изменить максимальную длину строки и алиасы путей
- ⌨️ **Горячие клавиши:** Ctrl+Alt+O (Windows/Linux) или Cmd+Alt+O (macOS)
- 📝 **Контекстное меню:** Команда доступна в контекстном меню редактора
- 🎯 **Поддержка форматирования:** Работает как провайдер форматирования

## Группировка импортов

Импорты группируются в следующем порядке:

1. **Директивы** — 'use client', 'use server'
2. **React** — react и react/\*
3. **Внешние библиотеки** — npm пакеты
4. **Абсолютные импорты** — пути с алиасами (@/, ~)
5. **Относительные импорты** — локальные файлы (., ..)
6. **Side effect импорты** — импорты без from
7. **Стили** — CSS, SCSS, SASS, LESS файлы

## Настройки

Вы можете настроить расширение через настройки VS Code:

```json
{
  "sortImports.maxLineLength": 100, // Максимальная длина строки импорта
  "sortImports.aliasPrefixes": ["@/", "~"] // Префиксы для абсолютных путей
}
```

## Демонстрация

![Sort Imports Demo](./demo.gif)

## Пример работы

**До:**

```ts
import './styles.css';
import { Component } from 'react';
import { someUtilFunction, anotherFunction } from '../utils/helpers';
import axios from 'axios';
import { apiCall } from '@/services/api';
import lodash from 'lodash';
```

**После:**

```ts
import { Component } from 'react';

import axios from 'axios';
import lodash from 'lodash';

import { apiCall } from '@/services/api';

import { someUtilFunction, anotherFunction } from '../utils/helpers';

import './styles.css';
```

## Использование

- Откройте файл .js, .ts, .jsx или .tsx
- Вызовите команду **Sort Imports** через палитру команд (Cmd+Shift+P / Ctrl+Shift+P)
- Или используйте горячие клавиши: `Cmd+Alt+O` (Mac) / `Ctrl+Alt+O` (Windows/Linux)
- Также доступно в контекстном меню редактора

## Поддерживаемые файлы

- JavaScript (.js)
- TypeScript (.ts)
- JSX (.jsx)
- TSX (.tsx)

## Требования

- VS Code версии 1.74.0 или выше
- Файлы JavaScript/TypeScript

## Лицензия

MIT
