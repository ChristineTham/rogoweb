// include: shell.js
// include: minimum_runtime_check.js
(function() {
  // "30.0.0" -> 300000
  function humanReadableVersionToPacked(str) {
    str = str.split('-')[0]; // Remove any trailing part from e.g. "12.53.3-alpha"
    var vers = str.split('.').slice(0, 3);
    while(vers.length < 3) vers.push('00');
    vers = vers.map((n, i, arr) => n.padStart(2, '0'));
    return vers.join('');
  }
  // 300000 -> "30.0.0"
  var packedVersionToHumanReadable = n => [n / 10000 | 0, (n / 100 | 0) % 100, n % 100].join('.');

  var TARGET_NOT_SUPPORTED = 2147483647;

  // Note: We use a typeof check here instead of optional chaining using
  // globalThis because older browsers might not have globalThis defined.
  var currentNodeVersion = typeof process !== 'undefined' && process.versions?.node ? humanReadableVersionToPacked(process.versions.node) : TARGET_NOT_SUPPORTED;
  if (currentNodeVersion < 180300) {
    throw new Error(`This emscripten-generated code requires node v${ packedVersionToHumanReadable(180300) } (detected v${packedVersionToHumanReadable(currentNodeVersion)})`);
  }

  var userAgent = typeof navigator !== 'undefined' && navigator.userAgent;
  if (!userAgent) {
    return;
  }

  var currentSafariVersion = userAgent.includes("Safari/") && !userAgent.includes("Chrome/") && userAgent.match(/Version\/(\d+\.?\d*\.?\d*)/) ? humanReadableVersionToPacked(userAgent.match(/Version\/(\d+\.?\d*\.?\d*)/)[1]) : TARGET_NOT_SUPPORTED;
  if (currentSafariVersion < 150000) {
    throw new Error(`This emscripten-generated code requires Safari v${ packedVersionToHumanReadable(150000) } (detected v${currentSafariVersion})`);
  }

  var currentFirefoxVersion = userAgent.match(/Firefox\/(\d+(?:\.\d+)?)/) ? parseFloat(userAgent.match(/Firefox\/(\d+(?:\.\d+)?)/)[1]) : TARGET_NOT_SUPPORTED;
  if (currentFirefoxVersion < 79) {
    throw new Error(`This emscripten-generated code requires Firefox v79 (detected v${currentFirefoxVersion})`);
  }

  var currentChromeVersion = userAgent.match(/Chrome\/(\d+(?:\.\d+)?)/) ? parseFloat(userAgent.match(/Chrome\/(\d+(?:\.\d+)?)/)[1]) : TARGET_NOT_SUPPORTED;
  if (currentChromeVersion < 85) {
    throw new Error(`This emscripten-generated code requires Chrome v85 (detected v${currentChromeVersion})`);
  }
})();

// end include: minimum_runtime_check.js
// The Module object: Our interface to the outside world. We import
// and export values on it. There are various ways Module can be used:
// 1. Not defined. We create it here
// 2. A function parameter, function(moduleArg) => Promise<Module>
// 3. pre-run appended it, var Module = {}; ..generated code..
// 4. External script tag defines var Module.
// We need to check if Module already exists (e.g. case 3 above).
// Substitution will be replaced with actual code on later stage of the build,
// this way Closure Compiler will not mangle it (e.g. case 4. above).
// Note that if you want to run closure, and also to use Module
// after the generated code, you will need to define   var Module = {};
// before the code. Then that object will be used in the code, and you
// can continue to use Module afterwards as well.
var Module = typeof Module != 'undefined' ? Module : {};

// Determine the runtime environment we are in. You can customize this by
// setting the ENVIRONMENT setting at compile time (see settings.js).

// Attempt to auto-detect the environment
var ENVIRONMENT_IS_WEB = !!globalThis.window;
var ENVIRONMENT_IS_WORKER = !!globalThis.WorkerGlobalScope;
// N.b. Electron.js environment is simultaneously a NODE-environment, but
// also a web environment.
var ENVIRONMENT_IS_NODE = globalThis.process?.versions?.node && globalThis.process?.type != 'renderer';
var ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;

// --pre-jses are emitted after the Module integration code, so that they can
// refer to Module (if they choose; they can also define Module)
// include: ../../emcurses/emscripten/termlib.js
/*
  termlib.js - JS-WebTerminal Object v1.63

  (c) Norbert Landsteiner 2003-2013
  mass:werk - media environments
  <http://www.masswerk.at/termlib/>

  Creates [multiple] Terminal instances.

  Synopsis:

  myTerminal = new Terminal(<config object>);
  myTerminal.open();

  <config object> overrides any values of object `TerminalDefaults'.
  individual values of `id' must be supplied for multiple terminals.
  `handler' specifies a function to be called for input handling.
  (see `Terminal.prototype.defaultHandler()' and documentation.)

  globals defined in this library:
  	Terminal           (Terminal object)
    TerminalDefaults   (default configuration)
    termDefaultHandler (default command line handler)
    TermGlobals        (common vars and code for all instances)
    termKey            (named mappings for special keys)
    termDomKeyRef      (special key mapping for DOM constants)

  (please see the v. 1.4 history entry on these elements)

  required CSS classes for font definitions: ".term", ".termReverse".

  Compatibilty:
  Standard web browsers with a JavaScript implementation compliant to
  ECMA-262 2nd edition and support for the anonymous array and object
  constructs and the anonymous function construct in the form of
  "myfunc=function(x) {}" (c.f. ECMA-262 3rd edion for details).
  This comprises almost all current browsers but Konquerer (khtml) and
  versions of Apple Safari for Mac OS 10.0-10.28 (Safari 1.0) which
  lack support for keyboard events.
  v1.5: Dropped support of Netscape 4 (layers)

  License:
  This JavaScript-library is free.
  Include a visible backlink to <http://www.masswerk.at/termlib/> in the
  embedding web page or application.
  The library should always be accompanied by the 'readme.txt' and the
  sample HTML-documents.
  
  Any changes should be commented and must be reflected in `Terminal.version'
  in the format: "Version.Subversion (compatibility)".
  
  Donations:
  Donations are welcome: You may support and/or honor the development of
  "termlib.js" via PayPal at: <http://www.masswerk.at/termlib/donate/>

  Disclaimer:
  This software is distributed AS IS and in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. The entire risk as to
  the quality and performance of the product is borne by the user. No use of
  the product is authorized hereunder except under this disclaimer.

  ### The sections above must not be removed. ###
  
  version 1.01: added Terminal.prototype.resizeTo(x,y)
                added Terminal.conf.fontClass (=> configureable class name)
                Terminal.prototype.open() now checks for element conf.termDiv
                in advance and returns success.

  version 1.02: added support for <TAB> and Euro sign
                (Terminal.conf.printTab, Terminal.conf.printEuro)
                and a method to evaluate printable chars:
                Terminal.prototype.isPrintable(keycode)

  version 1.03: added global keyboard locking (TermGlobals.keylock)
                modified Terminal.prototype.redraw for speed (use of locals)

  version 1.04: modified the key handler to fix a bug with MSIE5/Mac
                fixed a bug in TermGlobals.setVisible with older MSIE-alike
                browsers without DOM support.

  version 1.05: added config flag historyUnique.
 
  version 1.06: fixed CTRl+ALT (Windows alt gr) isn't CTRL any more
                fixed double backspace bug for Safari;
                added TermGlobals.setDisplay for setting style.display props
                termlib.js now outputs lower case html (xhtml compatibility)

  version 1.07: added method rebuild() to rebuild with new color settings.

  version 1.1:  fixed a bug in 'more' output mode (cursor could be hidden after
                quit)
                added socket-extension for server-client talk in a separate file
                -> "temlib_socket.js" (to be loaded after termlib.js)
                (this is a separate file because we break our compatibility
                guide lines with this IO/AJAX library.)

  version 1.2   added color support ("%[+-]c(<color>)" markup)
                moved paste support from sample file to lib
                * TermGlobals.insertText( <text>)
                * TermGlobals.importEachLine( <text> )
                * TermGlobals.importMultiLine( <text> )

  version 1.3   added word wrapping to write()
                * activate with myTerm.wrapOn()
                * deactivate with myTerm.wrapOff()
                use conf.wrapping (boolean) for a global setting

  version 1.4   Terminal is now an entirely self-contained object
                Global references to inner objects for backward compatipility:
                * TerminalDefaults   => Terminal.prototype.Defaults
                * termDefaultHandler => Terminal.prototype.defaultHandler
                * termKey            => Terminal.prototype.globals.termKey
                                        see also: Terminal.prototype.termKey
                * TermGlobals        => Terminal.prototype.globals
                * termDomKeyRef      => Terminal.prototype.globals.termDomKeyRef

                So in effect to outside scripts everything remains the same;
                no need to rewrite any existing scripts.
                You may now use "this.globals" inside any handlers
                to refer to the static global object (TermGlobals).
                You may also refer to key definitions as "this.termKey.*".
                (Please mind that "this.termKey" is a reference to the static object
                and not specific to the instance. A change to "this.termKey" will be
                by any other instances of Terminal too.)
                
                Added method TermGlobals.assignStyle() for custom styles & mark up.
                
                Unified the color mark up: You may now use color codes (decimal or hex)
                inside brackets. e.g.: %c(10)DARKRED%c() or %c(a)DARKRED%c()
                
                Added key repeat for remapped keys (cursor movements etc).

  version 1.41  fixed a bug in the word wrapping regarding write() output, when
                the cursor was set with cursorSet() before.

  version 1.42  fixed a bug which caused Opera to delete 2 chars at once.
                introduced property Terminal.isOpera (Boolean)

  version 1.43  enhanced the control handler so it also catches ESC if flag closeOnESC
                is set to false. fixed a bug with Safari which fired repeated events
                for the control handler for TAB if flag printTab was set to false.

  version 1.5   Changed the license.
                Dropped support for Netscape 4 (layers).
                HTML-elements are now created by document.createElement, if applicable.
                Included the formerly separate socket extension in the main library.
                Added methods 'backupScreen()' and 'restoreScreen()' to save a screen
                and restore it's content from backup. (see the globbing sample).

  version 1.51  Added basic support of ANSI-SGR-sequences.

  version 1.52  Added method swapBackup(), reorganized some of the accompanying files.

  version 1.54  Fixed BACK_SPACE for Chrome, DELETE for Safari/WebKit.

  version 1.55  Fixed dead keys issue for Mac OS (Leapard & later), vowels only.
  version 1.56  Fixed new ESC issue for Safari.
  version 1.57  Fixed dead keys fix: now only for Safari/Mac, German (de-de).
  version 1.59  Dropped dead keys fix, fixed backspace for Safari.
  version 1.6   Saved some bytes by discarding traces of ancient condition syntax
                Added input mode "fieldMode"
  version 1.61  Changes to defaults implementation of the constructor.
  version 1.62  Fixed a bug related to AltGr-sequences with IE8+.

*/

var Terminal = function (conf) {
  if (typeof conf != 'object') conf = new Object();
  for (var i in this.Defaults) {
    if (typeof conf[i] == 'undefined') conf[i] = this.Defaults[i];
  }
  if (typeof conf.handler != 'function') conf.handler = Terminal.prototype.defaultHandler;
  this.conf = conf;
  this.setInitValues();
};

