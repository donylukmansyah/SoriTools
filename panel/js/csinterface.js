/* Minimal CEP bridge for this panel. */
(function () {
  "use strict";

  var SystemPath = {
    USER_DATA: "userData",
    COMMON_FILES: "commonFiles",
    MY_DOCUMENTS: "myDocuments",
    APPLICATION: "application",
    EXTENSION: "extension",
    HOST_APPLICATION: "hostApplication"
  };

  function CSInterface() {}

  CSInterface.prototype.evalScript = function (script, callback) {
    if (window.__adobe_cep__ && window.__adobe_cep__.evalScript) {
      window.__adobe_cep__.evalScript(script, callback || function () {});
      return;
    }

    console.warn("CEP evalScript is not available. Running in browser preview mode.");
    if (callback) {
      callback(JSON.stringify({
        ok: false,
        message: "After Effects bridge is only available inside CEP."
      }));
    }
  };

  CSInterface.prototype.getSystemPath = function (name) {
    if (window.__adobe_cep__ && window.__adobe_cep__.getSystemPath) {
      return window.__adobe_cep__.getSystemPath(name);
    }
    return "";
  };

  CSInterface.prototype.getHostEnvironment = function () {
    if (window.__adobe_cep__ && window.__adobe_cep__.getHostEnvironment) {
      var raw = window.__adobe_cep__.getHostEnvironment();
      if (typeof raw === "string") {
        try { return JSON.parse(raw); } catch (error) {}
      }
      return raw || {};
    }
    return {};
  };

  CSInterface.prototype.openURLInDefaultBrowser = function (url) {
    if (window.cep && window.cep.util && window.cep.util.openURLInDefaultBrowser) {
      window.cep.util.openURLInDefaultBrowser(url);
      return;
    }
    if (window.__adobe_cep__ && window.__adobe_cep__.openURLInDefaultBrowser) {
      window.__adobe_cep__.openURLInDefaultBrowser(url);
    }
  };

  window.SystemPath = window.SystemPath || SystemPath;
  window.CSInterface = window.CSInterface || CSInterface;
})();
