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
  private nodeIndex: Map<string, Node> = new Map();
  

  constructor(context: vscode.ExtensionContext, workspaceRoot: string) {
    this.context = context;
    const handlers: Record<string, NodeHandler> = {
      "+page.svelte": new SveltePageHandler(context),
      "+page.server.ts": new PageServerHandler(context),
      "+page.ts": new PageTsHandler(context),
      "+server.ts": new ServerHandler(context),
    };

    this.workspaceRoot = workspaceRoot;
    this.routesPath = path.join(workspaceRoot, "src");
    this.directoryHandler = new DirectoryHandler(context, handlers);

    const watcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(this.routesPath, "**/*")
    );
    // vscode.workspace.onDidChangeTextDocument(() => this.refresh());
    vscode.workspace.onDidCreateFiles(() => this.refresh());
    vscode.workspace.onDidRenameFiles(() => this.refresh());

    watcher.onDidCreate(() => this.refresh());
    watcher.onDidChange(() => this.refresh());
    watcher.onDidDelete(() => this.refresh());
    context.subscriptions.push(watcher);
    this.buildIndex(this.routesPath);
  }

  // Inside SvelteRoutesProvider class
  private async buildIndex(directoryPath: string): Promise<void> {
    const children = await this.directoryHandler.handle(directoryPath);
    for (const child of children) {
      if (!child.label) {
        continue;
      }
      const label =
        typeof child.label === "string" ? child.label : child.label.label;
      const childPath = path.join(directoryPath, label);
      this.nodeIndex.set(childPath, child);

      // If it's a directory, recursively build its index too
      if (child.filePath && fs.statSync(child.filePath).isDirectory()) {
        await this.buildIndex(child.filePath);
      }
    }
  }

  // Helper method to recursively search for a node
  private async findNodeInDirectory(
    directoryPath: string,
    filePath: string
  ): Promise<Node | null> {
    const children = await this.directoryHandler.handle(directoryPath);
    for (const child of children) {
      if (child.filePath === filePath) {
        return child;
      }
      if (child.filePath) {
        if (fs.statSync(child.filePath).isDirectory()) {
          const found = await this.findNodeInDirectory(
            child.filePath,
            filePath
          );
          if (found) {
            return found;
          }
        }
      }
    }
    return null;
  }

  getParent(element: Node): Thenable<Node | null> {
    // The root node's parent is null
    if (element.filePath === this.routesPath) {
      return Promise.resolve(null);
    }

    if (!element.filePath) {
      return Promise.resolve(null);
    }
    const parentPath = path.dirname(element.filePath);
    if (parentPath === this.workspaceRoot) {
      return Promise.resolve(null);
    }

    // To find the parent, we get the parent directory and search for the node with that path
    return this.findNodeByPath(parentPath);
  }

  // Method to find a node by its file path
  async findNodeByPath(filePath: string): Promise<Node | null> {
    return this.nodeIndex.get(filePath) || null;
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
    // If there's no element, it means we are at the root
    if (!element) {
      return Promise.resolve(Array.from(this.nodeIndex.values()));
    }

    // If the element is a directory, return its children by utilizing the nodeIndex
    if (element.filePath && fs.statSync(element.filePath).isDirectory()) {
      const children: Node[] = [];
      for (const [pathKey, nodeValue] of this.nodeIndex.entries()) {
        if (path.dirname(pathKey) === element.filePath) {
          children.push(nodeValue);
        }
      }
      return Promise.resolve(children);
    }

    // Otherwise, return the children property if it exists
    return Promise.resolve(element.children || []);
  }

  private _onDidChangeTreeData: vscode.EventEmitter<
    Node | undefined | null | void
  > = new vscode.EventEmitter<Node | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<Node | undefined | null | void> =
    this._onDidChangeTreeData.event;

  refresh(): void {
    this.nodeIndex.clear();
    this.buildIndex(this.routesPath).then(() => {
      this._onDidChangeTreeData.fire();
    });
  }
}
