import type { Language, LanguageConfig } from '@/types';

export const LANGUAGES: LanguageConfig[] = [
  {
    id: 'python',
    label: 'Python',
    monacoId: 'python',
    judge0Id: 71,
    starterCode: `# Welcome to CodeCompass!
# Start writing your Python code here.

def greet(name):
    return f"Hello, {name}!"

print(greet("World"))
`,
  },
  {
    id: 'javascript',
    label: 'JavaScript',
    monacoId: 'javascript',
    judge0Id: 63,
    starterCode: `// Welcome to CodeCompass!
// Start writing your JavaScript code here.

function greet(name) {
  return \`Hello, \${name}!\`;
}

console.log(greet("World"));
`,
  },
  {
    id: 'java',
    label: 'Java',
    monacoId: 'java',
    judge0Id: 62,
    starterCode: `// Welcome to CodeCompass!
// Start writing your Java code here.

public class Main {
    public static void main(String[] args) {
        System.out.println(greet("World"));
    }

    static String greet(String name) {
        return "Hello, " + name + "!";
    }
}
`,
  },
  {
    id: 'cpp',
    label: 'C++',
    monacoId: 'cpp',
    judge0Id: 54,
    starterCode: `// Welcome to CodeCompass!
// Start writing your C++ code here.

#include <iostream>
#include <string>
using namespace std;

string greet(string name) {
    return "Hello, " + name + "!";
}

int main() {
    cout << greet("World") << endl;
    return 0;
}
`,
  },
];

export function getLanguageConfig(id: Language): LanguageConfig {
  const config = LANGUAGES.find((l) => l.id === id);
  if (!config) throw new Error(`Unknown language: ${id}`);
  return config;
}

export const LANGUAGE_MAP = Object.fromEntries(
  LANGUAGES.map((l) => [l.id, l])
) as Record<Language, LanguageConfig>;
