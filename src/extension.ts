// The module 'vscode' contains the VS Code extensibility API

// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { SvelteRoutesProvider } from "./svelteRoutes";
import { Node } from "./lib/classes";

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "svelte-matey" is now active!');

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with registerCommand
  // The commandId parameter must match the command field in package.json
  let disposable = vscode.commands.registerCommand(
    "svelte-matey.helloWorld",
    () => {
      // The code you place here will be executed every time your command is executed
      // Display a message box to the user
      vscode.window.showInformationMessage("Hello World from svelte-matey!");
    }
  );

  context.subscriptions.push(disposable);
  const workspaceRoot = vscode.workspace.rootPath || ".";
  const provider = new SvelteRoutesProvider(context, workspaceRoot);
  const svelteRoutesView = vscode.window.createTreeView("svelteRoutes", {
    treeDataProvider: provider,
  });

  const revealCurrentFile = async (
    activeEditor: vscode.TextEditor | undefined
  ) => {
    if (!activeEditor) {
      return;
    }

    const activeDocument = activeEditor.document;
    const activeFilePath = activeDocument.uri.fsPath;

    const nodeToReveal = await provider.findNodeByPath(activeFilePath);
    if (nodeToReveal) {
      svelteRoutesView.reveal(nodeToReveal, {
        select: true,
        focus: false,
        expand: true,
      });
    }
  };

  // Event to handle when the active editor changes, such as opening a file or switching tabs.
  vscode.window.onDidChangeActiveTextEditor(
    revealCurrentFile,
    null,
    context.subscriptions
  );

  // Call once on start-up

  vscode.window.registerTreeDataProvider("svelteRoutes", provider);
  setTimeout(async () => {
    await revealCurrentFile(vscode.window.activeTextEditor);
  }, 100);

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "svelte-matey.openAllSubItems",
      async (node: Node) => {
        // Get the children of the node
        const children = await provider.getChildren(node);

        // Open each child
        for (const child of children) {
          if (child.filePath) {
            const uri = vscode.Uri.file(child.filePath);
            await vscode.commands.executeCommand("vscode.open", uri);
          }
        }
      }
    )
  );
}

// This method is called when your extension is deactivated
export function deactivate() {}