Terminal.prototype = {
  // prototype definitions (save some 2k on indentation)

  version: '1.62 (original)',

  Defaults: {
    // dimensions
    cols: 80,
    rows: 24,
    // appearance
    x: 100,
    y: 100,
    termDiv: 'termDiv',
    bgColor: '#181818',
    frameColor: '#555555',
    frameWidth: 1,
    rowHeight: 15,
    blinkDelay: 500,
    // css class
    fontClass: 'term',
    // initial cursor mode
    crsrBlinkMode: false,
    crsrBlockMode: true,
    // key mapping
    DELisBS: false,
    printTab: true,
    printEuro: true,
    catchCtrlH: true,
    closeOnESC: true,
    // prevent consecutive history doublets
    historyUnique: false,
    // optional id
    id: 0,
    // strings
    ps: '>',
    greeting: '%+r Terminal ready. %-r',
    // handlers
    handler: null,
    ctrlHandler: null,
    initHandler: null,
    exitHandler: null,
    wrapping: false,
    mapANSI: false,
    ANSItrueBlack: false,
  },

  setInitValues: function () {
    this.isSafari =
      navigator.userAgent.indexOf('Safari') >= 0 || navigator.userAgent.indexOf('WebKit') >= 0
        ? true
        : false;
    this.isOpera = window.opera && navigator.userAgent.indexOf('Opera') >= 0 ? true : false;
    this.isChrome =
      navigator.userAgent.indexOf('Chrome/') >= 0 && navigator.userAgent.indexOf('WebKit') >= 0
        ? true
        : false;
    this.domAPI = document && document.createElement ? true : false;
    this.isMac = navigator.userAgent.indexOf('Mac') >= 0 ? true : false;
    this.id = this.conf.id;
    this.maxLines = this.conf.rows;
    this.maxCols = this.conf.cols;
    this.termDiv = this.conf.termDiv;
    this.crsrBlinkMode = this.conf.crsrBlinkMode;
    this.crsrBlockMode = this.conf.crsrBlockMode;
    this.blinkDelay = this.conf.blinkDelay;
    this.DELisBS = this.conf.DELisBS;
    this.printTab = this.conf.printTab;
    this.printEuro = this.conf.printEuro;
    this.catchCtrlH = this.conf.catchCtrlH;
    this.closeOnESC = this.conf.closeOnESC;
    this.historyUnique = this.conf.historyUnique;
    this.ps = this.conf.ps;
    this.closed = false;
    this.r;
    this.c;
    this.charBuf = new Array();
    this.styleBuf = new Array();
    this.scrollBuf = null;
    this.blinkBuffer = 0;
    this.blinkTimer;
    this.cursoractive = false;
    this.lock = true;
    this.insert = false;
    this.charMode = false;
    this.rawMode = false;
    this.lineBuffer = '';
    this.inputChar = 0;
    this.lastLine = '';
    this.guiCounter = 0;
    this.history = new Array();
    this.histPtr = 0;
    this.env = new Object();
    this.buckupBuffer = null;
    this.handler = this.conf.handler;
    this.wrapping = this.conf.wrapping;
    this.mapANSI = this.conf.mapANSI;
    this.ANSItrueBlack = this.conf.ANSItrueBlack;
    this.ctrlHandler = this.conf.ctrlHandler;
    this.initHandler = this.conf.initHandler;
    this.exitHandler = this.conf.exitHandler;
    this.fieldMode = false;
    this.fieldStart = this.fieldEnd = this.fieldC = 0;
  },

  defaultHandler: function () {
    this.newLine();
    if (this.lineBuffer != '') {
      this.type('You typed: ' + this.lineBuffer);
      this.newLine();
    }
    this.prompt();
  },

  open: function () {
    if (this.termDivReady()) {
      if (!this.closed) this._makeTerm();
      this.init();
      return true;
    } else {
      return false;
    }
  },

  close: function () {
    this.lock = true;
    this.cursorOff();
    if (this.exitHandler) this.exitHandler();
    this.globals.setVisible(this.termDiv, 0);
    this.closed = true;
  },

  init: function () {
    // wait for gui
    if (this.guiReady()) {
      this.guiCounter = 0;
      // clean up at re-entry
      if (this.closed) {
        this.setInitValues();
      }
      this.clear();
      this.globals.setVisible(this.termDiv, 1);
      this.globals.enableKeyboard(this);
      if (this.initHandler) {
        this.initHandler();
      } else {
        this.write(this.conf.greeting);
        this.newLine();
        this.prompt();
      }
    } else {
      this.guiCounter++;
      if (this.guiCounter > 18000) {
        if (confirm("Terminal:\nYour browser hasn't responded for more than 2 minutes.\nRetry?")) {
          this.guiCounter = 0;
        } else {
          return;
        }
      }
      this.globals.termToInitialze = this;
      window.setTimeout('Terminal.prototype.globals.termToInitialze.init()', 200);
    }
  },

  getRowArray: function (l, v) {
    // returns a fresh array of l length initialized with value v
    var a = new Array();
    for (var i = 0; i < l; i++) a[i] = v;
    return a;
  },

  wrapOn: function () {
    // activate word wrap, wrapping workes with write() only!
    this.wrapping = true;
  },

  wrapOff: function () {
    this.wrapping = false;
  },

  // main output methods

  type: function (text, style) {
    for (var i = 0; i < text.length; i++) {
      var ch = text.charCodeAt(i);
      if (!this.isPrintable(ch)) ch = 94;
      this.charBuf[this.r][this.c] = ch;
      this.styleBuf[this.r][this.c] = style ? style : 0;
      var last_r = this.r;
      this._incCol();
      if (this.r != last_r) this.redraw(last_r);
    }
    this.redraw(this.r);
  },

  write: function (text, usemore) {
    // write to scroll buffer with markup
    // new line = '%n' prepare any strings or arrys first
    if (typeof text != 'object') {
      if (typeof text != 'string') text = '' + text;
      if (text.indexOf('\n') >= 0) {
        var ta = text.split('\n');
        text = ta.join('%n');
      }
    } else {
      if (text.join) {
        text = text.join('%n');
      } else {
        text = '' + text;
      }
      if (text.indexOf('\n') >= 0) {
        var ta = text.split('\n');
        text = ta.join('%n');
      }
    }
    if (this.mapANSI) text = this.globals.ANSI_map(text, this.ANSItrueBlack);
    this._sbInit(usemore);
    var chunks = text.split('%');
    var esc = text.charAt(0) != '%';
    var style = 0;
    var styleMarkUp = this.globals.termStyleMarkup;
    for (var i = 0; i < chunks.length; i++) {
      if (esc) {
        if (chunks[i].length > 0) {
          this._sbType(chunks[i], style);
        } else if (i > 0) {
          this._sbType('%', style);
        }
        esc = false;
      } else {
        var func = chunks[i].charAt(0);
        if (chunks[i].length == 0 && i > 0) {
          this._sbType('%', style);
          esc = true;
        } else if (func == 'n') {
          this._sbNewLine(true);
          if (chunks[i].length > 1) this._sbType(chunks[i].substring(1), style);
        } else if (func == '+') {
          var opt = chunks[i].charAt(1);
          opt = opt.toLowerCase();
          if (opt == 'p') {
            style = 0;
          } else if (styleMarkUp[opt]) {
            style |= styleMarkUp[opt];
          }
          if (chunks[i].length > 2) this._sbType(chunks[i].substring(2), style);
        } else if (func == '-') {
          var opt = chunks[i].charAt(1);
          opt = opt.toLowerCase();
          if (opt == 'p') {
            style = 0;
          } else if (styleMarkUp[opt]) {
            style &= ~styleMarkUp[opt];
          }
          if (chunks[i].length > 2) this._sbType(chunks[i].substring(2), style);
        } else if (chunks[i].length > 1 && func == 'c') {
          var cinfo = this._parseColor(chunks[i].substring(1));
          style = (style & ~0xfffff0) | cinfo.style;
          if (cinfo.rest) this._sbType(cinfo.rest, style);
        } else if (
          chunks[i].length > 1 &&
          chunks[i].charAt(0) == 'C' &&
          chunks[i].charAt(1) == 'S'
        ) {
          this.clear();
          this._sbInit();
          if (chunks[i].length > 2) this._sbType(chunks[i].substring(2), style);
        } else {
          if (chunks[i].length > 0) this._sbType(chunks[i], style);
        }
      }
    }
    this._sbOut();
  },

  // parse a color markup
  _parseColor: function (chunk) {
    var rest = '';
    var style = 0;
    if (chunk.length) {
      if (chunk.charAt(0) == '(') {
        var clabel = '';
        for (var i = 1; i < chunk.length; i++) {
          var c = chunk.charAt(i);
          if (c == ')') {
            if (chunk.length > i) rest = chunk.substring(i + 1);
            break;
          }
          clabel += c;
        }
        if (clabel) {
          if (clabel.charAt(0) == '@') {
            var sc = this.globals.nsColors[clabel.substring(1).toLowerCase()];
            if (sc) style = (16 + sc) * 0x100;
          } else if (clabel.charAt(0) == '#') {
            var cl = clabel.substring(1).toLowerCase();
            var sc = this.globals.webColors[cl];
            if (sc) {
              style = sc * 0x10000;
            } else {
              cl = this.globals.webifyColor(cl);
              if (cl) style = this.globals.webColors[cl] * 0x10000;
            }
          } else if (clabel.length && clabel.length <= 2) {
            var isHex = false;
            for (var i = 0; i < clabel.length; i++) {
              if (this.globals.isHexOnlyChar(clabel.charAt(i))) {
                isHex = true;
                break;
              }
            }
            var cl = isHex ? parseInt(clabel, 16) : parseInt(clabel, 10);
            if (!isNaN(cl) || cl <= 15) {
              style = cl * 0x100;
            }
          } else {
            style = this.globals.getColorCode(clabel) * 0x100;
          }
        }
      } else {
        var c = chunk.charAt(0);
        if (this.globals.isHexChar(c)) {
          style = this.globals.hexToNum[c] * 0x100;
          rest = chunk.substring(1);
        } else {
          rest = chunk;
        }
      }
    }
    return { rest: rest, style: style };
  },

  // internal scroll buffer output methods

  _sbInit: function (usemore) {
    var sb = (this.scrollBuf = new Object());
    var sbl = (sb.lines = new Array());
    var sbs = (sb.styles = new Array());
    sb.more = usemore;
    sb.line = 0;
    sb.status = 0;
    sb.r = 0;
    sb.c = this.c;
    sbl[0] = this.getRowArray(this.conf.cols, 0);
    sbs[0] = this.getRowArray(this.conf.cols, 0);
    for (var i = 0; i < this.c; i++) {
      sbl[0][i] = this.charBuf[this.r][i];
      sbs[0][i] = this.styleBuf[this.r][i];
    }
  },

  _sbType: function (text, style) {
    // type to scroll buffer
    var sb = this.scrollBuf;
    for (var i = 0; i < text.length; i++) {
      var ch = text.charCodeAt(i);
      if (!this.isPrintable(ch)) ch = 94;
      sb.lines[sb.r][sb.c] = ch;
      sb.styles[sb.r][sb.c++] = style ? style : 0;
      if (sb.c >= this.maxCols) this._sbNewLine();
    }
  },

  _sbNewLine: function (forced) {
    var sb = this.scrollBuf;
    if (this.wrapping && forced) {
      sb.lines[sb.r][sb.c] = 10;
      sb.lines[sb.r].length = sb.c + 1;
    }
    sb.r++;
    sb.c = 0;
    sb.lines[sb.r] = this.getRowArray(this.conf.cols, 0);
    sb.styles[sb.r] = this.getRowArray(this.conf.cols, 0);
  },

  _sbWrap: function () {
    // create a temp wrap buffer wb and scan for words/wrap-chars
    // then re-asign lines & styles to scrollBuf
    var wb = new Object();
    wb.lines = new Array();
    wb.styles = new Array();
    wb.lines[0] = this.getRowArray(this.conf.cols, 0);
    wb.styles[0] = this.getRowArray(this.conf.cols, 0);
    wb.r = 0;
    wb.c = 0;
    var sb = this.scrollBuf;
    var sbl = sb.lines;
    var sbs = sb.styles;
    var ch, st, wrap, lc, ls;
    var l = this.c;
    var lastR = 0;
    var lastC = 0;
    wb.cBreak = false;
    for (var r = 0; r < sbl.length; r++) {
      lc = sbl[r];
      ls = sbs[r];
      for (var c = 0; c < lc.length; c++) {
        ch = lc[c];
        st = ls[c];
        if (ch) {
          var wrap = this.globals.wrapChars[ch];
          if (ch == 10) wrap = 1;
          if (wrap) {
            if (wrap == 2) {
              l++;
            } else if (wrap == 4) {
              l++;
              lc[c] = 45;
            }
            this._wbOut(wb, lastR, lastC, l);
            if (ch == 10) {
              this._wbIncLine(wb);
            } else if (wrap == 1 && wb.c < this.maxCols) {
              wb.lines[wb.r][wb.c] = ch;
              wb.styles[wb.r][wb.c++] = st;
              if (wb.c >= this.maxCols) this._wbIncLine(wb);
            }
            if (wrap == 3) {
              lastR = r;
              lastC = c;
              l = 1;
            } else {
              l = 0;
              lastR = r;
              lastC = c + 1;
              if (lastC == lc.length) {
                lastR++;
                lastC = 0;
              }
              if (wrap == 4) wb.cBreak = true;
            }
          } else {
            l++;
          }
        } else {
          continue;
        }
      }
    }
    if (l) {
      if (wb.cBreak && wb.c != 0) wb.c--;
      this._wbOut(wb, lastR, lastC, l);
    }
    sb.lines = wb.lines;
    sb.styles = wb.styles;
    sb.r = wb.r;
    sb.c = wb.c;
  },

  _wbOut: function (wb, br, bc, l) {
    // copy a word (of l length from br/bc) to wrap buffer wb
    var sb = this.scrollBuf;
    var sbl = sb.lines;
    var sbs = sb.styles;
    var ofs = 0;
    var lc, ls;
    if (l + wb.c > this.maxCols) {
      if (l < this.maxCols) {
        this._wbIncLine(wb);
      } else {
        var i0 = 0;
        ofs = this.maxCols - wb.c;
        lc = sbl[br];
        ls = sbs[br];
        while (true) {
          for (var i = i0; i < ofs; i++) {
            wb.lines[wb.r][wb.c] = lc[bc];
            wb.styles[wb.r][wb.c++] = ls[bc++];
            if (bc == sbl[br].length) {
              bc = 0;
              br++;
              lc = sbl[br];
              ls = sbs[br];
            }
          }
          this._wbIncLine(wb);
          if (l - ofs < this.maxCols) break;
          i0 = ofs;
          ofs += this.maxCols;
        }
      }
    } else if (wb.cBreak) {
      wb.c--;
    }
    lc = sbl[br];
    ls = sbs[br];
    for (var i = ofs; i < l; i++) {
      wb.lines[wb.r][wb.c] = lc[bc];
      wb.styles[wb.r][wb.c++] = ls[bc++];
      if (bc == sbl[br].length) {
        bc = 0;
        br++;
        lc = sbl[br];
        ls = sbs[br];
      }
    }
    wb.cBreak = false;
  },

  _wbIncLine: function (wb) {
    // create a new line in temp buffer
    wb.r++;
    wb.c = 0;
    wb.lines[wb.r] = this.getRowArray(this.conf.cols, 0);
    wb.styles[wb.r] = this.getRowArray(this.conf.cols, 0);
  },

  _sbOut: function () {
    var sb = this.scrollBuf;
    if (this.wrapping && !sb.status) this._sbWrap();
    var sbl = sb.lines;
    var sbs = sb.styles;
    var tcb = this.charBuf;
    var tsb = this.styleBuf;
    var ml = this.maxLines;
    var buflen = sbl.length;
    if (sb.more) {
      if (sb.status) {
        if (this.inputChar == this.globals.lcMoreKeyAbort) {
          this.r = ml - 1;
          this.c = 0;
          tcb[this.r] = this.getRowArray(this.conf.cols, 0);
          tsb[this.r] = this.getRowArray(this.conf.cols, 0);
          this.redraw(this.r);
          this.handler = sb.handler;
          this.charMode = false;
          this.inputChar = 0;
          this.scrollBuf = null;
          this.prompt();
          return;
        } else if (this.inputChar == this.globals.lcMoreKeyContinue) {
          this.clear();
        } else {
          return;
        }
      } else {
        if (this.r >= ml - 1) this.clear();
      }
    }
    if (this.r + buflen - sb.line <= ml) {
      for (var i = sb.line; i < buflen; i++) {
        var r = this.r + i - sb.line;
        tcb[r] = sbl[i];
        tsb[r] = sbs[i];
        this.redraw(r);
      }
      this.r += sb.r - sb.line;
      this.c = sb.c;
      if (sb.more) {
        if (sb.status) this.handler = sb.handler;
        this.charMode = false;
        this.inputChar = 0;
        this.scrollBuf = null;
        this.prompt();
        return;
      }
    } else if (sb.more) {
      ml--;
      if (sb.status == 0) {
        sb.handler = this.handler;
        this.handler = this._sbOut;
        this.charMode = true;
        sb.status = 1;
      }
      if (this.r) {
        var ofs = ml - this.r;
        for (var i = sb.line; i < ofs; i++) {
          var r = this.r + i - sb.line;
          tcb[r] = sbl[i];
          tsb[r] = sbs[i];
          this.redraw(r);
        }
      } else {
        var ofs = sb.line + ml;
        for (var i = sb.line; i < ofs; i++) {
          var r = this.r + i - sb.line;
          tcb[r] = sbl[i];
          tsb[r] = sbs[i];
          this.redraw(r);
        }
      }
      sb.line = ofs;
      this.r = ml;
      this.c = 0;
      this.type(this.globals.lcMorePrompt1, this.globals.lcMorePromtp1Style);
      this.type(this.globals.lcMorePrompt2, this.globals.lcMorePrompt2Style);
      this.lock = false;
      return;
    } else if (buflen >= ml) {
      var ofs = buflen - ml;
      for (var i = 0; i < ml; i++) {
        var r = ofs + i;
        tcb[i] = sbl[r];
        tsb[i] = sbs[r];
        this.redraw(i);
      }
      this.r = ml - 1;
      this.c = sb.c;
    } else {
      var dr = ml - buflen;
      var ofs = this.r - dr;
      for (var i = 0; i < dr; i++) {
        var r = ofs + i;
        for (var c = 0; c < this.maxCols; c++) {
          tcb[i][c] = tcb[r][c];
          tsb[i][c] = tsb[r][c];
        }
        this.redraw(i);
      }
      for (var i = 0; i < buflen; i++) {
        var r = dr + i;
        tcb[r] = sbl[i];
        tsb[r] = sbs[i];
        this.redraw(r);
      }
      this.r = ml - 1;
      this.c = sb.c;
    }
    this.scrollBuf = null;
  },

  // basic console output

  typeAt: function (r, c, text, style) {
    var tr1 = this.r;
    var tc1 = this.c;
    this.cursorSet(r, c);
    for (var i = 0; i < text.length; i++) {
      var ch = text.charCodeAt(i);
      if (!this.isPrintable(ch)) ch = 94;
      this.charBuf[this.r][this.c] = ch;
      this.styleBuf[this.r][this.c] = style ? style : 0;
      var last_r = this.r;
      this._incCol();
      if (this.r != last_r) this.redraw(last_r);
    }
    this.redraw(this.r);
    this.r = tr1;
    this.c = tc1;
  },

  statusLine: function (text, style, offset) {
    var ch, r;
    style = style && !isNaN(style) ? parseInt(style) & 15 : 0;
    if (offset && offset > 0) {
      r = this.conf.rows - offset;
    } else {
      r = this.conf.rows - 1;
    }
    for (var i = 0; i < this.conf.cols; i++) {
      if (i < text.length) {
        ch = text.charCodeAt(i);
        if (!this.isPrintable(ch)) ch = 94;
      } else {
        ch = 0;
      }
      this.charBuf[r][i] = ch;
      this.styleBuf[r][i] = style;
    }
    this.redraw(r);
  },

  printRowFromString: function (r, text, style) {
    var ch;
    style = style && !isNaN(style) ? parseInt(style) & 15 : 0;
    if (r >= 0 && r < this.maxLines) {
      if (typeof text != 'string') text = '' + text;
      for (var i = 0; i < this.conf.cols; i++) {
        if (i < text.length) {
          ch = text.charCodeAt(i);
          if (!this.isPrintable(ch)) ch = 94;
        } else {
          ch = 0;
        }
        this.charBuf[r][i] = ch;
        this.styleBuf[r][i] = style;
      }
      this.redraw(r);
    }
  },

  setChar: function (ch, r, c, style) {
    this.charBuf[r][c] = ch;
    this.styleBuf[r][c] = style ? style : 0;
    this.redraw(r);
  },

  newLine: function () {
    this.c = 0;
    this._incRow();
  },

  // internal methods for output

  _charOut: function (ch, style) {
    this.charBuf[this.r][this.c] = ch;
    this.styleBuf[this.r][this.c] = style ? style : 0;
    this.redraw(this.r);
    this._incCol();
  },

  _incCol: function () {
    this.c++;
    if (this.c >= this.maxCols) {
      this.c = 0;
      this._incRow();
    }
  },

  _incRow: function () {
    this.r++;
    if (this.r >= this.maxLines) {
      this._scrollLines(0, this.maxLines);
      this.r = this.maxLines - 1;
    }
  },

  _scrollLines: function (start, end) {
    window.status = 'Scrolling lines ...';
    start++;
    for (var ri = start; ri < end; ri++) {
      var rt = ri - 1;
      this.charBuf[rt] = this.charBuf[ri];
      this.styleBuf[rt] = this.styleBuf[ri];
    }
    // clear last line
    var rt = end - 1;
    this.charBuf[rt] = this.getRowArray(this.conf.cols, 0);
    this.styleBuf[rt] = this.getRowArray(this.conf.cols, 0);
    this.redraw(rt);
    for (var r = end - 1; r >= start; r--) this.redraw(r - 1);
    window.status = '';
  },

  // control methods

  clear: function () {
    window.status = 'Clearing display ...';
    this.cursorOff();
    this.insert = false;
    for (var ri = 0; ri < this.maxLines; ri++) {
      this.charBuf[ri] = this.getRowArray(this.conf.cols, 0);
      this.styleBuf[ri] = this.getRowArray(this.conf.cols, 0);
      this.redraw(ri);
    }
    this.r = 0;
    this.c = 0;
    window.status = '';
  },

  reset: function () {
    if (this.lock) return;
    this.lock = true;
    this.rawMode = false;
    this.charMode = false;
    this.maxLines = this.conf.rows;
    this.maxCols = this.conf.cols;
    this.lastLine = '';
    this.lineBuffer = '';
    this.inputChar = 0;
    this.clear();
  },

  prompt: function () {
    this.lock = true;
    if (this.c > 0) this.newLine();
    this.type(this.ps);
    this._charOut(1);
    this.lock = false;
    this.cursorOn();
  },

  isPrintable: function (ch, unicodePage1only) {
    if (this.wrapping && this.globals.wrapChars[ch] == 4) return true;
    if (unicodePage1only && ch > 255) {
      return ch == this.termKey.EURO && this.printEuro ? true : false;
    }
    return (ch >= 32 && ch != this.termKey.DEL) || (this.printTab && ch == this.termKey.TAB);
  },

  // cursor methods

  cursorSet: function (r, c) {
    var crsron = this.cursoractive;
    if (crsron) this.cursorOff();
    this.r = r % this.maxLines;
    this.c = c % this.maxCols;
    this._cursorReset(crsron);
  },

  cursorOn: function () {
    if (this.blinkTimer) clearTimeout(this.blinkTimer);
    this.blinkBuffer = this.styleBuf[this.r][this.c];
    this._cursorBlink();
    this.cursoractive = true;
  },

  cursorOff: function () {
    if (this.blinkTimer) clearTimeout(this.blinkTimer);
    if (this.cursoractive) {
      this.styleBuf[this.r][this.c] = this.blinkBuffer;
      this.redraw(this.r);
      this.cursoractive = false;
    }
  },

  cursorLeft: function () {
    var crsron = this.cursoractive;
    if (crsron) this.cursorOff();
    var r = this.r;
    var c = this.c;
    if (c > 0) {
      c--;
    } else if (r > 0) {
      c = this.maxCols - 1;
      r--;
    }
    if (this.isPrintable(this.charBuf[r][c])) {
      this.r = r;
      this.c = c;
    }
    this.insert = true;
    this._cursorReset(crsron);
  },

  cursorRight: function () {
    var crsron = this.cursoractive;
    if (crsron) this.cursorOff();
    var r = this.r;
    var c = this.c;
    if (c < this.maxCols - 1) {
      c++;
    } else if (r < this.maxLines - 1) {
      c = 0;
      r++;
    }
    if (!this.isPrintable(this.charBuf[r][c])) {
      this.insert = false;
    }
    if (this.isPrintable(this.charBuf[this.r][this.c])) {
      this.r = r;
      this.c = c;
    }
    this._cursorReset(crsron);
  },

  backspace: function () {
    var crsron = this.cursoractive;
    if (crsron) this.cursorOff();
    var r = this.r;
    var c = this.c;
    if (c > 0) c--;
    else if (r > 0) {
      c = this.maxCols - 1;
      r--;
    }
    if (this.isPrintable(this.charBuf[r][c])) {
      this._scrollLeft(r, c);
      this.r = r;
      this.c = c;
    }
    this._cursorReset(crsron);
  },

  fwdDelete: function () {
    var crsron = this.cursoractive;
    if (crsron) this.cursorOff();
    if (this.isPrintable(this.charBuf[this.r][this.c])) {
      this._scrollLeft(this.r, this.c);
      if (!this.isPrintable(this.charBuf[this.r][this.c])) this.insert = false;
    }
    this._cursorReset(crsron);
  },

  _cursorReset: function (crsron) {
    if (crsron) {
      this.cursorOn();
    } else {
      this.blinkBuffer = this.styleBuf[this.r][this.c];
    }
  },

  _cursorBlink: function () {
    if (this.blinkTimer) clearTimeout(this.blinkTimer);
    if (this == this.globals.activeTerm) {
      if (this.crsrBlockMode) {
        this.styleBuf[this.r][this.c] =
          this.styleBuf[this.r][this.c] & 1
            ? this.styleBuf[this.r][this.c] & 0xfffffe
            : this.styleBuf[this.r][this.c] | 1;
      } else {
        this.styleBuf[this.r][this.c] =
          this.styleBuf[this.r][this.c] & 2
            ? this.styleBuf[this.r][this.c] & 0xffffd
            : this.styleBuf[this.r][this.c] | 2;
      }
      this.redraw(this.r);
    }
    if (this.crsrBlinkMode)
      this.blinkTimer = setTimeout(
        'Terminal.prototype.globals.activeTerm._cursorBlink()',
        this.blinkDelay,
      );
  },

  _scrollLeft: function (r, c) {
    var rows = new Array();
    rows[0] = r;
    while (this.isPrintable(this.charBuf[r][c])) {
      var ri = r;
      var ci = c + 1;
      if (ci == this.maxCols) {
        if (ri < this.maxLines - 1) {
          ci = 0;
          ri++;
          rows[rows.length] = ri;
        } else {
          break;
        }
      }
      this.charBuf[r][c] = this.charBuf[ri][ci];
      this.styleBuf[r][c] = this.styleBuf[ri][ci];
      c = ci;
      r = ri;
    }
    if (this.charBuf[r][c] != 0) this.charBuf[r][c] = 0;
    for (var i = 0; i < rows.length; i++) this.redraw(rows[i]);
  },

  _scrollRight: function (r, c) {
    var rows = new Array();
    var end = this._getLineEnd(r, c);
    var ri = end[0];
    var ci = end[1];
    if (ci == this.maxCols - 1 && ri == this.maxLines - 1) {
      if (r == 0) return;
      this._scrollLines(0, this.maxLines);
      this.r--;
      r--;
      ri--;
    }
    rows[r] = 1;
    while (this.isPrintable(this.charBuf[ri][ci])) {
      var rt = ri;
      var ct = ci + 1;
      if (ct == this.maxCols) {
        ct = 0;
        rt++;
        rows[rt] = 1;
      }
      this.charBuf[rt][ct] = this.charBuf[ri][ci];
      this.styleBuf[rt][ct] = this.styleBuf[ri][ci];
      if (ri == r && ci == c) break;
      ci--;
      if (ci < 0) {
        ci = this.maxCols - 1;
        ri--;
        rows[ri] = 1;
      }
    }
    for (var i = r; i < this.maxLines; i++) {
      if (rows[i]) this.redraw(i);
    }
  },

  _getLineEnd: function (r, c) {
    if (!this.isPrintable(this.charBuf[r][c])) {
      c--;
      if (c < 0) {
        if (r > 0) {
          r--;
          c = this.maxCols - 1;
        } else {
          c = 0;
        }
      }
    }
    if (this.isPrintable(this.charBuf[r][c])) {
      while (true) {
        var ri = r;
        var ci = c + 1;
        if (ci == this.maxCols) {
          if (ri < this.maxLines - 1) {
            ri++;
            ci = 0;
          } else {
            break;
          }
        }
        if (!this.isPrintable(this.charBuf[ri][ci])) break;
        c = ci;
        r = ri;
      }
    }
    return [r, c];
  },

  _getLineStart: function (r, c) {
    // not used by now, just in case anyone needs this ...
    var ci, ri;
    if (!this.isPrintable(this.charBuf[r][c])) {
      ci = c - 1;
      ri = r;
      if (ci < 0) {
        if (ri == 0) return [0, 0];
        ci = this.maxCols - 1;
        ri--;
      }
      if (!this.isPrintable(this.charBuf[ri][ci])) {
        return [r, c];
      } else {
        r = ri;
        c = ci;
      }
    }
    while (true) {
      var ri = r;
      var ci = c - 1;
      if (ci < 0) {
        if (ri == 0) break;
        ci = this.maxCols - 1;
        ri--;
      }
      if (!this.isPrintable(this.charBuf[ri][ci])) break;
      r = ri;
      c = ci;
    }
    return [r, c];
  },

  _getLine: function (adjustCrsrPos) {
    var end = this._getLineEnd(this.r, this.c);
    var r = end[0];
    var c = end[1];
    if (adjustCrsrPos && (this.r != r || this.c != c + 1)) {
      this.r = r;
      this.c = c + 1;
      if (this.c >= this.maxCols) this.c = this.maxCols - 1;
    }
    var line = new Array();
    while (this.isPrintable(this.charBuf[r][c])) {
      line[line.length] = String.fromCharCode(this.charBuf[r][c]);
      if (c > 0) {
        c--;
      } else if (r > 0) {
        c = this.maxCols - 1;
        r--;
      } else {
        break;
      }
    }
    line.reverse();
    return line.join('');
  },

  _clearLine: function () {
    var end = this._getLineEnd(this.r, this.c);
    var r = end[0];
    var c = end[1];
    var line = '';
    while (this.isPrintable(this.charBuf[r][c])) {
      this.charBuf[r][c] = 0;
      if (c > 0) {
        c--;
      } else if (r > 0) {
        this.redraw(r);
        c = this.maxCols - 1;
        r--;
      } else {
        break;
      }
    }
    if (r != end[0]) this.redraw(r);
    c++;
    this.cursorSet(r, c);
    this.insert = false;
  },

  // backup/restore screen & state

  backupScreen: function () {
    var backup = (this.backupBuffer = new Object());
    var rl = this.conf.rows;
    var cl = this.conf.cols;
    backup.cbuf = new Array(rl);
    backup.sbuf = new Array(rl);
    backup.maxCols = this.maxCols;
    backup.maxLines = this.maxLines;
    backup.r = this.r;
    backup.c = this.c;
    backup.charMode = this.charMode;
    backup.rawMode = this.rawMode;
    backup.handler = this.handler;
    backup.ctrlHandler = this.ctrlHandler;
    backup.cursoractive = this.cursoractive;

    backup.crsrBlinkMode = this.crsrBlinkMode;
    backup.crsrBlockMode = this.crsrBlockMode;
    backup.blinkDelay = this.blinkDelay;
    backup.DELisBS = this.DELisBS;
    backup.printTab = this.printTab;
    backup.printEuro = this.printEuro;
    backup.catchCtrlH = this.catchCtrlH;
    backup.closeOnESC = this.closeOnESC;
    backup.historyUnique = this.historyUnique;
    backup.ps = this.ps;
    backup.lineBuffer = this.lineBuffer;
    backup.inputChar = this.inputChar;
    backup.lastLine = this.lastLine;
    backup.historyLength = this.history.length;
    backup.histPtr = this.histPtr;
    backup.wrapping = this.wrapping;
    backup.mapANSI = this.mapANSI;
    backup.ANSItrueBlack = this.ANSItrueBlack;
    if (this.cursoractive) this.cursorOff();
    for (var r = 0; r < rl; r++) {
      var cbr = this.charBuf[r];
      var sbr = this.styleBuf[r];
      var tcbr = (backup.cbuf[r] = new Array(cl));
      var tsbr = (backup.sbuf[r] = new Array(cl));
      for (var c = 0; c < cl; c++) {
        tcbr[c] = cbr[c];
        tsbr[c] = sbr[c];
      }
    }
  },

  restoreScreen: function () {
    var backup = this.backupBuffer;
    if (!backup) return;
    var rl = this.conf.rows;
    for (var r = 0; r < rl; r++) {
      this.charBuf[r] = backup.cbuf[r];
      this.styleBuf[r] = backup.sbuf[r];
      this.redraw(r);
    }
    this.maxCols = backup.maxCols;
    this.maxLines = backup.maxLines;
    this.r = backup.r;
    this.c = backup.c;
    this.charMode = backup.charMode;
    this.rawMode = backup.rawMode;
    this.handler = backup.handler;
    this.ctrlHandler = backup.ctrlHandler;
    this.cursoractive = backup.cursoractive;
    this.crsrBlinkMode = backup.crsrBlinkMode;
    this.crsrBlockMode = backup.crsrBlockMode;
    this.blinkDelay = backup.blinkDelay;
    this.DELisBS = backup.DELisBS;
    this.printTab = backup.printTab;
    this.printEuro = backup.printEuro;
    this.catchCtrlH = backup.catchCtrlH;
    this.closeOnESC = backup.closeOnESC;
    this.historyUnique = backup.historyUnique;
    this.ps = backup.ps;
    this.lineBuffer = backup.lineBuffer;
    this.inputChar = backup.inputChar;
    this.lastLine = backup.lastLine;
    if (this.history.length > backup.historyLength) {
      this.history.length = backup.historyLength;
      this.histPtr = backup.histPtr;
    }
    this.wrapping = backup.wrapping;
    this.mapANSI = backup.mapANSI;
    this.ANSItrueBlack = backup.ANSItrueBlack;
    if (this.cursoractive) this.cursorOn();
    this.backupBuffer = null;
  },

  swapBackup: function () {
    // swap current state and backup buffer (e.g.: toggle do/undo)
    var backup = this.backupBuffer;
    this.backupScreen;
    if (backup) {
      var backup2 = this.backupBuffer;
      this.backupBuffer = backup;
      this.restoreScreen();
      this.backupBuffer = backup2;
    }
  },

  // simple markup escaping

  escapeMarkup: function (t) {
    return t.replace(/%/g, '%%');
  },

  // field mode

  enterFieldMode: function (start, end, style) {
    this.cursorOff();
    if (start === undefined || start < 0) start = this.c;
    if (end === undefined || end < start || end > this.maxCols) end = this.maxCols;
    if (!style) style = 0;
    this.fieldStart = start;
    this.fieldEnd = end;
    this.fieldStyle = style;
    this.fieldC = 0;
    this.lastLine = '';
    this.fieldMode = true;
    this.rawMode = this.charMode = false;
    if (style & 1) {
      this._crsrWasBlockMode = this.crsrBlockMode;
      this._crsrWasBlinkMode = this.crsrBlinkMode;
      this.crsrBlockMode = false;
      this.crsrBlinkMode = true;
    }
    this.drawField();
    this.lock = false;
  },

  exitFieldMode: function () {
    this.drawField(true);
    this.fieldMode = false;
    this.c = this.fieldEnd;
    if (this.c == this.maxLine) this.newLine();
    this.lock = true;
  },

  drawField: function (isfinal) {
    this.cursorOff();
    if (isfinal) this.fieldC = 0;
    var fl = this.fieldEnd - this.fieldStart;
    if (this.fieldC == this.lastLine.length) fl--;
    var ofs = this.fieldC - fl;
    if (ofs < 0) ofs = 0;
    var line = ofs ? this.lastLine.substring(ofs) : this.lastLine;
    var sb = this.styleBuf[this.r];
    var cb = this.charBuf[this.r];
    var max = line.length;
    for (var i = this.fieldStart, k = 0; i < this.fieldEnd; i++, k++) {
      sb[i] = this.fieldStyle;
      cb[i] = k < max ? line.charCodeAt(k) : 0;
    }
    this.redraw(this.r);
    if (isfinal) {
      if (this.fieldStyle & 1) {
        this.crsrBlockMode = this._crsrWasBlockMode;
        this.crsrBlinkMode = this._crsrWasBlinkMode;
        delete this._crsrWasBlockMode;
        delete this._crsrWasBlinkMode;
      }
    } else {
      this.c = this.fieldStart + this.fieldC - ofs;
      this.cursorOn();
    }
  },

  // keyboard focus

  focus: function () {
    this.globals.setFocus(this);
  },

  // a inner reference (just for comfort) to be mapped to Terminal.prototype.globals.termKey
  termKey: null,

  // GUI related methods

  _makeTerm: function (rebuild) {
    window.status = 'Building terminal ...';
    var divPrefix = this.termDiv + '_r';
    if (this.domAPI) {
      // if applicable we're using createElement
      this.globals.hasSubDivs = false;
      var td, row, table, tbody, table2, tbody2, tr, td, node;
      table = document.createElement('table');
      table.setAttribute('border', 0);
      table.setAttribute('cellSpacing', 0);
      table.setAttribute('cellPadding', this.conf.frameWidth);
      tbody = document.createElement('tbody');
      table.appendChild(tbody);
      row = document.createElement('tr');
      tbody.appendChild(row);
      ptd = document.createElement('td');
      ptd.style.backgroundColor = this.conf.frameColor;
      row.appendChild(ptd);
      table2 = document.createElement('table');
      table2.setAttribute('border', 0);
      table2.setAttribute('cellSpacing', 0);
      table2.setAttribute('cellPadding', 2);
      tbody2 = document.createElement('tbody');
      table2.appendChild(tbody2);
      tr = document.createElement('tr');
      tbody2.appendChild(tr);
      td = document.createElement('td');
      td.style.backgroundColor = this.conf.bgColor;
      tr.appendChild(td);
      ptd.appendChild(table2);
      ptd = td;
      table2 = document.createElement('table');
      table2.setAttribute('border', 0);
      table2.setAttribute('cellSpacing', 0);
      table2.setAttribute('cellPadding', 0);
      tbody2 = document.createElement('tbody');
      table2.appendChild(tbody2);
      var rstr = '';
      for (var c = 0; c < this.conf.cols; c++) rstr += '&nbsp;';
      for (var r = 0; r < this.conf.rows; r++) {
        tr = document.createElement('tr');
        td = document.createElement('td');
        td.id = divPrefix + r;
        td.style.height = td.style.minHeight = td.style.maxHeight = this.conf.rowHeight;
        td.style.whiteSpace = 'nowrap';
        td.className = this.conf.fontClass;
        td.innerHTML = rstr;
        tr.appendChild(td);
        tbody2.appendChild(tr);
      }
      ptd.appendChild(table2);
      node = document.getElementById(this.termDiv);
      while (node.hasChildNodes()) node.removeChild(node.firstChild);
      node.appendChild(table);
    } else {
      // legacy code
      this.globals.hasSubDivs = navigator.userAgent.indexOf('Gecko') < 0;
      var s = '',
        bgColorAttribute =
          this.conf.bgColor && (this.conf.bgColor !== 'none' || this.conf.bgColor != 'transparent')
            ? ' bgcolor="' + this.conf.bgColor + '"'
            : '',
        frameColorAttribute =
          this.conf.frameColor &&
          (this.conf.frameColor !== 'none' || this.conf.frameColor != 'transparent')
            ? ' bgcolor="' + this.conf.frameColor + '"'
            : '';
      s += '<table border="0" cellspacing="0" cellpadding="' + this.conf.frameWidth + '">\n';
      s +=
        '<tr><td' +
        frameColorAttribute +
        '><table border="0" cellspacing="0" cellpadding="2"><tr><td' +
        bgColorAttribute +
        '><table border="0" cellspacing="0" cellpadding="0">\n';
      var rstr = '';
      for (var c = 0; c < this.conf.cols; c++) rstr += '&nbsp;';
      for (var r = 0; r < this.conf.rows; r++) {
        var termid = this.globals.hasSubDivs ? '' : ' id="' + divPrefix + r + '"';
        s +=
          '<tr><td nowrap height="' +
          this.conf.rowHeight +
          '"' +
          termid +
          ' class="' +
          this.conf.fontClass +
          '">' +
          rstr +
          '<\/td><\/tr>\n';
      }
      s += '<\/table><\/td><\/tr>\n';
      s += '<\/table><\/td><\/tr>\n';
      s += '<\/table>\n';
      var termOffset = 2 + this.conf.frameWidth;
      if (this.globals.hasSubDivs) {
        for (var r = 0; r < this.conf.rows; r++) {
          s +=
            '<div id="' +
            divPrefix +
            r +
            '" style="position:absolute; top:' +
            (termOffset + r * this.conf.rowHeight) +
            'px; left: ' +
            termOffset +
            'px;" class="' +
            this.conf.fontClass +
            '"><\/div>\n';
        }
        this.globals.termStringStart =
          '<table border="0" cellspacing="0" cellpadding="0"><tr><td nowrap height="' +
          this.conf.rowHeight +
          '" class="' +
          this.conf.fontClass +
          '">';
        this.globals.termStringEnd = '<\/td><\/tr><\/table>';
      }
      this.globals.writeElement(this.termDiv, s);
    }
    if (!rebuild) {
      this.globals.setElementXY(this.termDiv, this.conf.x, this.conf.y);
      this.globals.setVisible(this.termDiv, 1);
    }
    window.status = '';
  },

  rebuild: function () {
    // check for bounds and array lengths
    var rl = this.conf.rows;
    var cl = this.conf.cols;
    for (var r = 0; r < rl; r++) {
      var cbr = this.charBuf[r];
      if (!cbr) {
        this.charBuf[r] = this.getRowArray(cl, 0);
        this.styleBuf[r] = this.getRowArray(cl, 0);
      } else if (cbr.length < cl) {
        for (var c = cbr.length; c < cl; c++) {
          this.charBuf[r][c] = 0;
          this.styleBuf[r][c] = 0;
        }
      }
    }
    var resetcrsr = false;
    if (this.r >= rl) {
      r = rl - 1;
      resetcrsr = true;
    }
    if (this.c >= cl) {
      c = cl - 1;
      resetcrsr = true;
    }
    if (resetcrsr && this.cursoractive) this.cursorOn();
    // and actually rebuild
    this._makeTerm(true);
    for (var r = 0; r < rl; r++) {
      this.redraw(r);
    }
    // clear backup buffer to prevent errors
    this.backupBuffer = null;
  },

  moveTo: function (x, y) {
    this.globals.setElementXY(this.termDiv, x, y);
  },

  resizeTo: function (x, y) {
    if (this.termDivReady()) {
      x = parseInt(x, 10);
      y = parseInt(y, 10);
      if (isNaN(x) || isNaN(y) || x < 4 || y < 2) return false;
      this.maxCols = this.conf.cols = x;
      this.maxLines = this.conf.rows = y;
      this._makeTerm();
      this.clear();
      return true;
    } else {
      return false;
    }
  },

  redraw: function (r) {
    var s = this.globals.termStringStart;
    var curStyle = 0;
    var tstls = this.globals.termStyles;
    var tscls = this.globals.termStyleClose;
    var tsopn = this.globals.termStyleOpen;
    var tspcl = this.globals.termSpecials;
    var tclrs = this.globals.colorCodes;
    var tnclrs = this.globals.nsColorCodes;
    var twclrs = this.globals.webColorCodes;
    var t_cb = this.charBuf;
    var t_sb = this.styleBuf;
    var clr;
    for (var i = 0; i < this.conf.cols; i++) {
      var c = t_cb[r][i];
      var cs = t_sb[r][i];
      if (cs != curStyle) {
        if (curStyle) {
          if (curStyle & 0xffff00) s += '</span>';
          for (var k = tstls.length - 1; k >= 0; k--) {
            var st = tstls[k];
            if (curStyle & st) s += tscls[st];
          }
        }
        curStyle = cs;
        for (var k = 0; k < tstls.length; k++) {
          var st = tstls[k];
          if (curStyle & st) s += tsopn[st];
        }
        clr = '';
        if (curStyle & 0xff00) {
          var cc = (curStyle & 0xff00) >>> 8;
          clr = cc < 16 ? tclrs[cc] : '#' + tnclrs[cc - 16];
        } else if (curStyle & 0xff0000) {
          clr = '#' + twclrs[(curStyle & 0xff0000) >>> 16];
        }
        if (clr) {
          if (curStyle & 1) {
            s += '<span style="background-color:' + clr + ' !important;">';
          } else {
            s += '<span style="color:' + clr + ' !important;">';
          }
        }
      }
      s += tspcl[c] ? tspcl[c] : String.fromCharCode(c);
    }
    if (curStyle > 0) {
      if (curStyle & 0xffff00) s += '</span>';
      for (var k = tstls.length - 1; k >= 0; k--) {
        var st = tstls[k];
        if (curStyle & st) s += tscls[st];
      }
    }
    s += this.globals.termStringEnd;
    this.globals.writeElement(this.termDiv + '_r' + r, s);
  },

  guiReady: function () {
    var ready = true;
    if (this.globals.guiElementsReady(this.termDiv)) {
      for (var r = 0; r < this.conf.rows; r++) {
        if (this.globals.guiElementsReady(this.termDiv + '_r' + r) == false) {
          ready = false;
          break;
        }
      }
    } else {
      ready = false;
    }
    return ready;
  },

  termDivReady: function () {
    if (document.getElementById) {
      return document.getElementById(this.termDiv) ? true : false;
    } else if (document.all) {
      return document.all[this.termDiv] ? true : false;
    } else {
      return false;
    }
  },

  getDimensions: function () {
    var w = 0;
    var h = 0;
    var d = this.termDiv;
    if (document.getElementById) {
      var obj = document.getElementById(d);
      if (obj && obj.firstChild) {
        w = parseInt(obj.firstChild.offsetWidth, 10);
        h = parseInt(obj.firstChild.offsetHeight, 10);
      } else if (obj && obj.children && obj.children[0]) {
        w = parseInt(obj.children[0].offsetWidth, 10);
        h = parseInt(obj.children[0].offsetHeight, 10);
      }
    } else if (document.all) {
      var obj = document.all[d];
      if (obj && obj.children && obj.children[0]) {
        w = parseInt(obj.children[0].offsetWidth, 10);
        h = parseInt(obj.children[0].offsetHeight, 10);
      }
    }
    return { width: w, height: h };
  },

  // global store for static data and methods (former "TermGlobals")

  globals: {
    termToInitialze: null,
    activeTerm: null,
    kbdEnabled: false,
    keylock: false,
    keyRepeatDelay1: 450, // initial delay
    keyRepeatDelay2: 100, // consecutive delays
    keyRepeatTimer: null,
    lcMorePrompt1: ' -- MORE -- ',
    lcMorePromtp1Style: 1,
    lcMorePrompt2: " (Type: space to continue, 'q' to quit)",
    lcMorePrompt2Style: 0,
    lcMoreKeyAbort: 113,
    lcMoreKeyContinue: 32,

    // initialize global data structs

    _initGlobals: function () {
      var tg = Terminal.prototype.globals;
      tg._extendMissingStringMethods();
      tg._initWebColors();
      tg._initDomKeyRef();
      Terminal.prototype.termKey = tg.termKey;
    },

    // hex support (don't rely on generic support like Number.toString(16))

    getHexChar: function (c) {
      var tg = Terminal.prototype.globals;
      if (tg.isHexChar(c)) return tg.hexToNum[c];
      return -1;
    },

    isHexChar: function (c) {
      return (c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F')
        ? true
        : false;
    },

    isHexOnlyChar: function (c) {
      return (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F') ? true : false;
    },

    hexToNum: {
      0: 0,
      1: 1,
      2: 2,
      3: 3,
      4: 4,
      5: 5,
      6: 6,
      7: 7,
      8: 8,
      9: 9,
      a: 10,
      b: 11,
      c: 12,
      d: 13,
      e: 14,
      f: 15,
      A: 10,
      B: 11,
      C: 12,
      D: 13,
      E: 14,
      F: 15,
    },

    // data for color support

    webColors: [],
    webColorCodes: [''],

    colors: {
      // ANSI bright (bold) color set
      black: 1,
      red: 2,
      green: 3,
      yellow: 4,
      blue: 5,
      magenta: 6,
      cyan: 7,
      white: 8,
      // dark color set
      grey: 9,
      red2: 10,
      green2: 11,
      yellow2: 12,
      blue2: 13,
      magenta2: 14,
      cyan2: 15,
      // synonyms
      red1: 2,
      green1: 3,
      yellow1: 4,
      blue1: 5,
      magenta1: 6,
      cyan1: 7,
      gray: 9,
      darkred: 10,
      darkgreen: 11,
      darkyellow: 12,
      darkblue: 13,
      darkmagenta: 14,
      darkcyan: 15,
      // default color
      default: 0,
      clear: 0,
    },

    colorCodes: [
      '',
      '#000000',
      '#ff0000',
      '#00ff00',
      '#ffff00',
      '#0066ff',
      '#ff00ff',
      '#00ffff',
      '#ffffff',
      '#808080',
      '#990000',
      '#009900',
      '#999900',
      '#003399',
      '#990099',
      '#009999',
    ],

    nsColors: {
      aliceblue: 1,
      antiquewhite: 2,
      aqua: 3,
      aquamarine: 4,
      azure: 5,
      beige: 6,
      black: 7,
      blue: 8,
      blueviolet: 9,
      brown: 10,
      burlywood: 11,
      cadetblue: 12,
      chartreuse: 13,
      chocolate: 14,
      coral: 15,
      cornflowerblue: 16,
      cornsilk: 17,
      crimson: 18,
      darkblue: 19,
      darkcyan: 20,
      darkgoldenrod: 21,
      darkgray: 22,
      darkgreen: 23,
      darkkhaki: 24,
      darkmagenta: 25,
      darkolivegreen: 26,
      darkorange: 27,
      darkorchid: 28,
      darkred: 29,
      darksalmon: 30,
      darkseagreen: 31,
      darkslateblue: 32,
      darkslategray: 33,
      darkturquoise: 34,
      darkviolet: 35,
      deeppink: 36,
      deepskyblue: 37,
      dimgray: 38,
      dodgerblue: 39,
      firebrick: 40,
      floralwhite: 41,
      forestgreen: 42,
      fuchsia: 43,
      gainsboro: 44,
      ghostwhite: 45,
      gold: 46,
      goldenrod: 47,
      gray: 48,
      green: 49,
      greenyellow: 50,
      honeydew: 51,
      hotpink: 52,
      indianred: 53,
      indigo: 54,
      ivory: 55,
      khaki: 56,
      lavender: 57,
      lavenderblush: 58,
      lawngreen: 59,
      lemonchiffon: 60,
      lightblue: 61,
      lightcoral: 62,
      lightcyan: 63,
      lightgoldenrodyellow: 64,
      lightgreen: 65,
      lightgrey: 66,
      lightpink: 67,
      lightsalmon: 68,
      lightseagreen: 69,
      lightskyblue: 70,
      lightslategray: 71,
      lightsteelblue: 72,
      lightyellow: 73,
      lime: 74,
      limegreen: 75,
      linen: 76,
      maroon: 77,
      mediumaquamarine: 78,
      mediumblue: 79,
      mediumorchid: 80,
      mediumpurple: 81,
      mediumseagreen: 82,
      mediumslateblue: 83,
      mediumspringgreen: 84,
      mediumturquoise: 85,
      mediumvioletred: 86,
      midnightblue: 87,
      mintcream: 88,
      mistyrose: 89,
      moccasin: 90,
      navajowhite: 91,
      navy: 92,
      oldlace: 93,
      olive: 94,
      olivedrab: 95,
      orange: 96,
      orangered: 97,
      orchid: 98,
      palegoldenrod: 99,
      palegreen: 100,
      paleturquoise: 101,
      palevioletred: 102,
      papayawhip: 103,
      peachpuff: 104,
      peru: 105,
      pink: 106,
      plum: 107,
      powderblue: 108,
      purple: 109,
      red: 110,
      rosybrown: 111,
      royalblue: 112,
      saddlebrown: 113,
      salmon: 114,
      sandybrown: 115,
      seagreen: 116,
      seashell: 117,
      sienna: 118,
      silver: 119,
      skyblue: 120,
      slateblue: 121,
      slategray: 122,
      snow: 123,
      springgreen: 124,
      steelblue: 125,
      tan: 126,
      teal: 127,
      thistle: 128,
      tomato: 129,
      turquoise: 130,
      violet: 131,
      wheat: 132,
      white: 133,
      whitesmoke: 134,
      yellow: 135,
      yellowgreen: 136,
    },

    nsColorCodes: [
      '',
      'f0f8ff',
      'faebd7',
      '00ffff',
      '7fffd4',
      'f0ffff',
      'f5f5dc',
      '000000',
      '0000ff',
      '8a2be2',
      'a52a2a',
      'deb887',
      '5f9ea0',
      '7fff00',
      'd2691e',
      'ff7f50',
      '6495ed',
      'fff8dc',
      'dc143c',
      '00008b',
      '008b8b',
      'b8860b',
      'a9a9a9',
      '006400',
      'bdb76b',
      '8b008b',
      '556b2f',
      'ff8c00',
      '9932cc',
      '8b0000',
      'e9967a',
      '8fbc8f',
      '483d8b',
      '2f4f4f',
      '00ced1',
      '9400d3',
      'ff1493',
      '00bfff',
      '696969',
      '1e90ff',
      'b22222',
      'fffaf0',
      '228b22',
      'ff00ff',
      'dcdcdc',
      'f8f8ff',
      'ffd700',
      'daa520',
      '808080',
      '008000',
      'adff2f',
      'f0fff0',
      'ff69b4',
      'cd5c5c',
      '4b0082',
      'fffff0',
      'f0e68c',
      'e6e6fa',
      'fff0f5',
      '7cfc00',
      'fffacd',
      'add8e6',
      'f08080',
      'e0ffff',
      'fafad2',
      '90ee90',
      'd3d3d3',
      'ffb6c1',
      'ffa07a',
      '20b2aa',
      '87cefa',
      '778899',
      'b0c4de',
      'ffffe0',
      '00ff00',
      '32cd32',
      'faf0e6',
      '800000',
      '66cdaa',
      '0000cd',
      'ba55d3',
      '9370db',
      '3cb371',
      '7b68ee',
      '00fa9a',
      '48d1cc',
      'c71585',
      '191970',
      'f5fffa',
      'ffe4e1',
      'ffe4b5',
      'ffdead',
      '000080',
      'fdf5e6',
      '808000',
      '6b8e23',
      'ffa500',
      'ff4500',
      'da70d6',
      'eee8aa',
      '98fb98',
      'afeeee',
      'db7093',
      'ffefd5',
      'ffdab9',
      'cd853f',
      'ffc0cb',
      'dda0dd',
      'b0e0e6',
      '800080',
      'ff0000',
      'bc8f8f',
      '4169e1',
      '8b4513',
      'fa8072',
      'f4a460',
      '2e8b57',
      'fff5ee',
      'a0522d',
      'c0c0c0',
      '87ceeb',
      '6a5acd',
      '708090',
      'fffafa',
      '00ff7f',
      '4682b4',
      'd2b48c',
      '008080',
      'd8bfd8',
      'ff6347',
      '40e0d0',
      'ee82ee',
      'f5deb3',
      'ffffff',
      'f5f5f5',
      'ffff00',
      '9acd32',
    ],
    _webSwatchChars: ['0', '3', '6', '9', 'c', 'f'],
    _initWebColors: function () {
      // generate long and short web color ref
      var tg = Terminal.prototype.globals;
      var ws = tg._webColorSwatch;
      var wn = tg.webColors;
      var cc = tg.webColorCodes;
      var n = 1;
      var a, b, c, al, bl, bs, cl;
      for (var i = 0; i < 6; i++) {
        a = tg._webSwatchChars[i];
        al = a + a;
        for (var j = 0; j < 6; j++) {
          b = tg._webSwatchChars[j];
          bl = al + b + b;
          bs = a + b;
          for (var k = 0; k < 6; k++) {
            c = tg._webSwatchChars[k];
            cl = bl + c + c;
            wn[bs + c] = wn[cl] = n;
            cc[n] = cl;
            n++;
          }
        }
      }
    },

    webifyColor: function (s) {
      // return nearest web color in 3 digit format
      // (do without RegExp for compatibility)
      var tg = Terminal.prototype.globals;
      if (s.length == 6) {
        var c = '';
        for (var i = 0; i < 6; i += 2) {
          var a = s.charAt(i);
          var b = s.charAt(i + 1);
          if (tg.isHexChar(a) && tg.isHexChar(b)) {
            c += tg._webSwatchChars[Math.round((parseInt(a + b, 16) / 255) * 5)];
          } else {
            return '';
          }
        }
        return c;
      } else if (s.length == 3) {
        var c = '';
        for (var i = 0; i < 3; i++) {
          var a = s.charAt(i);
          if (tg.isHexChar(a)) {
            c += tg._webSwatchChars[Math.round((parseInt(a, 16) / 15) * 5)];
          } else {
            return '';
          }
        }
        return c;
      } else {
        return '';
      }
    },

    // public methods for color support

    setColor: function (label, value) {
      var tg = Terminal.prototype.globals;
      if (typeof label == 'number' && label >= 1 && label <= 15) {
        tg.colorCodes[label] = value;
      } else if (typeof label == 'string') {
        label = label.toLowerCase();
        if (label.length == 1 && tg.isHexChar(label)) {
          var n = tg.hexToNum[label];
          if (n) tg.colorCodes[n] = value;
        } else if (typeof tg.colors[label] != 'undefined') {
          var n = tg.colors[label];
          if (n) tg.colorCodes[n] = value;
        }
      }
    },

    getColorString: function (label) {
      var tg = Terminal.prototype.globals;
      if (typeof label == 'number' && label >= 0 && label <= 15) {
        return tg.colorCodes[label];
      } else if (typeof label == 'string') {
        label = label.toLowerCase();
        if (label.length == 1 && tg.isHexChar(label)) {
          return tg.colorCodes[tg.hexToNum[label]];
        } else if (typeof tg.colors[label] != 'undefined') {
          return tg.colorCodes[tg.colors[label]];
        }
      }
      return '';
    },

    getColorCode: function (label) {
      var tg = Terminal.prototype.globals;
      if (typeof label == 'number' && label >= 0 && label <= 15) {
        return label;
      } else if (typeof label == 'string') {
        label = label.toLowerCase();
        if (label.length == 1 && tg.isHexChar(label)) {
          return parseInt(label, 16);
        } else if (typeof tg.colors[label] != 'undefined') {
          return tg.colors[label];
        }
      }
      return 0;
    },

    // import/paste methods (methods return success)

    insertText: function (text) {
      // auto-types a given string to the active terminal
      // returns success (false indicates a lock or no active terminal)
      var tg = Terminal.prototype.globals;
      var termRef = tg.activeTerm;
      if (
        !termRef ||
        termRef.closed ||
        tg.keylock ||
        termRef.lock ||
        termRef.charMode ||
        termRef.fieldMode
      )
        return false;
      // terminal open and unlocked, so type the text
      for (var i = 0; i < text.length; i++) {
        tg.keyHandler({ which: text.charCodeAt(i), _remapped: true });
      }
      return true;
    },

    importEachLine: function (text) {
      // import multiple lines of text per line each and execs
      // returns success (false indicates a lock or no active terminal)
      var tg = Terminal.prototype.globals;
      var termRef = tg.activeTerm;
      if (
        !termRef ||
        termRef.closed ||
        tg.keylock ||
        termRef.lock ||
        termRef.charMode ||
        termRef.fieldMode
      )
        return false;
      // clear the current command line
      termRef.cursorOff();
      termRef._clearLine();
      // normalize line breaks
      text = text.replace(/\r\n?/g, '\n');
      // split lines and auto-type the text
      var t = text.split('\n');
      for (var i = 0; i < t.length; i++) {
        for (var k = 0; k < t[i].length; k++) {
          tg.keyHandler({ which: t[i].charCodeAt(k), _remapped: true });
        }
        tg.keyHandler({ which: term.termKey.CR, _remapped: true });
      }
      return true;
    },

    importMultiLine: function (text) {
      // importing multi-line text as single input with "\n" in lineBuffer
      var tg = Terminal.prototype.globals;
      var termRef = tg.activeTerm;
      if (
        !termRef ||
        termRef.closed ||
        tg.keylock ||
        termRef.lock ||
        termRef.charMode ||
        termRef.fieldMode
      )
        return false;
      // lock and clear the line
      termRef.lock = true;
      termRef.cursorOff();
      termRef._clearLine();
      // normalize linebreaks and echo the text linewise
      text = text.replace(/\r\n?/g, '\n');
      var lines = text.split('\n');
      for (var i = 0; i < lines.length; i++) {
        termRef.type(lines[i]);
        if (i < lines.length - 1) termRef.newLine();
      }
      // fake <ENTER>;
      // (no history entry for this)
      termRef.lineBuffer = text;
      termRef.lastLine = '';
      termRef.inputChar = 0;
      termRef.handler();
      return true;
    },

    // text related service functions

    normalize: function (n, m) {
      var s = '' + n;
      while (s.length < m) s = '0' + s;
      return s;
    },

    fillLeft: function (t, n) {
      if (typeof t != 'string') t = '' + t;
      while (t.length < n) t = ' ' + t;
      return t;
    },

    center: function (t, l) {
      var s = '';
      for (var i = t.length; i < l; i += 2) s += ' ';
      return s + t;
    },

    // simple substitute for String.replace()
    stringReplace: function (s1, s2, t) {
      var l1 = s1.length;
      var l2 = s2.length;
      var ofs = t.indexOf(s1);
      while (ofs >= 0) {
        t = t.substring(0, ofs) + s2 + t.substring(ofs + l1);
        ofs = t.indexOf(s1, ofs + l2);
      }
      return t;
    },

    // config data for text wrap

    wrapChars: {
      // keys: charCode
      // values: 1 = white space, 2 = wrap after, 3 = wrap before, 4 = conditional word break
      9: 1, // tab
      10: 1, // new line - don't change this (used internally)!!!
      12: 4, // form feed (use this for conditional word breaks)
      13: 1, // cr
      32: 1, // blank
      40: 3, // (
      45: 2, // dash/hyphen
      61: 2, // =
      91: 3, // [
      94: 3, // caret (non-printing chars)
      123: 3, // {
    },

    // keyboard methods & controls

    setFocus: function (termref) {
      Terminal.prototype.globals.activeTerm = termref;
      Terminal.prototype.globals.clearRepeatTimer();
    },

    termKey: {
      // codes of special keys
      NUL: 0x00,
      SOH: 0x01,
      STX: 0x02,
      ETX: 0x03,
      EOT: 0x04,
      ENQ: 0x05,
      ACK: 0x06,
      BEL: 0x07,
      BS: 0x08,
      BACKSPACE: 0x08,
      HT: 0x09,
      TAB: 0x09,
      LF: 0x0a,
      VT: 0x0b,
      FF: 0x0c,
      CR: 0x0d,
      SO: 0x0e,
      SI: 0x0f,
      DLE: 0x10,
      DC1: 0x11,
      DC2: 0x12,
      DC3: 0x13,
      DC4: 0x14,
      NAK: 0x15,
      SYN: 0x16,
      ETB: 0x17,
      CAN: 0x18,
      EM: 0x19,
      SUB: 0x1a,
      ESC: 0x1b,
      IS4: 0x1c,
      IS3: 0x1d,
      IS2: 0x1e,
      IS1: 0x1f,
      DEL: 0x7f,
      // other specials
      EURO: 0x20ac,
      // cursor mapping
      LEFT: 0x1c,
      RIGHT: 0x1d,
      UP: 0x1e,
      DOWN: 0x1f,
    },

    // map some DOM_VK_* properties to values defined in termKey
    termDomKeyRef: {},
    _domKeyMappingData: {
      LEFT: 'LEFT',
      RIGHT: 'RIGHT',
      UP: 'UP',
      DOWN: 'DOWN',
      BACK_SPACE: 'BS',
      RETURN: 'CR',
      ENTER: 'CR',
      ESCAPE: 'ESC',
      DELETE: 'DEL',
      TAB: 'TAB',
    },
    _initDomKeyRef: function () {
      var tg = Terminal.prototype.globals;
      var m = tg._domKeyMappingData;
      var r = tg.termDomKeyRef;
      var k = tg.termKey;
      for (var i in m) r['DOM_VK_' + i] = k[m[i]];
    },

    registerEvent: function (obj, eventType, handler, capture) {
      if (obj.addEventListener) {
        obj.addEventListener(eventType.toLowerCase(), handler, capture);
      } else {
      /*
		else if (obj.attachEvent) {
			obj.attachEvent('on'+eventType.toLowerCase(), handler);
		}
		*/
        var et = eventType.toUpperCase();
        if (window.Event && window.Event[et] && obj.captureEvents) obj.captureEvents(Event[et]);
        obj['on' + eventType.toLowerCase()] = handler;
      }
    },
    releaseEvent: function (obj, eventType, handler, capture) {
      if (obj.removeEventListener) {
        obj.removeEventListener(eventType.toLowerCase(), handler, capture);
      } else {
      /*
		else if (obj.detachEvent) {
			obj.detachEvent('on'+eventType.toLowerCase(), handler);
		}
		*/
        var et = eventType.toUpperCase();
        if (window.Event && window.Event[et] && obj.releaseEvents) obj.releaseEvents(Event[et]);
        et = 'on' + eventType.toLowerCase();
        if (obj[et] && obj[et] == handler) obj.et = null;
      }
    },

    enableKeyboard: function (term) {
      var tg = Terminal.prototype.globals;
      if (!tg.kbdEnabled) {
        tg.registerEvent(document, 'keypress', tg.keyHandler, true);
        tg.registerEvent(document, 'keydown', tg.keyFix, true);
        tg.registerEvent(document, 'keyup', tg.clearRepeatTimer, true);
        tg.kbdEnabled = true;
      }
      tg.activeTerm = term;
    },

    disableKeyboard: function (term) {
      var tg = Terminal.prototype.globals;
      if (tg.kbdEnabled) {
        tg.releaseEvent(document, 'keypress', tg.keyHandler, true);
        tg.releaseEvent(document, 'keydown', tg.keyFix, true);
        tg.releaseEvent(document, 'keyup', tg.clearRepeatTimer, true);
        tg.kbdEnabled = false;
      }
      tg.activeTerm = null;
    },

    // remap some special key mappings on keydown

    keyFix: function (e) {
      var tg = Terminal.prototype.globals;
      var term = tg.activeTerm;
      var ch;
      if (tg.keylock || term.lock) return true;
      if (window.event) {
        if (!e) e = window.event;
        ch = e.keyCode;
        if (e.DOM_VK_UP) {
          for (var i in tg.termDomKeyRef) {
            if (e[i] && ch == e[i]) {
              tg.keyHandler({
                which: tg.termDomKeyRef[i],
                _remapped: true,
                _repeat: ch == 0x1b ? true : false,
              });
              if (e.preventDefault) e.preventDefault();
              if (e.stopPropagation) e.stopPropagation();
              e.cancelBubble = true;
              return false;
            }
          }
          e.cancelBubble = false;
          return true;
        } else {
          // no DOM support
          var termKey = term.termKey;
          var keyHandler = tg.keyHandler;
          if (ch == 8 && !term.isOpera) {
            keyHandler({ which: termKey.BS, _remapped: true, _repeat: true });
          } else if (ch == 9) {
            keyHandler({
              which: termKey.TAB,
              _remapped: true,
              _repeat: term.printTab ? false : true,
            });
          } else if (ch == 27) {
            keyHandler({
              which: termKey.ESC,
              _remapped: true,
              _repeat: term.printTab ? false : true,
            });
          } else if (ch == 37) {
            keyHandler({ which: termKey.LEFT, _remapped: true, _repeat: true });
          } else if (ch == 39) {
            keyHandler({ which: termKey.RIGHT, _remapped: true, _repeat: true });
          } else if (ch == 38) {
            keyHandler({ which: termKey.UP, _remapped: true, _repeat: true });
          } else if (ch == 40) {
            keyHandler({ which: termKey.DOWN, _remapped: true, _repeat: true });
          } else if (ch == 127 || ch == 46) {
            keyHandler({ which: termKey.DEL, _remapped: true, _repeat: true });
          } else if (ch >= 57373 && ch <= 57376) {
            if (ch == 57373) {
              keyHandler({ which: termKey.UP, _remapped: true, _repeat: true });
            } else if (ch == 57374) {
              keyHandler({ which: termKey.DOWN, _remapped: true, _repeat: true });
            } else if (ch == 57375) {
              keyHandler({ which: termKey.LEFT, _remapped: true, _repeat: true });
            } else if (ch == 57376) {
              keyHandler({ which: termKey.RIGHT, _remapped: true, _repeat: true });
            }
          } else {
            e.cancelBubble = false;
            return true;
          }
          if (e.preventDefault) e.preventDefault();
          if (e.stopPropagation) e.stopPropagation();
          e.cancelBubble = true;
          return false;
        }
      }
    },

    clearRepeatTimer: function (e) {
      var tg = Terminal.prototype.globals;
      if (tg.keyRepeatTimer) {
        clearTimeout(tg.keyRepeatTimer);
        tg.keyRepeatTimer = null;
      }
    },

    doKeyRepeat: function (ch) {
      Terminal.prototype.globals.keyHandler({ which: ch, _remapped: true, _repeated: true });
    },

    keyHandler: function (e) {
      var tg = Terminal.prototype.globals;
      var term = tg.activeTerm;
      if (tg.keylock || term.lock || (term.isMac && e && e.metaKey)) return true;
      if (window.event) {
        if (window.event.preventDefault) window.event.preventDefault();
        if (window.event.stopPropagation) window.event.stopPropagation();
      } else if (e) {
        if (e.preventDefault) e.preventDefault();
        if (e.stopPropagation) e.stopPropagation();
      }
      var ch;
      var ctrl = false;
      var shft = false;
      var remapped = false;
      var termKey = term.termKey;
      var keyRepeat = 0;
      if (e) {
        ch = e.which;
        ctrl = (e.ctrlKey && !e.altKey) || e.modifiers == 2;
        shft = e.shiftKey || e.modifiers == 4;
        if (e._remapped) {
          remapped = true;
          if (window.event) {
            //ctrl=(ctrl || window.event.ctrlKey);
            ctrl = ctrl || (window.event.ctrlKey && !window.event.altKey);
            shft = shft || window.event.shiftKey;
          }
        }
        if (e._repeated) {
          keyRepeat = 2;
        } else if (e._repeat) {
          keyRepeat = 1;
        }
      } else if (window.event) {
        ch = window.event.keyCode;
        //ctrl=(window.event.ctrlKey);
        ctrl = window.event.ctrlKey && !window.event.altKey; // allow alt gr == ctrl alt
        shft = window.event.shiftKey;
        if (window.event._repeated) {
          keyRepeat = 2;
        } else if (window.event._repeat) {
          keyRepeat = 1;
        }
      } else {
        return true;
      }
      if (ch == '' && remapped == false) {
        // map specials
        if (e == null) e = window.event;
        if (e.charCode == 0 && e.keyCode) {
          if (e.DOM_VK_UP) {
            var dkr = tg.termDomKeyRef;
            for (var i in dkr) {
              if (e[i] && e.keyCode == e[i]) {
                ch = dkr[i];
                break;
              }
            }
          } else {
            // NS4
            if (e.keyCode == 28) {
              ch = termKey.LEFT;
            } else if (e.keyCode == 29) {
              ch = termKey.RIGHT;
            } else if (e.keyCode == 30) {
              ch = termKey.UP;
            } else if (e.keyCode == 31) {
              ch = termKey.DOWN;
            }
            // Mozilla alike but no DOM support
            else if (e.keyCode == 37) {
              ch = termKey.LEFT;
            } else if (e.keyCode == 39) {
              ch = termKey.RIGHT;
            } else if (e.keyCode == 38) {
              ch = termKey.UP;
            } else if (e.keyCode == 40) {
              ch = termKey.DOWN;
            }
            // just to have the TAB mapping here too
            else if (e.keyCode == 9) {
              ch = termKey.TAB;
            }
          }
        }
      }
      // leave on unicode private use area (might be function key etc)
      if (ch >= 0xe000 && ch <= 0xf8ff) return;
      if (keyRepeat) {
        tg.clearRepeatTimer();
        tg.keyRepeatTimer = window.setTimeout(
          'Terminal.prototype.globals.doKeyRepeat(' + ch + ')',
          keyRepeat == 1 ? tg.keyRepeatDelay1 : tg.keyRepeatDelay2,
        );
      }
      // key actions
      if (term.charMode) {
        if (ctrl && term.isPrintable(ch, true))
          ch = String.fromCharCode(ch).toUpperCase().charCodeAt(0) & ~0x40;
        term.insert = false;
        term.inputChar = ch;
        term.lineBuffer = '';
        term.handler();
        if (ch <= 32 && window.event) window.event.cancelBubble = true;
        return false;
      }
      if (!ctrl) {
        // special keys
        if (ch == termKey.CR) {
          term.lock = true;
          term.cursorOff();
          term.insert = false;
          if (term.rawMode) {
            term.lineBuffer = term.lastLine;
          } else if (term.fieldMode) {
            term.lineBuffer = term.lastLine;
            term.exitFieldMode();
          } else {
            term.lineBuffer = term._getLine(true);
            if (
              term.lineBuffer != '' &&
              (!term.historyUnique ||
                term.history.length == 0 ||
                term.lineBuffer != term.history[term.history.length - 1])
            ) {
              term.history[term.history.length] = term.lineBuffer;
            }
            term.histPtr = term.history.length;
          }
          term.lastLine = '';
          term.inputChar = 0;
          term.handler();
          if (window.event) window.event.cancelBubble = true;
          return false;
        } else if (term.fieldMode) {
          if (ch == termKey.ESC) {
            term.lineBuffer = term.lastLine = '';
            term.exitFieldMode();
            term.lastLine = '';
            term.inputChar = 0;
            term.handler();
            if (window.event) window.event.cancelBubble = true;
            return false;
          } else if (ch == termKey.LEFT) {
            if (term.fieldC > 0) term.fieldC--;
          } else if (ch == termKey.RIGHT) {
            if (term.fieldC < term.lastLine.length) term.fieldC++;
          } else if (ch == termKey.BS) {
            if (term.fieldC > 0) {
              term.lastLine =
                term.lastLine.substring(0, term.fieldC - 1) + term.lastLine.substring(term.fieldC);
              term.fieldC--;
            }
          } else if (ch == termKey.DEL) {
            if (term.fieldC < term.lastLine.length) {
              term.lastLine =
                term.lastLine.substring(0, term.fieldC) + term.lastLine.substring(term.fieldC + 1);
            }
          } else if (ch >= 32) {
            term.lastLine =
              term.lastLine.substring(0, term.fieldC) +
              String.fromCharCode(ch) +
              term.lastLine.substring(term.fieldC);
            term.fieldC++;
          }
          term.drawField();
          return false;
        } else if (ch == termKey.ESC && term.conf.closeOnESC) {
          term.close();
          if (window.event) window.event.cancelBubble = true;
          return false;
        }
        if (ch < 32 && term.rawMode) {
          if (window.event) window.event.cancelBubble = true;
          return false;
        } else {
          if (ch == termKey.LEFT) {
            term.cursorLeft();
            if (window.event) window.event.cancelBubble = true;
            return false;
          } else if (ch == termKey.RIGHT) {
            term.cursorRight();
            if (window.event) window.event.cancelBubble = true;
            return false;
          } else if (ch == termKey.UP) {
            term.cursorOff();
            if (term.histPtr == term.history.length) term.lastLine = term._getLine();
            term._clearLine();
            if (term.history.length && term.histPtr >= 0) {
              if (term.histPtr > 0) term.histPtr--;
              term.type(term.history[term.histPtr]);
            } else if (term.lastLine) {
              term.type(term.lastLine);
            }
            term.cursorOn();
            if (window.event) window.event.cancelBubble = true;
            return false;
          } else if (ch == termKey.DOWN) {
            term.cursorOff();
            if (term.histPtr == term.history.length) term.lastLine = term._getLine();
            term._clearLine();
            if (term.history.length && term.histPtr <= term.history.length) {
              if (term.histPtr < term.history.length) term.histPtr++;
              if (term.histPtr < term.history.length) {
                term.type(term.history[term.histPtr]);
              } else if (term.lastLine) {
                term.type(term.lastLine);
              }
            } else if (term.lastLine) {
              term.type(term.lastLine);
            }
            term.cursorOn();
            if (window.event) window.event.cancelBubble = true;
            return false;
          } else if (ch == termKey.BS) {
            term.backspace();
            if (window.event) window.event.cancelBubble = true;
            return false;
          } else if (ch == termKey.DEL) {
            if (term.DELisBS) {
              term.backspace();
            } else {
              term.fwdDelete();
            }
            if (window.event) window.event.cancelBubble = true;
            return false;
          }
        }
      }
      if (term.rawMode) {
        if (term.isPrintable(ch)) {
          term.lastLine += String.fromCharCode(ch);
        }
        if (ch == 32 && window.event) {
          window.event.cancelBubble = true;
        } else if (window.opera && window.event) {
          window.event.cancelBubble = true;
        }
        return false;
      } else {
        if (term.conf.catchCtrlH && (ch == termKey.BS || (ctrl && ch == 72))) {
          // catch ^H
          term.backspace();
          if (window.event) window.event.cancelBubble = true;
          return false;
        } else if (term.ctrlHandler && (ch < 32 || (ctrl && term.isPrintable(ch, true)))) {
          if ((ch >= 65 && ch <= 96) || ch == 63) {
            // remap canonical
            if (ch == 63) {
              ch = 31;
            } else {
              ch -= 64;
            }
          }
          term.inputChar = ch;
          term.ctrlHandler();
          if (window.event) window.event.cancelBubble = true;
          return false;
        } else if (ctrl || !term.isPrintable(ch, true)) {
          if (window.event) window.event.cancelBubble = true;
          return false;
        } else if (term.isPrintable(ch, true)) {
          if (term.blinkTimer) clearTimeout(term.blinkTimer);
          if (term.insert) {
            term.cursorOff();
            term._scrollRight(term.r, term.c);
          }
          term._charOut(ch);
          term.cursorOn();
          if (ch == 32 && window.event) {
            window.event.cancelBubble = true;
          } else if (window.opera && window.event) {
            window.event.cancelBubble = true;
          }
          return false;
        }
      }
      return true;
    },

    // gui mappings

    hasSubDivs: false,
    termStringStart: '',
    termStringEnd: '',

    termSpecials: {
      // special HTML escapes
      0: '&nbsp;',
      1: '&nbsp;',
      9: '&nbsp;',
      32: '&nbsp;',
      34: '&quot;',
      38: '&amp;',
      60: '&lt;',
      62: '&gt;',
      127: '&loz;',
      0x20ac: '&euro;',
    },

    // extensive list of max 8 styles (2^n, n<16)
    termStyles: [1, 2, 4, 8, 16],
    // style markup: one letter keys, reserved keys: "p" (plain), "c" (color)
    termStyleMarkup: {
      r: 1,
      u: 2,
      i: 4,
      s: 8,
      b: 16, // map "b" to 16 (italics) for ANSI mapping
    },
    // mappings for styles (heading HTML)
    termStyleOpen: {
      1: '<span class="termReverse">',
      2: '<u>',
      4: '<i>',
      8: '<strike>',
      16: '<i>',
    },
    // mapping for styles (trailing HTML)
    termStyleClose: {
      1: '<\/span>',
      2: '<\/u>',
      4: '<\/i>',
      8: '<\/strike>',
      16: '</i>',
    },

    // method to install custom styles
    assignStyle: function (styleCode, markup, htmlOpen, htmlClose) {
      var tg = Terminal.prototype.globals;
      // check params
      if (!styleCode || isNaN(styleCode)) {
        if (styleCode >= 256) {
          alert(
            'termlib.js:\nCould not assign style.\n' +
              s +
              ' is not a valid power of 2 between 0 and 256.',
          );
          return;
        }
      }
      var s = styleCode & 0xff;
      var matched = false;
      for (var i = 0; i < 8; i++) {
        if ((s >>> i) & 1) {
          if (matched) {
            alert('termlib.js:\nCould not assign style code.\n' + s + ' is not a power of 2!');
            return;
          }
          matched = true;
        }
      }
      if (!matched) {
        alert(
          'termlib.js:\nCould not assign style code.\n' +
            s +
            ' is not a valid power of 2 between 0 and 256.',
        );
        return;
      }
      markup = String(markup).toLowerCase();
      if (markup == 'c' || markup == 'p') {
        alert('termlib.js:\nCould not assign mark up.\n"' + markup + '" is a reserved code.');
        return;
      }
      if (markup.length > 1) {
        alert(
          'termlib.js:\nCould not assign mark up.\n"' + markup + '" is not a single letter code.',
        );
        return;
      }
      var exists = false;
      for (var i = 0; i < tg.termStyles.length; i++) {
        if (tg.termStyles[i] == s) {
          exists = true;
          break;
        }
      }
      if (exists) {
        var m = tg.termStyleMarkup[markup];
        if (m && m != s) {
          alert('termlib.js:\nCould not assign mark up.\n"' + markup + '" is already in use.');
          return;
        }
      } else {
        if (tg.termStyleMarkup[markup]) {
          alert('termlib.js:\nCould not assign mark up.\n"' + markup + '" is already in use.');
          return;
        }
        tg.termStyles[tg.termStyles.length] = s;
      }
      // install properties
      tg.termStyleMarkup[markup] = s;
      tg.termStyleOpen[s] = htmlOpen;
      tg.termStyleClose[s] = htmlClose;
    },

    // ANSI output mapping (styles & fg colors only)

    ANSI_regexp: /(\x1b\[|x9b)([0-9;]+?)([a-zA-Z])/g, // CSI ( = 0x1b+"[" or 0x9b ) + params + letter
    ANIS_SGR_codes: {
      0: '%+p',
      1: '%+b',
      3: '%+i',
      4: '%+u',
      7: '%+r',
      9: '%+s',
      21: '%+u',
      22: '%-b',
      23: '%-i',
      24: '%-u',
      27: '%-r',
      29: '%-s',
      30: '%c(0)', // using default fg color for black (black: "%c(1)")
      31: '%c(a)',
      32: '%c(b)',
      33: '%c(c)',
      34: '%c(d)',
      35: '%c(e)',
      36: '%c(f)',
      37: '%c(#999)',
      39: '%c(0)',
      90: '%c(9)',
      91: '%c(2)',
      92: '%c(3)',
      93: '%c(4)',
      94: '%c(5)',
      95: '%c(6)',
      96: '%c(7)',
      97: '%c(8)',
      99: '%c(0)',
      trueBlack: '%c(1)',
    },

    ANSI_map: function (t, trueBlack) {
      // transform simple ANSI SGR codes to internal markup
      var tg = Terminal.prototype.globals;
      tg.ANSI_regexp.lastIndex = 0;
      return t.replace(tg.ANSI_regexp, function (str, p1, p2, p3, offset, s) {
        return tg.ANSI_replace(p2, p3, trueBlack);
      });
    },

    ANSI_replace: function (p, cmd, trueBlack) {
      var tg = Terminal.prototype.globals;
      if (cmd == 'm') {
        if (p == '') {
          return tg.ANIS_SGR_codes[0];
        } else if (trueBlack && p == '30') {
          return tg.ANIS_SGR_codes.trueBlack;
        } else if (tg.ANIS_SGR_codes[p]) {
          return tg.ANIS_SGR_codes[p];
        }
      }
      return '';
    },

    // basic DHTML dynamics and browser abstraction

    writeElement: function (e, t) {
      if (document.getElementById) {
        var obj = document.getElementById(e);
        obj.innerHTML = t;
      } else if (document.all) {
        document.all[e].innerHTML = t;
      }
    },

    setElementXY: function (d, x, y) {
      if (document.getElementById) {
        var obj = document.getElementById(d);
        obj.style.left = x + 'px';
        obj.style.top = y + 'px';
      } else if (document.all) {
        document.all[d].style.left = x + 'px';
        document.all[d].style.top = y + 'px';
      }
    },

    setVisible: function (d, v) {
      if (document.getElementById) {
        var obj = document.getElementById(d);
        obj.style.visibility = v ? 'visible' : 'hidden';
      } else if (document.all) {
        document.all[d].style.visibility = v ? 'visible' : 'hidden';
      }
    },

    setDisplay: function (d, v) {
      if (document.getElementById) {
        var obj = document.getElementById(d);
        obj.style.display = v;
      } else if (document.all) {
        document.all[d].style.display = v;
      }
    },

    guiElementsReady: function (e) {
      if (document.getElementById) {
        return document.getElementById(e) ? true : false;
      } else if (document.all) {
        return document.all[e] ? true : false;
      } else {
        return false;
      }
    },

    // constructor mods (MSIE fixes)

    _termString_makeKeyref: function () {
      var tg = Terminal.prototype.globals;
      var termString_keyref = (tg.termString_keyref = new Array());
      var termString_keycoderef = (tg.termString_keycoderef = new Array());
      var hex = new Array('A', 'B', 'C', 'D', 'E', 'F');
      for (var i = 0; i <= 15; i++) {
        var high = i < 10 ? i : hex[i - 10];
        for (var k = 0; k <= 15; k++) {
          var low = k < 10 ? k : hex[k - 10];
          var cc = i * 16 + k;
          if (cc >= 32) {
            var cs = unescape('%' + high + low);
            termString_keyref[cc] = cs;
            termString_keycoderef[cs] = cc;
          }
        }
      }
    },

    _extendMissingStringMethods: function () {
      if (!String.fromCharCode || !String.prototype.charCodeAt) {
        Terminal.prototype.globals._termString_makeKeyref();
      }
      if (!String.fromCharCode) {
        String.fromCharCode = function (cc) {
          return cc != null ? Terminal.prototype.globals.termString_keyref[cc] : '';
        };
      }
      if (!String.prototype.charCodeAt) {
        String.prototype.charCodeAt = function (n) {
          cs = this.charAt(n);
          return Terminal.prototype.globals.termString_keycoderef[cs]
            ? Terminal.prototype.globals.termString_keycoderef[cs]
            : 0;
        };
      }
    },

    // end of Terminal.prototype.globals
  },

  // end of Terminal.prototype
};

// initialize global data
Terminal.prototype.globals._initGlobals();

// global entities for backward compatibility with termlib 1.x applications
var TerminalDefaults = Terminal.prototype.Defaults;
var termDefaultHandler = Terminal.prototype.defaultHandler;
var TermGlobals = Terminal.prototype.globals;
var termKey = Terminal.prototype.globals.termKey;
var termDomKeyRef = Terminal.prototype.globals.termDomKeyRef;

/*
  === termlib.js Socket Extension v.1.02 ===

  (c) Norbert Landsteiner 2003-2007
  mass:werk - media environments
  <http://www.masswerk.at>

# Synopsis:
  Integrates async XMLHttpRequests (AJAX/JSON) tightly into termlib.js

# Example:

  myTerm = new Terminal( { handler: myTermHandler } );
  myTerm.open();

  function myTermHandler() {
    this.newLine();
    if (this.lineBuffer == 'get file') {
       myTerm.send(
         {
           url: 'myservice',
           data: {
               book: 'theBook',
               chapter: 7,
               page: 45
             },
           callback: myCallback
          }
       );
       return;
    }
    else {
       // ...
    }
    this.prompt();
  }

  function myCallback() {
  	if (this.socket.success) {
  		this.write(this.socket.responseText);
  	}
  	else {
  		this.write('OOPS: ' + this.socket.status + ' ' + this.socket.statusText);
  		if (this.socket.errno) {
  			this.newLine();
  			this.write('Error: ' + this.socket.errstring);
  		}
  	}
  	this.prompt();
  }


# Documentation:

  for usage and description see readme.txt chapter 13:
  <http://www.masswerk.at/termlib/readme.txt>

  or refer to the sample page:
  <http://www.masswerk.at/termlib/sample_socket.html>

*/

Terminal.prototype._HttpSocket = function () {
  var req = null;
  if (window.XMLHttpRequest) {
    try {
      req = new XMLHttpRequest();
    } catch (e) {}
  } else if (window.ActiveXObject) {
    var prtcls = this._msXMLHttpObjects;
    for (var i = 0; i < prtcls.length; i++) {
      try {
        req = new ActiveXObject(prtcls[i]);
        if (req) {
          // shorten proto list to working element
          if (prtcls.length > 1) this.prototype._msXMLHttpObjects = [prtcls[i]];
          break;
        }
      } catch (e) {}
    }
  }
  this.request = req;
  this.url;
  this.data = null;
  this.query = '';
  this.timeoutTimer = null;
  this.localMode = Boolean(window.location.href.search(/^file:/i) == 0);
  this.error = 0;
};

Terminal.prototype._HttpSocket.prototype = {
  version: '1.02',
  // config
  useXMLEncoding: false, // use ";" as separator if true, "&" else
  defaulTimeout: 10000, // request timeout in ticks (milliseconds)
  defaultMethod: 'GET',
  forceNewline: true, // translate line-breaks in responseText to newlines

  // static const
  errno: {
    OK: 0,
    NOTIMPLEMENTED: 1,
    FATALERROR: 2,
    TIMEOUT: 3,
    NETWORKERROR: 4,
    LOCALFILEERROR: 5,
  },
  errstring: [
    '',
    'XMLHttpRequest not implemented.',
    'Could not open XMLHttpRequest.',
    'The connection timed out.',
    'Network error.',
    'The requested local document was not found.',
  ],

  // private static data
  _msXMLHttpObjects: [
    'Msxml2.XMLHTTP',
    'Microsoft.XMLHTTP',
    'Msxml2.XMLHTTP.5.0',
    'Msxml2.XMLHTTP.4.0',
    'Msxml2.XMLHTTP.3.0',
  ],

  // internal methods
  serializeData: function () {
    this.query = this.serialize(this.data);
  },
  serialize: function (data) {
    var v = '';
    if (data != null) {
      switch (typeof data) {
        case 'object':
          var d = [];
          if (data instanceof Array) {
            // array
            for (var i = 0; i < data.length; i++) {
              d.push(this.serialize(data[i]));
            }
            v = d.join(',');
            break;
          }
          for (var i in data) {
            switch (typeof data[i]) {
              case 'object':
                d.push(encodeURIComponent(i) + '=' + this.serialize(data[i]));
                break;
              default:
                d.push(encodeURIComponent(i) + '=' + encodeURIComponent(data[i]));
                break;
            }
          }
          v = this.useXMLEncoding ? d.join(';') : d.join('&');
          break;
        case 'number':
          v = String(data);
          break;
        case 'string':
          v = encodeURIComponent(data);
          break;
        case 'boolean':
          v = data ? '1' : '0';
          break;
      }
    }
    return v;
  },
  toCamelCase: function (s) {
    if (typeof s != 'string') s = String(s);
    var a = s.toLowerCase().split('-');
    var cc = a[0];
    for (var i = 1; i < a.length; i++) {
      p = a[i];
      if (p.length) cc += p.charAt(0).toUpperCase() + p.substring(1);
    }
    return cc;
  },
  callbackHandler: function () {
    if (this.termRef.closed) return;
    var r = this.request;
    if (this.error == 0 && r.readyState != 4) return;
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer);
      this.timeoutTimer = null;
    }
    var success = false;
    var failed = true;
    var response = {
      headers: {},
      ErrorCodes: this.errno,
    };
    if (this.localMode) {
      if (this.error && this.error < this.errno.NETWORKERROR) {
        response.status = 0;
        response.statusText = 'Connection Error';
        response.responseText = '';
        response.responseXML = null;
      } else if (this.error || r.responseText == null) {
        failed = false;
        response.status = 404;
        response.statusText = 'Not Found';
        response.responseText = 'The document ' + this.url + ' was not found on this file system.';
        response.responseXML = null;
        this.error = this.errno.LOCALFILEERROR;
      } else {
        success = true;
        failed = false;
        response.status = 200;
        response.statusText = 'OK';
        response.responseText = r.responseText;
        response.responseXML = r.responseXML;
      }
    } else {
      try {
        if (!this.error) {
          if (typeof r == 'object' && r.status != undefined) {
            failed = false;
            if (r.status >= 200 && r.status < 300) {
              success = true;
            } else if (r.status >= 12000) {
              // MSIE network error
              failed = true;
              this.error = this.errno.NETWORKERROR;
            }
          }
        }
      } catch (e) {}
      if (!failed) {
        response.status = r.status;
        response.statusText = r.status == 404 ? 'Not Found' : r.statusText; // force correct header
        response.responseText = r.responseText;
        response.responseXML = r.responseXML;
        if (this.getHeaders) {
          if (this.getHeaders instanceof Array) {
            for (var i = 0; i < this.getHeaders.length; i++) {
              var h = this.getHeaders[i];
              try {
                response.headers[this.toCamelCase(h)] = r.getResponseHeader(h);
              } catch (e) {}
            }
          } else {
            for (var h in this.getHeaders) {
              try {
                response.headers[this.toCamelCase(h)] = r.getResponseHeader(h);
              } catch (e) {}
            }
          }
        }
      } else {
        response.status = 0;
        response.statusText = 'Connection Error';
        response.responseText = '';
        response.responseXML = null;
      }
    }
    if (this.forceNewline) response.responseText = response.responseText.replace(/\r\n?/g, '\n');
    response.url = this.url;
    response.data = this.data;
    response.query = this.query;
    response.method = this.method;
    response.success = success;
    response.errno = this.error;
    response.errstring = this.errstring[this.error];
    var term = this.termRef;
    term.socket = response;
    if (this.callback) {
      if (typeof this.callback == 'function') {
        this.callback.apply(term);
      } else if (window[this.callback] && typeof window[this.callback] == 'function') {
        window[this.callback].apply(term);
      } else {
        term._defaultServerCallback();
      }
    } else {
      term._defaultServerCallback();
    }
    delete term.socket;
    this.request = null;
    this.callback = null;
  },
  timeoutHandler: function () {
    this.error = this.errno.TIMEOUT;
    try {
      this.request.abort();
    } catch (e) {}
    if (!this.localMode) this.callbackHandler();
  },
};

Terminal.prototype.send = function (opts) {
  var soc = new this._HttpSocket();
  if (opts) {
    if (typeof opts.method == 'string') {
      switch (opts.method.toLowerCase()) {
        case 'post':
          soc.method = 'POST';
          break;
        case 'get':
          soc.method = 'GET';
          break;
        default:
          soc.method = soc.defaultMethod.toUpperCase();
      }
    } else {
      soc.method = soc.defaultMethod;
    }
    if (opts.postbody != undefined) {
      soc.method = 'POST';
      soc.query = opts.postbody;
      soc.data = opts.data;
    } else if (opts.data != undefined) {
      soc.data = opts.data;
      soc.serializeData();
    }
    if (opts.url) soc.url = opts.url;
    if (opts.getHeaders && typeof opts.getHeaders == 'object') {
      soc.getHeaders = opts.getHeaders;
    }
  } else {
    opts = {};
    soc.method = soc.defaultMethod;
  }
  var uri = soc.url;
  if (soc.method == 'GET') {
    if (soc.query) {
      uri +=
        uri.indexOf('?') < 0
          ? '?' + soc.query
          : soc.useXMLEncoding
            ? ';' + soc.query
            : '&' + soc.query;
    }
    if (!soc.localMode) {
      // add a random value to the query string (force a request)
      var uniqueparam =
        '_termlib_reqid=' + new Date().getTime() + '_' + Math.floor(Math.random() * 100000);
      uri +=
        uri.indexOf('?') < 0
          ? '?' + uniqueparam
          : soc.useXMLEncoding
            ? ';' + uniqueparam
            : '&' + uniqueparam;
    }
  }
  soc.callback = opts.callback;
  soc.termRef = this;
  if (!soc.request) {
    soc.error = soc.errno.NOTIMPLEMENTED;
    soc.callbackHandler();
    return;
  } else {
    try {
      if (opts.userid != undefined) {
        if (opts.password != undefined) {
          soc.request.open(soc.method, uri, true, opts.userid, opts.password);
        } else {
          soc.request.open(soc.method, uri, true, opts.userid);
        }
      } else {
        soc.request.open(soc.method, uri, true);
      }
    } catch (e) {
      soc.error = soc.errno.FATALERROR;
      soc.callbackHandler();
      return;
    }
    var body = null;
    if (soc.method == 'POST') {
      try {
        soc.request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
      } catch (e) {}
      body = soc.query;
    }
    if (opts.headers && typeof opts.headers == 'objects') {
      for (var i in opts.headers) {
        try {
          soc.request.setRequestHeader(i, opts.headers[i]);
        } catch (e) {}
      }
    }
    if (opts.mimetype && soc.request.overrideMimeType) {
      try {
        soc.request.overrideMimeType(opts.mimetype);
        // force "Connection: close" (Bugzilla #246651)
        soc.request.setRequestHeader('Connection', 'close');
      } catch (e) {}
    }

    var timeoutDelay =
      opts.timeout && typeof opts.timeout == 'number' ? opts.tiomeout : soc.defaulTimeout;

    soc.request.onreadystatechange = function () {
      soc.callbackHandler();
    };
    try {
      soc.request.send(body);
    } catch (e) {
      if (soc.localMode) {
        soc.request.onreadystatechange = null;
        soc.request.abort();
        soc.error = soc.errno.LOCALFILEERROR;
      } else {
        soc.request.onreadystatechange = null;
        try {
          soc.request.abort();
        } catch (e2) {}
        soc.error = soc.errno.NETWORKERROR;
      }
      soc.callbackHandler();
      return true;
    }
    soc.timeoutTimer = setTimeout(function () {
      soc.timeoutHandler();
    }, timeoutDelay);
  }
};
Terminal.prototype._defaultServerCallback = function () {
  if (this.socket.success) {
    // output im more-mode
    this.write('Server Response:%n' + this.socket.responseText, true);
  } else {
    var s = 'Request failed: ' + this.socket.status + ' ' + this.socket.statusText;
    if (this.socket.errno) s += '%n' + this.socket.errstring;
    this.write(s);
    this.prompt();
  }
};

// eof
// end include: ../../emcurses/emscripten/termlib.js


var programArgs = [];
var thisProgram = './this.program';
var quit_ = (status, toThrow) => {
  throw toThrow;
};

// In MODULARIZE mode _scriptName needs to be captured already at the very top of the page immediately when the page is parsed, so it is generated there
// before the page load. In non-MODULARIZE modes generate it here.
var _scriptName = globalThis.document?.currentScript?.src;

if (typeof __filename != 'undefined') { // Node
  _scriptName = __filename;
} else
if (ENVIRONMENT_IS_WORKER) {
  _scriptName = self.location.href;
}

// `/` should be present at the end if `scriptDirectory` is not empty
var scriptDirectory = '';
function locateFile(path) {
  if (Module['locateFile']) {
    return Module['locateFile'](path, scriptDirectory);
  }
  return scriptDirectory + path;
}

// Hooks that are implemented differently in different runtime environments.
var readAsync, readBinary;

if (ENVIRONMENT_IS_NODE) {
  const isNode = globalThis.process?.versions?.node && globalThis.process?.type != 'renderer';
  if (!isNode) throw new Error('not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)');

  // These modules will usually be used on Node.js. Load them eagerly to avoid
  // the complexity of lazy-loading.
  var fs = require('node:fs');

  scriptDirectory = __dirname + '/';

// include: node_shell_read.js
readBinary = (filename) => {
  // We need to re-wrap `file://` strings to URLs.
  filename = isFileURI(filename) ? new URL(filename) : filename;
  var ret = fs.readFileSync(filename);
  assert(Buffer.isBuffer(ret));
  return ret;
};

readAsync = async (filename, binary = true) => {
  // See the comment in the `readBinary` function.
  filename = isFileURI(filename) ? new URL(filename) : filename;
  var ret = fs.readFileSync(filename, binary ? undefined : 'utf8');
  assert(binary ? Buffer.isBuffer(ret) : typeof ret == 'string');
  return ret;
};
// end include: node_shell_read.js
  if (process.argv.length > 1) {
    thisProgram = process.argv[1].replace(/\\/g, '/');
  }

  programArgs = process.argv.slice(2);

  // MODULARIZE will export the module in the proper place outside, we don't need to export here
  if (typeof module != 'undefined') {
    module['exports'] = Module;
  }

  quit_ = (status, toThrow) => {
    process.exitCode = status;
    throw toThrow;
  };

} else
if (ENVIRONMENT_IS_SHELL) {

} else

// Note that this includes Node.js workers when relevant (pthreads is enabled).
// Node.js workers are detected as a combination of ENVIRONMENT_IS_WORKER and
// ENVIRONMENT_IS_NODE.
if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
  try {
    scriptDirectory = new URL('.', _scriptName).href; // includes trailing slash
  } catch {
    // Must be a `blob:` or `data:` URL (e.g. `blob:http://site.com/etc/etc`), we cannot
    // infer anything from them.
  }

  if (!(globalThis.window || globalThis.WorkerGlobalScope)) throw new Error('not compiled for this environment (did you build to HTML and try to run it not on the web, or set ENVIRONMENT to something - like node - and run it someplace else - like on the web?)');

  {
// include: web_or_worker_shell_read.js
if (ENVIRONMENT_IS_WORKER) {
    readBinary = (url) => {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, false);
      xhr.responseType = 'arraybuffer';
      xhr.send(null);
      return new Uint8Array(/** @type{!ArrayBuffer} */(xhr.response));
    };
  }

  readAsync = async (url) => {
    // Fetch has some additional restrictions over XHR, like it can't be used on a file:// url.
    // See https://github.com/github/fetch/pull/92#issuecomment-140665932
    // Cordova or Electron apps are typically loaded from a file:// url.
    // So use XHR on webview if URL is a file URL.
    if (isFileURI(url)) {
      return new Promise((resolve, reject) => {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'arraybuffer';
        xhr.onload = () => {
          if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) { // file URLs can return 0
            resolve(xhr.response);
            return;
          }
          reject(xhr.status);
        };
        xhr.onerror = reject;
        xhr.send(null);
      });
    }
    var response = await fetch(url, { credentials: 'same-origin' });
    if (response.ok) {
      return response.arrayBuffer();
    }
    throw new Error(response.status + ' : ' + response.url);
  };
