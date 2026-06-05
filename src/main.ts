import './style.css';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

const term = new Terminal({
  cursorBlink: true,
  cols: 80,
  rows: 24,
  theme: {
    background: '#000000',
    foreground: '#00FF00',
    cursor: '#00FF00',
  },
  fontFamily: 'VT323, monospace',
  fontSize: 18,
});

const fitAddon = new FitAddon();
term.loadAddon(fitAddon);

const terminalElement = document.getElementById('terminal');
if (terminalElement) {
  term.open(terminalElement);
  fitAddon.fit();

  term.writeln('\x1b[1;32m*** ROG-O-MATIC WEB PORT INITIALIZED ***\x1b[0m');
  term.writeln('Waiting for WASM modules...');
  term.writeln('');
  term.write('CPU> ');
}

window.addEventListener('resize', () => {
  fitAddon.fit();
});
