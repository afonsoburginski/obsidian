'use strict';

var obsidian = require('obsidian');
var view = require('@codemirror/view');
var state = require('@codemirror/state');

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise, SuppressedError, Symbol, Iterator */

var extendStatics = function(d, b) {
    extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
    return extendStatics(d, b);
};

function __extends(d, b) {
    if (typeof b !== "function" && b !== null)
        throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
    extendStatics(d, b);
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
}

function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

function __generator(thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
}

typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};

var DEFAULT_SETTINGS = {
    hiddenState: true,
    showStatusBar: true,
    hideSubBullets: false,
};
// Facet for providing settings to the CodeMirror extension
var taskHiderSettingsFacet = state.Facet.define({
    combine: function (values) { return values[0] || DEFAULT_SETTINGS; },
});
// Effect to trigger reconfiguration when settings change
var reconfigureEffect = state.StateEffect.define();
/**
 * Get indentation level from line text (count leading spaces/tabs)
 */
function getIndentLevelFromText(text) {
    var match = text.match(/^(\s*)/);
    if (!match)
        return 0;
    var whitespace = match[1];
    // Count tabs as 4 spaces
    return whitespace.replace(/\t/g, "    ").length;
}
/**
 * StateField that tracks which lines should be hidden
 * This uses replace decorations to properly remove content from the editor layout
 */
var hideTasksField = state.StateField.define({
    create: function (state) {
        return buildLineDecorations(state);
    },
    update: function (oldDecorations, tr) {
        // Rebuild decorations if document changed or settings changed
        if (tr.docChanged || tr.effects.some(function (e) { return e.is(reconfigureEffect); })) {
            return buildLineDecorations(tr.state);
        }
        // Otherwise, map the existing decorations to account for changes
        return oldDecorations.map(tr.changes);
    },
    provide: function (field) { return view.EditorView.decorations.from(field); },
});
/**
 * Build replace decorations that actually hide the content
 * This properly removes lines from the editor layout, fixing gutter alignment
 */
