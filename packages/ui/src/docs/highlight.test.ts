import { describe, expect, it } from 'vitest';
import { tokenize as tokenizeCore } from './highlight';
import { tokenize } from './highlight-all';

const samples: Record<string, string> = {
  ts: "import { cn } from '@ejm/ui';\nconst x: Band = f(1, 'a'); // note\n/* block */ export default async function Page() { return <Band tone=\"sage\" /> }",
  css: "@import \"@ejm/ui/styles.css\";\n.a { --x: #fff; margin: -0.5rem 2px; color: var(--ejm-fg); }\n/* c */ a:hover { }",
  sh: "# install\nnpm i -w packages/ui && node scripts/perf.mjs --json \"a b\"\n$HOME/bin | grep -v x",
  json: '{ "a": [1, 2.5, true, null], "b": "x" }',
  html: '<!-- c --><script src="/theme-boot.js"></script><a href="#x" class="y">t</a>',
  py: "import os\nfrom pathlib import Path\n@retry(3)\ndef run(x: int = 1) -> str:\n    \"\"\"doc\\nstring\"\"\"\n    return f\"{x}\" + 'a'  # note",
  ps1: "# install\nfunction Get-Thing { param([string]$Name)\n  Write-Host \"hi $Name\" -ForegroundColor Green\n  <# block #> $env:PATH }\nGet-ChildItem -Recurse 'a''b'",
  toml: "# config\n[package]\nname = \"ejm\" # c\n[[bin]]\npath = 'src/main.rs'\nversion = 3.14\ndate = 2026-10-18T10:00:00Z\nok = true\n  indented.key = 0x1F",
  rust: "use ratatui::Frame;\nfn main() -> Result<(), E> { let n = 3_u8; println!(\"hi\"); 'a' }",
};

describe('tokenize', () => {
  it.each(Object.keys(samples))('gives back the %s source exactly, so copying never depends on the spans', (lang) => {
    const code = samples[lang]!;
    expect(tokenize(code, lang).map((r) => r.text).join('')).toBe(code);
  });

  it('assigns the roles a reader expects', () => {
    const roles = (code: string, lang: string) => Object.fromEntries(tokenize(code, lang).filter((r) => r.role).map((r) => [r.text, r.role]));
    expect(roles("const a = f(1, 'x'); // hi", 'ts')).toMatchObject({ const: 'k', f: 'f', 1: 'n', "'x'": 's', '// hi': 'c' });
    expect(roles('a { --x: #fff; margin: 2px }', 'css')).toMatchObject({ '--x': 'p', '#fff': 'v', margin: 'p', '2px': 'n' });
    expect(roles('npm run dev --port 4874', 'sh')).toMatchObject({ npm: 'f', '--port': 'p' });
    expect(roles('{ "a": "b" }', 'json')).toMatchObject({ '"a"': 'p', '"b"': 's' });
  });

  it('reads Python, PowerShell and TOML', () => {
    const roles = (code: string, lang: string) => Object.fromEntries(tokenize(code, lang).filter((r) => r.role).map((r) => [r.text, r.role]));
    expect(roles('def run(x):\n    return f"{x}"  # hi\nNone', 'python')).toMatchObject({ def: 'k', run: 'f', return: 'k', 'f"{x}"': 's', '# hi': 'c', None: 'v' });
    expect(roles('@retry(3)\nclass Page: pass', 'py')).toMatchObject({ '@retry': 'm', Page: 't', class: 'k' });
    expect(roles('Get-Item -Path $env:HOME', 'powershell')).toMatchObject({ 'Get-Item': 'f', '-Path': 'p', '$env:HOME': 'v' });
    expect(roles('if ($a) { "x`"y" }', 'ps1')).toMatchObject({ if: 'k', $a: 'v', '"x`"y"': 's' });
    expect(roles('[package]\nname = "ejm"\nok = true', 'toml')).toMatchObject({ '[package]': 'k', name: 'p', '"ejm"': 's', ok: 'p', true: 'v' });
    expect(roles('a = 1\n  b.c = 2026-10-18', 'toml')).toMatchObject({ a: 'p', 1: 'n', 'b.c': 'p', '2026-10-18': 'n' });
  });

  it('keeps Python, PowerShell and TOML out of the core tokenizer, which the product views use', () => {
    expect(tokenizeCore('def run(): pass', 'python')).toEqual([{ text: 'def run(): pass' }]);
    expect(tokenize('def run(): pass', 'python').some((r) => r.role === 'k')).toBe(true);
  });

  it('leaves an unknown language as one plain run', () => {
    expect(tokenize('whatever 1 "x"', 'brainfuck')).toEqual([{ text: 'whatever 1 "x"' }]);
  });

  it('does not read digits inside names as numbers', () => {
    expect(tokenize('text-4xl h1 x2', 'css').some((r) => r.role === 'n')).toBe(false);
    expect(tokenize('const x2 = a1', 'ts').some((r) => r.role === 'n')).toBe(false);
  });
});