// end include: web_or_worker_shell_read.js
  }
} else
{
  throw new Error('environment detection error');
}

var out = console.log.bind(console);
var err = console.error.bind(console);

var IDBFS = 'IDBFS is no longer included by default; build with -lidbfs.js';
var PROXYFS = 'PROXYFS is no longer included by default; build with -lproxyfs.js';
var WORKERFS = 'WORKERFS is no longer included by default; build with -lworkerfs.js';
var FETCHFS = 'FETCHFS is no longer included by default; build with -lfetchfs.js';
var ICASEFS = 'ICASEFS is no longer included by default; build with -licasefs.js';
var JSFILEFS = 'JSFILEFS is no longer included by default; build with -ljsfilefs.js';
var OPFS = 'OPFS is no longer included by default; build with -lopfs.js';

var NODEFS = 'NODEFS is no longer included by default; build with -lnodefs.js';

// perform assertions in shell.js after we set up out() and err(), as otherwise
// if an assertion fails it cannot print the message

assert(!ENVIRONMENT_IS_SHELL, 'shell environment detected but not enabled at build time (add `shell` to `-sENVIRONMENT` to enable)');

// end include: shell.js

// include: preamble.js
// === Preamble library stuff ===

// Documentation for the public APIs defined in this file must be updated in:
//    site/source/docs/api_reference/preamble.js.rst
// A prebuilt local version of the documentation is available at:
//    site/build/text/docs/api_reference/preamble.js.txt
// You can also build docs locally as HTML or other formats in site/
// An online HTML version (which may be of a different version of Emscripten)
//    is up at http://kripken.github.io/emscripten-site/docs/api_reference/preamble.js.html

var wasmBinary;

if (!globalThis.WebAssembly) {
  err('no native wasm support detected');
}

// Wasm globals

//========================================
// Runtime essentials
//========================================

// whether we are quitting the application. no code should run after this.
// set in exit() and abort()
var ABORT = false;

// set by exit() and abort().  Passed to 'onExit' handler.
// NOTE: This is also used as the process return code in shell environments
// but only when noExitRuntime is false.
var EXITSTATUS;

// In STRICT mode, we only define assert() when ASSERTIONS is set.  i.e. we
// don't define it at all in release modes.  This matches the behaviour of
// MINIMAL_RUNTIME.
// TODO(sbc): Make this the default even without STRICT enabled.
/** @type {function(*, string=)} */
function assert(condition, text) {
  if (!condition) {
    abort('Assertion failed' + (text ? ': ' + text : ''));
  }
}

