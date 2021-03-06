var EditSession = ace.require('ace/edit_session').EditSession;
var UndoManager = ace.require('ace/undomanager').UndoManager;

/**
 * @constructor
 * @param {string} elementId
 * @param {Settings} settings
 */
function Editor(elementId, settings) {
  this.elementId_ = elementId;
  this.settings_ = settings;
  this.editor_ = ace.edit(this.elementId_);
  this.initTheme_();
  this.editor_.on('change', this.onChange.bind(this));
  this.editor_.setShowPrintMargin(false);
  this.editor_.setShowFoldWidgets(false);
  this.editor_.commands.bindKey('ctrl-shift-l', null);
  $(document).bind('resize', this.editor_.resize.bind(this.editor_));
  $(document).bind('settingschange', this.onSettingsChanged_.bind(this));
  $(document).bind('tabrenamed', this.onTabRenamed_.bind(this));
  if (this.settings_.isReady()) {
    this.editor_.initFromSettings_();  // In case the settings are already loaded.
  } else {
    $(document).bind('settingsready', this.initFromSettings_.bind(this));
  }
}

Editor.EXTENSION_TO_MODE = {
    'bash': 'sh',
    'bib': 'latex',
    'cfm': 'coldfusion',
    'clj': 'clojure',
    'coffee': 'coffee',
    'c': 'c_cpp',
    'c++': 'c_cpp',
    'cc': 'c_cpp',
    'cs': 'csharp',
    'css': 'css',
    'cpp': 'c_cpp',
    'cxx': 'c_cpp',
    'diff': 'diff',
    'gemspec': 'ruby',
    'go': 'golang',
    'groovy': 'groovy',
    'h': 'c_cpp',
    'hh': 'c_cpp',
    'hpp': 'c_cpp',
    'htm': 'html',
    'html': 'html',
    'hx': 'haxe',
    'java': 'java',
    'js': 'javascript',
    'json': 'json',
    'latex': 'latex',
    'less': 'less',
    'liquid': 'liquid',
    'ltx': 'latex',
    'lua': 'lua',
    'markdown': 'markdown',
    'md': 'markdown',
    'ml': 'ocaml',
    'mli': 'ocaml',
    'patch': 'diff',
    'pgsql': 'pgsql',
    'pl': 'perl',
    'pm': 'perl',
    'php': 'php',
    'phtml': 'php',
    'ps1': 'powershell',
    'py': 'python',
    'rb': 'ruby',
    'rdf': 'xml',
    'rss': 'xml',
    'ru': 'ruby',
    'rake': 'rake',
    'scad': 'scad',
    'scala': 'scala',
    'sass': 'scss',
    'scss': 'scss',
    'sh': 'sh',
    'sql': 'sql',
    'svg': 'svg',
    'tex': 'latex',
    'txt': 'txt',
    'textile': 'textile',
    'xhtml': 'html',
    'xml': 'xml',
    'xq': 'xquery',
    'yaml': 'yaml'};

Editor.prototype.initTheme_ = function() {
  var stylesheet = null;

  for (var i = 0; i < document.styleSheets.length; i++) {
      if (document.styleSheets[i].href &&
          document.styleSheets[i].href.indexOf("ace.css") ) {
        stylesheet = document.styleSheets[i];
        break;
      }
  }

  if (!stylesheet) {
    console.error('Didn\'t find stylesheet for Ace');
  }

  var cssText = '';
  for (var i = 0; i < stylesheet.cssRules.length; i++) {
    cssText += '\n' + stylesheet.cssRules[i].cssText;
  }

  ace.define(
    'ace/theme/textdrive',
    ['require', 'exports', 'module', 'ace/lib/dom'],
    function(require, exports, module) {
      exports.cssClass = 'ace-td';
      exports.cssText = cssText;
      var dom = require('../lib/dom');
      dom.importCssString(exports.cssText, exports.cssClass);
    });

   this.editor_.setTheme('ace/theme/textdrive');
};

Editor.prototype.initFromSettings_ = function() {
  this.setFontSize(this.settings_.get('fontsize'));
  this.showHideLineNumbers_(this.settings_.get('linenumbers'));
  this.showHideMargin_(this.settings_.get('margin'),
                       this.settings_.get('margincol'));
  this.setTheme_(this.settings_.get('theme'));
};

/**
 * @param {string} opt_content
 * @return {EditSession}
 * Create an edit session for a new file. Each tab should have its own session.
 */
