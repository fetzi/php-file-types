'use strict';

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class Namespace
{
    private composerFile: string;
    private namespaces: Array<Object> = new Array<Object>();

    constructor() {
        this.composerFile = vscode.workspace.rootPath + path.sep + 'composer.json';

        fs.watchFile(this.composerFile, () => {
            this.loadNamespaces();
        });

        this.loadNamespaces();
    }

    private loadNamespaces()
    {
        if (fs.existsSync(this.composerFile)) {
            let buffer: Buffer = fs.readFileSync(this.composerFile);
            let data = JSON.parse(buffer.toString());

            if (data.hasOwnProperty('autoload') && data.autoload.hasOwnProperty('psr-4')) {
                this.addNamespaces(data.autoload['psr-4']);
            }
            
            if (data.hasOwnProperty('autoload-dev') && data['autoload-dev'].hasOwnProperty('psr-4')) {
                this.addNamespaces(data['autoload-dev']['psr-4']);
            }
        }
    }

    public getNamespace(filePath: string)
    {
        let relativePath = path.relative(vscode.workspace.rootPath, filePath);

        console.log(relativePath);
    }

    private addNamespaces(list)
    {
        for (let key in list) {
            this.namespaces.push({
                'folder': list[key],
                'namespace': key,
            });
        }
    }
}