// We used to include malloc/free by default in the past. Show a helpful error in
// builds with assertions.

/**
 * Indicates whether filename is delivered via file protocol (as opposed to http/https)
 * @noinline
 */
var isFileURI = (filename) => filename.startsWith('file://');

// include: runtime_common.js
// include: runtime_stack_check.js
// Initializes the stack cookie. Called at the startup of main and at the startup of each thread in pthreads mode.
function writeStackCookie() {
  var max = _emscripten_stack_get_end();
  assert((max & 3) == 0);
  // If the stack ends at address zero we write our cookies 4 bytes into the
  // stack.  This prevents interference with SAFE_HEAP and ASAN which also
  // monitor writes to address zero.
  if (max == 0) {
    max += 4;
  }
  // The stack grow downwards towards _emscripten_stack_get_end.
  // We write cookies to the final two words in the stack and detect if they are
  // ever overwritten.
  HEAPU32[((max)>>2)] = 0x02135467;checkInt32(0x02135467);
  HEAPU32[(((max)+(4))>>2)] = 0x89BACDFE;checkInt32(0x89BACDFE);
  // Also test the global address 0 for integrity.
  HEAPU32[((0)>>2)] = 1668509029;checkInt32(1668509029);
}

function checkStackCookie() {
  if (ABORT) return;
  var max = _emscripten_stack_get_end();
  // See writeStackCookie().
  if (max == 0) {
    max += 4;
  }
  var cookie1 = HEAPU32[((max)>>2)];
  var cookie2 = HEAPU32[(((max)+(4))>>2)];
  if (cookie1 != 0x02135467 || cookie2 != 0x89BACDFE) {
    abort(`Stack overflow! Stack cookie has been overwritten at ${ptrToString(max)}, expected hex dwords 0x89BACDFE and 0x2135467, but received ${ptrToString(cookie2)} ${ptrToString(cookie1)}`);
  }
  // Also test the global address 0 for integrity.
  if (HEAPU32[((0)>>2)] != 0x63736d65 /* 'emsc' */) {
    abort('Runtime error: The application has corrupted its heap memory area (address zero)!');
  }
}
// end include: runtime_stack_check.js
// include: runtime_exceptions.js
// Base Emscripten EH error class
class EmscriptenEH {}

class EmscriptenSjLj extends EmscriptenEH {}

// end include: runtime_exceptions.js
// include: runtime_debug.js
var runtimeDebug = true; // Switch to false at runtime to disable logging at the right times

// Used by XXXXX_DEBUG settings to output debug messages.
function dbg(...args) {
  if (!runtimeDebug && typeof runtimeDebug != 'undefined') return;
  // TODO(sbc): Make this configurable somehow.  Its not always convenient for
  // logging to show up as warnings.
  console.warn(...args);
}

// Endianness check
(() => {
  var h16 = new Int16Array(1);
  var h8 = new Int8Array(h16.buffer);
  h16[0] = 0x6373;
  if (h8[0] !== 0x73 || h8[1] !== 0x63) abort('Runtime error: expected the system to be little-endian! (Run with -sSUPPORT_BIG_ENDIAN to bypass)');
})();

function consumedModuleProp(prop) {
  if (!Object.getOwnPropertyDescriptor(Module, prop)) {
    Object.defineProperty(Module, prop, {
      configurable: true,
      set() {
        abort(`Attempt to set \`Module.${prop}\` after it has already been processed.  This can happen, for example, when code is injected via '--post-js' rather than '--pre-js'`);

      }
    });
  }
}

function makeInvalidEarlyAccess(name) {
  return () => assert(false, `call to '${name}' via reference taken before Wasm module initialization`);

}

function ignoredModuleProp(prop) {
  if (Object.getOwnPropertyDescriptor(Module, prop)) {
    abort(`\`Module.${prop}\` was supplied but \`${prop}\` not included in INCOMING_MODULE_JS_API`);
  }
}

// forcing the filesystem exports a few things by default
function isExportedByForceFilesystem(name) {
  return name === 'FS_createPath' ||
         name === 'FS_createDataFile' ||
         name === 'FS_createPreloadedFile' ||
         name === 'FS_preloadFile' ||
         name === 'FS_unlink' ||
         name === 'addRunDependency' ||
         // The old FS has some functionality that WasmFS lacks.
         name === 'FS_createLazyFile' ||
         name === 'FS_createDevice' ||
         name === 'removeRunDependency';
}

/**
 * Intercept access to a symbols in the global symbol.  This enables us to give
 * informative warnings/errors when folks attempt to use symbols they did not
 * include in their build, or no symbols that no longer exist.
 *
 * We don't define this in MODULARIZE mode since in that mode emscripten symbols
 * are never placed in the global scope.
 */
function hookGlobalSymbolAccess(sym, func) {
  if (!Object.getOwnPropertyDescriptor(globalThis, sym)) {
    Object.defineProperty(globalThis, sym, {
      configurable: true,
      get() {
        func();
        return undefined;
      }
    });
  }
}

function missingGlobal(sym, msg) {
  hookGlobalSymbolAccess(sym, () => {
    warnOnce(`\`${sym}\` is no longer defined by emscripten. ${msg}`);
  });
}

missingGlobal('buffer', 'Please use HEAP8.buffer or wasmMemory.buffer');
missingGlobal('asm', 'Please use wasmExports instead');

function missingLibrarySymbol(sym) {
  hookGlobalSymbolAccess(sym, () => {
    // Can't `abort()` here because it would break code that does runtime
    // checks.  e.g. `if (typeof SDL === 'undefined')`.
    var msg = `\`${sym}\` is a library symbol and not included by default; add it to your library.js __deps or to DEFAULT_LIBRARY_FUNCS_TO_INCLUDE on the command line`;
    // DEFAULT_LIBRARY_FUNCS_TO_INCLUDE requires the name as it appears in
    // library.js, which means $name for a JS name with no prefix, or name
    // for a JS name like _name.
    var librarySymbol = sym;
    if (!librarySymbol.startsWith('_')) {
      librarySymbol = '$' + sym;
    }
    msg += ` (e.g. -sDEFAULT_LIBRARY_FUNCS_TO_INCLUDE='${librarySymbol}')`;
    if (isExportedByForceFilesystem(sym)) {
      msg += '. Alternatively, forcing filesystem support (-sFORCE_FILESYSTEM) can export this for you';
    }
    warnOnce(msg);
  });

  // Any symbol that is not included from the JS library is also (by definition)
  // not exported on the Module object.
  unexportedRuntimeSymbol(sym);
}

function unexportedRuntimeSymbol(sym) {
  if (!Object.getOwnPropertyDescriptor(Module, sym)) {
    Object.defineProperty(Module, sym, {
      configurable: true,
      get() {
        var msg = `'${sym}' was not exported. add it to EXPORTED_RUNTIME_METHODS (see the Emscripten FAQ)`;
        if (isExportedByForceFilesystem(sym)) {
          msg += '. Alternatively, forcing filesystem support (-sFORCE_FILESYSTEM) can export this for you';
        }
        abort(msg);
      },
    });
  }
}

var MAX_UINT8  = (2 **  8) - 1;
var MAX_UINT16 = (2 ** 16) - 1;
var MAX_UINT32 = (2 ** 32) - 1;
var MAX_UINT53 = (2 ** 53) - 1;
var MAX_UINT64 = (2 ** 64) - 1;

var MIN_INT8  = - (2 ** ( 8 - 1));
var MIN_INT16 = - (2 ** (16 - 1));
var MIN_INT32 = - (2 ** (32 - 1));
var MIN_INT53 = - (2 ** (53 - 1));
var MIN_INT64 = - (2 ** (64 - 1));

function checkInt(value, bits, min, max) {
  assert(Number.isInteger(Number(value)), `attempt to write non-integer (${value}) into integer heap`);
  assert(value <= max, `value (${value}) too large to write as ${bits}-bit value`);
  assert(value >= min, `value (${value}) too small to write as ${bits}-bit value`);
}

var checkInt1 = (value) => checkInt(value, 1, 1);
var checkInt8 = (value) => checkInt(value, 8, MIN_INT8, MAX_UINT8);
var checkInt16 = (value) => checkInt(value, 16, MIN_INT16, MAX_UINT16);
var checkInt32 = (value) => checkInt(value, 32, MIN_INT32, MAX_UINT32);
var checkInt53 = (value) => checkInt(value, 53, MIN_INT53, MAX_UINT53);
var checkInt64 = (value) => checkInt(value, 64, MIN_INT64, MAX_UINT64);

// end include: runtime_debug.js
// Memory management

var runtimeInitialized = false;



function updateMemoryViews() {
  var b = wasmMemory.buffer;
  HEAP8 = new Int8Array(b);
  HEAP16 = new Int16Array(b);
  HEAPU8 = new Uint8Array(b);
  HEAPU16 = new Uint16Array(b);
  HEAP32 = new Int32Array(b);
  HEAPU32 = new Uint32Array(b);
  HEAPF32 = new Float32Array(b);
  HEAPF64 = new Float64Array(b);
  HEAP64 = new BigInt64Array(b);
  HEAPU64 = new BigUint64Array(b);
}

// include: memoryprofiler.js
// end include: memoryprofiler.js
// end include: runtime_common.js
assert(globalThis.Int32Array && globalThis.Float64Array && Int32Array.prototype.subarray && Int32Array.prototype.set,
       'JS engine does not provide full typed array support');

function preRun() {
  if (Module['preRun']) {
    if (typeof Module['preRun'] == 'function') Module['preRun'] = [Module['preRun']];
    while (Module['preRun'].length) {
      addOnPreRun(Module['preRun'].shift());
    }
  }
  consumedModuleProp('preRun');
  // Begin ATPRERUNS hooks
  callRuntimeCallbacks(onPreRuns);
  // End ATPRERUNS hooks
}

function initRuntime() {
  assert(!runtimeInitialized);
  runtimeInitialized = true;

  setStackLimits();

  checkStackCookie();

  // Begin ATINITS hooks
  if (!Module['noFSInit'] && !FS.initialized) FS.init();
TTY.init();
  // End ATINITS hooks

  wasmExports['__wasm_call_ctors']();

  // Begin ATPOSTCTORS hooks
  FS.ignorePermissions = false;
  // End ATPOSTCTORS hooks
}

function preMain() {
  checkStackCookie();
  // No ATMAINS hooks
}

function postRun() {
  checkStackCookie();
   // PThreads reuse the runtime from the main thread.

  if (Module['postRun']) {
    if (typeof Module['postRun'] == 'function') Module['postRun'] = [Module['postRun']];
    while (Module['postRun'].length) {
      addOnPostRun(Module['postRun'].shift());
    }
  }
  consumedModuleProp('postRun');

  // Begin ATPOSTRUNS hooks
  callRuntimeCallbacks(onPostRuns);
  // End ATPOSTRUNS hooks
}

/**
 * @param {string|number=} what
 */
function abort(what) {
  Module['onAbort']?.(what);

  what = `Aborted(${what})`;
  // TODO(sbc): Should we remove printing and leave it up to whoever
  // catches the exception?
  err(what);

  ABORT = true;

  if (what.search(/RuntimeError: [Uu]nreachable/) >= 0) {
    what += '. "unreachable" may be due to ASYNCIFY_STACK_SIZE not being large enough (try increasing it)';
  }

  // Use a wasm runtime error, because a JS error might be seen as a foreign
  // exception, which means we'd run destructors on it. We need the error to
  // simply make the program stop.
  // FIXME This approach does not work in Wasm EH because it currently does not assume
  // all RuntimeErrors are from traps; it decides whether a RuntimeError is from
  // a trap or not based on a hidden field within the object. So at the moment
  // we don't have a way of throwing a wasm trap from JS. TODO Make a JS API that
  // allows this in the wasm spec.

  // Suppress closure compiler warning here. Closure compiler's builtin extern
  // definition for WebAssembly.RuntimeError claims it takes no arguments even
  // though it can.
  // TODO(https://github.com/google/closure-compiler/pull/3913): Remove if/when upstream closure gets fixed.
  /** @suppress {checkTypes} */
  var e = new WebAssembly.RuntimeError(what);

  // Throw the error whether or not MODULARIZE is set because abort is used
  // in code paths apart from instantiation where an exception is expected
  // to be thrown when abort is called.
  throw e;
}

function createExportWrapper(name, nargs) {
  return (...args) => {
    assert(runtimeInitialized, `native function \`${name}\` called before runtime initialization`);
    var f = wasmExports[name];
    assert(f, `exported native function \`${name}\` not found`);
    // Only assert for too many arguments. Too few can be valid since the missing arguments will be zero filled.
    assert(args.length <= nargs, `native function \`${name}\` called with ${args.length} args but expects ${nargs}`);
    return f(...args);
  };
}

var wasmBinaryFile;

function findWasmBinary() {
  return locateFile('rogomatic.wasm');
}

function getBinarySync(file) {
  if (file == wasmBinaryFile && wasmBinary) {
    return new Uint8Array(wasmBinary);
  }
  if (readBinary) {
    return readBinary(file);
  }
  // Throwing a plain string here, even though it not normally advisable since
  // this gets turning into an `abort` in instantiateArrayBuffer.
  throw 'both async and sync fetching of the wasm failed';
}

async function getWasmBinary(binaryFile) {
  // If we don't have the binary yet, load it asynchronously using readAsync.
  if (!wasmBinary) {
    // Fetch the binary using readAsync
    try {
      var response = await readAsync(binaryFile);
      return new Uint8Array(response);
    } catch {
      // Fall back to getBinarySync below;
    }
  }

  // Otherwise, getBinarySync should be able to get it synchronously
  return getBinarySync(binaryFile);
}

async function instantiateArrayBuffer(binaryFile, imports) {
  try {
    var binary = await getWasmBinary(binaryFile);
    var instance = await WebAssembly.instantiate(binary, imports);
    return instance;
  } catch (reason) {
    err(`failed to asynchronously prepare wasm: ${reason}`);

    // Warn on some common problems.
    if (isFileURI(binaryFile)) {
      err(`warning: Loading from a file URI (${binaryFile}) is not supported in most browsers. See https://emscripten.org/docs/getting_started/FAQ.html#how-do-i-run-a-local-webserver-for-testing-why-does-my-program-stall-in-downloading-or-preparing`);
    }
    abort(reason);
  }
}

async function instantiateAsync(binary, binaryFile, imports) {
  if (!binary
      // Don't use streaming for file:// delivered objects in a webview, fetch them synchronously.
      && !isFileURI(binaryFile)
      // Avoid instantiateStreaming() on Node.js environment for now, as while
      // Node.js v18.1.0 implements it, it does not have a full fetch()
      // implementation yet.
      //
      // Reference:
      //   https://github.com/emscripten-core/emscripten/pull/16917
      && !ENVIRONMENT_IS_NODE
     ) {
    try {
      var response = fetch(binaryFile, { credentials: 'same-origin' });
      var instantiationResult = await WebAssembly.instantiateStreaming(response, imports);
      return instantiationResult;
    } catch (reason) {
      // We expect the most common failure cause to be a bad MIME type for the binary,
      // in which case falling back to ArrayBuffer instantiation should work.
      err(`wasm streaming compile failed: ${reason}`);
      err('falling back to ArrayBuffer instantiation');
      // fall back of instantiateArrayBuffer below
    };
  }
  return instantiateArrayBuffer(binaryFile, imports);
}

function getWasmImports() {
  // instrumenting imports is used in asyncify in two ways: to add assertions
  // that check for proper import use, and for JSPI we use them to set up
  // the Promise API on the import side.
  Asyncify.instrumentWasmImports(wasmImports);
  // prepare imports
  var imports = {
    'env': wasmImports,
    'wasi_snapshot_preview1': wasmImports,
  };
  return imports;
}

// Create the wasm instance.
// Receives the wasm imports, returns the exports.
async function createWasm() {
  // Load the wasm module and create an instance of using native support in the JS engine.
  // handle a generated wasm instance, receiving its exports and
  // performing other necessary setup
  /** @param {WebAssembly.Module=} module*/
  function receiveInstance(instance, module) {
    wasmExports = instance.exports;

    wasmExports = Asyncify.instrumentWasmExports(wasmExports);

    assignWasmExports(wasmExports);

    updateMemoryViews();

    removeRunDependency('wasm-instantiate');
    return wasmExports;
  }
  addRunDependency('wasm-instantiate');

  // Prefer streaming instantiation if available.
  // Async compilation can be confusing when an error on the page overwrites Module
  // (for example, if the order of elements is wrong, and the one defining Module is
  // later), so we save Module and check it later.
  var trueModule = Module;
  function receiveInstantiationResult(result) {
    // 'result' is a ResultObject object which has both the module and instance.
    // receiveInstance() will swap in the exports (to Module.asm) so they can be called
    assert(Module === trueModule, 'the Module object should not be replaced during async compilation - perhaps the order of HTML elements is wrong?');
    trueModule = null;
    // TODO: Due to Closure regression https://github.com/google/closure-compiler/issues/3193, the above line no longer optimizes out down to the following line.
    // When the regression is fixed, can restore the above PTHREADS-enabled path.
    return receiveInstance(result['instance']);
  }

  var info = getWasmImports();

  // User shell pages can write their own Module.instantiateWasm = function(imports, successCallback) callback
  // to manually instantiate the Wasm module themselves. This allows pages to
  // run the instantiation parallel to any other async startup actions they are
  // performing.
  // Also pthreads and wasm workers initialize the wasm instance through this
  // path.
  if (Module['instantiateWasm']) {
    return new Promise((resolve, reject) => {
      try {
        Module['instantiateWasm'](info, (inst, mod) => {
          resolve(receiveInstance(inst, mod));
        });
      } catch(e) {
        err(`Module.instantiateWasm callback failed with error: ${e}`);
        reject(e);
      }
    });
  }

  wasmBinaryFile ??= findWasmBinary();
  var result = await instantiateAsync(wasmBinary, wasmBinaryFile, info);
  var exports = receiveInstantiationResult(result);
  return exports;
}

// end include: preamble.js