Editor.prototype.newSession = function(opt_content) {
  session = new EditSession(opt_content || '');

  var mode = session.getMode();
  mode.getNextLineIndent = function(state, line, tab) {
    return this.$getIndent(line);
  };

  var undoManager = new UndoManager();
  session.setUndoManager(undoManager);
  session.setUseWrapMode(this.settings_.get('wraplines'));
  return session;
};

/**
 * @param {EditSession} session
 * Change the current session, e.g. to edit another tab.
 */
Editor.prototype.setSession = function(session) {
  this.editor_.setSession(session);
};

Editor.prototype.find = function(string) {
  var selection = this.editor_.getSelectionRange();
  options = {'wrap': true,
             'start': selection.start};
  this.editor_.find(string, options, true);
};

Editor.prototype.findNext = function() {
  this.editor_.findNext({'wrap': true}, true);
};

Editor.prototype.clearSearch = function() {
  var selection = this.editor_.getSelectionRange();
  this.editor_.moveCursorToPosition(selection.start);
};

Editor.prototype.onChange = function(e) {
  $.event.trigger('docchange', this.editor_.getSession());
};

Editor.prototype.undo = function() {
  this.editor_.undo();
};

Editor.prototype.redo = function() {
  this.editor_.redo();
};

Editor.prototype.focus = function() {
  this.editor_.focus();
};

/**
 * @param {Session} session
 * @param {string} extension
 */
Editor.prototype.setMode = function(session, extension) {
  var mode = Editor.EXTENSION_TO_MODE[extension];
  if (mode)
    session.setMode('ace/mode/' + mode);
};

/**
 * @param {Event} e
 * @param {Tab} tab
 */
Editor.prototype.onTabRenamed_ = function(e, tab) {
  var extension = tab.getExtension();
  if (extension)
    this.setMode(tab.getSession(), extension);
};

/**
 * @param {Event} e
 * @param {string} key
 * @param {*} value
 */
Editor.prototype.onSettingsChanged_ = function(e, key, value) {
  switch (key) {
    case 'fontsize':
      this.setFontSize(value);
      break;

    case 'linenumbers':
      this.showHideLineNumbers_(value);
      break;

    case 'margin':
    case 'margincol':
      this.showHideMargin_(this.settings_.get('margin'),
                           this.settings_.get('margincol'));
      break;
    case 'theme':
      this.setTheme_(this.settings_.get('theme'));
  }
}

/**
 * The actual changing of the font size will be triggered by settings change
 * event.
 */
Editor.prototype.increaseFontSize = function() {
  var fontSize = this.settings_.get('fontsize');
  this.settings_.set('fontsize', fontSize * (9/8));
};

/**
 * The actual changing of the font size will be triggered by settings change
 * event.
 */
Editor.prototype.decreseFontSize = function() {
  var fontSize = this.settings_.get('fontsize');
  this.settings_.set('fontsize', fontSize / (9/8));
};

/**
 * @param {number} fontSize
 * Update font size from settings.
 */
Editor.prototype.setFontSize = function(fontSize) {
  this.editor_.setFontSize(Math.round(fontSize) + 'px');
};

/**
 * @param {boolean} show
 */
Editor.prototype.showHideLineNumbers_ = function(show) {
  $('#' + this.elementId_).toggleClass('hide-line-numbers', !show);
  this.editor_.resize(true /* force */);
};

/**
 * @param {string} theme
 */
Editor.prototype.setTheme_ = function(theme) {
  var dark = false;
  
  var darkThemes = ['ambiance', 'chaos', 'clouds_midnight', 'cobalt', 'idle_fingers',
                    'kr_theme', 'merbivore', 'merbivore_soft', 'mono_industrial', 
                    'monokai', 'pastel_on_dark', 'solarized_dark', 'terminal', 
                    'tomorrow_night', 'twilight', 'vibrant_ink'];
  
  if(darkThemes.indexOf(theme) >= 0)
      dark = true;

  this.editor_.setTheme('ace/theme/' + theme);
  $('header').toggleClass('dark', dark);
};

/**
 * @param {boolean} show
 * @param {number} col
 */
Editor.prototype.showHideMargin_ = function(show, col) {
  this.editor_.setShowPrintMargin(show);
  if (show) {
    this.editor_.setPrintMarginColumn(col);
  }
};