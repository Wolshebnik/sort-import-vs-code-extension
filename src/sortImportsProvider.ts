import * as vscode from 'vscode';

interface ImportGroups {
  directives: string[];
  react: string[];
  libraries: string[];
  absolute: string[];
  relative: string[];
  sideEffect: string[];
  styles: string[];
}

export class SortImportsProvider {
  private getConfig() {
    const config = vscode.workspace.getConfiguration('sortImports');
    return {
      maxLineLength: config.get<number>('maxLineLength', 100), // По умолчанию 100
      indent: '  ', // Фиксированный отступ
      aliasPrefixes: config.get<string[]>('aliasPrefixes', ['@/', '~']),
    };
  }

  public sortImports(editor: vscode.TextEditor): void {
    const document = editor.document;
    const config = this.getConfig();

    const content = document.getText();
    const sortedContent = this.processContent(content, config);

    if (sortedContent !== content) {
      const edit = new vscode.WorkspaceEdit();
      const fullRange = new vscode.Range(
        document.positionAt(0),
        document.positionAt(content.length)
      );
      edit.replace(document.uri, fullRange, sortedContent);
      vscode.workspace.applyEdit(edit);
    }
  }

  public getFormattingEdits(document: vscode.TextDocument): vscode.TextEdit[] {
    const config = this.getConfig();
    const content = document.getText();
    const sortedContent = this.processContent(content, config);

    if (sortedContent !== content) {
      const fullRange = new vscode.Range(
        document.positionAt(0),
        document.positionAt(content.length)
      );
      return [vscode.TextEdit.replace(fullRange, sortedContent)];
    }

    return [];
  }

  private processContent(content: string, config: any): string {
    const lines = content.split(/\r?\n/);
    let idx = 0;

    const groups: ImportGroups = {
      directives: [],
      react: [],
      libraries: [],
      absolute: [],
      relative: [],
      sideEffect: [],
      styles: [],
    };

    // Обработка директив use client/server
    idx = this.processDirectives(lines, idx, groups);

    // Обработка импортов
    idx = this.processImports(lines, idx, groups, config);

    // Формирование результата
    return this.buildResult(lines, idx, groups);
  }

