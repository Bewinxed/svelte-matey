import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { Node, NodeHandler } from "./lib/classes";
import {
  DirectoryHandler,
  FileHandler,
  PageServerHandler,
  PageTsHandler,
  ServerHandler,
  SveltePageHandler,
} from "./lib/handlers/handler";

export class SvelteRoutesProvider implements vscode.TreeDataProvider<Node> {
  private readonly routesPath: string;
  private readonly workspaceRoot: string;
  private directoryHandler: DirectoryHandler;
  private context: vscode.ExtensionContext;
  

  constructor(context: vscode.ExtensionContext, workspaceRoot: string) {
    this.context = context;
    const handlers: Record<string, NodeHandler> = {
      "+page.svelte": new SveltePageHandler(context),
      "+page.server.ts": new PageServerHandler(context),
      "+page.ts": new PageTsHandler(context),
      "+server.ts": new ServerHandler(context),
    };

    this.workspaceRoot = workspaceRoot;
    this.routesPath = path.join(workspaceRoot, "src", "routes");
    this.directoryHandler = new DirectoryHandler(context, handlers);
  }

  getTreeItem(element: Node): vscode.TreeItem {
    if (element.filePath) {
      const uri = vscode.Uri.file(element.filePath);
      const range = element.lineNumber
        ? new vscode.Range(element.lineNumber - 1, 0, element.lineNumber - 1, 0)
        : new vscode.Range(0, 0, 0, 0);

      element.command = {
        command: "vscode.open",
        arguments: [uri, { selection: range }],
        title: "Open File",
      };
    }

    return element;
  }


  // SvelteRoutesProvider
  getChildren(element?: Node): Thenable<Node[]> {
    console.log('getChildren called with element:', element);
    if (!element) {
        return this.directoryHandler.handle(this.routesPath);
    }
    if (element.filePath && fs.statSync(element.filePath).isDirectory()) {
        return this.directoryHandler.handle(element.filePath).then(children => {
            console.log('getChildren returning children:', children);
            return children;
        });
    }
    const children = element ? element.children || [] : [];
    console.log('getChildren returning children:', children);
    return Promise.resolve(children);
}

}
