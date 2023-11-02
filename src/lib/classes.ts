import * as vscode from "vscode";

export interface NodeProps {
    label: string;
    collapsibleState: vscode.TreeItemCollapsibleState;
    filePath?: string;
    lineNumber?: number;
    children?: Node[];
    description?: string;
    iconPath?: vscode.ThemeIcon | vscode.Uri | { dark: vscode.Uri, light: vscode.Uri };

}


export class Node extends vscode.TreeItem {
    children: Node[] = [];
    filePath?: string;
    lineNumber?: number;

    constructor(props: NodeProps) {
        super(props);
        this.iconPath = props.iconPath;  // Set iconPath property here
        this.description = props.description;
        this.tooltip = props.filePath;
        this.filePath = props.filePath;
        this.lineNumber = props.lineNumber;
        // force open
        this.collapsibleState = vscode.TreeItemCollapsibleState.Expanded;
        
    }
}



export interface NodeHandler {
    handle(dir: string): Promise<Node[]>; // changed return type to Promise
  }
  
