const vscode = require('vscode');
const axios = require('axios');
const path = require('path');
const dotenv = require('dotenv');

// Load .env from the extension root directory
dotenv.config({ path: path.join(__dirname, './../.env') });

function activate(context) {
	const disposable = vscode.commands.registerCommand('command-generator.generate', async () => {
		const editor = vscode.window.activeTextEditor;

		if (!editor) {
			vscode.window.showWarningMessage('Open a file or select code to generate a command.');
			return;
		}

		const code = editor.selection.isEmpty
			? editor.document.getText()
			: editor.document.getText(editor.selection);

		if (!code.trim()) {
			vscode.window.showWarningMessage('No code found to analyze.');
			return;
		}

		// Show progress while generating command
		vscode.window.withProgress(
			{
				location: vscode.ProgressLocation.Notification,
				title: 'Generating command with AI...',
				cancellable: false
			},
			async (progress) => {
				try {
					progress.report({ increment: 30, message: "Contacting AI service..." });
					const cmd = await generateCommandWithAI(code);
					progress.report({ increment: 100, message: "Command generated!" });

					if (!cmd || !cmd.trim()) {
						vscode.window.showErrorMessage('AI did not return a valid command.');
						return;
					}

					// Clean up the command - remove any markdown code blocks
					const cleanCmd = cmd.replace(/```(?:bash|sh)?\s*|\s*```/g, '').trim();

					const action = await vscode.window.showQuickPick(
						['Run in Terminal', 'Copy to Clipboard', 'Insert into Editor'],
						{ placeHolder: `AI suggests: ${cleanCmd}` }
					);

					if (!action) return;

					if (action === 'Run in Terminal') {
						let terminal = vscode.window.terminals.find(t => t.name === 'AI Command') || vscode.window.createTerminal('AI Command');
						terminal.show();
						terminal.sendText(cleanCmd);
					} else if (action === 'Copy to Clipboard') {
						await vscode.env.clipboard.writeText(cleanCmd);
						vscode.window.showInformationMessage('Command copied to clipboard.');
					} else if (action === 'Insert into Editor') {
						await editor.edit(editBuilder => editBuilder.insert(editor.selection.active, cleanCmd));
					}

				} catch (err) {
					console.error('AI Command Generation Error:', err);

					if (err.response && err.response.status === 401) {
						vscode.window.showErrorMessage('Unauthorized: Check your API keys in .env file.');
					} else if (err.response && err.response.status === 429) {
						vscode.window.showErrorMessage('Rate limit exceeded: Try again later.');
					} else if (err.code === 'ENOTFOUND') {
						vscode.window.showErrorMessage('Network error: Could not reach AI service.');
					} else if (err.message.includes('insufficient_balance')) {
						vscode.window.showErrorMessage('API account has insufficient balance. Please add credits.');
					} else {
						vscode.window.showErrorMessage('Failed to generate command: ' + err.message);
					}
				}
			}
		);
	});

	context.subscriptions.push(disposable);
}

async function generateCommandWithAI(code) {
	const hfApiKey = process.env.HF_API_KEY;
	const groqApiKey = process.env.GROQ_API_KEY;
	const deepSeekApiKey = process.env.DEEPSEEK_API_KEY;

	if (!hfApiKey && !groqApiKey && !deepSeekApiKey) {
		throw new Error('No API keys found. Please add at least one API key to .env file.');
	}

	const prompt = `Analyze the following code and generate a safe shell command to run/test/build it. Respond ONLY with the command, no explanations:\n\n${code}`;

	// Try Hugging Face with a better model
	if (hfApiKey) {
		try {
			const response = await axios.post(
				'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.1',
				{
					inputs: prompt,
					parameters: {
						max_new_tokens: 100,
						temperature: 0.1,
						return_full_text: false
					}
				},
				{
					headers: {
						'Authorization': `Bearer ${hfApiKey}`,
						'Content-Type': 'application/json'
					},
					timeout: 25000
				}
			);

			if (response.data && response.data[0] && response.data[0].generated_text) {
				const result = response.data[0].generated_text.trim();
				if (result) return result;
			}
		} catch (hfError) {
			console.warn('Hugging Face API failed, trying next service...', hfError.message);
		}
	}

	// Try Groq with updated model
	if (groqApiKey) {
		try {
			const response = await axios.post(
				'https://api.groq.com/openai/v1/chat/completions',
				{
					model: 'llama-3.1-8b-instant', // Updated model
					messages: [{ role: 'user', content: prompt }],
					max_tokens: 100,
					temperature: 0.1
				},
				{
					headers: {
						'Authorization': `Bearer ${groqApiKey}`,
						'Content-Type': 'application/json'
					},
					timeout: 20000
				}
			);

			if (response.data?.choices?.[0]?.message?.content) {
				return response.data.choices[0].message.content.trim();
			}
		} catch (groqError) {
			console.warn('Groq API failed, trying DeepSeek...', groqError.message);
		}
	}

	// Try DeepSeek (check if balance issue is resolved)
	if (deepSeekApiKey) {
		try {
			const response = await axios.post(
				'https://api.deepseek.com/v1/chat/completions',
				{
					model: 'deepseek-chat',
					messages: [{ role: 'user', content: prompt }],
					max_tokens: 100,
					temperature: 0.1
				},
				{
					headers: {
						'Authorization': `Bearer ${deepSeekApiKey}`,
						'Content-Type': 'application/json'
					},
					timeout: 20000
				}
			);

			if (response.data?.choices?.[0]?.message?.content) {
				return response.data.choices[0].message.content.trim();
			}
		} catch (deepSeekError) {
			console.warn('DeepSeek API failed:', deepSeekError.message);
		}
	}

	// Fallback to OpenRouter (free, no API key needed)
	try {
		const response = await axios.post(
			'https://openrouter.ai/api/v1/chat/completions',
			{
				model: 'google/gemma-7b-it:free',
				messages: [{ role: 'user', content: prompt }],
				max_tokens: 100,
				temperature: 0.1
			},
			{
				headers: {
					'Content-Type': 'application/json',
					'HTTP-Referer': 'https://vscode-command-generator.com',
					'X-Title': 'VS Code Command Generator'
				},
				timeout: 20000
			}
		);

		if (response.data?.choices?.[0]?.message?.content) {
			return response.data.choices[0].message.content.trim();
		}
	} catch (openRouterError) {
		console.warn('OpenRouter failed:', openRouterError.message);
	}

	throw new Error('All AI services failed. Please check your API keys or try again later.');
}

function deactivate() { }

module.exports = { activate, deactivate };