function buildLineDecorations(state$1) {
    var settings = state$1.facet(taskHiderSettingsFacet);
    if (!settings.hiddenState) {
        return view.Decoration.none;
    }
    var builder = new state.RangeSetBuilder();
    var doc = state$1.doc;
    // Identify completed task lines and their sub-bullets
    for (var lineNum = 1; lineNum <= doc.lines; lineNum++) {
        var line = doc.line(lineNum);
        var lineText = line.text;
        // Check if this is a completed task line
        var isCompletedTask = /^(\s*[-*+])\s+\[(x|X)\]/.test(lineText);
        if (isCompletedTask) {
            // Use a replace decoration to hide the entire line
            // This properly removes it from the layout so the gutter aligns correctly
            builder.add(line.from, line.to, view.Decoration.replace({}));
            // If hideSubBullets is enabled, mark nested items
            if (settings.hideSubBullets) {
                var taskIndent = getIndentLevelFromText(lineText);
                // Look at subsequent lines to find sub-bullets
                for (var subLineNum = lineNum + 1; subLineNum <= doc.lines; subLineNum++) {
                    var subLine = doc.line(subLineNum);
                    var subLineText = subLine.text;
                    // Skip empty lines
                    if (subLineText.trim() === "") {
                        continue;
                    }
                    var subIndent = getIndentLevelFromText(subLineText);
                    // If we hit a line with equal or less indentation, stop
                    if (subIndent <= taskIndent) {
                        break;
                    }
                    // Hide the sub-bullet line
                    builder.add(subLine.from, subLine.to, view.Decoration.replace({}));
                }
            }
        }
    }
    return builder.finish();
}
var TaskHiderPlugin = /** @class */ (function (_super) {
    __extends(TaskHiderPlugin, _super);
    function TaskHiderPlugin(app, manifest) {
        var _this = _super.call(this, app, manifest) || this;
        _this.statusBar = null;
        return _this;
        // Status bar will be created in onload to ensure proper initialization on mobile
    }
    TaskHiderPlugin.prototype.toggleCompletedTaskView = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.settings.hiddenState = !this.settings.hiddenState;
                        // Toggle body class for preview mode CSS
                        document.body.toggleClass("hide-completed-tasks", this.settings.hiddenState);
                        if (this.statusBar && this.settings.showStatusBar) {
                            this.statusBar.setText(this.settings.hiddenState ? "Hiding Completed Tasks" : "Showing Completed Tasks");
                        }
                        // Update all editor instances with new settings
                        this.updateEditorExtensions();
                        return [4 /*yield*/, this.saveSettings()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    TaskHiderPlugin.prototype.loadSettings = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b, _c, _d;
            return __generator(this, function (_e) {
                switch (_e.label) {
                    case 0:
                        _a = this;
                        _c = (_b = Object).assign;
                        _d = [{}, DEFAULT_SETTINGS];
                        return [4 /*yield*/, this.loadData()];
                    case 1:
                        _a.settings = _c.apply(_b, _d.concat([_e.sent()]));
                        return [2 /*return*/];
                }
            });
        });
    };
    TaskHiderPlugin.prototype.saveSettings = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.saveData(this.settings)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Create the CodeMirror extension with current settings
     */
    TaskHiderPlugin.prototype.createEditorExtension = function () {
        return [
            taskHiderSettingsFacet.of(this.settings),
            hideTasksField,
        ];
    };
    /**
     * Update all editor instances to use the new settings
     */
    TaskHiderPlugin.prototype.updateEditorExtensions = function () {
        // Get all markdown views and dispatch reconfigure effect
        this.app.workspace.iterateAllLeaves(function (leaf) {
            if (leaf.view.getViewType() === "markdown") {
                var view = leaf.view.editor;
                if (view && view.cm) {
                    var cm = view.cm;
                    // Just dispatch our custom effect to trigger a rebuild of decorations
                    // Don't use StateEffect.reconfigure as it would remove Obsidian's extensions
                    cm.dispatch({
                        effects: [reconfigureEffect.of(null)],
                    });
                }
            }
        });
    };
    TaskHiderPlugin.prototype.onload = function () {
        return __awaiter(this, void 0, void 0, function () {
            var error_1;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 2, , 3]);
                        // Load settings first
                        return [4 /*yield*/, this.loadSettings()];
                    case 1:
                        // Load settings first
                        _a.sent();
                        // Create status bar item if enabled
                        if (this.settings.showStatusBar) {
                            this.statusBar = this.addStatusBarItem();
                        }
                        // Register command (available immediately)
                        this.addCommand({
                            id: "toggle-completed-task-view",
                            name: "Toggle Completed Task View",
                            callback: function () {
                                _this.toggleCompletedTaskView();
                            },
                        });
                        // Add settings tab
                        this.addSettingTab(new TaskHiderSettingTab(this.app, this));
                        // Register CodeMirror extension for hiding tasks
                        this.registerEditorExtension(this.createEditorExtension());
                        // Wait for workspace to be ready before manipulating DOM and UI
                        // This is especially important on mobile platforms like iOS
                        this.app.workspace.onLayoutReady(function () {
                            try {
                                // Set initial body class for preview mode
                                document.body.toggleClass("hide-completed-tasks", _this.settings.hiddenState);
                                // Update status bar if enabled
                                if (_this.statusBar && _this.settings.showStatusBar) {
                                    _this.statusBar.setText(_this.settings.hiddenState ? "Hiding Completed Tasks" : "Showing Completed Tasks");
                                }
                                // Register icon and ribbon button
                                obsidian.addIcon("tasks", taskShowIcon);
                                _this.addRibbonIcon("tasks", "Task Hider", function () {
                                    _this.toggleCompletedTaskView();
                                });
                            }
                            catch (error) {
                                console.error("Failed to initialize Completed Task Display UI:", error);
                            }
                        });
                        return [3 /*break*/, 3];
                    case 2:
                        error_1 = _a.sent();
                        console.error("Failed to load Completed Task Display plugin:", error_1);
                        // Ensure default settings even if loading fails
                        this.settings = DEFAULT_SETTINGS;
                        return [3 /*break*/, 3];
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    TaskHiderPlugin.prototype.onunload = function () {
        // CodeMirror extensions are automatically cleaned up by Obsidian
    };
    return TaskHiderPlugin;
}(obsidian.Plugin));
var TaskHiderSettingTab = /** @class */ (function (_super) {
    __extends(TaskHiderSettingTab, _super);
    function TaskHiderSettingTab(app, plugin) {
        var _this = _super.call(this, app, plugin) || this;
        _this.plugin = plugin;
        return _this;
    }
    TaskHiderSettingTab.prototype.display = function () {
        var _this = this;
        var containerEl = this.containerEl;
        containerEl.empty();
        containerEl.createEl("h2", { text: "Completed Task Display Settings" });
        new obsidian.Setting(containerEl)
            .setName("Show status bar message")
            .setDesc("Display 'Hiding/Showing Completed Tasks' in the status bar")
            .addToggle(function (toggle) {
            return toggle
                .setValue(_this.plugin.settings.showStatusBar)
                .onChange(function (value) { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            this.plugin.settings.showStatusBar = value;
                            return [4 /*yield*/, this.plugin.saveSettings()];
                        case 1:
                            _a.sent();
                            // Update status bar visibility
                            if (value && !this.plugin.statusBar) {
                                this.plugin.statusBar = this.plugin.addStatusBarItem();
                                this.plugin.statusBar.setText(this.plugin.settings.hiddenState
                                    ? "Hiding Completed Tasks"
                                    : "Showing Completed Tasks");
                            }
                            else if (!value && this.plugin.statusBar) {
                                this.plugin.statusBar.remove();
                                this.plugin.statusBar = null;
                            }
                            return [2 /*return*/];
                    }
                });
            }); });
        });
        new obsidian.Setting(containerEl)
            .setName("Hide sub-bullets")
            .setDesc("In Edit/Live Preview mode: hide sub-bullets (indented items) beneath completed tasks. Note: In Reading view, sub-bullets are automatically hidden with their parent task.")
            .addToggle(function (toggle) {
            return toggle.setValue(_this.plugin.settings.hideSubBullets).onChange(function (value) { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            this.plugin.settings.hideSubBullets = value;
                            return [4 /*yield*/, this.plugin.saveSettings()];
                        case 1:
                            _a.sent();
                            // Update all editor extensions with new settings
                            this.plugin.updateEditorExtensions();
                            return [2 /*return*/];
                    }
                });
            }); });
        });
    };
    return TaskHiderSettingTab;
}(obsidian.PluginSettingTab));
var taskShowIcon = "<svg aria-hidden=\"true\" focusable=\"false\" data-prefix=\"fal\" data-icon=\"tasks\" class=\"svg-inline--fa fa-tasks fa-w-16\" role=\"img\" xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 512 512\"><path fill=\"currentColor\" d=\"M145.35 207a8 8 0 0 0-11.35 0l-71 71-39-39a8 8 0 0 0-11.31 0L1.35 250.34a8 8 0 0 0 0 11.32l56 56a8 8 0 0 0 11.31 0l88-88a8 8 0 0 0 0-11.32zM62.93 384c-17.67 0-32.4 14.33-32.4 32s14.73 32 32.4 32a32 32 0 0 0 0-64zm82.42-337A8 8 0 0 0 134 47l-71 71-39-39a8 8 0 0 0-11.31 0L1.35 90.34a8 8 0 0 0 0 11.32l56 56a8 8 0 0 0 11.31 0l88-88a8 8 0 0 0 0-11.32zM503 400H199a8 8 0 0 0-8 8v16a8 8 0 0 0 8 8h304a8 8 0 0 0 8-8v-16a8 8 0 0 0-8-8zm0-320H199a8 8 0 0 0-8 8v16a8 8 0 0 0 8 8h304a8 8 0 0 0 8-8V88a8 8 0 0 0-8-8zm0 160H199a8 8 0 0 0-8 8v16a8 8 0 0 0 8 8h304a8 8 0 0 0 8-8v-16a8 8 0 0 0-8-8z\"></path></svg>";

module.exports = TaskHiderPlugin;


/* nosourcemap */