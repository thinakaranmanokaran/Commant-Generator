const vscode = require('vscode');
const axios = require('axios');

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
			vscode.window.showWarningMessage('No code selected to analyze.');
			return;
		}

		await vscode.window.withProgress(
			{
				location: vscode.ProgressLocation.Notification,
				title: "Generating AI Comment...",
				cancellable: false
			},
			async () => {
				try {
					const prompt = `You are a smart code assistant.
1. Detect the programming language of the following code.
2. Generate exactly ONE single-line comment using the correct syntax for that language (//, #, <!-- -->, etc.).
3. The comment should describe the code in plain English + add 1-2 fitting emojis.
4. Do not output the code again.
5. Do NOT include language blocks like \`\`\`javascript or \`\`\`python — only the comment line.

Code:
${code}`;

					const response = await axios.get("https://ai-bl64.onrender.com/", {
						params: { text: prompt },
						timeout: 60000 // prevent hanging forever
					});

					let comment = response.data?.trim() || "// Could not generate comment";

					// Remove accidental code fences
					comment = comment.replace(/```[\s\S]*?```/g, "").trim();

					const firstLine = comment.split("\n")[0];

					const position = editor.selection.isEmpty
						? new vscode.Position(0, 0)
						: editor.selection.start;

					await editor.edit(editBuilder => {
						editBuilder.insert(position, firstLine + '\n\n');
					});

					vscode.window.showInformationMessage('AI Comment generated successfully! ✅');
				} catch (err) {
					if (err.message.includes("Network Error") || err.code === "ENOTFOUND") {
						vscode.window.showErrorMessage("Internet connection required 🌐. Please check your network.");
					} else if (err.code === "ECONNABORTED") {
						vscode.window.showErrorMessage("Server took too long ⏳. Try again in a moment or increase timeout.");
					} else {
						vscode.window.showErrorMessage('Failed to generate comment: ' + err.message);
					}
				}
			}
		);
	});

	context.subscriptions.push(disposable);
}

function deactivate() { }

module.exports = { activate, deactivate };
