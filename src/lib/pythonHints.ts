import * as monaco from 'monaco-editor';

export function registerPythonInlayHints(monacoInstance: typeof monaco) {
  monacoInstance.languages.registerInlayHintsProvider("python", {
    provideInlayHints: (model, range, token) => {
      const text = model.getValue();
      
      // 1. Parse definitions
      const defs = new Map<string, string[]>();
      let currentClass = "";
      const lines = text.split('\n');
      for (const line of lines) {
        const classMatch = line.match(/^\s*class\s+([a-zA-Z_]\w*)/);
        if (classMatch) currentClass = classMatch[1];
        
        const defMatch = line.match(/^\s*def\s+([a-zA-Z_]\w*)\s*\(([^)]*)\)/);
        if (defMatch) {
          const name = defMatch[1];
          const rawArgs = defMatch[2];
          const args = rawArgs.split(',')
            .map(a => a.split('=')[0].split(':')[0].replace(/\*/g, '').trim())
            .filter(a => a !== 'self' && a !== 'cls' && a !== '');
          
          if (name === '__init__' && currentClass) {
            defs.set(currentClass, args);
          } else {
            defs.set(name, args);
          }
        }
      }

      const hints: monaco.languages.InlayHint[] = [];
      
      // 0. Debug hint to confirm provider is alive
      hints.push({
        position: { lineNumber: 1, column: 1 },
        label: "[AI: Active] ",
        kind: monacoInstance.languages.InlayHintKind.Parameter,
      });

      const calls = parseFunctionCalls(text, model);
      for (const call of calls) {
        if (!defs.has(call.name)) continue;
        const paramNames = defs.get(call.name)!;
        
        for (let i = 0; i < call.args.length && i < paramNames.length; i++) {
          const arg = call.args[i];
          // Skip if user already wrote `param=value`
          if (arg.text.match(/^[a-zA-Z_]\w*\s*=/)) {
            continue;
          }
          
          hints.push({
            position: arg.position,
            label: `${paramNames[i]}: `,
            kind: monacoInstance.languages.InlayHintKind.Parameter,
            paddingRight: false,
          });
        }
      }

      return {
        hints: hints,
        dispose: () => {}
      };
    }
  });
}

function parseFunctionCalls(text: string, model: monaco.editor.ITextModel) {
  const calls: { name: string; args: { text: string; position: monaco.Position }[] }[] = [];
  let i = 0;
  
  while (i < text.length) {
    if (text[i].match(/[a-zA-Z_]/)) {
      let start = i;
      while (i < text.length && text[i].match(/[a-zA-Z0-9_]/)) i++;
      const word = text.substring(start, i);
      
      let j = i;
      while (j < text.length && text[j].match(/\s/)) j++;
      if (j < text.length && text[j] === '(') {
        j++;
        const parsedArgs = parseArgs(text, j, model);
        if (parsedArgs) {
          calls.push({
            name: word,
            args: parsedArgs.args
          });
          // Also check inside arguments for nested function calls
          // The while loop naturally continues so we don't jump i to endIndex immediately
          // Or wait, if we don't jump, we parse nested correctly!
          // So we don't update i = parsedArgs.endIndex.
        }
      }
    } else {
      i++;
    }
  }
  return calls;
}

function parseArgs(text: string, startIndex: number, model: monaco.editor.ITextModel) {
  let depth = 1;
  let i = startIndex;
  let inString: string | null = null;
  let escape = false;
  
  const args: { text: string, position: monaco.Position }[] = [];
  let currentArgStart = i;
  
  while (i < text.length && depth > 0) {
    const c = text[i];
    if (inString) {
      if (escape) {
        escape = false;
      } else if (c === '\\') {
        escape = true;
      } else if (c === inString) {
        inString = null;
      }
    } else {
      if (c === '"' || c === "'") {
        inString = c;
      } else if (c === '(' || c === '[' || c === '{') {
        depth++;
      } else if (c === ')' || c === ']' || c === '}') {
        depth--;
        if (depth === 0) {
          const argText = text.substring(currentArgStart, i).trim();
          if (argText.length > 0) {
             const wsMatch = text.substring(currentArgStart, i).match(/^\s*/);
             const posOffset = currentArgStart + (wsMatch ? wsMatch[0].length : 0);
             args.push({ text: argText, position: model.getPositionAt(posOffset) });
          }
          break;
        }
      } else if (c === ',' && depth === 1) {
        const argText = text.substring(currentArgStart, i).trim();
        const wsMatch = text.substring(currentArgStart, i).match(/^\s*/);
        const posOffset = currentArgStart + (wsMatch ? wsMatch[0].length : 0);
        args.push({ text: argText, position: model.getPositionAt(posOffset) });
        currentArgStart = i + 1;
      }
    }
    i++;
  }
  
  if (depth === 0) {
    return { args, endIndex: i };
  }
  return null;
}
