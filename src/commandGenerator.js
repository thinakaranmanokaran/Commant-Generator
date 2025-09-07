const vscode = require('vscode');

class CommandGenerator {

    static generateCommandFromCode(selectedCode, language, filePath, lineNumber) {
        try {
            const fileName = filePath ? filePath.split(/[\\/]/).pop() : 'file';

            switch (language) {
                case 'javascript':
                case 'typescript':
                    return this.generateJavaScriptCommand(selectedCode, fileName);
                case 'python':
                    return this.generatePythonCommand(selectedCode, fileName);
                case 'java':
                    return this.generateJavaCommand(selectedCode, fileName, lineNumber);
                default:
                    return this.generateGenericCommand(selectedCode, fileName, lineNumber);
            }
        } catch (error) {
            return `# Error generating command: ${error}\n# Selected code:\n${selectedCode}`;
        }
    }

    static generateJavaScriptCommand(code, fileName) {
        const cleanCode = code.trim();

        // Function detection
        const functionRegex = /(async\s+)?function\s+(\w+)\s*\(([^)]*)\)/;
        const functionMatch = cleanCode.match(functionRegex);

        if (functionMatch) {
            const funcName = functionMatch[2];
            const params = functionMatch[3].split(',').map(p => p.trim()).filter(p => p);

            if (params.length === 0) {
                return `node -e "const result = require('./${fileName}').${funcName}(); console.log(result)"`;
            } else {
                return `# Function ${funcName} requires parameters: ${params.join(', ')}\n` +
                    `node -e "const mod = require('./${fileName}'); console.log(mod.${funcName}(...process.argv.slice(2)))" param1 param2`;
            }
        }

        // Arrow function detection
        const arrowFunctionRegex = /(const|let|var)\s+(\w+)\s*=\s*(async\s+)?\(([^)]*)\)\s*=>/;
        const arrowMatch = cleanCode.match(arrowFunctionRegex);

        if (arrowMatch) {
            const funcName = arrowMatch[2];
            return `node -e "console.log(require('./${fileName}').${funcName}())"`;
        }

        // Simple expression
        return `node -e "${cleanCode.replace(/"/g, '\\"').replace(/\n/g, '; ')}"`;
    }

    static generatePythonCommand(code, fileName) {
        const cleanCode = code.trim();

        // Function detection
        const functionMatch = cleanCode.match(/def\s+(\w+)\(([^)]*)\):/);
        if (functionMatch) {
            const funcName = functionMatch[1];
            const moduleName = fileName.replace('.py', '');
            return `python -c "import ${moduleName}; print(${moduleName}.${funcName}())"`;
        }

        // Simple Python code
        return `python -c "${cleanCode.replace(/"/g, '\\"').replace(/\n/g, '; ')}"`;
    }

    static generateJavaCommand(code, fileName, lineNumber) {
        return `# Java code at line ${lineNumber}\n` +
            `# Compile: javac ${fileName}\n` +
            `# Run: java ${fileName.replace('.java', '')}\n` +
            `# Selected code:\n${code}`;
    }

    static generateGenericCommand(code, fileName, lineNumber) {
        return `# Code from ${fileName}:${lineNumber}\n` +
            `# Execute appropriately for your environment\n` +
            `${code}`;
    }
}

module.exports = CommandGenerator;