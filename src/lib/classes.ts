import * as vscode from "vscode";

export interface NodeProps {
  label: string;
  collapsibleState: vscode.TreeItemCollapsibleState;
  filePath?: string;
  lineNumber?: number;
  children?: Node[];
  description?: string;
  iconPath?:
    | vscode.ThemeIcon
    | vscode.Uri
    | { dark: vscode.Uri; light: vscode.Uri };
  contextValue?: string;
}

export class Node extends vscode.TreeItem {
  children: Node[] = [];
  filePath?: string;
  lineNumber?: number;
  shouldHaveOpenAllSubItemsCommand?: boolean;

  constructor(props: NodeProps) {
    super(props);
    this.collapsibleState = props.collapsibleState;
    this.iconPath = props.iconPath; // Set iconPath property here
    this.description = props.description;
    this.tooltip = props.filePath;
    this.contextValue = props.contextValue;
    this.filePath = props.filePath;
    this.lineNumber = props.lineNumber;
    this.shouldHaveOpenAllSubItemsCommand = true;
    // force open
  }
}

export interface NodeHandler {
  handle(dir: string): Promise<Node[]>; // changed return type to Promise
}