// Begin JS library code


  class ExitStatus {
      name = 'ExitStatus';
      constructor(status) {
        this.message = `Program terminated with exit(${status})`;
        this.status = status;
      }
    }

  /** @type {!Int16Array} */
  var HEAP16;

  /** @type {!Int32Array} */
  var HEAP32;

  /** not-@type {!BigInt64Array} */
  var HEAP64;

  /** @type {!Int8Array} */
  var HEAP8;

  /** @type {!Float32Array} */
  var HEAPF32;

  /** @type {!Float64Array} */
  var HEAPF64;

  /** @type {!Uint16Array} */
  var HEAPU16;

  /** @type {!Uint32Array} */
  var HEAPU32;

  /** not-@type {!BigUint64Array} */
  var HEAPU64;

  /** @type {!Uint8Array} */
  var HEAPU8;

  var callRuntimeCallbacks = (callbacks) => {
      while (callbacks.length > 0) {
        // Pass the module as the first argument.
        callbacks.shift()(Module);
      }
    };
  var onPostRuns = [];
  var addOnPostRun = (cb) => onPostRuns.push(cb);

  var onPreRuns = [];
  var addOnPreRun = (cb) => onPreRuns.push(cb);

  var runDependencies = 0;
  
  
  var dependenciesFulfilled = null;
  
  var runDependencyTracking = {
  };
  
  var runDependencyWatcher = null;
  var removeRunDependency = (id) => {
      runDependencies--;
  
      Module['monitorRunDependencies']?.(runDependencies);
  
      assert(id, 'removeRunDependency requires an ID');
      assert(runDependencyTracking[id]);
      delete runDependencyTracking[id];
      if (runDependencies == 0) {
        if (runDependencyWatcher !== null) {
          clearInterval(runDependencyWatcher);
          runDependencyWatcher = null;
        }
        if (dependenciesFulfilled) {
          var callback = dependenciesFulfilled;
          dependenciesFulfilled = null;
          callback(); // can add another dependenciesFulfilled
        }
      }
    };
  
  
  var addRunDependency = (id) => {
      runDependencies++;
  
      Module['monitorRunDependencies']?.(runDependencies);
  
      assert(id, 'addRunDependency requires an ID')
      assert(!runDependencyTracking[id]);
      runDependencyTracking[id] = 1;
      if (runDependencyWatcher === null && globalThis.setInterval) {
        // Check for missing dependencies every few seconds
        runDependencyWatcher = setInterval(() => {
          if (ABORT) {
            clearInterval(runDependencyWatcher);
            runDependencyWatcher = null;
            return;
          }
          var shown = false;
          for (var dep in runDependencyTracking) {
            if (!shown) {
              shown = true;
              err('still waiting on run dependencies:');
            }
            err(`dependency: ${dep}`);
          }
          if (shown) {
            err('(end of list)');
          }
        }, 10000);
        // Prevent this timer from keeping the runtime alive if nothing
        // else is.
        runDependencyWatcher.unref?.()
      }
    };


  var dynCalls = {
  };
  var dynCallLegacy = (sig, ptr, args) => {
      sig = sig.replace(/p/g, 'i')
      assert(sig in dynCalls, `bad function pointer type - sig is not in dynCalls: '${sig}'`);
      if (args?.length) {
        // j (64-bit integer) is fine, and is implemented as a BigInt. Without
        // legalization, the number of parameters should match (j is not expanded
        // into two i's).
        assert(args.length === sig.length - 1);
      } else {
        assert(sig.length == 1);
      }
      var f = dynCalls[sig];
      return f(ptr, ...args);
    };
  var dynCall = (sig, ptr, args = [], promising = false) => {
      assert(ptr, `null function pointer in dynCall`);
      assert(!promising, 'async dynCall is not supported in this mode')
      var rtn = dynCallLegacy(sig, ptr, args);
  
      function convert(rtn) {
        return rtn;
      }
  
      return convert(rtn);
    };

  
    /**
   * @param {number} ptr
   * @param {string} type
   */
  function getValue(ptr, type = 'i8') {
    if (type.endsWith('*')) type = '*';
    switch (type) {
      case 'i1': return HEAP8[ptr];
      case 'i8': return HEAP8[ptr];
      case 'i16': return HEAP16[((ptr)>>1)];
      case 'i32': return HEAP32[((ptr)>>2)];
      case 'i64': return HEAP64[((ptr)>>3)];
      case 'float': return HEAPF32[((ptr)>>2)];
      case 'double': return HEAPF64[((ptr)>>3)];
      case '*': return HEAPU32[((ptr)>>2)];
      default: abort(`invalid type for getValue: ${type}`);
    }
  }

  var noExitRuntime = true;

  function ptrToString(ptr) {
      assert(typeof ptr === 'number', `ptrToString expects a number, got ${typeof ptr}`);
      // Convert to 32-bit unsigned value
      ptr >>>= 0;
      return '0x' + ptr.toString(16).padStart(8, '0');
    }


  var setStackLimits = () => {
      var stackLow = _emscripten_stack_get_base();
      var stackHigh = _emscripten_stack_get_end();
      ___set_stack_limits(stackLow, stackHigh);
    };

  
    /**
   * @param {number} ptr
   * @param {number} value
   * @param {string} type
   */
  function setValue(ptr, value, type = 'i8') {
    if (type.endsWith('*')) type = '*';
    switch (type) {
      case 'i1': HEAP8[ptr] = value;checkInt8(value); break;
      case 'i8': HEAP8[ptr] = value;checkInt8(value); break;
      case 'i16': HEAP16[((ptr)>>1)] = value;checkInt16(value); break;
      case 'i32': HEAP32[((ptr)>>2)] = value;checkInt32(value); break;
      case 'i64': HEAP64[((ptr)>>3)] = BigInt(value);checkInt64(value); break;
      case 'float': HEAPF32[((ptr)>>2)] = value; break;
      case 'double': HEAPF64[((ptr)>>3)] = value; break;
      case '*': HEAPU32[((ptr)>>2)] = value; break;
      default: abort(`invalid type for setValue: ${type}`);
    }
  }

  var stackRestore = (val) => __emscripten_stack_restore(val);

  var stackSave = () => _emscripten_stack_get_current();

  var warnOnce = (text) => {
      warnOnce.shown ||= {};
      if (!warnOnce.shown[text]) {
        warnOnce.shown[text] = 1;
        if (ENVIRONMENT_IS_NODE) text = 'warning: ' + text;
        err(text);
      }
    };

  

  
  
  var ___handle_stack_overflow = (requested) => {
      var base = _emscripten_stack_get_base();
      var end = _emscripten_stack_get_end();
      abort(`stack overflow (Attempt to set SP to ${ptrToString(requested)}` +
            `, with stack limits [${ptrToString(end)} - ${ptrToString(base)}` +
            ']). If you require more stack space build with -sSTACK_SIZE=<bytes>');
    };

  var PATH = {
  isAbs:(path) => path.charAt(0) === '/',
  splitPath:(filename) => {
        var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
        return splitPathRe.exec(filename).slice(1);
      },
  normalizeArray:(parts, allowAboveRoot) => {
        // if the path tries to go above the root, `up` ends up > 0
        var up = 0;
        for (var i = parts.length - 1; i >= 0; i--) {
          var last = parts[i];
          if (last === '.') {
            parts.splice(i, 1);
          } else if (last === '..') {
            parts.splice(i, 1);
            up++;
          } else if (up) {
            parts.splice(i, 1);
            up--;
          }
        }
        // if the path is allowed to go above the root, restore leading ..s
        if (allowAboveRoot) {
          for (; up; up--) {
            parts.unshift('..');
          }
        }
        return parts;
      },
  normalize:(path) => {
        var isAbsolute = PATH.isAbs(path),
            trailingSlash = path.slice(-1) === '/';
        // Normalize the path
        path = PATH.normalizeArray(path.split('/').filter((p) => !!p), !isAbsolute).join('/');
        if (!path && !isAbsolute) {
          path = '.';
        }
        if (path && trailingSlash) {
          path += '/';
        }
        return (isAbsolute ? '/' : '') + path;
      },
  dirname:(path) => {
        var result = PATH.splitPath(path),
            root = result[0],
            dir = result[1];
        if (!root && !dir) {
          // No dirname whatsoever
          return '.';
        }
        if (dir) {
          // It has a dirname, strip trailing slash
          dir = dir.slice(0, -1);
        }
        return root + dir;
      },
  basename:(path) => path && path.match(/([^\/]+|\/)\/*$/)[1],
join:(...paths) => PATH.normalize(paths.join('/')),
join2:(l, r) => PATH.normalize(l + '/' + r),
};

var initRandomFill = () => {
    // This block is not needed on v19+ since crypto.getRandomValues is builtin
    if (ENVIRONMENT_IS_NODE) {
      var nodeCrypto = require('node:crypto');
      return (view) => nodeCrypto.randomFillSync(view);
    }

    return (view) => (crypto.getRandomValues(view), 0);
  };
var randomFill = (view) => (randomFill = initRandomFill())(view);



var PATH_FS = {
resolve:(...args) => {
      var resolvedPath = '',
        resolvedAbsolute = false;
      for (var i = args.length - 1; i >= -1 && !resolvedAbsolute; i--) {
        var path = (i >= 0) ? args[i] : FS.cwd();
        // Skip empty and invalid entries
        if (typeof path != 'string') {
          throw new TypeError('Arguments to path.resolve must be strings');
        } else if (!path) {
          return ''; // an invalid portion invalidates the whole thing
        }
        resolvedPath = path + '/' + resolvedPath;
        resolvedAbsolute = PATH.isAbs(path);
      }
      // At this point the path should be resolved to a full absolute path, but
      // handle relative paths to be safe (might happen when process.cwd() fails)
      resolvedPath = PATH.normalizeArray(resolvedPath.split('/').filter((p) => !!p), !resolvedAbsolute).join('/');
      return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
    },
relative:(from, to) => {
      from = PATH_FS.resolve(from).slice(1);
      to = PATH_FS.resolve(to).slice(1);
      function trim(arr) {
        var start = 0;
        for (; start < arr.length; start++) {
          if (arr[start] !== '') break;
        }
        var end = arr.length - 1;
        for (; end >= 0; end--) {
          if (arr[end] !== '') break;
        }
        if (start > end) return [];
        return arr.slice(start, end - start + 1);
      }
      var fromParts = trim(from.split('/'));
      var toParts = trim(to.split('/'));
      var length = Math.min(fromParts.length, toParts.length);
      var samePartsLength = length;
      for (var i = 0; i < length; i++) {
        if (fromParts[i] !== toParts[i]) {
          samePartsLength = i;
          break;
        }
      }
      var outputParts = [];
      for (var i = samePartsLength; i < fromParts.length; i++) {
        outputParts.push('..');
      }
      outputParts = outputParts.concat(toParts.slice(samePartsLength));
      return outputParts.join('/');
    },
};


var UTF8Decoder = globalThis.TextDecoder && new TextDecoder();

var findStringEnd = (heapOrArray, idx, maxBytesToRead, ignoreNul) => {
    var maxIdx = idx + maxBytesToRead;
    if (ignoreNul) return maxIdx;
    // TextDecoder needs to know the byte length in advance, it doesn't stop on
    // null terminator by itself.
    // As a tiny code save trick, compare idx against maxIdx using a negation,
    // so that maxBytesToRead=undefined/NaN means Infinity.
    while (heapOrArray[idx] && !(idx >= maxIdx)) ++idx;
    return idx;
  };


  /**
   * Given a pointer 'idx' to a null-terminated UTF8-encoded string in the given
   * array that contains uint8 values, returns a copy of that string as a
   * Javascript String object.
   * heapOrArray is either a regular array, or a JavaScript typed array view.
   * @param {number=} idx
   * @param {number=} maxBytesToRead
   * @param {boolean=} ignoreNul - If true, the function will not stop on a NUL character.
   * @return {string}
   */
  var UTF8ArrayToString = (heapOrArray, idx = 0, maxBytesToRead, ignoreNul) => {
  
      var endPtr = findStringEnd(heapOrArray, idx, maxBytesToRead, ignoreNul);
  
      // When using conditional TextDecoder, skip it for short strings as the overhead of the native call is not worth it.
      if (endPtr - idx > 16 && heapOrArray.buffer && UTF8Decoder) {
        return UTF8Decoder.decode(heapOrArray.subarray(idx, endPtr));
      }
      var str = '';
      while (idx < endPtr) {
        // For UTF8 byte structure, see:
        // http://en.wikipedia.org/wiki/UTF-8#Description
        // https://www.ietf.org/rfc/rfc2279.txt
        // https://tools.ietf.org/html/rfc3629
        var u0 = heapOrArray[idx++];
        if (!(u0 & 0x80)) { str += String.fromCharCode(u0); continue; }
        var u1 = heapOrArray[idx++] & 63;
        if ((u0 & 0xE0) == 0xC0) { str += String.fromCharCode(((u0 & 31) << 6) | u1); continue; }
        var u2 = heapOrArray[idx++] & 63;
        if ((u0 & 0xF0) == 0xE0) {
          u0 = ((u0 & 15) << 12) | (u1 << 6) | u2;
        } else {
          if ((u0 & 0xF8) != 0xF0) warnOnce(`Invalid UTF-8 leading byte ${ptrToString(u0)} encountered when deserializing a UTF-8 string in wasm memory to a JS string!`);
          u0 = ((u0 & 7) << 18) | (u1 << 12) | (u2 << 6) | (heapOrArray[idx++] & 63);
        }
  
        if (u0 < 0x10000) {
          str += String.fromCharCode(u0);
        } else {
          var ch = u0 - 0x10000;
          str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
        }
      }
      return str;
    };
  
  var FS_stdin_getChar_buffer = [];
  
  var lengthBytesUTF8 = (str) => {
      var len = 0;
      for (var i = 0; i < str.length; ++i) {
        // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code
        // unit, not a Unicode code point of the character! So decode
        // UTF16->UTF32->UTF8.
        // See http://unicode.org/faq/utf_bom.html#utf16-3
        var c = str.charCodeAt(i); // possibly a lead surrogate
        if (c <= 0x7F) {
          len++;
        } else if (c <= 0x7FF) {
          len += 2;
        } else if (c >= 0xD800 && c <= 0xDFFF) {
          len += 4; ++i;
        } else {
          len += 3;
        }
      }
      return len;
    };
  
  var stringToUTF8Array = (str, heap, outIdx, maxBytesToWrite) => {
      assert(typeof str === 'string', `stringToUTF8Array expects a string (got ${typeof str})`);
      // Parameter maxBytesToWrite is not optional. Negative values, 0, null,
      // undefined and false each don't write out any bytes.
      if (!(maxBytesToWrite > 0))
        return 0;
  
      var startIdx = outIdx;
      var endIdx = outIdx + maxBytesToWrite - 1; // -1 for string null terminator.
      for (var i = 0; i < str.length; ++i) {
        // For UTF8 byte structure, see http://en.wikipedia.org/wiki/UTF-8#Description
        // and https://www.ietf.org/rfc/rfc2279.txt
        // and https://tools.ietf.org/html/rfc3629
        var u = str.codePointAt(i);
        if (u <= 0x7F) {
          if (outIdx >= endIdx) break;
          heap[outIdx++] = u;
        } else if (u <= 0x7FF) {
          if (outIdx + 1 >= endIdx) break;
          heap[outIdx++] = 0xC0 | (u >> 6);
          heap[outIdx++] = 0x80 | (u & 63);
        } else if (u <= 0xFFFF) {
          if (outIdx + 2 >= endIdx) break;
          heap[outIdx++] = 0xE0 | (u >> 12);
          heap[outIdx++] = 0x80 | ((u >> 6) & 63);
          heap[outIdx++] = 0x80 | (u & 63);
        } else {
          if (outIdx + 3 >= endIdx) break;
          if (u > 0x10FFFF) warnOnce(`Invalid Unicode code point ${ptrToString(u)} encountered when serializing a JS string to a UTF-8 string in wasm memory! (Valid unicode code points should be in range 0-0x10FFFF).`);
          heap[outIdx++] = 0xF0 | (u >> 18);
          heap[outIdx++] = 0x80 | ((u >> 12) & 63);
          heap[outIdx++] = 0x80 | ((u >> 6) & 63);
          heap[outIdx++] = 0x80 | (u & 63);
          // Gotcha: if codePoint is over 0xFFFF, it is represented as a surrogate pair in UTF-16.
          // We need to manually skip over the second code unit for correct iteration.
          i++;
        }
      }
      // Null-terminate the pointer to the buffer.
      heap[outIdx] = 0;
      return outIdx - startIdx;
    };
  /** @type {function(string, boolean=, number=)} */
  var intArrayFromString = (stringy, dontAddNull, length) => {
      var len = length > 0 ? length : lengthBytesUTF8(stringy)+1;
      var u8array = new Array(len);
      var numBytesWritten = stringToUTF8Array(stringy, u8array, 0, u8array.length);
      if (dontAddNull) u8array.length = numBytesWritten;
      return u8array;
    };
  var FS_stdin_getChar = () => {
      if (!FS_stdin_getChar_buffer.length) {
        var result = null;
        if (ENVIRONMENT_IS_NODE) {
          // we will read data by chunks of BUFSIZE
          var BUFSIZE = 256;
          var buf = Buffer.alloc(BUFSIZE);
          var bytesRead = 0;
  
          // For some reason we must suppress a closure warning here, even though
          // fd definitely exists on process.stdin, and is even the proper way to
          // get the fd of stdin,
          // https://github.com/nodejs/help/issues/2136#issuecomment-523649904
          // This started to happen after moving this logic out of library_tty.js,
          // so it is related to the surrounding code in some unclear manner.
          /** @suppress {missingProperties} */
          var fd = process.stdin.fd;
  
          try {
            bytesRead = fs.readSync(fd, buf, 0, BUFSIZE);
          } catch(e) {
            // Cross-platform differences: on Windows, reading EOF throws an
            // exception, but on other OSes, reading EOF returns 0. Uniformize
            // behavior by treating the EOF exception to return 0.
            if (e.toString().includes('EOF')) bytesRead = 0;
            else throw e;
          }
  
          if (bytesRead > 0) {
            result = buf.slice(0, bytesRead).toString('utf-8');
          }
        } else
        if (globalThis.window?.prompt) {
          // Browser.
          result = window.prompt('Input: ');  // returns null on cancel
          if (result !== null) {
            result += '\n';
          }
        } else
        {}
        if (!result) {
          return null;
        }
        FS_stdin_getChar_buffer = intArrayFromString(result, true);
      }
      return FS_stdin_getChar_buffer.shift();
    };
  var TTY = {
  ttys:[],
  init() {
        // https://github.com/emscripten-core/emscripten/pull/1555
        // if (ENVIRONMENT_IS_NODE) {
        //   // currently, FS.init does not distinguish if process.stdin is a file or TTY
        //   // device, it always assumes it's a TTY device. because of this, we're forcing
        //   // process.stdin to UTF8 encoding to at least make stdin reading compatible
        //   // with text files until FS.init can be refactored.
        //   process.stdin.setEncoding('utf8');
        // }
      },
  shutdown() {
        // https://github.com/emscripten-core/emscripten/pull/1555
        // if (ENVIRONMENT_IS_NODE) {
        //   // inolen: any idea as to why node -e 'process.stdin.read()' wouldn't exit immediately (with process.stdin being a tty)?
        //   // isaacs: because now it's reading from the stream, you've expressed interest in it, so that read() kicks off a _read() which creates a ReadReq operation
        //   // inolen: I thought read() in that case was a synchronous operation that just grabbed some amount of buffered data if it exists?
        //   // isaacs: it is. but it also triggers a _read() call, which calls readStart() on the handle
        //   // isaacs: do process.stdin.pause() and i'd think it'd probably close the pending call
        //   process.stdin.pause();
        // }
      },
  register(dev, ops) {
        TTY.ttys[dev] = { input: [], output: [], ops: ops };
        FS.registerDevice(dev, TTY.stream_ops);
      },
  stream_ops:{
  open(stream) {
          var tty = TTY.ttys[stream.node.rdev];
          if (!tty) {
            throw new FS.ErrnoError(43);
          }
          stream.tty = tty;
          stream.seekable = false;
        },
  close(stream) {
          // flush any pending line data
          stream.tty.ops.fsync(stream.tty);
        },
  fsync(stream) {
          stream.tty.ops.fsync(stream.tty);
        },
  read(stream, buffer, offset, length, pos /* ignored */) {
          if (!stream.tty || !stream.tty.ops.get_char) {
            throw new FS.ErrnoError(60);
          }
          var bytesRead = 0;
          for (var i = 0; i < length; i++) {
            var result;
            try {
              result = stream.tty.ops.get_char(stream.tty);
            } catch (e) {
              throw new FS.ErrnoError(29);
            }
            if (result === undefined && bytesRead === 0) {
              throw new FS.ErrnoError(6);
            }
            if (result === null || result === undefined) break;
            bytesRead++;
            buffer[offset+i] = result;
          }
          if (bytesRead) {
            stream.node.atime = Date.now();
          }
          return bytesRead;
        },
  write(stream, buffer, offset, length, pos) {
          if (!stream.tty || !stream.tty.ops.put_char) {
            throw new FS.ErrnoError(60);
          }
          try {
            for (var i = 0; i < length; i++) {
              stream.tty.ops.put_char(stream.tty, buffer[offset+i]);
            }
          } catch (e) {
            throw new FS.ErrnoError(29);
          }
          if (length) {
            stream.node.mtime = stream.node.ctime = Date.now();
          }
          return i;
        },
  },
  default_tty_ops:{
  get_char(tty) {
          return FS_stdin_getChar();
        },
  put_char(tty, val) {
          if (val === null || val === 10) {
            out(UTF8ArrayToString(tty.output));
            tty.output = [];
          } else {
            if (val != 0) tty.output.push(val); // val == 0 would cut text output off in the middle.
          }
        },
  fsync(tty) {
          if (tty.output?.length > 0) {
            out(UTF8ArrayToString(tty.output));
            tty.output = [];
          }
        },
  ioctl_tcgets(tty) {
          // typical setting
          return {
            c_iflag: 25856,
            c_oflag: 5,
            c_cflag: 191,
            c_lflag: 35387,
            c_cc: [
              0x03, 0x1c, 0x7f, 0x15, 0x04, 0x00, 0x01, 0x00, 0x11, 0x13, 0x1a, 0x00,
              0x12, 0x0f, 0x17, 0x16, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
              0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            ]
          };
        },
  ioctl_tcsets(tty, optional_actions, data) {
          // currently just ignore
          return 0;
        },
  ioctl_tiocgwinsz(tty) {
          return [24, 80];
        },
  },
  default_tty1_ops:{
  put_char(tty, val) {
          if (val === null || val === 10) {
            err(UTF8ArrayToString(tty.output));
            tty.output = [];
          } else {
            if (val != 0) tty.output.push(val);
          }
        },
  fsync(tty) {
          if (tty.output?.length > 0) {
            err(UTF8ArrayToString(tty.output));
            tty.output = [];
          }
        },
  },
  };
  
  
  var mmapAlloc = (size) => {
      abort('internal error: mmapAlloc called but `emscripten_builtin_memalign` native symbol not exported');
    };
  var MEMFS = {
  ops_table:null,
  mount(mount) {
        return MEMFS.createNode(null, '/', 16895, 0);
      },
  createNode(parent, name, mode, dev) {
        if (FS.isBlkdev(mode) || FS.isFIFO(mode)) {
          // not supported
          throw new FS.ErrnoError(63);
        }
        MEMFS.ops_table ||= {
          dir: {
            node: {
              getattr: MEMFS.node_ops.getattr,
              setattr: MEMFS.node_ops.setattr,
              lookup: MEMFS.node_ops.lookup,
              mknod: MEMFS.node_ops.mknod,
              rename: MEMFS.node_ops.rename,
              unlink: MEMFS.node_ops.unlink,
              rmdir: MEMFS.node_ops.rmdir,
              readdir: MEMFS.node_ops.readdir,
              symlink: MEMFS.node_ops.symlink
            },
            stream: {
              llseek: MEMFS.stream_ops.llseek
            }
          },
          file: {
            node: {
              getattr: MEMFS.node_ops.getattr,
              setattr: MEMFS.node_ops.setattr
            },
            stream: {
              llseek: MEMFS.stream_ops.llseek,
              read: MEMFS.stream_ops.read,
              write: MEMFS.stream_ops.write,
              mmap: MEMFS.stream_ops.mmap,
              msync: MEMFS.stream_ops.msync
            }
          },
          link: {
            node: {
              getattr: MEMFS.node_ops.getattr,
              setattr: MEMFS.node_ops.setattr,
              readlink: MEMFS.node_ops.readlink
            },
            stream: {}
          },
          chrdev: {
            node: {
              getattr: MEMFS.node_ops.getattr,
              setattr: MEMFS.node_ops.setattr
            },
            stream: FS.chrdev_stream_ops
          }
        };
        var node = FS.createNode(parent, name, mode, dev);
        if (FS.isDir(node.mode)) {
          node.node_ops = MEMFS.ops_table.dir.node;
          node.stream_ops = MEMFS.ops_table.dir.stream;
          node.contents = {};
        } else if (FS.isFile(node.mode)) {
          node.node_ops = MEMFS.ops_table.file.node;
          node.stream_ops = MEMFS.ops_table.file.stream;
          // The actual number of bytes used in the typed array, as opposed to
          // contents.length which gives the whole capacity.
          node.usedBytes = 0;
          // The byte data of the file is stored in a typed array.
          // Note: typed arrays are not resizable like normal JS arrays are, so
          // there is a small penalty involved for appending file writes that
          // continuously grow a file similar to std::vector capacity vs used.
          node.contents = MEMFS.emptyFileContents ??= new Uint8Array(0);
        } else if (FS.isLink(node.mode)) {
          node.node_ops = MEMFS.ops_table.link.node;
          node.stream_ops = MEMFS.ops_table.link.stream;
        } else if (FS.isChrdev(node.mode)) {
          node.node_ops = MEMFS.ops_table.chrdev.node;
          node.stream_ops = MEMFS.ops_table.chrdev.stream;
        }
        node.atime = node.mtime = node.ctime = Date.now();
        // add the new node to the parent
        if (parent) {
          parent.contents[name] = node;
          parent.atime = parent.mtime = parent.ctime = node.atime;
        }
        return node;
      },
  getFileDataAsTypedArray(node) {
        assert(FS.isFile(node.mode), 'getFileDataAsTypedArray called on non-file');
        return node.contents.subarray(0, node.usedBytes); // Make sure to not return excess unused bytes.
      },
  expandFileStorage(node, newCapacity) {
        var prevCapacity = node.contents.length;
        if (prevCapacity >= newCapacity) return; // No need to expand, the storage was already large enough.
        // Don't expand strictly to the given requested limit if it's only a very
        // small increase, but instead geometrically grow capacity.
        // For small filesizes (<1MB), perform size*2 geometric increase, but for
        // large sizes, do a much more conservative size*1.125 increase to avoid
        // overshooting the allocation cap by a very large margin.
        var CAPACITY_DOUBLING_MAX = 1024 * 1024;
        newCapacity = Math.max(newCapacity, (prevCapacity * (prevCapacity < CAPACITY_DOUBLING_MAX ? 2.0 : 1.125)) >>> 0);
        if (prevCapacity) newCapacity = Math.max(newCapacity, 256); // At minimum allocate 256b for each file when expanding.
        var oldContents = MEMFS.getFileDataAsTypedArray(node);
        node.contents = new Uint8Array(newCapacity); // Allocate new storage.
        node.contents.set(oldContents);
      },
  resizeFileStorage(node, newSize) {
        if (node.usedBytes == newSize) return;
        var oldContents = node.contents;
        node.contents = new Uint8Array(newSize); // Allocate new storage.
        node.contents.set(oldContents.subarray(0, Math.min(newSize, node.usedBytes))); // Copy old data over to the new storage.
        node.usedBytes = newSize;
      },
  node_ops:{
  getattr(node) {
          var attr = {};
          // device numbers reuse inode numbers.
          attr.dev = FS.isChrdev(node.mode) ? node.id : 1;
          attr.ino = node.id;
          attr.mode = node.mode;
          attr.nlink = 1;
          attr.uid = 0;
          attr.gid = 0;
          attr.rdev = node.rdev;
          if (FS.isDir(node.mode)) {
            attr.size = 4096;
          } else if (FS.isFile(node.mode)) {
            attr.size = node.usedBytes;
          } else if (FS.isLink(node.mode)) {
            attr.size = node.link.length;
          } else {
            attr.size = 0;
          }
          attr.atime = new Date(node.atime);
          attr.mtime = new Date(node.mtime);
          attr.ctime = new Date(node.ctime);
          // NOTE: In our implementation, st_blocks = Math.ceil(st_size/st_blksize),
          //       but this is not required by the standard.
          attr.blksize = 4096;
          attr.blocks = Math.ceil(attr.size / attr.blksize);
          return attr;
        },
  setattr(node, attr) {
          for (const key of ["mode", "atime", "mtime", "ctime"]) {
            if (attr[key] != null) {
              node[key] = attr[key];
            }
          }
          if (attr.size !== undefined) {
            MEMFS.resizeFileStorage(node, attr.size);
          }
        },
  lookup(parent, name) {
          throw new FS.ErrnoError(44);
        },
  mknod(parent, name, mode, dev) {
          return MEMFS.createNode(parent, name, mode, dev);
        },
  rename(old_node, new_dir, new_name) {
          var new_node;
          try {
            new_node = FS.lookupNode(new_dir, new_name);
          } catch (e) {}
          if (new_node) {
            if (FS.isDir(old_node.mode)) {
              // if we're overwriting a directory at new_name, make sure it's empty.
              for (var i in new_node.contents) {
                throw new FS.ErrnoError(55);
              }
            }
            FS.hashRemoveNode(new_node);
          }
          // do the internal rewiring
          delete old_node.parent.contents[old_node.name];
          new_dir.contents[new_name] = old_node;
          old_node.name = new_name;
          new_dir.ctime = new_dir.mtime = old_node.parent.ctime = old_node.parent.mtime = Date.now();
        },
  unlink(parent, name) {
          delete parent.contents[name];
          parent.ctime = parent.mtime = Date.now();
        },
  rmdir(parent, name) {
          var node = FS.lookupNode(parent, name);
          for (var i in node.contents) {
            throw new FS.ErrnoError(55);
          }
          delete parent.contents[name];
          parent.ctime = parent.mtime = Date.now();
        },
  readdir(node) {
          return ['.', '..', ...Object.keys(node.contents)];
        },
  symlink(parent, newname, oldpath) {
          var node = MEMFS.createNode(parent, newname, 0o777 | 40960, 0);
          node.link = oldpath;
          return node;
        },
  readlink(node) {
          if (!FS.isLink(node.mode)) {
            throw new FS.ErrnoError(28);
          }
          return node.link;
        },
  },
  stream_ops:{
  read(stream, buffer, offset, length, position) {
          var contents = stream.node.contents;
          if (position >= stream.node.usedBytes) return 0;
          var size = Math.min(stream.node.usedBytes - position, length);
          assert(size >= 0);
          buffer.set(contents.subarray(position, position + size), offset);
          return size;
        },
  write(stream, buffer, offset, length, position, canOwn) {
          assert(buffer.subarray, 'FS.write expects a TypedArray');
  
          if (!length) return 0;
          var node = stream.node;
          node.mtime = node.ctime = Date.now();
  
          if (canOwn) {
            assert(position === 0, 'canOwn must imply no weird position inside the file');
            node.contents = buffer.subarray(offset, offset + length);
            node.usedBytes = length;
          } else if (node.usedBytes === 0 && position === 0) { // If this is a simple first write to an empty file, do a fast set since we don't need to care about old data.
            node.contents = buffer.slice(offset, offset + length);
            node.usedBytes = length;
          } else {
            MEMFS.expandFileStorage(node, position+length);
            // Use typed array write which is available.
            node.contents.set(buffer.subarray(offset, offset + length), position);
            node.usedBytes = Math.max(node.usedBytes, position + length);
          }
          return length;
        },
  llseek(stream, offset, whence) {
          var position = offset;
          if (whence === 1) {
            position += stream.position;
          } else if (whence === 2) {
            if (FS.isFile(stream.node.mode)) {
              position += stream.node.usedBytes;
            }
          }
          if (position < 0) {
            throw new FS.ErrnoError(28);
          }
          return position;
        },
  mmap(stream, length, position, prot, flags) {
          if (!FS.isFile(stream.node.mode)) {
            throw new FS.ErrnoError(43);
          }
          var ptr;
          var allocated;
          var contents = stream.node.contents;
          // Only make a new copy when MAP_PRIVATE is specified.
          if (!(flags & 2) && contents.buffer === HEAP8.buffer) {
            // We can't emulate MAP_SHARED when the file is not backed by the
            // buffer we're mapping to (e.g. the HEAP buffer).
            allocated = false;
            ptr = contents.byteOffset;
          } else {
            allocated = true;
            ptr = mmapAlloc(length);
            if (!ptr) {
              throw new FS.ErrnoError(48);
            }
            if (contents) {
              // Try to avoid unnecessary slices.
              if (position > 0 || position + length < contents.length) {
                if (contents.subarray) {
                  contents = contents.subarray(position, position + length);
                } else {
                  contents = Array.prototype.slice.call(contents, position, position + length);
                }
              }
              HEAP8.set(contents, ptr);
            }
          }
          return { ptr, allocated };
        },
  msync(stream, buffer, offset, length, mmapFlags) {
          MEMFS.stream_ops.write(stream, buffer, 0, length, offset, false);
          // should we check if bytesWritten and length are the same?
          return 0;
        },
  },
  };
  
  var FS_modeStringToFlags = (str) => {
      if (typeof str != 'string') return str;
      var flagModes = {
        'r': 0,
        'r+': 2,
        'w': 512 | 64 | 1,
        'w+': 512 | 64 | 2,
        'a': 1024 | 64 | 1,
        'a+': 1024 | 64 | 2,
      };
      var flags = flagModes[str];
      if (typeof flags == 'undefined') {
        throw new Error(`Unknown file open mode: ${str}`);
      }
      return flags;
    };
  
  var FS_fileDataToTypedArray = (data) => {
      if (typeof data == 'string') {
        data = intArrayFromString(data, true);
      }
      if (!data.subarray) {
        data = new Uint8Array(data);
      }
      return data;
    };
  
  var FS_getMode = (canRead, canWrite) => {
      var mode = 0;
      if (canRead) mode |= 292 | 73;
      if (canWrite) mode |= 146;
      return mode;
    };
  
  
  
  
    /**
   * Given a pointer 'ptr' to a null-terminated UTF8-encoded string in the
   * emscripten HEAP, returns a copy of that string as a Javascript String object.
   *
   * @param {number} ptr
   * @param {number=} maxBytesToRead - An optional length that specifies the
   *   maximum number of bytes to read. You can omit this parameter to scan the
   *   string until the first 0 byte. If maxBytesToRead is passed, and the string
   *   at [ptr, ptr+maxBytesToReadr[ contains a null byte in the middle, then the
   *   string will cut short at that byte index.
   * @param {boolean=} ignoreNul - If true, the function will not stop on a NUL character.
   * @return {string}
   */
  var UTF8ToString = (ptr, maxBytesToRead, ignoreNul) => {
      assert(typeof ptr == 'number', `UTF8ToString expects a number (got ${typeof ptr})`);
      return ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead, ignoreNul) : '';
    };
  
  var strError = (errno) => UTF8ToString(_strerror(errno));
  
  var ERRNO_CODES = {
      'EPERM': 63,
      'ENOENT': 44,
      'ESRCH': 71,
      'EINTR': 27,
      'EIO': 29,
      'ENXIO': 60,
      'E2BIG': 1,
      'ENOEXEC': 45,
      'EBADF': 8,
      'ECHILD': 12,
      'EAGAIN': 6,
      'EWOULDBLOCK': 6,
      'ENOMEM': 48,
      'EACCES': 2,
      'EFAULT': 21,
      'ENOTBLK': 105,
      'EBUSY': 10,
      'EEXIST': 20,
      'EXDEV': 75,
      'ENODEV': 43,
      'ENOTDIR': 54,
      'EISDIR': 31,
      'EINVAL': 28,
      'ENFILE': 41,
      'EMFILE': 33,
      'ENOTTY': 59,
      'ETXTBSY': 74,
      'EFBIG': 22,
      'ENOSPC': 51,
      'ESPIPE': 70,
      'EROFS': 69,
      'EMLINK': 34,
      'EPIPE': 64,
      'EDOM': 18,
      'ERANGE': 68,
      'ENOMSG': 49,
      'EIDRM': 24,
      'ECHRNG': 106,
      'EL2NSYNC': 156,
      'EL3HLT': 107,
      'EL3RST': 108,
      'ELNRNG': 109,
      'EUNATCH': 110,
      'ENOCSI': 111,
      'EL2HLT': 112,
      'EDEADLK': 16,
      'ENOLCK': 46,
      'EBADE': 113,
      'EBADR': 114,
      'EXFULL': 115,
      'ENOANO': 104,
      'EBADRQC': 103,
      'EBADSLT': 102,
      'EDEADLOCK': 16,
      'EBFONT': 101,
      'ENOSTR': 100,
      'ENODATA': 116,
      'ETIME': 117,
      'ENOSR': 118,
      'ENONET': 119,
      'ENOPKG': 120,
      'EREMOTE': 121,
      'ENOLINK': 47,
      'EADV': 122,
      'ESRMNT': 123,
      'ECOMM': 124,
      'EPROTO': 65,
      'EMULTIHOP': 36,
      'EDOTDOT': 125,
      'EBADMSG': 9,
      'ENOTUNIQ': 126,
      'EBADFD': 127,
      'EREMCHG': 128,
      'ELIBACC': 129,
      'ELIBBAD': 130,
      'ELIBSCN': 131,
      'ELIBMAX': 132,
      'ELIBEXEC': 133,
      'ENOSYS': 52,
      'ENOTEMPTY': 55,
      'ENAMETOOLONG': 37,
      'ELOOP': 32,
      'EOPNOTSUPP': 138,
      'EPFNOSUPPORT': 139,
      'ECONNRESET': 15,
      'ENOBUFS': 42,
      'EAFNOSUPPORT': 5,
      'EPROTOTYPE': 67,
      'ENOTSOCK': 57,
      'ENOPROTOOPT': 50,
      'ESHUTDOWN': 140,
      'ECONNREFUSED': 14,
      'EADDRINUSE': 3,
      'ECONNABORTED': 13,
      'ENETUNREACH': 40,
      'ENETDOWN': 38,
      'ETIMEDOUT': 73,
      'EHOSTDOWN': 142,
      'EHOSTUNREACH': 23,
      'EINPROGRESS': 26,
      'EALREADY': 7,
      'EDESTADDRREQ': 17,
      'EMSGSIZE': 35,
      'EPROTONOSUPPORT': 66,
      'ESOCKTNOSUPPORT': 137,
      'EADDRNOTAVAIL': 4,
      'ENETRESET': 39,
      'EISCONN': 30,
      'ENOTCONN': 53,
      'ETOOMANYREFS': 141,
      'EUSERS': 136,
      'EDQUOT': 19,
      'ESTALE': 72,
      'ENOTSUP': 138,
      'ENOMEDIUM': 148,
      'EILSEQ': 25,
      'EOVERFLOW': 61,
      'ECANCELED': 11,
      'ENOTRECOVERABLE': 56,
      'EOWNERDEAD': 62,
      'ESTRPIPE': 135,
    };
  
  var asyncLoad = async (url) => {
      var arrayBuffer = await readAsync(url);
      assert(arrayBuffer, `Loading data file "${url}" failed (no arrayBuffer).`);
      return new Uint8Array(arrayBuffer);
    };
  
  
  var FS_createDataFile = (...args) => FS.createDataFile(...args);
  
  var getUniqueRunDependency = (id) => {
      var orig = id;
      while (1) {
        if (!runDependencyTracking[id]) return id;
        id = orig + Math.random();
      }
    };
  
  
  
  var preloadPlugins = [];
  var FS_handledByPreloadPlugin = async (byteArray, fullname) => {
      // Ensure plugins are ready.
      if (typeof Browser != 'undefined') Browser.init();
  
      for (var plugin of preloadPlugins) {
        if (plugin['canHandle'](fullname)) {
          assert(plugin['handle'].constructor.name === 'AsyncFunction', 'Filesystem plugin handlers must be async functions (See #24914)')
          return plugin['handle'](byteArray, fullname);
        }
      }
      // If no plugin handled this file then return the original/unmodified
      // byteArray.
      return byteArray;
    };
  var FS_preloadFile = async (parent, name, url, canRead, canWrite, dontCreateFile, canOwn, preFinish) => {
      // TODO we should allow people to just pass in a complete filename instead
      // of parent and name being that we just join them anyways
      var fullname = name ? PATH_FS.resolve(PATH.join2(parent, name)) : parent;
      var dep = getUniqueRunDependency(`cp ${fullname}`); // might have several active requests for the same fullname
      addRunDependency(dep);
  
      try {
        var byteArray = url;
        if (typeof url == 'string') {
          byteArray = await asyncLoad(url);
        }
  
        byteArray = await FS_handledByPreloadPlugin(byteArray, fullname);
        preFinish?.();
        if (!dontCreateFile) {
          FS_createDataFile(parent, name, byteArray, canRead, canWrite, canOwn);
        }
      } finally {
        removeRunDependency(dep);
      }
    };
  var FS_createPreloadedFile = (parent, name, url, canRead, canWrite, onload, onerror, dontCreateFile, canOwn, preFinish) => {
      FS_preloadFile(parent, name, url, canRead, canWrite, dontCreateFile, canOwn, preFinish).then(onload).catch(onerror);
    };
  var FS = {
  root:null,
  mounts:[],
  devices:{
  },
  streams:[],
  nextInode:1,
  nameTable:null,
  currentPath:"/",
  initialized:false,
  ignorePermissions:true,
  filesystems:null,
  syncFSRequests:0,
  ErrnoError:class extends Error {
        name = 'ErrnoError';
        // We set the `name` property to be able to identify `FS.ErrnoError`
        // - the `name` is a standard ECMA-262 property of error objects. Kind of good to have it anyway.
        // - when using PROXYFS, an error can come from an underlying FS
        // as different FS objects have their own FS.ErrnoError each,
        // the test `err instanceof FS.ErrnoError` won't detect an error coming from another filesystem, causing bugs.
        // we'll use the reliable test `err.name == "ErrnoError"` instead
        constructor(errno) {
          super(runtimeInitialized ? strError(errno) : '');
          this.errno = errno;
          for (var key in ERRNO_CODES) {
            if (ERRNO_CODES[key] === errno) {
              this.code = key;
              break;
            }
          }
        }
      },
  FSStream:class {
        shared = {};
        get object() {
          return this.node;
        }
        set object(val) {
          this.node = val;
        }
        get isRead() {
          return (this.flags & 2097155) !== 1;
        }
        get isWrite() {
          return (this.flags & 2097155) !== 0;
        }
        get isAppend() {
          return (this.flags & 1024);
        }
        get flags() {
          return this.shared.flags;
        }
        set flags(val) {
          this.shared.flags = val;
        }
        get position() {
          return this.shared.position;
        }
        set position(val) {
          this.shared.position = val;
        }
      },
  FSNode:class {
        node_ops = {};
        stream_ops = {};
        readMode = 292 | 73;
        writeMode = 146;
        mounted = null;
        constructor(parent, name, mode, rdev) {
          if (!parent) {
            parent = this;  // root node sets parent to itself
          }
          this.parent = parent;
          this.mount = parent.mount;
          this.id = FS.nextInode++;
          this.name = name;
          this.mode = mode;
          this.rdev = rdev;
          this.atime = this.mtime = this.ctime = Date.now();
        }
        get read() {
          return (this.mode & this.readMode) === this.readMode;
        }
        set read(val) {
          val ? this.mode |= this.readMode : this.mode &= ~this.readMode;
        }
        get write() {
          return (this.mode & this.writeMode) === this.writeMode;
        }
        set write(val) {
          val ? this.mode |= this.writeMode : this.mode &= ~this.writeMode;
        }
        get isFolder() {
          return FS.isDir(this.mode);
        }
        get isDevice() {
          return FS.isChrdev(this.mode);
        }
      },
  lookupPath(path, opts = {}) {
        if (!path) {
          throw new FS.ErrnoError(44);
        }
        opts.follow_mount ??= true
  
        if (!PATH.isAbs(path)) {
          path = FS.cwd() + '/' + path;
        }
  
        // limit max consecutive symlinks to SYMLOOP_MAX.
        linkloop: for (var nlinks = 0; nlinks < 40; nlinks++) {
          // split the absolute path
          var parts = path.split('/').filter((p) => !!p);
  
          // start at the root
          var current = FS.root;
          var current_path = '/';
  
          for (var i = 0; i < parts.length; i++) {
            var islast = (i === parts.length-1);
            if (islast && opts.parent) {
              // stop resolving
              break;
            }
  
            if (parts[i] === '.') {
              continue;
            }
  
            if (parts[i] === '..') {
              current_path = PATH.dirname(current_path);
              if (FS.isRoot(current)) {
                path = current_path + '/' + parts.slice(i + 1).join('/');
                // We're making progress here, don't let many consecutive ..'s
                // lead to ELOOP
                nlinks--;
                continue linkloop;
              } else {
                current = current.parent;
              }
              continue;
            }
  
            current_path = PATH.join2(current_path, parts[i]);
            try {
              current = FS.lookupNode(current, parts[i]);
            } catch (e) {
              // if noent_okay is true, suppress a ENOENT in the last component
              // and return an object with an undefined node. This is needed for
              // resolving symlinks in the path when creating a file.
              if ((e?.errno === 44) && islast && opts.noent_okay) {
                return { path: current_path };
              }
              throw e;
            }
  
            // jump to the mount's root node if this is a mountpoint
            if (FS.isMountpoint(current) && (!islast || opts.follow_mount)) {
              current = current.mounted.root;
            }
  
            // by default, lookupPath will not follow a symlink if it is the final path component.
            // setting opts.follow = true will override this behavior.
            if (FS.isLink(current.mode) && (!islast || opts.follow)) {
              if (!current.node_ops.readlink) {
                throw new FS.ErrnoError(52);
              }
              var link = current.node_ops.readlink(current);
              if (!PATH.isAbs(link)) {
                link = PATH.dirname(current_path) + '/' + link;
              }
              path = link + '/' + parts.slice(i + 1).join('/');
              continue linkloop;
            }
          }
          return { path: current_path, node: current };
        }
        throw new FS.ErrnoError(32);
      },
  getPath(node) {
        var path;
        while (true) {
          if (FS.isRoot(node)) {
            var mount = node.mount.mountpoint;
            if (!path) return mount;
            return mount[mount.length-1] !== '/' ? `${mount}/${path}` : mount + path;
          }
          path = path ? `${node.name}/${path}` : node.name;
          node = node.parent;
        }
      },
  hashName(parentid, name) {
        var hash = 0;
  
        for (var i = 0; i < name.length; i++) {
          hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
        }
        return ((parentid + hash) >>> 0) % FS.nameTable.length;
      },
  hashAddNode(node) {
        var hash = FS.hashName(node.parent.id, node.name);
        node.name_next = FS.nameTable[hash];
        FS.nameTable[hash] = node;
      },
  hashRemoveNode(node) {
        var hash = FS.hashName(node.parent.id, node.name);
        if (FS.nameTable[hash] === node) {
          FS.nameTable[hash] = node.name_next;
        } else {
          var current = FS.nameTable[hash];
          while (current) {
            if (current.name_next === node) {
              current.name_next = node.name_next;
              break;
            }
            current = current.name_next;
          }
        }
      },
  lookupNode(parent, name) {
        var errCode = FS.mayLookup(parent);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        var hash = FS.hashName(parent.id, name);
        for (var node = FS.nameTable[hash]; node; node = node.name_next) {
          var nodeName = node.name;
          if (node.parent.id === parent.id && nodeName === name) {
            return node;
          }
        }
        // if we failed to find it in the cache, call into the VFS
        return FS.lookup(parent, name);
      },
  createNode(parent, name, mode, rdev) {
        assert(typeof parent == 'object')
        var node = new FS.FSNode(parent, name, mode, rdev);
  
        FS.hashAddNode(node);
  
        return node;
      },
  destroyNode(node) {
        FS.hashRemoveNode(node);
      },
  isRoot(node) {
        return node === node.parent;
      },
  isMountpoint(node) {
        return !!node.mounted;
      },
  isFile(mode) {
        return (mode & 61440) === 32768;
      },
  isDir(mode) {
        return (mode & 61440) === 16384;
      },
  isLink(mode) {
        return (mode & 61440) === 40960;
      },
  isChrdev(mode) {
        return (mode & 61440) === 8192;
      },
  isBlkdev(mode) {
        return (mode & 61440) === 24576;
      },
  isFIFO(mode) {
        return (mode & 61440) === 4096;
      },
  isSocket(mode) {
        return (mode & 49152) === 49152;
      },
  flagsToPermissionString(flag) {
        var perms = ['r', 'w', 'rw'][flag & 3];
        if ((flag & 512)) {
          perms += 'w';
        }
        return perms;
      },
  nodePermissions(node, perms) {
        if (FS.ignorePermissions) {
          return 0;
        }
        // return 0 if any user, group or owner bits are set.
        if (perms.includes('r') && !(node.mode & 292)) {
          return 2;
        }
        if (perms.includes('w') && !(node.mode & 146)) {
          return 2;
        }
        if (perms.includes('x') && !(node.mode & 73)) {
          return 2;
        }
        return 0;
      },
  mayLookup(dir) {
        if (!FS.isDir(dir.mode)) return 54;
        var errCode = FS.nodePermissions(dir, 'x');
        if (errCode) return errCode;
        if (!dir.node_ops.lookup) return 2;
        return 0;
      },
  mayCreate(dir, name) {
        if (!FS.isDir(dir.mode)) {
          return 54;
        }
        try {
          var node = FS.lookupNode(dir, name);
          return 20;
        } catch (e) {
        }
        return FS.nodePermissions(dir, 'wx');
      },
  mayDelete(dir, name, isdir) {
        var node;
        try {
          node = FS.lookupNode(dir, name);
        } catch (e) {
          return e.errno;
        }
        var errCode = FS.nodePermissions(dir, 'wx');
        if (errCode) {
          return errCode;
        }
        if (isdir) {
          if (!FS.isDir(node.mode)) {
            return 54;
          }
          if (FS.isRoot(node) || FS.getPath(node) === FS.cwd()) {
            return 10;
          }
        } else if (FS.isDir(node.mode)) {
          return 31;
        }
        return 0;
      },
  mayOpen(node, flags) {
        if (!node) {
          return 44;
        }
        if (FS.isLink(node.mode)) {
          return 32;
        }
        var mode = FS.flagsToPermissionString(flags);
        if (FS.isDir(node.mode)) {
          // opening for write
          // TODO: check for O_SEARCH? (== search for dir only)
          if (mode !== 'r' || (flags & (512 | 64))) {
            return 31;
          }
        }
        return FS.nodePermissions(node, mode);
      },
  checkOpExists(op, err) {
        if (!op) {
          throw new FS.ErrnoError(err);
        }
        return op;
      },
  MAX_OPEN_FDS:4096,
  nextfd() {
        for (var fd = 0; fd <= FS.MAX_OPEN_FDS; fd++) {
          if (!FS.streams[fd]) {
            return fd;
          }
        }
        throw new FS.ErrnoError(33);
      },
  getStreamChecked(fd) {
        var stream = FS.getStream(fd);
        if (!stream) {
          throw new FS.ErrnoError(8);
        }
        return stream;
      },
  getStream:(fd) => FS.streams[fd],
  createStream(stream, fd = -1) {
        assert(fd >= -1);
  
        // clone it, so we can return an instance of FSStream
        stream = Object.assign(new FS.FSStream(), stream);
        if (fd == -1) {
          fd = FS.nextfd();
        }
        stream.fd = fd;
        FS.streams[fd] = stream;
        return stream;
      },
  closeStream(fd) {
        FS.streams[fd] = null;
      },
  dupStream(origStream, fd = -1) {
        var stream = FS.createStream(origStream, fd);
        stream.stream_ops?.dup?.(stream);
        return stream;
      },
  doSetAttr(stream, node, attr) {
        var setattr = stream?.stream_ops.setattr;
        var arg = setattr ? stream : node;
        setattr ??= node.node_ops.setattr;
        FS.checkOpExists(setattr, 63)
        try {
          setattr(arg, attr);
        } catch (e) {
          if (e instanceof RangeError) {
            throw new FS.ErrnoError(22);
          }
          throw e;
        }
      },
  chrdev_stream_ops:{
  open(stream) {
          var device = FS.getDevice(stream.node.rdev);
          // override node's stream ops with the device's
          stream.stream_ops = device.stream_ops;
          // forward the open call
          stream.stream_ops.open?.(stream);
        },
  llseek() {
          throw new FS.ErrnoError(70);
        },
  },
  major:(dev) => ((dev) >> 8),
  minor:(dev) => ((dev) & 0xff),
  makedev:(ma, mi) => ((ma) << 8 | (mi)),
  registerDevice(dev, ops) {
        FS.devices[dev] = { stream_ops: ops };
      },
  getDevice:(dev) => FS.devices[dev],
  getMounts(mount) {
        var mounts = [];
        var check = [mount];
  
        while (check.length) {
          var m = check.pop();
  
          mounts.push(m);
  
          check.push(...m.mounts);
        }
  
        return mounts;
      },
  syncfs(populate, callback) {
        if (typeof populate == 'function') {
          callback = populate;
          populate = false;
        }
  
        FS.syncFSRequests++;
  
        if (FS.syncFSRequests > 1) {
          err(`warning: ${FS.syncFSRequests} FS.syncfs operations in flight at once, probably just doing extra work`);
        }
  
        var mounts = FS.getMounts(FS.root.mount);
        var completed = 0;
  
        function doCallback(errCode) {
          assert(FS.syncFSRequests > 0);
          FS.syncFSRequests--;
          return callback(errCode);
        }
  
        function done(errCode) {
          if (errCode) {
            if (!done.errored) {
              done.errored = true;
              return doCallback(errCode);
            }
            return;
          }
          if (++completed >= mounts.length) {
            doCallback(null);
          }
        };
  
        // sync all mounts
        for (var mount of mounts) {
          if (mount.type.syncfs) {
            mount.type.syncfs(mount, populate, done);
          } else {
            done(null);
          }
        }
      },
  mount(type, opts, mountpoint) {
        if (typeof type == 'string') {
          // The filesystem was not included, and instead we have an error
          // message stored in the variable.
          throw type;
        }
        var root = mountpoint === '/';
        var pseudo = !mountpoint;
        var node;
  
        if (root && FS.root) {
          throw new FS.ErrnoError(10);
        } else if (!root && !pseudo) {
          var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
  
          mountpoint = lookup.path;  // use the absolute path
          node = lookup.node;
  
          if (FS.isMountpoint(node)) {
            throw new FS.ErrnoError(10);
          }
  
          if (!FS.isDir(node.mode)) {
            throw new FS.ErrnoError(54);
          }
        }
  
        var mount = {
          type,
          opts,
          mountpoint,
          mounts: []
        };
  
        // create a root node for the fs
        var mountRoot = type.mount(mount);
        mountRoot.mount = mount;
        mount.root = mountRoot;
  
        if (root) {
          FS.root = mountRoot;
        } else if (node) {
          // set as a mountpoint
          node.mounted = mount;
  
          // add the new mount to the current mount's children
          if (node.mount) {
            node.mount.mounts.push(mount);
          }
        }
  
        return mountRoot;
      },
  unmount(mountpoint) {
        var lookup = FS.lookupPath(mountpoint, { follow_mount: false });
  
        if (!FS.isMountpoint(lookup.node)) {
          throw new FS.ErrnoError(28);
        }
  
        // destroy the nodes for this mount, and all its child mounts
        var node = lookup.node;
        var mount = node.mounted;
        var mounts = FS.getMounts(mount);
  
        for (var [hash, current] of Object.entries(FS.nameTable)) {
          while (current) {
            var next = current.name_next;
  
            if (mounts.includes(current.mount)) {
              FS.destroyNode(current);
            }
  
            current = next;
          }
        }
  
        // no longer a mountpoint
        node.mounted = null;
  
        // remove this mount from the child mounts
        var idx = node.mount.mounts.indexOf(mount);
        assert(idx !== -1);
        node.mount.mounts.splice(idx, 1);
      },
  lookup(parent, name) {
        return parent.node_ops.lookup(parent, name);
      },
  mknod(path, mode, dev) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        if (!name) {
          throw new FS.ErrnoError(28);
        }
        if (name === '.' || name === '..') {
          throw new FS.ErrnoError(20);
        }
        var errCode = FS.mayCreate(parent, name);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        if (!parent.node_ops.mknod) {
          throw new FS.ErrnoError(63);
        }
        return parent.node_ops.mknod(parent, name, mode, dev);
      },
  statfs(path) {
        return FS.statfsNode(FS.lookupPath(path, {follow: true}).node);
      },
  statfsStream(stream) {
        // We keep a separate statfsStream function because noderawfs overrides
        // it. In noderawfs, stream.node is sometimes null. Instead, we need to
        // look at stream.path.
        return FS.statfsNode(stream.node);
      },
  statfsNode(node) {
        // NOTE: None of the defaults here are true. We're just returning safe and
        //       sane values. Currently nodefs and rawfs replace these defaults,
        //       other file systems leave them alone.
        var rtn = {
          bsize: 4096,
          frsize: 4096,
          blocks: 1e6,
          bfree: 5e5,
          bavail: 5e5,
          files: FS.nextInode,
          ffree: FS.nextInode - 1,
          fsid: 42,
          flags: 2,
          namelen: 255,
        };
  
        if (node.node_ops.statfs) {
          Object.assign(rtn, node.node_ops.statfs(node.mount.opts.root));
        }
        return rtn;
      },
  create(path, mode = 0o666) {
        mode &= 4095;
        mode |= 32768;
        return FS.mknod(path, mode, 0);
      },
  mkdir(path, mode = 0o777) {
        mode &= 511 | 512;
        mode |= 16384;
        return FS.mknod(path, mode, 0);
      },
  mkdirTree(path, mode) {
        var dirs = path.split('/');
        var d = '';
        for (var dir of dirs) {
          if (!dir) continue;
          if (d || PATH.isAbs(path)) d += '/';
          d += dir;
          try {
            FS.mkdir(d, mode);
          } catch(e) {
            if (e.errno != 20) throw e;
          }
        }
      },
  mkdev(path, mode, dev) {
        if (typeof dev == 'undefined') {
          dev = mode;
          mode = 0o666;
        }
        mode |= 8192;
        return FS.mknod(path, mode, dev);
      },
  symlink(oldpath, newpath) {
        if (!PATH_FS.resolve(oldpath)) {
          throw new FS.ErrnoError(44);
        }
        var lookup = FS.lookupPath(newpath, { parent: true });
        var parent = lookup.node;
        if (!parent) {
          throw new FS.ErrnoError(44);
        }
        var newname = PATH.basename(newpath);
        var errCode = FS.mayCreate(parent, newname);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        if (!parent.node_ops.symlink) {
          throw new FS.ErrnoError(63);
        }
        return parent.node_ops.symlink(parent, newname, oldpath);
      },
  rename(old_path, new_path) {
        var old_dirname = PATH.dirname(old_path);
        var new_dirname = PATH.dirname(new_path);
        var old_name = PATH.basename(old_path);
        var new_name = PATH.basename(new_path);
        // parents must exist
        var lookup, old_dir, new_dir;
  
        // let the errors from non existent directories percolate up
        lookup = FS.lookupPath(old_path, { parent: true });
        old_dir = lookup.node;
        lookup = FS.lookupPath(new_path, { parent: true });
        new_dir = lookup.node;
  
        if (!old_dir || !new_dir) throw new FS.ErrnoError(44);
        // need to be part of the same mount
        if (old_dir.mount !== new_dir.mount) {
          throw new FS.ErrnoError(75);
        }
        // source must exist
        var old_node = FS.lookupNode(old_dir, old_name);
        // old path should not be an ancestor of the new path
        var relative = PATH_FS.relative(old_path, new_dirname);
        if (relative.charAt(0) !== '.') {
          throw new FS.ErrnoError(28);
        }
        // new path should not be an ancestor of the old path
        relative = PATH_FS.relative(new_path, old_dirname);
        if (relative.charAt(0) !== '.') {
          throw new FS.ErrnoError(55);
        }
        // see if the new path already exists
        var new_node;
        try {
          new_node = FS.lookupNode(new_dir, new_name);
        } catch (e) {
          // not fatal
        }
        // early out if nothing needs to change
        if (old_node === new_node) {
          return;
        }
        // we'll need to delete the old entry
        var isdir = FS.isDir(old_node.mode);
        var errCode = FS.mayDelete(old_dir, old_name, isdir);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        // need delete permissions if we'll be overwriting.
        // need create permissions if new doesn't already exist.
        errCode = new_node ?
          FS.mayDelete(new_dir, new_name, isdir) :
          FS.mayCreate(new_dir, new_name);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        if (!old_dir.node_ops.rename) {
          throw new FS.ErrnoError(63);
        }
        if (FS.isMountpoint(old_node) || (new_node && FS.isMountpoint(new_node))) {
          throw new FS.ErrnoError(10);
        }
        // if we are going to change the parent, check write permissions
        if (new_dir !== old_dir) {
          errCode = FS.nodePermissions(old_dir, 'w');
          if (errCode) {
            throw new FS.ErrnoError(errCode);
          }
        }
        // remove the node from the lookup hash
        FS.hashRemoveNode(old_node);
        // do the underlying fs rename
        try {
          old_dir.node_ops.rename(old_node, new_dir, new_name);
          // update old node (we do this here to avoid each backend
          // needing to)
          old_node.parent = new_dir;
        } catch (e) {
          throw e;
        } finally {
          // add the node back to the hash (in case node_ops.rename
          // changed its name)
          FS.hashAddNode(old_node);
        }
      },
  rmdir(path) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var errCode = FS.mayDelete(parent, name, true);
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        if (!parent.node_ops.rmdir) {
          throw new FS.ErrnoError(63);
        }
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(10);
        }
        parent.node_ops.rmdir(parent, name);
        FS.destroyNode(node);
      },
  readdir(path) {
        var lookup = FS.lookupPath(path, { follow: true });
        var node = lookup.node;
        var readdir = FS.checkOpExists(node.node_ops.readdir, 54);
        return readdir(node);
      },
  unlink(path) {
        var lookup = FS.lookupPath(path, { parent: true });
        var parent = lookup.node;
        if (!parent) {
          throw new FS.ErrnoError(44);
        }
        var name = PATH.basename(path);
        var node = FS.lookupNode(parent, name);
        var errCode = FS.mayDelete(parent, name, false);
        if (errCode) {
          // According to POSIX, we should map EISDIR to EPERM, but
          // we instead do what Linux does (and we must, as we use
          // the musl linux libc).
          throw new FS.ErrnoError(errCode);
        }
        if (!parent.node_ops.unlink) {
          throw new FS.ErrnoError(63);
        }
        if (FS.isMountpoint(node)) {
          throw new FS.ErrnoError(10);
        }
        parent.node_ops.unlink(parent, name);
        FS.destroyNode(node);
      },
  readlink(path) {
        var lookup = FS.lookupPath(path);
        var link = lookup.node;
        if (!link) {
          throw new FS.ErrnoError(44);
        }
        if (!link.node_ops.readlink) {
          throw new FS.ErrnoError(28);
        }
        return link.node_ops.readlink(link);
      },
  stat(path, dontFollow) {
        var lookup = FS.lookupPath(path, { follow: !dontFollow });
        var node = lookup.node;
        var getattr = FS.checkOpExists(node.node_ops.getattr, 63);
        return getattr(node);
      },
  fstat(fd) {
        var stream = FS.getStreamChecked(fd);
        var node = stream.node;
        var getattr = stream.stream_ops.getattr;
        var arg = getattr ? stream : node;
        getattr ??= node.node_ops.getattr;
        FS.checkOpExists(getattr, 63)
        return getattr(arg);
      },
  lstat(path) {
        return FS.stat(path, true);
      },
  doChmod(stream, node, mode, dontFollow) {
        FS.doSetAttr(stream, node, {
          mode: (mode & 4095) | (node.mode & ~4095),
          ctime: Date.now(),
          dontFollow
        });
      },
  chmod(path, mode, dontFollow) {
        var node;
        if (typeof path == 'string') {
          var lookup = FS.lookupPath(path, { follow: !dontFollow });
          node = lookup.node;
        } else {
          node = path;
        }
        FS.doChmod(null, node, mode, dontFollow);
      },
  lchmod(path, mode) {
        FS.chmod(path, mode, true);
      },
  fchmod(fd, mode) {
        var stream = FS.getStreamChecked(fd);
        FS.doChmod(stream, stream.node, mode, false);
      },
  doChown(stream, node, dontFollow) {
        FS.doSetAttr(stream, node, {
          timestamp: Date.now(),
          dontFollow
          // we ignore the uid / gid for now
        });
      },
  chown(path, uid, gid, dontFollow) {
        var node;
        if (typeof path == 'string') {
          var lookup = FS.lookupPath(path, { follow: !dontFollow });
          node = lookup.node;
        } else {
          node = path;
        }
        FS.doChown(null, node, dontFollow);
      },
  lchown(path, uid, gid) {
        FS.chown(path, uid, gid, true);
      },
  fchown(fd, uid, gid) {
        var stream = FS.getStreamChecked(fd);
        FS.doChown(stream, stream.node, false);
      },
  doTruncate(stream, node, len) {
        if (FS.isDir(node.mode)) {
          throw new FS.ErrnoError(31);
        }
        if (!FS.isFile(node.mode)) {
          throw new FS.ErrnoError(28);
        }
        var errCode = FS.nodePermissions(node, 'w');
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        FS.doSetAttr(stream, node, {
          size: len,
          timestamp: Date.now()
        });
      },
  truncate(path, len) {
        if (len < 0) {
          throw new FS.ErrnoError(28);
        }
        var node;
        if (typeof path == 'string') {
          var lookup = FS.lookupPath(path, { follow: true });
          node = lookup.node;
        } else {
          node = path;
        }
        FS.doTruncate(null, node, len);
      },
  ftruncate(fd, len) {
        var stream = FS.getStreamChecked(fd);
        if (len < 0 || (stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(28);
        }
        FS.doTruncate(stream, stream.node, len);
      },
  utime(path, atime, mtime) {
        var lookup = FS.lookupPath(path, { follow: true });
        var node = lookup.node;
        var setattr = FS.checkOpExists(node.node_ops.setattr, 63);
        setattr(node, {
          atime: atime,
          mtime: mtime
        });
      },
  open(path, flags, mode = 0o666) {
        if (path === "") {
          throw new FS.ErrnoError(44);
        }
        flags = FS_modeStringToFlags(flags);
        if ((flags & 64)) {
          mode = (mode & 4095) | 32768;
        } else {
          mode = 0;
        }
        var node;
        var isDirPath;
        if (typeof path == 'object') {
          node = path;
        } else {
          isDirPath = path.endsWith("/");
          // noent_okay makes it so that if the final component of the path
          // doesn't exist, lookupPath returns `node: undefined`. `path` will be
          // updated to point to the target of all symlinks.
          var lookup = FS.lookupPath(path, {
            follow: !(flags & 131072),
            noent_okay: true
          });
          node = lookup.node;
          path = lookup.path;
        }
        // perhaps we need to create the node
        var created = false;
        if ((flags & 64)) {
          if (node) {
            // if O_CREAT and O_EXCL are set, error out if the node already exists
            if ((flags & 128)) {
              throw new FS.ErrnoError(20);
            }
          } else if (isDirPath) {
            throw new FS.ErrnoError(31);
          } else {
            // node doesn't exist, try to create it
            // Ignore the permission bits here to ensure we can `open` this new
            // file below. We use chmod below to apply the permissions once the
            // file is open.
            node = FS.mknod(path, mode | 0o777, 0);
            created = true;
          }
        }
        if (!node) {
          throw new FS.ErrnoError(44);
        }
        // can't truncate a device
        if (FS.isChrdev(node.mode)) {
          flags &= ~512;
        }
        // if asked only for a directory, then this must be one
        if ((flags & 65536) && !FS.isDir(node.mode)) {
          throw new FS.ErrnoError(54);
        }
        // check permissions, if this is not a file we just created now (it is ok to
        // create and write to a file with read-only permissions; it is read-only
        // for later use)
        if (!created) {
          var errCode = FS.mayOpen(node, flags);
          if (errCode) {
            throw new FS.ErrnoError(errCode);
          }
        }
        // do truncation if necessary
        if ((flags & 512) && !created) {
          FS.truncate(node, 0);
        }
        // we've already handled these, don't pass down to the underlying vfs
        flags &= ~(128 | 512 | 131072);
  
        // register the stream with the filesystem
        var stream = FS.createStream({
          node,
          path: FS.getPath(node),  // we want the absolute path to the node
          flags,
          seekable: true,
          position: 0,
          stream_ops: node.stream_ops,
          // used by the file family libc calls (fopen, fwrite, ferror, etc.)
          ungotten: [],
          error: false
        });
        // call the new stream's open function
        if (stream.stream_ops.open) {
          stream.stream_ops.open(stream);
        }
        if (created) {
          FS.chmod(node, mode & 0o777);
        }
        return stream;
      },
  close(stream) {
        if (FS.isClosed(stream)) {
          throw new FS.ErrnoError(8);
        }
        if (stream.getdents) stream.getdents = null; // free readdir state
        try {
          if (stream.stream_ops.close) {
            stream.stream_ops.close(stream);
          }
        } catch (e) {
          throw e;
        } finally {
          FS.closeStream(stream.fd);
        }
        stream.fd = null;
      },
  isClosed(stream) {
        return stream.fd === null;
      },
  llseek(stream, offset, whence) {
        if (FS.isClosed(stream)) {
          throw new FS.ErrnoError(8);
        }
        if (!stream.seekable || !stream.stream_ops.llseek) {
          throw new FS.ErrnoError(70);
        }
        if (whence != 0 && whence != 1 && whence != 2) {
          throw new FS.ErrnoError(28);
        }
        stream.position = stream.stream_ops.llseek(stream, offset, whence);
        stream.ungotten = [];
        return stream.position;
      },
  read(stream, buffer, offset, length, position) {
        assert(offset >= 0);
        if (length < 0 || position < 0) {
          throw new FS.ErrnoError(28);
        }
        if (FS.isClosed(stream)) {
          throw new FS.ErrnoError(8);
        }
        if ((stream.flags & 2097155) === 1) {
          throw new FS.ErrnoError(8);
        }
        if (FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(31);
        }
        if (!stream.stream_ops.read) {
          throw new FS.ErrnoError(28);
        }
        var seeking = typeof position != 'undefined';
        if (!seeking) {
          position = stream.position;
        } else if (!stream.seekable) {
          throw new FS.ErrnoError(70);
        }
        var bytesRead = stream.stream_ops.read(stream, buffer, offset, length, position);
        if (!seeking) stream.position += bytesRead;
        return bytesRead;
      },
  write(stream, buffer, offset, length, position, canOwn) {
        assert(offset >= 0);
        assert(buffer.subarray, 'FS.write expects a TypedArray');
        if (length < 0 || position < 0) {
          throw new FS.ErrnoError(28);
        }
        if (FS.isClosed(stream)) {
          throw new FS.ErrnoError(8);
        }
        if ((stream.flags & 2097155) === 0) {
          throw new FS.ErrnoError(8);
        }
        if (FS.isDir(stream.node.mode)) {
          throw new FS.ErrnoError(31);
        }
        if (!stream.stream_ops.write) {
          throw new FS.ErrnoError(28);
        }
        if (stream.seekable && stream.flags & 1024) {
          // seek to the end before writing in append mode
          FS.llseek(stream, 0, 2);
        }
        var seeking = typeof position != 'undefined';
        if (!seeking) {
          position = stream.position;
        } else if (!stream.seekable) {
          throw new FS.ErrnoError(70);
        }
        var bytesWritten = stream.stream_ops.write(stream, buffer, offset, length, position, canOwn);
        if (!seeking) stream.position += bytesWritten;
        return bytesWritten;
      },
  mmap(stream, length, position, prot, flags) {
        // User requests writing to file (prot & PROT_WRITE != 0).
        // Checking if we have permissions to write to the file unless
        // MAP_PRIVATE flag is set. According to POSIX spec it is possible
        // to write to file opened in read-only mode with MAP_PRIVATE flag,
        // as all modifications will be visible only in the memory of
        // the current process.
        if ((prot & 2) !== 0
            && (flags & 2) === 0
            && (stream.flags & 2097155) !== 2) {
          throw new FS.ErrnoError(2);
        }
        if ((stream.flags & 2097155) === 1) {
          throw new FS.ErrnoError(2);
        }
        if (!stream.stream_ops.mmap) {
          throw new FS.ErrnoError(43);
        }
        if (!length) {
          throw new FS.ErrnoError(28);
        }
        return stream.stream_ops.mmap(stream, length, position, prot, flags);
      },
  msync(stream, buffer, offset, length, mmapFlags) {
        assert(offset >= 0);
        if (!stream.stream_ops.msync) {
          return 0;
        }
        return stream.stream_ops.msync(stream, buffer, offset, length, mmapFlags);
      },
  ioctl(stream, cmd, arg) {
        if (!stream.stream_ops.ioctl) {
          throw new FS.ErrnoError(59);
        }
        return stream.stream_ops.ioctl(stream, cmd, arg);
      },
  readFile(path, opts = {}) {
        opts.flags = opts.flags ?? 0;
        opts.encoding = opts.encoding ?? 'binary';
        if (opts.encoding !== 'utf8' && opts.encoding !== 'binary') {
          abort(`Invalid encoding type "${opts.encoding}"`);
        }
        var stream = FS.open(path, opts.flags);
        var stat = FS.stat(path);
        var length = stat.size;
        var buf = new Uint8Array(length);
        FS.read(stream, buf, 0, length, 0);
        if (opts.encoding === 'utf8') {
          buf = UTF8ArrayToString(buf);
        }
        FS.close(stream);
        return buf;
      },
  writeFile(path, data, opts = {}) {
        opts.flags = opts.flags ?? 577;
        var stream = FS.open(path, opts.flags, opts.mode);
        data = FS_fileDataToTypedArray(data);
        FS.write(stream, data, 0, data.byteLength, undefined, opts.canOwn);
        FS.close(stream);
      },
  cwd:() => FS.currentPath,
  chdir(path) {
        var lookup = FS.lookupPath(path, { follow: true });
        if (lookup.node === null) {
          throw new FS.ErrnoError(44);
        }
        if (!FS.isDir(lookup.node.mode)) {
          throw new FS.ErrnoError(54);
        }
        var errCode = FS.nodePermissions(lookup.node, 'x');
        if (errCode) {
          throw new FS.ErrnoError(errCode);
        }
        FS.currentPath = lookup.path;
      },
  createDefaultDirectories() {
        FS.mkdir('/tmp');
        FS.mkdir('/home');
        FS.mkdir('/home/web_user');
      },
  createDefaultDevices() {
        // create /dev
        FS.mkdir('/dev');
        // setup /dev/null
        FS.registerDevice(FS.makedev(1, 3), {
          read: () => 0,
          write: (stream, buffer, offset, length, pos) => length,
          llseek: () => 0,
        });
        FS.mkdev('/dev/null', FS.makedev(1, 3));
        // setup /dev/tty and /dev/tty1
        // stderr needs to print output using err() rather than out()
        // so we register a second tty just for it.
        TTY.register(FS.makedev(5, 0), TTY.default_tty_ops);
        TTY.register(FS.makedev(6, 0), TTY.default_tty1_ops);
        FS.mkdev('/dev/tty', FS.makedev(5, 0));
        FS.mkdev('/dev/tty1', FS.makedev(6, 0));
        // setup /dev/[u]random
        // use a buffer to avoid overhead of individual crypto calls per byte
        var randomBuffer = new Uint8Array(1024), randomLeft = 0;
        var randomByte = () => {
          if (randomLeft === 0) {
            randomFill(randomBuffer);
            randomLeft = randomBuffer.byteLength;
          }
          return randomBuffer[--randomLeft];
        };
        FS.createDevice('/dev', 'random', randomByte);
        FS.createDevice('/dev', 'urandom', randomByte);
        // we're not going to emulate the actual shm device,
        // just create the tmp dirs that reside in it commonly
        FS.mkdir('/dev/shm');
        FS.mkdir('/dev/shm/tmp');
      },
  createSpecialDirectories() {
        // create /proc/self/fd which allows /proc/self/fd/6 => readlink gives the
        // name of the stream for fd 6 (see test_unistd_ttyname)
        FS.mkdir('/proc');
        var proc_self = FS.mkdir('/proc/self');
        FS.mkdir('/proc/self/fd');
        FS.mount({
          mount() {
            var node = FS.createNode(proc_self, 'fd', 16895, 73);
            node.stream_ops = {
              llseek: MEMFS.stream_ops.llseek,
            };
            node.node_ops = {
              lookup(parent, name) {
                var fd = +name;
                var stream = FS.getStreamChecked(fd);
                var ret = {
                  parent: null,
                  mount: { mountpoint: 'fake' },
                  node_ops: { readlink: () => stream.path },
                  id: fd + 1,
                };
                ret.parent = ret; // make it look like a simple root node
                return ret;
              },
              readdir() {
                return Array.from(FS.streams.entries())
                  .filter(([k, v]) => v)
                  .map(([k, v]) => k.toString());
              }
            };
            return node;
          }
        }, {}, '/proc/self/fd');
      },
  createStandardStreams(input, output, error) {
        // TODO deprecate the old functionality of a single
        // input / output callback and that utilizes FS.createDevice
        // and instead require a unique set of stream ops
  
        // by default, we symlink the standard streams to the
        // default tty devices. however, if the standard streams
        // have been overwritten we create a unique device for
        // them instead.
        if (input) {
          FS.createDevice('/dev', 'stdin', input);
        } else {
          FS.symlink('/dev/tty', '/dev/stdin');
        }
        if (output) {
          FS.createDevice('/dev', 'stdout', null, output);
        } else {
          FS.symlink('/dev/tty', '/dev/stdout');
        }
        if (error) {
          FS.createDevice('/dev', 'stderr', null, error);
        } else {
          FS.symlink('/dev/tty1', '/dev/stderr');
        }
  
        // open default streams for the stdin, stdout and stderr devices
        var stdin = FS.open('/dev/stdin', 0);
        var stdout = FS.open('/dev/stdout', 1);
        var stderr = FS.open('/dev/stderr', 1);
        assert(stdin.fd === 0, `invalid handle for stdin (${stdin.fd})`);
        assert(stdout.fd === 1, `invalid handle for stdout (${stdout.fd})`);
        assert(stderr.fd === 2, `invalid handle for stderr (${stderr.fd})`);
      },
  staticInit() {
        FS.nameTable = new Array(4096);
  
        FS.mount(MEMFS, {}, '/');
  
        FS.createDefaultDirectories();
        FS.createDefaultDevices();
        FS.createSpecialDirectories();
  
        FS.filesystems = {
          'MEMFS': MEMFS,
        };
      },
  init(input, output, error) {
        assert(!FS.initialized, 'FS.init was previously called. If you want to initialize later with custom parameters, remove any earlier calls (note that one is automatically added to the generated code)');
        FS.initialized = true;
  
        // Allow Module.stdin etc. to provide defaults, if none explicitly passed to us here
        input ??= Module['stdin'];
        output ??= Module['stdout'];
        error ??= Module['stderr'];
  
        FS.createStandardStreams(input, output, error);
      },
  quit() {
        FS.initialized = false;
        // force-flush all streams, so we get musl std streams printed out
        _fflush(0);
        // close all of our streams
        for (var stream of FS.streams) {
          if (stream) {
            FS.close(stream);
          }
        }
      },
  findObject(path, dontResolveLastLink) {
        var ret = FS.analyzePath(path, dontResolveLastLink);
        if (!ret.exists) {
          return null;
        }
        return ret.object;
      },
  analyzePath(path, dontResolveLastLink) {
        // operate from within the context of the symlink's target
        try {
          var lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
          path = lookup.path;
        } catch (e) {
        }
        var ret = {
          isRoot: false, exists: false, error: 0, name: null, path: null, object: null,
          parentExists: false, parentPath: null, parentObject: null
        };
        try {
          var lookup = FS.lookupPath(path, { parent: true });
          ret.parentExists = true;
          ret.parentPath = lookup.path;
          ret.parentObject = lookup.node;
          ret.name = PATH.basename(path);
          lookup = FS.lookupPath(path, { follow: !dontResolveLastLink });
          ret.exists = true;
          ret.path = lookup.path;
          ret.object = lookup.node;
          ret.name = lookup.node.name;
          ret.isRoot = lookup.path === '/';
        } catch (e) {
          ret.error = e.errno;
        };
        return ret;
      },
  createPath(parent, path, canRead, canWrite) {
        parent = typeof parent == 'string' ? parent : FS.getPath(parent);
        var parts = path.split('/').reverse();
        while (parts.length) {
          var part = parts.pop();
          if (!part) continue;
          var current = PATH.join2(parent, part);
          try {
            FS.mkdir(current);
          } catch (e) {
            if (e.errno != 20) throw e;
          }
          parent = current;
        }
        return current;
      },
  createFile(parent, name, properties, canRead, canWrite) {
        var path = PATH.join2(typeof parent == 'string' ? parent : FS.getPath(parent), name);
        var mode = FS_getMode(canRead, canWrite);
        return FS.create(path, mode);
      },
  createDataFile(parent, name, data, canRead, canWrite, canOwn) {
        var path = name;
        if (parent) {
          parent = typeof parent == 'string' ? parent : FS.getPath(parent);
          path = name ? PATH.join2(parent, name) : parent;
        }
        var mode = FS_getMode(canRead, canWrite);
        var node = FS.create(path, mode);
        if (data) {
          data = FS_fileDataToTypedArray(data);
          // make sure we can write to the file
          FS.chmod(node, mode | 146);
          var stream = FS.open(node, 577);
          FS.write(stream, data, 0, data.length, 0, canOwn);
          FS.close(stream);
          FS.chmod(node, mode);
        }
      },
  createDevice(parent, name, input, output) {
        var path = PATH.join2(typeof parent == 'string' ? parent : FS.getPath(parent), name);
        var mode = FS_getMode(!!input, !!output);
        FS.createDevice.major ??= 64;
        var dev = FS.makedev(FS.createDevice.major++, 0);
        // Create a fake device that a set of stream ops to emulate
        // the old behavior.
        FS.registerDevice(dev, {
          open(stream) {
            stream.seekable = false;
          },
          close(stream) {
            // flush any pending line data
            if (output?.buffer?.length) {
              output(10);
            }
          },
          read(stream, buffer, offset, length, pos /* ignored */) {
            var bytesRead = 0;
            for (var i = 0; i < length; i++) {
              var result;
              try {
                result = input();
              } catch (e) {
                throw new FS.ErrnoError(29);
              }
              if (result === undefined && bytesRead === 0) {
                throw new FS.ErrnoError(6);
              }
              if (result === null || result === undefined) break;
              bytesRead++;
              buffer[offset+i] = result;
            }
            if (bytesRead) {
              stream.node.atime = Date.now();
            }
            return bytesRead;
          },
          write(stream, buffer, offset, length, pos) {
            for (var i = 0; i < length; i++) {
              try {
                output(buffer[offset+i]);
              } catch (e) {
                throw new FS.ErrnoError(29);
              }
            }
            if (length) {
              stream.node.mtime = stream.node.ctime = Date.now();
            }
            return i;
          }
        });
        return FS.mkdev(path, mode, dev);
      },
  forceLoadFile(obj) {
        if (obj.isDevice || obj.isFolder || obj.link || obj.contents) return true;
        if (globalThis.XMLHttpRequest) {
          abort("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.");
        } else { // Command-line.
          try {
            obj.contents = readBinary(obj.url);
          } catch (e) {
            throw new FS.ErrnoError(29);
          }
        }
      },
  createLazyFile(parent, name, url, canRead, canWrite) {
        // Lazy chunked Uint8Array (implements get and length from Uint8Array).
        // Actual getting is abstracted away for eventual reuse.
        class LazyUint8Array {
          lengthKnown = false;
          chunks = []; // Loaded chunks. Index is the chunk number
          get(idx) {
            if (idx > this.length-1 || idx < 0) {
              return undefined;
            }
            var chunkOffset = idx % this.chunkSize;
            var chunkNum = (idx / this.chunkSize)|0;
            return this.getter(chunkNum)[chunkOffset];
          }
          setDataGetter(getter) {
            this.getter = getter;
          }
          cacheLength() {
            // Find length
            var xhr = new XMLHttpRequest();
            xhr.open('HEAD', url, false);
            xhr.send(null);
            if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) abort("Couldn't load " + url + ". Status: " + xhr.status);
            var datalength = Number(xhr.getResponseHeader("Content-length"));
            var header;
            var hasByteServing = (header = xhr.getResponseHeader("Accept-Ranges")) && header === "bytes";
            var usesGzip = (header = xhr.getResponseHeader("Content-Encoding")) && header === "gzip";
  
            var chunkSize = 1024*1024; // Chunk size in bytes
  
            if (!hasByteServing) chunkSize = datalength;
  
            // Function to get a range from the remote URL.
            var doXHR = (from, to) => {
              if (from > to) abort(`invalid range (${from}, ${to}) or no bytes requested!`);
              if (to > datalength-1) abort(`only ${datalength} bytes available! programmer error!`);
  
              // TODO: Use mozResponseArrayBuffer, responseStream, etc. if available.
              var xhr = new XMLHttpRequest();
              xhr.open('GET', url, false);
              if (datalength !== chunkSize) xhr.setRequestHeader("Range", "bytes=" + from + "-" + to);
  
              // Some hints to the browser that we want binary data.
              xhr.responseType = 'arraybuffer';
              if (xhr.overrideMimeType) {
                xhr.overrideMimeType('text/plain; charset=x-user-defined');
              }
  
              xhr.send(null);
              if (!(xhr.status >= 200 && xhr.status < 300 || xhr.status === 304)) abort("Couldn't load " + url + ". Status: " + xhr.status);
              if (xhr.response !== undefined) {
                return new Uint8Array(/** @type{Array<number>} */(xhr.response || []));
              }
              return intArrayFromString(xhr.responseText ?? '', true);
            };
            var lazyArray = this;
            lazyArray.setDataGetter((chunkNum) => {
              var start = chunkNum * chunkSize;
              var end = (chunkNum+1) * chunkSize - 1; // including this byte
              end = Math.min(end, datalength-1); // if datalength-1 is selected, this is the last block
              if (typeof lazyArray.chunks[chunkNum] == 'undefined') {
                lazyArray.chunks[chunkNum] = doXHR(start, end);
              }
              if (typeof lazyArray.chunks[chunkNum] == 'undefined') abort('doXHR failed!');
              return lazyArray.chunks[chunkNum];
            });
  
            if (usesGzip || !datalength) {
              // if the server uses gzip or doesn't supply the length, we have to download the whole file to get the (uncompressed) length
              chunkSize = datalength = 1; // this will force getter(0)/doXHR do download the whole file
              datalength = this.getter(0).length;
              chunkSize = datalength;
              out("LazyFiles on gzip forces download of the whole file when length is accessed");
            }
  
            this._length = datalength;
            this._chunkSize = chunkSize;
            this.lengthKnown = true;
          }
          get length() {
            if (!this.lengthKnown) {
              this.cacheLength();
            }
            return this._length;
          }
          get chunkSize() {
            if (!this.lengthKnown) {
              this.cacheLength();
            }
            return this._chunkSize;
          }
        }
  
        if (globalThis.XMLHttpRequest) {
          if (!ENVIRONMENT_IS_WORKER) abort('Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc');
          var lazyArray = new LazyUint8Array();
          var properties = { isDevice: false, contents: lazyArray };
        } else {
          var properties = { isDevice: false, url: url };
        }
  
        var node = FS.createFile(parent, name, properties, canRead, canWrite);
        // This is a total hack, but I want to get this lazy file code out of the
        // core of MEMFS. If we want to keep this lazy file concept I feel it should
        // be its own thin LAZYFS proxying calls to MEMFS.
        if (properties.contents) {
          node.contents = properties.contents;
        } else if (properties.url) {
          node.contents = null;
          node.url = properties.url;
        }
        // Add a function that defers querying the file size until it is asked the first time.
        Object.defineProperties(node, {
          usedBytes: {
            get: function() { return this.contents.length; }
          }
        });
        // override each stream op with one that tries to force load the lazy file first
        var stream_ops = {};
        for (const [key, fn] of Object.entries(node.stream_ops)) {
          stream_ops[key] = (...args) => {
            FS.forceLoadFile(node);
            return fn(...args);
          };
        }
        function writeChunks(stream, buffer, offset, length, position) {
          var contents = stream.node.contents;
          if (position >= contents.length)
            return 0;
          var size = Math.min(contents.length - position, length);
          assert(size >= 0);
          if (contents.slice) { // normal array
            for (var i = 0; i < size; i++) {
              buffer[offset + i] = contents[position + i];
            }
          } else {
            for (var i = 0; i < size; i++) { // LazyUint8Array from sync binary XHR
              buffer[offset + i] = contents.get(position + i);
            }
          }
          return size;
        }
        // use a custom read function
        stream_ops.read = (stream, buffer, offset, length, position) => {
          FS.forceLoadFile(node);
          return writeChunks(stream, buffer, offset, length, position)
        };
        // use a custom mmap function
        stream_ops.mmap = (stream, length, position, prot, flags) => {
          FS.forceLoadFile(node);
          var ptr = mmapAlloc(length);
          if (!ptr) {
            throw new FS.ErrnoError(48);
          }
          writeChunks(stream, HEAP8, ptr, length, position);
          return { ptr, allocated: true };
        };
        node.stream_ops = stream_ops;
        return node;
      },
  };
  
  var SYSCALLS = {
  currentUmask:18,
  calculateAt(dirfd, path, allowEmpty) {
        if (PATH.isAbs(path)) {
          return path;
        }
        // relative path
        var dir;
        if (dirfd === -100) {
          dir = FS.cwd();
        } else {
          var dirstream = SYSCALLS.getStreamFromFD(dirfd);
          dir = dirstream.path;
        }
        if (path.length == 0) {
          if (!allowEmpty) {
            throw new FS.ErrnoError(44);;
          }
          return dir;
        }
        return dir + '/' + path;
      },
  writeStat(buf, stat) {
        HEAPU32[((buf)>>2)] = stat.dev;checkInt32(stat.dev);
        HEAPU32[(((buf)+(4))>>2)] = stat.mode;checkInt32(stat.mode);
        HEAPU32[(((buf)+(8))>>2)] = stat.nlink;checkInt32(stat.nlink);
        HEAPU32[(((buf)+(12))>>2)] = stat.uid;checkInt32(stat.uid);
        HEAPU32[(((buf)+(16))>>2)] = stat.gid;checkInt32(stat.gid);
        HEAPU32[(((buf)+(20))>>2)] = stat.rdev;checkInt32(stat.rdev);
        HEAP64[(((buf)+(24))>>3)] = BigInt(stat.size);checkInt64(stat.size);
        HEAP32[(((buf)+(32))>>2)] = 4096;checkInt32(4096);
        HEAP32[(((buf)+(36))>>2)] = stat.blocks;checkInt32(stat.blocks);
        var atime = stat.atime.getTime();
        var mtime = stat.mtime.getTime();
        var ctime = stat.ctime.getTime();
        HEAP64[(((buf)+(40))>>3)] = BigInt(Math.floor(atime / 1000));checkInt64(Math.floor(atime / 1000));
        HEAPU32[(((buf)+(48))>>2)] = (atime % 1000) * 1000 * 1000;checkInt32((atime % 1000) * 1000 * 1000);
        HEAP64[(((buf)+(56))>>3)] = BigInt(Math.floor(mtime / 1000));checkInt64(Math.floor(mtime / 1000));
        HEAPU32[(((buf)+(64))>>2)] = (mtime % 1000) * 1000 * 1000;checkInt32((mtime % 1000) * 1000 * 1000);
        HEAP64[(((buf)+(72))>>3)] = BigInt(Math.floor(ctime / 1000));checkInt64(Math.floor(ctime / 1000));
        HEAPU32[(((buf)+(80))>>2)] = (ctime % 1000) * 1000 * 1000;checkInt32((ctime % 1000) * 1000 * 1000);
        HEAP64[(((buf)+(88))>>3)] = BigInt(stat.ino);checkInt64(stat.ino);
        return 0;
      },
  writeStatFs(buf, stats) {
        HEAPU32[(((buf)+(4))>>2)] = stats.bsize;checkInt32(stats.bsize);
        HEAPU32[(((buf)+(60))>>2)] = stats.bsize;checkInt32(stats.bsize);
        HEAP64[(((buf)+(8))>>3)] = BigInt(stats.blocks);checkInt64(stats.blocks);
        HEAP64[(((buf)+(16))>>3)] = BigInt(stats.bfree);checkInt64(stats.bfree);
        HEAP64[(((buf)+(24))>>3)] = BigInt(stats.bavail);checkInt64(stats.bavail);
        HEAP64[(((buf)+(32))>>3)] = BigInt(stats.files);checkInt64(stats.files);
        HEAP64[(((buf)+(40))>>3)] = BigInt(stats.ffree);checkInt64(stats.ffree);
        HEAPU32[(((buf)+(48))>>2)] = stats.fsid;checkInt32(stats.fsid);
        HEAPU32[(((buf)+(64))>>2)] = stats.flags;checkInt32(stats.flags);  // ST_NOSUID
        HEAPU32[(((buf)+(56))>>2)] = stats.namelen;checkInt32(stats.namelen);
      },
  doMsync(addr, stream, len, flags, offset) {
        if (!FS.isFile(stream.node.mode)) {
          throw new FS.ErrnoError(43);
        }
        if (flags & 2) {
          // MAP_PRIVATE calls need not to be synced back to underlying fs
          return 0;
        }
        var buffer = HEAPU8.slice(addr, addr + len);
        FS.msync(stream, buffer, offset, len, flags);
      },
  getStreamFromFD(fd) {
        var stream = FS.getStreamChecked(fd);
        return stream;
      },
  varargs:undefined,
  getStr(ptr) {
        var ret = UTF8ToString(ptr);
        return ret;
      },
  };
  function ___syscall_dup(fd) {
  try {
  
      var old = SYSCALLS.getStreamFromFD(fd);
      return FS.dupStream(old).fd;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return -e.errno;
  }
  }
  

  function ___syscall_dup3(fd, newfd, flags) {
  try {
  
      if (fd === newfd) return -28;
      if (flags & ~524288) return -28;
      var old = SYSCALLS.getStreamFromFD(fd);
      // Check newfd is within range of valid open file descriptors.
      if (newfd < 0 || newfd >= FS.MAX_OPEN_FDS) return -8;
      var existing = FS.getStream(newfd);
      if (existing) FS.close(existing);
      var stream = FS.dupStream(old, newfd);
      if (flags & 524288) {
        stream.flags |= 524288;
      }
      return stream.fd;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return -e.errno;
  }
  }
  

  var syscallGetVarargI = () => {
      assert(SYSCALLS.varargs != undefined);
      // the `+` prepended here is necessary to convince the JSCompiler that varargs is indeed a number.
      var ret = HEAP32[((+SYSCALLS.varargs)>>2)];
      SYSCALLS.varargs += 4;
      return ret;
    };
  var syscallGetVarargP = syscallGetVarargI;
  
  
  function ___syscall_fcntl64(fd, cmd, varargs) {
  SYSCALLS.varargs = varargs;
  try {
  
      var stream = SYSCALLS.getStreamFromFD(fd);
      switch (cmd) {
        case 0: {
          var arg = syscallGetVarargI();
          if (arg < 0) {
            return -28;
          }
          while (FS.streams[arg]) {
            arg++;
          }
          var newStream;
          newStream = FS.dupStream(stream, arg);
          return newStream.fd;
        }
        case 1:
        case 2:
          return 0;  // FD_CLOEXEC makes no sense for a single process.
        case 3:
          return stream.flags;
        case 4: {
          var arg = syscallGetVarargI();
          var mask = 289792;
          stream.flags = (stream.flags & ~mask) | (arg & mask);
          return 0;
        }
        case 12: {
          var arg = syscallGetVarargP();
          var offset = 0;
          // We're always unlocked.
          HEAP16[(((arg)+(offset))>>1)] = 2;checkInt16(2);
          return 0;
        }
        case 13:
        case 14:
          // Pretend that the locking is successful. These are process-level locks,
          // and Emscripten programs are a single process. If we supported linking a
          // filesystem between programs, we'd need to do more here.
          // See https://github.com/emscripten-core/emscripten/issues/23697
          return 0;
      }
      return -28;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return -e.errno;
  }
  }
  

  function ___syscall_fstat64(fd, buf) {
  try {
  
      return SYSCALLS.writeStat(buf, FS.fstat(fd));
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return -e.errno;
  }
  }
  

  
  function ___syscall_ioctl(fd, op, varargs) {
  SYSCALLS.varargs = varargs;
  try {
  
      var stream = SYSCALLS.getStreamFromFD(fd);
      switch (op) {
        case 21509: {
          if (!stream.tty) return -59;
          return 0;
        }
        case 21505: {
          if (!stream.tty) return -59;
          if (stream.tty.ops.ioctl_tcgets) {
            var termios = stream.tty.ops.ioctl_tcgets(stream);
            var argp = syscallGetVarargP();
            HEAP32[((argp)>>2)] = termios.c_iflag || 0;checkInt32(termios.c_iflag || 0);
            HEAP32[(((argp)+(4))>>2)] = termios.c_oflag || 0;checkInt32(termios.c_oflag || 0);
            HEAP32[(((argp)+(8))>>2)] = termios.c_cflag || 0;checkInt32(termios.c_cflag || 0);
            HEAP32[(((argp)+(12))>>2)] = termios.c_lflag || 0;checkInt32(termios.c_lflag || 0);
            for (var i = 0; i < 32; i++) {
              HEAP8[(argp + i)+(17)] = termios.c_cc[i] || 0;checkInt8(termios.c_cc[i] || 0);
            }
            return 0;
          }
          return 0;
        }
        case 21510:
        case 21511:
        case 21512: {
          if (!stream.tty) return -59;
          return 0; // no-op, not actually adjusting terminal settings
        }
        case 21506:
        case 21507:
        case 21508: {
          if (!stream.tty) return -59;
          if (stream.tty.ops.ioctl_tcsets) {
            var argp = syscallGetVarargP();
            var c_iflag = HEAP32[((argp)>>2)];
            var c_oflag = HEAP32[(((argp)+(4))>>2)];
            var c_cflag = HEAP32[(((argp)+(8))>>2)];
            var c_lflag = HEAP32[(((argp)+(12))>>2)];
            var c_cc = []
            for (var i = 0; i < 32; i++) {
              c_cc.push(HEAP8[(argp + i)+(17)]);
            }
            return stream.tty.ops.ioctl_tcsets(stream.tty, op, { c_iflag, c_oflag, c_cflag, c_lflag, c_cc });
          }
          return 0; // no-op, not actually adjusting terminal settings
        }
        case 21519: {
          if (!stream.tty) return -59;
          var argp = syscallGetVarargP();
          HEAP32[((argp)>>2)] = 0;checkInt32(0);
          return 0;
        }
        case 21520: {
          if (!stream.tty) return -59;
          return -28; // not supported
        }
        case 21537:
        case 21531: {
          var argp = syscallGetVarargP();
          return FS.ioctl(stream, op, argp);
        }
        case 21523: {
          // TODO: in theory we should write to the winsize struct that gets
          // passed in, but for now musl doesn't read anything on it
          if (!stream.tty) return -59;
          if (stream.tty.ops.ioctl_tiocgwinsz) {
            var winsize = stream.tty.ops.ioctl_tiocgwinsz(stream.tty);
            var argp = syscallGetVarargP();
            HEAP16[((argp)>>1)] = winsize[0];checkInt16(winsize[0]);
            HEAP16[(((argp)+(2))>>1)] = winsize[1];checkInt16(winsize[1]);
          }
          return 0;
        }
        case 21524: {
          // TODO: technically, this ioctl call should change the window size.
          // but, since emscripten doesn't have any concept of a terminal window
          // yet, we'll just silently throw it away as we do TIOCGWINSZ
          if (!stream.tty) return -59;
          return 0;
        }
        case 21515: {
          if (!stream.tty) return -59;
          return 0;
        }
        default: return -28; // not supported
      }
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return -e.errno;
  }
  }
  

  function ___syscall_lstat64(path, buf) {
  try {
  
      path = SYSCALLS.getStr(path);
      return SYSCALLS.writeStat(buf, FS.lstat(path));
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return -e.errno;
  }
  }
  

  function ___syscall_newfstatat(dirfd, path, buf, flags) {
  try {
  
      path = SYSCALLS.getStr(path);
      var nofollow = flags & 256;
      var allowEmpty = flags & 4096;
      flags = flags & (~6400);
      assert(!flags, `unknown flags in __syscall_newfstatat: ${flags}`);
      path = SYSCALLS.calculateAt(dirfd, path, allowEmpty);
      return SYSCALLS.writeStat(buf, nofollow ? FS.lstat(path) : FS.stat(path));
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return -e.errno;
  }
  }
  

  
  function ___syscall_openat(dirfd, path, flags, varargs) {
  SYSCALLS.varargs = varargs;
  try {
  
      path = SYSCALLS.getStr(path);
      path = SYSCALLS.calculateAt(dirfd, path);
      var mode = varargs ? syscallGetVarargI() : 0;
      if (flags & 64) {
        mode &= ~SYSCALLS.currentUmask;
      }
      return FS.open(path, flags, mode).fd;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return -e.errno;
  }
  }
  

  function ___syscall_stat64(path, buf) {
  try {
  
      path = SYSCALLS.getStr(path);
      return SYSCALLS.writeStat(buf, FS.stat(path));
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return -e.errno;
  }
  }
  

  function ___syscall_umask(mask) {
  try {
  
      var old = SYSCALLS.currentUmask;
      SYSCALLS.currentUmask = mask;
      return old;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return -e.errno;
  }
  }
  

  function ___syscall_unlinkat(dirfd, path, flags) {
  try {
  
      path = SYSCALLS.getStr(path);
      path = SYSCALLS.calculateAt(dirfd, path);
      if (!flags) {
        FS.unlink(path);
      } else if (flags === 512) {
        FS.rmdir(path);
      } else {
        return -28;
      }
      return 0;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return -e.errno;
  }
  }
  

  var __abort_js = () =>
      abort('native code called abort()');

  var __emscripten_system = (command) => {
      if (ENVIRONMENT_IS_NODE) {
        if (!command) return 1; // shell is available
  
        var cmdstr = UTF8ToString(command);
        if (!cmdstr.length) return 0; // this is what glibc seems to do (shell works test?)
  
        var cp = require('node:child_process');
        var ret = cp.spawnSync(cmdstr, [], {shell:true, stdio:'inherit'});
  
        var _W_EXITCODE = (ret, sig) => ((ret) << 8 | (sig));
  
        // this really only can happen if process is killed by signal
        if (ret.status === null) {
          // sadly node doesn't expose such function
          var signalToNumber = (sig) => {
            // implement only the most common ones, and fallback to SIGINT
            switch (sig) {
              case 'SIGHUP': return 1;
              case 'SIGQUIT': return 3;
              case 'SIGFPE': return 8;
              case 'SIGKILL': return 9;
              case 'SIGALRM': return 14;
              case 'SIGTERM': return 15;
              default: return 2;
            }
          }
          return _W_EXITCODE(0, signalToNumber(ret.signal));
        }
  
        return _W_EXITCODE(ret.status, 0);
      }
      // int system(const char *command);
      // http://pubs.opengroup.org/onlinepubs/000095399/functions/system.html
      // Can't call external programs.
      if (!command) return 0; // no shell available
      return -52;
    };

  var __emscripten_throw_longjmp = () => {
      throw new EmscriptenSjLj;
    };

  var isLeapYear = (year) => year%4 === 0 && (year%100 !== 0 || year%400 === 0);
  
  var MONTH_DAYS_LEAP_CUMULATIVE = [0,31,60,91,121,152,182,213,244,274,305,335];
  
  var MONTH_DAYS_REGULAR_CUMULATIVE = [0,31,59,90,120,151,181,212,243,273,304,334];
  var ydayFromDate = (date) => {
      var leap = isLeapYear(date.getFullYear());
      var monthDaysCumulative = (leap ? MONTH_DAYS_LEAP_CUMULATIVE : MONTH_DAYS_REGULAR_CUMULATIVE);
      var yday = monthDaysCumulative[date.getMonth()] + date.getDate() - 1; // -1 since it's days since Jan 1
  
      return yday;
    };
  
  var INT53_MAX = 9007199254740992;
  
  var INT53_MIN = -9007199254740992;
  var bigintToI53Checked = (num) => (num < INT53_MIN || num > INT53_MAX) ? NaN : Number(num);
  function __localtime_js(time, tmPtr) {
    time = bigintToI53Checked(time);
  
  
      var date = new Date(time*1000);
      HEAP32[((tmPtr)>>2)] = date.getSeconds();checkInt32(date.getSeconds());
      HEAP32[(((tmPtr)+(4))>>2)] = date.getMinutes();checkInt32(date.getMinutes());
      HEAP32[(((tmPtr)+(8))>>2)] = date.getHours();checkInt32(date.getHours());
      HEAP32[(((tmPtr)+(12))>>2)] = date.getDate();checkInt32(date.getDate());
      HEAP32[(((tmPtr)+(16))>>2)] = date.getMonth();checkInt32(date.getMonth());
      HEAP32[(((tmPtr)+(20))>>2)] = date.getFullYear()-1900;checkInt32(date.getFullYear()-1900);
      HEAP32[(((tmPtr)+(24))>>2)] = date.getDay();checkInt32(date.getDay());
  
      var yday = ydayFromDate(date)|0;
      HEAP32[(((tmPtr)+(28))>>2)] = yday;checkInt32(yday);
      HEAP32[(((tmPtr)+(36))>>2)] = -(date.getTimezoneOffset() * 60);checkInt32(-(date.getTimezoneOffset() * 60));
  
      // Attention: DST is in December in South, and some regions don't have DST at all.
      var start = new Date(date.getFullYear(), 0, 1);
      var summerOffset = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
      var winterOffset = start.getTimezoneOffset();
      var dst = (summerOffset != winterOffset && date.getTimezoneOffset() == Math.min(winterOffset, summerOffset))|0;
      HEAP32[(((tmPtr)+(32))>>2)] = dst;checkInt32(dst);
    ;
  }

  var stringToUTF8 = (str, outPtr, maxBytesToWrite) => {
      assert(typeof maxBytesToWrite == 'number', 'stringToUTF8 requires a third parameter that specifies the length of the output buffer');
      return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite);
    };
  
  var __tzset_js = (timezone, daylight, std_name, dst_name) => {
      // TODO: Use (malleable) environment variables instead of system settings.
      var currentYear = new Date().getFullYear();
      var winter = new Date(currentYear, 0, 1);
      var summer = new Date(currentYear, 6, 1);
      var winterOffset = winter.getTimezoneOffset();
      var summerOffset = summer.getTimezoneOffset();
  
      // Local standard timezone offset. Local standard time is not adjusted for
      // daylight savings.  This code uses the fact that getTimezoneOffset returns
      // a greater value during Standard Time versus Daylight Saving Time (DST).
      // Thus it determines the expected output during Standard Time, and it
      // compares whether the output of the given date the same (Standard) or less
      // (DST).
      var stdTimezoneOffset = Math.max(winterOffset, summerOffset);
  
      // timezone is specified as seconds west of UTC ("The external variable
      // `timezone` shall be set to the difference, in seconds, between
      // Coordinated Universal Time (UTC) and local standard time."), the same
      // as returned by stdTimezoneOffset.
      // See http://pubs.opengroup.org/onlinepubs/009695399/functions/tzset.html
      HEAPU32[((timezone)>>2)] = stdTimezoneOffset * 60;
  
      HEAP32[((daylight)>>2)] = Number(winterOffset != summerOffset);checkInt32(Number(winterOffset != summerOffset));
  
      var extractZone = (timezoneOffset) => {
        // Why inverse sign?
        // Read here https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/getTimezoneOffset
        var sign = timezoneOffset >= 0 ? "-" : "+";
  
        var absOffset = Math.abs(timezoneOffset)
        var hours = String(Math.floor(absOffset / 60)).padStart(2, "0");
        var minutes = String(absOffset % 60).padStart(2, "0");
  
        return `UTC${sign}${hours}${minutes}`;
      }
  
      var winterName = extractZone(winterOffset);
      var summerName = extractZone(summerOffset);
      assert(winterName);
      assert(summerName);
      assert(lengthBytesUTF8(winterName) <= 16, `timezone name truncated to fit in TZNAME_MAX (${winterName})`);
      assert(lengthBytesUTF8(summerName) <= 16, `timezone name truncated to fit in TZNAME_MAX (${summerName})`);
      if (summerOffset < winterOffset) {
        // Northern hemisphere
        stringToUTF8(winterName, std_name, 17);
        stringToUTF8(summerName, dst_name, 17);
      } else {
        stringToUTF8(winterName, dst_name, 17);
        stringToUTF8(summerName, std_name, 17);
      }
    };

  var _emscripten_get_now = () => performance.now();
  
  var _emscripten_date_now = () => Date.now();
  
  var nowIsMonotonic = 1;
  
  var checkWasiClock = (clock_id) => clock_id >= 0 && clock_id <= 3;
  
  function _clock_time_get(clk_id, ignored_precision, ptime) {
    ignored_precision = bigintToI53Checked(ignored_precision);
  
  
      if (!checkWasiClock(clk_id)) {
        return 28;
      }
      var now;
      // all wasi clocks but realtime are monotonic
      if (clk_id === 0) {
        now = _emscripten_date_now();
      } else if (nowIsMonotonic) {
        now = _emscripten_get_now();
      } else {
        return 52;
      }
      // "now" is in ms, and wasi times are in ns.
      var nsec = Math.round(now * 1000 * 1000);
      HEAP64[((ptime)>>3)] = BigInt(nsec);checkInt64(nsec);
      return 0;
    ;
  }

  var readEmAsmArgsArray = [];
  var readEmAsmArgs = (sigPtr, buf) => {
      // Nobody should have mutated _readEmAsmArgsArray underneath us to be something else than an array.
      assert(Array.isArray(readEmAsmArgsArray));
      // The input buffer is allocated on the stack, so it must be stack-aligned.
      assert(buf % 16 == 0);
      readEmAsmArgsArray.length = 0;
      var ch;
      // Most arguments are i32s, so shift the buffer pointer so it is a plain
      // index into HEAP32.
      while (ch = HEAPU8[sigPtr++]) {
        var chr = String.fromCharCode(ch);
        var validChars = ['d', 'f', 'i', 'p'];
        // In WASM_BIGINT mode we support passing i64 values as bigint.
        validChars.push('j');
        assert(validChars.includes(chr), `Invalid character ${ch}("${chr}") in readEmAsmArgs! Use only [${validChars}], and do not specify "v" for void return argument.`);
        // Floats are always passed as doubles, so all types except for 'i'
        // are 8 bytes and require alignment.
        var wide = (ch != 105);
        wide &= (ch != 112);
        buf += wide && (buf % 8) ? 4 : 0;
        readEmAsmArgsArray.push(
          // Special case for pointers under wasm64 or CAN_ADDRESS_2GB mode.
          ch == 112 ? HEAPU32[((buf)>>2)] :
          ch == 106 ? HEAP64[((buf)>>3)] :
          ch == 105 ?
            HEAP32[((buf)>>2)] :
            HEAPF64[((buf)>>3)]
        );
        buf += wide ? 8 : 4;
      }
      return readEmAsmArgsArray;
    };
  var runEmAsmFunction = (code, sigPtr, argbuf) => {
      var args = readEmAsmArgs(sigPtr, argbuf);
      assert(ASM_CONSTS.hasOwnProperty(code), `No EM_ASM constant found at address ${code}.  The loaded WebAssembly file is likely out of sync with the generated JavaScript.`);
      return ASM_CONSTS[code](...args);
    };
  var _emscripten_asm_const_int = (code, sigPtr, argbuf) => {
      return runEmAsmFunction(code, sigPtr, argbuf);
    };


  var _emscripten_err = (str) => err(UTF8ToString(str));


  var abortOnCannotGrowMemory = (requestedSize) => {
      abort(`Cannot enlarge memory arrays to size ${requestedSize} bytes (OOM). Either (1) compile with -sINITIAL_MEMORY=X with X higher than the current value ${HEAP8.length}, (2) compile with -sALLOW_MEMORY_GROWTH which allows increasing the size at runtime, or (3) if you want malloc to return NULL (0) instead of this abort, compile with -sABORTING_MALLOC=0`);
    };
  var _emscripten_resize_heap = (requestedSize) => {
      var oldSize = HEAPU8.length;
      // With CAN_ADDRESS_2GB or MEMORY64, pointers are already unsigned.
      requestedSize >>>= 0;
      abortOnCannotGrowMemory(requestedSize);
    };

  var _emscripten_sleep = function(ms) {
    let innerFunc =  () => new Promise((resolve) => setTimeout(resolve, ms));
    return Asyncify.handleAsync(innerFunc);
  }
  ;
  _emscripten_sleep.isAsync = true;

  var ENV = {
  };
  
  var getExecutableName = () => thisProgram;
  var getEnvStrings = () => {
      if (!getEnvStrings.strings) {
        // Default values.
        var lang = (globalThis.navigator?.language ?? 'C').replace('-', '_') + '.UTF-8';
        var env = {
          'USER': 'web_user',
          'LOGNAME': 'web_user',
          'PATH': '/',
          'PWD': '/',
          'HOME': '/home/web_user',
          'LANG': lang,
          '_': getExecutableName()
        };
        // Apply the user-provided values, if any.
        for (var x in ENV) {
          // x is a key in ENV; if ENV[x] is undefined, that means it was
          // explicitly set to be so. We allow user code to do that to
          // force variables with default values to remain unset.
          if (ENV[x] === undefined) delete env[x];
          else env[x] = ENV[x];
        }
        var strings = [];
        for (var x in env) {
          strings.push(`${x}=${env[x]}`);
        }
        getEnvStrings.strings = strings;
      }
      return getEnvStrings.strings;
    };
  
  var _environ_get = (__environ, environ_buf) => {
      var bufSize = 0;
      var envp = 0;
      for (var string of getEnvStrings()) {
        var ptr = environ_buf + bufSize;
        HEAPU32[(((__environ)+(envp))>>2)] = ptr;
        bufSize += stringToUTF8(string, ptr, Infinity) + 1;
        envp += 4;
      }
      return 0;
    };

  
  var _environ_sizes_get = (penviron_count, penviron_buf_size) => {
      var strings = getEnvStrings();
      HEAPU32[((penviron_count)>>2)] = strings.length;checkInt32(strings.length);
      var bufSize = 0;
      for (var string of strings) {
        bufSize += lengthBytesUTF8(string) + 1;
      }
      HEAPU32[((penviron_buf_size)>>2)] = bufSize;checkInt32(bufSize);
      return 0;
    };

  
  var runtimeKeepaliveCounter = 0;
  var keepRuntimeAlive = () => noExitRuntime || runtimeKeepaliveCounter > 0;
  var _proc_exit = (code) => {
      EXITSTATUS = code;
      if (!keepRuntimeAlive()) {
        Module['onExit']?.(code);
        ABORT = true;
      }
      quit_(code, new ExitStatus(code));
    };
  
  
  /** @param {boolean|number=} implicit */
  var exitJS = (status, implicit) => {
      EXITSTATUS = status;
  
      checkUnflushedContent();
  
      // if exit() was called explicitly, warn the user if the runtime isn't actually being shut down
      if (keepRuntimeAlive() && !implicit) {
        var msg = `program exited (with status: ${status}), but keepRuntimeAlive() is set (counter=${runtimeKeepaliveCounter}) due to an async operation, so halting execution but not exiting the runtime or preventing further async execution (you can use emscripten_force_exit, if you want to force a true shutdown)`;
        err(msg);
      }
  
      _proc_exit(status);
    };
  var _exit = exitJS;

  function _fd_close(fd) {
  try {
  
      var stream = SYSCALLS.getStreamFromFD(fd);
      FS.close(stream);
      return 0;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return e.errno;
  }
  }
  

  /** @param {number=} offset */
  var doReadv = (stream, iov, iovcnt, offset) => {
      var ret = 0;
      for (var i = 0; i < iovcnt; i++) {
        var ptr = HEAPU32[((iov)>>2)];
        var len = HEAPU32[(((iov)+(4))>>2)];
        iov += 8;
        var curr = FS.read(stream, HEAP8, ptr, len, offset);
        if (curr < 0) return -1;
        ret += curr;
        if (curr < len) break; // nothing more to read
        if (typeof offset != 'undefined') {
          offset += curr;
        }
      }
      return ret;
    };
  
  function _fd_read(fd, iov, iovcnt, pnum) {
  try {
  
      var stream = SYSCALLS.getStreamFromFD(fd);
      var num = doReadv(stream, iov, iovcnt);
      HEAPU32[((pnum)>>2)] = num;checkInt32(num);
      return 0;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return e.errno;
  }
  }
  

  
  function _fd_seek(fd, offset, whence, newOffset) {
    offset = bigintToI53Checked(offset);
  
  
  try {
  
      if (isNaN(offset)) return 22;
      var stream = SYSCALLS.getStreamFromFD(fd);
      FS.llseek(stream, offset, whence);
      HEAP64[((newOffset)>>3)] = BigInt(stream.position);checkInt64(stream.position);
      if (stream.getdents && offset === 0 && whence === 0) stream.getdents = null; // reset readdir state
      return 0;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return e.errno;
  }
  ;
  }

  /** @param {number=} offset */
  var doWritev = (stream, iov, iovcnt, offset) => {
      var ret = 0;
      for (var i = 0; i < iovcnt; i++) {
        var ptr = HEAPU32[((iov)>>2)];
        var len = HEAPU32[(((iov)+(4))>>2)];
        iov += 8;
        var curr = FS.write(stream, HEAP8, ptr, len, offset);
        if (curr < 0) return -1;
        ret += curr;
        if (curr < len) {
          // No more space to write.
          break;
        }
        if (typeof offset != 'undefined') {
          offset += curr;
        }
      }
      return ret;
    };
  
  function _fd_write(fd, iov, iovcnt, pnum) {
  try {
  
      var stream = SYSCALLS.getStreamFromFD(fd);
      var num = doWritev(stream, iov, iovcnt);
      HEAPU32[((pnum)>>2)] = num;checkInt32(num);
      return 0;
    } catch (e) {
    if (typeof FS == 'undefined' || !(e.name === 'ErrnoError')) throw e;
    return e.errno;
  }
  }
  


  var handleException = (e) => {
      // Certain exception types we do not treat as errors since they are used for
      // internal control flow.
      // 1. ExitStatus, which is thrown by exit()
      // 2. "unwind", which is thrown by emscripten_unwind_to_js_event_loop() and others
      //    that wish to return to JS event loop.
      if (e instanceof ExitStatus || e == 'unwind') {
        return EXITSTATUS;
      }
      checkStackCookie();
      if (e instanceof WebAssembly.RuntimeError) {
        if (_emscripten_stack_get_current() <= 0) {
          err('Stack overflow detected.  You can try increasing -sSTACK_SIZE (currently set to 65536)');
        }
      }
      quit_(1, e);
    };

  
  
  var stackAlloc = (sz) => __emscripten_stack_alloc(sz);
  var stringToUTF8OnStack = (str) => {
      var size = lengthBytesUTF8(str) + 1;
      var ret = stackAlloc(size);
      stringToUTF8(str, ret, size);
      return ret;
    };

  var wasmTableMirror = [];
  
  
  var getWasmTableEntry = (funcPtr) => {
      var func = wasmTableMirror[funcPtr];
      if (!func) {
        /** @suppress {checkTypes} */
        wasmTableMirror[funcPtr] = func = wasmTable.get(funcPtr);
      }
      /** @suppress {checkTypes} */
      assert(wasmTable.get(funcPtr) == func, 'table mirror is out of date');
      return func;
    };

  var runAndAbortIfError = (func) => {
      try {
        return func();
      } catch (e) {
        abort(e);
      }
    };
  
  
  
  
  var maybeExit = () => {
      if (!keepRuntimeAlive()) {
        try {
          _exit(EXITSTATUS);
        } catch (e) {
          handleException(e);
        }
      }
    };
  var callUserCallback = (func) => {
      if (ABORT) {
        err('user callback triggered after runtime exited or application aborted.  Ignoring.');
        return;
      }
      try {
        return func();
      } catch (e) {
        handleException(e);
      } finally {
        maybeExit();
      }
    };
  
  var createNamedFunction = (name, func) => Object.defineProperty(func, 'name', { value: name });
  
  var runtimeKeepalivePush = () => {
      runtimeKeepaliveCounter += 1;
    };
  
  var runtimeKeepalivePop = () => {
      assert(runtimeKeepaliveCounter > 0);
      runtimeKeepaliveCounter -= 1;
    };
  
  
  var Asyncify = {
  instrumentWasmImports(imports) {
        var importPattern = /^(invoke_.*|__asyncjs__.*)$/;
  
        for (let [x, original] of Object.entries(imports)) {
          if (typeof original == 'function') {
            let isAsyncifyImport = original.isAsync || importPattern.test(x);
            imports[x] = (...args) => {
              var originalAsyncifyState = Asyncify.state;
              try {
                return original(...args);
              } finally {
                // Only asyncify-declared imports are allowed to change the
                // state.
                // Changing the state from normal to disabled is allowed (in any
                // function) as that is what shutdown does (and we don't have an
                // explicit list of shutdown imports).
                var changedToDisabled =
                      originalAsyncifyState === Asyncify.State.Normal &&
                      Asyncify.state        === Asyncify.State.Disabled;
                // invoke_* functions are allowed to change the state if we do
                // not ignore indirect calls.
                var ignoredInvoke = x.startsWith('invoke_') &&
                                    true;
                if (Asyncify.state !== originalAsyncifyState &&
                    !isAsyncifyImport &&
                    !changedToDisabled &&
                    !ignoredInvoke) {
                  abort(`import ${x} was not in ASYNCIFY_IMPORTS, but changed the state`);
                }
              }
            };
          }
        }
      },
  instrumentFunction(original) {
        var wrapper = (...args) => {
          Asyncify.exportCallStack.push(original);
          try {
            return original(...args);
          } finally {
            if (!ABORT) {
              var top = Asyncify.exportCallStack.pop();
              assert(top === original);
              Asyncify.maybeStopUnwind();
            }
          }
        };
        Asyncify.funcWrappers.set(original, wrapper);
        wrapper = createNamedFunction(`__asyncify_wrapper_${original.name}`, wrapper);
        return wrapper;
      },
  instrumentWasmExports(exports) {
        var ret = {};
        for (let [x, original] of Object.entries(exports)) {
          if (typeof original == 'function') {
            var wrapper = Asyncify.instrumentFunction(original);
            ret[x] = wrapper;
          } else {
            ret[x] = original;
          }
        }
        return ret;
      },
  State:{
  Normal:0,
  Unwinding:1,
  Rewinding:2,
  Disabled:3,
  },
  state:0,
  StackSize:128000,
  currData:null,
  handleSleepReturnValue:0,
  exportCallStack:[],
  callstackFuncToId:new Map,
  callStackIdToFunc:new Map,
  funcWrappers:new Map,
  callStackId:0,
  asyncPromiseHandlers:null,
  sleepCallbacks:[],
  getCallStackId(func) {
        assert(func);
        if (!Asyncify.callstackFuncToId.has(func)) {
          var id = Asyncify.callStackId++;
          Asyncify.callstackFuncToId.set(func, id);
          Asyncify.callStackIdToFunc.set(id, func);
        }
        return Asyncify.callstackFuncToId.get(func);
      },
  maybeStopUnwind() {
        if (Asyncify.currData &&
            Asyncify.state === Asyncify.State.Unwinding &&
            Asyncify.exportCallStack.length === 0) {
          // We just finished unwinding.
          // Be sure to set the state before calling any other functions to avoid
          // possible infinite recursion here (For example in debug pthread builds
          // the dbg() function itself can call back into WebAssembly to get the
          // current pthread_self() pointer).
          Asyncify.state = Asyncify.State.Normal;
          
          // Keep the runtime alive so that a re-wind can be done later.
          runAndAbortIfError(_asyncify_stop_unwind);
          if (typeof Fibers != 'undefined') {
            Fibers.trampoline();
          }
        }
      },
  whenDone() {
        assert(Asyncify.currData, 'tried to wait for an async operation when none is in progress');
        assert(!Asyncify.asyncPromiseHandlers, 'cannot have multiple async operations in flight at once');
        return new Promise((resolve, reject) => {
          Asyncify.asyncPromiseHandlers = { resolve, reject };
        });
      },
  allocateData() {
        // An asyncify data structure has three fields:
        //  0  current stack pos
        //  4  max stack pos
        //  8  id of function at bottom of the call stack (callStackIdToFunc[id] == wasm func)
        //
        // The Asyncify ABI only interprets the first two fields, the rest is for the runtime.
        // We also embed a stack in the same memory region here, right next to the structure.
        // This struct is also defined as asyncify_data_t in emscripten/fiber.h
        var ptr = _malloc(12 + Asyncify.StackSize);
        Asyncify.setDataHeader(ptr, ptr + 12, Asyncify.StackSize);
        Asyncify.setDataRewindFunc(ptr);
        return ptr;
      },
  setDataHeader(ptr, stack, stackSize) {
        HEAPU32[((ptr)>>2)] = stack;
        HEAPU32[(((ptr)+(4))>>2)] = stack + stackSize;
      },
  setDataRewindFunc(ptr) {
        var bottomOfCallStack = Asyncify.exportCallStack[0];
        assert(bottomOfCallStack, 'exportCallStack is empty');
        var rewindId = Asyncify.getCallStackId(bottomOfCallStack);
        HEAP32[(((ptr)+(8))>>2)] = rewindId;checkInt32(rewindId);
      },
  getDataRewindFunc(ptr) {
        var id = HEAP32[(((ptr)+(8))>>2)];
        var func = Asyncify.callStackIdToFunc.get(id);
        assert(func, `id ${id} not found in callStackIdToFunc`);
        return func;
      },
  doRewind(ptr) {
        var original = Asyncify.getDataRewindFunc(ptr);
        var func = Asyncify.funcWrappers.get(original);
        assert(original);
        assert(func);
        // Once we have rewound and the stack we no longer need to artificially
        // keep the runtime alive.
        
        return callUserCallback(func);
      },
  handleSleep(startAsync) {
        assert(Asyncify.state !== Asyncify.State.Disabled, 'handleSleep called after Asyncify was shut down');
        if (ABORT) return;
        if (Asyncify.state === Asyncify.State.Normal) {
          // Prepare to sleep. Call startAsync, and see what happens:
          // if the code decided to call our callback synchronously,
          // then no async operation was in fact begun, and we don't
          // need to do anything.
          var reachedCallback = false;
          var reachedAfterCallback = false;
          startAsync((handleSleepReturnValue = 0) => {
            // old emterpretify API supported other stuff
            assert(['undefined', 'number', 'boolean', 'bigint'].includes(typeof handleSleepReturnValue), `invalid type for handleSleepReturnValue: '${typeof handleSleepReturnValue}'`);
            if (ABORT) return;
            Asyncify.handleSleepReturnValue = handleSleepReturnValue;
            reachedCallback = true;
            if (!reachedAfterCallback) {
              // We are happening synchronously, so no need for async.
              return;
            }
            // This async operation did not happen synchronously, so we did
            // unwind. In that case there can be no compiled code on the stack,
            // as it might break later operations (we can rewind ok now, but if
            // we unwind again, we would unwind through the extra compiled code
            // too).
            assert(!Asyncify.exportCallStack.length, 'waking up (starting to rewind) must be done from JS, without compiled code on the stack');
            Asyncify.state = Asyncify.State.Rewinding;
            runAndAbortIfError(() => _asyncify_start_rewind(Asyncify.currData));
            if (typeof MainLoop != 'undefined' && MainLoop.func) {
              MainLoop.resume();
            }
            var asyncWasmReturnValue, isError = false;
            try {
              asyncWasmReturnValue = Asyncify.doRewind(Asyncify.currData);
            } catch (err) {
              asyncWasmReturnValue = err;
              isError = true;
            }
            // Track whether the return value was handled by any promise handlers.
            var handled = false;
            if (!Asyncify.currData) {
              // All asynchronous execution has finished.
              // `asyncWasmReturnValue` now contains the final
              // return value of the exported async WASM function.
              //
              // Note: `asyncWasmReturnValue` is distinct from
              // `Asyncify.handleSleepReturnValue`.
              // `Asyncify.handleSleepReturnValue` contains the return
              // value of the last C function to have executed
              // `Asyncify.handleSleep()`, whereas `asyncWasmReturnValue`
              // contains the return value of the exported WASM function
              // that may have called C functions that
              // call `Asyncify.handleSleep()`.
              var asyncPromiseHandlers = Asyncify.asyncPromiseHandlers;
              if (asyncPromiseHandlers) {
                Asyncify.asyncPromiseHandlers = null;
                (isError ? asyncPromiseHandlers.reject : asyncPromiseHandlers.resolve)(asyncWasmReturnValue);
                handled = true;
              }
            }
            if (isError && !handled) {
              // If there was an error and it was not handled by now, we have no choice but to
              // rethrow that error into the global scope where it can be caught only by
              // `onerror` or `onunhandledpromiserejection`.
              throw asyncWasmReturnValue;
            }
          });
          reachedAfterCallback = true;
          if (!reachedCallback) {
            // A true async operation was begun; start a sleep.
            Asyncify.state = Asyncify.State.Unwinding;
            // TODO: reuse, don't alloc/free every sleep
            Asyncify.currData = Asyncify.allocateData();
            if (typeof MainLoop != 'undefined' && MainLoop.func) {
              MainLoop.pause();
            }
            runAndAbortIfError(() => _asyncify_start_unwind(Asyncify.currData));
          }
        } else if (Asyncify.state === Asyncify.State.Rewinding) {
          // Stop a resume.
          Asyncify.state = Asyncify.State.Normal;
          runAndAbortIfError(_asyncify_stop_rewind);
          _free(Asyncify.currData);
          Asyncify.currData = null;
          // Call all sleep callbacks now that the sleep-resume is all done.
          Asyncify.sleepCallbacks.forEach(callUserCallback);
        } else {
          abort(`invalid state: ${Asyncify.state}`);
        }
        return Asyncify.handleSleepReturnValue;
      },
  handleAsync:(startAsync) => Asyncify.handleSleep(async (wakeUp) => {
        // TODO: add error handling as a second param when handleSleep implements it.
        wakeUp(await startAsync());
      }),
  };

  var getCFunc = (ident) => {
      var func = Module['_' + ident]; // closure exported function
      assert(func, `Cannot call unknown function ${ident}, make sure it is exported`);
      return func;
    };
  
  var writeArrayToMemory = (array, buffer) => {
      assert(array.length >= 0, 'writeArrayToMemory array must have a length (should be an array or typed array)')
      HEAP8.set(array, buffer);
    };
  
  
  
  
  
  
  
  
    /**
   * @param {string|null=} returnType
   * @param {Array=} argTypes
   * @param {Array=} args
   * @param {Object=} opts
   */
  var ccall = (ident, returnType, argTypes, args, opts) => {
      // For fast lookup of conversion functions
      var toC = {
        'string': (str) => {
          var ret = 0;
          if (str !== null && str !== undefined && str !== 0) { // null string
            ret = stringToUTF8OnStack(str);
          }
          return ret;
        },
        'array': (arr) => {
          var ret = stackAlloc(arr.length);
          writeArrayToMemory(arr, ret);
          return ret;
        }
      };
  
      function convertReturnValue(ret) {
        if (returnType === 'string') {
          return UTF8ToString(ret);
        }
        if (returnType === 'boolean') return Boolean(ret);
        return ret;
      }
  
      var func = getCFunc(ident);
      var cArgs = [];
      var stack = 0;
      assert(returnType !== 'array', 'return type should not be "array"');
      if (args) {
        for (var i = 0; i < args.length; i++) {
          var converter = toC[argTypes[i]];
          if (converter) {
            if (stack === 0) stack = stackSave();
            cArgs[i] = converter(args[i]);
          } else {
            cArgs[i] = args[i];
          }
        }
      }
      // Data for a previous async operation that was in flight before us.
      var previousAsync = Asyncify.currData;
      var ret = func(...cArgs);
      function onDone(ret) {
        runtimeKeepalivePop();
        if (stack !== 0) stackRestore(stack);
        return convertReturnValue(ret);
      }
    var asyncMode = opts?.async;
  
      // Keep the runtime alive through all calls. Note that this call might not be
      // async, but for simplicity we push and pop in all calls.
      runtimeKeepalivePush();
      if (Asyncify.currData != previousAsync) {
        // A change in async operation happened. If there was already an async
        // operation in flight before us, that is an error: we should not start
        // another async operation while one is active, and we should not stop one
        // either. The only valid combination is to have no change in the async
        // data (so we either had one in flight and left it alone, or we didn't have
        // one), or to have nothing in flight and to start one.
        assert(!(previousAsync && Asyncify.currData), 'We cannot start an async operation when one is already in flight');
        assert(!(previousAsync && !Asyncify.currData), 'We cannot stop an async operation in flight');
        // This is a new async operation. The wasm is paused and has unwound its stack.
        // We need to return a Promise that resolves the return value
        // once the stack is rewound and execution finishes.
        assert(asyncMode, `The call to ${ident} is running asynchronously. If this was intended, add the async option to the ccall/cwrap call.`);
        return Asyncify.whenDone().then(onDone);
      }
  
      ret = onDone(ret);
      // If this is an async ccall, ensure we return a promise
      if (asyncMode) return Promise.resolve(ret);
      return ret;
    };

  
    /**
   * @param {string=} returnType
   * @param {Array=} argTypes
   * @param {Object=} opts
   */
  var cwrap = (ident, returnType, argTypes, opts) => {
      return (...args) => ccall(ident, returnType, argTypes, args, opts);
    };



  
  var updateTableMap = (offset, count) => {
      if (functionsInTableMap) {
        for (var i = offset; i < offset + count; i++) {
          var item = getWasmTableEntry(i);
          // Ignore null values.
          if (item) {
            functionsInTableMap.set(item, i);
          }
        }
      }
    };
  
  var functionsInTableMap;
  
  var getFunctionAddress = (func) => {
      // First, create the map if this is the first use.
      if (!functionsInTableMap) {
        functionsInTableMap = new WeakMap();
        updateTableMap(0, wasmTable.length);
      }
      return functionsInTableMap.get(func) || 0;
    };
  
  
  var freeTableIndexes = [];
  
  var getEmptyTableSlot = () => {
      // Reuse a free index if there is one, otherwise grow.
      if (freeTableIndexes.length) {
        return freeTableIndexes.pop();
      }
      try {
        // Grow the table
        return wasmTable['grow'](1);
      } catch (err) {
        if (!(err instanceof RangeError)) {
          throw err;
        }
        abort('Unable to grow wasm table. Set ALLOW_TABLE_GROWTH.');
      }
    };
  
  
  var setWasmTableEntry = (idx, func) => {
      /** @suppress {checkTypes} */
      wasmTable.set(idx, func);
      // With ABORT_ON_WASM_EXCEPTIONS wasmTable.get is overridden to return wrapped
      // functions so we need to call it here to retrieve the potential wrapper correctly
      // instead of just storing 'func' directly into wasmTableMirror
      /** @suppress {checkTypes} */
      wasmTableMirror[idx] = wasmTable.get(idx);
    };
  
  var uleb128EncodeWithLen = (arr) => {
      const n = arr.length;
      assert(n < 16384);
      // Note: this LEB128 length encoding produces extra byte for n < 128,
      // but we don't care as it's only used in a temporary representation.
      return [(n % 128) | 128, n >> 7, ...arr];
    };
  
  
  var wasmTypeCodes = {
      'i': 0x7f, // i32
      'p': 0x7f, // i32
      'j': 0x7e, // i64
      'f': 0x7d, // f32
      'd': 0x7c, // f64
      'e': 0x6f, // externref
    };
  var generateTypePack = (types) => uleb128EncodeWithLen(Array.from(types, (type) => {
      var code = wasmTypeCodes[type];
      assert(code, `invalid signature char: ${type}`);
      return code;
    }));
  var convertJsFunctionToWasm = (func, sig) => {
      // TODO: If the type reflection proposal ever makes progress we can use
      // it here instead of creatign a new module.
      var bytes = Uint8Array.of(
        0x00, 0x61, 0x73, 0x6d, // magic ("\0asm")
        0x01, 0x00, 0x00, 0x00, // version: 1
        0x01, // Type section code
          // The module is static, with the exception of the type section, which is
          // generated based on the signature passed in.
          ...uleb128EncodeWithLen([
            0x01, // count: 1
            0x60 /* form: func */,
            // param types
            ...generateTypePack(sig.slice(1)),
            // return types (for now only supporting [] if `void` and single [T] otherwise)
            ...generateTypePack(sig[0] === 'v' ? '' : sig[0])
          ]),
        // The rest of the module is static
        0x02, 0x07, // import section
          // (import "e" "f" (func 0 (type 0)))
          0x01, 0x01, 0x65, 0x01, 0x66, 0x00, 0x00,
        0x07, 0x05, // export section
          // (export "f" (func 0 (type 0)))
          0x01, 0x01, 0x66, 0x00, 0x00,
      );
  
      // We can compile this wasm module synchronously because it is very small.
      // This accepts an import (at "e.f"), that it reroutes to an export (at "f")
      var module = new WebAssembly.Module(bytes);
      var instance = new WebAssembly.Instance(module, { 'e': { 'f': func } });
      var wrappedFunc = instance.exports['f'];
      return wrappedFunc;
    };
  
  
  
  /** @param {string=} sig */
  var addFunction = (func, sig) => {
      assert(typeof func != 'undefined');
      // Check if the function is already in the table, to ensure each function
      // gets a unique index.
      var rtn = getFunctionAddress(func);
      if (rtn) {
        return rtn;
      }
  
      // It's not in the table, add it now.
  
      // Make sure functionsInTableMap is actually up to date, that is, that this
      // function is not actually in the wasm Table despite not being tracked in
      // functionsInTableMap.
      for (var i = 0; i < wasmTable.length; i++) {
        assert(getWasmTableEntry(i) != func, 'function in Table but not functionsInTableMap');
      }
  
      var ret = getEmptyTableSlot();
  
      // Set the new value.
      try {
        // Attempting to call this with JS function will cause table.set() to fail
        setWasmTableEntry(ret, func);
      } catch (err) {
        if (!(err instanceof TypeError)) {
          throw err;
        }
        assert(typeof sig != 'undefined', 'Missing signature argument to addFunction: ' + func);
        var wrapped = convertJsFunctionToWasm(func, sig);
        setWasmTableEntry(ret, wrapped);
      }
  
      functionsInTableMap.set(func, ret);
  
      return ret;
    };

  FS.createPreloadedFile = FS_createPreloadedFile;
  FS.preloadFile = FS_preloadFile;
  FS.staticInit();;
