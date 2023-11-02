// handlers.ts
import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { Node, NodeHandler } from "../classes";

export class DirectoryHandler implements NodeHandler {
  private context: vscode.ExtensionContext;
  private handlers: Record<string, NodeHandler>;
  constructor(
    context: vscode.ExtensionContext,
    handlers: Record<string, NodeHandler>
  ) {
    this.context = context;
    this.handlers = handlers;
  }
  // DirectoryHandler
  async handle(dir: string): Promise<Node[]> {
    console.log("handle called with dir:", dir);
    const results: Node[] = [];

    if (fs.statSync(dir).isDirectory()) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          const iconFilePathDark = this.context.asAbsolutePath(
            path.join("resources", "icons", "light", "route.png")
          );
          const iconFilePathLight = this.context.asAbsolutePath(
            path.join("resources", "icons", "light", "route.png")
          );
          results.push(
            new Node({
              label: path.basename(fullPath),
              collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
              filePath: fullPath,
              iconPath: {
                dark: vscode.Uri.file(iconFilePathDark),
                light: vscode.Uri.file(iconFilePathLight),
              },
            })
          );
        } else if (entry.isFile()) {
          for (const pattern in this.handlers) {
            if (entry.name.includes(pattern)) {
              results.push(...(await this.handlers[pattern].handle(fullPath)));
              break;
            }
          }
        }
      }
    }
    console.log("handle returning results:", results);
    return results;
  }
}

type FileHandlerProps = {
  description?: string;
  icon?: string;
  iconFileName?: string;
};

export class FileHandler implements NodeHandler {
  private context: vscode.ExtensionContext;
  private props: FileHandlerProps;

  constructor(context: vscode.ExtensionContext, props: FileHandlerProps) {
    this.context = context;
    this.props = props;
  }

  async handle(fullPath: string): Promise<Node[]> {
    // remove the extension
    const fileName = path.basename(fullPath).replace(/\.[^/.]+$/, "");
    const folderName = path.basename(path.dirname(fullPath));
    let label = "";
    if (folderName === "routes") {
      label = `${fileName}`;
    } else {
      label = `↳ ${fileName}`;
    }

    let iconPath: { dark: vscode.Uri; light: vscode.Uri } | vscode.ThemeIcon;
    if (this.props.iconFileName) {
      const iconFilePathDark = this.context.asAbsolutePath(
        path.join("resources", "icons", "dark", this.props.iconFileName)
      );
      const iconFilePathLight = this.context.asAbsolutePath(
        path.join("resources", "icons", "light", this.props.iconFileName)
      );

      //   console.warn("Dark icon path:", iconFilePathDark);
      //   console.warn("Light icon path:", iconFilePathLight);

      iconPath = {
        dark: vscode.Uri.file(iconFilePathDark),
        light: vscode.Uri.file(iconFilePathLight),
      };
    } else {
      iconPath = new vscode.ThemeIcon(this.props.icon || "document");
    }

    return [
      new Node({
        label: label,
        collapsibleState: vscode.TreeItemCollapsibleState.None,
        filePath: fullPath,
        description: `${this.props.description ?? ""} (${folderName})`,
        iconPath,
      }),
    ];
  }
}

export class SveltePageHandler extends FileHandler {
  constructor(context: vscode.ExtensionContext) {
    super(context, { iconFileName: "page.png" });
  }
}

export class PageServerHandler extends FileHandler {
  constructor(context: vscode.ExtensionContext) {
    super(context, {
      description: "Page Server",
      iconFileName: "page-server.png",
    });
  }
}

export class PageTsHandler extends FileHandler {
  constructor(context: vscode.ExtensionContext) {
    super(context, { description: "Page.ts", iconFileName: "page-ts.png" });
  }
}

export class EndpointHandler extends FileHandler {
  constructor(context: vscode.ExtensionContext) {
    super(context, { description: "Endpoint", icon: "zap" });
  }
}

export class ServerHandler extends FileHandler {
  constructor(context: vscode.ExtensionContext) {
    super(context, { description: "Endpoint", iconFileName: "endpoint.png" });
  }

  async handle(fullPath: string): Promise<Node[]> {
    const nodes = await super.handle(fullPath);
    await this.addServerEndpoints(nodes[0], fullPath);
    return nodes;
  }

  private async addServerEndpoints(
    node: Node,
    fullPath: string
  ): Promise<void> {
    const document = await vscode.workspace.openTextDocument(fullPath);
    const symbols = await vscode.commands.executeCommand<
      vscode.SymbolInformation[]
    >("vscode.executeDocumentSymbolProvider", document.uri);

    console.log("Symbols:", symbols); // Add this line

    if (!symbols) {
      console.error("No symbols found for", fullPath);
      return;
    }

    const httpMethods = [
      "GET",
      "POST",
      "PUT",
      "DELETE",
      "PATCH",
      "HEAD",
      "OPTIONS",
    ];
    console.log(symbols[0].name, "symbols found for", fullPath);
    for (const symbol of symbols) {
      if (
        httpMethods.includes(symbol.name) &&
        (symbol.kind === vscode.SymbolKind.Function ||
          symbol.kind === vscode.SymbolKind.Constant ||
          symbol.kind === vscode.SymbolKind.Variable ||
          symbol.kind === vscode.SymbolKind.Method)
      ) {
        const endpointNode = new Node({
            label: `↳ ${symbol.name}`,
            collapsibleState: vscode.TreeItemCollapsibleState.None,
            filePath: fullPath,
            lineNumber: symbol.location.range.start.line + 1, // Store the line number separately
            description: "Endpoint",
            iconPath: new vscode.ThemeIcon("zap"),
          });
          
        node.children.push(endpointNode);
        console.log("Added endpoint to server node:", node);
      }
    }
    console.warn(node.children.length, "endpoints found for", fullPath);
  }
}

export class LayoutHandler extends FileHandler {
  constructor(context: vscode.ExtensionContext) {
    super(context, { description: "Layout", icon: "layout" });
  }
}

export class ErrorPageHandler extends FileHandler {
  constructor(context: vscode.ExtensionContext) {
    super(context, { description: "Error Page", icon: "error" });
  }
}
