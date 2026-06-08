(function () {
  "use strict";

  var STORAGE_KEY = "sori.tools.state.v1";
  var AEP_STORAGE_KEY = "sori.tools.aep.v1";
  var STORAGE_BACKUP_KEY = "sori.tools.state.backup.v1";
  var AEP_STORAGE_BACKUP_KEY = "sori.tools.aep.backup.v1";
  var cs = new CSInterface();
  var els = {};
  var state = { presetTree: [], selectedId: "", bulkDeleteMode: false, checkedIds: {}, searchQuery: "", searchBusy: false };
  var aepState = { items: [], tree: [], selectedId: "", selectionMode: false, checkedIds: {} };
  var aepDrag = { srcId: null, mode: null };
  var treeDrag = { srcId: null, mode: null };
  var fullMakerClickAt = 0;
  var alignContextClickAt = 0;
  var effectsContextClickAt = 0;
  var proxyContextClickAt = 0;
  var presetSmartShortcutAt = 0;
  var presetSmartShortcutKey = "";
  var aepImportShortcutAt = 0;
  var aepImportShortcutKey = "";
  var shiftHeld = false;
  var presetSearchTimer = 0;
  var presetSearchInputValue = "";
  var presetSearchVersion = 0;
  var aepSearchTimer = 0;
  var aepSearchInputValue = "";
  var aepSearchVersion = 0;
  var fuseSearchCache = {};
  var tooltipTimer = 0;
  var tooltipTarget = null;
  var proxyRun = {
    active: false,
    current: 0,
    total: 0,
    name: "",
    completed: 0,
    failed: 0,
    progressVisible: false,
    progressDismissed: false
  };
  var smartPresetRun = {
    active: false,
    current: 0,
    total: 0,
    name: "",
    progressVisible: false,
    progressDismissed: false
  };
  var boostRun = { active: false, loading: false, profile: "strong" };
  var topazRun = { watchTimer: 0, resumeTimer: 0, startedAt: 0, data: null, notified: false, outputStats: {}, importing: false, importedReady: 0, busy: false };

  var runtime = { hostVersion: 0, legacyCep: false, jsxPath: "", jsxLoaded: false };

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    ensureSwalFallback();
    cacheElements();
    detectRuntime();
    syncPanelSize();
    loadJsx(true);
    loadState();
    wireEvents();
    setupThemedTooltips();
    renderPresetTree();
    loadAepState();
  }

  function ensureSwalFallback() {
    if (typeof window.Swal !== "undefined" && window.Swal && window.Swal.fire) return;

    window.Swal = {
      fire: function (options) {
        options = options || {};
        var title = options.title || "";
        var text = options.text || "";
        var message = title + (text ? "\n" + text : "");
        var result;

        if (options.showDenyButton) {
          result = window.confirm(message + "\n\nOK = " + (options.confirmButtonText || "Confirm") + "\nCancel = more options");
          if (result) {
            return {
              then: function (callback) {
                callback({ isConfirmed: true, isDenied: false, isDismissed: false });
              }
            };
          }
          result = window.confirm((options.denyButtonText || "Deny") + "?");
          return {
            then: function (callback) {
              callback({ isConfirmed: false, isDenied: result, isDismissed: !result });
            }
          };
        }

        if (options.showCancelButton) {
          result = window.confirm(message);
          return {
            then: function (callback) {
              callback({ isConfirmed: result });
            }
          };
        }

        if (message) window.alert(message);
        return {
          then: function (callback) {
            if (callback) callback({ isConfirmed: true });
          }
        };
      }
    };
  }

  function detectRuntime() {
    var hostVersion = 0;
    var userAgent = navigator.userAgent || "";
    var chromeMatch = userAgent.match(/Chrom(?:e|ium)\/(\d+)/i);
    var chromeMajor = chromeMatch ? Number(chromeMatch[1]) : 0;
    try {
      if (cs && cs.getHostEnvironment) {
        var host = cs.getHostEnvironment();
        var version = host && (host.appVersion || host.version || "");
        hostVersion = parseFloat(version) || 0;
      }
    } catch (error) {}
    runtime.hostVersion = hostVersion;
    runtime.legacyCep = (hostVersion > 0 && hostVersion < 18) || (chromeMajor > 0 && chromeMajor <= 83);
    document.body.classList.toggle("legacy-cep", runtime.legacyCep);
  }

  function syncPanelSize() {
    var shell = document.querySelector(".app-shell");
    if (!shell) return;

    function applySize() {
      var width = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
      var height = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0);
      applyPresetLayoutSize(height);

      if (!runtime.legacyCep) {
        shell.style.width = "";
        shell.style.height = "";
        return;
      }

      if (width > 0) shell.style.width = width + "px";
      if (height > 0) shell.style.height = height + "px";
    }

    function applyPresetLayoutSize(height) {
      if (!height || height < 1 || !document.documentElement || !document.documentElement.style) return;
      if (runtime.legacyCep) {
        document.documentElement.style.setProperty("--preset-container-size", "190px");
        document.documentElement.style.setProperty("--preset-panel-min-height", "124px");
        return;
      }

      var presetSize = Math.round(height * 0.34);
      presetSize = Math.max(210, Math.min(270, presetSize));
      document.documentElement.style.setProperty("--preset-container-size", presetSize + "px");
      document.documentElement.style.setProperty("--preset-panel-min-height", Math.max(176, presetSize - 54) + "px");
    }

    applySize();
    window.addEventListener("resize", function () {
      applySize();
      window.setTimeout(applySize, 60);
    });
    if (runtime.legacyCep) window.setInterval(applySize, 250);
  }

  function cacheElements() {
    els.statusDot = document.getElementById("statusDot");
    els.brandLink = document.getElementById("brandLink");
    els.parentToLayer = document.getElementById("parentToLayer");
    els.amountInput = document.getElementById("amountInput");
    els.stepInput = document.getElementById("stepInput");
    els.nullAdjBtn = document.getElementById("nullAdjBtn");
    els.solidCameraBtn = document.getElementById("solidCameraBtn");
    els.precompBtn = document.getElementById("precompBtn");
    els.unprecompBtn = document.getElementById("unprecompBtn");
    els.effectsToggleBtn = document.getElementById("effectsToggleBtn");
    els.proxyBtn = document.getElementById("proxyBtn");
    els.savePresetBtn = document.getElementById("savePresetBtn");
    els.boostBtn = document.getElementById("boostBtn");
    els.addPresetBtn = document.getElementById("addPresetBtn");
    els.newFolderBtn = document.getElementById("newFolderBtn");
    els.bulkDeleteModeBtn = document.getElementById("bulkDeleteModeBtn");
    els.exportPresetsBtn = document.getElementById("exportPresetsBtn");
    els.presetSearchWrap = document.getElementById("presetSearchWrap");
    els.presetSearch = document.getElementById("presetSearch");
    els.clearPresetSearchBtn = document.getElementById("clearPresetSearchBtn");
    els.presetSearchSpinner = document.getElementById("presetSearchSpinner");
    els.presetFile = document.getElementById("presetFile");
    els.presetList = document.getElementById("presetList");
    els.presetDropZone = document.getElementById("presetDropZone");
    els.presetEmpty = document.getElementById("presetEmpty");
    els.aepLibraryBtn = document.getElementById("aepLibraryBtn");
    els.topazFlowBtn = document.getElementById("topazFlowBtn");
    els.aepLibraryModal = document.getElementById("aepLibraryModal");
    els.aepModalCloseBtn = document.getElementById("aepModalCloseBtn");
    els.aepSearchWrap = document.getElementById("aepSearchWrap");
    els.aepSearch = document.getElementById("aepSearch");
    els.aepSearchClearBtn = document.getElementById("aepSearchClearBtn");
    els.aepSearchSpinner = document.getElementById("aepSearchSpinner");
    els.aepImportBtn = document.getElementById("aepImportBtn");
    els.aepNewFolderBtn = document.getElementById("aepNewFolderBtn");
    els.aepSelectionModeBtn = document.getElementById("aepSelectionModeBtn");
    els.aepDropZone = document.getElementById("aepDropZone");
    els.aepList = document.getElementById("aepList");
    els.aepEmpty = document.getElementById("aepEmpty");
  }

  function wireEvents() {
    document.addEventListener("mousedown", function () {
      document.body.classList.remove("using-keyboard");
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Tab") document.body.classList.add("using-keyboard");
      if (e.key === "Shift") shiftHeld = true;
      if (!isModalVisible() && !isEditableTarget(e.target) && state.selectedId && (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "Enter")) {
        handlePresetKeyboardShortcut(e);
      }
    });
    document.addEventListener("keyup", function (e) {
      if (e.key === "Shift") shiftHeld = false;
    });
    window.addEventListener("blur", function () {
      shiftHeld = false;
      closeProxyProgressPopup();
    });

    if (els.brandLink) {
      els.brandLink.addEventListener("click", function (e) {
        e.preventDefault();
        try { cs.openURLInDefaultBrowser("https://www.soriscp.com/"); } catch (err) {}
      });
    }

    var anchorButtons = document.querySelectorAll("[data-anchor]");
    for (var i = 0; i < anchorButtons.length; i += 1) {
      anchorButtons[i].addEventListener("click", anchorClick);
    }

    if (els.amountInput) {
      els.amountInput.addEventListener("keydown", handleInputKeys);
      els.amountInput.addEventListener("blur", sanitizeTimelineInput);
    }
    if (els.stepInput) {
      els.stepInput.addEventListener("keydown", handleInputKeys);
      els.stepInput.addEventListener("blur", sanitizeTimelineInput);
    }

    els.nullAdjBtn.addEventListener("click", function (e) {
      if (e.ctrlKey) {
        e.preventDefault();
        createLayer(resolveMakerType("null", e.shiftKey), true);
        return;
      }
      createLayer(resolveMakerType("null", e.shiftKey), false);
    });
    els.nullAdjBtn.addEventListener("mousedown", function (e) {
      if (e.button !== 2) return;
      e.preventDefault();
      fullMakerClickAt = Date.now();
      createLayer(resolveMakerType("null", e.shiftKey), true);
    });
    els.nullAdjBtn.addEventListener("contextmenu", function (e) {
      e.preventDefault();
      if (Date.now() - fullMakerClickAt > 300) createLayer(resolveMakerType("null", e.shiftKey), true);
    });
    els.solidCameraBtn.addEventListener("click", function (e) {
      if (e.ctrlKey) {
        e.preventDefault();
        createLayer(resolveMakerType("solid", e.shiftKey), true);
        return;
      }
      createLayer(resolveMakerType("solid", e.shiftKey), false);
    });
    els.solidCameraBtn.addEventListener("mousedown", function (e) {
      if (e.button !== 2) return;
      e.preventDefault();
      fullMakerClickAt = Date.now();
      createLayer(resolveMakerType("solid", e.shiftKey), true);
    });
    els.solidCameraBtn.addEventListener("contextmenu", function (e) {
      e.preventDefault();
      if (Date.now() - fullMakerClickAt > 300) createLayer(resolveMakerType("solid", e.shiftKey), true);
    });
    els.precompBtn.addEventListener("click", function (e) {
      runPrecompWithRiskCheck(e.shiftKey);
    });
    els.precompBtn.addEventListener("contextmenu", function (e) {
      e.preventDefault();
      if (e.shiftKey) runPrecompWithRiskCheck(true);
    });
    els.unprecompBtn.addEventListener("click", function () {
      runWithLayerRiskCheck("Unprecomp", "SORI_TOOLS.unprecompSelected()", els.unprecompBtn);
    });
    if (els.effectsToggleBtn) {
      els.effectsToggleBtn.addEventListener("click", function (e) {
        if (Date.now() - effectsContextClickAt < 300) {
          e.preventDefault();
          return;
        }
        toggleEffectControls(e.shiftKey || shiftHeld);
      });
      els.effectsToggleBtn.addEventListener("mousedown", function (e) {
        if (e.button !== 2 || !(e.shiftKey || shiftHeld)) return;
        e.preventDefault();
        effectsContextClickAt = Date.now();
        toggleEffectControls(true);
      });
      els.effectsToggleBtn.addEventListener("contextmenu", function (e) {
        e.preventDefault();
        if (!(e.shiftKey || shiftHeld)) return;
        if (Date.now() - effectsContextClickAt > 300) {
          effectsContextClickAt = Date.now();
          toggleEffectControls(true);
        }
      });
    }
    if (els.proxyBtn) {
      els.proxyBtn.addEventListener("click", function (e) {
        if (Date.now() - proxyContextClickAt < 300) {
          e.preventDefault();
          return;
        }
        if (proxyRun.active) {
          showProxyProgress(proxyRun.current, proxyRun.total, proxyRun.name, true);
          return;
        }
        if (e.shiftKey || shiftHeld) {
          runWithLayerRiskCheck("Toggle Proxies", "SORI_TOOLS.toggleSelectedProxies()", els.proxyBtn);
          return;
        }
        runWithLayerRiskCheck("Auto Proxy", null, els.proxyBtn, createAutoProxies);
      });
      els.proxyBtn.addEventListener("mousedown", function (e) {
        if (e.button !== 2 || !(e.shiftKey || shiftHeld)) return;
        e.preventDefault();
        proxyContextClickAt = Date.now();
        if (proxyRun.active) {
          showProxyProgress(proxyRun.current, proxyRun.total, proxyRun.name, true);
          return;
        }
        runWithLayerRiskCheck("Toggle Proxies", "SORI_TOOLS.toggleSelectedProxies()", els.proxyBtn);
      });
      els.proxyBtn.addEventListener("contextmenu", function (e) {
        e.preventDefault();
        if (proxyRun.active) {
          showProxyProgress(proxyRun.current, proxyRun.total, proxyRun.name, true);
          return;
        }
        if (e.shiftKey || shiftHeld) {
          if (Date.now() - proxyContextClickAt > 300) {
            proxyContextClickAt = Date.now();
            runWithLayerRiskCheck("Toggle Proxies", "SORI_TOOLS.toggleSelectedProxies()", els.proxyBtn);
          }
          return;
        }
        openProxyOptions();
      });
    }
    if (els.savePresetBtn) {
      els.savePresetBtn.addEventListener("click", function (e) {
        var autoSelect = e.shiftKey || e.ctrlKey || e.metaKey;
        runWithLayerRiskCheck("Save Preset", null, els.savePresetBtn, function () { saveSelectedAnimationPreset(autoSelect); });
      });
      els.savePresetBtn.addEventListener("contextmenu", function (e) {
        e.preventDefault();
        runWithLayerRiskCheck("Save Preset", null, els.savePresetBtn, function () { saveSelectedAnimationPreset(true); });
      });
    }
    if (els.boostBtn) {
      els.boostBtn.addEventListener("click", toggleBoostButtonState);
      els.boostBtn.addEventListener("contextmenu", openBoostOptions);
    }
    if (els.topazFlowBtn) {
      els.topazFlowBtn.addEventListener("click", function (e) {
        if (e.shiftKey || shiftHeld) {
          topazFlowImport();
          return;
        }
        runWithLayerRiskCheck("Topaz Flow", null, els.topazFlowBtn, topazFlowExport);
      });
      els.topazFlowBtn.addEventListener("contextmenu", function (e) {
        e.preventDefault();
        openTopazFlowOptions();
      });
    }

    var alignButtons = document.querySelectorAll("[data-align]");
    for (var j = 0; j < alignButtons.length; j += 1) {
      alignButtons[j].addEventListener("mousedown", alignMouseDown);
      alignButtons[j].addEventListener("click", alignClick);
      alignButtons[j].addEventListener("contextmenu", alignContextMenu);
    }

    // Preset events
    els.addPresetBtn.addEventListener("click", openImportDropdown);
    if (els.newFolderBtn) els.newFolderBtn.addEventListener("click", createNewFolder);
    if (els.bulkDeleteModeBtn) els.bulkDeleteModeBtn.addEventListener("click", toggleBulkDeleteMode);
    els.presetFile.addEventListener("change", importPresetFilesLegacy);
    els.exportPresetsBtn.addEventListener("click", exportPresets);
    if (els.presetSearch) {
      els.presetSearch.addEventListener("input", handlePresetSearchInput);
      els.presetSearch.addEventListener("keyup", handlePresetSearchInput);
      els.presetSearch.addEventListener("change", handlePresetSearchInput);
      els.presetSearch.addEventListener("search", handlePresetSearchInput);
      els.presetSearch.addEventListener("keydown", handlePresetSearchKeys);
    }
    if (els.clearPresetSearchBtn) {
      els.clearPresetSearchBtn.addEventListener("click", clearPresetSearch);
    }

    // Explorer drag-drop into preset panel
    if (els.presetDropZone) {
      els.presetDropZone.setAttribute("tabindex", "0");
      els.presetDropZone.addEventListener("keydown", handlePresetListKeys);
      els.presetDropZone.addEventListener("dragover", explorerDragOver);
      els.presetDropZone.addEventListener("dragleave", explorerDragLeave);
      els.presetDropZone.addEventListener("drop", explorerDrop);
    }

    // Deselect presets when clicking anything other than a tree item or menu
    document.addEventListener("click", function (e) {
      var clickedNode = closest(e.target, "tree-node");
      var isInsideContextMenu = closest(e.target, "preset-menu");
      var isInsideSwal = closest(e.target, "swal2-container");

      if (!clickedNode && !isInsideContextMenu && !isInsideSwal) {
        if (state.selectedId) {
          state.selectedId = "";
          saveState();
          renderPresetTree();
        }
      }
    });

    // Deselect presets when clicking completely outside SoriTools (losing panel focus to AE)
    window.addEventListener("blur", function () {
      if (proxyRun.active || smartPresetRun.active) return;
      if (state.selectedId) {
        state.selectedId = "";
        saveState();
        renderPresetTree();
      }
    });

    // AEP Library events
    if (els.aepLibraryBtn) els.aepLibraryBtn.addEventListener("click", openAepLibraryModal);
    if (els.aepModalCloseBtn) els.aepModalCloseBtn.addEventListener("click", function () { closeAepLibraryModal(); });
    if (els.aepImportBtn) els.aepImportBtn.addEventListener("click", importAepFile);
    if (els.aepNewFolderBtn) els.aepNewFolderBtn.addEventListener("click", createNewAepFolder);
    if (els.aepSelectionModeBtn) els.aepSelectionModeBtn.addEventListener("click", toggleAepSelectionMode);
    if (els.aepSearch) els.aepSearch.addEventListener("input", handleAepSearchInput);
    if (els.aepSearchClearBtn) els.aepSearchClearBtn.addEventListener("click", clearAepSearch);
    if (els.aepLibraryModal) {
      els.aepLibraryModal.addEventListener("click", function (e) {
        if (e.target === els.aepLibraryModal) closeAepLibraryModal();
      });
    }
    if (els.aepDropZone) {
      els.aepDropZone.addEventListener("click", clearAepSelectionOnEmptyClick);
      els.aepDropZone.addEventListener("dragover", aepDragOver);
      els.aepDropZone.addEventListener("dragleave", aepDragLeave);
      els.aepDropZone.addEventListener("drop", aepDrop);
    }
  }

  function anchorClick() {
    callAe("SORI_TOOLS.setAnchor(" + q(this.getAttribute("data-anchor")) + ")");
  }

  function alignClick(e) {
    if (Date.now() - alignContextClickAt < 300) {
      e.preventDefault();
      return;
    }
    var payload = {
      mode: this.getAttribute("data-align"),
      shift: e.shiftKey && e.ctrlKey,
      playheadFrames: e.shiftKey && !e.ctrlKey,
      amount: num(els.amountInput.value, 5),
      step: num(els.stepInput.value, 1)
    };
    callAe("SORI_TOOLS.timelineMove(" + q(JSON.stringify(payload)) + ")");
  }

  function alignMouseDown(e) {
    if (e.button !== 2 || !e.shiftKey) return;
    e.preventDefault();
    alignContextClickAt = Date.now();
    sendAlignContextCommand(this, e.ctrlKey);
  }

  function alignContextMenu(e) {
    e.preventDefault();
    if (!e.shiftKey) return;
    if (Date.now() - alignContextClickAt > 300) {
      alignContextClickAt = Date.now();
      sendAlignContextCommand(this, e.ctrlKey);
    }
  }

  function sendAlignContextCommand(button, moveSelection) {
    var payload = {
      mode: button.getAttribute("data-align"),
      shift: !!moveSelection,
      playheadFrames: !moveSelection,
      amount: num(els.amountInput.value, 5),
      step: num(els.stepInput.value, 1)
    };
    callAe("SORI_TOOLS.timelineMove(" + q(JSON.stringify(payload)) + ")");
  }

  function resolveMakerType(baseType, shiftKey) {
    if (!shiftKey) return baseType;
    if (baseType === "null") return "adjustment";
    if (baseType === "solid") return "camera";
    return baseType;
  }

  function createLayer(type, full) {
    var payload = { type: type, parent: !!els.parentToLayer.checked, full: !!full };
    callAe("SORI_TOOLS.createSmartLayer(" + q(JSON.stringify(payload)) + ")");
  }

  function runPrecompWithRiskCheck(single) {
    callAeQuiet("SORI_TOOLS.precompRiskSummary()", function (response) {
      var risky = response && response.ok && response.data && response.data.risky ? response.data.risky : [];
      if (!risky.length) {
        callAe("SORI_TOOLS.precompSelected(" + (single ? "true" : "false") + ")", null, els.precompBtn);
        return;
      }
      showLayerRiskConfirm("Risky Precomp Detected", "These layers may change after precomp/unprecomp:", risky, "A debug snapshot will be written if you continue.", function () {
        callAe("SORI_TOOLS.precompSelected(" + (single ? "true" : "false") + ")", null, els.precompBtn);
      });
    });
  }

  function runWithLayerRiskCheck(title, script, triggerBtn, fallback) {
    callAeQuiet("SORI_TOOLS.selectedLayerRiskSummary()", function (response) {
      var risky = response && response.ok && response.data && response.data.risky ? response.data.risky : [];
      var run = function () {
        if (script) callAe(script, null, triggerBtn);
        else if (fallback) fallback();
      };
      if (!response || response.ok === false || !risky.length) {
        run();
        return;
      }
      showLayerRiskConfirm("Risky " + title + " Target", "Selected layers have edge-case settings:", risky, "Continue if this is intended.", run);
    });
  }

  function showLayerRiskConfirm(title, intro, risky, outro, onConfirm) {
    var lines = [];
    for (var i = 0; i < risky.length && i < 8; i += 1) {
      lines.push(esc(risky[i].name) + ": " + esc((risky[i].reasons || []).join(", ")));
    }
    if (risky.length > lines.length) lines.push("+" + (risky.length - lines.length) + " more layer(s)");
    popup({
      title: title,
      html: '<div style="text-align:left;font-size:12px;line-height:1.5"><p>' + esc(intro) + '</p><p>' + lines.join("<br>") + '</p><p>' + esc(outro) + '</p></div>',
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Continue",
      cancelButtonText: "Cancel"
    }).then(function (result) {
      if (result && result.isConfirmed && onConfirm) onConfirm();
    });
  }

  function toggleEffectControls(includeNested) {
    var payload = { includeNested: !!includeNested };
    callAe("SORI_TOOLS.toggleEffectControls(" + q(JSON.stringify(payload)) + ")", null, els.effectsToggleBtn);
  }

  function createAutoProxies() {
    if (proxyRun.active) {
      showProxyProgress(proxyRun.current, proxyRun.total, proxyRun.name, true);
      return;
    }
    callAe("SORI_TOOLS.getSelectedProxyJobs()", function (response) {
      if (!response || !response.ok || !response.data || !response.data.jobs || !response.data.jobs.length) return;
      runProxyJobs(response.data.jobs);
    }, els.proxyBtn);
  }

  function toggleProxies() {
    callAe("SORI_TOOLS.toggleSelectedProxies()", null, els.proxyBtn);
  }

  function openProxyOptions() {
    popup({
      title: "Proxy Options",
      text: "Choose an action for selected Project footage.",
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: "Reveal Folder",
      denyButtonText: "Clear Proxy",
      cancelButtonText: "Cancel"
    }).then(function (result) {
      if (result && result.isConfirmed) {
        callAe("SORI_TOOLS.revealSelectedProxyFolder()", null, els.proxyBtn);
      } else if (result && result.isDenied) {
        callAe("SORI_TOOLS.clearSelectedProxies()", null, els.proxyBtn);
      }
    });
  }

  function getNodeRequire() {
    try {
      if (typeof require === "function") return require;
      if (window.cep_node && typeof window.cep_node.require === "function") return window.cep_node.require;
    } catch (error) {}
    return null;
  }

  function findFfmpegPath(childProcess) {
    try {
      var found = childProcess.execFileSync("where.exe", ["ffmpeg"], { encoding: "utf8" });
      var lines = String(found || "").split(/\r?\n/);
      for (var i = 0; i < lines.length; i += 1) {
        if (lines[i] && /ffmpeg(?:\.exe)?$/i.test(lines[i])) return lines[i];
      }
    } catch (error) {}
    return "ffmpeg";
  }

  function showProxyProgress(current, total, name, forceOpen) {
    if (typeof Swal === "undefined" || !Swal.fire) return;
    proxyRun.current = Math.max(0, Number(current) || 0);
    proxyRun.total = Math.max(0, Number(total) || 0);
    proxyRun.name = String(name || "");
    if (forceOpen) proxyRun.progressDismissed = false;
    var html = '<div style="text-align:left;font-size:12px;line-height:1.5">';
    html += '<div>Encoding ' + proxyRun.current + ' / ' + proxyRun.total + '</div>';
    if (proxyRun.completed || proxyRun.failed) {
      html += '<div style="margin-top:4px;color:#a1a1aa">Done ' + proxyRun.completed + (proxyRun.failed ? " · Failed " + proxyRun.failed : "") + '</div>';
    }
    html += '<div style="margin-top:6px;color:#a1a1aa;word-break:break-all">' + esc(name || "") + '</div>';
    html += '</div>';
    var options = {
      title: "Creating Proxies",
      html: html,
      backdrop: true,
      allowOutsideClick: true,
      allowEscapeKey: true,
      showConfirmButton: false,
      customClass: { popup: "soritools-popup" },
      showClass: { popup: "sori-swal-show", backdrop: "sori-swal-backdrop-show" },
      hideClass: { popup: "sori-swal-hide", backdrop: "sori-swal-backdrop-hide" }
    };

    if (Swal.isVisible && Swal.isVisible()) {
      if (!proxyRun.progressVisible && !forceOpen) return;
      try {
        var container = Swal.getHtmlContainer ? Swal.getHtmlContainer() : null;
        if (container) container.innerHTML = html;
        proxyRun.progressVisible = true;
        bindProxyProgressOutsideDismiss();
      } catch (error) {}
      return;
    }

    if (proxyRun.progressDismissed && !forceOpen) return;

    try {
      proxyRun.progressVisible = true;
      Swal.fire(options).then(function () {
        proxyRun.progressVisible = false;
        if (proxyRun.active) proxyRun.progressDismissed = true;
        unbindProxyProgressOutsideDismiss();
      });
      bindProxyProgressOutsideDismiss();
    } catch (errorFire) {}
  }

  function bindProxyProgressOutsideDismiss() {
    window.setTimeout(function () {
      document.addEventListener("mousedown", hideProxyProgressOnOutsideClick, true);
      document.addEventListener("touchstart", hideProxyProgressOnOutsideClick, true);
    }, 0);
  }

  function unbindProxyProgressOutsideDismiss() {
    document.removeEventListener("mousedown", hideProxyProgressOnOutsideClick, true);
    document.removeEventListener("touchstart", hideProxyProgressOnOutsideClick, true);
  }

  function hideProxyProgressOnOutsideClick(e) {
    if (!proxyRun.progressVisible) {
      unbindProxyProgressOutsideDismiss();
      return;
    }
    var target = e && e.target ? e.target : null;
    if (!target) return;
    if (els.proxyBtn && (target === els.proxyBtn || els.proxyBtn.contains(target))) return;
    if (closest(target, "swal2-popup")) return;
    closeProxyProgressPopup(true);
  }

  function closeProxyProgressPopup(markDismissed) {
    if (!proxyRun.progressVisible) return;
    if (markDismissed !== false && proxyRun.active) proxyRun.progressDismissed = true;
    try { if (Swal.close) Swal.close(); } catch (error) {}
    proxyRun.progressVisible = false;
    unbindProxyProgressOutsideDismiss();
  }

  function runProxyJobs(jobs) {
    if (proxyRun.active) {
      showProxyProgress(proxyRun.current, proxyRun.total, proxyRun.name);
      return;
    }
    var nodeRequire = getNodeRequire();
    if (!nodeRequire) {
      toast("error", "Node.js is not available in this CEP panel. Reopen AE or check manifest node support.");
      return;
    }

    var childProcess;
    var fs;
    try {
      childProcess = nodeRequire("child_process");
      fs = nodeRequire("fs");
    } catch (error) {
      toast("error", "Could not load CEP Node modules: " + error.message);
      return;
    }

    var ffmpegPath = findFfmpegPath(childProcess);
    try {
      childProcess.execFileSync(ffmpegPath, ["-version"], { encoding: "utf8" });
    } catch (ffmpegError) {
      toast("error", "ffmpeg was not found or could not run. Install ffmpeg and add it to PATH.");
      return;
    }
    var completed = [];
    var failed = [];
    var index = 0;

    proxyRun.active = true;
    proxyRun.current = 0;
    proxyRun.total = jobs.length;
    proxyRun.name = "Preparing encoder...";
    proxyRun.completed = 0;
    proxyRun.failed = 0;
    proxyRun.progressDismissed = false;
    if (els.proxyBtn) els.proxyBtn.classList.add("is-loading");
    showProxyProgress(0, jobs.length, "Preparing encoder...", true);

    function finish() {
      if (!completed.length) {
        proxyRun.active = false;
        proxyRun.completed = completed.length;
        proxyRun.failed = failed.length;
        if (els.proxyBtn) els.proxyBtn.classList.remove("is-loading");
        closeProxyProgressPopup(false);
        toast("error", failed.length ? "Proxy creation failed: " + failed[0] : "No proxies were created.");
        return;
      }

      showProxyProgress(jobs.length, jobs.length, "Attaching proxies in After Effects...");
      callAe("SORI_TOOLS.setGeneratedProxies(" + q(JSON.stringify(completed)) + ")", function (response) {
        proxyRun.active = false;
        proxyRun.completed = completed.length;
        proxyRun.failed = failed.length;
        if (els.proxyBtn) els.proxyBtn.classList.remove("is-loading");
        closeProxyProgressPopup(false);
        if (response && response.ok) {
          popup({
            title: "Proxy Ready",
            text: response.message || "Proxy files are attached.",
            icon: "success",
            timer: 1400,
            showConfirmButton: false
          });
        }
        if (failed.length && response && response.ok) toast("error", failed.length + " proxy job(s) failed.");
      }, els.proxyBtn);
    }

    function runNext() {
      if (index >= jobs.length) {
        finish();
        return;
      }

      var job = jobs[index];
      index += 1;
      showProxyProgress(index, jobs.length, job.name);

      try {
        var outputExists = job.outputPath && fs.existsSync(job.outputPath);
        if (outputExists && job.overwrite !== true) {
          completed.push(job);
          proxyRun.completed = completed.length;
          proxyRun.failed = failed.length;
          runNext();
          return;
        }
      } catch (errorExists) {}

      encodeProxyJob(childProcess, ffmpegPath, job, function (error) {
        if (error) failed.push(job.name + ": " + error);
        else completed.push(job);
        proxyRun.completed = completed.length;
        proxyRun.failed = failed.length;
        runNext();
      });
    }

    runNext();
  }

  function encodeProxyJob(childProcess, ffmpegPath, job, done) {
    var args = [
      "-y",
      "-hide_banner",
      "-i", job.sourcePath,
      "-map", "0:v:0",
      "-map", "0:a?",
      "-vf", "scale=960:540:force_original_aspect_ratio=decrease:force_divisible_by=2,setsar=1",
      "-c:v", "prores_ks",
      "-profile:v", "0",
      "-vendor", "apl0",
      "-pix_fmt", "yuv422p10le",
      "-c:a", "pcm_s16le",
      job.outputPath
    ];

    var proc;
    var stderr = "";
    try {
      proc = childProcess.spawn(ffmpegPath, args);
    } catch (error) {
      done(error.message);
      return;
    }

    proc.stderr.on("data", function (chunk) {
      stderr += String(chunk || "");
      if (stderr.length > 2400) stderr = stderr.slice(stderr.length - 2400);
    });
    var settled = false;
    proc.on("error", function (error) {
      if (settled) return;
      settled = true;
      done(error.message);
    });
    proc.on("close", function (code) {
      if (settled) return;
      settled = true;
      if (code === 0) done(null);
      else done("ffmpeg exited with code " + code + (stderr ? ": " + stderr.split(/\r?\n/).slice(-2).join(" ") : ""));
    });
  }

  /* ───────────────────────────────────────────────────────────────────
     PRESET TREE SYSTEM
     ─────────────────────────────────────────────────────────────────── */

  // ── Tree helpers ──

  function assignIds(nodes) {
    for (var i = 0; i < nodes.length; i += 1) {
      if (!nodes[i].id) nodes[i].id = uid();
      if (nodes[i].children) assignIds(nodes[i].children);
    }
  }

  function findNodeResult(tree, id) {
    for (var i = 0; i < tree.length; i += 1) {
      if (tree[i].id === id) return { node: tree[i], parent: tree, index: i };
      if (tree[i].children) {
        var sub = findNodeResult(tree[i].children, id);
        if (sub) return sub;
      }
    }
    return null;
  }

  function findNode(id) {
    var r = findNodeResult(state.presetTree, id);
    return r ? r.node : null;
  }

  function removeNode(tree, id) {
    for (var i = 0; i < tree.length; i += 1) {
      if (tree[i].id === id) { return tree.splice(i, 1)[0]; }
      if (tree[i].children) {
        var removed = removeNode(tree[i].children, id);
        if (removed) return removed;
      }
    }
    return null;
  }

  function flattenPresets(nodes) {
    var result = [];
    for (var i = 0; i < nodes.length; i += 1) {
      if (nodes[i].type === "preset") result.push(nodes[i]);
      if (nodes[i].children) {
        var sub = flattenPresets(nodes[i].children);
        for (var j = 0; j < sub.length; j += 1) result.push(sub[j]);
      }
    }
    return result;
  }

  function collectAllPaths(nodes) {
    var paths = [];
    var all = flattenPresets(nodes);
    for (var i = 0; i < all.length; i += 1) {
      if (all[i].path) paths.push(all[i].path);
    }
    return paths;
  }

  function getParentList(id) {
    var r = findNodeResult(state.presetTree, id);
    return r ? r.parent : null;
  }

  // ── Rendering ──

  function renderPresetTree() {
    els.presetList.innerHTML = "";
    syncPresetSearchUi();
    if (!state.presetTree.length) {
      setPresetEmpty("Drop .ffx files here or click + to import", true);
      return;
    }

    var nodes = state.searchQuery ? filterPresetTree(state.presetTree, state.searchQuery, createFuseMatchMap("preset", flattenSearchNodes(state.presetTree), state.searchQuery, ["name", "path", "type"], presetSearchVersion)) : state.presetTree;
    if (!nodes.length) {
      setPresetEmpty("No presets found", true);
      return;
    }

    setPresetEmpty("", false);
    renderNodes(els.presetList, nodes, 0);
  }

  function setPresetEmpty(message, visible) {
    if (!els.presetEmpty) return;
    if (message) els.presetEmpty.textContent = message;
    els.presetEmpty.style.display = visible ? "" : "none";
  }

  function normalizeSearch(value) {
    return String(value || "").replace(/^\s+|\s+$/g, "").toLowerCase();
  }

  function nodeSearchText(node) {
    return String((node && node.name) || "") + " " + String((node && node.path) || "");
  }

  function searchTokens(value) {
    var raw = normalizeSearch(value).split(/[^a-z0-9]+/);
    var tokens = [];
    for (var i = 0; i < raw.length; i += 1) {
      if (raw[i]) tokens.push(raw[i]);
    }
    return tokens;
  }

  function fuzzyDistanceLimit(token) {
    if (token.length < 3) return 0;
    if (token.length <= 4) return 1;
    if (token.length <= 8) return 2;
    return 3;
  }

  function limitedEditDistance(a, b, limit) {
    var i;
    var j;
    var previous = [];
    var current = [];

    if (Math.abs(a.length - b.length) > limit) return limit + 1;
    for (j = 0; j <= b.length; j += 1) previous[j] = j;

    for (i = 1; i <= a.length; i += 1) {
      current[0] = i;
      var rowMin = current[0];
      for (j = 1; j <= b.length; j += 1) {
        var cost = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
        current[j] = Math.min(
          previous[j] + 1,
          current[j - 1] + 1,
          previous[j - 1] + cost
        );
        if (current[j] < rowMin) rowMin = current[j];
      }
      if (rowMin > limit) return limit + 1;
      previous = current;
      current = [];
    }

    return previous[b.length];
  }

  function searchTokenMatches(queryToken, text, tokens) {
    if (text.indexOf(queryToken) >= 0) return true;

    var limit = fuzzyDistanceLimit(queryToken);
    if (!limit) return false;

    for (var i = 0; i < tokens.length; i += 1) {
      var token = tokens[i];
      if (!token) continue;
      if (token.indexOf(queryToken) >= 0) return true;
      if (limitedEditDistance(queryToken, token, limit) <= limit) return true;
    }
    return false;
  }

  function matchesSearchQuery(text, query) {
    var cleanText = normalizeSearch(text);
    var cleanQuery = normalizeSearch(query);
    if (!cleanQuery) return true;
    if (cleanText.indexOf(cleanQuery) >= 0) return true;

    var queryTokens = searchTokens(cleanQuery);
    var textTokens = searchTokens(cleanText);
    for (var i = 0; i < queryTokens.length; i += 1) {
      if (!searchTokenMatches(queryTokens[i], cleanText, textTokens)) return false;
    }
    return queryTokens.length > 0;
  }

  function flattenSearchNodes(nodes) {
    var result = [];
    for (var i = 0; i < nodes.length; i += 1) {
      result.push(nodes[i]);
      if (nodes[i].children) {
        var sub = flattenSearchNodes(nodes[i].children);
        for (var j = 0; j < sub.length; j += 1) result.push(sub[j]);
      }
    }
    return result;
  }

  function clearFuseCacheScope(scope) {
    for (var key in fuseSearchCache) {
      if (key.indexOf(scope + ":") === 0) delete fuseSearchCache[key];
    }
  }

  function bumpPresetSearchVersion() {
    presetSearchVersion += 1;
    clearFuseCacheScope("preset");
  }

  function bumpAepSearchVersion() {
    aepSearchVersion += 1;
    clearFuseCacheScope("aep");
  }

  function createFuseMatchMap(scope, items, query, keys, version) {
    if (!query || typeof Fuse === "undefined" || !items || !items.length) return null;
    try {
      var cacheKey = scope + ":" + String(version);
      var cached = fuseSearchCache[cacheKey];
      if (!cached) {
        cached = {
          items: items,
          fuse: new Fuse(items, {
            keys: keys,
            threshold: 0.35,
            ignoreLocation: true,
            shouldSort: true,
            minMatchCharLength: 1
          })
        };
        fuseSearchCache[cacheKey] = cached;
      }
      var matches = cached.fuse.search(query);
      var map = {};
      for (var i = 0; i < matches.length; i += 1) {
        var item = matches[i].item || matches[i];
        if (item && item.id) map[item.id] = true;
      }
      return map;
    } catch (error) {}
    return null;
  }

  function clonePresetNodeForSearch(node, children) {
    var copy = {
      id: node.id,
      type: node.type,
      name: node.name,
      path: node.path,
      expanded: node.type === "folder" ? true : node.expanded
    };
    if (children) copy.children = children;
    return copy;
  }

  function clonePresetBranchForSearch(nodes) {
    var result = [];
    for (var i = 0; i < nodes.length; i += 1) {
      var node = nodes[i];
      var children = node.children ? clonePresetBranchForSearch(node.children) : null;
      result.push(clonePresetNodeForSearch(node, children));
    }
    return result;
  }

  function filterPresetTree(nodes, query, matchMap) {
    var result = [];
    for (var i = 0; i < nodes.length; i += 1) {
      var node = nodes[i];
      var selfMatch = matchMap ? !!matchMap[node.id] : matchesSearchQuery(nodeSearchText(node), query);
      var childMatches = node.children ? filterPresetTree(node.children, query, matchMap) : [];

      if (selfMatch || childMatches.length) {
        var children = null;
        if (node.children) {
          children = selfMatch ? clonePresetBranchForSearch(node.children) : childMatches;
        }
        result.push(clonePresetNodeForSearch(node, children));
      }
    }
    return result;
  }

  function syncPresetSearchUi() {
    if (els.presetSearch && !state.searchQuery && !state.searchBusy && els.presetSearch.value) {
      els.presetSearch.value = "";
      presetSearchInputValue = "";
    }
    if (els.presetSearchWrap) {
      els.presetSearchWrap.classList.toggle("has-query", !!state.searchQuery);
      els.presetSearchWrap.classList.toggle("is-searching", !!state.searchBusy);
    }
  }

  function renderNodes(container, nodes, depth) {
    for (var i = 0; i < nodes.length; i += 1) {
      var node = nodes[i];
      var row = createNodeRow(node, depth);
      container.appendChild(row);

      if (node.type === "folder" && node.children && node.expanded) {
        var childContainer = document.createElement("div");
        childContainer.className = "tree-children";
        renderNodes(childContainer, node.children, depth + 1);
        container.appendChild(childContainer);
      }
    }
  }

  function createNodeRow(node, depth) {
    var row = document.createElement("div");
    row.className = "tree-node" + (node.type === "folder" ? " tree-folder" : " tree-preset");
    if (node.id === state.selectedId) row.className += " is-selected";
    row.setAttribute("data-id", node.id);
    row.setAttribute("data-type", node.type);
    row.setAttribute("draggable", "true");
    row.setAttribute("tabindex", "-1");

    // Indent spacer
    if (depth > 0) {
      var indent = document.createElement("span");
      indent.className = "tree-node-indent";
      indent.style.width = (depth * 14) + "px";
      row.appendChild(indent);
    }

    // Checkbox (bulk delete mode)
    if (state.bulkDeleteMode) {
      var cb = document.createElement("input");
      cb.type = "checkbox";
      cb.className = "tree-node-checkbox";
      cb.checked = !!state.checkedIds[node.id];
      cb.addEventListener("click", function (e) {
        e.stopPropagation();
        toggleNodeCheck(node.id, cb.checked);
      });
      row.appendChild(cb);
    }

    // Chevron (folders only)
    var chevron = document.createElement("span");
    chevron.className = "tree-node-chevron";
    if (node.type === "folder") {
      chevron.innerHTML = "&#9654;"; // ▶
      if (node.expanded) chevron.className += " is-expanded";
      chevron.addEventListener("click", function (e) {
        e.stopPropagation();
        toggleFolder(node.id);
      });
    }
    row.appendChild(chevron);

    // Icon
    var icon = document.createElement("span");
    icon.className = "tree-node-icon";
    if (node.type === "folder") {
      icon.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>';
    } else {
      icon.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
    }
    row.appendChild(icon);

    // Name
    var nameSpan = document.createElement("span");
    nameSpan.className = "tree-node-name";
    nameSpan.textContent = node.name;
    row.appendChild(nameSpan);
    if (node.type === "preset") {
      row.setAttribute("title", "Double-click: Apply · Shift+Click/Shift+Right-click: Smart Fit Layer · Ctrl+Click: Smart From Playhead · Right-click: Options");
    } else {
      row.setAttribute("title", "Click: Select · Double-click: Open/Close · Right-click: Options");
    }

    // Event listeners
    row.addEventListener("click", nodeClick);
    row.addEventListener("dblclick", nodeDblClick);
    row.addEventListener("contextmenu", function (e) {
      if (node.type === "preset" && node.path && (e.shiftKey || shiftHeld)) {
        e.preventDefault();
        e.stopPropagation();
        state.selectedId = node.id;
        saveState();
        renderPresetTree();
        applyPresetSmart(node.path, "fitLayer");
        return;
      }
      if (node.type === "preset" && node.path && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        e.stopPropagation();
        state.selectedId = node.id;
        saveState();
        renderPresetTree();
        applyPresetSmart(node.path, "fromPlayhead");
        return;
      }
      openContextMenu(e, node.id);
    });
    row.addEventListener("dragstart", treeDragStart);
    row.addEventListener("dragover", treeDragOver);
    row.addEventListener("dragleave", treeDragLeave);
    row.addEventListener("drop", treeDrop);
    row.addEventListener("dragend", treeDragEnd);

    return row;
  }

  // ── Node interactions ──

  function nodeClick(e) {
    if (e.button && e.button !== 0) return;
    e.stopPropagation();
    var row = closestNode(e.target);
    if (!row) return;
    var id = row.getAttribute("data-id");

    if (state.bulkDeleteMode) {
      var isChecked = !state.checkedIds[id];
      toggleNodeCheck(id, isChecked);
      return;
    }

    state.selectedId = id;
    saveState();
    renderPresetTree();

    var node = findNode(id);
    if (node && node.type === "preset" && node.path && (e.shiftKey || e.ctrlKey || e.metaKey)) {
      applyPresetSmart(node.path, e.ctrlKey || e.metaKey ? "fromPlayhead" : "fitLayer");
    }
  }

  function nodeDblClick(e) {
    if (e.button && e.button !== 0) return;
    e.stopPropagation();
    var row = closestNode(e.target);
    if (!row) return;
    var id = row.getAttribute("data-id");
    var node = findNode(id);
    if (!node) return;

    if (node.type === "folder") {
      toggleFolder(id);
    } else if (node.type === "preset" && node.path) {
      if (e.shiftKey || e.ctrlKey || e.metaKey) {
        applyPresetSmart(node.path, e.ctrlKey || e.metaKey ? "fromPlayhead" : "fitLayer");
      } else {
        applyPresetNormal(node.path);
      }
    }
  }

  function applyPresetNormal(path) {
    runWithLayerRiskCheck("Preset Apply", "SORI_TOOLS.applyPreset(" + q(path) + ")");
  }

  function applyPresetSmart(path, mode) {
    var smartMode = mode === "fromPlayhead" ? "fromPlayhead" : "fitLayer";
    var smartKey = String(path || "") + "|" + smartMode;
    var now = Date.now();
    if (smartKey === presetSmartShortcutKey && now - presetSmartShortcutAt < 650) return;
    presetSmartShortcutKey = smartKey;
    presetSmartShortcutAt = now;

    callAeQuiet("SORI_TOOLS.smartPresetTargetList()", function (targets) {
      if (!targets || targets.ok === false) {
        toast("error", targets && targets.message ? targets.message : "Select layer(s) first.");
        return;
      }
      var layers = targets.data || [];
      if (layers.length > 1) {
        runSmartPresetBatch(path, smartMode, layers);
        return;
      }
      var payload = { path: path, mode: smartMode };
      callAe("SORI_TOOLS.applyPresetSmart(" + q(JSON.stringify(payload)) + ")");
    });
  }

  function runSmartPresetBatch(path, mode, layers) {
    if (smartPresetRun.active) {
      showSmartPresetProgress(smartPresetRun.current, smartPresetRun.total, smartPresetRun.name, true);
      return;
    }

    var selection = [];
    for (var i = 0; i < layers.length; i += 1) selection.push(layers[i].index);

    smartPresetRun.active = true;
    smartPresetRun.current = 0;
    smartPresetRun.total = layers.length;
    smartPresetRun.name = layers[0] ? layers[0].name : "";
    smartPresetRun.progressDismissed = false;
    showSmartPresetProgress(0, layers.length, "Preparing...", true);

    var done = 0;
    var failed = 0;
    var fitted = 0;

    function finish() {
      smartPresetRun.active = false;
      smartPresetRun.current = layers.length;
      smartPresetRun.name = "Done";
      showSmartPresetProgress(layers.length, layers.length, "Done", true);
      window.setTimeout(function () {
        if (typeof Swal !== "undefined" && Swal.close) Swal.close();
      }, 650);
      if (failed) toast("error", failed + " layer(s) failed while applying preset.");
      else toast("success", "Smart applied preset to " + done + " layers.");
      if (!fitted) toast("warning", "Preset applied, but no new keyframes were found to fit.");
    }

    function next(index) {
      if (index >= layers.length) {
        finish();
        return;
      }

      var layer = layers[index];
      smartPresetRun.current = index + 1;
      smartPresetRun.name = layer.name || ("Layer " + layer.index);
      showSmartPresetProgress(index + 1, layers.length, smartPresetRun.name);

      var payload = {
        path: path,
        mode: mode,
        layerIndex: layer.index,
        selection: selection
      };

      callAeQuiet("SORI_TOOLS.applyPresetSmartLayer(" + q(JSON.stringify(payload)) + ")", function (response) {
        if (response && response.ok) {
          done += 1;
          if (response.data && response.data.fitted) fitted += Number(response.data.fitted) || 0;
        } else {
          failed += 1;
        }
        window.setTimeout(function () { next(index + 1); }, 240);
      });
    }

    next(0);
  }

  function showSmartPresetProgress(current, total, name, forceOpen) {
    if (typeof Swal === "undefined" || !Swal.fire) return;
    if (!forceOpen && smartPresetRun.progressDismissed) return;

    var html = '<div class="proxy-progress-body">' +
      '<div>Applying ' + current + ' / ' + total + '</div>' +
      '<div class="proxy-progress-name">' + esc(name || "") + '</div>' +
      '</div>';

    var options = {
      title: "Applying Preset",
      html: html,
      showConfirmButton: true,
      confirmButtonText: "Hide",
      buttonsStyling: true,
      confirmButtonColor: "#7A43F5",
      customClass: {
        popup: "soritools-popup",
        confirmButton: "soritools-confirm"
      },
      showClass: { popup: "sori-swal-show", backdrop: "sori-swal-backdrop-show" },
      hideClass: { popup: "sori-swal-hide", backdrop: "sori-swal-backdrop-hide" },
      allowOutsideClick: true,
      allowEscapeKey: true,
      didOpen: function () {
        smartPresetRun.progressVisible = true;
      },
      willClose: function () {
        smartPresetRun.progressVisible = false;
        if (smartPresetRun.active) smartPresetRun.progressDismissed = true;
      }
    };

    if (smartPresetRun.progressVisible && Swal.update) {
      try {
        Swal.update({
          title: options.title,
          html: options.html,
          confirmButtonText: options.confirmButtonText,
          showConfirmButton: true
        });
        return;
      } catch (e) {}
    }

    Swal.fire(options).then(function () {
      if (smartPresetRun.active) smartPresetRun.progressDismissed = true;
    });
  }

  function selectPresetNode(id, restoreSearchFocus) {
    if (!id) return;
    state.selectedId = id;
    saveState();
    renderPresetTree();
    scrollSelectedPresetIntoView();
    if (restoreSearchFocus && els.presetSearch) els.presetSearch.focus();
  }

  function getVisiblePresetRows(type) {
    if (!els.presetList) return [];
    var selector = ".tree-node";
    if (type) selector += "[data-type=\"" + type + "\"]";
    var list = els.presetList.querySelectorAll(selector);
    var rows = [];
    for (var i = 0; i < list.length; i += 1) rows.push(list[i]);
    return rows;
  }

  function findVisiblePresetRowIndex(rows, id) {
    for (var i = 0; i < rows.length; i += 1) {
      if (rows[i].getAttribute("data-id") === id) return i;
    }
    return -1;
  }

  function scrollSelectedPresetIntoView() {
    if (!state.selectedId || !els.presetList) return;
    var row = els.presetList.querySelector("[data-id=\"" + state.selectedId + "\"]");
    if (!row) return;
    if (els.presetDropZone && row.getBoundingClientRect && els.presetDropZone.getBoundingClientRect) {
      var rowRect = row.getBoundingClientRect();
      var panelRect = els.presetDropZone.getBoundingClientRect();
      var padding = 6;
      if (rowRect.top < panelRect.top + padding) {
        els.presetDropZone.scrollTop -= (panelRect.top + padding) - rowRect.top;
        return;
      }
      if (rowRect.bottom > panelRect.bottom - padding) {
        els.presetDropZone.scrollTop += rowRect.bottom - (panelRect.bottom - padding);
        return;
      }
    }
    try {
      row.scrollIntoView({ block: "nearest" });
    } catch (error) {
      row.scrollIntoView(false);
    }
  }

  function movePresetKeyboardSelection(direction) {
    var rows = getVisiblePresetRows("");
    if (!rows.length) return;

    var current = findVisiblePresetRowIndex(rows, state.selectedId);
    var next = current + direction;
    if (current < 0) next = direction > 0 ? 0 : rows.length - 1;
    next = clamp(next, 0, rows.length - 1);
    selectPresetNode(rows[next].getAttribute("data-id"), document.activeElement === els.presetSearch);
  }

  function activatePresetKeyboardSelection(e) {
    var node = findNode(state.selectedId);
    var selectedVisible = findVisiblePresetRowIndex(getVisiblePresetRows(""), state.selectedId) >= 0;

    if (!node || !selectedVisible) {
      var presetRows = getVisiblePresetRows("preset");
      if (!presetRows.length) return;
      state.selectedId = presetRows[0].getAttribute("data-id");
      node = findNode(state.selectedId);
      saveState();
      renderPresetTree();
      scrollSelectedPresetIntoView();
    }

    if (!node) return;
    if (node.type === "folder") {
      toggleFolder(node.id);
    } else if (node.type === "preset" && node.path) {
      if (e && (e.shiftKey || e.ctrlKey || e.metaKey)) {
        applyPresetSmart(node.path, e.ctrlKey || e.metaKey ? "fromPlayhead" : "fitLayer");
      } else {
        applyPresetNormal(node.path);
      }
    }
  }

  function toggleFolder(id) {
    var node = findNode(id);
    if (!node || node.type !== "folder") return;
    node.expanded = !node.expanded;
    saveState();
    renderPresetTree();
  }

  function moveNode(id, direction) {
    var r = findNodeResult(state.presetTree, id);
    if (!r) return;
    var target = r.index + direction;
    if (target < 0 || target >= r.parent.length) return;
    var tmp = r.parent[r.index];
    r.parent[r.index] = r.parent[target];
    r.parent[target] = tmp;
    saveState();
    renderPresetTree();
  }

  function renameNodeStart(id) {
    var node = findNode(id);
    if (!node) return;

    // Find the row and replace name span with input
    var rows = els.presetList.querySelectorAll("[data-id=\"" + id + "\"]");
    if (!rows.length) return;
    var row = rows[0];
    var nameSpan = row.querySelector(".tree-node-name");
    if (!nameSpan) return;

    var input = document.createElement("input");
    input.type = "text";
    input.className = "tree-node-name-input";
    input.value = node.name;
    nameSpan.replaceWith(input);
    input.focus();
    input.select();

    function commit() {
      var newName = input.value.trim();
      if (newName && newName !== node.name) {
        if (node.type === "preset" && node.path) {
          callAeQuiet("SORI_TOOLS.renamePresetFile(" + q(JSON.stringify({ path: node.path, name: newName })) + ")", function (response) {
            if (response && response.ok && response.data && response.data.path) node.path = response.data.path;
            else if (response && response.ok === false && response.message) toast("warning", response.message);
            node.name = newName;
            saveState();
            renderPresetTree();
          });
          return;
        }
        node.name = newName;
        saveState();
      }
      renderPresetTree();
    }

    input.addEventListener("blur", commit);
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); input.blur(); }
      if (e.key === "Escape") { input.value = node.name; input.blur(); }
    });
  }

  // ── Drag & drop reorder ──

  function treeDragStart(e) {
    var row = closestNode(e.target);
    if (!row) return;
    treeDrag.srcId = row.getAttribute("data-id");
    treeDrag.mode = "reorder";
    e.dataTransfer.effectAllowed = "move";
    try { e.dataTransfer.setData("text/plain", treeDrag.srcId); } catch (err) {}
  }

  function treeDragOver(e) {
    // If this is an Explorer drag (files), let explorerDragOver handle it
    if (treeDrag.mode !== "reorder") return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";

    var row = closestNode(e.target);
    clearDropIndicators();
    if (!row) return;

    var targetId = row.getAttribute("data-id");
    if (targetId === treeDrag.srcId) return;

    var targetNode = findNode(targetId);
    var rect = row.getBoundingClientRect();
    var y = e.clientY - rect.top;

    if (targetNode && targetNode.type === "folder" && y > rect.height * 0.25 && y < rect.height * 0.75) {
      row.classList.add("drop-inside");
    } else if (y < rect.height / 2) {
      row.classList.add("drop-above");
    } else {
      row.classList.add("drop-below");
    }
  }

  function treeDragLeave(e) {
    var row = closestNode(e.target);
    if (row) {
      row.classList.remove("drop-above", "drop-below", "drop-inside");
    }
  }

  function treeDrop(e) {
    if (treeDrag.mode !== "reorder" || !treeDrag.srcId) return;
    e.preventDefault();
    e.stopPropagation();
    clearDropIndicators();

    var row = closestNode(e.target);
    if (!row) return;

    var targetId = row.getAttribute("data-id");
    if (targetId === treeDrag.srcId) return;

    var targetNode = findNode(targetId);
    var targetResult = findNodeResult(state.presetTree, targetId);
    if (!targetResult) return;

    var rect = row.getBoundingClientRect();
    var y = e.clientY - rect.top;

    // Remove source node
    var srcNode = removeNode(state.presetTree, treeDrag.srcId);
    if (!srcNode) return;

    // Determine drop position
    if (targetNode && targetNode.type === "folder" && y > rect.height * 0.25 && y < rect.height * 0.75) {
      // Drop inside folder
      if (!targetNode.children) targetNode.children = [];
      targetNode.children.push(srcNode);
      targetNode.expanded = true;
    } else {
      // Re-find target after removal (indices may have shifted)
      var newTargetResult = findNodeResult(state.presetTree, targetId);
      if (!newTargetResult) {
        // Target was removed (shouldn't happen), put src back at root
        state.presetTree.push(srcNode);
      } else if (y < rect.height / 2) {
        newTargetResult.parent.splice(newTargetResult.index, 0, srcNode);
      } else {
        newTargetResult.parent.splice(newTargetResult.index + 1, 0, srcNode);
      }
    }

    state.selectedId = srcNode.id;
    saveState();
    renderPresetTree();
  }

  function treeDragEnd() {
    treeDrag.srcId = null;
    treeDrag.mode = null;
    clearDropIndicators();
  }

  function clearDropIndicators() {
    var all = els.presetList.querySelectorAll(".drop-above, .drop-below, .drop-inside");
    for (var i = 0; i < all.length; i += 1) {
      all[i].classList.remove("drop-above", "drop-below", "drop-inside");
    }
  }

  // ── Explorer drag-drop ──

  function explorerDragOver(e) {
    // Only handle external file drags (not internal reorder)
    if (treeDrag.mode === "reorder") return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
    if (els.presetDropZone) els.presetDropZone.classList.add("is-drag-active");
  }

  function explorerDragLeave(e) {
    if (treeDrag.mode === "reorder") return;
    e.stopPropagation();
    if (els.presetDropZone) els.presetDropZone.classList.remove("is-drag-active");
  }

  function explorerDrop(e) {
    if (treeDrag.mode === "reorder") return;
    e.preventDefault();
    e.stopPropagation();
    if (els.presetDropZone) els.presetDropZone.classList.remove("is-drag-active");

    var files = e.dataTransfer && e.dataTransfer.files;
    if (!files || !files.length) return;

    var paths = [];
    for (var i = 0; i < files.length; i += 1) {
      var filePath = files[i].path || files[i].name || "";
      if (filePath) {
        paths.push(filePath);
      }
    }

    if (!paths.length) {
      toast("warning", "No valid items found.");
      return;
    }

    callAe("SORI_TOOLS.importDroppedItems(" + q(JSON.stringify(paths)) + ")", function (data) {
      if (data && data.ok && data.data && data.data.length) {
        var newNodes = data.data;
        assignIds(newNodes);
        for (var n = 0; n < newNodes.length; n += 1) {
          state.presetTree.push(newNodes[n]);
        }
        state.selectedId = newNodes[newNodes.length - 1].id;
        saveState();
        renderPresetTree();
      }
    });
  }

  // ── Smart Import Dropdown ──

  function openImportDropdown(e) {
    e.preventDefault();
    e.stopPropagation();

    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      runWithLayerRiskCheck("Save Preset", null, els.addPresetBtn, function () { saveSelectedAnimationPreset(); });
      return;
    }

    closeContextMenu(true);

    var menu = document.createElement("div");
    menu.className = "preset-menu";

    var html = "";
    html += '<button type="button" data-action="save-selected"><span>Save Selected Preset</span></button>';
    html += '<button type="button" data-action="import-files"><span>Import File(s)</span></button>';
    html += '<button type="button" data-action="import-folder"><span>Import Folder</span></button>';
    menu.innerHTML = html;

    menu.addEventListener("click", function (menuEvent) {
      var actionBtn = closestActionButton(menuEvent.target);
      if (!actionBtn) return;
      var action = actionBtn.getAttribute("data-action");
      closeContextMenu();

      if (action === "save-selected") {
        runWithLayerRiskCheck("Save Preset", null, els.addPresetBtn, function () { saveSelectedAnimationPreset(); });
      } else if (action === "import-files") {
        choosePresetFiles();
      } else if (action === "import-folder") {
        importFolder();
      }
    });

    document.body.appendChild(menu);

    // Position menu directly below the addPresetBtn
    var btnRect = els.addPresetBtn.getBoundingClientRect();
    var margin = 4;
    var x = btnRect.left;
    var y = btnRect.bottom + margin;

    var menuRect = menu.getBoundingClientRect();
    if (x + menuRect.width > window.innerWidth) {
      x = window.innerWidth - menuRect.width - 8;
    }
    if (y + menuRect.height > window.innerHeight) {
      y = btnRect.top - menuRect.height - margin;
    }

    menu.style.left = x + "px";
    menu.style.top = y + "px";

    window.setTimeout(function () {
      document.addEventListener("mousedown", closeContextMenuOnce);
      document.addEventListener("keydown", closeContextMenuOnEscape);
    }, 0);
  }

  // ── Custom Right-Click Context Menu ──

  function openContextMenu(e, id) {
    e.preventDefault();
    e.stopPropagation();

    if (state.bulkDeleteMode) {
      openBulkContextMenu(e);
      return;
    }

    state.selectedId = id;
    renderPresetTree();

    closeContextMenu(true);

    var node = findNode(id);
    if (!node) return;

    var menu = document.createElement("div");
    menu.className = "preset-menu";

    var html = "";
    if (node.type === "preset" && node.path) {
      html += '<button type="button" data-action="apply-normal"><span>Apply Normal</span></button>';
      html += '<button type="button" data-action="smart-fit"><span>Smart Fit Layer</span></button>';
      html += '<button type="button" data-action="smart-playhead"><span>Smart From Playhead</span></button>';
      html += '<button type="button" data-action="reveal"><span>Reveal File</span></button>';
    }
    html += '<button type="button" data-action="rename"><span>Rename</span></button>';
    html += '<button type="button" data-action="delete" class="danger"><span>Delete</span></button>';
    menu.innerHTML = html;

    menu.addEventListener("click", function (menuEvent) {
      var actionBtn = closestActionButton(menuEvent.target);
      if (!actionBtn) return;
      var action = actionBtn.getAttribute("data-action");
      closeContextMenu();

      if (action === "apply-normal" && node.type === "preset" && node.path) {
        applyPresetNormal(node.path);
      } else if (action === "smart-fit" && node.type === "preset" && node.path) {
        applyPresetSmart(node.path, "fitLayer");
      } else if (action === "smart-playhead" && node.type === "preset" && node.path) {
        applyPresetSmart(node.path, "fromPlayhead");
      } else if (action === "reveal" && node.type === "preset" && node.path) {
        callAe("SORI_TOOLS.revealPresetFile(" + q(node.path) + ")");
      } else if (action === "rename") {
        renameNodeStart(id);
      } else if (action === "delete") {
        deleteSelected();
      }
    });

    document.body.appendChild(menu);
    positionMenu(menu, e);

    window.setTimeout(function () {
      document.addEventListener("mousedown", closeContextMenuOnce);
      document.addEventListener("keydown", closeContextMenuOnEscape);
    }, 0);
  }

  function positionMenu(menu, event) {
    var margin = 8;
    var rect = menu.getBoundingClientRect();
    var x = event.clientX || margin;
    var y = event.clientY || margin;

    if (x + rect.width > window.innerWidth - margin) {
      x -= rect.width;
    }
    if (y + rect.height > window.innerHeight - margin) {
      y -= rect.height;
    }

    x = clamp(x, margin, Math.max(margin, window.innerWidth - rect.width - margin));
    y = clamp(y, margin, Math.max(margin, window.innerHeight - rect.height - margin));

    menu.style.left = x + "px";
    menu.style.top = y + "px";
  }

  function closeContextMenuOnce(event) {
    var menu = document.querySelector(".preset-menu");
    if (menu && event && menu.contains(event.target)) {
      return;
    }
    closeContextMenu();
  }

  function closeContextMenuOnEscape(event) {
    if (event.key === "Escape") {
      closeContextMenu();
    }
  }

  function closeContextMenu(immediate) {
    var menu = document.querySelector(".preset-menu:not(.aep-context-menu)");
    if (menu && menu.parentNode) {
      if (immediate) {
        menu.parentNode.removeChild(menu);
      } else {
        menu.classList.add("is-closing");
        window.setTimeout(function () {
          if (menu.parentNode) menu.parentNode.removeChild(menu);
        }, 120);
      }
    }
    document.removeEventListener("mousedown", closeContextMenuOnce);
    document.removeEventListener("keydown", closeContextMenuOnEscape);
  }

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function sanitizeTimelineInput() {
    var n = parseInt(this.value, 10);
    if (!isFinite(n) || n < 0) n = 0;
    this.value = String(n);
  }

  function handleInputKeys(e) {
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      var val = parseFloat(this.value);
      if (isNaN(val)) val = 1;
      var increment = e.shiftKey ? 10 : 1;
      if (e.key === "ArrowUp") {
        this.value = String(val + increment);
      } else {
        var minAttr = this.getAttribute("min");
        var min = minAttr !== null ? parseFloat(minAttr) : -Infinity;
        var newVal = val - increment;
        if (newVal < min) newVal = min;
        this.value = String(newVal);
      }
      this.dispatchEvent(new Event("change"));
    }
  }

  function handlePresetSearchInput() {
    var value = els.presetSearch ? els.presetSearch.value : "";
    if (value === presetSearchInputValue) return;
    presetSearchInputValue = value;
    state.searchQuery = normalizeSearch(value);
    state.searchBusy = !!state.searchQuery;
    syncPresetSearchUi();
    if (presetSearchTimer) window.clearTimeout(presetSearchTimer);
    if (!state.searchQuery) {
      state.searchBusy = false;
      presetSearchTimer = 0;
      syncPresetSearchUi();
      renderPresetTree();
      return;
    }
    presetSearchTimer = window.setTimeout(function () {
      state.searchQuery = normalizeSearch(els.presetSearch ? els.presetSearch.value : value);
      state.searchBusy = false;
      presetSearchTimer = 0;
      renderPresetTree();
    }, 120);
  }

  function handlePresetSearchKeys(e) {
    if (handlePresetKeyboardShortcut(e)) return;

    if (e.key === "Escape" && (state.searchQuery || (els.presetSearch && els.presetSearch.value))) {
      e.preventDefault();
      clearPresetSearch();
    }
  }

  function handlePresetListKeys(e) {
    if (e.target && e.target.className === "tree-node-name-input") return;
    handlePresetKeyboardShortcut(e);
  }

  function handlePresetKeyboardShortcut(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      movePresetKeyboardSelection(1);
      return true;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      movePresetKeyboardSelection(-1);
      return true;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      activatePresetKeyboardSelection(e);
      return true;
    }
    return false;
  }

  function clearPresetSearch() {
    if (presetSearchTimer) window.clearTimeout(presetSearchTimer);
    presetSearchTimer = 0;
    state.searchQuery = "";
    state.searchBusy = false;
    presetSearchInputValue = "";
    if (els.presetSearch) {
      els.presetSearch.value = "";
      els.presetSearch.focus();
    }
    renderPresetTree();
  }

  function toggleBulkDeleteMode() {
    state.bulkDeleteMode = !state.bulkDeleteMode;
    state.checkedIds = {};
    if (els.bulkDeleteModeBtn) {
      els.bulkDeleteModeBtn.classList.toggle("active", state.bulkDeleteMode);
    }
    renderPresetTree();
  }

  function toggleNodeCheck(id, checked) {
    state.checkedIds[id] = checked;
    var node = findNode(id);
    if (node && node.children) {
      checkAllChildren(node.children, checked);
    }
    renderPresetTree();
  }

  function checkAllChildren(children, checked) {
    for (var i = 0; i < children.length; i += 1) {
      state.checkedIds[children[i].id] = checked;
      if (children[i].children) {
        checkAllChildren(children[i].children, checked);
      }
    }
  }

  function openBulkContextMenu(e) {
    closeContextMenu(true);

    var checkedCount = 0;
    for (var k in state.checkedIds) {
      if (state.checkedIds[k]) checkedCount += 1;
    }

    var menu = document.createElement("div");
    menu.className = "preset-menu";

    var html = "";
    html += '<button type="button" data-action="delete-checked" ' + (checkedCount === 0 ? "disabled" : "") + '><span>Delete Checked (' + checkedCount + ')</span></button>';
    html += '<button type="button" data-action="clear-checked"><span>Clear Selection</span></button>';
    menu.innerHTML = html;

    menu.addEventListener("click", function (menuEvent) {
      var actionBtn = closestActionButton(menuEvent.target);
      if (!actionBtn) return;
      var action = actionBtn.getAttribute("data-action");
      closeContextMenu();

      if (action === "delete-checked") {
        deleteCheckedItems();
      } else if (action === "clear-checked") {
        state.checkedIds = {};
        renderPresetTree();
      }
    });

    document.body.appendChild(menu);
    positionMenu(menu, e);

    window.setTimeout(function () {
      document.addEventListener("mousedown", closeContextMenuOnce);
      document.addEventListener("keydown", closeContextMenuOnEscape);
    }, 0);
  }

  function deletePresetFiles(paths, done) {
    var index = 0;
    var failed = [];
    function next() {
      if (index >= paths.length) {
        if (done) done(failed);
        return;
      }
      var path = paths[index];
      index += 1;
      callAeQuiet("SORI_TOOLS.deletePresetFile(" + q(path) + ")", function (response) {
        if (!response || !response.ok) failed.push(path);
        next();
      });
    }
    next();
  }

  function presetPathsFromNode(node) {
    var paths = [];
    if (!node) return paths;
    if (node.type === "preset" && node.path) paths.push(node.path);
    if (node.type === "folder") {
      var allPresets = flattenPresets([node]);
      for (var i = 0; i < allPresets.length; i += 1) {
        if (allPresets[i].path) paths.push(allPresets[i].path);
      }
    }
    return paths;
  }

  function deleteCheckedItems() {
    var checkedIdsList = [];
    for (var k in state.checkedIds) {
      if (state.checkedIds[k]) checkedIdsList.push(k);
    }
    if (!checkedIdsList.length) return;

    popup({
      title: "Delete checked items?",
      text: "This will delete " + checkedIdsList.length + " item(s) and their physical files permanently.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel"
    }).then(function (result) {
      if (!result.isConfirmed) return;

      var paths = [];
      for (var i = 0; i < checkedIdsList.length; i += 1) {
        var node = findNode(checkedIdsList[i]);
        var nodePaths = presetPathsFromNode(node);
        for (var p = 0; p < nodePaths.length; p += 1) paths.push(nodePaths[p]);
      }

      deletePresetFiles(paths, function (failed) {
        if (failed.length) {
          toast("error", "Could not delete " + failed.length + " preset file(s). List unchanged.");
          return;
        }
        for (var i = 0; i < checkedIdsList.length; i += 1) {
          removeNode(state.presetTree, checkedIdsList[i]);
        }
        state.checkedIds = {};
        state.bulkDeleteMode = false;
        if (els.bulkDeleteModeBtn) els.bulkDeleteModeBtn.classList.remove("active");
        saveState();
        renderPresetTree();
        toast("success", "Deleted " + checkedIdsList.length + " item(s).");
      });
    });
  }

  function popup(options) {
    options = options || {};
    var customClass = {
      popup: "soritools-popup" + (options.showDenyButton ? " soritools-popup-choice" : ""),
      confirmButton: "soritools-confirm",
      denyButton: "soritools-deny",
      cancelButton: "soritools-cancel"
    };
    if (options.customClass) {
      for (var classKey in options.customClass) {
        if (options.customClass.hasOwnProperty(classKey)) {
          customClass[classKey] = customClass[classKey] ? customClass[classKey] + " " + options.customClass[classKey] : options.customClass[classKey];
        }
      }
    }

    var merged = {
      customClass: {
        popup: customClass.popup,
        confirmButton: customClass.confirmButton,
        denyButton: customClass.denyButton,
        cancelButton: customClass.cancelButton
      },
      buttonsStyling: true,
      confirmButtonColor: "#7A43F5",
      denyButtonColor: "#9B6DFF",
      cancelButtonColor: "#2d2d2d",
      showClass: {
        popup: "sori-swal-show",
        backdrop: "sori-swal-backdrop-show"
      },
      hideClass: {
        popup: "sori-swal-hide",
        backdrop: "sori-swal-backdrop-hide"
      }
    };
    for (var mergeKey in options) {
      if (options.hasOwnProperty(mergeKey)) merged[mergeKey] = options[mergeKey];
    }
    merged.customClass = customClass;

    try {
      if (typeof Swal !== "undefined" && Swal.fire) {
        var result = Swal.fire(merged);
        if (result && typeof result.then === "function") return result;
      }
    } catch (error) {}

    return fallbackPopup(merged);
  }

  function fallbackPopup(options) {
    options = options || {};
    var title = options.title || "";
    var text = options.text || options.html || "";
    if (/<[a-z][\s\S]*>/i.test(String(text))) {
      text = String(text).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    }
    var message = title + (text ? "\n" + text : "");
    var result = false;

    if (options.showDenyButton) {
      result = window.confirm(message + "\n\nOK = " + (options.confirmButtonText || "Confirm") + "\nCancel = more options");
      if (result) {
        return { then: function (callback) { callback({ isConfirmed: true, isDenied: false, isDismissed: false }); } };
      }
      result = window.confirm((options.denyButtonText || "Deny") + "?");
      return { then: function (callback) { callback({ isConfirmed: false, isDenied: result, isDismissed: !result }); } };
    }

    if (options.showCancelButton) {
      result = window.confirm(message);
      return { then: function (callback) { callback({ isConfirmed: result, isDenied: false, isDismissed: !result }); } };
    }

    if (message) window.alert(message);
    return { then: function (callback) { if (callback) callback({ isConfirmed: true, isDenied: false, isDismissed: false }); } };
  }

  // ── Import files ──

  function normalizedPath(path) {
    return String(path || "").replace(/\\/g, "/").toLowerCase();
  }

  function addImportedPresetNodes(nodes) {
    if (!nodes || !nodes.length) return;
    var existing = {};
    var all = flattenPresets(state.presetTree);
    for (var i = 0; i < all.length; i += 1) existing[normalizedPath(all[i].path)] = true;
    var added = [];
    assignIds(nodes);
    for (var n = 0; n < nodes.length; n += 1) {
      var key = normalizedPath(nodes[n].path);
      if (key && existing[key]) continue;
      if (key) existing[key] = true;
      state.presetTree.push(nodes[n]);
      added.push(nodes[n]);
    }
    if (!added.length) return;
    state.selectedId = added[added.length - 1].id;
    saveState();
    renderPresetTree();
  }

  function saveSelectedAnimationPreset(autoSelect) {
    callAe("SORI_TOOLS.saveSelectedAnimationPresetWithImport(" + (autoSelect ? "true" : "false") + ")", function (data) {
      if (data && data.ok && data.data && data.data.length) {
        addImportedPresetNodes(data.data);
      }
    }, els.savePresetBtn || els.addPresetBtn);
  }

  function choosePresetFiles() {
    if (window.__adobe_cep__ && window.__adobe_cep__.evalScript) {
      callAe("SORI_TOOLS.importPresetFilesWithCopy()", function (data) {
        if (data && data.ok && data.data && data.data.length) {
          addImportedPresetNodes(data.data);
        }
      });
      return;
    }
    // Fallback for non-CEP environment
    els.presetFile.click();
  }

  function importPresetFilesLegacy() {
    var files = els.presetFile.files || [];
    var newNodes = [];
    for (var i = 0; i < files.length; i += 1) {
      var file = files[i];
      var path = file.path || file.name;
      if (!path) continue;
      var name = file.name.replace(/\.ffx$/i, "");
      newNodes.push({ id: uid(), type: "preset", name: name, path: path });
    }
    if (newNodes.length) {
      for (var n = 0; n < newNodes.length; n += 1) {
        state.presetTree.push(newNodes[n]);
      }
      state.selectedId = newNodes[newNodes.length - 1].id;
      saveState();
      renderPresetTree();
    }
    els.presetFile.value = "";
  }

  // ── Import folder ──

  function importFolder() {
    callAe("SORI_TOOLS.importPresetFolder()", function (data) {
      if (data && data.ok && data.data) {
        var folderNode = data.data;
        folderNode.id = uid();
        folderNode.expanded = true;
        assignIds(folderNode.children || []);
        state.presetTree.push(folderNode);
        state.selectedId = folderNode.id;
        saveState();
        renderPresetTree();
      }
    });
  }

  // ── Create new folder ──

  function createNewFolder() {
    var newFolder = {
      id: uid(),
      type: "folder",
      name: "New Folder",
      expanded: true,
      children: []
    };

    // If a folder is selected, add inside it; otherwise add to root
    var selectedNode = findNode(state.selectedId);
    if (selectedNode && selectedNode.type === "folder") {
      if (!selectedNode.children) selectedNode.children = [];
      selectedNode.children.push(newFolder);
      selectedNode.expanded = true;
    } else {
      state.presetTree.push(newFolder);
    }

    state.selectedId = newFolder.id;
    saveState();
    renderPresetTree();

    // Start rename immediately
    setTimeout(function () {
      renameNodeStart(newFolder.id);
    }, 50);
  }

  // ── Delete ──

  function deleteSelected() {
    if (!state.selectedId) {
      toast("warning", "No preset selected.");
      return;
    }
    var node = findNode(state.selectedId);
    if (!node) return;

    var title = node.type === "folder" ? "Delete folder?" : "Delete preset?";
    var text = node.name;
    if (node.type === "folder" && node.children && node.children.length) {
      text += " (" + node.children.length + " items inside)";
    }

    popup({
      title: title,
      text: text,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel"
    }).then(function (result) {
      if (!result.isConfirmed) return;

      var deleteId = state.selectedId;
      var paths = presetPathsFromNode(node);
      deletePresetFiles(paths, function (failed) {
        if (failed.length) {
          toast("error", "Could not delete preset file. List unchanged.");
          return;
        }
        removeNode(state.presetTree, deleteId);
        state.selectedId = state.presetTree.length ? state.presetTree[0].id : "";
        saveState();
        renderPresetTree();
        toast("success", "Deleted.");
      });
    });
  }

  // ── Export ──

  function exportPresets() {
    if (!state.presetTree || !state.presetTree.length) {
      toast("warning", "No presets to export.");
      return;
    }

    popup({
      title: "Export Presets",
      text: "Enter folder name for exported presets:",
      input: "text",
      inputPlaceholder: "Enter folder name (e.g., Preset Minju)",
      inputValue: "",
      showCancelButton: true,
      confirmButtonText: "Export",
      cancelButtonText: "Cancel",
      inputValidator: function (value) {
        if (!value || !value.trim()) {
          return "Folder name cannot be empty!";
        }
      }
    }).then(function (result) {
      if (!result || !result.isConfirmed) return;
      var folderName = result.value ? result.value.trim() : "";
      if (!folderName) return;

      var payload = {
        folderName: folderName,
        tree: state.presetTree
      };
      callAe("SORI_TOOLS.exportPresetsTree(" + q(JSON.stringify(payload)) + ")");
    });
  }

  function runTopazFlowBusy(work) {
    if (topazRun.busy) return false;
    topazRun.busy = true;
    try {
      work(function () {
        topazRun.busy = false;
      });
    } catch (error) {
      topazRun.busy = false;
      throw error;
    }
    return true;
  }

  function topazFlowExport() {
    runTopazFlowBusy(function (done) {
      stopTopazOutputWatcher();
      callAe("SORI_TOOLS.renderTopazSelected()", function (response) {
        done();
        if (response && response.ok && response.data) {
          clearTopazFlowImported(response.data);
          openTopazFlowFolders(response.data);
          startTopazOutputWatcher(response.data);
        }
      }, els.topazFlowBtn);
    });
  }

  function topazFlowImport() {
    runTopazFlowBusy(function (done) {
      stopTopazOutputWatcher();
      callAe("SORI_TOOLS.importTopazOutputSafe()", function () {
        done();
      }, els.topazFlowBtn);
    });
  }

  function openTopazFlowOptions() {
    popup({
      title: "Topaz Flow",
      html: '<div class="boost-options"><button data-topaz-action="import">Import OUT<br><span>Safe replace finished Topaz outputs</span></button><button data-topaz-action="reveal">Reveal Folder<br><span>Open IN / OUT working folder</span></button><button data-topaz-action="clean">Clean IN<br><span>Remove temporary AE renders only</span></button></div>',
      showConfirmButton: false,
      showDenyButton: false,
      showCancelButton: true,
      cancelButtonText: "Close",
      customClass: { popup: "soritools-boost-options-popup soritools-topaz-options-popup" },
      didOpen: function (popupEl) {
        var buttons = popupEl.querySelectorAll("[data-topaz-action]");
        for (var i = 0; i < buttons.length; i += 1) {
          buttons[i].onclick = function () {
            var action = this.getAttribute("data-topaz-action") || "";
            if (typeof Swal !== "undefined" && Swal.close) Swal.close();
            if (action === "import") {
              topazFlowImport();
            } else if (action === "reveal") {
              callAe("SORI_TOOLS.revealTopazFolder()", function (response) {
                if (response && response.ok && response.data) openTopazFolderPath(response.data.root || response.data.input);
              }, els.topazFlowBtn);
            } else if (action === "clean") {
              callAe("SORI_TOOLS.cleanTopazInput()", null, els.topazFlowBtn);
            }
          };
        }
      }
    });
  }

  function openTopazFlowMoreOptions() {
    popup({
      title: "Topaz Flow More",
      text: "Clean temporary AE renders in IN folder? OUT files stay safe.",
      showCancelButton: true,
      confirmButtonText: "Clean IN",
      cancelButtonText: "Cancel"
    }).then(function (result) {
      if (result && result.isConfirmed) callAe("SORI_TOOLS.cleanTopazInput()", null, els.topazFlowBtn);
    });
  }

  function openTopazFolderPath(path) {
    var nodeRequire = getNodeRequire();
    if (!nodeRequire || !path) return;
    try {
      var childProcess = nodeRequire("child_process");
      childProcess.spawn("explorer.exe", [path], { detached: true, stdio: "ignore" }).unref();
    } catch (error) {}
  }

  function openTopazFlowFolders(data) {
    var nodeRequire = getNodeRequire();
    if (!nodeRequire) return;
    try {
      var childProcess = nodeRequire("child_process");
      var topazPath = "C:\\Program Files\\Topaz Labs LLC\\Topaz Video AI\\Topaz Video AI.exe";
      var args = [];
      if (data && data.jobs) {
        for (var i = 0; i < data.jobs.length; i += 1) {
          if (data.jobs[i] && data.jobs[i].inputPath) args.push(data.jobs[i].inputPath);
        }
      }
      childProcess.spawn(topazPath, args, { detached: true, stdio: "ignore" }).unref();
    } catch (error) {}
  }

  function showTopazExportGuide(data) {
    if (!data || !data.output) return;
    popup({
      title: "Topaz Flow Watching OUT",
      html: '<div style="text-align:left;font-size:12px;line-height:1.6">Topaz files imported. Best: set Topaz export folder to:<br><br><code style="word-break:break-all">' + esc(data.output) + '</code><br><br>SoriTools watches OUT and IN, then auto-imports when exported files appear.</div>',
      showCancelButton: true,
      confirmButtonText: "OK",
      cancelButtonText: "Stop Watch"
    }).then(function (result) {
      if (result && result.dismiss === "cancel") stopTopazOutputWatcher();
    });
  }

  function startTopazResumeLoop() {
    if (topazRun.resumeTimer) return;
    topazRun.resumeTimer = window.setInterval(function () {
      if (!topazRun.watchTimer) resumeTopazOutputWatcher();
    }, 4000);
  }

  function resumeTopazOutputWatcher() {
    callAeQuiet("SORI_TOOLS.getTopazFlowMeta()", function (response) {
      if (response && response.ok && response.data && response.data.jobs && response.data.jobs.length && !isTopazFlowImported(response.data)) startTopazOutputWatcher(response.data, true);
    });
  }

  function startTopazOutputWatcher(data, silent) {
    var nodeRequire = getNodeRequire();
    if (!nodeRequire || !data || !data.output || !data.jobs || !data.jobs.length) return;
    if (topazRun.watchTimer) window.clearInterval(topazRun.watchTimer);
    topazRun.data = data;
    topazRun.startedAt = Date.now();
    topazRun.notified = silent === true;
    topazRun.outputStats = {};
    topazRun.importing = false;
    topazRun.importedReady = 0;
    checkTopazOutputReady();
    topazRun.watchTimer = window.setInterval(checkTopazOutputReady, 3000);
  }

  function stopTopazOutputWatcher() {
    if (topazRun.watchTimer) window.clearInterval(topazRun.watchTimer);
    topazRun.watchTimer = 0;
    topazRun.data = null;
    topazRun.startedAt = 0;
    topazRun.notified = false;
    topazRun.outputStats = {};
    topazRun.importing = false;
    topazRun.importedReady = 0;
  }

  function checkTopazOutputReady() {
    var nodeRequire = getNodeRequire();
    var data = topazRun.data;
    if (!nodeRequire || !data || !data.output || !data.jobs) {
      stopTopazOutputWatcher();
      return;
    }
    if (Date.now() - topazRun.startedAt > 6 * 60 * 60 * 1000) {
      stopTopazOutputWatcher();
      toast("error", "Topaz Flow watcher timed out.");
      return;
    }
    try {
      var fs = nodeRequire("fs");
      var outputFiles = fs.existsSync(data.output) ? fs.readdirSync(data.output) : [];
      var inputFiles = fs.existsSync(data.input) ? fs.readdirSync(data.input) : [];
      var ready = 0;
      for (var i = 0; i < data.jobs.length; i += 1) {
        if (topazOutputFileExists(fs, data.output, outputFiles, data.jobs[i], false) || topazOutputFileExists(fs, data.input, inputFiles, data.jobs[i], true)) ready += 1;
      }
      if (ready > topazRun.importedReady && !topazRun.importing) {
        topazRun.importing = true;
        callAeQuiet("SORI_TOOLS.importTopazOutputSafe()", function (response) {
          topazRun.importing = false;
          if (response && response.ok) topazRun.importedReady = ready;
          if (response && response.ok && response.data && Number(response.data.missing || 0) <= 0) {
            markTopazFlowImported(data);
            stopTopazOutputWatcher();
            toast("success", response.message || "Topaz clips imported.");
          } else if (response && response.ok && !topazRun.notified) {
            topazRun.notified = true;
          }
        });
      }
    } catch (error) {}
  }

  function topazFlowImportKey(data) {
    var parts = [data && data.root ? data.root : ""];
    if (data && data.jobs) {
      for (var i = 0; i < data.jobs.length; i += 1) parts.push(data.jobs[i] && data.jobs[i].stem ? data.jobs[i].stem : "");
    }
    return "sori.tools.topaz.imported." + parts.join("|");
  }

  function isTopazFlowImported(data) {
    try { return localStorage.getItem(topazFlowImportKey(data)) === "1"; } catch (error) {}
    return false;
  }

  function markTopazFlowImported(data) {
    try { localStorage.setItem(topazFlowImportKey(data), "1"); } catch (error) {}
  }

  function clearTopazFlowImported(data) {
    try { localStorage.removeItem(topazFlowImportKey(data)); } catch (error) {}
  }

  function topazOutputFileExists(fs, folderPath, files, job, allowInputFolder) {
    var lowerStem = String(job && job.stem || "").toLowerCase();
    var exts = [".mov", ".mp4", ".avi", ".mkv"];
    for (var i = 0; i < files.length; i += 1) {
      var rawName = String(files[i] || "");
      var name = rawName.toLowerCase();
      if (topazOutputNameIsTemporary(name)) continue;
      for (var e = 0; e < exts.length; e += 1) {
        if (name.indexOf(lowerStem) !== 0 || name.lastIndexOf(exts[e]) !== name.length - exts[e].length) continue;
        try {
          var filePath = folderPath + "\\" + rawName;
          var fileStat = fs.statSync(filePath);
          if (allowInputFolder && job && job.inputPath && normalizePath(filePath) === normalizePath(job.inputPath)) {
            var inputStat = fs.statSync(job.inputPath);
            if (fileStat.mtime.getTime() <= inputStat.mtime.getTime()) continue;
          }
          if (topazOutputFileStable(filePath, fileStat)) return true;
        } catch (error) {}
      }
    }
    return false;
  }

  function topazOutputNameIsTemporary(name) {
    return /(^|[_\-.])temp\./i.test(name) || /[_\-.]temp\./i.test(name) || /\.tmp$/i.test(name) || /\.part$/i.test(name) || /\.crdownload$/i.test(name);
  }

  function topazOutputFileStable(filePath, stat) {
    var key = normalizePath(filePath);
    var prev = topazRun.outputStats[key];
    var now = Date.now();
    var size = Number(stat && stat.size || 0);
    var mtime = stat && stat.mtime ? stat.mtime.getTime() : 0;
    topazRun.outputStats[key] = { size: size, mtime: mtime, checkedAt: now };
    return !!(size > 0 && prev && prev.size === size && prev.mtime === mtime && now - mtime > 2000);
  }

  function normalizePath(path) {
    return String(path || "").replace(/\\/g, "/").toLowerCase();
  }

  // ── Helpers for DOM traversal ──

  function closestNode(el) {
    while (el && el !== document) {
      if (el.classList && el.classList.contains("tree-node")) return el;
      el = el.parentNode;
    }
    return null;
  }

  /* ───────────────────────────────────────────────────────────────────
     CORE SERVICES (preserved from original)
     ─────────────────────────────────────────────────────────────────── */

  function callAe(script, callback, triggerBtn) {
    pulse(true);
    if (triggerBtn) {
      triggerBtn.classList.add("is-loading");
    }
    cs.evalScript(wrapAeScript(script), function (response) {
      pulse(false);
      if (triggerBtn) {
        triggerBtn.classList.remove("is-loading");
      }
      try {
        var data = JSON.parse(response || "{}");
        if (callback) callback(data);
        if (data.ok === false && data.message) {
          logAeError(script, data.message, response);
          toast("error", data.message);
        } else if (data.ok && data.message) {
          toast("success", data.message);
        }
      } catch (error) {
        logAeError(script, String(response || "No response from After Effects."), response);
        toast("error", String(response || "No response from After Effects."));
      }
    });
  }

  function callAeQuiet(script, callback) {
    pulse(true);
    cs.evalScript(wrapAeScript(script), function (response) {
      pulse(false);
      var data = null;
      try {
        data = JSON.parse(response || "{}");
      } catch (error) {
        data = { ok: false, message: String(response || "No response from After Effects.") };
        logAeError(script, data.message, response);
      }
      if (data && data.ok === false) logAeError(script, data.message || "AE error", response);
      if (callback) callback(data);
    });
  }

  function loadJsx(silent) {
    resolveJsxPath();
    var script = [
      "(function () {",
      "  try {",
      "    if (typeof SORI_TOOLS != 'undefined' && SORI_TOOLS.respond) return 'ok';",
      "    return 'missing';",
      "  } catch (e) {",
      "    var line = e && e.line ? (' line ' + e.line) : '';",
      "    return 'error' + line + ': ' + (e && e.message ? e.message : e);",
      "  }",
      "})()"
    ].join("\n");

    cs.evalScript(script, function (response) {
      runtime.jsxLoaded = response === "ok";
      if (!runtime.jsxLoaded && !silent) {
        toast("error", "Could not load SoriTools logic from manifest ScriptPath: " + String(response || "unknown error"));
      }
      if (runtime.jsxLoaded) {
        syncBoostRestoreState();
        resumeTopazOutputWatcher();
        startTopazResumeLoop();
      }
    });
  }

  function syncBoostRestoreState() {
    callAeQuiet("SORI_TOOLS.hasBoostRestoreState()", function (response) {
      if (response && response.ok && response.data) {
        boostRun.active = response.data.active === true;
        boostRun.loading = false;
        renderBoostButtonState();
      }
    });
  }

  function resolveJsxPath() {
    if (runtime.jsxPath) return runtime.jsxPath;

    var extensionPath = "";
    try {
      extensionPath = cs.getSystemPath("extension") || "";
    } catch (error) {}

    if (!extensionPath && window.location && window.location.pathname) {
      var path = decodeURI(window.location.pathname);
      if (/^\/[A-Za-z]:\//.test(path)) path = path.substring(1);
      path = path.replace(/\\/g, "/");
      extensionPath = path.replace(/\/panel\/index\.html(?:[?#].*)?$/i, "");
    }

    if (!extensionPath) return "";
    runtime.jsxPath = extensionPath.replace(/\\/g, "/").replace(/\/$/, "") + "/panel/jsx/main.jsx";
    return runtime.jsxPath;
  }

  function wrapAeScript(script) {
    resolveJsxPath();
    var extensionRoot = runtime.jsxPath ? runtime.jsxPath.replace(/\/panel\/jsx\/main\.jsx$/i, "") : "";
    return [
      "(function () {",
      "  function esc(value) {",
      "    return String(value).split('\\\\').join('\\\\\\\\').split('\"').join('\\\\\"').replace(/\\r/g, '\\\\r').replace(/\\n/g, '\\\\n');",
      "  }",
      "  function fail(message) {",
      "    return '{\"ok\":false,\"message\":\"' + esc(message) + '\",\"data\":null}';",
      "  }",
      "  try {",
      "    if (typeof SORI_TOOLS != 'undefined') SORI_TOOLS.cepExtensionRoot = " + q(extensionRoot) + ";",
      "",
      "    if (typeof SORI_TOOLS == 'undefined') return fail('SoriTools logic is not loaded. Reopen the panel or reinstall the extension.');",
      "    var result = " + script + ";",
      "    if (typeof result == 'undefined') return '{\"ok\":true,\"message\":\"Done.\",\"data\":null}';",
      "    return result;",
      "  } catch (e) {",
      "    var line = e && e.line ? (' line ' + e.line + ': ') : '';",
      "    var file = e && e.fileName ? (' file ' + e.fileName + ':') : '';",
      "    var message = 'After Effects error:' + file + line + (e && e.message ? e.message : e);",
      "    try {",
      "      var logFile = new File(Folder.userData.fsName + '/sori-tools-ae-error-log.txt');",
      "      logFile.encoding = 'UTF-8';",
      "      if (logFile.open('a')) {",
      "        logFile.writeln('[' + String(new Date()) + ']');",
      "        logFile.writeln('message=' + message);",
      "        logFile.writeln('script=' + " + q(script) + ");",
      "        logFile.writeln('---');",
      "        logFile.close();",
      "      }",
      "    } catch (logError) {}",
      "    return fail(message);",
      "  }",
      "})()"
    ].join("\n");
  }

  function toggleBoostButtonState(event) {
    if (boostRun.loading) return;
    if (event && event.shiftKey) {
      runBoostAction(true, true, true);
      return;
    }
    runBoostAction(!boostRun.active, false);
  }

  function openBoostOptions(event) {
    if (event) event.preventDefault();
    if (boostRun.loading) return;
    if (event && event.shiftKey) {
      runBoostAction(true, true, true);
      return;
    }
    popup({
      title: "Boost Mode",
      html: '<div class="boost-options"><button data-boost-profile="safe">Safe Daily<br><span>Light preview, safest restore</span></button><button data-boost-profile="strong">Strong Preview<br><span>Recommended daily speed</span></button><button data-boost-profile="max">Max Heavy<br><span>Selected work area + aggressive preview</span></button><button data-boost-diagnostics="true">Diagnostics<br><span>Check active boost state</span></button></div>',
      showConfirmButton: boostRun.active,
      confirmButtonText: "Refresh",
      showDenyButton: false,
      showCancelButton: true,
      cancelButtonText: "Close",
      customClass: { popup: "soritools-boost-options-popup" + (boostRun.active ? " soritools-boost-options-active" : "") },
      didOpen: function (popupEl) {
        var denyButton = popupEl.querySelector(".swal2-deny");
        if (denyButton && denyButton.parentNode) denyButton.parentNode.removeChild(denyButton);
        var buttons = popupEl.querySelectorAll("[data-boost-profile]");
        for (var i = 0; i < buttons.length; i += 1) {
          buttons[i].onclick = function () {
            boostRun.profile = this.getAttribute("data-boost-profile") || "strong";
            saveState();
            if (typeof Swal !== "undefined" && Swal.close) Swal.close();
            runBoostAction(true, false);
          };
        }
        var diagnosticsButton = popupEl.querySelector("[data-boost-diagnostics]");
        if (diagnosticsButton) {
          diagnosticsButton.onclick = function () {
            if (typeof Swal !== "undefined" && Swal.close) Swal.close();
            showBoostDiagnostics();
          };
        }
      }
    }).then(function (result) {
      if (result && result.isConfirmed && boostRun.active) runBoostAction(true, true);
      if (result && result.isDenied) showBoostDiagnostics();
    });
  }

  function runBoostAction(turningOn, refreshOnly, selectedWorkArea) {
    boostRun.loading = true;
    renderBoostButtonState();

    applyWindowsBoostSettings(turningOn, function () {
      var script = turningOn ? "SORI_TOOLS.applyBoostMode(" + q(boostRun.profile || "strong") + ", " + (selectedWorkArea ? "true" : "false") + ")" : "SORI_TOOLS.restoreBoostMode()";
      callAeQuiet(script, function (response) {
        boostRun.loading = false;
        if (response && response.ok) {
          boostRun.active = turningOn;
          if (turningOn) {
            toast("success", boostResponseSummary(response, response.message || (refreshOnly ? "Boost refreshed." : "Boost enabled.")));
          } else {
            toast("success", response.message || "Boost restored.");
          }
        } else {
          toast("error", response && response.message ? response.message : "Boost failed.");
        }
        syncBoostRestoreState();
        renderBoostButtonState();
      });
    });
  }

  function boostResponseSummary(response, fallback) {
    var data = response && response.data ? response.data : null;
    if (!data) return fallback;
    var text = fallback;
    if (data.comps !== undefined && data.layers !== undefined) text += " " + data.comps + " comps, " + data.layers + " layers.";
    if (data.heavyEffects) text += " " + data.heavyEffects + " heavy FX detected.";
    if (data.heavyBypassed) text += " " + data.heavyBypassed + " heavy FX bypassed.";
    if (data.memoryPurged) text += " Memory cache purged.";
    if (data.workAreaSet) text += " Work area set.";
    return text;
  }

  function showBoostDiagnostics() {
    if (boostRun.loading) return;
    boostRun.loading = true;
    renderBoostButtonState();
    callAeQuiet("SORI_TOOLS.boostDiagnostics()", function (response) {
      boostRun.loading = false;
      renderBoostButtonState();
      if (!response || !response.ok) {
        toast("error", response && response.message ? response.message : "Boost diagnostics failed.");
        return;
      }
      var data = response.data || {};
      popup({
        title: "Boost Diagnostics",
        html: '<div class="boost-diagnostics"><p>Active: ' + (data.active ? "Yes" : "No") + '</p><p>Profile: ' + (data.profile || boostRun.profile || "strong") + '</p><p>Comps: ' + (data.comps || 0) + ' · Layers: ' + (data.layers || 0) + '</p><p>Heavy FX live: ' + (data.heavyEffects || 0) + '</p><p>Heavy FX bypassed: ' + (data.heavyBypassed || 0) + '</p><p>Selected layers: ' + (data.selectedLayers || 0) + '</p><p>' + (data.recommendation || "Use Strong for daily work.") + '</p></div>',
        confirmButtonText: "OK"
      });
    });
  }

  function showBoostProgress(message) {
    if (typeof Swal === "undefined" || !Swal.fire) return;
    try {
      Swal.fire({
        title: message,
        html: '<div class="boost-progress-body"><span class="boost-progress-spinner"></span><span>Please wait...</span></div>',
        showConfirmButton: false,
        allowOutsideClick: false,
        allowEscapeKey: false,
        customClass: {
          popup: "soritools-popup soritools-boost-popup"
        },
        showClass: { popup: "sori-swal-show", backdrop: "sori-swal-backdrop-show" },
        hideClass: { popup: "sori-swal-hide", backdrop: "sori-swal-backdrop-hide" }
      });
    } catch (error) {}
  }

  function closeBoostProgress() {
    try {
      if (typeof Swal !== "undefined" && Swal.close) Swal.close();
    } catch (error) {}
  }

  function applyWindowsBoostSettings(active, callback) {
    try {
      if (typeof require !== "function") {
        if (callback) callback();
        return;
      }
      var childProcess = require("child_process");
      var priority = active ? "High" : "Normal";
      var command = "Get-Process AfterFX -ErrorAction SilentlyContinue | ForEach-Object { $_.PriorityClass = '" + priority + "' }";
      childProcess.exec("powershell -NoProfile -ExecutionPolicy Bypass -Command " + JSON.stringify(command), function () {
        if (callback) callback();
      });
      return;
    } catch (error) {}
    if (callback) callback();
  }

  function renderBoostButtonState() {
    if (!els.boostBtn) return;
    els.boostBtn.classList.toggle("active", boostRun.active);
    els.boostBtn.classList.toggle("is-loading", boostRun.loading);
    els.boostBtn.setAttribute("aria-pressed", boostRun.active ? "true" : "false");
    setTooltip(els.boostBtn, boostRun.loading ? "Boost loading: AE optimization running." : (boostRun.active ? "Boost On. Click: restore quality. Right-click: profiles/refresh. Shift+Click or Shift+Right-click: refresh and set work area to selected layers." : "Boost Off. Click: enable " + (boostRun.profile || "strong") + " boost. Right-click: profiles. Shift+Click or Shift+Right-click: boost and set work area to selected layers."));
  }

  function setupThemedTooltips() {
    var nodes = document.querySelectorAll("[title]");
    for (var i = 0; i < nodes.length; i += 1) {
      var text = nodes[i].getAttribute("title");
      if (!text) continue;
      nodes[i].setAttribute("data-tooltip", text);
      if (!nodes[i].getAttribute("aria-label")) nodes[i].setAttribute("aria-label", text);
      nodes[i].removeAttribute("title");
      nodes[i].addEventListener("mouseenter", showThemedTooltip);
      nodes[i].addEventListener("mouseleave", hideThemedTooltip);
      nodes[i].addEventListener("mousedown", hideThemedTooltip);
    }
  }

  function setTooltip(element, text) {
    if (!element) return;
    element.setAttribute("data-tooltip", text || "");
    element.removeAttribute("title");
  }

  function showThemedTooltip(event) {
    var target = event.currentTarget;
    var text = target ? target.getAttribute("data-tooltip") : "";
    if (!text) return;
    hideThemedTooltip();
    tooltipTarget = target;
    tooltipTimer = window.setTimeout(function () {
      if (!tooltipTarget || tooltipTarget !== target) return;
      var tip = document.createElement("div");
      tip.id = "soriTooltip";
      tip.className = "sori-tooltip";
      tip.textContent = text;
      document.body.appendChild(tip);
      var rect = target.getBoundingClientRect();
      var tipRect = tip.getBoundingClientRect();
      var left = rect.left + (rect.width / 2) - (tipRect.width / 2);
      left = Math.max(8, Math.min(left, window.innerWidth - tipRect.width - 8));
      var top = rect.top - tipRect.height - 8;
      if (top < 8) top = rect.bottom + 8;
      tip.style.left = left + "px";
      tip.style.top = top + "px";
    }, 800);
  }

  function hideThemedTooltip() {
    if (tooltipTimer) window.clearTimeout(tooltipTimer);
    tooltipTimer = 0;
    tooltipTarget = null;
    var tip = document.getElementById("soriTooltip");
    if (tip && tip.parentNode) tip.parentNode.removeChild(tip);
  }

  function logAeError(script, message, response) {
    try {
      var entry = [
        "[" + new Date().toISOString() + "]",
        "host=" + (runtime.hostVersion || "unknown"),
        "script=" + String(script || ""),
        "message=" + String(message || ""),
        "response=" + String(response || "")
      ].join("\n") + "\n---\n";
      if (window.console && console.error) console.error(entry);
      if (typeof require === "function") {
        var fs = require("fs");
        var path = require("path");
        var base = "";
        try { base = cs.getSystemPath("extension") || ""; } catch (e) {}
        if (base) {
          var dir = path.join(base, "tmp");
          if (!fs.existsSync(dir)) fs.mkdirSync(dir);
          fs.appendFileSync(path.join(dir, "ae-error-log.txt"), entry, "utf8");
        }
      }
    } catch (error) {}
  }

  function pulse(active) {
    if (!els.statusDot) return;
    if (active) els.statusDot.classList.add("busy");
    else els.statusDot.classList.remove("busy");
  }

  function toast(icon, message) {
    if (icon === "success") return;
    if (typeof Swal !== "undefined") {
      Swal.fire({
        toast: true,
        position: "top",
        icon: icon,
        title: message,
        showConfirmButton: false,
        timer: 1800,
        timerProgressBar: true,
        customClass: {
          popup: "soritools-toast"
        },
        didOpen: function (toastElement) {
          enableSwipeDismissToast(toastElement);
        }
      });
    }
  }

  function enableSwipeDismissToast(toastElement) {
    if (!toastElement) return;

    var startX = 0;
    var startY = 0;
    var lastX = 0;
    var lastY = 0;
    var startTime = 0;
    var dragging = false;
    var dismissing = false;
    var threshold = 72;

    function point(event) {
      var touch = event.touches && event.touches[0] ? event.touches[0] : null;
      var changed = event.changedTouches && event.changedTouches[0] ? event.changedTouches[0] : null;
      return touch || changed || event;
    }

    function start(event) {
      if (event.button && event.button !== 0) return;
      var p = point(event);
      startX = p.clientX;
      lastX = p.clientX;
      startY = p.clientY;
      lastY = p.clientY;
      startTime = Date.now();
      dragging = true;
      dismissing = false;
      threshold = Math.max(56, Math.min(toastElement.offsetWidth || 240, 260) * 0.28);
      toastElement.classList.add("is-dragging");
      toastElement.style.transition = "none";
      try {
        if (Swal.stopTimer) Swal.stopTimer();
      } catch (error) {}

      document.addEventListener("mousemove", move, false);
      document.addEventListener("mouseup", end, false);
      document.addEventListener("touchmove", move, false);
      document.addEventListener("touchend", end, false);
      document.addEventListener("touchcancel", end, false);
    }

    function move(event) {
      if (!dragging || dismissing) return;
      var p = point(event);
      lastX = p.clientX;
      lastY = p.clientY;
      var dx = lastX - startX;
      var dy = lastY - startY;
      var distance = Math.sqrt(dx * dx + dy * dy);
      var opacity = Math.max(0.28, 1 - distance / 220);
      var rotate = Math.max(-7, Math.min(7, dx / 22));
      toastElement.style.transform = "translate3d(" + dx + "px," + dy + "px,0) rotate(" + rotate + "deg)";
      toastElement.style.opacity = opacity;
      if (event.cancelable !== false) event.preventDefault();
    }

    function end() {
      if (!dragging) return;
      dragging = false;
      removeDragListeners();

      var dx = lastX - startX;
      var dy = lastY - startY;
      var distance = Math.sqrt(dx * dx + dy * dy);
      var elapsed = Math.max(Date.now() - startTime, 1);
      var velocity = distance / elapsed;

      if (distance > threshold || velocity > 0.75) {
        dismissToast(dx, dy, distance);
        return;
      }

      toastElement.classList.remove("is-dragging");
      toastElement.style.transition = "transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1), opacity 160ms ease";
      toastElement.style.transform = "";
      toastElement.style.opacity = "";
      try {
        if (Swal.resumeTimer) Swal.resumeTimer();
      } catch (error) {}
    }

    function dismissToast(dx, dy, distance) {
      dismissing = true;
      toastElement.classList.remove("is-dragging");
      toastElement.classList.add("is-dismissing");
      if (!distance) {
        dx = 0;
        dy = -1;
        distance = 1;
      }
      var travel = Math.max(window.innerWidth || 320, window.innerHeight || 320);
      var exitX = dx / distance * travel;
      var exitY = dy / distance * travel;
      toastElement.style.transition = "transform 180ms cubic-bezier(0.4, 0, 1, 1), opacity 140ms ease";
      toastElement.style.transform = "translate3d(" + exitX + "px," + exitY + "px,0) scale(0.96)";
      toastElement.style.opacity = "0";
      window.setTimeout(function () {
        if (Swal.isVisible && Swal.isVisible()) Swal.close();
      }, 150);
    }

    function removeDragListeners() {
      document.removeEventListener("mousemove", move, false);
      document.removeEventListener("mouseup", end, false);
      document.removeEventListener("touchmove", move, false);
      document.removeEventListener("touchend", end, false);
      document.removeEventListener("touchcancel", end, false);
    }

    toastElement.addEventListener("mousedown", start, false);
    toastElement.addEventListener("touchstart", start, false);
  }

  /* ───────────────────────────────────────────────────────────────────
     AEP LIBRARY
     ─────────────────────────────────────────────────────────────────── */

  function openAepLibraryModal() {
    if (els.aepLibraryModal) {
      els.aepLibraryModal.classList.remove("is-closing");
      els.aepLibraryModal.style.display = "";
      aepState.selectedId = "";
      renderAepList();
      syncAepSearchUi();
      if (els.aepSearch) {
        window.setTimeout(function () { els.aepSearch.focus(); }, 0);
      }
    }
  }

  function closeAepLibraryModal(onDone) {
    if (!els.aepLibraryModal || els.aepLibraryModal.style.display === "none") {
      if (onDone) onDone();
      return;
    }
    els.aepLibraryModal.classList.add("is-closing");
    window.setTimeout(function () {
      if (els.aepLibraryModal) {
        els.aepLibraryModal.style.display = "none";
        els.aepLibraryModal.classList.remove("is-closing");
      }
      if (onDone) onDone();
    }, 180);
  }

  function closeAepContextMenuOnce(event) {
    var menu = document.querySelector(".aep-context-menu");
    if (menu && event && menu.contains(event.target)) return;
    closeAepContextMenu();
  }

  function closeAepContextMenuOnEscape(event) {
    if (event.key === "Escape") closeAepContextMenu();
  }

  function closeAepContextMenu(immediate) {
    var menu = document.querySelector(".aep-context-menu");
    if (menu && menu.parentNode) {
      if (immediate) {
        menu.parentNode.removeChild(menu);
      } else {
        menu.classList.add("is-closing");
        window.setTimeout(function () {
          if (menu.parentNode) menu.parentNode.removeChild(menu);
        }, 120);
      }
    }
    document.removeEventListener("mousedown", closeAepContextMenuOnce);
    document.removeEventListener("keydown", closeAepContextMenuOnEscape);
  }

  function openAepSelectionMenu(e) {
    closeAepContextMenu(true);

    ensureAepTree();
    var checkedIds = [];
    for (var k in aepState.checkedIds) {
      if (aepState.checkedIds[k]) checkedIds.push(k);
    }
    var checkedCount = 0;
    for (var i = 0; i < checkedIds.length; i += 1) {
      if (!hasCheckedAepAncestor(checkedIds[i], checkedIds)) checkedCount += 1;
    }

    var menu = document.createElement("div");
    menu.className = "preset-menu aep-context-menu";
    menu.innerHTML = '<button type="button" data-action="delete-checked" ' + (checkedCount === 0 ? "disabled" : "") + '><span>Delete Checked (' + checkedCount + ')</span></button>' +
      '<button type="button" data-action="clear-checked"><span>Clear Selection</span></button>';

    menu.addEventListener("click", function (menuEvent) {
      var actionBtn = closestActionButton(menuEvent.target);
      if (!actionBtn) return;
      var action = actionBtn.getAttribute("data-action");
      closeAepContextMenu();
      if (action === "delete-checked") deleteCheckedAepItems();
      else if (action === "clear-checked") {
        aepState.checkedIds = {};
        aepState.selectionMode = false;
        saveAepState();
        renderAepList();
      }
    });

    document.body.appendChild(menu);
    positionMenu(menu, e);

    window.setTimeout(function () {
      document.addEventListener("mousedown", closeAepContextMenuOnce);
      document.addEventListener("keydown", closeAepContextMenuOnEscape);
    }, 0);
  }

  function getAepSearchQuery() {
    return normalizeSearch(els.aepSearch ? els.aepSearch.value : "");
  }

  function syncAepSearchUi() {
    if (!els.aepSearchWrap) return;
    var hasQuery = !!getAepSearchQuery();
    els.aepSearchWrap.classList.toggle("has-query", hasQuery);
    els.aepSearchWrap.classList.toggle("is-searching", !!aepSearchTimer);
  }

  function handleAepSearchInput() {
    var value = els.aepSearch ? els.aepSearch.value : "";
    if (value === aepSearchInputValue) return;
    aepSearchInputValue = value;
    if (aepSearchTimer) window.clearTimeout(aepSearchTimer);
    if (!normalizeSearch(value)) {
      aepSearchTimer = 0;
      syncAepSearchUi();
      renderAepList();
      return;
    }
    aepSearchTimer = window.setTimeout(function () {
      aepSearchTimer = 0;
      syncAepSearchUi();
      renderAepList();
    }, 120);
    syncAepSearchUi();
  }

  function clearAepSearch() {
    if (!els.aepSearch) return;
    if (aepSearchTimer) window.clearTimeout(aepSearchTimer);
    aepSearchTimer = 0;
    aepSearchInputValue = "";
    els.aepSearch.value = "";
    syncAepSearchUi();
    renderAepList();
    els.aepSearch.focus();
  }

  function clearAepSelectionOnEmptyClick(e) {
    if (closestAepItem(e.target) || closestAepActionBtn(e.target)) return;
    if (!aepState.selectedId) return;
    aepState.selectedId = "";
    saveAepState();
    renderAepList();
  }

  function toggleAepSelectionMode() {
    aepState.selectionMode = !aepState.selectionMode;
    aepState.checkedIds = {};
    closeAepContextMenu();
    saveAepState();
    renderAepList();
  }

  function hasCheckedAepItems() {
    for (var k in aepState.checkedIds) {
      if (aepState.checkedIds[k]) return true;
    }
    return false;
  }

  function toggleAepItemCheck(id, checked) {
    aepState.checkedIds[id] = checked;
    var node = findAepNode(id);
    if (node && node.children) checkAllAepChildren(node.children, checked);
    syncAepFolderCheckState(aepState.tree);
    saveAepState();
    renderAepList();
  }

  function checkAllAepChildren(children, checked) {
    for (var i = 0; i < children.length; i += 1) {
      aepState.checkedIds[children[i].id] = checked;
      if (children[i].children) checkAllAepChildren(children[i].children, checked);
    }
  }

  function syncAepFolderCheckState(nodes) {
    for (var i = 0; i < nodes.length; i += 1) {
      var node = nodes[i];
      if (!node.children || !node.children.length) continue;
      syncAepFolderCheckState(node.children);
      var allChecked = true;
      for (var j = 0; j < node.children.length; j += 1) {
        if (!aepState.checkedIds[node.children[j].id]) {
          allChecked = false;
          break;
        }
      }
      aepState.checkedIds[node.id] = allChecked;
    }
  }

  function findAepNodeResult(tree, id) {
    for (var i = 0; i < tree.length; i += 1) {
      if (tree[i].id === id) return { node: tree[i], parent: tree, index: i };
      if (tree[i].children) {
        var sub = findAepNodeResult(tree[i].children, id);
        if (sub) return sub;
      }
    }
    return null;
  }

  function findAepNode(id) {
    var r = findAepNodeResult(aepState.tree, id);
    return r ? r.node : null;
  }

  function removeAepNode(tree, id) {
    for (var i = 0; i < tree.length; i += 1) {
      if (tree[i].id === id) return tree.splice(i, 1)[0];
      if (tree[i].children) {
        var removed = removeAepNode(tree[i].children, id);
        if (removed) return removed;
      }
    }
    return null;
  }

  function flattenAepItems(nodes) {
    var result = [];
    for (var i = 0; i < nodes.length; i += 1) {
      if (nodes[i].type === "aep") result.push(nodes[i]);
      if (nodes[i].children) {
        var sub = flattenAepItems(nodes[i].children);
        for (var j = 0; j < sub.length; j += 1) result.push(sub[j]);
      }
    }
    return result;
  }

  function syncAepItemsFromTree() {
    aepState.items = flattenAepItems(aepState.tree);
  }

  function ensureAepTree() {
    if (!aepState.tree || !aepState.tree.length) {
      aepState.tree = [];
      for (var i = 0; i < aepState.items.length; i += 1) {
        var item = aepState.items[i];
        item.type = "aep";
        if (!item.id) item.id = uid();
        aepState.tree.push(item);
      }
    }
    assignAepNodeIds(aepState.tree);
    syncAepItemsFromTree();
  }

  function assignAepNodeIds(nodes) {
    for (var i = 0; i < nodes.length; i += 1) {
      if (!nodes[i].id) nodes[i].id = uid();
      if (!nodes[i].type) nodes[i].type = nodes[i].children ? "folder" : "aep";
      if (nodes[i].type === "folder" && !nodes[i].children) nodes[i].children = [];
      if (nodes[i].children) assignAepNodeIds(nodes[i].children);
    }
  }

  function createNewAepFolder() {
    ensureAepTree();
    var folder = { id: uid(), type: "folder", name: "New Folder", expanded: true, children: [] };
    var selected = findAepNode(aepState.selectedId);
    if (selected && selected.type === "folder") {
      if (!selected.children) selected.children = [];
      selected.children.push(folder);
      selected.expanded = true;
    } else {
      aepState.tree.push(folder);
    }
    aepState.selectedId = folder.id;
    saveAepState();
    renderAepList();
    renameAepNodeStart(folder.id);
  }

  function aepNodeContainsId(node, id) {
    if (!node || !node.children) return false;
    for (var i = 0; i < node.children.length; i += 1) {
      if (node.children[i].id === id || aepNodeContainsId(node.children[i], id)) return true;
    }
    return false;
  }

  function hasCheckedAepAncestor(id, checkedIds) {
    for (var i = 0; i < checkedIds.length; i += 1) {
      if (checkedIds[i] === id) continue;
      var node = findAepNode(checkedIds[i]);
      if (aepNodeContainsId(node, id)) return true;
    }
    return false;
  }

  function deleteCheckedAepItems() {
    ensureAepTree();
    var checkedIds = [];
    for (var k in aepState.checkedIds) {
      if (aepState.checkedIds[k]) checkedIds.push(k);
    }
    var rootCheckedIds = [];
    for (var c = 0; c < checkedIds.length; c += 1) {
      if (!hasCheckedAepAncestor(checkedIds[c], checkedIds)) rootCheckedIds.push(checkedIds[c]);
    }
    if (!rootCheckedIds.length) {
      aepState.selectionMode = false;
      saveAepState();
      renderAepList();
      return;
    }
    closeAepContextMenu();
    closeAepLibraryModal(function () {
      popup({
          title: "Delete AEP?",
          text: "This will delete " + rootCheckedIds.length + " selected item(s) permanently.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Delete",
        cancelButtonText: "Cancel"
      }).then(function (result) {
        if (!result || !result.isConfirmed) {
          openAepLibraryModal();
          return;
        }
        var deletedFolders = {};
        for (var i = 0; i < rootCheckedIds.length; i += 1) {
          var node = findAepNode(rootCheckedIds[i]);
          var items = node && node.type === "folder" ? flattenAepItems(node.children || []) : (node && node.type === "aep" ? [node] : []);
          for (var j = 0; j < items.length; j += 1) {
            var folderKey = String(items[j].folder || items[j].path || "");
            if (folderKey && deletedFolders[folderKey]) continue;
            if (folderKey) deletedFolders[folderKey] = true;
            callAeQuiet("SORI_TOOLS.deleteAepLibraryItem(" + q(JSON.stringify({ folder: items[j].folder })) + ")");
          }
          removeAepNode(aepState.tree, rootCheckedIds[i]);
        }
        syncAepItemsFromTree();
        aepState.checkedIds = {};
        aepState.selectionMode = false;
        saveAepState();
        renderAepList();
        openAepLibraryModal();
        toast("success", "Deleted " + rootCheckedIds.length + " selected item(s).");
      });
    });
  }

  function showAepItemMenu(e, item) {
    closeAepContextMenu(true);

    var menu = document.createElement("div");
    menu.className = "preset-menu aep-context-menu";
    if (item.type === "folder") {
      menu.innerHTML = '<button type="button" data-aep-menu="new-folder"><span>New Folder</span></button>' +
        '<button type="button" data-aep-menu="rename"><span>Rename</span></button>' +
        '<button type="button" class="danger" data-aep-menu="delete"><span>Delete Folder</span></button>';
    } else {
      menu.innerHTML = '<button type="button" data-aep-menu="import"><span>Import comps</span></button>' +
        '<button type="button" data-aep-menu="export"><span>Export AEP</span></button>' +
        '<button type="button" data-aep-menu="recollect"><span>Re-collect footage</span></button>' +
        '<button type="button" data-aep-menu="rename"><span>Rename</span></button>' +
        '<button type="button" data-aep-menu="reveal"><span>Reveal folder</span></button>' +
        '<button type="button" class="danger" data-aep-menu="delete"><span>Delete</span></button>';
    }

    menu.addEventListener("click", function (menuEvent) {
      var actionBtn = closestAepMenuButton(menuEvent.target);
      if (!actionBtn) return;
      var action = actionBtn.getAttribute("data-aep-menu");
      menuEvent.preventDefault();
      menuEvent.stopPropagation();
      closeAepContextMenu();
      if (action === "new-folder") createNewAepFolder();
      else if (action === "import" && item.type === "aep") importAllAepComps(item);
      else if (action === "export" && item.type === "aep") exportAepItem(item);
      else if (action === "recollect" && item.type === "aep") recollectAepFootage(item);
      else if (action === "rename") renameAepNodeStart(item.id);
      else if (action === "reveal" && item.type === "aep") revealAepFolder(item);
      else if (action === "delete") window.setTimeout(function () { deleteAepItem(item); }, 0);
    });

    document.body.appendChild(menu);
    positionMenu(menu, e);

    window.setTimeout(function () {
      document.addEventListener("mousedown", closeAepContextMenuOnce);
      document.addEventListener("keydown", closeAepContextMenuOnEscape);
    }, 0);
  }

  function importAepFile() {
    callAe("SORI_TOOLS.importAepFile()", function (data) {
      if (data && data.ok && data.data) {
        addAepItem(data.data);
        openAepLibraryModal();
      }
    }, els.aepImportBtn);
  }

  function importDroppedAepItems(paths) {
    callAe("SORI_TOOLS.importDroppedAepItems(" + q(JSON.stringify(paths)) + ")", function (data) {
      if (data && data.ok && data.data && data.data.length) {
        for (var n = 0; n < data.data.length; n += 1) {
          addAepItem(data.data[n]);
        }
        openAepLibraryModal();
      }
    });
  }

  function renameAepItem(item) {
    closeAepContextMenu();
    closeAepLibraryModal(function () {
      popup({
        title: "Rename AEP",
        text: "Type new project name.",
        input: "text",
        inputValue: item.name,
        showCancelButton: true,
        confirmButtonText: "Rename",
        cancelButtonText: "Cancel",
        inputValidator: function (value) {
          if (!value || !value.trim()) return "Name cannot be empty.";
        }
      }).then(function (result) {
        if (!result || !result.isConfirmed) {
          openAepLibraryModal();
          return;
        }
        var nextName = result.value ? result.value.trim() : "";
        if (!nextName || nextName === item.name) {
          openAepLibraryModal();
          return;
        }
        callAeQuiet("SORI_TOOLS.renameAepLibraryItem(" + q(JSON.stringify({ folder: item.folder, name: nextName })) + ")", function (response) {
          if (response && response.ok && response.data) {
            item.name = response.data.name || nextName;
            item.path = response.data.path || item.path;
            item.folder = response.data.folder || item.folder;
            saveAepState();
          }
          renderAepList();
          openAepLibraryModal();
        });
      });
    });
  }

  function addAepItem(item) {
    if (!item || !item.path) return;
    ensureAepTree();
    for (var i = 0; i < aepState.items.length; i += 1) {
      if (normalizedPath(aepState.items[i].path) === normalizedPath(item.path)) return;
    }
    item.id = uid();
    item.type = "aep";
    var selected = findAepNode(aepState.selectedId);
    if (selected && selected.type === "folder") {
      if (!selected.children) selected.children = [];
      selected.children.push(item);
      selected.expanded = true;
    } else {
      aepState.tree.push(item);
    }
    syncAepItemsFromTree();
    saveAepState();
    renderAepList();
  }

  function clearAepDropIndicators() {
    if (!els.aepList) return;
    var all = els.aepList.querySelectorAll(".drop-above, .drop-below, .drop-inside");
    for (var i = 0; i < all.length; i += 1) {
      all[i].classList.remove("drop-above", "drop-below", "drop-inside");
    }
  }

  function aepItemDragStart(e) {
    var row = closestAepItem(e.target);
    if (!row) return;
    aepDrag.srcId = row.getAttribute("data-id");
    aepDrag.mode = "reorder";
    try { e.dataTransfer.effectAllowed = "move"; } catch (err) {}
    try { e.dataTransfer.setData("text/plain", aepDrag.srcId); } catch (err2) {}
  }

  function aepItemDragOver(e) {
    if (aepDrag.mode !== "reorder") return;
    e.preventDefault();
    e.stopPropagation();
    try { e.dataTransfer.dropEffect = "move"; } catch (err) {}

    var row = closestAepItem(e.target);
    clearAepDropIndicators();
    if (!row) return;

    var targetId = row.getAttribute("data-id");
    if (targetId === aepDrag.srcId) return;

    var targetNode = findAepNode(targetId);
    var rect = row.getBoundingClientRect();
    var y = e.clientY - rect.top;
    if (targetNode && targetNode.type === "folder" && y > rect.height * 0.25 && y < rect.height * 0.75) row.classList.add("drop-inside");
    else if (y < rect.height / 2) row.classList.add("drop-above");
    else row.classList.add("drop-below");
  }

  function aepItemDragLeave(e) {
    var row = closestAepItem(e.target);
    if (row) row.classList.remove("drop-above", "drop-below", "drop-inside");
  }

  function aepItemDropReorder(e) {
    if (aepDrag.mode !== "reorder" || !aepDrag.srcId) return false;
    e.preventDefault();
    e.stopPropagation();
    clearAepDropIndicators();

    var row = closestAepItem(e.target);
    if (!row) return true;

    var targetId = row.getAttribute("data-id");
    if (targetId === aepDrag.srcId) return true;

    ensureAepTree();
    var targetNode = findAepNode(targetId);
    var targetResult = findAepNodeResult(aepState.tree, targetId);
    if (!targetResult) return true;

    var srcItem = removeAepNode(aepState.tree, aepDrag.srcId);
    if (!srcItem) return true;

    var rect = row.getBoundingClientRect();
    var y = e.clientY - rect.top;
    if (targetNode && targetNode.type === "folder" && y > rect.height * 0.25 && y < rect.height * 0.75) {
      if (!targetNode.children) targetNode.children = [];
      targetNode.children.push(srcItem);
      targetNode.expanded = true;
    } else {
      var newTargetResult = findAepNodeResult(aepState.tree, targetId);
      if (!newTargetResult) aepState.tree.push(srcItem);
      else if (y < rect.height / 2) newTargetResult.parent.splice(newTargetResult.index, 0, srcItem);
      else newTargetResult.parent.splice(newTargetResult.index + 1, 0, srcItem);
    }

    aepState.selectedId = srcItem.id;
    syncAepItemsFromTree();
    saveAepState();
    renderAepList();
    return true;
  }

  function aepItemDragEnd() {
    aepDrag.srcId = null;
    aepDrag.mode = null;
    clearAepDropIndicators();
  }

  function closestAepItem(el) {
    while (el && el !== document) {
      if (el.getAttribute && el.getAttribute("data-id")) return el;
      el = el.parentNode;
    }
    return null;
  }

  function exportAepItem(item) {
    if (!item || !item.path) return;
    callAe("SORI_TOOLS.exportAepLibraryItem(" + q(JSON.stringify({ path: item.path, name: item.name })) + ")");
  }

  function renderAepList() {
    if (!els.aepList || !els.aepEmpty) return;
    ensureAepTree();
    els.aepList.innerHTML = "";
    if (els.aepSelectionModeBtn) els.aepSelectionModeBtn.classList.toggle("active", !!aepState.selectionMode);

    var query = getAepSearchQuery();
    var nodes = query ? filterAepTree(aepState.tree, query, createFuseMatchMap("aep", flattenSearchNodes(aepState.tree), query, ["name", "path", "folder", "type"], aepSearchVersion)) : aepState.tree;
    syncAepSearchUi();
    clearAepDropIndicators();
    renderAepNodes(els.aepList, nodes, 0);

    els.aepEmpty.style.display = nodes.length ? "none" : "";
    els.aepEmpty.textContent = aepState.items.length ? "No AEP found." : "Drop .aep files here or click Import AEP";
  }

  function renderAepNodes(container, nodes, depth) {
    for (var i = 0; i < nodes.length; i += 1) {
      var node = nodes[i];
      var row = createAepNodeRow(node, depth);
      container.appendChild(row);
      if (node.type === "folder" && node.children && node.expanded) {
        var childContainer = document.createElement("div");
        childContainer.className = "tree-children";
        renderAepNodes(childContainer, node.children, depth + 1);
        container.appendChild(childContainer);
      }
    }
  }

  function createAepNodeRow(item, depth) {
    var row = document.createElement("div");
    row.className = "aep-item tree-node" + (item.type === "folder" ? " tree-folder" : "") + (item.id === aepState.selectedId ? " is-selected" : "") + (aepState.selectionMode ? " is-selection-mode" : "") + (aepState.checkedIds[item.id] ? " is-checked" : "");
    row.setAttribute("title", item.type === "folder" ? "Click: Select · Double-click: Open/Close · Right-click: Options" : (aepState.selectionMode ? "Click: Check item · Right-click: Options" : "Click: Select · Double-click: Import all comps · Shift+Click: Pick comps"));
    row.setAttribute("draggable", "true");
    row.setAttribute("data-id", item.id);
    row.setAttribute("data-type", item.type);

    var html = "";
    if (depth > 0) html += '<span class="tree-node-indent" style="width:' + (depth * 14) + 'px"></span>';
    if (aepState.selectionMode) html += '<input class="aep-check tree-node-checkbox" type="checkbox" ' + (aepState.checkedIds[item.id] ? 'checked' : '') + '>';
    html += '<span class="tree-node-chevron' + (item.type === "folder" && item.expanded ? ' is-expanded' : '') + '">' + (item.type === "folder" ? '&#9654;' : '') + '</span>';
    html += '<span class="aep-item-icon tree-node-icon">' + (item.type === "folder" ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>' : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M8 13h8"/><path d="M8 17h5"/></svg>') + '</span>';
    html += '<span class="aep-item-name-wrap"><span class="aep-item-name tree-node-name">' + esc(item.name) + '</span></span>';
    if (item.type === "aep") html += '<button class="aep-item-action-btn aep-export-btn" data-aep-action="export" title="Export AEP" aria-label="Export AEP"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg></button>';
    row.innerHTML = html;

    (function (aepItem, rowEl) {
      var chev = rowEl.querySelector(".tree-node-chevron");
      if (chev) chev.addEventListener("click", function (e) { e.stopPropagation(); toggleAepFolder(aepItem.id); });
      rowEl.addEventListener("click", function (e) { handleAepNodeClick(e, aepItem); });
      rowEl.addEventListener("dblclick", function (e) { handleAepNodeDblClick(e, aepItem); });
      rowEl.addEventListener("contextmenu", function (e) { handleAepNodeContextMenu(e, aepItem); });
      rowEl.addEventListener("dragstart", aepItemDragStart);
      rowEl.addEventListener("dragover", aepItemDragOver);
      rowEl.addEventListener("dragleave", aepItemDragLeave);
      rowEl.addEventListener("drop", aepItemDropReorder);
      rowEl.addEventListener("dragend", aepItemDragEnd);
    })(item, row);
    return row;
  }

  function cloneAepNodeForSearch(node, children) {
    var copy = {};
    for (var k in node) {
      if (k !== "children") copy[k] = node[k];
    }
    if (node.type === "folder") copy.expanded = true;
    if (children) copy.children = children;
    return copy;
  }

  function filterAepTree(nodes, query, matchMap) {
    var result = [];
    for (var i = 0; i < nodes.length; i += 1) {
      var node = nodes[i];
      var selfMatch = matchMap ? !!matchMap[node.id] : matchesSearchQuery(String(node.name || "") + " " + String(node.path || ""), query);
      var childMatches = node.children ? filterAepTree(node.children, query, matchMap) : [];
      if (selfMatch || childMatches.length) result.push(cloneAepNodeForSearch(node, childMatches));
    }
    return result;
  }

  function toggleAepFolder(id) {
    var node = findAepNode(id);
    if (!node || node.type !== "folder") return;
    node.expanded = !node.expanded;
    saveAepState();
    renderAepList();
  }

  function handleAepNodeClick(e, item) {
    var actionBtn = closestAepActionBtn(e.target);
    if (actionBtn) {
      e.stopPropagation();
      if (actionBtn.getAttribute("data-aep-action") === "export") exportAepItem(item);
      return;
    }
    if (aepState.selectionMode) {
      toggleAepItemCheck(item.id, !aepState.checkedIds[item.id]);
      return;
    }
    aepState.selectedId = item.id;
    saveAepState();
    renderAepList();
    if (item.type === "aep" && e.shiftKey) openAepCompPicker(item);
  }

  function handleAepNodeDblClick(e, item) {
    if (aepState.selectionMode) return;
    e.preventDefault();
    e.stopPropagation();
    aepState.selectedId = item.id;
    saveAepState();
    renderAepList();
    if (item.type === "folder") toggleAepFolder(item.id);
    else importAllAepComps(item);
  }

  function handleAepNodeContextMenu(e, item) {
    e.preventDefault();
    e.stopPropagation();
    aepState.selectedId = item.id;
    saveAepState();
    renderAepList();
    if (aepState.selectionMode) openAepSelectionMenu(e);
    else showAepItemMenu(e, item);
  }

  function renameAepNodeStart(id) {
    var node = findAepNode(id);
    if (!node) return;
    if (node.type === "aep") {
      renameAepItem(node);
      return;
    }
    var row = els.aepList.querySelector("[data-id=\"" + id + "\"]");
    if (!row) return;
    var nameSpan = row.querySelector(".aep-item-name");
    if (!nameSpan) return;
    var input = document.createElement("input");
    input.type = "text";
    input.className = "tree-node-name-input";
    input.value = node.name;
    nameSpan.replaceWith(input);
    input.focus();
    input.select();
    function commit() {
      var next = input.value.trim();
      if (next) node.name = next;
      saveAepState();
      renderAepList();
    }
    input.addEventListener("blur", commit);
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); input.blur(); }
      if (e.key === "Escape") { input.value = node.name; input.blur(); }
    });
  }

  function closestAepActionBtn(el) {
    while (el && el !== document) {
      if (el.getAttribute && el.getAttribute("data-aep-action")) return el;
      el = el.parentNode;
    }
    return null;
  }

  function closestAepMenuButton(el) {
    while (el && el !== document) {
      if (el.getAttribute && el.getAttribute("data-aep-menu") && String(el.tagName || "").toLowerCase() === "button") return el;
      el = el.parentNode;
    }
    return null;
  }

  function shouldSkipAepImport(path, mode) {
    var key = String(path || "") + "|" + String(mode || "");
    var now = Date.now();
    if (key === aepImportShortcutKey && now - aepImportShortcutAt < 1200) return true;
    aepImportShortcutKey = key;
    aepImportShortcutAt = now;
    return false;
  }

  function importAllAepComps(item) {
    if (shouldSkipAepImport(item.path, "all")) return;
    callAeQuiet("SORI_TOOLS.importAepProject(" + q(JSON.stringify({ path: item.path })) + ")", function () {
      closeAepLibraryModal();
    });
  }

  function openAepCompPicker(item) {
    closeAepContextMenu();
    closeAepLibraryModal(function () {
      callAeQuiet("SORI_TOOLS.listAepComps(" + q(item.path) + ")", function (data) {
        if (!data || !data.ok || !data.data || !data.data.length) {
          openAepLibraryModal();
          return;
        }

      var comps = data.data;
      var html = '<div class="aep-comp-picker">';
      for (var i = 0; i < comps.length; i += 1) {
        var c = comps[i];
        html += '<label title="' + esc(c.name) + '"><input type="checkbox" value="' + esc(c.name) + '"' + (c.main === false ? '' : ' checked') + '>' +
          '<span>' + esc(c.name) + (c.main === false ? ' <small>(precomp)</small>' : ' <small>(main)</small>') + '</span>' +
          '<span class="aep-comp-info">' + c.width + 'x' + c.height + ' · ' + Math.round(c.duration * 100) / 100 + 's</span>' +
          '</label>';
      }
      html += '</div>';

      popup({
        title: "Import Comps from " + item.name,
        html: html,
        showCancelButton: true,
        confirmButtonText: "Import Selected",
        cancelButtonText: "Cancel",
        customClass: { popup: "soritools-popup" }
      }).then(function (result) {
        if (!result || !result.isConfirmed) return;

        var selectedNames = [];
        try {
          var popupEl = document.querySelector(".swal2-popup");
          if (popupEl) {
            var checkboxes = popupEl.querySelectorAll('.aep-comp-picker input[type="checkbox"]');
            for (var j = 0; j < checkboxes.length; j += 1) {
              if (checkboxes[j].checked) selectedNames.push(checkboxes[j].value);
            }
          }
        } catch (e) {}

        if (!selectedNames.length) {
          toast("warning", "Select at least one comp.");
          return;
        }

        var payload = { path: item.path, compNames: selectedNames };
        if (shouldSkipAepImport(item.path, "selected:" + selectedNames.join("|"))) return;
        callAeQuiet("SORI_TOOLS.importAepComps(" + q(JSON.stringify(payload)) + ")", function (response) {
          storeAepLastImport(item, response);
          closeAepLibraryModal();
        });
      });
    });
    });
  }

  function deleteAepItem(item) {
    closeAepContextMenu();
    closeAepLibraryModal(function () {
      var items = item.type === "folder" ? flattenAepItems(item.children || []) : [item];
      popup({
          title: item.type === "folder" ? "Delete AEP Folder?" : "Delete AEP?",
          text: item.type === "folder" ? "This will delete folder and " + items.length + " AEP item(s) permanently." : item.name + " and all collected footage will be permanently deleted.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Delete",
        cancelButtonText: "Cancel"
      }).then(function (result) {
        if (!result || !result.isConfirmed) {
          openAepLibraryModal();
          return;
        }

        for (var i = 0; i < items.length; i += 1) {
          callAeQuiet("SORI_TOOLS.deleteAepLibraryItem(" + q(JSON.stringify({ folder: items[i].folder })) + ")");
        }
        ensureAepTree();
        removeAepNode(aepState.tree, item.id);
        syncAepItemsFromTree();
        if (aepState.selectedId === item.id) aepState.selectedId = "";
        saveAepState();
        renderAepList();
        openAepLibraryModal();
        toast("success", "Deleted " + item.name + ".");
      });
    });
  }

  function revealAepFolder(item) {
    callAeQuiet("SORI_TOOLS.revealAepFolder(" + q(JSON.stringify({ folder: item.folder })) + ")");
  }

  function recollectAepFootage(item) {
    callAe("SORI_TOOLS.recollectAepFootage(" + q(JSON.stringify({ path: item.path, folder: item.folder })) + ")");
  }

  function aepDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
    if (els.aepDropZone) els.aepDropZone.classList.add("is-drag-active");
  }

  function aepDragLeave(e) {
    e.stopPropagation();
    if (els.aepDropZone) els.aepDropZone.classList.remove("is-drag-active");
  }

  function aepDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    if (els.aepDropZone) els.aepDropZone.classList.remove("is-drag-active");

    var files = e.dataTransfer && e.dataTransfer.files;
    if (!files || !files.length) return;

    var paths = [];
    for (var i = 0; i < files.length; i += 1) {
      var filePath = files[i].path || files[i].name || "";
      if (filePath && /\.aepx?$/i.test(filePath)) paths.push(filePath);
    }

    if (!paths.length) {
      toast("warning", "No .aep files found.");
      return;
    }

    importDroppedAepItems(paths);
  }

  function loadAepState() {
    try {
      loadAepStateFromRaw(localStorage.getItem(AEP_STORAGE_KEY));
    } catch (error) {
      try {
        loadAepStateFromRaw(localStorage.getItem(AEP_STORAGE_BACKUP_KEY));
        toast("warning", "AEP library restored from backup.");
      } catch (backupError) {}
    }
  }

  function loadAepStateFromRaw(raw) {
    if (!raw) return;
    var saved = JSON.parse(raw);
    aepState.items = saved.items || [];
    aepState.tree = saved.tree || [];
    aepState.selectedId = saved.selectedId || "";
    aepState.selectionMode = saved.selectionMode === true;
    aepState.checkedIds = saved.checkedIds || {};
    ensureAepTree();
    if (aepState.selectedId && !findAepNode(aepState.selectedId)) aepState.selectedId = "";
  }

  function saveAepState() {
    try {
      bumpAepSearchVersion();
      var existing = localStorage.getItem(AEP_STORAGE_KEY);
      if (existing) localStorage.setItem(AEP_STORAGE_BACKUP_KEY, existing);
      syncAepItemsFromTree();
      localStorage.setItem(AEP_STORAGE_KEY, JSON.stringify({
        items: aepState.items,
        tree: aepState.tree,
        selectedId: aepState.selectedId,
        selectionMode: aepState.selectionMode === true,
        checkedIds: aepState.checkedIds,
        backedUpAt: new Date().toISOString()
      }));
    } catch (error) {}
  }

  function loadState() {
    try {
      loadStateFromRaw(localStorage.getItem(STORAGE_KEY));
    } catch (error) {
      try {
        loadStateFromRaw(localStorage.getItem(STORAGE_BACKUP_KEY));
        toast("warning", "Preset library restored from backup.");
      } catch (backupError) {}
    }
  }

  function loadStateFromRaw(raw) {
    if (!raw) return;
    var saved = JSON.parse(raw);

    if (saved.presets && !saved.presetTree) {
      state.presetTree = [];
      for (var i = 0; i < saved.presets.length; i += 1) {
        var p = saved.presets[i];
        state.presetTree.push({
          id: p.id || uid(),
          type: "preset",
          name: p.name,
          path: p.path
        });
      }
      state.selectedId = saved.selectedId || "";
      saveState();
      return;
    }

    state.presetTree = saved.presetTree || [];
    state.selectedId = saved.selectedId || "";
    if (saved.boostProfile) boostRun.profile = saved.boostProfile;
    assignIds(state.presetTree);
    if (state.selectedId && !findNode(state.selectedId)) state.selectedId = "";
  }

  function saveState() {
    try {
      bumpPresetSearchVersion();
      var existing = localStorage.getItem(STORAGE_KEY);
      if (existing) localStorage.setItem(STORAGE_BACKUP_KEY, existing);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        presetTree: state.presetTree,
        selectedId: state.selectedId,
        boostProfile: boostRun.profile,
        backedUpAt: new Date().toISOString()
      }));
    } catch (error) {}
  }

  function q(value) {
    return JSON.stringify(String(value));
  }

  function num(value, fallback) {
    var n = Number(value);
    return isFinite(n) ? n : fallback;
  }

  function uid() {
    return String(Date.now()) + String(Math.random()).slice(2, 10) + String(Math.random()).slice(2, 6);
  }

  function esc(value) {
    return String(value).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function isModalVisible() {
    try { return typeof Swal !== "undefined" && Swal.isVisible && Swal.isVisible(); } catch (e) {}
    return false;
  }

  function isEditableTarget(node) {
    var tag = String(node && node.tagName ? node.tagName : "").toLowerCase();
    return tag === "input" || tag === "textarea" || tag === "select" || (node && node.isContentEditable === true);
  }

  function closest(node, className) {
    while (node && node !== document) {
      if (node.classList && node.classList.contains(className)) return node;
      if (node.className && typeof node.className === "string" && node.className.indexOf(className) >= 0) return node;
      node = node.parentNode;
    }
    return null;
  }

  function closestActionButton(node) {
    while (node && node !== document) {
      if (node.getAttribute && node.getAttribute("data-action") && String(node.tagName || "").toLowerCase() === "button") {
        return node;
      }
      node = node.parentNode;
    }
    return null;
  }
})();