// End JS library code

// include: postlibrary.js
// This file is included after the automatically-generated JS library code
// but before the wasm module is created.

{

  // Begin ATMODULES hooks
  if (Module['noExitRuntime']) noExitRuntime = Module['noExitRuntime'];
if (Module['preloadPlugins']) preloadPlugins = Module['preloadPlugins'];
if (Module['print']) out = Module['print'];
if (Module['printErr']) err = Module['printErr'];
if (Module['wasmBinary']) wasmBinary = Module['wasmBinary'];
  // End ATMODULES hooks

  checkIncomingModuleAPI();

  if (Module['arguments']) programArgs = Module['arguments'];
  if (Module['thisProgram']) thisProgram = Module['thisProgram'];

  // Assertions on removed incoming Module JS APIs.
  assert(typeof Module['memoryInitializerPrefixURL'] == 'undefined', 'Module.memoryInitializerPrefixURL option was removed, use Module.locateFile instead');
  assert(typeof Module['pthreadMainPrefixURL'] == 'undefined', 'Module.pthreadMainPrefixURL option was removed, use Module.locateFile instead');
  assert(typeof Module['cdInitializerPrefixURL'] == 'undefined', 'Module.cdInitializerPrefixURL option was removed, use Module.locateFile instead');
  assert(typeof Module['filePackagePrefixURL'] == 'undefined', 'Module.filePackagePrefixURL option was removed, use Module.locateFile instead');
  assert(typeof Module['read'] == 'undefined', 'Module.read option was removed');
  assert(typeof Module['readAsync'] == 'undefined', 'Module.readAsync option was removed (modify readAsync in JS)');
  assert(typeof Module['readBinary'] == 'undefined', 'Module.readBinary option was removed (modify readBinary in JS)');
  assert(typeof Module['setWindowTitle'] == 'undefined', 'Module.setWindowTitle option was removed (modify emscripten_set_window_title in JS)');
  assert(typeof Module['TOTAL_MEMORY'] == 'undefined', 'Module.TOTAL_MEMORY has been renamed Module.INITIAL_MEMORY');
  assert(typeof Module['ENVIRONMENT'] == 'undefined', 'Module.ENVIRONMENT has been deprecated. To force the environment, use the ENVIRONMENT compile-time option (for example, -sENVIRONMENT=web or -sENVIRONMENT=node)');
  assert(typeof Module['STACK_SIZE'] == 'undefined', 'STACK_SIZE can no longer be set at runtime.  Use -sSTACK_SIZE at link time')
  // If memory is defined in wasm, the user can't provide it, or set INITIAL_MEMORY
  assert(typeof Module['wasmMemory'] == 'undefined', 'Use of `wasmMemory` detected.  Use -sIMPORTED_MEMORY to define wasmMemory externally');
  assert(typeof Module['INITIAL_MEMORY'] == 'undefined', 'Detected runtime INITIAL_MEMORY setting.  Use -sIMPORTED_MEMORY to define wasmMemory dynamically');

  if (Module['preInit']) {
    if (typeof Module['preInit'] == 'function') Module['preInit'] = [Module['preInit']];
    while (Module['preInit'].length > 0) {
      Module['preInit'].shift()();
    }
  }
  consumedModuleProp('preInit');
}