  private processDirectives(
    lines: string[],
    startIdx: number,
    groups: ImportGroups
  ): number {
    let idx = startIdx;
    let foundDirective = false;

    // Ищем директивы по всему блоку импортов, не только в начале
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const directive = line.match(/^['"](use (?:client|server))['"]\.?;?$/i);
      if (directive) {
        groups.directives.push(`'${directive[1]}';`);
        // Удаляем найденную директиву из исходного массива
        lines[i] = '';
        foundDirective = true;
        break; // Берем только первую найденную директиву
      }
    }

    // Пропускаем пустые строки в начале
    while (lines[idx]?.trim() === '') idx++;

    return idx;
  }

  private processImports(
    lines: string[],
    startIdx: number,
    groups: ImportGroups,
    config: any
  ): number {
    let idx = startIdx;

    while (idx < lines.length) {
      const line = lines[idx].trim();
      if (!line) {
        idx++;
        continue;
      }
      if (!line.startsWith('import')) break;

      let importBlock = '';
      while (idx < lines.length && lines[idx].trim()) {
        importBlock += lines[idx] + '\n';
        idx++;
        if (importBlock.includes(';')) break;
      }

      this.classifyImport(importBlock.trim(), groups, config);
    }

    return idx;
  }

  private classifyImport(
    block: string,
    groups: ImportGroups,
    config: any
  ): void {
    if (!block.includes('from')) {
      groups.sideEffect.push(this.formatBlock(block, config));
      return;
    }

    const sourceMatch = block.match(/from\s+['"](.+?)['"]/);
    if (!sourceMatch) return;

    const source = sourceMatch[1];
    const formatted = this.formatBlock(block, config);

    // Проверяем стили (css, scss, sass, less файлы)
    if (source.match(/\.(css|scss|sass|less)$/)) {
      groups.styles.push(formatted);
    } else if (source === 'react' || source.startsWith('react/')) {
      groups.react.push(formatted);
    } else if (config.aliasPrefixes.some((p: string) => source.startsWith(p))) {
      groups.absolute.push(formatted);
    } else if (source.startsWith('.') || source.startsWith('/')) {
      groups.relative.push(formatted);
    } else if (this.isExternalLib(source, config.aliasPrefixes)) {
      groups.libraries.push(formatted);
    } else {
      groups.absolute.push(formatted);
    }
  }

  private formatBlock(block: string, config: any): string {
    if (!block.includes('{')) return block;

    // Нормализуем блок - убираем переносы строк для парсинга
    const normalizedBlock = block.replace(/\s+/g, ' ').trim();
    const [importPart, fromPart] = normalizedBlock.split(/\s+from\s+/);

    if (!fromPart) return block;

    // Извлекаем импорты из фигурных скобок
    const importsMatch = importPart.match(/import\s*\{([^}]+)\}/);
    if (!importsMatch) return block;

    const imports = importsMatch[1]
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean)
      .sort((a, b) => a.length - b.length); // Сортировка по длине

    // Формируем однострочный вариант и проверяем его длину
    const singleLineImports = `{ ${imports.join(', ')} }`;
    const singleLineResult = `import ${singleLineImports} from ${fromPart}`;

    const formattedImports =
      singleLineResult.length > config.maxLineLength
        ? `{\n${config.indent}${imports.join(`,\n${config.indent}`)},\n}`
        : singleLineImports;

    return `import ${formattedImports} from ${fromPart}`;
  }

  private isExternalLib(source: string, aliasPrefixes: string[]): boolean {
    return (
      !source.startsWith('.') &&
      !source.startsWith('/') &&
      !aliasPrefixes.some((p) => source.startsWith(p))
    );
  }

  private buildResult(
    lines: string[],
    startIdx: number,
    groups: ImportGroups
  ): string {
    const output: string[] = [];

    // Функция сортировки по длине строки
    const sortByLength = (a: string, b: string) => a.length - b.length;

    // 1. 'use client'/'use server' директивы (всегда первые)
    if (groups.directives.length) {
      output.push(groups.directives[0], '');
    }

    // 2. React импорты (без пустой строки между ними)
    if (groups.react.length) {
      output.push(...groups.react.sort(sortByLength));
    }

    // 3. Библиотеки (без пустой строки после React импортов)
    if (groups.libraries.length) {
      output.push(...groups.libraries.sort(sortByLength));
    }

    // 4. Абсолютные импорты (с пустой строкой)
    if (groups.absolute.length) {
      if (groups.react.length || groups.libraries.length) output.push('');
      output.push(...groups.absolute.sort(sortByLength));
    }

    // 5. Относительные импорты (с пустой строкой)
    if (groups.relative.length) {
      if (
        groups.react.length ||
        groups.libraries.length ||
        groups.absolute.length
      )
        output.push('');
      output.push(...groups.relative.sort(sortByLength));
    }

    // 6. Side effect импорты (без from) (с пустой строкой)
    if (groups.sideEffect.length) {
      if (
        groups.react.length ||
        groups.libraries.length ||
        groups.absolute.length ||
        groups.relative.length
      )
        output.push('');
      output.push(...groups.sideEffect.sort(sortByLength));
    }

    // 7. Стили (с пустой строкой)
    if (groups.styles.length) {
      if (
        groups.react.length ||
        groups.libraries.length ||
        groups.absolute.length ||
        groups.relative.length ||
        groups.sideEffect.length
      )
        output.push('');
      output.push(...groups.styles.sort(sortByLength));
    }

    // Добавляем пустую строку после импортов, если есть другой код
    const rest = lines.slice(startIdx).join('\n').trim();
    if (
      rest &&
      (groups.react.length ||
        groups.libraries.length ||
        groups.absolute.length ||
        groups.relative.length ||
        groups.sideEffect.length ||
        groups.styles.length)
    ) {
      output.push('');
    }

    if (rest) output.push(rest);

    return (
      output
        .join('\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim() + '\n'
    );
  }
}
