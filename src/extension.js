const vscode = require('vscode');
const path = require('path');

function activate(context) {
	const disposable = vscode.commands.registerCommand('command-generator.generate', async () => {
		const editor = vscode.window.activeTextEditor;

		if (!editor) {
			vscode.window.showWarningMessage('Open a file to generate comments.');
			return;
		}

		const code = editor.selection.isEmpty
			? editor.document.getText()
			: editor.document.getText(editor.selection);

		if (!code.trim()) {
			vscode.window.showWarningMessage('No code found to analyze.');
			return;
		}

		try {
			// Generate comment based on code content
			const comment = generateComment(code);

			// Insert comment at the beginning of the selection or file
			const position = editor.selection.isEmpty
				? new vscode.Position(0, 0)
				: editor.selection.start;

			await editor.edit(editBuilder => {
				editBuilder.insert(position, comment + '\n\n');
			});

			vscode.window.showInformationMessage('Comment generated successfully!');

		} catch (err) {
			vscode.window.showErrorMessage('Failed to generate comment: ' + err.message);
		}
	});

	context.subscriptions.push(disposable);
}

function generateComment(code) {
	// Simple pattern matching to generate appropriate comments
	if (code.includes('function') && code.includes('add') && code.includes('+')) {
		return '// Addition Function 🎇';
	} else if (code.includes('function') && code.includes('subtract') && code.includes('-')) {
		return '// Subtraction Function ➖';
	} else if (code.includes('function') && code.includes('multiply') && code.includes('*')) {
		return '// Multiplication Function ✖️';
	} else if (code.includes('function') && code.includes('divide') && code.includes('/')) {
		return '// Division Function ➗';
	} else if (code.includes('function')) {
		return '// Function Definition 🚀';
	} else if (code.includes('class')) {
		return '// Class Definition 🏗️';
	} else if (code.includes('const') || code.includes('let') || code.includes('var')) {
		return '// Variable Declaration 📦';
	} else if (code.includes('if') || code.includes('else')) {
		return '// Conditional Logic 🤔';
	} else if (code.includes('for') || code.includes('while')) {
		return '// Loop Structure 🔄';
	} else {
		return '// Code Section 💻';
	}
}

function deactivate() { }

module.exports = { activate, deactivate };