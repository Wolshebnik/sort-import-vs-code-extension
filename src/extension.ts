import * as vscode from 'vscode';
import { SortImportsProvider } from './sortImportsProvider';

export function activate(context: vscode.ExtensionContext) {
  console.log('Sort Imports extension is now active!');

  const provider = new SortImportsProvider();

  // Регистрируем команду для сортировки импортов
  const disposable = vscode.commands.registerCommand(
    'sortImports.sortImports',
    () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage('No active editor found');
        return;
      }

      const document = editor.document;
      const languageId = document.languageId;

      // Проверяем, что это JS/TS файл
      if (
        ![
          'javascript',
          'typescript',
          'javascriptreact',
          'typescriptreact',
        ].includes(languageId)
      ) {
        vscode.window.showErrorMessage(
          'Sort Imports only works with JavaScript and TypeScript files'
        );
        return;
      }

      try {
        provider.sortImports(editor);
        vscode.window.showInformationMessage('Imports sorted successfully!');
      } catch (error) {
        vscode.window.showErrorMessage(`Error sorting imports: ${error}`);
      }
    }
  );

  context.subscriptions.push(disposable);

  // Регистрируем провайдер форматирования (опционально)
  const formattingProvider =
    vscode.languages.registerDocumentFormattingEditProvider(
      ['javascript', 'typescript', 'javascriptreact', 'typescriptreact'],
      {
        provideDocumentFormattingEdits(
          document: vscode.TextDocument
        ): vscode.TextEdit[] {
          try {
            return provider.getFormattingEdits(document);
          } catch (error) {
            console.error('Error in formatting provider:', error);
            return [];
          }
        },
      }
    );

  context.subscriptions.push(formattingProvider);
}

export function deactivate() {
  console.log('Sort Imports extension is now deactivated!');
}
