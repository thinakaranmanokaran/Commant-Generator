const vscode = require('vscode');
const CommandGenerator = require('./commandGenerator');

function activate(context) {
    console.log('Command Generator extension is now active!');

    // Register the command with the correct name that matches package.json
    let disposable = vscode.commands.registerCommand('command-generator.generateCommand', function () {
        const editor = vscode.window.activeTextEditor;
        
        if (!editor) {
            vscode.window.showErrorMessage('No active editor found!');
            return;
        }

        const selection = editor.selection;
        if (selection.isEmpty) {
            vscode.window.showErrorMessage('Please select some code first!');
            return;
        }

        const selectedText = editor.document.getText(selection);
        const language = editor.document.languageId;
        const filePath = editor.document.fileName;
        const lineNumber = selection.start.line + 1;

        try {
            const command = CommandGenerator.generateCommandFromCode(
                selectedText, 
                language, 
                filePath, 
                lineNumber
            );

            // Show quick pick options
            showCommandOptions(command, editor, selection);
            
        } catch (error) {
            vscode.window.showErrorMessage(`Error generating command: ${error}`);
        }
    });

    context.subscriptions.push(disposable);
}

function showCommandOptions(command, editor, selection) {
    vscode.window.showQuickPick([
        {
            label: '$(clippy) Copy to clipboard',
            description: 'Copy the generated command to clipboard'
        },
        {
            label: '$(comment) Insert as comment',
            description: 'Insert the command as a comment above the code'
        },
        {
            label: '$(output) Show in output panel',
            description: 'Display the command in output panel'
        }
    ], {
        placeHolder: 'Choose what to do with the generated command'
    }).then(choice => {
        if (!choice) return;

        switch (choice.label) {
            case '$(clippy) Copy to clipboard':
                vscode.env.clipboard.writeText(command);
                vscode.window.showInformationMessage('✓ Command copied to clipboard!');
                break;
                
            case '$(comment) Insert as comment':
                insertCommandAsComment(editor, command, selection.start.line);
                break;
                
            case '$(output) Show in output panel':
                showCommandInOutputPanel(command);
                break;
        }
    });
}

function insertCommandAsComment(editor, command, lineNumber) {
    const edit = new vscode.WorkspaceEdit();
    const position = new vscode.Position(lineNumber, 0);
    
    // Get appropriate comment syntax based on language
    const language = editor.document.languageId;
    let commentPrefix = '// ';
    
    if (language === 'python') {
        commentPrefix = '# ';
    } else if (language === 'html' || language === 'xml') {
        commentPrefix = '<!-- ';
        const commentSuffix = ' -->';
        const commandLines = command.split('\n').map(line => 
            `${commentPrefix}${line}${commentSuffix}\n`
        ).join('');
        edit.insert(editor.document.uri, position, commandLines);
    } else {
        const commandLines = command.split('\n').map(line => 
            `${commentPrefix}${line}\n`
        ).join('');
        edit.insert(editor.document.uri, position, commandLines);
    }

    vscode.workspace.applyEdit(edit).then(success => {
        if (success) {
            vscode.window.showInformationMessage('✓ Command inserted as comment!');
        } else {
            vscode.window.showErrorMessage('Failed to insert command');
        }
    });
}

function showCommandInOutputPanel(command) {
    const outputChannel = vscode.window.createOutputChannel('Command Generator');
    outputChannel.show();
    outputChannel.appendLine('=== GENERATED COMMAND ===');
    outputChannel.appendLine(command);
    outputChannel.appendLine('\n=== USAGE ===');
    outputChannel.appendLine('1. Copy the command above');
    outputChannel.appendLine('2. Paste it into your terminal');
    outputChannel.appendLine('3. Press Enter to execute');
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};