// Begin runtime exports
  Module['callMain'] = callMain;
  Module['ccall'] = ccall;
  Module['cwrap'] = cwrap;
  Module['addFunction'] = addFunction;
  Module['UTF8ToString'] = UTF8ToString;
  Module['stringToUTF8'] = stringToUTF8;
  var missingLibrarySymbols = [
  'writeI53ToI64',
  'writeI53ToI64Clamped',
  'writeI53ToI64Signaling',
  'writeI53ToU64Clamped',
  'writeI53ToU64Signaling',
  'readI53FromI64',
  'readI53FromU64',
  'convertI32PairToI53',
  'convertI32PairToI53Checked',
  'convertU32PairToI53',
  'getTempRet0',
  'setTempRet0',
  'zeroMemory',
  'getHeapMax',
  'growMemory',
  'withStackSave',
  'inetPton4',
  'inetNtop4',
  'inetPton6',
  'inetNtop6',
  'readSockaddr',
  'writeSockaddr',
  'runMainThreadEmAsm',
  'jstoi_q',
  'autoResumeAudioContext',
  'getDynCaller',
  'asmjsMangle',
  'alignMemory',
  'HandleAllocator',
  'addOnInit',
  'addOnPostCtor',
  'addOnPreMain',
  'addOnExit',
  'STACK_SIZE',
  'STACK_ALIGN',
  'POINTER_SIZE',
  'ASSERTIONS',
  'removeFunction',
  'intArrayToString',
  'AsciiToString',
  'stringToAscii',
  'UTF16ToString',
  'stringToUTF16',
  'lengthBytesUTF16',
  'UTF32ToString',
  'stringToUTF32',
  'lengthBytesUTF32',
  'stringToNewUTF8',
  'registerKeyEventCallback',
  'maybeCStringToJsString',
  'findEventTarget',
  'getBoundingClientRect',
  'fillMouseEventData',
  'registerMouseEventCallback',
  'registerWheelEventCallback',
  'registerUiEventCallback',
  'registerFocusEventCallback',
  'fillDeviceOrientationEventData',
  'registerDeviceOrientationEventCallback',
  'fillDeviceMotionEventData',
  'registerDeviceMotionEventCallback',
  'screenOrientation',
  'fillOrientationChangeEventData',
  'registerOrientationChangeEventCallback',
  'fillFullscreenChangeEventData',
  'registerFullscreenChangeEventCallback',
  'JSEvents_requestFullscreen',
  'JSEvents_resizeCanvasForFullscreen',
  'registerRestoreOldStyle',
  'hideEverythingExceptGivenElement',
  'restoreHiddenElements',
  'setLetterbox',
  'softFullscreenResizeWebGLRenderTarget',
  'doRequestFullscreen',
  'fillPointerlockChangeEventData',
  'registerPointerlockChangeEventCallback',
  'registerPointerlockErrorEventCallback',
  'requestPointerLock',
  'fillVisibilityChangeEventData',
  'registerVisibilityChangeEventCallback',
  'registerTouchEventCallback',
  'fillGamepadEventData',
  'registerGamepadEventCallback',
  'registerBeforeUnloadEventCallback',
  'fillBatteryEventData',
  'registerBatteryEventCallback',
  'setCanvasElementSize',
  'getCanvasElementSize',
  'jsStackTrace',
  'getCallstack',
  'convertPCtoSourceLocation',
  'wasiRightsToMuslOFlags',
  'wasiOFlagsToMuslOFlags',
  'safeSetTimeout',
  'setImmediateWrapped',
  'safeRequestAnimationFrame',
  'clearImmediateWrapped',
  'registerPostMainLoop',
  'registerPreMainLoop',
  'getPromise',
  'makePromise',
  'addPromise',
  'idsToPromises',
  'makePromiseCallback',
  'ExceptionInfo',
  'findMatchingCatch',
  'incrementUncaughtExceptionCount',
  'decrementUncaughtExceptionCount',
  'Browser_asyncPrepareDataCounter',
  'arraySum',
  'addDays',
  'getSocketFromFD',
  'getSocketAddress',
  'FS_mkdirTree',
  '_setNetworkCallback',
  'heapObjectForWebGLType',
  'toTypedArrayIndex',
  'webgl_enable_ANGLE_instanced_arrays',
  'webgl_enable_OES_vertex_array_object',
  'webgl_enable_WEBGL_draw_buffers',
  'webgl_enable_WEBGL_multi_draw',
  'webgl_enable_EXT_polygon_offset_clamp',
  'webgl_enable_EXT_clip_control',
  'webgl_enable_WEBGL_polygon_mode',
  'emscriptenWebGLGet',
  'computeUnpackAlignedImageSize',
  'colorChannelsInGlTextureFormat',
  'emscriptenWebGLGetTexPixelData',
  'emscriptenWebGLGetUniform',
  'webglGetProgramUniformLocation',
  'webglGetUniformLocation',
  'webglPrepareUniformLocationsBeforeFirstUse',
  'webglGetLeftBracePos',
  'emscriptenWebGLGetVertexAttrib',
  '__glGetActiveAttribOrUniform',
  'writeGLArray',
  'registerWebGlEventCallback',
  'ALLOC_NORMAL',
  'ALLOC_STACK',
  'allocate',
  'writeStringToMemory',
  'writeAsciiToMemory',
  'allocateUTF8',
  'allocateUTF8OnStack',
  'demangle',
  'stackTrace',
  'getNativeTypeSize',
];
missingLibrarySymbols.forEach(missingLibrarySymbol)

  var unexportedSymbols = [
  'run',
  'out',
  'err',
  'abort',
  'wasmExports',
  'writeStackCookie',
  'checkStackCookie',
  'INT53_MAX',
  'INT53_MIN',
  'bigintToI53Checked',
  'HEAP8',
  'HEAPU8',
  'HEAP16',
  'HEAPU16',
  'HEAP32',
  'HEAPU32',
  'HEAPF32',
  'HEAPF64',
  'HEAP64',
  'HEAPU64',
  'stackSave',
  'stackRestore',
  'stackAlloc',
  'createNamedFunction',
  'ptrToString',
  'exitJS',
  'abortOnCannotGrowMemory',
  'ENV',
  'setStackLimits',
  'ERRNO_CODES',
  'strError',
  'DNS',
  'Protocols',
  'Sockets',
  'timers',
  'warnOnce',
  'readEmAsmArgsArray',
  'readEmAsmArgs',
  'runEmAsmFunction',
  'getExecutableName',
  'dynCallLegacy',
  'dynCall',
  'handleException',
  'keepRuntimeAlive',
  'runtimeKeepalivePush',
  'runtimeKeepalivePop',
  'callUserCallback',
  'maybeExit',
  'asyncLoad',
  'mmapAlloc',
  'wasmTable',
  'wasmMemory',
  'getUniqueRunDependency',
  'noExitRuntime',
  'addRunDependency',
  'removeRunDependency',
  'addOnPreRun',
  'addOnPostRun',
  'convertJsFunctionToWasm',
  'freeTableIndexes',
  'functionsInTableMap',
  'getEmptyTableSlot',
  'updateTableMap',
  'getFunctionAddress',
  'setValue',
  'getValue',
  'PATH',
  'PATH_FS',
  'UTF8Decoder',
  'UTF8ArrayToString',
  'stringToUTF8Array',
  'lengthBytesUTF8',
  'intArrayFromString',
  'UTF16Decoder',
  'stringToUTF8OnStack',
  'writeArrayToMemory',
  'JSEvents',
  'specialHTMLTargets',
  'findCanvasEventTarget',
  'currentFullscreenStrategy',
  'restoreOldWindowedStyle',
  'UNWIND_CACHE',
  'ExitStatus',
  'getEnvStrings',
  'checkWasiClock',
  'doReadv',
  'doWritev',
  'initRandomFill',
  'randomFill',
  'emSetImmediate',
  'emClearImmediate_deps',
  'emClearImmediate',
  'promiseMap',
  'uncaughtExceptionCount',
  'exceptionCaught',
  'Browser',
  'requestFullscreen',
  'requestFullScreen',
  'setCanvasSize',
  'getUserMedia',
  'createContext',
  'getPreloadedImageData__data',
  'wget',
  'MONTH_DAYS_REGULAR',
  'MONTH_DAYS_LEAP',
  'MONTH_DAYS_REGULAR_CUMULATIVE',
  'MONTH_DAYS_LEAP_CUMULATIVE',
  'isLeapYear',
  'ydayFromDate',
  'SYSCALLS',
  'preloadPlugins',
  'FS_createPreloadedFile',
  'FS_preloadFile',
  'FS_modeStringToFlags',
  'FS_getMode',
  'FS_fileDataToTypedArray',
  'FS_stdin_getChar_buffer',
  'FS_stdin_getChar',
  'FS_unlink',
  'FS_createPath',
  'FS_createDevice',
  'FS_readFile',
  'FS',
  'FS_root',
  'FS_mounts',
  'FS_devices',
  'FS_streams',
  'FS_nextInode',
  'FS_nameTable',
  'FS_currentPath',
  'FS_initialized',
  'FS_ignorePermissions',
  'FS_filesystems',
  'FS_syncFSRequests',
  'FS_lookupPath',
  'FS_getPath',
  'FS_hashName',
  'FS_hashAddNode',
  'FS_hashRemoveNode',
  'FS_lookupNode',
  'FS_createNode',
  'FS_destroyNode',
  'FS_isRoot',
  'FS_isMountpoint',
  'FS_isFile',
  'FS_isDir',
  'FS_isLink',
  'FS_isChrdev',
  'FS_isBlkdev',
  'FS_isFIFO',
  'FS_isSocket',
  'FS_flagsToPermissionString',
  'FS_nodePermissions',
  'FS_mayLookup',
  'FS_mayCreate',
  'FS_mayDelete',
  'FS_mayOpen',
  'FS_checkOpExists',
  'FS_nextfd',
  'FS_getStreamChecked',
  'FS_getStream',
  'FS_createStream',
  'FS_closeStream',
  'FS_dupStream',
  'FS_doSetAttr',
  'FS_chrdev_stream_ops',
  'FS_major',
  'FS_minor',
  'FS_makedev',
  'FS_registerDevice',
  'FS_getDevice',
  'FS_getMounts',
  'FS_syncfs',
  'FS_mount',
  'FS_unmount',
  'FS_lookup',
  'FS_mknod',
  'FS_statfs',
  'FS_statfsStream',
  'FS_statfsNode',
  'FS_create',
  'FS_mkdir',
  'FS_mkdev',
  'FS_symlink',
  'FS_rename',
  'FS_rmdir',
  'FS_readdir',
  'FS_readlink',
  'FS_stat',
  'FS_fstat',
  'FS_lstat',
  'FS_doChmod',
  'FS_chmod',
  'FS_lchmod',
  'FS_fchmod',
  'FS_doChown',
  'FS_chown',
  'FS_lchown',
  'FS_fchown',
  'FS_doTruncate',
  'FS_truncate',
  'FS_ftruncate',
  'FS_utime',
  'FS_open',
  'FS_close',
  'FS_isClosed',
  'FS_llseek',
  'FS_read',
  'FS_write',
  'FS_mmap',
  'FS_msync',
  'FS_ioctl',
  'FS_writeFile',
  'FS_cwd',
  'FS_chdir',
  'FS_createDefaultDirectories',
  'FS_createDefaultDevices',
  'FS_createSpecialDirectories',
  'FS_createStandardStreams',
  'FS_staticInit',
  'FS_init',
  'FS_quit',
  'FS_findObject',
  'FS_analyzePath',
  'FS_createFile',
  'FS_createDataFile',
  'FS_forceLoadFile',
  'FS_createLazyFile',
  'MEMFS',
  'TTY',
  'PIPEFS',
  'SOCKFS',
  'tempFixedLengthArray',
  'miniTempWebGLFloatBuffers',
  'miniTempWebGLIntBuffers',
  'GL',
  'AL',
  'GLUT',
  'EGL',
  'GLEW',
  'IDBStore',
  'runAndAbortIfError',
  'Asyncify',
  'Fibers',
  'SDL',
  'SDL_gfx',
  'print',
  'printErr',
  'jstoi_s',
];
unexportedSymbols.forEach(unexportedRuntimeSymbol);

  // End runtime exports
  // Begin JS library exports
  // End JS library exports

// end include: postlibrary.js

function checkIncomingModuleAPI() {
  ignoredModuleProp('fetchSettings');
  ignoredModuleProp('logReadFiles');
  ignoredModuleProp('loadSplitModule');
  ignoredModuleProp('onMalloc');
  ignoredModuleProp('onRealloc');
  ignoredModuleProp('onFree');
  ignoredModuleProp('onSbrkGrow');
}
var ASM_CONSTS = {
  93484: ($0, $1, $2) => { return Module['wasm_pipe_read']($0, $1, $2); },  
 93533: ($0, $1, $2) => { return Module['wasm_pipe_write']($0, $1, $2); },  
 93583: ($0, $1) => { term.cursorSet($0, $1); },  
 93611: ($0, $1, $2, $3) => { term.setChar($0, $1, $2, $3); },  
 93645: () => { return term.crsrBlinkMode ? 0 : term.crsrBlockMode ? 1 : 2; },  
 93709: () => { return term.conf.rows; },  
 93736: () => { return term.conf.cols; },  
 93763: () => { return term.hasInput(); },  
 93791: () => { return term.getKey(); },  
 93817: () => { term.inputChar = 0 },  
 93836: () => { term.close() },  
 93849: () => { term = new (Module['TerminalShim'] || Terminal)({ termDiv: 'termDiv', handler: function() {}, x: 0, y: 0, initHandler: function() { term.charMode = true; term.lock = false; term.cursorOn(); } }); term.open(); },  
 94058: ($0, $1) => { term.resizeTo($0, $1); },  
 94085: ($0) => { var funcPtr = $0; term.handler = function() { var f = Module['wasmTable'] ? Module['wasmTable'].get(funcPtr) : Module['dynCall_v'](funcPtr); f(); }; term.orig_resizeTo = term.orig_resizeTo || term.resizeTo; term.resizeTo = function(x,y) { var r = this.orig_resizeTo(x,y); if (r) { var f = Module['wasmTable'] ? Module['wasmTable'].get(funcPtr) : Module['dynCall_v'](funcPtr); f(); } return r; }; },  
 94485: () => { throw 'SimulateInfiniteLoop' },  
 94514: ($0, $1) => { term.resizeTo($0, $1); },  
 94541: ($0, $1) => { var s = TermGlobals.getColorString($0); stringToUTF8(s, $1, 8); },  
 94609: ($0, $1) => { TermGlobals.setColor($0, UTF8ToString($1)); },  
 94657: () => { term.cursorOn() },  
 94673: () => { term.cursorOff() }
};

// Imports from the Wasm binary.
var _fflush = makeInvalidEarlyAccess('_fflush');
var _wasm_pipe_write = Module['_wasm_pipe_write'] = makeInvalidEarlyAccess('_wasm_pipe_write');
var _malloc = makeInvalidEarlyAccess('_malloc');
var _wasm_pipe_read = Module['_wasm_pipe_read'] = makeInvalidEarlyAccess('_wasm_pipe_read');
var _main = Module['_main'] = makeInvalidEarlyAccess('_main');
var _free = makeInvalidEarlyAccess('_free');
var _emscripten_stack_get_end = makeInvalidEarlyAccess('_emscripten_stack_get_end');
var _emscripten_stack_get_base = makeInvalidEarlyAccess('_emscripten_stack_get_base');
var _strerror = makeInvalidEarlyAccess('_strerror');
var _setThrew = makeInvalidEarlyAccess('_setThrew');
var _emscripten_stack_init = makeInvalidEarlyAccess('_emscripten_stack_init');
var _emscripten_stack_get_free = makeInvalidEarlyAccess('_emscripten_stack_get_free');
var __emscripten_stack_restore = makeInvalidEarlyAccess('__emscripten_stack_restore');
var __emscripten_stack_alloc = makeInvalidEarlyAccess('__emscripten_stack_alloc');
var _emscripten_stack_get_current = makeInvalidEarlyAccess('_emscripten_stack_get_current');
var ___set_stack_limits = Module['___set_stack_limits'] = makeInvalidEarlyAccess('___set_stack_limits');
var dynCall_i = makeInvalidEarlyAccess('dynCall_i');
var dynCall_iiiiiii = makeInvalidEarlyAccess('dynCall_iiiiiii');
var dynCall_vi = makeInvalidEarlyAccess('dynCall_vi');
var dynCall_iiii = makeInvalidEarlyAccess('dynCall_iiii');
var dynCall_ii = makeInvalidEarlyAccess('dynCall_ii');
var dynCall_iii = makeInvalidEarlyAccess('dynCall_iii');
var dynCall_vii = makeInvalidEarlyAccess('dynCall_vii');
var dynCall_v = makeInvalidEarlyAccess('dynCall_v');
var dynCall_viii = makeInvalidEarlyAccess('dynCall_viii');
var dynCall_iiiii = makeInvalidEarlyAccess('dynCall_iiiii');
var dynCall_jiji = makeInvalidEarlyAccess('dynCall_jiji');
var dynCall_iidiiiii = makeInvalidEarlyAccess('dynCall_iidiiiii');
var _asyncify_start_unwind = makeInvalidEarlyAccess('_asyncify_start_unwind');
var _asyncify_stop_unwind = makeInvalidEarlyAccess('_asyncify_stop_unwind');
var _asyncify_start_rewind = makeInvalidEarlyAccess('_asyncify_start_rewind');
var _asyncify_stop_rewind = makeInvalidEarlyAccess('_asyncify_stop_rewind');
var memory = makeInvalidEarlyAccess('memory');
var __indirect_function_table = makeInvalidEarlyAccess('__indirect_function_table');
var wasmMemory = makeInvalidEarlyAccess('wasmMemory');
var wasmTable = makeInvalidEarlyAccess('wasmTable');

function assignWasmExports(wasmExports) {
  assert(typeof wasmExports['fflush'] != 'undefined', 'missing Wasm export: fflush');
  assert(typeof wasmExports['wasm_pipe_write'] != 'undefined', 'missing Wasm export: wasm_pipe_write');
  assert(typeof wasmExports['malloc'] != 'undefined', 'missing Wasm export: malloc');
  assert(typeof wasmExports['wasm_pipe_read'] != 'undefined', 'missing Wasm export: wasm_pipe_read');
  assert(typeof wasmExports['__main_argc_argv'] != 'undefined', 'missing Wasm export: __main_argc_argv');
  assert(typeof wasmExports['free'] != 'undefined', 'missing Wasm export: free');
  assert(typeof wasmExports['emscripten_stack_get_end'] != 'undefined', 'missing Wasm export: emscripten_stack_get_end');
  assert(typeof wasmExports['emscripten_stack_get_base'] != 'undefined', 'missing Wasm export: emscripten_stack_get_base');
  assert(typeof wasmExports['strerror'] != 'undefined', 'missing Wasm export: strerror');
  assert(typeof wasmExports['setThrew'] != 'undefined', 'missing Wasm export: setThrew');
  assert(typeof wasmExports['emscripten_stack_init'] != 'undefined', 'missing Wasm export: emscripten_stack_init');
  assert(typeof wasmExports['emscripten_stack_get_free'] != 'undefined', 'missing Wasm export: emscripten_stack_get_free');
  assert(typeof wasmExports['_emscripten_stack_restore'] != 'undefined', 'missing Wasm export: _emscripten_stack_restore');
  assert(typeof wasmExports['_emscripten_stack_alloc'] != 'undefined', 'missing Wasm export: _emscripten_stack_alloc');
  assert(typeof wasmExports['emscripten_stack_get_current'] != 'undefined', 'missing Wasm export: emscripten_stack_get_current');
  assert(typeof wasmExports['__set_stack_limits'] != 'undefined', 'missing Wasm export: __set_stack_limits');
  assert(typeof wasmExports['dynCall_i'] != 'undefined', 'missing Wasm export: dynCall_i');
  assert(typeof wasmExports['dynCall_iiiiiii'] != 'undefined', 'missing Wasm export: dynCall_iiiiiii');
  assert(typeof wasmExports['dynCall_vi'] != 'undefined', 'missing Wasm export: dynCall_vi');
  assert(typeof wasmExports['dynCall_iiii'] != 'undefined', 'missing Wasm export: dynCall_iiii');
  assert(typeof wasmExports['dynCall_ii'] != 'undefined', 'missing Wasm export: dynCall_ii');
  assert(typeof wasmExports['dynCall_iii'] != 'undefined', 'missing Wasm export: dynCall_iii');
  assert(typeof wasmExports['dynCall_vii'] != 'undefined', 'missing Wasm export: dynCall_vii');
  assert(typeof wasmExports['dynCall_v'] != 'undefined', 'missing Wasm export: dynCall_v');
  assert(typeof wasmExports['dynCall_viii'] != 'undefined', 'missing Wasm export: dynCall_viii');
  assert(typeof wasmExports['dynCall_iiiii'] != 'undefined', 'missing Wasm export: dynCall_iiiii');
  assert(typeof wasmExports['dynCall_jiji'] != 'undefined', 'missing Wasm export: dynCall_jiji');
  assert(typeof wasmExports['dynCall_iidiiiii'] != 'undefined', 'missing Wasm export: dynCall_iidiiiii');
  assert(typeof wasmExports['asyncify_start_unwind'] != 'undefined', 'missing Wasm export: asyncify_start_unwind');
  assert(typeof wasmExports['asyncify_stop_unwind'] != 'undefined', 'missing Wasm export: asyncify_stop_unwind');
  assert(typeof wasmExports['asyncify_start_rewind'] != 'undefined', 'missing Wasm export: asyncify_start_rewind');
  assert(typeof wasmExports['asyncify_stop_rewind'] != 'undefined', 'missing Wasm export: asyncify_stop_rewind');
  assert(typeof wasmExports['memory'] != 'undefined', 'missing Wasm export: memory');
  assert(typeof wasmExports['__indirect_function_table'] != 'undefined', 'missing Wasm export: __indirect_function_table');
  _fflush = createExportWrapper('fflush', 1);
  _wasm_pipe_write = Module['_wasm_pipe_write'] = createExportWrapper('wasm_pipe_write', 3);
  _malloc = createExportWrapper('malloc', 1);
  _wasm_pipe_read = Module['_wasm_pipe_read'] = createExportWrapper('wasm_pipe_read', 3);
  _main = Module['_main'] = createExportWrapper('__main_argc_argv', 2);
  _free = createExportWrapper('free', 1);
  _emscripten_stack_get_end = wasmExports['emscripten_stack_get_end'];
  _emscripten_stack_get_base = wasmExports['emscripten_stack_get_base'];
  _strerror = createExportWrapper('strerror', 1);
  _setThrew = createExportWrapper('setThrew', 2);
  _emscripten_stack_init = wasmExports['emscripten_stack_init'];
  _emscripten_stack_get_free = wasmExports['emscripten_stack_get_free'];
  __emscripten_stack_restore = wasmExports['_emscripten_stack_restore'];
  __emscripten_stack_alloc = wasmExports['_emscripten_stack_alloc'];
  _emscripten_stack_get_current = wasmExports['emscripten_stack_get_current'];
  ___set_stack_limits = Module['___set_stack_limits'] = createExportWrapper('__set_stack_limits', 2);
  dynCall_i = dynCalls['i'] = createExportWrapper('dynCall_i', 1);
  dynCall_iiiiiii = dynCalls['iiiiiii'] = createExportWrapper('dynCall_iiiiiii', 7);
  dynCall_vi = dynCalls['vi'] = createExportWrapper('dynCall_vi', 2);
  dynCall_iiii = dynCalls['iiii'] = createExportWrapper('dynCall_iiii', 4);
  dynCall_ii = dynCalls['ii'] = createExportWrapper('dynCall_ii', 2);
  dynCall_iii = dynCalls['iii'] = createExportWrapper('dynCall_iii', 3);
  dynCall_vii = dynCalls['vii'] = createExportWrapper('dynCall_vii', 3);
  dynCall_v = dynCalls['v'] = createExportWrapper('dynCall_v', 1);
  dynCall_viii = dynCalls['viii'] = createExportWrapper('dynCall_viii', 4);
  dynCall_iiiii = dynCalls['iiiii'] = createExportWrapper('dynCall_iiiii', 5);
  dynCall_jiji = dynCalls['jiji'] = createExportWrapper('dynCall_jiji', 4);
  dynCall_iidiiiii = dynCalls['iidiiiii'] = createExportWrapper('dynCall_iidiiiii', 8);
  _asyncify_start_unwind = createExportWrapper('asyncify_start_unwind', 1);
  _asyncify_stop_unwind = createExportWrapper('asyncify_stop_unwind', 0);
  _asyncify_start_rewind = createExportWrapper('asyncify_start_rewind', 1);
  _asyncify_stop_rewind = createExportWrapper('asyncify_stop_rewind', 0);
  memory = wasmMemory = wasmExports['memory'];
  __indirect_function_table = wasmTable = wasmExports['__indirect_function_table'];
}

var wasmImports = {
  /** @export */
  __handle_stack_overflow: ___handle_stack_overflow,
  /** @export */
  __syscall_dup: ___syscall_dup,
  /** @export */
  __syscall_dup3: ___syscall_dup3,
  /** @export */
  __syscall_fcntl64: ___syscall_fcntl64,
  /** @export */
  __syscall_fstat64: ___syscall_fstat64,
  /** @export */
  __syscall_ioctl: ___syscall_ioctl,
  /** @export */
  __syscall_lstat64: ___syscall_lstat64,
  /** @export */
  __syscall_newfstatat: ___syscall_newfstatat,
  /** @export */
  __syscall_openat: ___syscall_openat,
  /** @export */
  __syscall_stat64: ___syscall_stat64,
  /** @export */
  __syscall_umask: ___syscall_umask,
  /** @export */
  __syscall_unlinkat: ___syscall_unlinkat,
  /** @export */
  _abort_js: __abort_js,
  /** @export */
  _emscripten_system: __emscripten_system,
  /** @export */
  _emscripten_throw_longjmp: __emscripten_throw_longjmp,
  /** @export */
  _localtime_js: __localtime_js,
  /** @export */
  _tzset_js: __tzset_js,
  /** @export */
  clock_time_get: _clock_time_get,
  /** @export */
  emscripten_asm_const_int: _emscripten_asm_const_int,
  /** @export */
  emscripten_date_now: _emscripten_date_now,
  /** @export */
  emscripten_err: _emscripten_err,
  /** @export */
  emscripten_get_now: _emscripten_get_now,
  /** @export */
  emscripten_resize_heap: _emscripten_resize_heap,
  /** @export */
  emscripten_sleep: _emscripten_sleep,
  /** @export */
  environ_get: _environ_get,
  /** @export */
  environ_sizes_get: _environ_sizes_get,
  /** @export */
  exit: _exit,
  /** @export */
  fd_close: _fd_close,
  /** @export */
  fd_read: _fd_read,
  /** @export */
  fd_seek: _fd_seek,
  /** @export */
  fd_write: _fd_write,
  /** @export */
  invoke_i,
  /** @export */
  invoke_ii,
  /** @export */
  invoke_iii,
  /** @export */
  invoke_iiii,
  /** @export */
  invoke_iiiii,
  /** @export */
  invoke_v,
  /** @export */
  invoke_vi,
  /** @export */
  invoke_vii,
  /** @export */
  invoke_viii
};

function invoke_vi(index,a1) {
  var sp = stackSave();
  try {
    dynCall_vi(index,a1);
  } catch(e) {
    stackRestore(sp);
    if (!(e instanceof EmscriptenEH)) throw e;
    _setThrew(1, 0);
  }
}

function invoke_iiii(index,a1,a2,a3) {
  var sp = stackSave();
  try {
    return dynCall_iiii(index,a1,a2,a3);
  } catch(e) {
    stackRestore(sp);
    if (!(e instanceof EmscriptenEH)) throw e;
    _setThrew(1, 0);
  }
}

function invoke_ii(index,a1) {
  var sp = stackSave();
  try {
    return dynCall_ii(index,a1);
  } catch(e) {
    stackRestore(sp);
    if (!(e instanceof EmscriptenEH)) throw e;
    _setThrew(1, 0);
  }
}

function invoke_i(index) {
  var sp = stackSave();
  try {
    return dynCall_i(index);
  } catch(e) {
    stackRestore(sp);
    if (!(e instanceof EmscriptenEH)) throw e;
    _setThrew(1, 0);
  }
}

function invoke_iii(index,a1,a2) {
  var sp = stackSave();
  try {
    return dynCall_iii(index,a1,a2);
  } catch(e) {
    stackRestore(sp);
    if (!(e instanceof EmscriptenEH)) throw e;
    _setThrew(1, 0);
  }
}

function invoke_vii(index,a1,a2) {
  var sp = stackSave();
  try {
    dynCall_vii(index,a1,a2);
  } catch(e) {
    stackRestore(sp);
    if (!(e instanceof EmscriptenEH)) throw e;
    _setThrew(1, 0);
  }
}

function invoke_v(index) {
  var sp = stackSave();
  try {
    dynCall_v(index);
  } catch(e) {
    stackRestore(sp);
    if (!(e instanceof EmscriptenEH)) throw e;
    _setThrew(1, 0);
  }
}

function invoke_viii(index,a1,a2,a3) {
  var sp = stackSave();
  try {
    dynCall_viii(index,a1,a2,a3);
  } catch(e) {
    stackRestore(sp);
    if (!(e instanceof EmscriptenEH)) throw e;
    _setThrew(1, 0);
  }
}

function invoke_iiiii(index,a1,a2,a3,a4) {
  var sp = stackSave();
  try {
    return dynCall_iiiii(index,a1,a2,a3,a4);
  } catch(e) {
    stackRestore(sp);
    if (!(e instanceof EmscriptenEH)) throw e;
    _setThrew(1, 0);
  }
}


// include: postamble.js
// === Auto-generated postamble setup entry stuff ===

var calledRun;

function callMain(args = []) {
  assert(runDependencies == 0, 'cannot call main when async dependencies remain! (listen on Module["onRuntimeInitialized"])');
  assert(typeof onPreRuns === 'undefined' || onPreRuns.length == 0, 'cannot call main when preRun functions remain to be called');

  var entryFunction = _main;

  args.unshift(thisProgram);

  var argc = args.length;
  var argv = stackAlloc((argc + 1) * 4);
  var argv_ptr = argv;
  for (var arg of args) {
    HEAPU32[((argv_ptr)>>2)] = stringToUTF8OnStack(arg);
    argv_ptr += 4;
  }
  HEAPU32[((argv_ptr)>>2)] = 0;

  try {

    var ret = entryFunction(argc, argv);

    // if we're not running an evented main loop, it's time to exit
    exitJS(ret, /* implicit = */ true);
    return ret;
  } catch (e) {
    return handleException(e);
  }
}

function stackCheckInit() {
  // This is normally called automatically during __wasm_call_ctors but need to
  // get these values before even running any of the ctors so we call it redundantly
  // here.
  _emscripten_stack_init();
  // TODO(sbc): Move writeStackCookie to native to to avoid this.
  writeStackCookie();
}

function run(args = programArgs) {

  if (runDependencies > 0) {
    dependenciesFulfilled = run;
    return;
  }

  stackCheckInit();

  preRun();

  // a preRun added a dependency, run will be called later
  if (runDependencies > 0) {
    dependenciesFulfilled = run;
    return;
  }

  function doRun() {
    // run may have just been called through dependencies being fulfilled just in this very frame,
    // or while the async setStatus time below was happening
    assert(!calledRun);
    calledRun = true;
    Module['calledRun'] = true;

    if (ABORT) return;

    initRuntime();

    preMain();

    Module['onRuntimeInitialized']?.();
    consumedModuleProp('onRuntimeInitialized');

    var noInitialRun = Module['noInitialRun'] || false;
    if (!noInitialRun) callMain(args);

    postRun();
  }

  if (Module['setStatus']) {
    Module['setStatus']('Running...');
    setTimeout(() => {
      setTimeout(() => Module['setStatus'](''), 1);
      doRun();
    }, 1);
  } else
  {
    doRun();
  }
  checkStackCookie();
}

function checkUnflushedContent() {
  // Compiler settings do not allow exiting the runtime, so flushing
  // the streams is not possible. but in ASSERTIONS mode we check
  // if there was something to flush, and if so tell the user they
  // should request that the runtime be exitable.
  // Normally we would not even include flush() at all, but in ASSERTIONS
  // builds we do so just for this check, and here we see if there is any
  // content to flush, that is, we check if there would have been
  // something a non-ASSERTIONS build would have not seen.
  // How we flush the streams depends on whether we are in SYSCALLS_REQUIRE_FILESYSTEM=0
  // mode (which has its own special function for this; otherwise, all
  // the code is inside libc)
  var oldOut = out;
  var oldErr = err;
  var has = false;
  out = err = (x) => {
    has = true;
  }
  try { // it doesn't matter if it fails
    _fflush(0);
    // also flush in the JS FS layer
    for (var name of ['stdout', 'stderr']) {
      var info = FS.analyzePath('/dev/' + name);
      if (!info) return;
      var stream = info.object;
      var rdev = stream.rdev;
      var tty = TTY.ttys[rdev];
      if (tty?.output?.length) {
        has = true;
      }
    }
  } catch(e) {}
  out = oldOut;
  err = oldErr;
  if (has) {
    warnOnce('stdio streams had content in them that was not flushed. you should set EXIT_RUNTIME to 1 (see the Emscripten FAQ), or make sure to emit a newline when you printf etc.');
  }
}

var wasmExports;

// With async instantation wasmExports is assigned asynchronously when the
// instance is received.
createWasm();

run();

// end include: postamble.js

