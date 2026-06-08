var SORI_TOOLS = SORI_TOOLS || {};
SORI_TOOLS.UNPRECOMP_DEBUG_VERSION = "precomp-displaystart-safe-2026-05-24-10";
// Set this to false if you prefer keeping the original precomp layer muted
// after extraction instead of deleting it.
SORI_TOOLS.DELETE_ORIGINAL_PRECOMP_ON_UNPRECOMP = true;
// Create tmp/debug-enabled.txt or set this to true when you need precomp logs.
SORI_TOOLS.DEBUG = false;
SORI_TOOLS.FX_RESTORE_STATE_VERSION = 1;
SORI_TOOLS.effectControlRestoreState = SORI_TOOLS.effectControlRestoreState || {};
SORI_TOOLS.effectControlRestoreStateLoaded = SORI_TOOLS.effectControlRestoreStateLoaded || false;

SORI_TOOLS.getExtensionRoot = function () {
  try {
    if (SORI_TOOLS.cepExtensionRoot) return String(SORI_TOOLS.cepExtensionRoot).replace(/\\/g, "/");
  } catch (e0) {}
  try {
    var scriptFile = new File($.fileName);
    var root = scriptFile.parent.parent.parent.fsName;
    var rootText = String(root || "").replace(/\\/g, "/").toLowerCase();
    if (root && rootText.indexOf("/adobe") < 0) return root;
  } catch (e) {}
  return "";
};

SORI_TOOLS.tmpFolder = function () {
  var candidates = [];
  try {
    if (Folder.temp) candidates.push(new Folder(Folder.temp.fsName + "/sori-tools"));
  } catch (e) {}
  try {
    if (Folder.userData) candidates.push(new Folder(Folder.userData.fsName + "/sori-tools"));
  } catch (e2) {}
  try {
    var root = SORI_TOOLS.getExtensionRoot();
    if (root) candidates.push(new Folder(root + "/tmp"));
  } catch (e3) {}
  for (var i = 0; i < candidates.length; i += 1) {
    try {
      var folder = candidates[i];
      if (!folder) continue;
      if (!folder.exists) folder.create();
      return folder;
    } catch (e4) {}
  }
  return null;
};

SORI_TOOLS.tmpFile = function (name) {
  try {
    var folder = SORI_TOOLS.tmpFolder();
    if (!folder) return null;
    return new File(folder.fsName + "/" + name);
  } catch (e) {}
  return null;
};

SORI_TOOLS.readTextFile = function (name) {
  var file = null;
  try {
    file = SORI_TOOLS.tmpFile(name);
    if (!file || !file.exists) return "";
    file.encoding = "UTF-8";
    if (!file.open("r")) return "";
    var text = file.read();
    try { file.close(); } catch (closeError) {}
    return text;
  } catch (e) {
    try { if (file) file.close(); } catch (closeError2) {}
  }
  return "";
};

SORI_TOOLS.writeTextFile = function (name, text) {
  var file = null;
  try {
    file = SORI_TOOLS.tmpFile(name);
    if (!file) return false;
    file.encoding = "UTF-8";
    if (!file.open("w")) return false;
    file.write(String(text || ""));
    try { file.close(); } catch (closeError) {}
    return true;
  } catch (e) {
    try { if (file) file.close(); } catch (closeError2) {}
  }
  return false;
};

SORI_TOOLS.debugEnabled = function () {
  if (SORI_TOOLS.DEBUG === true) return true;
  try {
    var file = SORI_TOOLS.tmpFile("debug-enabled.txt");
    return file && file.exists;
  } catch (e) {}
  return false;
};

SORI_TOOLS.writeDebugFile = function (name, data) {
  if (!SORI_TOOLS.debugEnabled()) return;
  SORI_TOOLS.writeTextFile(name, SORI_TOOLS.stringify(data));
};

SORI_TOOLS.stringify = function (value) {
  if (value === null || value === undefined) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return isFinite(value) ? String(value) : "null";
  if (typeof value === "string") {
    return '"' + value
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")
      .replace(/\t/g, "\\t") + '"';
  }
  var isArray = false;
  try { isArray = value instanceof Array; } catch (eArray) {}
  try { if (!isArray && Object.prototype.toString.call(value) === "[object Array]") isArray = true; } catch (eArray2) {}
  if (isArray) {
    var arr = [];
    for (var i = 0; i < value.length; i += 1) arr.push(SORI_TOOLS.stringify(value[i]));
    return "[" + arr.join(",") + "]";
  }
  if (typeof value === "object") {
    var parts = [];
    for (var k in value) {
      try {
        if (value.hasOwnProperty && value.hasOwnProperty(k)) parts.push(SORI_TOOLS.stringify(String(k)) + ':' + SORI_TOOLS.stringify(value[k]));
      } catch (e) {}
    }
    return "{" + parts.join(",") + "}";
  }
  return "null";
};

SORI_TOOLS.parse = function (value) {
  try {
    if (typeof JSON !== "undefined" && JSON.parse) return JSON.parse(value);
  } catch (e) {}
  try {
    var text = String(value || "");
    if (!text.match(/^\s*[\{\[\"0-9tfn\-]/)) return {};
    return eval("(" + text + ")");
  } catch (e2) {
    return {};
  }
};

SORI_TOOLS.respond = function (ok, message, data) {
  return SORI_TOOLS.stringify({ ok: ok, message: message || "", data: data || null });
};

SORI_TOOLS.comp = function () {
  try {
    var item = app.project && app.project.activeItem;
    if (item && item instanceof CompItem) return item;
  } catch (e) {}
  return null;
};

SORI_TOOLS.selectedLayers = function (comp) {
  var out = [];
  try {
    var sel = comp.selectedLayers;
    if (sel) {
      for (var i = 0; i < sel.length; i += 1) out.push(sel[i]);
    }
  } catch (e) {}
  out.sort(function (a, b) { return a.index - b.index; });
  return out;
};

SORI_TOOLS.snapshotCompLayers = function (comp) {
  var refs = [];
  try {
    for (var i = 1; i <= comp.numLayers; i += 1) refs.push(comp.layer(i));
  } catch (e) {}
  return refs;
};

SORI_TOOLS.findInsertedCompLayer = function (comp, beforeRefs) {
  var selected = [];
  try { selected = comp.selectedLayers || []; } catch (e) {}

  for (var s = 0; s < selected.length; s += 1) {
    var selectedLayer = selected[s];
    var seenSelected = false;
    for (var bs = 0; bs < beforeRefs.length; bs += 1) {
      if (beforeRefs[bs] === selectedLayer) {
        seenSelected = true;
        break;
      }
    }
    if (!seenSelected) return selectedLayer;
  }

  try {
    for (var i = 1; i <= comp.numLayers; i += 1) {
      var layer = comp.layer(i);
      var seen = false;
      for (var j = 0; j < beforeRefs.length; j += 1) {
        if (beforeRefs[j] === layer) {
          seen = true;
          break;
        }
      }
      if (!seen) return layer;
    }
  } catch (e2) {}

  return null;
};

SORI_TOOLS.isAVLayer = function (layer) {
  try { return layer instanceof AVLayer; } catch (e) {}
  return false;
};

SORI_TOOLS.isShapeLayer = function (layer) {
  try { return layer instanceof ShapeLayer; } catch (e) {}
  return false;
};

SORI_TOOLS.isTextLayer = function (layer) {
  try { return layer instanceof TextLayer; } catch (e) {}
  return false;
};

SORI_TOOLS.isCameraLayer = function (layer) {
  try { return layer instanceof CameraLayer; } catch (e) {}
  return false;
};

SORI_TOOLS.isLightLayer = function (layer) {
  try { return layer instanceof LightLayer; } catch (e) {}
  return false;
};

SORI_TOOLS.isNullLayer = function (layer) {
  try { return layer.nullLayer === true; } catch (e) {}
  return false;
};

SORI_TOOLS.isAdjustmentLayer = function (layer) {
  try { return layer.adjustmentLayer === true; } catch (e) {}
  return false;
};

SORI_TOOLS.isGuideLayer = function (layer) {
  try { return layer.guideLayer === true; } catch (e) {}
  return false;
};

SORI_TOOLS.is3DLayer = function (layer) {
  try { return layer.threeDLayer === true; } catch (e) {}
  return false;
};

SORI_TOOLS.isLocked = function (layer) {
  try { return layer.locked === true; } catch (e) {}
  return false;
};

SORI_TOOLS.isPrecomp = function (layer) {
  try {
    if (!layer || !layer.source) return false;
    if (layer.source instanceof CompItem) return true;
    if (layer.source.layers && layer.source.numLayers !== undefined && layer.source.width !== undefined && layer.source.height !== undefined) return true;
  } catch (e) {}
  return false;
};

SORI_TOOLS.hasTimeRemap = function (layer) {
  try { return layer.timeRemapEnabled === true; } catch (e) {}
  return false;
};

SORI_TOOLS.hasReverseStretch = function (layer) {
  try {
    var stretch = Number(layer.stretch);
    return isFinite(stretch) && stretch < 0;
  } catch (e) {}
  return false;
};

SORI_TOOLS.hasExpressions = function (property) {
  try { return property.expression && property.expression.length > 0; } catch (e) {}
  return false;
};

SORI_TOOLS.hasTransform = function (layer) {
  try {
    var t = layer.property("ADBE Transform Group");
    return t && t.property("ADBE Anchor Point") !== null;
  } catch (e) {}
  return false;
};

SORI_TOOLS.hasSeparatedPosition = function (layer) {
  try {
    var t = layer.property("ADBE Transform Group");
    var p = t.property("ADBE Position");
    return p && p.dimensionsSeparated === true;
  } catch (e) {}
  return false;
};

SORI_TOOLS.unlockIfNeeded = function (layer) {
  try {
    if (layer.locked) {
      layer.locked = false;
      return true;
    }
  } catch (e) {}
  return false;
};

SORI_TOOLS.relockIfNeeded = function (layer, wasLocked) {
  if (wasLocked) {
    try { layer.locked = true; } catch (e) {}
  }
};

SORI_TOOLS.boundsForLayer = function (layer, time) {
  var b = { left: 0, top: 0, width: 0, height: 0 };

  if (SORI_TOOLS.isNullLayer(layer)) {
    b.width = 100;
    b.height = 100;
    return b;
  }

  try {
    if ((SORI_TOOLS.isTextLayer(layer) || SORI_TOOLS.isShapeLayer(layer)) && typeof layer.sourceRectAtTime === "function") {
      var sr = layer.sourceRectAtTime(time, false);
      if (sr && (sr.width > 0 || sr.height > 0)) {
        b.left = sr.left;
        b.top = sr.top;
        b.width = sr.width;
        b.height = sr.height;
        return b;
      }
    }
  } catch (e) {}

  try {
    if (layer.source) {
      if (layer.source.width > 0 && layer.source.height > 0) {
        b.width = layer.source.width;
        b.height = layer.source.height;
        return b;
      }
    }
  } catch (e2) {}

  try {
    if (layer.width > 0 && layer.height > 0) {
      b.width = layer.width;
      b.height = layer.height;
      return b;
    }
  } catch (e3) {}

  try {
    if (typeof layer.sourceRectAtTime === "function") {
      var fallbackRect = layer.sourceRectAtTime(time, false);
      if (fallbackRect && (fallbackRect.width > 0 || fallbackRect.height > 0)) {
        b.left = fallbackRect.left;
        b.top = fallbackRect.top;
        b.width = fallbackRect.width;
        b.height = fallbackRect.height;
        return b;
      }
    }
  } catch (e4) {}

  try {
    var comp = layer.containingComp || SORI_TOOLS.comp();
    if (comp) {
      b.width = comp.width;
      b.height = comp.height;
    }
  } catch (e5) {}

  if (!b.width) b.width = 100;
  if (!b.height) b.height = 100;
  return b;
};

SORI_TOOLS.anchorPointFor = function (layer, code) {
  var comp = layer.containingComp || SORI_TOOLS.comp();
  var time = comp ? comp.time : 0;
  var b = SORI_TOOLS.boundsForLayer(layer, time);
  var x = b.left;
  var y = b.top;

  var col = code.charAt(1);
  var row = code.charAt(0);

  if (col === "c") x += b.width / 2;
  else if (col === "r") x += b.width;

  if (row === "c") y += b.height / 2;
  else if (row === "b") y += b.height;

  return [x, y];
};

SORI_TOOLS.layerPointToWorld = function (layer, point, time) {
  try {
    if (typeof layer.toWorld === "function") return layer.toWorld(point, time);
  } catch (e) {}
  try {
    if (typeof layer.sourcePointToComp === "function") return layer.sourcePointToComp(point);
  } catch (e2) {}
  try {
    if (typeof layer.toComp === "function") return layer.toComp(point, time);
  } catch (e3) {}
  return point;
};

SORI_TOOLS.worldPointToPosition = function (layer, point, time, positionLength) {
  var out = point;
  try {
    if (layer.parent && typeof layer.parent.fromWorld === "function") {
      out = layer.parent.fromWorld(point, time);
    }
  } catch (e) {}

  if (!out || out.length === undefined) out = point;
  if (positionLength === 2) return [out[0], out[1]];
  if (positionLength === 3) return [out[0], out[1], out.length > 2 ? out[2] : 0];
  return out;
};

SORI_TOOLS.getPositionProp = function (layer) {
  try {
    var t = layer.property("ADBE Transform Group");
    return t ? t.property("ADBE Position") : null;
  } catch (e) {}
  return null;
};

SORI_TOOLS.valueAt = function (property, time) {
  try {
    if (property && property.numKeys && property.numKeys > 0 && typeof property.valueAtTime === "function") {
      return property.valueAtTime(time, false);
    }
  } catch (e) {}
  try { return property.value; } catch (e2) {}
  return null;
};

SORI_TOOLS.setValueAt = function (property, value, time) {
  try {
    if (property && property.numKeys && property.numKeys > 0 && typeof property.setValueAtTime === "function") {
      property.setValueAtTime(time, value);
      return;
    }
  } catch (e) {}
  try { property.setValue(value); } catch (e2) {}
};

SORI_TOOLS.getPositionValue = function (layer) {
  try {
    var posProp = SORI_TOOLS.getPositionProp(layer);
    if (!posProp) return null;
    if (posProp.dimensionsSeparated) {
      var x = 0, y = 0, z = 0;
      try {
        var xp = posProp.getSeparationFollower(0);
        if (xp) x = xp.value;
      } catch (e) {}
      try {
        var yp = posProp.getSeparationFollower(1);
        if (yp) y = yp.value;
      } catch (e2) {}
      try {
        var zp = posProp.getSeparationFollower(2);
        if (zp) z = zp.value;
      } catch (e3) {}
      return SORI_TOOLS.is3DLayer(layer) ? [x, y, z] : [x, y];
    }
    return posProp.value;
  } catch (e4) {}
  return null;
};

SORI_TOOLS.setPositionValue = function (layer, pos) {
  try {
    var posProp = SORI_TOOLS.getPositionProp(layer);
    if (!posProp) return;
    if (posProp.dimensionsSeparated) {
      try {
        var xp = posProp.getSeparationFollower(0);
        if (xp) xp.setValue(pos[0]);
      } catch (e) {}
      try {
        var yp = posProp.getSeparationFollower(1);
        if (yp) yp.setValue(pos[1]);
      } catch (e2) {}
      if (pos.length > 2) {
        try {
          var zp = posProp.getSeparationFollower(2);
          if (zp) zp.setValue(pos[2]);
        } catch (e3) {}
      }
    } else {
      posProp.setValue(pos);
    }
  } catch (e4) {}
};

SORI_TOOLS.setPositionValueAt = function (layer, pos, time) {
  try {
    var posProp = SORI_TOOLS.getPositionProp(layer);
    if (!posProp) return;
    if (posProp.dimensionsSeparated) {
      try {
        var xp = posProp.getSeparationFollower(0);
        if (xp) SORI_TOOLS.setValueAt(xp, pos[0], time);
      } catch (e) {}
      try {
        var yp = posProp.getSeparationFollower(1);
        if (yp) SORI_TOOLS.setValueAt(yp, pos[1], time);
      } catch (e2) {}
      if (pos.length > 2) {
        try {
          var zp = posProp.getSeparationFollower(2);
          if (zp) SORI_TOOLS.setValueAt(zp, pos[2], time);
        } catch (e3) {}
      }
    } else {
      SORI_TOOLS.setValueAt(posProp, pos, time);
    }
  } catch (e4) {}
};

SORI_TOOLS.propertyValueAt = function (group, matchName, fallbackName, time) {
  var prop = null;
  try { prop = group.property(matchName); } catch (e) {}
  if (!prop && fallbackName) {
    try { prop = group.property(fallbackName); } catch (e2) {}
  }
  return SORI_TOOLS.valueAt(prop, time);
};

SORI_TOOLS.anchorPositionDelta = function (layer, oldAnchor, nextAnchor, time, positionLength) {
  var transform = layer.property("ADBE Transform Group");
  var scale = SORI_TOOLS.propertyValueAt(transform, "ADBE Scale", "Scale", time) || [100, 100, 100];
  var rotationValue = SORI_TOOLS.propertyValueAt(transform, "ADBE Rotate Z", "ADBE Rotation", time);
  var rotation = rotationValue !== null && rotationValue !== undefined ? rotationValue : 0;

  var dx = (nextAnchor[0] - oldAnchor[0]) * ((scale[0] !== undefined ? scale[0] : 100) / 100);
  var dy = (nextAnchor[1] - oldAnchor[1]) * ((scale[1] !== undefined ? scale[1] : 100) / 100);
  var dz = 0;

  if (positionLength > 2) {
    dz = ((nextAnchor[2] || 0) - (oldAnchor[2] || 0)) * ((scale[2] !== undefined ? scale[2] : 100) / 100);
  }

  if (!SORI_TOOLS.is3DLayer(layer) && rotation) {
    var radians = rotation * Math.PI / 180;
    var cos = Math.cos(radians);
    var sin = Math.sin(radians);
    var rx = (dx * cos) - (dy * sin);
    var ry = (dx * sin) + (dy * cos);
    dx = rx;
    dy = ry;
  }

  if (positionLength > 2) return [dx, dy, dz];
  return [dx, dy];
};

SORI_TOOLS.fitPositionDelta = function (delta, positionLength) {
  var x = delta && delta.length > 0 && delta[0] !== undefined ? delta[0] : 0;
  var y = delta && delta.length > 1 && delta[1] !== undefined ? delta[1] : 0;
  if (positionLength > 2) {
    var z = delta && delta.length > 2 && delta[2] !== undefined ? delta[2] : 0;
    return [x, y, z];
  }
  return [x, y];
};

SORI_TOOLS.anchorPositionDeltaSafe = function (layer, oldAnchor, nextAnchor, time, positionLength) {
  var localDelta = [
    nextAnchor[0] - oldAnchor[0],
    nextAnchor[1] - oldAnchor[1],
    (nextAnchor.length > 2 ? nextAnchor[2] : 0) - (oldAnchor.length > 2 ? oldAnchor[2] : 0)
  ];

  try {
    if (typeof layer.toWorldVec === "function") {
      var worldDelta = layer.toWorldVec(localDelta, time);
      if (layer.parent && typeof layer.parent.fromWorldVec === "function") {
        return SORI_TOOLS.fitPositionDelta(layer.parent.fromWorldVec(worldDelta, time), positionLength);
      }
      return SORI_TOOLS.fitPositionDelta(worldDelta, positionLength);
    }
  } catch (e) {}

  return SORI_TOOLS.anchorPositionDelta(layer, oldAnchor, nextAnchor, time, positionLength);
};

SORI_TOOLS.addPositionDelta = function (position, delta) {
  var out = [];
  for (var i = 0; i < position.length; i += 1) {
    out[i] = position[i] + (delta[i] || 0);
  }
  return out;
};

SORI_TOOLS.addScalarDelta = function (value, delta) {
  value = Number(value);
  delta = Number(delta);
  if (!isFinite(value)) value = 0;
  if (!isFinite(delta)) delta = 0;
  return value + delta;
};

SORI_TOOLS.localAnchorDelta = function (oldAnchor, nextAnchor) {
  return [
    (nextAnchor && nextAnchor.length > 0 ? nextAnchor[0] : 0) - (oldAnchor && oldAnchor.length > 0 ? oldAnchor[0] : 0),
    (nextAnchor && nextAnchor.length > 1 ? nextAnchor[1] : 0) - (oldAnchor && oldAnchor.length > 1 ? oldAnchor[1] : 0),
    (nextAnchor && nextAnchor.length > 2 ? nextAnchor[2] : 0) - (oldAnchor && oldAnchor.length > 2 ? oldAnchor[2] : 0)
  ];
};

SORI_TOOLS.anchorDeltaAtTime = function (layer, localDelta, time, positionLength) {
  var transform = null;
  var anchorProp = null;
  var oldAnchor = null;
  try {
    transform = layer.property("ADBE Transform Group");
    anchorProp = transform ? transform.property("ADBE Anchor Point") : null;
    oldAnchor = SORI_TOOLS.valueAt(anchorProp, time);
  } catch (e) {}
  if (!oldAnchor) {
    try { oldAnchor = anchorProp.value; } catch (e2) {}
  }
  if (!oldAnchor) oldAnchor = [0, 0, 0];

  var nextAnchor = [
    (oldAnchor.length > 0 ? oldAnchor[0] : 0) + (localDelta && localDelta.length > 0 ? localDelta[0] : 0),
    (oldAnchor.length > 1 ? oldAnchor[1] : 0) + (localDelta && localDelta.length > 1 ? localDelta[1] : 0),
    (oldAnchor.length > 2 ? oldAnchor[2] : 0) + (localDelta && localDelta.length > 2 ? localDelta[2] : 0)
  ];

  try {
    if (typeof layer.toComp === "function") {
      var oldComp = layer.toComp(oldAnchor, time);
      var nextComp = layer.toComp(nextAnchor, time);
      var out = [nextComp[0] - oldComp[0], nextComp[1] - oldComp[1], (nextComp.length > 2 ? nextComp[2] : 0) - (oldComp.length > 2 ? oldComp[2] : 0)];
      try {
        if (layer.parent && typeof layer.parent.fromComp === "function") {
          var parentOld = layer.parent.fromComp(oldComp, time);
          var parentNext = layer.parent.fromComp(nextComp, time);
          out = [parentNext[0] - parentOld[0], parentNext[1] - parentOld[1], (parentNext.length > 2 ? parentNext[2] : 0) - (parentOld.length > 2 ? parentOld[2] : 0)];
        }
      } catch (eParent) {}
      return SORI_TOOLS.fitPositionDelta(out, positionLength);
    }
  } catch (e3) {}

  return SORI_TOOLS.anchorPositionDeltaSafe(layer, oldAnchor, nextAnchor, time, positionLength);
};

SORI_TOOLS.setAnchorNoNewKeys = function (anchorProp, nextAnchor, localDelta) {
  if (!anchorProp) return false;
  try {
    if (anchorProp.numKeys && anchorProp.numKeys > 0 && typeof anchorProp.setValueAtKey === "function") {
      for (var k = 1; k <= anchorProp.numKeys; k += 1) {
        var keyValue = anchorProp.keyValue(k);
        if (keyValue && keyValue.length !== undefined) {
          anchorProp.setValueAtKey(k, SORI_TOOLS.addPositionDelta(keyValue, localDelta));
        }
      }
      return true;
    }
  } catch (e) {}
  try {
    anchorProp.setValue(nextAnchor);
    return true;
  } catch (e2) {}
  return false;
};

SORI_TOOLS.shiftPositionFollowerNoNewKeys = function (prop, layer, localDelta, compTime, positionLength, dimensionIndex) {
  if (!prop) return;
  var currentDelta = SORI_TOOLS.anchorDeltaAtTime(layer, localDelta, compTime, positionLength);
  try {
    if (prop.numKeys && prop.numKeys > 0 && typeof prop.setValueAtKey === "function") {
      for (var k = 1; k <= prop.numKeys; k += 1) {
        prop.setValueAtKey(k, SORI_TOOLS.addScalarDelta(prop.keyValue(k), currentDelta[dimensionIndex] || 0));
      }
      return;
    }
  } catch (e) {}
  try {
    prop.setValue(SORI_TOOLS.addScalarDelta(prop.value, currentDelta[dimensionIndex] || 0));
  } catch (e2) {}
};

SORI_TOOLS.adjustPositionForAnchorNoNewKeys = function (layer, localDelta, compTime, positionLength) {
  var posProp = SORI_TOOLS.getPositionProp(layer);
  if (!posProp) return;

  try {
    if (posProp.dimensionsSeparated) {
      var xp = null;
      var yp = null;
      var zp = null;
      try { xp = posProp.getSeparationFollower(0); } catch (ex) {}
      try { yp = posProp.getSeparationFollower(1); } catch (ey) {}
      try { zp = posProp.getSeparationFollower(2); } catch (ez) {}

      SORI_TOOLS.shiftPositionFollowerNoNewKeys(xp, layer, localDelta, compTime, positionLength, 0);
      SORI_TOOLS.shiftPositionFollowerNoNewKeys(yp, layer, localDelta, compTime, positionLength, 1);
      if (positionLength > 2) SORI_TOOLS.shiftPositionFollowerNoNewKeys(zp, layer, localDelta, compTime, positionLength, 2);
      return;
    }
  } catch (e) {}

  try {
    var currentDelta = SORI_TOOLS.anchorDeltaAtTime(layer, localDelta, compTime, positionLength);
    if (posProp.numKeys && posProp.numKeys > 0 && typeof posProp.setValueAtKey === "function") {
      for (var k = 1; k <= posProp.numKeys; k += 1) {
        var keyValue = posProp.keyValue(k);
        posProp.setValueAtKey(k, SORI_TOOLS.addPositionDelta(keyValue, currentDelta));
      }
      return;
    }
  } catch (e2) {}

  try {
    var value = posProp.value;
    var fallbackDelta = SORI_TOOLS.anchorDeltaAtTime(layer, localDelta, compTime, value && value.length !== undefined ? value.length : positionLength);
    posProp.setValue(SORI_TOOLS.addPositionDelta(value, fallbackDelta));
  } catch (e3) {}
};

SORI_TOOLS.setAnchor = function (code) {
  var comp = SORI_TOOLS.comp();
  if (!comp) return SORI_TOOLS.respond(false, "No active composition.");
  var layers = SORI_TOOLS.selectedLayers(comp);
  if (!layers.length) return SORI_TOOLS.respond(false, "Select at least one layer.");

  app.beginUndoGroup("SoriTools Anchor Point");
  var count = 0;
  var skipped = 0;

  for (var i = 0; i < layers.length; i += 1) {
    var layer = layers[i];
    var wasLocked = SORI_TOOLS.unlockIfNeeded(layer);
    try {
      if (!SORI_TOOLS.hasTransform(layer)) {
        skipped += 1;
        SORI_TOOLS.relockIfNeeded(layer, wasLocked);
        continue;
      }

      if (SORI_TOOLS.isCameraLayer(layer) || SORI_TOOLS.isLightLayer(layer)) {
        skipped += 1;
        SORI_TOOLS.relockIfNeeded(layer, wasLocked);
        continue;
      }

      var transform = layer.property("ADBE Transform Group");
      var anchorProp = transform.property("ADBE Anchor Point");
      var oldAnchor = SORI_TOOLS.valueAt(anchorProp, comp.time);
      if (!oldAnchor) oldAnchor = anchorProp.value;
      var nextAnchor = SORI_TOOLS.anchorPointFor(layer, code);

      if (oldAnchor.length > 2) {
        nextAnchor = [nextAnchor[0], nextAnchor[1], oldAnchor[2]];
      }

      var curPos = SORI_TOOLS.getPositionValue(layer);
      var localDelta = SORI_TOOLS.localAnchorDelta(oldAnchor, nextAnchor);

      if (curPos) {
        SORI_TOOLS.adjustPositionForAnchorNoNewKeys(layer, localDelta, comp.time, curPos.length);
      }
      SORI_TOOLS.setAnchorNoNewKeys(anchorProp, nextAnchor, localDelta);

      count += 1;
    } catch (e) {
      skipped += 1;
    }
    SORI_TOOLS.relockIfNeeded(layer, wasLocked);
  }

  app.endUndoGroup();
  if (count === 0) return SORI_TOOLS.respond(false, "No layers could be modified.");
  var msg = "Anchor set on " + count + " layer" + (count > 1 ? "s" : "") + ".";
  if (skipped > 0) msg += " Skipped " + skipped + ".";
  return SORI_TOOLS.respond(true, msg);
};

SORI_TOOLS.span = function (layers) {
  if (!layers.length) return null;
  var firstRange = SORI_TOOLS.makeTimeRange(layers[0].inPoint, layers[0].outPoint);
  var start = firstRange.start;
  var end = firstRange.end;
  for (var i = 1; i < layers.length; i += 1) {
    var range = SORI_TOOLS.makeTimeRange(layers[i].inPoint, layers[i].outPoint);
    if (range.start < start) start = range.start;
    if (range.end > end) end = range.end;
  }
  return { start: start, end: end };
};

SORI_TOOLS.clamp = function (value, min, max) {
  return Math.min(max, Math.max(min, value));
};

SORI_TOOLS.makeTimeRange = function (a, b) {
  a = Number(a);
  b = Number(b);
  if (!isFinite(a)) a = 0;
  if (!isFinite(b)) b = a;
  return {
    start: Math.min(a, b),
    end: Math.max(a, b)
  };
};

SORI_TOOLS.rangeDuration = function (range) {
  if (!range) return 0;
  return Math.max(0, range.end - range.start);
};

SORI_TOOLS.intersectTimeRange = function (a, b) {
  if (!a || !b) return null;
  var start = Math.max(a.start, b.start);
  var end = Math.min(a.end, b.end);
  if (end <= start) return null;
  return { start: start, end: end };
};

SORI_TOOLS.rangeOverlapAmount = function (a, b) {
  return SORI_TOOLS.rangeDuration(SORI_TOOLS.intersectTimeRange(a, b));
};

SORI_TOOLS.topIndex = function (layers) {
  var top = layers[0].index;
  for (var i = 1; i < layers.length; i += 1) {
    if (layers[i].index < top) top = layers[i].index;
  }
  return top;
};

SORI_TOOLS.matchSpan = function (target, source) {
  var range = null;
  try { range = SORI_TOOLS.makeTimeRange(source.inPoint, source.outPoint); } catch (erange) {}
  if (!range) {
    try { target.startTime = source.startTime; } catch (e) {}
    try { target.inPoint = source.inPoint; } catch (e2) {}
    try { target.outPoint = source.outPoint; } catch (e3) {}
    return;
  }
  try { target.startTime = range.start; } catch (estart) {}
  try { target.inPoint = range.start; } catch (ein) {}
  try { target.outPoint = range.end; } catch (eout) {}
};

SORI_TOOLS.setSpan = function (layer, inPoint, outPoint, startTime) {
  try { layer.startTime = startTime !== undefined ? startTime : inPoint; } catch (e) {}
  try { layer.inPoint = inPoint; } catch (e2) {}
  try { layer.outPoint = outPoint; } catch (e3) {}
};

SORI_TOOLS.cleanName = function (name) {
  var out = String(name || "Layer").replace(/[\\\/:*?"<>|]/g, "_");
  out = out.replace(/^\s+|\s+$/g, "");
  return out || "Layer";
};

SORI_TOOLS.projectItemNameExists = function (name) {
  try {
    if (!app.project) return false;
    for (var i = 1; i <= app.project.numItems; i += 1) {
      if (app.project.item(i).name === name) return true;
    }
  } catch (e) {}
  return false;
};

SORI_TOOLS.uniqueProjectItemName = function (baseName) {
  var base = SORI_TOOLS.cleanName(baseName);
  var name = base;
  var n = 2;
  while (SORI_TOOLS.projectItemNameExists(name)) {
    name = base + "_" + n;
    n += 1;
  }
  return name;
};

SORI_TOOLS.findLayerBySource = function (comp, sourceComp) {
  try {
    for (var i = 1; i <= comp.numLayers; i += 1) {
      var layer = comp.layer(i);
      try {
        if (layer.source === sourceComp) return layer;
      } catch (e) {}
    }
  } catch (e2) {}
  return null;
};

SORI_TOOLS.setCompDisplayStart = function (sourceComp, start) {
  var frameDuration = 0;
  try {
    frameDuration = sourceComp.frameDuration || (sourceComp.frameRate ? 1 / sourceComp.frameRate : 0);
  } catch (e) {}

  try {
    if (sourceComp.displayStartFrame !== undefined && frameDuration > 0) {
      sourceComp.displayStartFrame = Math.round(start / frameDuration);
    }
  } catch (e2) {}
  try { sourceComp.displayStartTime = start; } catch (e3) {}
};

SORI_TOOLS.cachedCompLabelPreference = null;

SORI_TOOLS.activeAeVersionFolderName = function () {
  try {
    var ver = String(app.version || "");
    var match = ver.match(/^(\d+\.\d+)/);
    if (match && match[1]) return match[1];
  } catch (e) {}
  return "";
};

SORI_TOOLS.readCompLabelIndexFromPrefsFile = function () {
  try {
    var ver = SORI_TOOLS.activeAeVersionFolderName();
    if (!ver) return null;
    var path = Folder.userData.fsName + "/Adobe/After Effects/" + ver + "/Adobe After Effects " + ver + " Prefs-indep-general.txt";
    var file = new File(path);
    if (!file.exists) return null;
    file.encoding = "UTF-8";
    if (!file.open("r")) return null;
    var content = file.read();
    file.close();
    var match = content.match(/"Comp Label Index 2"\s*=\s*"(\d+)"/);
    if (match && match[1]) return Number(match[1]);
  } catch (e) {}
  return null;
};

SORI_TOOLS.defaultPrecompLabel = function (fallbackLabel) {
  if (SORI_TOOLS.cachedCompLabelPreference !== null) return SORI_TOOLS.cachedCompLabelPreference;

  var label = null;
  try {
    if (app.preferences && typeof app.preferences.getPrefAsLong === "function") {
      label = app.preferences.getPrefAsLong("Label Preference Indices Section 5", "Comp Label Index 2", PREFType.PREF_Type_MACHINE_INDEPENDENT);
    }
  } catch (epref) {}

  if (label === null || label === undefined || !isFinite(Number(label)) || Number(label) < 1) {
    label = SORI_TOOLS.readCompLabelIndexFromPrefsFile();
  }

  if (label === null || label === undefined || !isFinite(Number(label)) || Number(label) < 1) {
    label = fallbackLabel;
  }

  SORI_TOOLS.cachedCompLabelPreference = label;
  return label;
};

SORI_TOOLS.normalizePrecompSourceToLocalSpan = function (sourceComp, spanStart) {
  var offset = Number(spanStart) || 0;
  if (Math.abs(offset) < 0.0001) return;

  try {
    for (var i = 1; i <= sourceComp.numLayers; i += 1) {
      var layer = sourceComp.layer(i);
      var wasLocked = SORI_TOOLS.unlockIfNeeded(layer);
      try {
        var originalStart = Number(layer.startTime) || 0;
        var originalIn = Number(layer.inPoint) || 0;
        var originalOut = Number(layer.outPoint) || 0;

        // Native precompose leaves moved layers at their old parent comp time.
        // For clips that start later than 0, that makes the layer live near the
        // right edge of its new precomp. Shift the layer bars and every copied
        // keyframe into local comp time so the precomp opens cleanly at 0 while
        // the wrapper layer keeps the original parent timeline position.
        SORI_TOOLS.retimePropertyKeyframes(layer, -offset, 1);
        try { layer.startTime = originalStart - offset; } catch (estart) {}
        try { layer.inPoint = originalIn - offset; } catch (ein) {}
        try { layer.outPoint = originalOut - offset; } catch (eout) {}
      } catch (elayer) {}
      SORI_TOOLS.relockIfNeeded(layer, wasLocked);
    }
  } catch (e) {}
};

SORI_TOOLS.setCompNativeTrimAndWorkArea = function (sourceComp, start, duration) {
  // Mirrors AE's Pre-compose dialog with:
  // "Move all attributes" + "Adjust composition duration...", then normalizes
  // the new source comp to local 0-based time. The parent precomp layer carries
  // the original timeline position; the nested comp itself stays easy to edit.
  SORI_TOOLS.normalizePrecompSourceToLocalSpan(sourceComp, start);
  SORI_TOOLS.setCompDisplayStart(sourceComp, 0);
  try { sourceComp.duration = duration; } catch (e) {}
  SORI_TOOLS.setCompDisplayStart(sourceComp, 0);
  try {
    sourceComp.workAreaStart = 0;
    sourceComp.workAreaDuration = duration;
  } catch (e4) {}
  return true;
};

SORI_TOOLS.adjustPrecompLayerToSpan = function (sourceComp, preLayer, snap, comp) {
  var duration = Math.max(comp.frameDuration, snap.outPoint - snap.inPoint);

  // Check whether the source comp will be normalized to local zero or kept at
  // its native precompose timebase.  This mirrors the same condition used by
  // setCompNativeTrimAndWorkArea so both decisions stay in sync.
  var wasNormalized = true;

  try {
    if (sourceComp && sourceComp instanceof CompItem) {
      wasNormalized = SORI_TOOLS.setCompNativeTrimAndWorkArea(sourceComp, snap.inPoint, duration);
    }
  } catch (e) {}

  if (preLayer) {
    try {
      if (wasNormalized) {
        // The nested comp was normalized to local 0-based time. The wrapper
        // layer's startTime carries the original parent position so that
        // parent inPoint maps to source time 0 where the inner layers now sit.
        preLayer.startTime = snap.inPoint;
        preLayer.inPoint = snap.inPoint;
        preLayer.outPoint = snap.outPoint;
      } else {
        // For risky timing such as reverse stretch, keep the source comp on
        // AE's native timing. Only trim the wrapper bar to the visible selected
        // span; forcing startTime/stretch here double-applies the reversal.
        preLayer.inPoint = snap.inPoint;
        preLayer.outPoint = snap.outPoint;
      }
      var nextLabel = SORI_TOOLS.defaultPrecompLabel(snap.label);
      if (nextLabel !== undefined && nextLabel !== null) preLayer.label = nextLabel;
    } catch (e2) {}
  }
};

SORI_TOOLS.debugPrecompState = function (preLayer, sourceComp, snap) {
  var state = { snap: snap || {}, preLayer: {}, sourceComp: {}, inner: [] };
  try {
    if (preLayer) {
      state.preLayer.name = preLayer.name;
      state.preLayer.index = preLayer.index;
      state.preLayer.startTime = preLayer.startTime;
      state.preLayer.inPoint = preLayer.inPoint;
      state.preLayer.outPoint = preLayer.outPoint;
      state.preLayer.stretch = preLayer.stretch;
    }
  } catch (e) {}

  try {
    if (sourceComp) {
      state.sourceComp.name = sourceComp.name;
      state.sourceComp.duration = sourceComp.duration;
      state.sourceComp.displayStartTime = sourceComp.displayStartTime;
      try { state.sourceComp.displayStartFrame = sourceComp.displayStartFrame; } catch (eframe) {}
      state.sourceComp.workAreaStart = sourceComp.workAreaStart;
      state.sourceComp.workAreaDuration = sourceComp.workAreaDuration;
      state.sourceComp.numLayers = sourceComp.numLayers;
      for (var i = 1; i <= sourceComp.numLayers && i <= 10; i += 1) {
        var inner = sourceComp.layer(i);
        var entry = {
          index: i,
          name: inner.name,
          startTime: inner.startTime,
          inPoint: inner.inPoint,
          outPoint: inner.outPoint
        };
        try { entry.stretch = inner.stretch; } catch (estretch) {}
        try { entry.hasTimeRemap = SORI_TOOLS.hasTimeRemap(inner); } catch (etimeremap) {}
        try { entry.timeRemapEnabled = inner.timeRemapEnabled === true; } catch (etimeremap2) {}
        try { entry.audioEnabled = inner.audioEnabled === true; } catch (eaudio) {}
        try { entry.hasAudio = inner.hasAudio === true; } catch (ehasaudio) {}
        try { entry.sourceName = inner.source ? inner.source.name : ""; } catch (esource) {}
        try { entry.sourceDuration = inner.source ? inner.source.duration : null; } catch (esourcedur) {}
        try { entry.sourceHasAudio = inner.source ? inner.source.hasAudio === true : false; } catch (esourceaudio) {}
        state.inner.push(entry);
      }
    }
  } catch (e2) {}

  return state;
};

SORI_TOOLS.scanRiskyExpressions = function (layer) {
  var warnings = [];
  var patterns = ["thisComp", "time", "valueAtTime", "layer(", "marker", "timeToFrames", "framesToTime"];

  function scanProp(prop, path) {
    try {
      if (!prop) return;
      if (prop.propertyType === PropertyType.PROPERTY) {
        var expr = "";
        try { expr = String(prop.expression || ""); } catch (eexpr) {}
        if (expr) {
          var hits = [];
          for (var h = 0; h < patterns.length; h += 1) {
            if (expr.indexOf(patterns[h]) >= 0) hits.push(patterns[h]);
          }
          if (hits.length) warnings.push({ property: path, hits: hits.join(", ") });
        }
        return;
      }
      if (prop.numProperties) {
        for (var i = 1; i <= prop.numProperties; i += 1) {
          var child = prop.property(i);
          var childName = "";
          try { childName = child.name || child.matchName || String(i); } catch (ename) { childName = String(i); }
          scanProp(child, path ? path + " > " + childName : childName);
        }
      }
    } catch (e) {}
  }

  try { scanProp(layer, layer.name || "Layer"); } catch (escan) {}
  return warnings;
};

SORI_TOOLS.addPrecompRiskDebug = function (debug, layers) {
  if (!debug || !layers) return;
  for (var i = 0; i < layers.length; i += 1) {
    try {
      var layer = layers[i];
      var warnings = SORI_TOOLS.scanRiskyExpressions(layer);
      if (warnings.length) {
        debug.events.push({ action: "expression-warning", layer: layer.name, warnings: warnings });
      }
      if (layer.parent) {
        debug.events.push({ action: "parent-warning", layer: layer.name, parent: layer.parent.name });
      }
      if (SORI_TOOLS.hasTimeRemap(layer)) {
        debug.events.push({ action: "time-remap-info", layer: layer.name });
      }
      if (SORI_TOOLS.hasReverseStretch(layer)) {
        debug.events.push({ action: "reverse-stretch-info", layer: layer.name });
      }
    } catch (e) {}
  }
};

SORI_TOOLS.precompRiskSummary = function () {
  var comp = SORI_TOOLS.comp();
  if (!comp) return SORI_TOOLS.respond(false, "No active composition.");
  var layers = SORI_TOOLS.selectedLayers(comp);
  if (!layers.length) return SORI_TOOLS.respond(false, "Select at least one layer.");
  var risky = [];
  for (var i = 0; i < layers.length; i += 1) {
    try {
      var layer = layers[i];
      var reasons = SORI_TOOLS.layerRiskReasons(layer);
      if (SORI_TOOLS.layerHasRiskyKeyedEffects(layer)) reasons.push("third-party keyed/effect expression");
      if (reasons.length) risky.push({ name: String(layer.name || ("Layer " + layer.index)), reasons: reasons });
    } catch (e) {}
  }
  return SORI_TOOLS.respond(true, "", { risky: risky, count: risky.length });
};

SORI_TOOLS.layerRiskReasons = function (layer) {
  var reasons = [];
  try { if (SORI_TOOLS.isLocked(layer)) reasons.push("locked"); } catch (e0) {}
  try { if (SORI_TOOLS.scanRiskyExpressions(layer).length) reasons.push("expression refs time/layer/comp"); } catch (e1) {}
  try { if (layer.parent) reasons.push("parented"); } catch (e2) {}
  try { if (SORI_TOOLS.hasTimeRemap(layer)) reasons.push("time remap"); } catch (e3) {}
  try { if (SORI_TOOLS.hasReverseStretch(layer)) reasons.push("reverse stretch"); } catch (e4) {}
  try { if (SORI_TOOLS.hasSeparatedPosition(layer)) reasons.push("separated position"); } catch (e5) {}
  try { if (SORI_TOOLS.is3DLayer(layer)) reasons.push("3D layer"); } catch (e6) {}
  try { if (SORI_TOOLS.isCameraLayer(layer) || SORI_TOOLS.isLightLayer(layer)) reasons.push("camera/light"); } catch (e7) {}
  try { if (layer.source && layer.source.file && !layer.source.file.exists) reasons.push("missing source"); } catch (e8) {}
  return reasons;
};

SORI_TOOLS.selectedLayerRiskSummary = function () {
  var comp = SORI_TOOLS.comp();
  if (!comp) return SORI_TOOLS.respond(false, "No active composition.");
  var layers = SORI_TOOLS.selectedLayers(comp);
  if (!layers.length) return SORI_TOOLS.respond(false, "Select at least one layer.");
  var risky = [];
  for (var i = 0; i < layers.length; i += 1) {
    try {
      var layer = layers[i];
      var reasons = SORI_TOOLS.layerRiskReasons(layer);
      if (reasons.length) risky.push({ name: String(layer.name || ("Layer " + layer.index)), reasons: reasons });
    } catch (e) {}
  }
  return SORI_TOOLS.respond(true, "", { risky: risky, count: risky.length, selected: layers.length });
};

SORI_TOOLS.addMakerLayer = function (comp, type, duration) {
  var dur = Math.max(comp.frameDuration, duration || comp.duration || comp.frameDuration);
  var layer = null;

  if (type === "null") {
    layer = comp.layers.addNull();
    try { layer.name = "Null"; } catch (e) {}
  } else if (type === "adjustment") {
    layer = comp.layers.addSolid(
      [1, 1, 1], "Adjustment Layer",
      comp.width, comp.height, comp.pixelAspect, dur
    );
    try { layer.adjustmentLayer = true; } catch (e2) {}
    try { layer.label = 5; } catch (e3) {}
  } else if (type === "solid") {
    layer = comp.layers.addSolid(
      [1, 1, 1], "Solid",
      comp.width, comp.height, comp.pixelAspect, dur
    );
  } else if (type === "camera") {
    layer = comp.layers.addCamera("Camera", [comp.width / 2, comp.height / 2]);
  }

  return layer;
};

SORI_TOOLS.createSmartLayer = function (payload) {
  var data = SORI_TOOLS.parse(payload);
  var comp = SORI_TOOLS.comp();
  if (!comp) return SORI_TOOLS.respond(false, "No active composition.");
  var selected = SORI_TOOLS.selectedLayers(comp);
  var doParent = data.parent === true;
  var fullMode = data.full === true;
  var made = 0;

  app.beginUndoGroup("SoriTools Create Layer");

  try {
    if (data.type === "null" || data.type === "adjustment" || data.type === "solid" || data.type === "camera") {
      if (fullMode) {
        var fullLayer = SORI_TOOLS.addMakerLayer(comp, data.type, comp.duration);
        if (fullLayer) {
          SORI_TOOLS.setSpan(fullLayer, 0, comp.duration, 0);
          if (selected.length) {
            try { fullLayer.moveBefore(comp.layer(SORI_TOOLS.topIndex(selected))); } catch (e) {}
            if (data.type !== "camera") {
              try { fullLayer.threeDLayer = SORI_TOOLS.is3DLayer(selected[0]); } catch (e2) {}
            }
            if (doParent) {
              for (var p = 0; p < selected.length; p += 1) {
                try { selected[p].parent = fullLayer; } catch (e3) {}
              }
            }
          }
          made += 1;
        }
      } else if (selected.length) {
        for (var i = selected.length - 1; i >= 0; i -= 1) {
          var s = selected[i];
          var wasLocked = SORI_TOOLS.unlockIfNeeded(s);
          try {
            var sourceRange = SORI_TOOLS.makeTimeRange(s.inPoint, s.outPoint);
            var dur = Math.max(comp.frameDuration, SORI_TOOLS.rangeDuration(sourceRange));
            var created = SORI_TOOLS.addMakerLayer(comp, data.type, dur);
            if (!created) {
              SORI_TOOLS.relockIfNeeded(s, wasLocked);
              continue;
            }
            made += 1;
            SORI_TOOLS.matchSpan(created, s);
            created.moveBefore(s);
            if (data.type !== "camera") {
              try { created.threeDLayer = SORI_TOOLS.is3DLayer(s); } catch (e4) {}
            }
            if (doParent) {
              try { s.parent = created; } catch (e5) {}
            }
          } catch (e6) {}
          SORI_TOOLS.relockIfNeeded(s, wasLocked);
        }
      } else {
        var defaultLayer = SORI_TOOLS.addMakerLayer(comp, data.type, comp.duration);
        if (defaultLayer) {
          SORI_TOOLS.setSpan(defaultLayer, 0, comp.duration, 0);
          made += 1;
        }
      }
    } else {
      app.endUndoGroup();
      return SORI_TOOLS.respond(false, "Unknown layer type.");
    }
  } catch (e10) {
    app.endUndoGroup();
    return SORI_TOOLS.respond(false, "Failed: " + e10.message);
  }

  app.endUndoGroup();
  if (made === 0) return SORI_TOOLS.respond(false, "No layer was created.");
  return SORI_TOOLS.respond(true, "Created " + made + " layer" + (made > 1 ? "s" : "") + ".");
};

SORI_TOOLS.precompSelected = function (single) {
  var comp = SORI_TOOLS.comp();
  if (!comp) return SORI_TOOLS.respond(false, "No active composition.");
  var layers = SORI_TOOLS.selectedLayers(comp);
  var boostState = SORI_TOOLS.activeBoostState();
  if (!layers.length) return SORI_TOOLS.respond(false, "Select at least one layer.");
  var precompDebug = {
    version: SORI_TOOLS.UNPRECOMP_DEBUG_VERSION,
    compName: comp.name,
    mode: single ? "all-selected" : "each-layer",
    selectedCount: layers.length,
    events: []
  };
  SORI_TOOLS.addPrecompRiskDebug(precompDebug, layers);

  for (var u = 0; u < layers.length; u += 1) {
    SORI_TOOLS.unlockIfNeeded(layers[u]);
  }

  app.beginUndoGroup("SoriTools Precomp");

  try {
    if (single) {
      var indices = [];
      var groupLayerStates = [];
      var groupItems = [];
      for (var i = 0; i < layers.length; i += 1) {
        groupItems.push({
          index: layers[i].index,
          state: SORI_TOOLS.mergeBoostLayerState(boostState, comp, layers[i], SORI_TOOLS.collectLayerState(layers[i]))
        });
      }
      var span = SORI_TOOLS.span(layers);

      groupItems.sort(function (a, b) { return a.index - b.index; });
      for (var gi = 0; gi < groupItems.length; gi += 1) {
        indices.push(groupItems[gi].index);
        groupLayerStates.push(groupItems[gi].state);
      }
      var groupSnap = {
        inPoint: span.start,
        outPoint: span.end,
        name: layers.length === 1 ? layers[0].name : "Selected Layers",
        label: layers[0].label
      };
      var groupName = SORI_TOOLS.uniqueProjectItemName(SORI_TOOLS.cleanName(groupSnap.name) + "_precomp");
      var groupComp = comp.layers.precompose(indices, groupName, true);
      var groupLayer = SORI_TOOLS.findLayerBySource(comp, groupComp);
      if (groupLayer && groupLayerStates.length === 1) SORI_TOOLS.restoreLayerState(groupLayer, groupLayerStates[0]);
      try {
        for (var g = 0; g < groupLayerStates.length && g < groupComp.numLayers; g += 1) {
          SORI_TOOLS.restoreLayerState(groupComp.layer(g + 1), groupLayerStates[g]);
        }
      } catch (egroupRestore) {}
      if (boostState) {
        SORI_TOOLS.registerBoostPrecompState(boostState, comp, groupComp, groupLayerStates, groupLayer, groupLayerStates.length === 1 ? groupLayerStates[0] : null);
        SORI_TOOLS.applyBoostRules([groupComp], SORI_TOOLS.boostProfileSettings(boostState.profile || "strong"), boostState);
      }
      SORI_TOOLS.adjustPrecompLayerToSpan(groupComp, groupLayer, groupSnap, comp);
      SORI_TOOLS.promoteSingleAdjustmentPrecomp(groupComp, groupLayer, groupSnap, precompDebug);
      precompDebug.events.push(SORI_TOOLS.debugPrecompState(groupLayer, groupComp, groupSnap));
    } else {
      var snapshots = [];
      for (var s = 0; s < layers.length; s += 1) {
        var layerIn = Number(layers[s].inPoint);
        var layerOut = Number(layers[s].outPoint);
        if (!isFinite(layerIn)) layerIn = 0;
        if (!isFinite(layerOut)) layerOut = layerIn;
        snapshots.push({
          index: layers[s].index,
          name: layers[s].name,
          inPoint: Math.min(layerIn, layerOut),
          outPoint: Math.max(layerIn, layerOut),
          startTime: layers[s].startTime,
          label: layers[s].label,
          state: SORI_TOOLS.mergeBoostLayerState(boostState, comp, layers[s], SORI_TOOLS.collectLayerState(layers[s]))
        });
      }

      for (var j = snapshots.length - 1; j >= 0; j -= 1) {
        var snap = snapshots[j];
        try {
          var currentLayer = comp.layer(snap.index);
          if (!currentLayer) continue;
          var pcName = SORI_TOOLS.uniqueProjectItemName(SORI_TOOLS.cleanName(snap.name) + "_precomp");
          var pc = comp.layers.precompose([currentLayer.index], pcName, true);
          var pcLayer = SORI_TOOLS.findLayerBySource(comp, pc);
          if (pcLayer && snap.state) SORI_TOOLS.restoreLayerState(pcLayer, snap.state);
          SORI_TOOLS.restorePrecompInnerLayerState(pc, snap.state);
          if (boostState) {
            SORI_TOOLS.registerBoostPrecompState(boostState, comp, pc, [snap.state], pcLayer, snap.state);
            SORI_TOOLS.applyBoostRules([pc], SORI_TOOLS.boostProfileSettings(boostState.profile || "strong"), boostState);
          }
          SORI_TOOLS.adjustPrecompLayerToSpan(pc, pcLayer, snap, comp);
          SORI_TOOLS.promoteSingleAdjustmentPrecomp(pc, pcLayer, snap, precompDebug);
          precompDebug.events.push(SORI_TOOLS.debugPrecompState(pcLayer, pc, snap));
        } catch (e3) {
          precompDebug.events.push({ action: "error", snap: snap, message: e3.message });
        }
      }
    }
  } catch (e4) {
    app.endUndoGroup();
    precompDebug.error = e4.message;
    SORI_TOOLS.writeDebugFile("precomp-debug.json", precompDebug);
    return SORI_TOOLS.respond(false, "Precomp failed: " + e4.message);
  }

  app.endUndoGroup();
  SORI_TOOLS.writeDebugFile("precomp-debug.json", precompDebug);
  return SORI_TOOLS.respond(true, single ? "Precomped selected layers into one comp." : "Precomped " + layers.length + " layer" + (layers.length > 1 ? "s" : "") + ".");
};

SORI_TOOLS.collectLayerState = function (layer) {
  var state = {};
  try { state.parent = layer.parent; } catch (e) {}
  try { state.inPoint = layer.inPoint; } catch (e2) {}
  try { state.outPoint = layer.outPoint; } catch (e3) {}
  try { state.startTime = layer.startTime; } catch (e4) {}
  try { state.stretch = layer.stretch; } catch (e4b) {}
  try { state.enabled = layer.enabled; } catch (e5) {}
  try { state.solo = layer.solo; } catch (e6) {}
  try { state.shy = layer.shy; } catch (e7) {}
  try { state.locked = layer.locked; } catch (e8) {}
  try { state.label = layer.label; } catch (e9) {}
  try { state.comment = layer.comment; } catch (e10) {}
  try { state.blendingMode = layer.blendingMode; } catch (e11) {}
  try { state.trackMatteType = layer.trackMatteType; } catch (e12) {}
  try { state.threeDLayer = layer.threeDLayer; } catch (e13) {}
  try { state.guideLayer = layer.guideLayer; } catch (e14) {}
  try { state.adjustmentLayer = layer.adjustmentLayer; } catch (e15) {}
  try { state.motionBlur = layer.motionBlur; } catch (e16) {}
  try { state.frameBlending = layer.frameBlending; } catch (e16b) {}
  try { state.frameBlendingType = layer.frameBlendingType; } catch (e16c) {}
  try { state.quality = layer.quality; } catch (e17) {}
  try { state.samplingQuality = layer.samplingQuality; } catch (e18) {}
  try { state.collapseTransformation = layer.collapseTransformation; } catch (e19) {}
  try { state.autoOrient = layer.autoOrient; } catch (e20) {}
  try { state.preserveTransparency = layer.preserveTransparency; } catch (e21) {}
  try { state.name = layer.name; } catch (e22) {}
  return state;
};

SORI_TOOLS.restoreLayerState = function (layer, state) {
  try { if (state.blendingMode !== undefined) layer.blendingMode = state.blendingMode; } catch (e) {}
  try { if (state.enabled !== undefined) layer.enabled = state.enabled; } catch (e2) {}
  try { if (state.solo !== undefined) layer.solo = state.solo; } catch (e3) {}
  try { if (state.shy !== undefined) layer.shy = state.shy; } catch (e4) {}
  try { if (state.label !== undefined) layer.label = state.label; } catch (e5) {}
  try { if (state.comment !== undefined) layer.comment = state.comment; } catch (e6) {}
  try { if (state.motionBlur !== undefined) layer.motionBlur = state.motionBlur; } catch (e7) {}
  try { if (state.frameBlending !== undefined) layer.frameBlending = state.frameBlending; } catch (e7b) {}
  try { if (state.frameBlendingType !== undefined) layer.frameBlendingType = state.frameBlendingType; } catch (e7c) {}
  try { if (state.quality !== undefined) layer.quality = state.quality; } catch (e8) {}
  try { if (state.samplingQuality !== undefined) layer.samplingQuality = state.samplingQuality; } catch (e9) {}
  try { if (state.collapseTransformation !== undefined) layer.collapseTransformation = state.collapseTransformation; } catch (e10) {}
  try { if (state.autoOrient !== undefined) layer.autoOrient = state.autoOrient; } catch (e11) {}
  try { if (state.preserveTransparency !== undefined) layer.preserveTransparency = state.preserveTransparency; } catch (e12) {}
  try { if (state.guideLayer !== undefined) layer.guideLayer = state.guideLayer; } catch (e13) {}
  try { if (state.adjustmentLayer !== undefined) layer.adjustmentLayer = state.adjustmentLayer; } catch (e14) {}
  try { if (state.threeDLayer !== undefined) layer.threeDLayer = state.threeDLayer; } catch (e15) {}
  try { if (state.trackMatteType !== undefined) layer.trackMatteType = state.trackMatteType; } catch (e16t) {}
};

SORI_TOOLS.activeBoostState = function () {
  var state = SORI_TOOLS.parse(SORI_TOOLS.readBoostRestoreStateText());
  if (state && state.projectKey === SORI_TOOLS.projectStateKey() && state.comps && state.layers) return state;
  return null;
};

SORI_TOOLS.findBoostCompStateForComp = function (state, comp) {
  if (!state || !state.comps || !comp) return null;
  var key = SORI_TOOLS.compStateKey(comp);
  for (var i = 0; i < state.comps.length; i += 1) {
    if (state.comps[i] && state.comps[i].key === key) return state.comps[i];
  }
  return null;
};

SORI_TOOLS.findBoostLayerStateForLayer = function (state, comp, layer) {
  if (!state || !state.layers || !comp || !layer) return null;
  var key = SORI_TOOLS.effectStateKey(comp, layer);
  for (var i = 0; i < state.layers.length; i += 1) {
    if (state.layers[i] && state.layers[i].key === key) return state.layers[i];
  }
  return null;
};

SORI_TOOLS.mergeBoostLayerState = function (state, comp, layer, layerState) {
  var boostLayerState = SORI_TOOLS.findBoostLayerStateForLayer(state, comp, layer);
  if (!boostLayerState || !layerState) return layerState;
  var settings = SORI_TOOLS.boostProfileSettings(state.profile || "strong");
  try {
    if (boostLayerState.motionBlur !== undefined && settings.disableMotion && layer.motionBlur === false) layerState.motionBlur = boostLayerState.motionBlur;
  } catch (e) {}
  try {
    if (boostLayerState.frameBlendingType !== undefined && settings.disableMotion && layer.frameBlendingType === FrameBlendingType.NO_FRAME_BLEND) layerState.frameBlendingType = boostLayerState.frameBlendingType;
  } catch (e2) {}
  try {
    if (boostLayerState.quality !== undefined && settings.draftLayers && layer.quality === LayerQuality.DRAFT) layerState.quality = boostLayerState.quality;
  } catch (e3) {}
  try {
    if (boostLayerState.samplingQuality !== undefined && settings.bilinear && layer.samplingQuality === LayerSamplingQuality.BILINEAR) layerState.samplingQuality = boostLayerState.samplingQuality;
  } catch (e4) {}
  return layerState;
};

SORI_TOOLS.restorePrecompInnerLayerState = function (precomp, state) {
  if (!precomp || !state) return false;
  try {
    if (precomp.numLayers < 1) return false;
    SORI_TOOLS.restoreLayerState(precomp.layer(1), state);
    return true;
  } catch (e) {}
  return false;
};

SORI_TOOLS.registerBoostPrecompState = function (boostState, sourceComp, precomp, layerStates, parentLayer, parentState) {
  if (!boostState || !sourceComp || !precomp || !layerStates) return false;
  try {
    if (!boostState.comps) boostState.comps = [];
    if (!boostState.layers) boostState.layers = [];
    var compState = SORI_TOOLS.captureBoostCompState(precomp);
    var sourceCompState = SORI_TOOLS.findBoostCompStateForComp(boostState, sourceComp);
    try { if (sourceCompState && sourceCompState.resolutionFactor !== undefined) compState.resolutionFactor = sourceCompState.resolutionFactor; } catch (e) {}
    try { if (sourceCompState && sourceCompState.draft3d !== undefined) compState.draft3d = sourceCompState.draft3d; } catch (e2) {}
    try { if (sourceCompState && sourceCompState.motionBlur !== undefined) compState.motionBlur = sourceCompState.motionBlur; } catch (e3) {}
    try { if (sourceCompState && sourceCompState.frameBlending !== undefined) compState.frameBlending = sourceCompState.frameBlending; } catch (e4) {}
    if (!SORI_TOOLS.findBoostCompStateForComp(boostState, precomp)) boostState.comps.push(compState);
    for (var i = 0; i < layerStates.length && i < precomp.numLayers; i += 1) {
      var layerState = layerStates[i];
      if (!layerState) continue;
      var innerLayer = precomp.layer(i + 1);
      var nextState = SORI_TOOLS.captureBoostLayerState(precomp, innerLayer);
      try { if (layerState.quality !== undefined) nextState.quality = layerState.quality; } catch (lq) {}
      try { if (layerState.samplingQuality !== undefined) nextState.samplingQuality = layerState.samplingQuality; } catch (ls) {}
      try { if (layerState.motionBlur !== undefined) nextState.motionBlur = layerState.motionBlur; } catch (lm) {}
      try { if (layerState.frameBlendingType !== undefined) nextState.frameBlendingType = layerState.frameBlendingType; } catch (lf) {}
      if (!SORI_TOOLS.findBoostLayerStateForLayer(boostState, precomp, innerLayer)) boostState.layers.push(nextState);
    }
    if (parentLayer && parentState && !SORI_TOOLS.findBoostLayerStateForLayer(boostState, sourceComp, parentLayer)) {
      var parentBoostState = SORI_TOOLS.captureBoostLayerState(sourceComp, parentLayer);
      try { if (parentState.quality !== undefined) parentBoostState.quality = parentState.quality; } catch (pq) {}
      try { if (parentState.samplingQuality !== undefined) parentBoostState.samplingQuality = parentState.samplingQuality; } catch (ps) {}
      try { if (parentState.motionBlur !== undefined) parentBoostState.motionBlur = parentState.motionBlur; } catch (pm) {}
      try { if (parentState.frameBlendingType !== undefined) parentBoostState.frameBlendingType = parentState.frameBlendingType; } catch (pf) {}
      boostState.layers.push(parentBoostState);
    }
    SORI_TOOLS.writeBoostRestoreStateText(SORI_TOOLS.stringify(boostState));
    return true;
  } catch (e5) {}
  return false;
};

SORI_TOOLS.propertyTreeHasKeys = function (prop) {
  try {
    if (!prop) return false;
    if (prop.propertyType === PropertyType.PROPERTY) {
      return !!(prop.numKeys && prop.numKeys > 0);
    }
    if (prop.numProperties) {
      for (var i = 1; i <= prop.numProperties; i += 1) {
        try {
          if (SORI_TOOLS.propertyTreeHasKeys(prop.property(i))) return true;
        } catch (echild) {}
      }
    }
  } catch (e) {}
  return false;
};

SORI_TOOLS.isThirdPartyEffect = function (effectProp) {
  try {
    var matchName = String(effectProp.matchName || "");
    return matchName.indexOf("ADBE ") !== 0;
  } catch (e) {}
  return false;
};

SORI_TOOLS.layerHasRiskyKeyedEffects = function (layer) {
  try {
    var fx = layer.property("ADBE Effect Parade");
    if (!fx) return false;
    for (var i = 1; i <= fx.numProperties; i += 1) {
      try {
        var effectProp = fx.property(i);
        if (!SORI_TOOLS.isThirdPartyEffect(effectProp)) continue;
        if (SORI_TOOLS.propertyTreeHasKeys(effectProp) || SORI_TOOLS.propertyHasExpressions(effectProp)) {
          return true;
        }
      } catch (efx) {}
    }
  } catch (e) {}
  return false;
};

SORI_TOOLS.sourceCompHasRiskyKeyedEffects = function (sourceComp) {
  try {
    for (var i = 1; i <= sourceComp.numLayers; i += 1) {
      try {
        if (SORI_TOOLS.layerHasRiskyKeyedEffects(sourceComp.layer(i))) return true;
      } catch (elayer) {}
    }
  } catch (e) {}
  return false;
};

SORI_TOOLS.sourceCompHasRiskyTiming = function (sourceComp) {
  try {
    for (var i = 1; i <= sourceComp.numLayers; i += 1) {
      var layer = sourceComp.layer(i);
      try {
        if (SORI_TOOLS.hasTimeRemap(layer)) return true;
      } catch (etimeremap) {}
      try {
        if (SORI_TOOLS.hasReverseStretch(layer)) return true;
      } catch (estretch) {}
    }
  } catch (e) {}
  return false;
};

SORI_TOOLS.sourceCompHasTimeRemap = function (sourceComp) {
  try {
    for (var i = 1; i <= sourceComp.numLayers; i += 1) {
      try {
        if (SORI_TOOLS.hasTimeRemap(sourceComp.layer(i))) return true;
      } catch (elayer) {}
    }
  } catch (e) {}
  return false;
};

SORI_TOOLS.sourceCompHasReverseStretch = function (sourceComp) {
  try {
    for (var i = 1; i <= sourceComp.numLayers; i += 1) {
      try {
        if (SORI_TOOLS.hasReverseStretch(sourceComp.layer(i))) return true;
      } catch (elayer) {}
    }
  } catch (e) {}
  return false;
};

SORI_TOOLS.copyPropertyValueAndKeys = function (sourceProp, targetProp, timeOffset) {
  try {
    if (!sourceProp || !targetProp) return;

    if (sourceProp.propertyType === PropertyType.PROPERTY) {
      try {
        while (targetProp.numKeys && targetProp.numKeys > 0) targetProp.removeKey(targetProp.numKeys);
      } catch (eremove) {}

      if (sourceProp.numKeys && sourceProp.numKeys > 0) {
        for (var k = 1; k <= sourceProp.numKeys; k += 1) {
          try {
            var rec = SORI_TOOLS.captureKeyframe(sourceProp, k, timeOffset || 0, 1);
            targetProp.setValueAtTime(rec.time, rec.value);
            SORI_TOOLS.applyKeyframeMetadata(targetProp, targetProp.nearestKeyIndex(rec.time), rec);
          } catch (ekey) {}
        }
      } else {
        try { targetProp.setValue(sourceProp.value); } catch (evalset) {}
      }

      try {
        if (sourceProp.expression && sourceProp.expression.length) {
          targetProp.expression = sourceProp.expression;
          targetProp.expressionEnabled = sourceProp.expressionEnabled;
        }
      } catch (eexpr) {}
      return;
    }

    if (sourceProp.numProperties && targetProp.numProperties) {
      for (var i = 1; i <= sourceProp.numProperties; i += 1) {
        try {
          var srcChild = sourceProp.property(i);
          var dstChild = targetProp.property(srcChild.matchName) || targetProp.property(i);
          SORI_TOOLS.copyPropertyValueAndKeys(srcChild, dstChild, timeOffset);
        } catch (echild) {}
      }
    }
  } catch (e) {}
};

SORI_TOOLS.copyEffectsToLayer = function (sourceLayer, targetLayer, timeOffset) {
  var copied = 0;
  try {
    var sourceFx = sourceLayer.property("ADBE Effect Parade");
    var targetFx = targetLayer.property("ADBE Effect Parade");
    if (!sourceFx || !targetFx) return 0;

    for (var i = 1; i <= sourceFx.numProperties; i += 1) {
      try {
        var oldFx = sourceFx.property(i);
        var newFx = targetFx.addProperty(oldFx.matchName);
        try { newFx.name = oldFx.name; } catch (ename) {}
        SORI_TOOLS.copyPropertyValueAndKeys(oldFx, newFx, timeOffset || 0);
        copied += 1;
      } catch (eadd) {}
    }
  } catch (e) {}
  return copied;
};

SORI_TOOLS.copyMasksToLayer = function (sourceLayer, targetLayer, timeOffset) {
  var copied = 0;
  try {
    var sourceMasks = sourceLayer.property("ADBE Mask Parade");
    var targetMasks = targetLayer.property("ADBE Mask Parade");
    if (!sourceMasks || !targetMasks) return 0;

    for (var i = 1; i <= sourceMasks.numProperties; i += 1) {
      try {
        var oldMask = sourceMasks.property(i);
        var newMask = targetMasks.addProperty("ADBE Mask Atom");
        try { newMask.name = oldMask.name; } catch (ename) {}
        try { newMask.maskMode = oldMask.maskMode; } catch (emode) {}
        try { newMask.inverted = oldMask.inverted; } catch (einv) {}
        try { newMask.rotoBezier = oldMask.rotoBezier; } catch (eroto) {}
        SORI_TOOLS.copyPropertyValueAndKeys(oldMask, newMask, timeOffset || 0);
        copied += 1;
      } catch (emask) {}
    }
  } catch (e) {}
  return copied;
};

SORI_TOOLS.promoteSingleAdjustmentPrecomp = function (sourceComp, preLayer, snap, debug) {
  try {
    if (!sourceComp || !preLayer || !snap || sourceComp.numLayers !== 1) return false;
    var inner = sourceComp.layer(1);
    if (!inner || inner.adjustmentLayer !== true) return false;

    try { preLayer.adjustmentLayer = true; } catch (eadj) {}
    try { preLayer.label = SORI_TOOLS.defaultPrecompLabel(inner.label); } catch (elabel) {}
    try { preLayer.blendingMode = inner.blendingMode; } catch (eblend) {}
    try { preLayer.motionBlur = inner.motionBlur; } catch (emb) {}

    var effectCount = SORI_TOOLS.copyEffectsToLayer(inner, preLayer, Number(snap.inPoint) || 0);
    var maskCount = SORI_TOOLS.copyMasksToLayer(inner, preLayer, Number(snap.inPoint) || 0);

    SORI_TOOLS.pushDebugEvent(debug, {
      action: "promote-adjustment",
      precomp: preLayer.name,
      effects: effectCount,
      masks: maskCount
    });
    return true;
  } catch (e) {
    SORI_TOOLS.pushDebugEvent(debug, { action: "promote-adjustment-error", reason: e.message });
  }
  return false;
};

SORI_TOOLS.countEffects = function (layer) {
  try {
    var fx = layer.property("ADBE Effect Parade");
    return fx ? fx.numProperties : 0;
  } catch (e) {}
  return 0;
};

SORI_TOOLS.projectStateKey = function () {
  try {
    if (app.project && app.project.file && app.project.file.fsName) return "project-file:" + app.project.file.fsName;
  } catch (e) {}
  try {
    if (app.project && app.project.name) return "project-name:" + app.project.name;
  } catch (e2) {}
  return "project:untitled";
};

SORI_TOOLS.fxRestoreStateFileName = function () {
  return "fx-restore-state.json";
};

SORI_TOOLS.loadEffectControlRestoreState = function () {
  if (SORI_TOOLS.effectControlRestoreStateLoaded) return;
  SORI_TOOLS.effectControlRestoreStateLoaded = true;

  var raw = SORI_TOOLS.readTextFile(SORI_TOOLS.fxRestoreStateFileName());
  if (!raw) return;

  var data = SORI_TOOLS.parse(raw);
  var projectKey = SORI_TOOLS.projectStateKey();
  try {
    if (data && data.projects && data.projects[projectKey] && data.projects[projectKey].effects) {
      SORI_TOOLS.effectControlRestoreState = data.projects[projectKey].effects || {};
    }
  } catch (e) {}
};

SORI_TOOLS.saveEffectControlRestoreState = function () {
  var projectKey = SORI_TOOLS.projectStateKey();
  var data = SORI_TOOLS.parse(SORI_TOOLS.readTextFile(SORI_TOOLS.fxRestoreStateFileName()));
  if (!data || typeof data !== "object" || data instanceof Array) data = {};
  if (!data.projects) data.projects = {};
  data.version = SORI_TOOLS.FX_RESTORE_STATE_VERSION;
  data.projects[projectKey] = {
    updatedAt: (new Date()).toUTCString(),
    effects: SORI_TOOLS.effectControlRestoreState || {}
  };
  SORI_TOOLS.writeTextFile(SORI_TOOLS.fxRestoreStateFileName(), SORI_TOOLS.stringify(data));
};

SORI_TOOLS.allCompLayers = function (comp) {
  var out = [];
  try {
    for (var i = 1; i <= comp.numLayers; i += 1) out.push(comp.layer(i));
  } catch (e) {}
  return out;
};

SORI_TOOLS.compStateKey = function (comp) {
  var projectKey = SORI_TOOLS.projectStateKey();
  try {
    if (comp.id !== undefined && comp.id !== null) return projectKey + "|comp-id:" + String(comp.id);
  } catch (e) {}
  var compName = "";
  var itemIndex = "";
  try { compName = comp ? comp.name : ""; } catch (e2) {}
  try { itemIndex = comp ? String(comp.index) : ""; } catch (e3) {}
  return projectKey + "|comp-ref:" + itemIndex + ":" + compName;
};

SORI_TOOLS.effectStateKey = function (comp, layer) {
  var compKey = SORI_TOOLS.compStateKey(comp);
  try {
    if (layer.id !== undefined && layer.id !== null) return compKey + "|layer-id:" + String(layer.id);
  } catch (e) {}
  var compName = "";
  var layerName = "";
  var layerIndex = "";
  try { compName = comp ? comp.name : ""; } catch (e2) {}
  try { layerName = layer ? layer.name : ""; } catch (e3) {}
  try { layerIndex = layer ? String(layer.index) : ""; } catch (e4) {}
  return compKey + "|layer-ref:" + compName + ":" + layerIndex + ":" + layerName;
};

SORI_TOOLS.captureEffectControls = function (layer) {
  var state = [];
  try {
    var fx = layer.property("ADBE Effect Parade");
    if (!fx) return state;
    for (var i = 1; i <= fx.numProperties; i += 1) {
      var effectProp = fx.property(i);
      state.push({
        name: effectProp ? String(effectProp.name || "") : "",
        matchName: effectProp ? String(effectProp.matchName || "") : "",
        enabled: effectProp ? effectProp.enabled === true : false
      });
    }
  } catch (e) {}
  return state;
};

SORI_TOOLS.findCapturedEffectState = function (restoreState, effectProp, fallbackIndex) {
  if (!restoreState || !effectProp) return null;
  var effectName = "";
  var effectMatchName = "";
  try { effectName = String(effectProp.name || ""); } catch (e) {}
  try { effectMatchName = String(effectProp.matchName || ""); } catch (e2) {}
  for (var i = 0; i < restoreState.length; i += 1) {
    var item = restoreState[i];
    if (!item) continue;
    if (String(item.name || "") === effectName && String(item.matchName || "") === effectMatchName) return item;
  }
  return restoreState[fallbackIndex] || null;
};

SORI_TOOLS.setEffectControlEnabled = function (effectProp, enabled) {
  try {
    if (effectProp.enabled === enabled) return false;
    effectProp.enabled = enabled;
    return true;
  } catch (e) {}
  return false;
};

SORI_TOOLS.collectEffectControlTargets = function (rootComp, seedLayers, includeNested) {
  var targets = [];
  var seenLayers = {};
  var seenComps = {};

  function addLayer(comp, layer) {
    var key = SORI_TOOLS.effectStateKey(comp, layer);
    if (seenLayers[key]) return;
    seenLayers[key] = true;
    targets.push({ comp: comp, layer: layer });
  }

  function walkSourceComp(sourceComp) {
    if (!sourceComp) return;
    var compKey = SORI_TOOLS.compStateKey(sourceComp);
    if (seenComps[compKey]) return;
    seenComps[compKey] = true;
    walkLayers(sourceComp, SORI_TOOLS.allCompLayers(sourceComp));
  }

  function walkLayers(comp, layers) {
    for (var i = 0; i < layers.length; i += 1) {
      var layer = layers[i];
      addLayer(comp, layer);
      if (!includeNested) continue;
      try {
        if (layer && layer.source && SORI_TOOLS.isPrecomp(layer)) {
          walkSourceComp(layer.source);
        }
      } catch (e) {}
    }
  }

  if (includeNested) seenComps[SORI_TOOLS.compStateKey(rootComp)] = true;
  walkLayers(rootComp, seedLayers);
  return targets;
};

SORI_TOOLS.toggleEffectControls = function (payload) {
  var data = SORI_TOOLS.parse(payload);
  var comp = SORI_TOOLS.comp();
  if (!comp) return SORI_TOOLS.respond(false, "No active composition.");
  SORI_TOOLS.loadEffectControlRestoreState();

  var selected = SORI_TOOLS.selectedLayers(comp);
  var usingSelection = selected.length > 0;
  var includeNested = data && data.includeNested === true;
  var layers = usingSelection ? selected : SORI_TOOLS.allCompLayers(comp);
  if (!layers.length) return SORI_TOOLS.respond(false, "No layers found.");
  var targets = SORI_TOOLS.collectEffectControlTargets(comp, layers, includeNested);
  if (!targets.length) return SORI_TOOLS.respond(false, "No layers found.");

  var totalEffects = 0;
  var enabledEffects = 0;
  var targetLayerCount = 0;

  for (var scanLayer = 0; scanLayer < targets.length; scanLayer += 1) {
    try {
      var scanFx = targets[scanLayer].layer.property("ADBE Effect Parade");
      if (!scanFx || scanFx.numProperties < 1) continue;
      targetLayerCount += 1;
      for (var scanEffect = 1; scanEffect <= scanFx.numProperties; scanEffect += 1) {
        totalEffects += 1;
        try {
          if (scanFx.property(scanEffect).enabled === true) enabledEffects += 1;
        } catch (eScanEffect) {}
      }
    } catch (eScanLayer) {}
  }

  if (totalEffects < 1) {
    if (includeNested) {
      return SORI_TOOLS.respond(false, usingSelection ? "Selected layer(s) and nested precomps have no effects." : "No effects found in this composition or nested precomps.");
    }
    return SORI_TOOLS.respond(false, usingSelection ? "Selected layer(s) have no effects." : "No effects found in this composition.");
  }

  var turnOn = enabledEffects === 0;
  var undoName = "SoriTools FX " + (turnOn ? "On" : "Off") + (includeNested ? " Deep" : "");
  app.beginUndoGroup(undoName);

  var changed = 0;
  var affectedLayers = 0;
  var skipped = 0;
  var restoreStateChanged = false;

  for (var i = 0; i < targets.length; i += 1) {
    var layer = targets[i].layer;
    var layerComp = targets[i].comp;
    var wasLocked = SORI_TOOLS.unlockIfNeeded(layer);
    var layerChanged = false;

    try {
      var fx = layer.property("ADBE Effect Parade");
      if (!fx || fx.numProperties < 1) {
        SORI_TOOLS.relockIfNeeded(layer, wasLocked);
        continue;
      }

      var key = SORI_TOOLS.effectStateKey(layerComp, layer);
      var restoreState = SORI_TOOLS.effectControlRestoreState[key];
      if (!turnOn) {
        SORI_TOOLS.effectControlRestoreState[key] = SORI_TOOLS.captureEffectControls(layer);
        restoreStateChanged = true;
      }

      for (var j = 1; j <= fx.numProperties; j += 1) {
        var effectProp = fx.property(j);
        var nextEnabled = false;

        if (turnOn) {
          nextEnabled = true;
          var capturedEffect = SORI_TOOLS.findCapturedEffectState(restoreState, effectProp, j - 1);
          if (capturedEffect && capturedEffect.enabled !== undefined) {
            nextEnabled = capturedEffect.enabled === true;
          }
        }

        if (SORI_TOOLS.setEffectControlEnabled(effectProp, nextEnabled)) {
          changed += 1;
          layerChanged = true;
        } else {
          skipped += 1;
        }
      }

      if (turnOn && restoreState) {
        try {
          delete SORI_TOOLS.effectControlRestoreState[key];
          restoreStateChanged = true;
        } catch (eDelete) {}
      }
    } catch (eLayer) {
      skipped += 1;
    }

    if (layerChanged) affectedLayers += 1;
    SORI_TOOLS.relockIfNeeded(layer, wasLocked);
  }

  app.endUndoGroup();
  if (restoreStateChanged) SORI_TOOLS.saveEffectControlRestoreState();

  if (changed < 1) return SORI_TOOLS.respond(false, "No effect controls could be changed.");

  var scope = usingSelection ? "selected layer" : "timeline layer";
  var message = "FX " + (turnOn ? "on" : "off") + " for " + changed + " effect" + (changed > 1 ? "s" : "") + " on " + affectedLayers + " " + scope + (affectedLayers > 1 ? "s" : "") + ".";
  if (includeNested) message += " Nested precomps included.";
  if (skipped > 0) message += " Skipped " + skipped + ".";
  if (!usingSelection && targetLayerCount > affectedLayers) message += " Layers without effects ignored.";
  return SORI_TOOLS.respond(true, message);
};

SORI_TOOLS.selectedProjectItems = function () {
  var out = [];
  try {
    var selection = app.project ? app.project.selection : null;
    if (selection) {
      for (var i = 0; i < selection.length; i += 1) out.push(selection[i]);
    }
  } catch (e) {}
  return out;
};

SORI_TOOLS.isProxyableFootageItem = function (item) {
  try {
    if (!(item instanceof FootageItem)) return false;
    if (!item.mainSource || item.mainSource.isStill === true) return false;
    if (!item.mainSource.file || !item.mainSource.file.exists) return false;
    return true;
  } catch (e) {}
  return false;
};

SORI_TOOLS.itemHasProxy = function (item) {
  try { return !!(item && item.proxySource); } catch (e) {}
  return false;
};

SORI_TOOLS.isProjectProxyToggleCandidate = function (item) {
  if (!item) return false;
  if (SORI_TOOLS.itemHasProxy(item)) return true;
  try {
    if (item instanceof FootageItem) return true;
  } catch (e) {}
  try {
    return !!(item.mainSource && item.mainSource.file);
  } catch (e2) {}
  return false;
};

SORI_TOOLS.safeFileStem = function (name) {
  var value = String(name || "footage").replace(/\.[^\.]+$/g, "");
  value = value.replace(/[\\\/:*?"<>|]/g, "_").replace(/^\s+|\s+$/g, "");
  return value || "footage";
};

SORI_TOOLS.ensureUniqueFile = function (folder, stem, ext) {
  var file = new File(folder.fsName + "/" + stem + ext);
  var n = 2;
  while (file.exists) {
    file = new File(folder.fsName + "/" + stem + "_" + n + ext);
    n += 1;
  }
  return file;
};

SORI_TOOLS.proxyRootFolder = function () {
  var base = null;
  try {
    if (app.project && app.project.file && app.project.file.parent) base = app.project.file.parent;
  } catch (e) {}
  if (!base) base = SORI_TOOLS.tmpFolder();
  if (!base) return null;

  var folder = new Folder(base.fsName + "/_SoriTools_Proxies");
  if (!folder.exists) folder.create();
  return folder;
};

SORI_TOOLS.projectItemKey = function (item) {
  try {
    if (item.id !== undefined && item.id !== null) return "item-id:" + String(item.id);
  } catch (e) {}
  try { return "item-index:" + String(item.index) + ":" + String(item.name || ""); } catch (e2) {}
  return "";
};

SORI_TOOLS.proxyJobForItem = function (item, proxyFolder) {
  var sourceFile = null;
  try { sourceFile = item.mainSource.file; } catch (e) {}
  if (!sourceFile || !sourceFile.exists) return null;

  var stem = SORI_TOOLS.safeFileStem(sourceFile.displayName || sourceFile.name || item.name);
  var output = SORI_TOOLS.ensureUniqueFile(proxyFolder, stem + "_proxy_540p", ".mov");
  return {
    itemId: (function () { try { return item.id; } catch (eId) {} return null; })(),
    itemIndex: (function () { try { return item.index; } catch (eIndex) {} return null; })(),
    itemKey: SORI_TOOLS.projectItemKey(item),
    name: String(item.name || sourceFile.name || "Footage"),
    sourcePath: sourceFile.fsName,
    outputPath: output.fsName,
    proxyFolder: proxyFolder.fsName,
    width: (function () { try { return item.width; } catch (eW) {} return 0; })(),
    height: (function () { try { return item.height; } catch (eH) {} return 0; })(),
    overwrite: false
  };
};

SORI_TOOLS.getSelectedProxyJobs = function () {
  var items = SORI_TOOLS.selectedProjectItems();
  if (!items.length) return SORI_TOOLS.respond(false, "Select footage in the Project panel first.");

  var folder = SORI_TOOLS.proxyRootFolder();
  if (!folder) return SORI_TOOLS.respond(false, "Could not create proxy folder.");

  var jobs = [];
  var skipped = 0;
  var alreadyProxied = 0;
  for (var i = 0; i < items.length; i += 1) {
    if (!SORI_TOOLS.isProxyableFootageItem(items[i])) {
      skipped += 1;
      continue;
    }
    if (SORI_TOOLS.itemHasProxy(items[i])) {
      alreadyProxied += 1;
      continue;
    }
    var job = SORI_TOOLS.proxyJobForItem(items[i], folder);
    if (job) jobs.push(job);
    else skipped += 1;
  }

  if (!jobs.length) {
    if (alreadyProxied > 0) return SORI_TOOLS.respond(false, "Selected footage already has proxy. Shift+click Proxy to toggle on/off, or right-click Proxy to clear/reveal.");
    return SORI_TOOLS.respond(false, "No video footage selected for proxy.");
  }
  var message = "Creating " + jobs.length + " proxy file" + (jobs.length > 1 ? "s" : "") + ".";
  if (alreadyProxied > 0) message += " Skipped " + alreadyProxied + " already proxied item" + (alreadyProxied > 1 ? "s" : "") + ".";
  return SORI_TOOLS.respond(true, message, { jobs: jobs, skipped: skipped, alreadyProxied: alreadyProxied, proxyFolder: folder.fsName });
};

SORI_TOOLS.findProjectItemForProxyJob = function (job) {
  if (!job || !app.project) return null;
  try {
    if (job.itemId !== null && job.itemId !== undefined) {
      for (var i = 1; i <= app.project.numItems; i += 1) {
        var item = app.project.item(i);
        try {
          if (item && item.id === job.itemId) return item;
        } catch (eId) {}
      }
    }
  } catch (e) {}

  try {
    if (job.itemIndex && app.project.item(job.itemIndex)) {
      var indexed = app.project.item(job.itemIndex);
      if (indexed && SORI_TOOLS.projectItemKey(indexed) === job.itemKey) return indexed;
    }
  } catch (e2) {}
  return null;
};

SORI_TOOLS.setGeneratedProxies = function (payload) {
  var jobs = SORI_TOOLS.parse(payload);
  if (!jobs || !jobs.length) return SORI_TOOLS.respond(false, "No generated proxy jobs to set.");

  app.beginUndoGroup("SoriTools Set Proxies");
  var setCount = 0;
  var skipped = 0;
  var errors = [];

  for (var i = 0; i < jobs.length; i += 1) {
    try {
      var job = jobs[i];
      var item = SORI_TOOLS.findProjectItemForProxyJob(job);
      var proxyFile = new File(job.outputPath);
      if (!item || !SORI_TOOLS.isProxyableFootageItem(item) || !proxyFile.exists) {
        skipped += 1;
        continue;
      }
      item.setProxy(proxyFile);
      item.useProxy = true;
      setCount += 1;
    } catch (e) {
      skipped += 1;
      errors.push(e.message);
    }
  }

  app.endUndoGroup();

  if (!setCount) return SORI_TOOLS.respond(false, "Proxy files were created, but AE could not attach them." + (errors.length ? "\n" + errors[0] : ""));
  var msg = "Proxy set for " + setCount + " footage item" + (setCount > 1 ? "s" : "") + ".";
  if (skipped > 0) msg += " Skipped " + skipped + ".";
  return SORI_TOOLS.respond(true, msg);
};

SORI_TOOLS.selectedItemsWithProxy = function () {
  var items = SORI_TOOLS.selectedProjectItems();
  var out = [];
  for (var i = 0; i < items.length; i += 1) {
    try {
      if (items[i] && items[i].proxySource) out.push(items[i]);
    } catch (e) {}
  }
  return out;
};

SORI_TOOLS.pushUniqueProjectItem = function (items, item) {
  if (!item) return;
  for (var i = 0; i < items.length; i += 1) {
    if (items[i] === item) return;
    try {
      if (items[i].id !== undefined && item.id !== undefined && items[i].id === item.id) return;
    } catch (e) {}
  }
  items.push(item);
};

SORI_TOOLS.selectedLayerSourceItemsWithProxy = function () {
  var out = [];
  var comp = SORI_TOOLS.comp();
  if (!comp) return out;
  var layers = SORI_TOOLS.selectedLayers(comp);
  for (var i = 0; i < layers.length; i += 1) {
    try {
      var source = layers[i] && layers[i].source ? layers[i].source : null;
      if (source && source.proxySource) SORI_TOOLS.pushUniqueProjectItem(out, source);
    } catch (e) {}
  }
  return out;
};

SORI_TOOLS.allItemsWithProxy = function () {
  var out = [];
  try {
    if (!app.project) return out;
    for (var i = 1; i <= app.project.numItems; i += 1) {
      var item = app.project.item(i);
      try {
        if (item && item.proxySource) out.push(item);
      } catch (eItem) {}
    }
  } catch (e) {}
  return out;
};

SORI_TOOLS.proxyToggleTargets = function () {
  var selected = SORI_TOOLS.selectedProjectItems();
  var selectedWithProxy = [];
  var projectProxyCandidateCount = 0;
  for (var i = 0; i < selected.length; i += 1) {
    try {
      if (SORI_TOOLS.isProjectProxyToggleCandidate(selected[i])) projectProxyCandidateCount += 1;
      if (selected[i] && selected[i].proxySource) selectedWithProxy.push(selected[i]);
    } catch (e) {}
  }

  if (selectedWithProxy.length > 0) {
    return {
      items: selectedWithProxy,
      usingSelection: true,
      hadSelection: true,
      scope: "selected Project item"
    };
  }

  var comp = SORI_TOOLS.comp();
  var selectedLayerCount = 0;
  try { selectedLayerCount = comp ? SORI_TOOLS.selectedLayers(comp).length : 0; } catch (eLayerCount) {}
  var layerSourcesWithProxy = SORI_TOOLS.selectedLayerSourceItemsWithProxy();
  if (layerSourcesWithProxy.length > 0) {
    return {
      items: layerSourcesWithProxy,
      usingSelection: true,
      hadSelection: true,
      scope: "selected timeline layer source"
    };
  }

  if (projectProxyCandidateCount > 0 || selectedLayerCount > 0) {
    return {
      items: [],
      usingSelection: true,
      hadSelection: true,
      scope: projectProxyCandidateCount > 0 ? "selected Project item" : "selected timeline layer source"
    };
  }

  return {
    items: SORI_TOOLS.allItemsWithProxy(),
    usingSelection: false,
    hadSelection: false,
    scope: "project item"
  };
};

SORI_TOOLS.toggleSelectedProxies = function () {
  var target = SORI_TOOLS.proxyToggleTargets();
  var items = target.items;
  if (!items.length) {
    if (target.hadSelection) return SORI_TOOLS.respond(false, "Selected item(s) have no proxy.");
    return SORI_TOOLS.respond(false, "No proxied footage found in this project.");
  }

  var enable = false;
  for (var i = 0; i < items.length; i += 1) {
    try {
      if (items[i].useProxy !== true) {
        enable = true;
        break;
      }
    } catch (e) {}
  }

  app.beginUndoGroup("SoriTools Toggle Proxies");
  var changed = 0;
  for (var j = 0; j < items.length; j += 1) {
    try {
      items[j].useProxy = enable;
      changed += 1;
    } catch (e2) {}
  }
  app.endUndoGroup();

  var scope = target.scope || (target.usingSelection ? "selected item" : "project item");
  return SORI_TOOLS.respond(true, (enable ? "Enabled" : "Disabled") + " proxy for " + changed + " " + scope + (changed > 1 ? "s" : "") + ".");
};

SORI_TOOLS.clearSelectedProxies = function () {
  var target = SORI_TOOLS.proxyToggleTargets();
  var items = target.items;
  if (!items.length) {
    if (target.hadSelection) return SORI_TOOLS.respond(false, "Selected item(s) have no proxy.");
    return SORI_TOOLS.respond(false, "No proxied footage found in this project.");
  }

  app.beginUndoGroup("SoriTools Clear Proxies");
  var cleared = 0;
  for (var i = 0; i < items.length; i += 1) {
    try {
      items[i].setProxyToNone();
      cleared += 1;
    } catch (e) {}
  }
  app.endUndoGroup();

  return SORI_TOOLS.respond(true, "Cleared proxy from " + cleared + " item" + (cleared > 1 ? "s" : "") + ".");
};

SORI_TOOLS.revealSelectedProxyFolder = function () {
  var target = SORI_TOOLS.proxyToggleTargets();
  var items = target.items;
  var folder = null;

  try {
    if (items.length && items[0].proxySource && items[0].proxySource.file) {
      folder = items[0].proxySource.file.parent;
    }
  } catch (e) {}

  if (!folder) folder = SORI_TOOLS.proxyRootFolder();
  if (!folder || !folder.exists) return SORI_TOOLS.respond(false, "Proxy folder not found.");
  try { folder.execute(); } catch (e2) {}
  return SORI_TOOLS.respond(true, "Opened proxy folder.");
};

SORI_TOOLS.countMasks = function (layer) {
  try {
    var masks = layer.property("ADBE Mask Parade");
    return masks ? masks.numProperties : 0;
  } catch (e) {}
  return 0;
};

SORI_TOOLS.isPromotedSingleAdjustmentPrecomp = function (layer) {
  try {
    if (!SORI_TOOLS.isPrecomp(layer)) return false;
    if (layer.adjustmentLayer !== true) return false;
    var sourceComp = layer.source;
    if (!sourceComp || sourceComp.numLayers !== 1) return false;
    var inner = sourceComp.layer(1);
    if (!inner) return false;
    return inner.adjustmentLayer === true;
  } catch (e) {}
  return false;
};

SORI_TOOLS.hasKeyframes = function (property) {
  try { return property.numKeys > 0; } catch (e) {}
  return false;
};

SORI_TOOLS.propertyHasExpressions = function (prop) {
  try {
    if (prop.propertyType === PropertyType.PROPERTY) {
      return prop.expression && prop.expression.length > 0;
    }
    if (prop.numProperties) {
      for (var i = 1; i <= prop.numProperties; i += 1) {
        try {
          if (SORI_TOOLS.propertyHasExpressions(prop.property(i))) return true;
        } catch (e) {}
      }
    }
  } catch (e2) {}
  return false;
};

SORI_TOOLS.transformHasAnimationOrExpression = function (layer) {
  try {
    var transform = layer.property("ADBE Transform Group");
    if (!transform) return false;
    for (var i = 1; i <= transform.numProperties; i += 1) {
      var prop = transform.property(i);
      try {
        if (prop && prop.propertyType === PropertyType.PROPERTY) {
          if (prop.numKeys && prop.numKeys > 0) return true;
          if (prop.expression && prop.expression.length > 0) return true;
        }
      } catch (e) {}
    }
  } catch (e2) {}
  return false;
};

SORI_TOOLS.precompUnwrapRisk = function (layer) {
  var isPromotedSingleAdjustment = false;
  try { isPromotedSingleAdjustment = SORI_TOOLS.isPromotedSingleAdjustmentPrecomp(layer); } catch (ep) {}

  try {
    if (SORI_TOOLS.hasTimeRemap(layer)) return "time remap on precomp layer";
  } catch (e) {}

  try {
    if (SORI_TOOLS.transformHasAnimationOrExpression(layer)) return "animated transform on precomp layer";
  } catch (e6) {}
  try {
    if (layer.trackMatteType !== undefined && layer.trackMatteType !== TrackMatteType.NO_TRACK_MATTE) return "track matte on precomp layer";
  } catch (e7) {}
  try {
    if (layer.isTrackMatte === true) return "precomp layer is used as a track matte";
  } catch (e8) {}
  return "";
};

SORI_TOOLS.createUnprecompWrapperAdjustment = function (comp, sourceLayer, insertBefore) {
  var needsWrapper = false;
  try { if (SORI_TOOLS.countEffects(sourceLayer) > 0) needsWrapper = true; } catch (e) {}
  try { if (SORI_TOOLS.countMasks(sourceLayer) > 0) needsWrapper = true; } catch (e2) {}
  try { if (sourceLayer.blendingMode !== undefined && sourceLayer.blendingMode !== BlendingMode.NORMAL) needsWrapper = true; } catch (e3) {}
  try {
    var opacity = sourceLayer.property("ADBE Transform Group").property("ADBE Opacity");
    if (opacity && (opacity.numKeys > 0 || Math.abs(Number(opacity.value) - 100) > 0.001)) needsWrapper = true;
  } catch (e4) {}
  if (!needsWrapper) return null;

  try {
    var dur = Math.max(comp.frameDuration, sourceLayer.outPoint - sourceLayer.inPoint);
    var wrapper = comp.layers.addSolid([1, 1, 1], sourceLayer.name + " FX", comp.width, comp.height, comp.pixelAspect, dur);
    try { wrapper.adjustmentLayer = true; } catch (eadj) {}
    SORI_TOOLS.setSpan(wrapper, sourceLayer.inPoint, sourceLayer.outPoint, sourceLayer.inPoint);
    try { wrapper.moveBefore(insertBefore || sourceLayer); } catch (emove) {}
    try { wrapper.label = sourceLayer.label; } catch (elabel) {}
    try { wrapper.blendingMode = sourceLayer.blendingMode; } catch (eblend) {}
    try { wrapper.motionBlur = sourceLayer.motionBlur; } catch (emb) {}
    try {
      var sourceOpacity = sourceLayer.property("ADBE Transform Group").property("ADBE Opacity");
      var wrapperOpacity = wrapper.property("ADBE Transform Group").property("ADBE Opacity");
      SORI_TOOLS.copyPropertyValueAndKeys(sourceOpacity, wrapperOpacity, 0);
    } catch (eop) {}
    SORI_TOOLS.copyMasksToLayer(sourceLayer, wrapper, 0);
    SORI_TOOLS.copyEffectsToLayer(sourceLayer, wrapper, 0);
    return wrapper;
  } catch (e5) {}
  return null;
};

SORI_TOOLS.setPropertyToValueAtTime = function (target, source, time) {
  try {
    if (!target || !source) return;
    var value = SORI_TOOLS.valueAt(source, time);
    if (value !== null && value !== undefined) target.setValue(value);
  } catch (e) {}
};

SORI_TOOLS.copyTransformSnapshot = function (targetLayer, sourceLayer, time) {
  try {
    targetLayer.threeDLayer = SORI_TOOLS.is3DLayer(sourceLayer);
  } catch (e) {}

  var sourceTransform = null;
  var targetTransform = null;
  try { sourceTransform = sourceLayer.property("ADBE Transform Group"); } catch (e2) {}
  try { targetTransform = targetLayer.property("ADBE Transform Group"); } catch (e3) {}
  if (!sourceTransform || !targetTransform) return;

  SORI_TOOLS.setPropertyToValueAtTime(targetTransform.property("ADBE Anchor Point"), sourceTransform.property("ADBE Anchor Point"), time);
  SORI_TOOLS.setPropertyToValueAtTime(targetTransform.property("ADBE Position"), sourceTransform.property("ADBE Position"), time);
  SORI_TOOLS.setPropertyToValueAtTime(targetTransform.property("ADBE Scale"), sourceTransform.property("ADBE Scale"), time);
  SORI_TOOLS.setPropertyToValueAtTime(targetTransform.property("ADBE Rotate Z") || targetTransform.property("ADBE Rotation"), sourceTransform.property("ADBE Rotate Z") || sourceTransform.property("ADBE Rotation"), time);
  SORI_TOOLS.setPropertyToValueAtTime(targetTransform.property("ADBE Orientation"), sourceTransform.property("ADBE Orientation"), time);
  SORI_TOOLS.setPropertyToValueAtTime(targetTransform.property("ADBE Rotate X"), sourceTransform.property("ADBE Rotate X"), time);
  SORI_TOOLS.setPropertyToValueAtTime(targetTransform.property("ADBE Rotate Y"), sourceTransform.property("ADBE Rotate Y"), time);
};

SORI_TOOLS.setParentKeepingLocal = function (layer, parentLayer) {
  try {
    if (parentLayer && typeof layer.setParentWithJump === "function") {
      layer.setParentWithJump(parentLayer);
      return;
    }
  } catch (e) {}
  try { layer.parent = parentLayer || null; } catch (e2) {}
};

SORI_TOOLS.setParentPreserveVisual = function (layer, parentLayer) {
  try { layer.parent = parentLayer || null; } catch (e) {}
};

SORI_TOOLS.stretchFactor = function (layer) {
  var stretch = 100;
  try { stretch = Number(layer.stretch); } catch (e) {}
  if (!isFinite(stretch) || Math.abs(stretch) < 0.0001) stretch = 100;
  return stretch / 100;
};

SORI_TOOLS.sourceDisplayStart = function (layer) {
  try {
    if (layer && layer.source && layer.source.displayStartTime !== undefined) {
      var start = Number(layer.source.displayStartTime);
      if (isFinite(start)) return start;
    }
  } catch (e) {}
  return 0;
};

SORI_TOOLS.mapNestedTime = function (precompLayer, nestedTime, baseTime) {
  var base = baseTime;
  if (base === undefined || base === null) {
    try { base = precompLayer.startTime; } catch (e) {}
  }
  if (base === undefined || base === null || !isFinite(Number(base))) base = 0;

  // AE renders a nested composition from its displayStartTime at the precomp
  // layer's startTime. That makes the timeline transform:
  //
  //   parentTime = precomp.startTime
  //              + (sourceCompTime - source.displayStartTime)
  //              * (precomp.stretch / 100)
  //
  // This is the critical bit for SoriTools' precompose flow: the source comp is
  // trimmed to the selected span and displayStartTime is moved to the original
  // parent inPoint. Accounting for displayStartTime keeps extracted layer
  // bars, transform keyframes, mask paths, effect keyframes, and expressions
  // evaluated at the same visible parent time instead of sliding them forward.
  return Number(base) + ((Number(nestedTime) - SORI_TOOLS.sourceDisplayStart(precompLayer)) * SORI_TOOLS.stretchFactor(precompLayer));
};

SORI_TOOLS.unmapParentTime = function (precompLayer, parentTime) {
  var factor = SORI_TOOLS.stretchFactor(precompLayer);
  if (Math.abs(factor) < 0.0001) factor = 1;
  return SORI_TOOLS.sourceDisplayStart(precompLayer) + ((Number(parentTime) - Number(precompLayer.startTime)) / factor);
};

SORI_TOOLS.visibleSourceRangeForPrecompLayer = function (precompLayer) {
  return SORI_TOOLS.makeTimeRange(
    SORI_TOOLS.unmapParentTime(precompLayer, precompLayer.inPoint),
    SORI_TOOLS.unmapParentTime(precompLayer, precompLayer.outPoint)
  );
};

SORI_TOOLS.mapSourceRangeToParent = function (precompLayer, sourceRange) {
  return SORI_TOOLS.makeTimeRange(
    SORI_TOOLS.mapNestedTime(precompLayer, sourceRange.start),
    SORI_TOOLS.mapNestedTime(precompLayer, sourceRange.end)
  );
};

SORI_TOOLS.findExtractSourceRange = function (precompLayer, sourceComp, innerLayer, sourceVisibleRange) {
  var innerRange = SORI_TOOLS.makeTimeRange(innerLayer.inPoint, innerLayer.outPoint);
  var visibleHit = SORI_TOOLS.intersectTimeRange(innerRange, sourceVisibleRange);
  if (visibleHit && SORI_TOOLS.rangeDuration(visibleHit) > 0.0001) {
    return { range: visibleHit, mode: "visible-intersection", innerRange: innerRange };
  }

  var compDisplayStart = 0;
  try {
    compDisplayStart = Number(sourceComp.displayStartTime) || 0;
  } catch (edisplay) {}
  var compRange = SORI_TOOLS.makeTimeRange(compDisplayStart, compDisplayStart + (sourceComp.duration || 0));
  var compHit = SORI_TOOLS.intersectTimeRange(innerRange, compRange);
  if (compHit && SORI_TOOLS.rangeDuration(compHit) > 0.0001) {
    return { range: compHit, mode: "comp-intersection", innerRange: innerRange };
  }

  // Legacy repair path: older SoriTools precomp code could push the only
  // internal layer into negative time. If the parent precomp is visibly trimmed,
  // extracting over the wrapper span is safer than silently extracting nothing.
  try {
    if (sourceComp.numLayers === 1 || innerLayer.adjustmentLayer === true || innerLayer.nullLayer === true) {
      return { range: sourceVisibleRange, mode: "legacy-full-wrapper", innerRange: innerRange };
    }
  } catch (e) {}

  return null;
};

SORI_TOOLS.captureKeyframe = function (prop, keyIndex, offset, scale) {
  var rec = {
    time: offset + (prop.keyTime(keyIndex) * scale),
    value: prop.keyValue(keyIndex)
  };

  try { rec.inInterp = prop.keyInInterpolationType(keyIndex); } catch (e) {}
  try { rec.outInterp = prop.keyOutInterpolationType(keyIndex); } catch (e2) {}
  try { rec.inEase = SORI_TOOLS.scaleTemporalEase(prop.keyInTemporalEase(keyIndex), scale); } catch (e3) {}
  try { rec.outEase = SORI_TOOLS.scaleTemporalEase(prop.keyOutTemporalEase(keyIndex), scale); } catch (e4) {}
  try { rec.temporalContinuous = prop.keyTemporalContinuous(keyIndex); } catch (e5) {}
  try { rec.temporalAutoBezier = prop.keyTemporalAutoBezier(keyIndex); } catch (e6) {}
  try { rec.inSpatialTangent = prop.keyInSpatialTangent(keyIndex); } catch (e7) {}
  try { rec.outSpatialTangent = prop.keyOutSpatialTangent(keyIndex); } catch (e8) {}
  try { rec.spatialContinuous = prop.keySpatialContinuous(keyIndex); } catch (e9) {}
  try { rec.spatialAutoBezier = prop.keySpatialAutoBezier(keyIndex); } catch (e10) {}
  try { rec.roving = prop.keyRoving(keyIndex); } catch (e11) {}

  return rec;
};

SORI_TOOLS.scaleTemporalEase = function (eases, scale) {
  var divisor = Math.abs(Number(scale) || 1);
  if (divisor < 0.0001) divisor = 1;
  if (Math.abs(divisor - 1) < 0.0001) return eases;

  var result = [];
  for (var i = 0; i < eases.length; i += 1) {
    try {
      result.push(new KeyframeEase(Number(eases[i].speed) / divisor, Number(eases[i].influence)));
    } catch (e) {
      result.push(eases[i]);
    }
  }
  return result;
};

SORI_TOOLS.applyKeyframeMetadata = function (prop, keyIndex, rec) {
  try {
    if (rec.inInterp !== undefined && rec.outInterp !== undefined) {
      prop.setInterpolationTypeAtKey(keyIndex, rec.inInterp, rec.outInterp);
    }
  } catch (e) {}
  try {
    if (rec.inEase !== undefined && rec.outEase !== undefined) {
      prop.setTemporalEaseAtKey(keyIndex, rec.inEase, rec.outEase);
    }
  } catch (e2) {}
  try {
    if (rec.temporalContinuous !== undefined) prop.setTemporalContinuousAtKey(keyIndex, rec.temporalContinuous);
  } catch (e3) {}
  try {
    if (rec.temporalAutoBezier !== undefined) prop.setTemporalAutoBezierAtKey(keyIndex, rec.temporalAutoBezier);
  } catch (e4) {}
  try {
    if (rec.inSpatialTangent !== undefined && rec.outSpatialTangent !== undefined) {
      prop.setSpatialTangentsAtKey(keyIndex, rec.inSpatialTangent, rec.outSpatialTangent);
    }
  } catch (e5) {}
  try {
    if (rec.spatialContinuous !== undefined) prop.setSpatialContinuousAtKey(keyIndex, rec.spatialContinuous);
  } catch (e6) {}
  try {
    if (rec.spatialAutoBezier !== undefined) prop.setSpatialAutoBezierAtKey(keyIndex, rec.spatialAutoBezier);
  } catch (e7) {}
  try {
    if (rec.roving !== undefined) prop.setRovingAtKey(keyIndex, rec.roving);
  } catch (e8) {}
};

SORI_TOOLS.retimePropertyKeyframes = function (prop, offset, scale) {
  try {
    try {
      if (String(prop.matchName || "") === "ADBE Time Remapping") return;
    } catch (eskip) {}
    if (prop.propertyType === PropertyType.PROPERTY) {
      if (!prop.numKeys || prop.numKeys < 1) return;

      var keys = [];
      for (var k = 1; k <= prop.numKeys; k += 1) {
        keys.push(SORI_TOOLS.captureKeyframe(prop, k, offset, scale));
      }
      keys.sort(function (a, b) { return a.time - b.time; });

      for (var remove = prop.numKeys; remove >= 1; remove -= 1) {
        try { prop.removeKey(remove); } catch (eremove) {}
      }

      for (var i = 0; i < keys.length; i += 1) {
        try {
          prop.setValueAtTime(keys[i].time, keys[i].value);
          SORI_TOOLS.applyKeyframeMetadata(prop, prop.nearestKeyIndex(keys[i].time), keys[i]);
        } catch (eset) {}
      }
      return;
    }

    if (prop.numProperties) {
      for (var p = 1; p <= prop.numProperties; p += 1) {
        try { SORI_TOOLS.retimePropertyKeyframes(prop.property(p), offset, scale); } catch (echild) {}
      }
    }
  } catch (e) {}
};

SORI_TOOLS.retimeLayerKeyframes = function (layer, precompLayer, offsetOverride) {
  var offset = 0;
  if (offsetOverride !== undefined && offsetOverride !== null && isFinite(Number(offsetOverride))) {
    offset = Number(offsetOverride);
  } else {
    try { offset = Number(precompLayer.startTime) || 0; } catch (e) {}
    offset -= SORI_TOOLS.sourceDisplayStart(precompLayer) * SORI_TOOLS.stretchFactor(precompLayer);
  }
  var scale = SORI_TOOLS.stretchFactor(precompLayer);
  if (Math.abs(offset) < 0.0001 && Math.abs(scale - 1) < 0.0001) return;
  SORI_TOOLS.retimePropertyKeyframes(layer, offset, scale);
};

SORI_TOOLS.snapshotPrecompSelections = function (layers) {
  var snaps = [];
  for (var i = 0; i < layers.length; i += 1) {
    var layer = layers[i];
    if (!SORI_TOOLS.isPrecomp(layer)) continue;
    snaps.push({
      index: layer.index,
      name: layer.name,
      source: layer.source,
      startTime: layer.startTime,
      inPoint: layer.inPoint,
      outPoint: layer.outPoint
    });
  }
  snaps.sort(function (a, b) { return b.index - a.index; });
  return snaps;
};

SORI_TOOLS.resolvePrecompLayer = function (comp, snap) {
  try {
    var byIndex = comp.layer(snap.index);
    if (byIndex && byIndex.source === snap.source) return byIndex;
  } catch (e) {}

  var best = null;
  var bestScore = 999999;
  try {
    for (var i = comp.numLayers; i >= 1; i -= 1) {
      var layer = comp.layer(i);
      try {
        if (!layer || layer.source !== snap.source) continue;
        var score = Math.abs(layer.index - snap.index);
        try { score += Math.abs(layer.startTime - snap.startTime) * 100; } catch (e2) {}
        try { score += Math.abs(layer.inPoint - snap.inPoint) * 100; } catch (e3) {}
        try { score += Math.abs(layer.outPoint - snap.outPoint) * 100; } catch (e4) {}
        if (layer.name === snap.name) score -= 10;
        if (score < bestScore) {
          bestScore = score;
          best = layer;
        }
      } catch (e5) {}
    }
  } catch (e6) {}
  return best;
};

SORI_TOOLS.parentIndexInComp = function (layer, sourceComp) {
  try {
    if (layer.parent && layer.parent.containingComp === sourceComp) return layer.parent.index;
  } catch (e) {}
  return 0;
};

SORI_TOOLS.shiftLayerTiming = function (layer, inPoint, outPoint, startTime, stretchFactor) {
  try { layer.stretch = layer.stretch * stretchFactor; } catch (e) {}
  try { layer.startTime = startTime; } catch (e2) {}
  try { layer.inPoint = inPoint; } catch (e2) {}
  try { layer.outPoint = outPoint; } catch (e3) {}
};

SORI_TOOLS.pushDebugEvent = function (debug, event) {
  try {
    if (debug && debug.events) debug.events.push(event);
  } catch (e) {}
};

SORI_TOOLS.unprecomposeLayer = function (targetLayer, debug) {
  var result = {
    ok: false,
    skipped: false,
    reason: "",
    errors: [],
    extracted: [],
    copiedCount: 0,
    name: ""
  };

  var comp = null;
  var src = null;
  var proxyNull = null;
  var wasLocked = false;

  try { result.name = targetLayer.name; } catch (ename) {}

  try {
    if (!targetLayer) {
      result.skipped = true;
      result.reason = "missing layer";
      return result;
    }

    comp = targetLayer.containingComp || SORI_TOOLS.comp();
    wasLocked = SORI_TOOLS.unlockIfNeeded(targetLayer);

    if (!SORI_TOOLS.isPrecomp(targetLayer)) {
      result.skipped = true;
      result.reason = "not a precomp layer";
      SORI_TOOLS.pushDebugEvent(debug, { target: result.name, action: "skip", reason: result.reason });
      return result;
    }

    var risk = SORI_TOOLS.precompUnwrapRisk(targetLayer);
    if (risk) {
      result.skipped = true;
      result.reason = risk;
      SORI_TOOLS.pushDebugEvent(debug, { target: targetLayer.name, action: "skip", reason: risk });
      return result;
    }

    src = targetLayer.source;
    if (!src || src.numLayers < 1) {
      result.skipped = true;
      result.reason = "empty source comp";
      SORI_TOOLS.pushDebugEvent(debug, { target: targetLayer.name, action: "skip", reason: result.reason });
      return result;
    }

    try {
      var sourceLayersForDebug = [];
      for (var dbgLayer = 1; dbgLayer <= src.numLayers; dbgLayer += 1) sourceLayersForDebug.push(src.layer(dbgLayer));
      SORI_TOOLS.addPrecompRiskDebug(debug, sourceLayersForDebug);
    } catch (edbgRisk) {}

    var wrapperIn = targetLayer.inPoint;
    var wrapperOut = targetLayer.outPoint;
    var wrapperRange = SORI_TOOLS.makeTimeRange(wrapperIn, wrapperOut);
    var sourceVisibleRange = SORI_TOOLS.visibleSourceRangeForPrecompLayer(targetLayer);
    var stretchFactor = SORI_TOOLS.stretchFactor(targetLayer);
    var frameEpsilon = 0.0001;
    try { frameEpsilon = comp.frameDuration / 10; } catch (eframe) {}

    if (!sourceVisibleRange || SORI_TOOLS.rangeDuration(sourceVisibleRange) <= frameEpsilon) {
      sourceVisibleRange = SORI_TOOLS.makeTimeRange(0, src.duration || 0);
    }

    // Spatial context: copyToComp preserves each inner layer's own transform,
    // masks, effects, layer styles, keyframes, and expressions. It does not
    // automatically multiply in the wrapper precomp layer's transform. For
    // safe static wrappers, we create a temporary null with the precomp layer's
    // transform/parent matrix, parent each copied layer with setParentWithJump
    // to apply that matrix, then detach while preserving the resulting visual
    // world position. Animated/effect/masked wrapper precomps are skipped by
    // precompUnwrapRisk because baking those faithfully requires per-frame
    // rendering or a generated adjustment layer.
    proxyNull = comp.layers.addNull();
    try { proxyNull.name = "__SoriTools_Unprecomp_Matrix__"; } catch (en) {}
    try { proxyNull.moveBefore(targetLayer); } catch (emoveProxy) {}
    SORI_TOOLS.copyTransformSnapshot(proxyNull, targetLayer, comp.time);
    try {
      if (targetLayer.parent) SORI_TOOLS.setParentKeepingLocal(proxyNull, targetLayer.parent);
    } catch (eparent) {}

    var copiedLayers = [];
    var copiedByInnerIndex = {};
    var records = [];
    var insertBefore = targetLayer;

    for (var j = src.numLayers; j >= 1; j -= 1) {
      var innerWasLocked = false;
      try {
        var inner = src.layer(j);
        var parentIndex = SORI_TOOLS.parentIndexInComp(inner, src);
        var rangeInfo = SORI_TOOLS.findExtractSourceRange(targetLayer, src, inner, sourceVisibleRange);

        if (!rangeInfo || !rangeInfo.range || SORI_TOOLS.rangeDuration(rangeInfo.range) <= frameEpsilon) {
          SORI_TOOLS.pushDebugEvent(debug, {
            target: targetLayer.name,
            action: "inner-skip",
            inner: inner.name,
            reason: "outside visible source span",
            innerIn: inner.inPoint,
            innerOut: inner.outPoint,
            sourceVisibleIn: sourceVisibleRange.start,
            sourceVisibleOut: sourceVisibleRange.end
          });
          continue;
        }

        var mappedParentRange = SORI_TOOLS.mapSourceRangeToParent(targetLayer, rangeInfo.range);
        var nextIn = Math.max(mappedParentRange.start, wrapperRange.start);
        var nextOut = Math.min(mappedParentRange.end, wrapperRange.end);

        if (nextOut <= nextIn + frameEpsilon) {
          SORI_TOOLS.pushDebugEvent(debug, {
            target: targetLayer.name,
            action: "inner-skip",
            inner: inner.name,
            reason: "outside visible parent span",
            innerIn: inner.inPoint,
            innerOut: inner.outPoint,
            wrapperIn: wrapperIn,
            wrapperOut: wrapperOut,
            mappedIn: mappedParentRange.start,
            mappedOut: mappedParentRange.end,
            rangeMode: rangeInfo.mode
          });
          continue;
        }

        var beforeCopyRefs = SORI_TOOLS.snapshotCompLayers(comp);
        innerWasLocked = SORI_TOOLS.unlockIfNeeded(inner);
        inner.copyToComp(comp);
        SORI_TOOLS.relockIfNeeded(inner, innerWasLocked);
        innerWasLocked = false;

        var copied = SORI_TOOLS.findInsertedCompLayer(comp, beforeCopyRefs);
        if (!copied) throw new Error("Could not resolve copied layer after copyToComp().");
        var timingOffset = null;
        if (rangeInfo.mode === "legacy-full-wrapper") {
          timingOffset = nextIn - (Number(inner.inPoint) * stretchFactor);
          if (!isFinite(Number(timingOffset))) timingOffset = null;
        }
        var innerStartTime = Number(inner.startTime);
        if (!isFinite(innerStartTime)) innerStartTime = 0;
        var rangeStart = Number(rangeInfo.range.start);
        if (!isFinite(rangeStart)) rangeStart = Number(inner.inPoint);
        if (!isFinite(rangeStart)) rangeStart = 0;
        var visibleRangeOffset = nextIn - (rangeStart * stretchFactor);
        var timingMapOffset = timingOffset !== null ? timingOffset : visibleRangeOffset;
        var mappedStart = timingMapOffset + (innerStartTime * stretchFactor);

        var copiedStretchBefore = 100;
        try { copiedStretchBefore = Number(copied.stretch); } catch (estretchRead) {}
        if (!isFinite(copiedStretchBefore) || Math.abs(copiedStretchBefore) < 0.0001) copiedStretchBefore = 100;

        // AE stores Time-Reverse Layer bars with raw in/out endpoints reversed
        // (inPoint can be greater than outPoint). All range math above uses
        // sorted visual spans so clipping stays sane, but the final layer must
        // get its raw endpoint order back or AE may display/click the bar oddly
        // and the reverse timing can appear flattened after unprecompose.
        var finalStretchFactor = (copiedStretchBefore / 100) * stretchFactor;
        var rawNextIn = finalStretchFactor < 0 ? nextOut : nextIn;
        var rawNextOut = finalStretchFactor < 0 ? nextIn : nextOut;

        // copyToComp keeps keyframes in the source comp's timeline. To preserve
        // what the user actually sees in the trimmed wrapper, anchor the key
        // shift to the visible source segment that maps to nextIn, not to the
        // wrapper layer's raw startTime. This keeps nested/trimmed precomps
        // from sliding extracted layers away from their visible slot.
        SORI_TOOLS.retimeLayerKeyframes(copied, targetLayer, timingOffset !== null ? timingOffset : visibleRangeOffset);
        SORI_TOOLS.shiftLayerTiming(copied, rawNextIn, rawNextOut, mappedStart, stretchFactor);
        try { copied.moveBefore(insertBefore); } catch (emoveCopied) {}
        insertBefore = copied;

        copiedByInnerIndex[j] = copied;
        records.push({ layer: copied, parentIndex: parentIndex });
        copiedLayers.push(copied);

        SORI_TOOLS.pushDebugEvent(debug, {
          target: targetLayer.name,
          action: "copied",
          inner: inner.name,
          copied: copied.name,
          nextIn: nextIn,
          nextOut: nextOut,
          rawNextIn: rawNextIn,
          rawNextOut: rawNextOut,
          mappedStart: mappedStart,
          copiedStretchBefore: copiedStretchBefore,
          finalStretch: copiedStretchBefore * stretchFactor,
          rangeMode: rangeInfo.mode
        });
      } catch (ec) {
        try { SORI_TOOLS.relockIfNeeded(src.layer(j), innerWasLocked); } catch (erelockInner) {}
        result.errors.push("Could not copy layer " + j + ": " + ec.message);
        SORI_TOOLS.pushDebugEvent(debug, { target: result.name, action: "copy-error", layerIndex: j, reason: ec.message });
      }
    }

    if (!copiedLayers.length) {
      result.skipped = true;
      result.reason = "no copied layers";
      SORI_TOOLS.pushDebugEvent(debug, { target: targetLayer.name, action: "skip", reason: result.reason });
      try { proxyNull.remove(); } catch (erpn) {}
      proxyNull = null;
      return result;
    }

    for (var bake = 0; bake < records.length; bake += 1) {
      // setParentWithJump keeps the copied layer's local transform, so the
      // proxy's static precomp matrix is applied before we detach it again.
      SORI_TOOLS.setParentKeepingLocal(records[bake].layer, proxyNull);
    }

    for (var detach = 0; detach < records.length; detach += 1) {
      try {
        SORI_TOOLS.setParentPreserveVisual(records[detach].layer, targetLayer.parent || null);
      } catch (edetach) {
        SORI_TOOLS.setParentPreserveVisual(records[detach].layer, null);
      }
    }

    for (var r = 0; r < records.length; r += 1) {
      var rec = records[r];
      if (rec.parentIndex && copiedByInnerIndex[rec.parentIndex]) {
        SORI_TOOLS.setParentPreserveVisual(rec.layer, copiedByInnerIndex[rec.parentIndex]);
      }
    }

    var wrapperAdjustment = SORI_TOOLS.createUnprecompWrapperAdjustment(comp, targetLayer, copiedLayers.length ? copiedLayers[0] : targetLayer);
    if (wrapperAdjustment) {
      copiedLayers.unshift(wrapperAdjustment);
      records.unshift({ layer: wrapperAdjustment, parentIndex: 0 });
      SORI_TOOLS.pushDebugEvent(debug, { target: targetLayer.name, action: "wrapper-adjustment", layer: wrapperAdjustment.name });
    }

    for (var sel = 0; sel < copiedLayers.length; sel += 1) result.extracted.push(copiedLayers[sel]);

    try { proxyNull.remove(); } catch (eremoveProxy) {}
    proxyNull = null;

    try {
      if (SORI_TOOLS.DELETE_ORIGINAL_PRECOMP_ON_UNPRECOMP === false) {
        targetLayer.enabled = false;
        targetLayer.shy = true;
      } else {
        targetLayer.remove();
      }
    } catch (eremove) {
      try {
        targetLayer.enabled = false;
        targetLayer.shy = true;
      } catch (ehide) {}
    }

    result.ok = true;
    result.copiedCount = copiedLayers.length;
    SORI_TOOLS.pushDebugEvent(debug, { target: result.name, action: "processed", copiedCount: copiedLayers.length });
  } catch (e) {
    result.errors.push("Layer " + (result.name || "unknown") + ": " + e.message);
    result.reason = e.message;
    SORI_TOOLS.pushDebugEvent(debug, { target: result.name, action: "error", reason: e.message });
  } finally {
    try {
      if (proxyNull) proxyNull.remove();
    } catch (ecleanup) {}
    try { SORI_TOOLS.relockIfNeeded(targetLayer, wasLocked); } catch (erelock) {}
  }

  return result;
};

function unprecomposeLayer(targetLayer) {
  var debug = {
    version: SORI_TOOLS.UNPRECOMP_DEBUG_VERSION,
    compName: "",
    selectedCount: 0,
    targetCount: 1,
    selected: [],
    targets: [],
    events: []
  };
  try {
    var comp = targetLayer ? targetLayer.containingComp : SORI_TOOLS.comp();
    if (comp) debug.compName = comp.name;
  } catch (e) {}

  app.beginUndoGroup("Unprecompose Layers");
  var result = null;
  try {
    result = SORI_TOOLS.unprecomposeLayer(targetLayer, debug);
  } catch (e2) {
    result = {
      ok: false,
      skipped: false,
      reason: e2.message,
      errors: [e2.message],
      extracted: [],
      copiedCount: 0
    };
  }
  app.endUndoGroup();
  try { SORI_TOOLS.writeDebugFile("unprecomp-debug.json", debug); } catch (e3) {}
  return result;
}

SORI_TOOLS.unprecompSelected = function () {
  var comp = SORI_TOOLS.comp();
  if (!comp) return SORI_TOOLS.respond(false, "No active composition.");
  var layers = SORI_TOOLS.selectedLayers(comp);
  if (!layers.length) return SORI_TOOLS.respond(false, "Select precomp layer(s).");
  var targets = SORI_TOOLS.snapshotPrecompSelections(layers);
  var debug = {
    version: SORI_TOOLS.UNPRECOMP_DEBUG_VERSION,
    compName: comp.name,
    selectedCount: layers.length,
    targetCount: targets.length,
    selected: [],
    targets: [],
    events: []
  };
  for (var dbgSel = 0; dbgSel < layers.length; dbgSel += 1) {
    try {
      debug.selected.push({
        index: layers[dbgSel].index,
        name: layers[dbgSel].name,
        isPrecomp: SORI_TOOLS.isPrecomp(layers[dbgSel]),
        sourceName: layers[dbgSel].source ? layers[dbgSel].source.name : ""
      });
    } catch (edbgSel) {}
  }
  for (var dbgTarget = 0; dbgTarget < targets.length; dbgTarget += 1) {
    try {
      debug.targets.push({
        index: targets[dbgTarget].index,
        name: targets[dbgTarget].name,
        sourceName: targets[dbgTarget].source ? targets[dbgTarget].source.name : ""
      });
    } catch (edbgTarget) {}
  }
  if (!targets.length) {
    var selectedNames = [];
    for (var ns = 0; ns < layers.length; ns += 1) {
      try { selectedNames.push(layers[ns].name); } catch (ens) {}
    }
    SORI_TOOLS.writeDebugFile("unprecomp-debug.json", debug);
    return SORI_TOOLS.respond(false, "Selected layer is not a precomp" + (selectedNames.length ? ": " + selectedNames.join(", ") : "."));
  }

  app.beginUndoGroup("SoriTools Unprecomp");
  var processed = 0;
  var skipped = 0;
  var errors = [];
  var allExtracted = [];

  for (var i = 0; i < targets.length; i += 1) {
    var snap = targets[i];
    var layer = SORI_TOOLS.resolvePrecompLayer(comp, snap);
    if (!layer) {
      skipped += 1;
      errors.push(snap.name + " skipped: layer was not found.");
      debug.events.push({ target: snap.name, action: "skip", reason: "layer was not found" });
      continue;
    }
    try {
      var unwrapResult = SORI_TOOLS.unprecomposeLayer(layer, debug);
      if (unwrapResult && unwrapResult.ok) {
        processed += 1;
        for (var ex = 0; ex < unwrapResult.extracted.length; ex += 1) allExtracted.push(unwrapResult.extracted[ex]);
      } else {
        skipped += 1;
        var reason = unwrapResult && unwrapResult.reason ? unwrapResult.reason : "not extracted";
        errors.push((unwrapResult && unwrapResult.name ? unwrapResult.name : snap.name) + " skipped: " + reason + ".");
      }
      if (unwrapResult && unwrapResult.errors && unwrapResult.errors.length) {
        for (var er = 0; er < unwrapResult.errors.length; er += 1) errors.push(unwrapResult.errors[er]);
      }
    } catch (e) {
      errors.push("Layer " + layer.name + ": " + e.message);
      skipped += 1;
      debug.events.push({ target: snap.name, action: "error", reason: e.message });
    }
  }

  app.endUndoGroup();
  debug.processed = processed;
  debug.skipped = skipped;
  debug.errors = errors;
  SORI_TOOLS.writeDebugFile("unprecomp-debug.json", debug);

  if (processed === 0) {
    var msg = targets.length ? "No layers were extracted from the selected precomp layer(s)." : "No precomp layers found in selection.";
    if (errors.length) msg += "\n" + errors.join("\n");
    return SORI_TOOLS.respond(false, msg);
  }

  try {
    for (var clear = 1; clear <= comp.numLayers; clear += 1) comp.layer(clear).selected = false;
  } catch (eclear) {}
  for (var outSel = 0; outSel < allExtracted.length; outSel += 1) {
    try { allExtracted[outSel].selected = true; } catch (esel) {}
  }

  var result = processed + " precomp" + (processed > 1 ? "s" : "") + " extracted.";
  if (skipped > 0) result += " Skipped " + skipped + ".";
  return SORI_TOOLS.respond(true, result);
};

SORI_TOOLS.timelineMove = function (payload) {
  var data = SORI_TOOLS.parse(payload);
  var comp = SORI_TOOLS.comp();
  if (!comp) return SORI_TOOLS.respond(false, "No active composition.");

  app.beginUndoGroup("SoriTools Timeline");

  try {
    var amount = Number(data.amount) || 0;
    var step = Math.max(1, Number(data.step) || 1);
    var frames = amount * step;
    var offset = frames * comp.frameDuration;
    var moveNegative = data.mode === "in";
    var movePositive = data.mode === "out";

    if (moveNegative) offset = -offset;
    if (!moveNegative && !movePositive) offset = 0;

    var maxTime = Math.max(0, comp.duration - comp.frameDuration);

    if (data.playheadFrames) {
      comp.time = SORI_TOOLS.clamp((Number(comp.time) || 0) + offset, 0, maxTime);
    } else if (data.shift) {
      var layers = SORI_TOOLS.selectedLayers(comp);
      if (!layers.length) {
        app.endUndoGroup();
        return SORI_TOOLS.respond(false, "Select at least one layer.");
      }

      for (var i = 0; i < layers.length; i += 1) {
        var wasLocked = SORI_TOOLS.unlockIfNeeded(layers[i]);
        try {
          layers[i].startTime += offset;
        } catch (e) {}
        SORI_TOOLS.relockIfNeeded(layers[i], wasLocked);
      }
    } else {
      var layers = SORI_TOOLS.selectedLayers(comp);
      if (!layers.length) {
        app.endUndoGroup();
        return SORI_TOOLS.respond(false, "Select at least one layer.");
      }
      var span = SORI_TOOLS.span(layers);
      if (span) {
        var target = span.start;
        if (data.mode === "center") target = (span.start + span.end) / 2;
        if (data.mode === "out") target = span.end;
        comp.time = SORI_TOOLS.clamp(target, 0, maxTime);
      }
    }
  } catch (e2) {
    app.endUndoGroup();
    return SORI_TOOLS.respond(false, "Timeline move failed: " + e2.message);
  }

  app.endUndoGroup();
  if (data.playheadFrames) return SORI_TOOLS.respond(true, "Moved current time by frame offset.");
  return SORI_TOOLS.respond(true, data.shift ? "Moved selected layer timing." : "Moved current time.");
};

SORI_TOOLS.applyPreset = function (path) {
  var comp = SORI_TOOLS.comp();
  if (!comp) return SORI_TOOLS.respond(false, "No active composition.");
  var layers = SORI_TOOLS.selectedLayers(comp);
  if (!layers.length) return SORI_TOOLS.respond(false, "Select layer(s) first.");

  var file = new File(path);
  if (!file.exists) return SORI_TOOLS.respond(false, "Preset file not found:\n" + decodeURI(file.name));

  app.beginUndoGroup("SoriTools Apply Preset");
  var applied = 0;
  var skipped = 0;
  var errors = [];

  for (var i = 0; i < layers.length; i += 1) {
    var layer = layers[i];
    var wasLocked = SORI_TOOLS.unlockIfNeeded(layer);
    try {
      layer.applyPreset(file);
      applied += 1;
    } catch (e) {
      skipped += 1;
      errors.push(layer.name + ": " + e.message);
    }
    SORI_TOOLS.relockIfNeeded(layer, wasLocked);
  }

  app.endUndoGroup();

  if (applied === 0) {
    var msg = "Could not apply preset to any layer.";
    if (errors.length) msg += "\n" + errors[0];
    return SORI_TOOLS.respond(false, msg);
  }
  return SORI_TOOLS.respond(true, "Applied preset to " + applied + " layer" + (applied > 1 ? "s" : "") + ".");
};

SORI_TOOLS.propertyPathToken = function (prop) {
  var matchName = "";
  var name = "";
  var index = "";
  try { matchName = prop.matchName || ""; } catch (e) {}
  try { name = prop.name || ""; } catch (e2) {}
  try { index = String(prop.propertyIndex || ""); } catch (e3) {}
  return matchName + "|" + name + "|" + index;
};

SORI_TOOLS.collectLayerPropertySnapshot = function (layer) {
  var snapshot = {};

  function walk(group, prefix) {
    var count = 0;
    try { count = group.numProperties || 0; } catch (eCount) { return; }
    for (var i = 1; i <= count; i += 1) {
      var prop = null;
      try { prop = group.property(i); } catch (eProp) {}
      if (!prop) continue;

      var path = prefix + "/" + SORI_TOOLS.propertyPathToken(prop);
      try {
        if (prop.propertyType === PropertyType.PROPERTY) {
          snapshot[path] = { numKeys: Number(prop.numKeys) || 0 };
        } else {
          walk(prop, path);
        }
      } catch (eWalk) {}
    }
  }

  walk(layer, "");
  return snapshot;
};

SORI_TOOLS.collectSmartPresetKeyedProperties = function (layer, beforeSnapshot) {
  var props = [];

  function walk(group, prefix) {
    var count = 0;
    try { count = group.numProperties || 0; } catch (eCount) { return; }
    for (var i = 1; i <= count; i += 1) {
      var prop = null;
      try { prop = group.property(i); } catch (eProp) {}
      if (!prop) continue;

      var path = prefix + "/" + SORI_TOOLS.propertyPathToken(prop);
      try {
        if (prop.propertyType === PropertyType.PROPERTY) {
          var keyCount = Number(prop.numKeys) || 0;
          var before = beforeSnapshot ? beforeSnapshot[path] : null;
          if (keyCount > 0 && (!before || !before.numKeys)) {
            props.push(prop);
          }
        } else {
          walk(prop, path);
        }
      } catch (eWalk) {}
    }
  }

  walk(layer, "");
  return props;
};

SORI_TOOLS.keyedPropertyTimeRange = function (props) {
  var start = null;
  var end = null;
  for (var i = 0; i < props.length; i += 1) {
    var prop = props[i];
    var count = 0;
    try { count = prop.numKeys || 0; } catch (eCount) {}
    for (var k = 1; k <= count; k += 1) {
      try {
        var t = prop.keyTime(k);
        if (start === null || t < start) start = t;
        if (end === null || t > end) end = t;
      } catch (eTime) {}
    }
  }
  if (start === null || end === null) return null;
  return { start: start, end: end };
};

SORI_TOOLS.smartPresetTargetRange = function (layer, comp, mode) {
  var start = 0;
  var end = 0;
  var frame = 1 / 24;
  try { frame = comp.frameDuration || frame; } catch (eFrame) {}

  try { start = Number(layer.inPoint) || 0; } catch (eStart) {}
  try { end = Number(layer.outPoint) || start; } catch (eEnd) {}

  if (mode === "fromPlayhead") {
    var playhead = start;
    try { playhead = Number(comp.time) || start; } catch (eTime) {}
    if (playhead < start) playhead = start;
    if (playhead > end) playhead = end;
    start = playhead;
  }

  if (end <= start) end = start + frame;
  return { start: start, end: end };
};

SORI_TOOLS.retimePropertyKeyframesToRange = function (prop, sourceStart, sourceEnd, targetStart, targetEnd) {
  try {
    if (!prop.numKeys || prop.numKeys < 1) return false;

    var sourceDuration = sourceEnd - sourceStart;
    var targetDuration = targetEnd - targetStart;
    var scale = Math.abs(sourceDuration) < 0.0001 ? 1 : (targetDuration / sourceDuration);
    var offset = Math.abs(sourceDuration) < 0.0001 ? (targetStart - sourceStart) : (targetStart - (sourceStart * scale));
    var keys = [];

    for (var k = 1; k <= prop.numKeys; k += 1) {
      keys.push(SORI_TOOLS.captureKeyframe(prop, k, offset, scale));
    }
    keys.sort(function (a, b) { return a.time - b.time; });

    for (var remove = prop.numKeys; remove >= 1; remove -= 1) {
      try { prop.removeKey(remove); } catch (eRemove) {}
    }

    for (var i = 0; i < keys.length; i += 1) {
      try {
        prop.setValueAtTime(keys[i].time, keys[i].value);
        SORI_TOOLS.applyKeyframeMetadata(prop, prop.nearestKeyIndex(keys[i].time), keys[i]);
      } catch (eSet) {}
    }
    return true;
  } catch (e) {}
  return false;
};

SORI_TOOLS.smartPresetTargetList = function () {
  var comp = SORI_TOOLS.comp();
  if (!comp) return SORI_TOOLS.respond(false, "No active composition.");
  var layers = SORI_TOOLS.selectedLayers(comp);
  if (!layers.length) return SORI_TOOLS.respond(false, "Select layer(s) first.");

  var out = [];
  for (var i = 0; i < layers.length; i += 1) {
    out.push({ index: layers[i].index, name: layers[i].name });
  }
  return SORI_TOOLS.respond(true, "", out);
};

SORI_TOOLS.restoreLayerSelectionByIndex = function (comp, indices) {
  try {
    for (var clear = 1; clear <= comp.numLayers; clear += 1) {
      comp.layer(clear).selected = false;
    }
    for (var i = 0; i < indices.length; i += 1) {
      var layer = comp.layer(Number(indices[i]));
      if (layer) layer.selected = true;
    }
  } catch (e) {}
};

SORI_TOOLS.applyPresetSmartToLayer = function (layer, file, comp, mode) {
  var result = { applied: 0, fitted: 0, skipped: 0, error: "" };
  var wasLocked = SORI_TOOLS.unlockIfNeeded(layer);
  try {
    var before = SORI_TOOLS.collectLayerPropertySnapshot(layer);
    layer.applyPreset(file);
    result.applied = 1;

    var props = SORI_TOOLS.collectSmartPresetKeyedProperties(layer, before);
    var sourceRange = SORI_TOOLS.keyedPropertyTimeRange(props);
    if (!props.length || !sourceRange) {
      result.skipped = 1;
    } else {
      var targetRange = SORI_TOOLS.smartPresetTargetRange(layer, comp, mode);
      for (var p = 0; p < props.length; p += 1) {
        if (SORI_TOOLS.retimePropertyKeyframesToRange(props[p], sourceRange.start, sourceRange.end, targetRange.start, targetRange.end)) {
          result.fitted += 1;
        }
      }
    }
  } catch (e) {
    result.skipped = 1;
    result.error = layer.name + ": " + e.message;
  }
  SORI_TOOLS.relockIfNeeded(layer, wasLocked);
  return result;
};

SORI_TOOLS.applyPresetSmartLayer = function (payload) {
  var data = SORI_TOOLS.parse(payload);
  var path = data && data.path ? data.path : "";
  var mode = data && data.mode === "fromPlayhead" ? "fromPlayhead" : "fitLayer";
  var layerIndex = data ? Number(data.layerIndex) : 0;
  var restoreSelection = data && data.selection instanceof Array ? data.selection : [];

  var comp = SORI_TOOLS.comp();
  if (!comp) return SORI_TOOLS.respond(false, "No active composition.");
  if (!layerIndex) return SORI_TOOLS.respond(false, "Invalid target layer.");

  var file = new File(path);
  if (!file.exists) return SORI_TOOLS.respond(false, "Preset file not found:\n" + decodeURI(file.name));

  var layer = null;
  try { layer = comp.layer(layerIndex); } catch (eLayer) {}
  if (!layer) return SORI_TOOLS.respond(false, "Target layer not found.");

  app.beginUndoGroup(mode === "fromPlayhead" ? "SoriTools Smart Preset From Playhead" : "SoriTools Smart Preset Fit Layer");

  try {
    SORI_TOOLS.restoreLayerSelectionByIndex(comp, [layerIndex]);
  } catch (eSelect) {}

  var result = SORI_TOOLS.applyPresetSmartToLayer(layer, file, comp, mode);

  try {
    if (restoreSelection.length) SORI_TOOLS.restoreLayerSelectionByIndex(comp, restoreSelection);
  } catch (eRestore) {}

  app.endUndoGroup();

  if (!result.applied) {
    return SORI_TOOLS.respond(false, result.error || "Could not smart apply preset.");
  }
  return SORI_TOOLS.respond(true, "", result);
};

SORI_TOOLS.applyPresetSmart = function (payload) {
  var data = SORI_TOOLS.parse(payload);
  var path = data && data.path ? data.path : "";
  var mode = data && data.mode === "fromPlayhead" ? "fromPlayhead" : "fitLayer";

  var comp = SORI_TOOLS.comp();
  if (!comp) return SORI_TOOLS.respond(false, "No active composition.");
  var layers = SORI_TOOLS.selectedLayers(comp);
  if (!layers.length) return SORI_TOOLS.respond(false, "Select layer(s) first.");

  var file = new File(path);
  if (!file.exists) return SORI_TOOLS.respond(false, "Preset file not found:\n" + decodeURI(file.name));

  app.beginUndoGroup(mode === "fromPlayhead" ? "SoriTools Smart Preset From Playhead" : "SoriTools Smart Preset Fit Layer");

  var applied = 0;
  var fitted = 0;
  var skipped = 0;
  var errors = [];

  for (var i = 0; i < layers.length; i += 1) {
    var layer = layers[i];
    var result = SORI_TOOLS.applyPresetSmartToLayer(layer, file, comp, mode);
    applied += result.applied;
    fitted += result.fitted;
    skipped += result.skipped;
    if (result.error) errors.push(result.error);
  }

  app.endUndoGroup();

  if (applied === 0) {
    var failMsg = "Could not smart apply preset to any layer.";
    if (errors.length) failMsg += "\n" + errors[0];
    return SORI_TOOLS.respond(false, failMsg);
  }

  var msg = "Smart applied preset to " + applied + " layer" + (applied > 1 ? "s" : "") + ".";
  if (!fitted) msg += " No new preset keyframes found to fit.";
  if (skipped && fitted) msg += " Some layers had no new keyframes.";
  return SORI_TOOLS.respond(true, msg, { applied: applied, fittedProperties: fitted, skipped: skipped });
};

SORI_TOOLS.boostRestoreFileName = function () {
  return "boost-restore-state.json";
};

SORI_TOOLS.readBoostRestoreStateText = function () {
  return SORI_TOOLS.readTextFile(SORI_TOOLS.boostRestoreFileName());
};

SORI_TOOLS.writeBoostRestoreStateText = function (text) {
  return SORI_TOOLS.writeTextFile(SORI_TOOLS.boostRestoreFileName(), text);
};

SORI_TOOLS.collectBoostComps = function (rootComp) {
  var comps = [];
  var seen = {};

  function walk(comp) {
    if (!comp) return;
    var key = SORI_TOOLS.compStateKey(comp);
    if (seen[key]) return;
    seen[key] = true;
    comps.push(comp);
    try {
      for (var i = 1; i <= comp.numLayers; i += 1) {
        var layer = comp.layer(i);
        try {
          if (layer && layer.source && layer.source instanceof CompItem) walk(layer.source);
        } catch (elayer) {}
      }
    } catch (e) {}
  }

  walk(rootComp);
  return comps;
};

SORI_TOOLS.captureBoostCompState = function (comp) {
  var state = { key: SORI_TOOLS.compStateKey(comp), name: "", index: 0 };
  try { state.name = comp.name; } catch (e) {}
  try { state.index = comp.index; } catch (e2) {}
  try { state.resolutionFactor = comp.resolutionFactor; } catch (e3) {}
  try { state.draft3d = comp.draft3d; } catch (e4) {}
  try { state.motionBlur = comp.motionBlur; } catch (e5) {}
  try { state.frameBlending = comp.frameBlending; } catch (e6) {}
  try { state.workAreaStart = comp.workAreaStart; } catch (e7) {}
  try { state.workAreaDuration = comp.workAreaDuration; } catch (e8) {}
  return state;
};

SORI_TOOLS.captureBoostLayerState = function (comp, layer) {
  var state = { key: SORI_TOOLS.effectStateKey(comp, layer), compKey: SORI_TOOLS.compStateKey(comp), name: "", index: 0 };
  try { state.name = layer.name; } catch (e) {}
  try { state.index = layer.index; } catch (e2) {}
  try { state.quality = layer.quality; } catch (e3) {}
  try { state.samplingQuality = layer.samplingQuality; } catch (e4) {}
  try { state.motionBlur = layer.motionBlur; } catch (e5) {}
  try { state.frameBlendingType = layer.frameBlendingType; } catch (e6) {}
  return state;
};

SORI_TOOLS.findBoostComp = function (state) {
  try {
    if (state.index && app.project.item(state.index) instanceof CompItem) {
      var byIndex = app.project.item(state.index);
      if (SORI_TOOLS.compStateKey(byIndex) === state.key) return byIndex;
    }
  } catch (e) {}
  try {
    for (var i = 1; i <= app.project.numItems; i += 1) {
      var item = app.project.item(i);
      if (item instanceof CompItem && SORI_TOOLS.compStateKey(item) === state.key) return item;
    }
  } catch (e2) {}
  return null;
};

SORI_TOOLS.findBoostLayer = function (comp, state) {
  try {
    if (state.index && comp.layer(state.index) && SORI_TOOLS.effectStateKey(comp, comp.layer(state.index)) === state.key) return comp.layer(state.index);
  } catch (e) {}
  try {
    for (var i = 1; i <= comp.numLayers; i += 1) {
      var layer = comp.layer(i);
      if (SORI_TOOLS.effectStateKey(comp, layer) === state.key) return layer;
    }
  } catch (e2) {}
  return null;
};

SORI_TOOLS.boostCacheFolder = function () {
  try {
    var tmp = SORI_TOOLS.tmpFolder();
    if (!tmp) return null;
    var folder = new Folder(tmp.fsName + "/boost-cache");
    if (!folder.exists) folder.create();
    return folder;
  } catch (e) {}
  return null;
};

SORI_TOOLS.boostCacheLimitBytes = function () {
  return 5 * 1024 * 1024 * 1024;
};

SORI_TOOLS.fileModifiedTime = function (file) {
  try { return file.modified ? file.modified.getTime() : 0; } catch (e) {}
  return 0;
};

SORI_TOOLS.collectBoostCacheFiles = function (folder) {
  var out = [];
  try {
    var files = folder.getFiles();
    for (var i = 0; i < files.length; i += 1) {
      var item = files[i];
      if (item instanceof Folder) {
        var nested = SORI_TOOLS.collectBoostCacheFiles(item);
        for (var n = 0; n < nested.length; n += 1) out.push(nested[n]);
      } else if (item instanceof File) {
        out.push(item);
      }
    }
  } catch (e) {}
  return out;
};

SORI_TOOLS.enforceBoostCacheLimit = function () {
  var folder = SORI_TOOLS.boostCacheFolder();
  if (!folder) return { folder: "", bytes: 0, removed: 0 };
  var files = SORI_TOOLS.collectBoostCacheFiles(folder);
  var total = 0;
  for (var i = 0; i < files.length; i += 1) {
    try { total += Number(files[i].length) || 0; } catch (e) {}
  }
  files.sort(function (a, b) { return SORI_TOOLS.fileModifiedTime(a) - SORI_TOOLS.fileModifiedTime(b); });
  var removed = 0;
  var limit = SORI_TOOLS.boostCacheLimitBytes();
  for (var j = 0; total > limit && j < files.length; j += 1) {
    var size = 0;
    try { size = Number(files[j].length) || 0; } catch (e2) {}
    try {
      if (files[j].remove()) {
        total -= size;
        removed += 1;
      }
    } catch (eremove) {}
  }
  return { folder: folder.fsName, bytes: total, removed: removed };
};

SORI_TOOLS.isHeavyEffectName = function (name) {
  var text = String(name || "").toLowerCase();
  var heavy = ["twixtor", "rsmb", "reel smart", "sapphire", "bcc", "continuum", "particular", "form", "element", "magic bullet", "looks", "denoise", "neat", "pixel motion", "warp stabilizer", "camera lens blur", "depth of field", "3d camera tracker"];
  for (var i = 0; i < heavy.length; i += 1) {
    if (text.indexOf(heavy[i]) >= 0) return true;
  }
  return false;
};

SORI_TOOLS.boostHeavyEffectKey = function (comp, layer, effectProp, index) {
  var matchName = "";
  var name = "";
  try { matchName = String(effectProp.matchName || ""); } catch (e) {}
  try { name = String(effectProp.name || ""); } catch (e2) {}
  return SORI_TOOLS.effectStateKey(comp, layer) + "|fx:" + String(index || 0) + ":" + matchName + ":" + name;
};

SORI_TOOLS.captureHeavyFxState = function (comps, state) {
  if (!state.heavyFx) state.heavyFx = {};
  for (var i = 0; i < comps.length; i += 1) {
    var comp = comps[i];
    try {
      for (var j = 1; j <= comp.numLayers; j += 1) {
        var layer = comp.layer(j);
        var fx = null;
        try { fx = layer.property("ADBE Effect Parade"); } catch (efx) {}
        if (!fx || fx.numProperties < 1) continue;
        for (var k = 1; k <= fx.numProperties; k += 1) {
          var effectProp = fx.property(k);
          var effectName = "";
          var matchName = "";
          try { effectName = String(effectProp.name || ""); } catch (ename) {}
          try { matchName = String(effectProp.matchName || ""); } catch (ematch) {}
          if (!SORI_TOOLS.isHeavyEffectName(effectName) && !SORI_TOOLS.isHeavyEffectName(matchName)) continue;
          var key = SORI_TOOLS.boostHeavyEffectKey(comp, layer, effectProp, k);
          if (state.heavyFx[key] === undefined) {
            try { state.heavyFx[key] = effectProp.enabled === true; } catch (ecap) { state.heavyFx[key] = true; }
          }
        }
      }
    } catch (e) {}
  }
};

SORI_TOOLS.applyHeavyFxBypass = function (comps, state, captureMissing) {
  if (!state.heavyFx) state.heavyFx = {};
  var changed = 0;
  for (var i = 0; i < comps.length; i += 1) {
    var comp = comps[i];
    try {
      for (var j = 1; j <= comp.numLayers; j += 1) {
        var layer = comp.layer(j);
        var fx = null;
        try { fx = layer.property("ADBE Effect Parade"); } catch (efx) {}
        if (!fx || fx.numProperties < 1) continue;
        for (var k = 1; k <= fx.numProperties; k += 1) {
          var effectProp = fx.property(k);
          var effectName = "";
          var matchName = "";
          try { effectName = String(effectProp.name || ""); } catch (ename) {}
          try { matchName = String(effectProp.matchName || ""); } catch (ematch) {}
          if (!SORI_TOOLS.isHeavyEffectName(effectName) && !SORI_TOOLS.isHeavyEffectName(matchName)) continue;
          var key = SORI_TOOLS.boostHeavyEffectKey(comp, layer, effectProp, k);
          if (captureMissing && state.heavyFx[key] === undefined) {
            try { state.heavyFx[key] = effectProp.enabled === true; } catch (ecap) { state.heavyFx[key] = true; }
          }
          try {
            if (effectProp.enabled === true) {
              effectProp.enabled = false;
              changed += 1;
            }
          } catch (edisable) {}
        }
      }
    } catch (e) {}
  }
  return changed;
};

SORI_TOOLS.restoreHeavyFxBypass = function (state) {
  if (!state || !state.heavyFx) return 0;
  var restored = 0;
  try {
    for (var i = 1; i <= app.project.numItems; i += 1) {
      var comp = app.project.item(i);
      if (!(comp instanceof CompItem)) continue;
      for (var j = 1; j <= comp.numLayers; j += 1) {
        var layer = comp.layer(j);
        var fx = null;
        try { fx = layer.property("ADBE Effect Parade"); } catch (efx) {}
        if (!fx || fx.numProperties < 1) continue;
        for (var k = 1; k <= fx.numProperties; k += 1) {
          var effectProp = fx.property(k);
          var key = SORI_TOOLS.boostHeavyEffectKey(comp, layer, effectProp, k);
          if (state.heavyFx[key] === undefined) continue;
          try {
            effectProp.enabled = state.heavyFx[key] === true;
            restored += 1;
          } catch (erestore) {}
        }
      }
    }
  } catch (e) {}
  return restored;
};

SORI_TOOLS.detectHeavyBoostEffects = function (comps) {
  var found = [];
  for (var i = 0; i < comps.length; i += 1) {
    var comp = comps[i];
    try {
      for (var j = 1; j <= comp.numLayers; j += 1) {
        var layer = comp.layer(j);
        var fx = null;
        try { fx = layer.property("ADBE Effect Parade"); } catch (efx) {}
        if (!fx || fx.numProperties < 1) continue;
        for (var k = 1; k <= fx.numProperties; k += 1) {
          var effectProp = fx.property(k);
          var effectName = "";
          var matchName = "";
          try { effectName = String(effectProp.name || ""); } catch (ename) {}
          try { matchName = String(effectProp.matchName || ""); } catch (ematch) {}
          if (SORI_TOOLS.isHeavyEffectName(effectName) || SORI_TOOLS.isHeavyEffectName(matchName)) {
            found.push({ comp: comp.name, layer: layer.name, effect: effectName || matchName, matchName: matchName });
          }
        }
      }
    } catch (e) {}
  }
  return found;
};

SORI_TOOLS.applyBoostSystemSettings = function (state, settings) {
  try {
    if ((!settings || settings.purge !== false) && typeof PurgeTarget !== "undefined" && app && app.purge) {
      var purgeTarget = null;
      if (PurgeTarget.ALL_MEMORY_CACHES !== undefined) purgeTarget = PurgeTarget.ALL_MEMORY_CACHES;
      if (purgeTarget === null && PurgeTarget.IMAGE_CACHES !== undefined) purgeTarget = PurgeTarget.IMAGE_CACHES;
      if (purgeTarget !== null) {
        app.purge(purgeTarget);
        state.memoryPurged = true;
      }
    }
  } catch (e) {}
};

SORI_TOOLS.restoreBoostSystemSettings = function (state) {
  return true;
};

SORI_TOOLS.applyBoostRules = function (comps, settings, state) {
  var opts = settings || SORI_TOOLS.boostProfileSettings("strong");
  var compCount = 0;
  var layerCount = 0;
  var heavyBypassed = 0;
  for (var i = 0; i < comps.length; i += 1) {
    var comp = comps[i];
    try {
      var resolutionFactor = comp.resolutionFactor;
      if (resolutionFactor[0] !== opts.resolutionFactor[0] || resolutionFactor[1] !== opts.resolutionFactor[1]) comp.resolutionFactor = opts.resolutionFactor;
    } catch (e) {}
    try { if (comp.draft3d !== (opts.draft3d === true)) comp.draft3d = opts.draft3d === true; } catch (e2) {}
    try { if (opts.disableMotion && comp.motionBlur !== false) comp.motionBlur = false; } catch (e3) {}
    try { if (opts.disableMotion && comp.frameBlending !== false) comp.frameBlending = false; } catch (e4) {}
    compCount += 1;
    try {
      for (var j = 1; j <= comp.numLayers; j += 1) {
        var layer = comp.layer(j);
        try { if (opts.draftLayers && layer.quality !== LayerQuality.DRAFT) layer.quality = LayerQuality.DRAFT; } catch (lq) {}
        try { if (opts.bilinear && layer.samplingQuality !== LayerSamplingQuality.BILINEAR) layer.samplingQuality = LayerSamplingQuality.BILINEAR; } catch (ls) {}
        try { if (opts.disableMotion && layer.motionBlur !== false) layer.motionBlur = false; } catch (lm) {}
        try { if (opts.disableMotion && layer.frameBlendingType !== FrameBlendingType.NO_FRAME_BLEND) layer.frameBlendingType = FrameBlendingType.NO_FRAME_BLEND; } catch (lf) {}
        layerCount += 1;
      }
    } catch (elayers) {}
  }
  if (opts.bypassHeavyFx && state) heavyBypassed = SORI_TOOLS.applyHeavyFxBypass(comps, state, false);
  return { comps: compCount, layers: layerCount, heavyBypassed: heavyBypassed };
};

SORI_TOOLS.updateBoostStateFromCurrent = function (state, settings) {
  if (!state || !state.comps) return;
  var opts = settings || SORI_TOOLS.boostProfileSettings(state.profile || "strong");
  var compMap = {};
  for (var i = 0; i < state.comps.length; i += 1) {
    var cs = state.comps[i];
    var comp = SORI_TOOLS.findBoostComp(cs);
    if (!comp) continue;
    compMap[cs.key] = comp;
    try { if (opts.disableMotion && comp.motionBlur !== false) cs.motionBlur = comp.motionBlur; } catch (e) {}
    try { if (opts.disableMotion && comp.frameBlending !== false) cs.frameBlending = comp.frameBlending; } catch (e2) {}
    try { var rf = comp.resolutionFactor; if (rf[0] !== opts.resolutionFactor[0] || rf[1] !== opts.resolutionFactor[1]) cs.resolutionFactor = rf; } catch (e3) {}
    try { if (comp.draft3d !== (opts.draft3d === true)) cs.draft3d = comp.draft3d; } catch (e4) {}
  }
  for (var j = 0; state.layers && j < state.layers.length; j += 1) {
    var ls = state.layers[j];
    var lComp = compMap[ls.compKey];
    if (!lComp) continue;
    var layer = SORI_TOOLS.findBoostLayer(lComp, ls);
    if (!layer) continue;
    try { if (opts.draftLayers && layer.quality !== LayerQuality.DRAFT) ls.quality = layer.quality; } catch (e5) {}
    try { if (opts.bilinear && layer.samplingQuality !== LayerSamplingQuality.BILINEAR) ls.samplingQuality = layer.samplingQuality; } catch (e6) {}
    try { if (opts.disableMotion && layer.motionBlur !== false) ls.motionBlur = layer.motionBlur; } catch (e7) {}
    try { if (opts.disableMotion && layer.frameBlendingType !== FrameBlendingType.NO_FRAME_BLEND) ls.frameBlendingType = layer.frameBlendingType; } catch (e8) {}
  }
};

SORI_TOOLS.syncBoostStateFromComps = function (state, comps, settings) {
  if (!state || !comps) return false;
  if (!state.comps) state.comps = [];
  if (!state.layers) state.layers = [];
  var opts = settings || SORI_TOOLS.boostProfileSettings(state.profile || "strong");
  var changed = false;
  for (var i = 0; i < comps.length; i += 1) {
    var comp = comps[i];
    if (!comp) continue;
    var compState = SORI_TOOLS.findBoostCompStateForComp(state, comp);
    if (!compState) {
      compState = SORI_TOOLS.captureBoostCompState(comp);
      state.comps.push(compState);
      changed = true;
    }
    try { if (opts.disableMotion && comp.motionBlur !== false && compState.motionBlur !== comp.motionBlur) { compState.motionBlur = comp.motionBlur; changed = true; } } catch (e) {}
    try { if (opts.disableMotion && comp.frameBlending !== false && compState.frameBlending !== comp.frameBlending) { compState.frameBlending = comp.frameBlending; changed = true; } } catch (e2) {}
    try {
      var rf = comp.resolutionFactor;
      if ((rf[0] !== opts.resolutionFactor[0] || rf[1] !== opts.resolutionFactor[1]) && (!compState.resolutionFactor || compState.resolutionFactor[0] !== rf[0] || compState.resolutionFactor[1] !== rf[1])) {
        compState.resolutionFactor = rf;
        changed = true;
      }
    } catch (e3) {}
    try { if (comp.draft3d !== (opts.draft3d === true) && compState.draft3d !== comp.draft3d) { compState.draft3d = comp.draft3d; changed = true; } } catch (e4) {}
    try {
      for (var j = 1; j <= comp.numLayers; j += 1) {
        var layer = comp.layer(j);
        var layerState = SORI_TOOLS.findBoostLayerStateForLayer(state, comp, layer);
        if (!layerState) {
          state.layers.push(SORI_TOOLS.captureBoostLayerState(comp, layer));
          changed = true;
          continue;
        }
        try { if (opts.draftLayers && layer.quality !== LayerQuality.DRAFT && layerState.quality !== layer.quality) { layerState.quality = layer.quality; changed = true; } } catch (lq) {}
        try { if (opts.bilinear && layer.samplingQuality !== LayerSamplingQuality.BILINEAR && layerState.samplingQuality !== layer.samplingQuality) { layerState.samplingQuality = layer.samplingQuality; changed = true; } } catch (ls) {}
        try { if (opts.disableMotion && layer.motionBlur !== false && layerState.motionBlur !== layer.motionBlur) { layerState.motionBlur = layer.motionBlur; changed = true; } } catch (lm) {}
        try { if (opts.disableMotion && layer.frameBlendingType !== FrameBlendingType.NO_FRAME_BLEND && layerState.frameBlendingType !== layer.frameBlendingType) { layerState.frameBlendingType = layer.frameBlendingType; changed = true; } } catch (lf) {}
      }
    } catch (elayers) {}
  }
  return changed;
};

SORI_TOOLS.refreshBoostMode = function () {
  var rootComp = SORI_TOOLS.comp();
  if (!rootComp) return SORI_TOOLS.respond(false, "No active composition.");
  var state = SORI_TOOLS.parse(SORI_TOOLS.readBoostRestoreStateText());
  if (!state || state.projectKey !== SORI_TOOLS.projectStateKey()) return SORI_TOOLS.respond(false, "Boost is not active for this project.");
  var comps = SORI_TOOLS.collectBoostComps(rootComp);
  var settings = SORI_TOOLS.boostProfileSettings(state.profile || "strong");
  var undoOpen = false;
  try {
    SORI_TOOLS.updateBoostStateFromCurrent(state, settings);
    SORI_TOOLS.syncBoostStateFromComps(state, comps, settings);
    app.beginUndoGroup("SoriTools Boost Refresh");
    undoOpen = true;
    if (settings.bypassHeavyFx) SORI_TOOLS.captureHeavyFxState(comps, state);
    var result = SORI_TOOLS.applyBoostRules(comps, settings, state);
    result.heavyEffects = state && state.heavyEffects ? state.heavyEffects.length : 0;
    SORI_TOOLS.writeBoostRestoreStateText(SORI_TOOLS.stringify(state));
    return SORI_TOOLS.respond(true, "", result);
  } catch (e) {
    return SORI_TOOLS.respond(false, "Boost refresh failed: " + e.message);
  } finally {
    if (undoOpen) {
      try { app.endUndoGroup(); } catch (eEnd) {}
    }
  }
};

SORI_TOOLS.captureBoostState = function (comps, cacheInfo, heavyEffects, existingState) {
  var currentProjectKey = SORI_TOOLS.projectStateKey();
  var existingMatchesProject = !!(existingState && existingState.projectKey === currentProjectKey && existingState.comps && existingState.comps.length);
  var state = existingMatchesProject ? existingState : { version: 1, projectKey: currentProjectKey, comps: [], layers: [], cacheFolder: cacheInfo.folder, heavyEffects: heavyEffects };
  var compKeys = {};
  var layerKeys = {};
  var addedComps = 0;
  var addedLayers = 0;

  try {
    for (var c = 0; state.comps && c < state.comps.length; c += 1) compKeys[state.comps[c].key] = true;
    for (var l = 0; state.layers && l < state.layers.length; l += 1) layerKeys[state.layers[l].key] = true;
  } catch (emap) {}

  for (var i = 0; i < comps.length; i += 1) {
    var comp = comps[i];
    var compState = SORI_TOOLS.captureBoostCompState(comp);
    if (!compKeys[compState.key]) {
      state.comps.push(compState);
      compKeys[compState.key] = true;
      addedComps += 1;
    }
    try {
      for (var j = 1; j <= comp.numLayers; j += 1) {
        var layerState = SORI_TOOLS.captureBoostLayerState(comp, comp.layer(j));
        if (layerKeys[layerState.key]) continue;
        state.layers.push(layerState);
        layerKeys[layerState.key] = true;
        addedLayers += 1;
      }
    } catch (elayers) {}
  }
  state.cacheFolder = cacheInfo.folder;
  state.heavyEffects = heavyEffects;
  return { state: state, preserved: existingMatchesProject, addedComps: addedComps, addedLayers: addedLayers };
};

SORI_TOOLS.boostProfileSettings = function (profile) {
  var name = String(profile || "strong").toLowerCase();
  if (name === "safe") return { name: "safe", resolutionFactor: [2, 2], draft3d: true, draftLayers: false, bilinear: true, disableMotion: true, selectedWorkArea: false, purge: false, bypassHeavyFx: false };
  if (name === "max") return { name: "max", resolutionFactor: [4, 4], draft3d: true, draftLayers: true, bilinear: true, disableMotion: true, selectedWorkArea: true, purge: true, bypassHeavyFx: true };
  return { name: "strong", resolutionFactor: [4, 4], draft3d: true, draftLayers: true, bilinear: true, disableMotion: true, selectedWorkArea: false, purge: true, bypassHeavyFx: false };
};

SORI_TOOLS.applyBoostWorkAreaFromSelection = function (comp) {
  var layers = SORI_TOOLS.selectedLayers(comp);
  if (!layers || !layers.length) return false;
  var start = null;
  var end = null;
  for (var i = 0; i < layers.length; i += 1) {
    var layerStart = 0;
    var layerEnd = 0;
    try { layerStart = Number(layers[i].inPoint); } catch (e) {}
    try { layerEnd = Number(layers[i].outPoint); } catch (e2) {}
    if (!isFinite(layerStart) || !isFinite(layerEnd)) continue;
    if (start === null || layerStart < start) start = layerStart;
    if (end === null || layerEnd > end) end = layerEnd;
  }
  if (start === null || end === null || end <= start) return false;
  try {
    comp.workAreaStart = Math.max(0, start);
    comp.workAreaDuration = Math.max(comp.frameDuration || 0.001, end - start);
    return true;
  } catch (e3) {}
  return false;
};

SORI_TOOLS.applyBoostMode = function (profile, selectedWorkAreaOverride) {
  var rootComp = SORI_TOOLS.comp();
  if (!rootComp) return SORI_TOOLS.respond(false, "No active composition.");

  var settings = SORI_TOOLS.boostProfileSettings(profile);
  var comps = SORI_TOOLS.collectBoostComps(rootComp);
  var cacheInfo = SORI_TOOLS.enforceBoostCacheLimit();
  var heavyEffects = SORI_TOOLS.detectHeavyBoostEffects(comps);
  var existingState = SORI_TOOLS.parse(SORI_TOOLS.readBoostRestoreStateText());
  if (existingState && existingState.projectKey === SORI_TOOLS.projectStateKey()) SORI_TOOLS.updateBoostStateFromCurrent(existingState, settings);
  var captured = SORI_TOOLS.captureBoostState(comps, cacheInfo, heavyEffects, existingState);
  var state = captured.state;
  var compCount = 0;
  var layerCount = 0;
  var workAreaSet = false;
  var heavyBypassed = 0;
  var undoOpen = false;

  state.profile = settings.name;
  if (settings.bypassHeavyFx) SORI_TOOLS.captureHeavyFxState(comps, state);
  SORI_TOOLS.applyBoostSystemSettings(state, settings);
  if (!SORI_TOOLS.writeBoostRestoreStateText(SORI_TOOLS.stringify(state))) {
    return SORI_TOOLS.respond(false, "Boost could not save restore state. Check extension tmp folder permissions.");
  }

  try {
    app.beginUndoGroup("SoriTools Boost On");
    undoOpen = true;
    if (selectedWorkAreaOverride === true) workAreaSet = SORI_TOOLS.applyBoostWorkAreaFromSelection(rootComp);
    var boostResult = SORI_TOOLS.applyBoostRules(comps, settings, state);
    compCount = boostResult.comps;
    layerCount = boostResult.layers;
    heavyBypassed = boostResult.heavyBypassed;
  } catch (applyError) {
    return SORI_TOOLS.respond(false, "Boost failed while applying preview settings: " + (applyError && applyError.message ? applyError.message : applyError));
  } finally {
    if (undoOpen) {
      try { app.endUndoGroup(); } catch (eEnd) {}
    }
  }

  return SORI_TOOLS.respond(true, captured.preserved ? "Boost refreshed." : "Boost enabled.", { profile: settings.name, comps: compCount, layers: layerCount, heavyEffects: heavyEffects.length, heavyBypassed: heavyBypassed, capturedComps: captured.addedComps, capturedLayers: captured.addedLayers, workAreaSet: workAreaSet, cacheFolder: cacheInfo.folder, cacheBytes: cacheInfo.bytes, cacheRemoved: cacheInfo.removed, memoryPurged: state.memoryPurged === true });
};

SORI_TOOLS.countBoostBypassedEffects = function (state) {
  if (!state || !state.heavyFx) return 0;
  var count = 0;
  try {
    for (var key in state.heavyFx) {
      if (state.heavyFx.hasOwnProperty(key)) count += 1;
    }
  } catch (e) {}
  return count;
};

SORI_TOOLS.hasBoostRestoreState = function () {
  var raw = SORI_TOOLS.readBoostRestoreStateText();
  var state = SORI_TOOLS.parse(raw);
  var active = !!(state && state.projectKey === SORI_TOOLS.projectStateKey() && state.comps && state.comps.length);
  if (raw && state && state.projectKey && state.projectKey !== SORI_TOOLS.projectStateKey()) {
    SORI_TOOLS.writeBoostRestoreStateText("");
    return SORI_TOOLS.respond(true, "", { active: false, stale: true, cleared: true });
  }
  return SORI_TOOLS.respond(true, "", { active: active, stale: false, cleared: false });
};

SORI_TOOLS.boostSignature = function () {
  var rootComp = SORI_TOOLS.comp();
  if (!rootComp) return SORI_TOOLS.respond(true, "", { signature: "" });
  var comps = SORI_TOOLS.collectBoostComps(rootComp);
  var parts = [];
  for (var i = 0; i < comps.length; i += 1) {
    var comp = comps[i];
    var layerCount = 0;
    var effectCount = 0;
    try { layerCount = comp.numLayers || 0; } catch (e) {}
    try {
      for (var j = 1; j <= comp.numLayers; j += 1) {
        var fx = null;
        try { fx = comp.layer(j).property("ADBE Effect Parade"); } catch (efx) {}
        if (fx) effectCount += fx.numProperties || 0;
      }
    } catch (e2) {}
    parts.push(SORI_TOOLS.compStateKey(comp) + ":" + layerCount + ":" + effectCount);
  }
  return SORI_TOOLS.respond(true, "", { signature: parts.join("|") });
};

SORI_TOOLS.boostDiagnostics = function () {
  var rootComp = SORI_TOOLS.comp();
  var raw = SORI_TOOLS.readBoostRestoreStateText();
  var state = SORI_TOOLS.parse(raw);
  var active = !!(state && state.projectKey === SORI_TOOLS.projectStateKey() && state.comps && state.comps.length);
  var comps = rootComp ? SORI_TOOLS.collectBoostComps(rootComp) : [];
  var layers = 0;
  var selectedLayers = 0;
  var heavyEffects = SORI_TOOLS.detectHeavyBoostEffects(comps);
  var heavyBypassed = SORI_TOOLS.countBoostBypassedEffects(state);
  for (var i = 0; i < comps.length; i += 1) {
    try { layers += comps[i].numLayers || 0; } catch (e) {}
  }
  try { selectedLayers = rootComp ? SORI_TOOLS.selectedLayers(rootComp).length : 0; } catch (e2) {}
  var recommendation = "Use Strong for daily work.";
  if (heavyEffects.length > 0) recommendation = "Heavy FX still live; use Max for preview or pre-render heavy precomps.";
  if (!active) recommendation = "Boost is off; click Boost for Strong profile or right-click to pick profile.";
  return SORI_TOOLS.respond(true, "", { active: active, profile: state && state.profile ? state.profile : "", comps: comps.length, layers: layers, heavyEffects: heavyEffects.length, heavyBypassed: heavyBypassed, selectedLayers: selectedLayers, recommendation: recommendation });
};

SORI_TOOLS.boostSelfTest = function () {
  var log = { startedAt: String(new Date()), steps: [] };
  function addStep(name, response) {
    var parsed = SORI_TOOLS.parse(response);
    log.steps.push({ name: name, ok: !!(parsed && parsed.ok), message: parsed && parsed.message ? parsed.message : "", data: parsed && parsed.data ? parsed.data : null });
    return parsed;
  }
  var rootComp = SORI_TOOLS.comp();
  if (!rootComp) {
    log.error = "No active composition.";
    SORI_TOOLS.writeTextFile("boost-self-test.json", SORI_TOOLS.stringify(log));
    return SORI_TOOLS.respond(false, log.error, { file: "tmp/boost-self-test.json" });
  }
  var existingState = SORI_TOOLS.parse(SORI_TOOLS.readBoostRestoreStateText());
  if (existingState && existingState.projectKey === SORI_TOOLS.projectStateKey()) {
    log.error = "Turn Boost off before running self-test.";
    SORI_TOOLS.writeTextFile("boost-self-test.json", SORI_TOOLS.stringify(log));
    return SORI_TOOLS.respond(false, log.error, { file: "tmp/boost-self-test.json" });
  }
  addStep("before", SORI_TOOLS.boostDiagnostics());
  addStep("apply-safe", SORI_TOOLS.applyBoostMode("safe"));
  addStep("refresh-safe", SORI_TOOLS.refreshBoostMode());
  addStep("restore-safe", SORI_TOOLS.restoreBoostMode());
  addStep("after", SORI_TOOLS.boostDiagnostics());
  log.finishedAt = String(new Date());
  SORI_TOOLS.writeTextFile("boost-self-test.json", SORI_TOOLS.stringify(log));
  return SORI_TOOLS.respond(true, "Boost self-test written.", { file: "tmp/boost-self-test.json", steps: log.steps.length });
};

SORI_TOOLS.restoreBoostMode = function () {
  var raw = SORI_TOOLS.readBoostRestoreStateText();
  if (!raw) return SORI_TOOLS.respond(true, "Boost already off.", { comps: 0, layers: 0, missingComps: 0, missingLayers: 0 });
  var state = SORI_TOOLS.parse(raw);
  if (!state || !state.comps) {
    SORI_TOOLS.writeBoostRestoreStateText("");
    return SORI_TOOLS.respond(false, "Boost restore state was invalid and has been reset.");
  }
  if (state.projectKey !== SORI_TOOLS.projectStateKey()) {
    SORI_TOOLS.writeBoostRestoreStateText("");
    return SORI_TOOLS.respond(true, "Old Boost state cleared for this project.", { comps: 0, layers: 0, stale: true });
  }

  var compMap = {};
  var compCount = 0;
  var layerCount = 0;
  var missingComps = 0;
  var missingLayers = 0;
  var heavyRestored = 0;
  var undoOpen = false;

  var rootComp = SORI_TOOLS.comp();
  var settings = SORI_TOOLS.boostProfileSettings(state.profile || "strong");
  if (rootComp) SORI_TOOLS.syncBoostStateFromComps(state, SORI_TOOLS.collectBoostComps(rootComp), settings);
  SORI_TOOLS.updateBoostStateFromCurrent(state, settings);
  SORI_TOOLS.restoreBoostSystemSettings(state);

  try {
    app.beginUndoGroup("SoriTools Boost Off");
    undoOpen = true;
    heavyRestored = SORI_TOOLS.restoreHeavyFxBypass(state);
    for (var i = 0; i < state.comps.length; i += 1) {
      var compState = state.comps[i];
      var comp = SORI_TOOLS.findBoostComp(compState);
      if (!comp) {
        missingComps += 1;
        continue;
      }
      compMap[compState.key] = comp;
      try { if (compState.resolutionFactor !== undefined) comp.resolutionFactor = compState.resolutionFactor; } catch (e) {}
      try { if (compState.draft3d !== undefined) comp.draft3d = compState.draft3d; } catch (e2) {}
      try { if (compState.motionBlur !== undefined) comp.motionBlur = compState.motionBlur; } catch (e3) {}
      try { if (compState.frameBlending !== undefined) comp.frameBlending = compState.frameBlending; } catch (e4) {}
      try { if (compState.workAreaStart !== undefined) comp.workAreaStart = compState.workAreaStart; } catch (e5) {}
      try { if (compState.workAreaDuration !== undefined) comp.workAreaDuration = compState.workAreaDuration; } catch (e6) {}
      compCount += 1;
    }

    for (var j = 0; state.layers && j < state.layers.length; j += 1) {
      var layerState = state.layers[j];
      var layerComp = compMap[layerState.compKey];
      if (!layerComp) {
        missingLayers += 1;
        continue;
      }
      var layer = SORI_TOOLS.findBoostLayer(layerComp, layerState);
      if (!layer) {
        missingLayers += 1;
        continue;
      }
      try { if (layerState.quality !== undefined) layer.quality = layerState.quality; } catch (lq) {}
      try { if (layerState.samplingQuality !== undefined) layer.samplingQuality = layerState.samplingQuality; } catch (ls) {}
      try { if (layerState.motionBlur !== undefined) layer.motionBlur = layerState.motionBlur; } catch (lm) {}
      try { if (layerState.frameBlendingType !== undefined) layer.frameBlendingType = layerState.frameBlendingType; } catch (lf) {}
      layerCount += 1;
    }
  } catch (restoreError) {
    return SORI_TOOLS.respond(false, "Boost restore failed: " + (restoreError && restoreError.message ? restoreError.message : restoreError));
  } finally {
    if (undoOpen) {
      try { app.endUndoGroup(); } catch (eEnd) {}
    }
  }

  SORI_TOOLS.writeDebugFile("boost-restore-diagnostics.json", { restoredAt: String(new Date()), comps: compCount, layers: layerCount, missingComps: missingComps, missingLayers: missingLayers, heavyRestored: heavyRestored, profile: state.profile || "" });
  SORI_TOOLS.writeBoostRestoreStateText("");
  return SORI_TOOLS.respond(true, "Boost restored.", { comps: compCount, layers: layerCount, missingComps: missingComps, missingLayers: missingLayers, heavyRestored: heavyRestored, diagnostics: "tmp/boost-restore-diagnostics.json" });
};

SORI_TOOLS.importPresetFiles = function () {
  var files = File.openDialog("Select preset file (.ffx)", "*.ffx", true);
  if (!files) return SORI_TOOLS.respond(true, "", []);
  if (!(files instanceof Array)) files = [files];

  var presets = [];
  for (var i = 0; i < files.length; i += 1) {
    var file = files[i];
    if (!file || !file.exists) continue;
    presets.push({
      name: decodeURI(file.name.replace(/\.ffx$/i, "")),
      path: file.fsName
    });
  }

  if (!presets.length) return SORI_TOOLS.respond(false, "No preset files selected.");
  return SORI_TOOLS.respond(true, "Imported " + presets.length + " preset" + (presets.length > 1 ? "s" : "") + ".", presets);
};

SORI_TOOLS.exportPresetsTree = function (payload) {
  var data = SORI_TOOLS.parse(payload);
  if (!data || !data.tree || !data.tree.length) {
    return SORI_TOOLS.respond(false, "No presets to export.");
  }

  var folderName = data.folderName || "presets sori";
  var destBase = Folder.selectDialog("Select destination folder to export presets");
  if (!destBase) return SORI_TOOLS.respond(false, "Export cancelled.");

  var rootFolder = new Folder(destBase.fsName + "/" + folderName);
  if (!rootFolder.exists) rootFolder.create();

  var copied = 0;
  var failed = 0;
  var errors = [];

  function exportNode(node, currentDestPath) {
    var safeName = node.name.replace(/[\/\\:\*\?\"<>\|]/g, "_");
    if (node.type === "folder") {
      var subFolder = new Folder(currentDestPath + "/" + safeName);
      if (!subFolder.exists) subFolder.create();
      if (node.children) {
        for (var i = 0; i < node.children.length; i += 1) {
          exportNode(node.children[i], subFolder.fsName);
        }
      }
    } else if (node.type === "preset" && node.path) {
      try {
        var src = new File(node.path);
        if (!src.exists) {
          failed += 1;
          errors.push("Not found: " + node.name);
          return;
        }
        var destPath = currentDestPath + "/" + safeName + ".ffx";
        var dest = new File(destPath);
        if (src.copy(dest)) {
          copied += 1;
        } else {
          failed += 1;
          errors.push("Copy failed: " + node.name);
        }
      } catch (e) {
        failed += 1;
        errors.push(e.message);
      }
    }
  }

  for (var i = 0; i < data.tree.length; i += 1) {
    exportNode(data.tree[i], rootFolder.fsName);
  }

  if (copied === 0) {
    return SORI_TOOLS.respond(false, "No preset files could be exported." + (errors.length ? "\n" + errors[0] : ""));
  }

  var msg = copied + " preset" + (copied > 1 ? "s" : "") + " exported to folder: " + folderName;
  if (failed > 0) msg += " " + failed + " failed.";
  return SORI_TOOLS.respond(true, msg);
};

SORI_TOOLS.getLayerInfo = function () {
  var comp = SORI_TOOLS.comp();
  if (!comp) return SORI_TOOLS.respond(false, "No active composition.");
  var layers = SORI_TOOLS.selectedLayers(comp);
  if (!layers.length) return SORI_TOOLS.respond(false, "No layers selected.");

  var info = [];
  for (var i = 0; i < layers.length; i += 1) {
    var l = layers[i];
    var entry = { name: l.name, index: l.index };
    try { entry.isNull = SORI_TOOLS.isNullLayer(l); } catch (e) {}
    try { entry.isAdjustment = SORI_TOOLS.isAdjustmentLayer(l); } catch (e2) {}
    try { entry.isPrecomp = SORI_TOOLS.isPrecomp(l); } catch (e3) {}
    try { entry.is3D = SORI_TOOLS.is3DLayer(l); } catch (e4) {}
    try { entry.isCamera = SORI_TOOLS.isCameraLayer(l); } catch (e5) {}
    try { entry.isLight = SORI_TOOLS.isLightLayer(l); } catch (e6) {}
    try { entry.isShape = SORI_TOOLS.isShapeLayer(l); } catch (e7) {}
    try { entry.isText = SORI_TOOLS.isTextLayer(l); } catch (e8) {}
    try { entry.isGuide = SORI_TOOLS.isGuideLayer(l); } catch (e9) {}
    try { entry.isLocked = SORI_TOOLS.isLocked(l); } catch (e10) {}
    try { entry.hasTimeRemap = SORI_TOOLS.hasTimeRemap(l); } catch (e11) {}
    try { entry.effectCount = SORI_TOOLS.countEffects(l); } catch (e12) {}
    try { entry.maskCount = SORI_TOOLS.countMasks(l); } catch (e13) {}
    try { entry.hasSeparatedPos = SORI_TOOLS.hasSeparatedPosition(l); } catch (e14) {}
    try { entry.inPoint = l.inPoint; } catch (e15) {}
    try { entry.outPoint = l.outPoint; } catch (e16) {}
    try { entry.startTime = l.startTime; } catch (e17) {}
    try { entry.blendingMode = l.blendingMode; } catch (e18) {}
    info.push(entry);
  }

  return SORI_TOOLS.respond(true, "", info);
};

SORI_TOOLS.getPresetsDir = function () {
  var extPath = SORI_TOOLS.getExtensionRoot();
  if (!extPath) return "";
  var presetsDir = new Folder(extPath + '/presets');
  if (!presetsDir.exists) presetsDir.create();
  return presetsDir.fsName;
};

SORI_TOOLS.importPresetFolder = function () {
  var folder = Folder.selectDialog('Select preset folder');
  if (!folder) return SORI_TOOLS.respond(false, 'Cancelled.');

  var presetsDir = SORI_TOOLS.getPresetsDir();
  if (!presetsDir) return SORI_TOOLS.respond(false, 'Could not resolve presets folder.');
  var folderName = decodeURI(folder.name);

  function scanAndCopy(srcFolder, destRelBase) {
    var items = srcFolder.getFiles();
    var children = [];
    for (var i = 0; i < items.length; i += 1) {
      try {
        if (items[i] instanceof Folder) {
          var subName = decodeURI(items[i].name);
          var subRel = destRelBase + '/' + subName;
          var subChildren = scanAndCopy(items[i], subRel);
          if (subChildren.length > 0) {
            children.push({ type: 'folder', name: subName, children: subChildren });
          }
        } else if (items[i] instanceof File && items[i].name.match(/\.ffx$/i)) {
          var fileName = decodeURI(items[i].name);
          var destRel = destRelBase + '/' + fileName;
          var destFile = new File(presetsDir + '/' + destRel);
          var destParent = destFile.parent;
          if (!destParent.exists) destParent.create();
          if (!items[i].copy(destFile)) continue;
          children.push({
            type: 'preset',
            name: fileName.replace(/\.ffx$/i, ''),
            path: destFile.fsName
          });
        }
      } catch (eScan) {}
    }
    return children;
  }

  var tree = scanAndCopy(folder, folderName);
  if (!tree.length) return SORI_TOOLS.respond(false, 'No .ffx files found in folder.');

  return SORI_TOOLS.respond(true, 'Imported folder: ' + folderName, {
    name: folderName,
    type: 'folder',
    children: tree
  });
};

SORI_TOOLS.importPresetFilesWithCopy = function () {
  var files = File.openDialog('Select preset files (.ffx)', '*.ffx', true);
  if (!files) return SORI_TOOLS.respond(true, '', []);
  if (!(files instanceof Array)) files = [files];

  var presetsDir = SORI_TOOLS.getPresetsDir();
  if (!presetsDir) return SORI_TOOLS.respond(false, 'Could not resolve presets folder.');
  var presets = [];

  for (var i = 0; i < files.length; i += 1) {
    try {
      var file = files[i];
      if (!file || !file.exists) continue;
      var destFile = new File(presetsDir + '/' + file.name);
      var counter = 1;
      while (destFile.exists) {
        var baseName = decodeURI(file.name).replace(/\.ffx$/i, '');
        destFile = new File(presetsDir + '/' + baseName + '_' + counter + '.ffx');
        counter += 1;
      }
      file.copy(destFile);
      presets.push({
        type: 'preset',
        name: decodeURI(file.name).replace(/\.ffx$/i, ''),
        path: destFile.fsName
      });
    } catch (eImport) {}
  }

  if (!presets.length) return SORI_TOOLS.respond(false, 'No preset files selected.');
  return SORI_TOOLS.respond(true, presets.length + ' file(s) imported.', presets);
};

SORI_TOOLS.importDroppedItems = function (payload) {
  var data = SORI_TOOLS.parse(payload);
  if (!data || !data.length) return SORI_TOOLS.respond(false, 'No items provided.');

  var presetsDir = SORI_TOOLS.getPresetsDir();
  if (!presetsDir) return SORI_TOOLS.respond(false, 'Could not resolve presets folder.');
  var imported = [];

  function scanAndCopy(srcFolder, destRelBase) {
    var items = srcFolder.getFiles();
    var children = [];
    for (var i = 0; i < items.length; i += 1) {
      try {
        if (items[i] instanceof Folder) {
          var subName = decodeURI(items[i].name);
          var subRel = destRelBase + '/' + subName;
          var subChildren = scanAndCopy(items[i], subRel);
          if (subChildren.length > 0) {
            children.push({ type: 'folder', name: subName, children: subChildren });
          }
        } else if (items[i] instanceof File && items[i].name.match(/\.ffx$/i)) {
          var fileName = decodeURI(items[i].name);
          var destRel = destRelBase + '/' + fileName;
          var destFile = new File(presetsDir + '/' + destRel);
          var destParent = destFile.parent;
          if (!destParent.exists) destParent.create();
          if (!items[i].copy(destFile)) continue;
          children.push({
            type: 'preset',
            name: fileName.replace(/\.ffx$/i, ''),
            path: destFile.fsName
          });
        }
      } catch (eScan) {}
    }
    return children;
  }

  for (var i = 0; i < data.length; i += 1) {
    try {
      var path = data[i];
      var folder = new Folder(path);
      var file = new File(path);

      if (folder.exists) {
        var folderName = decodeURI(folder.name);
        var folderTree = scanAndCopy(folder, folderName);
        if (folderTree.length > 0) {
          imported.push({
            type: 'folder',
            name: folderName,
            children: folderTree
          });
        }
      } else if (file.exists && file.name.match(/\.ffx$/i)) {
        var destFile = new File(presetsDir + '/' + file.name);
        var counter = 1;
        while (destFile.exists) {
          var baseName = decodeURI(file.name).replace(/\.ffx$/i, '');
          destFile = new File(presetsDir + '/' + baseName + '_' + counter + '.ffx');
          counter += 1;
        }
        file.copy(destFile);
        imported.push({
          type: 'preset',
          name: decodeURI(file.name).replace(/\.ffx$/i, ''),
          path: destFile.fsName
        });
      }
    } catch (eImport) {}
  }

  if (!imported.length) return SORI_TOOLS.respond(false, 'No .ffx files or folders imported.');
  return SORI_TOOLS.respond(true, imported.length + ' item(s) imported.', imported);
};

SORI_TOOLS.collectFfxFiles = function (folder, out) {
  try {
    if (!folder || !folder.exists) return;
    var items = folder.getFiles();
    for (var i = 0; i < items.length; i += 1) {
      if (items[i] instanceof Folder) {
        SORI_TOOLS.collectFfxFiles(items[i], out);
      } else if (items[i] instanceof File && items[i].name.match(/\.ffx$/i)) {
        out.push(items[i]);
      }
    }
  } catch (e) {}
};

SORI_TOOLS.presetScanFolders = function () {
  var folders = [];
  try {
    var presetsDir = SORI_TOOLS.getPresetsDir();
    if (presetsDir) folders.push(new Folder(presetsDir));
  } catch (ePreset) {}
  try {
    var docs = Folder.myDocuments;
    var adobe = new Folder(docs.fsName + '/Adobe');
    if (!adobe.exists) return folders;
    var apps = adobe.getFiles();
    for (var i = 0; i < apps.length; i += 1) {
      if (apps[i] instanceof Folder && decodeURI(apps[i].name).match(/^After Effects/i)) {
        var userPresets = new Folder(apps[i].fsName + '/User Presets');
        if (userPresets.exists) folders.push(userPresets);
      }
    }
  } catch (e) {}
  return folders;
};

SORI_TOOLS.ffxPathMap = function () {
  var map = {};
  var folders = SORI_TOOLS.presetScanFolders();
  for (var i = 0; i < folders.length; i += 1) {
    var files = [];
    SORI_TOOLS.collectFfxFiles(folders[i], files);
    for (var f = 0; f < files.length; f += 1) {
      try { map[files[f].fsName] = true; } catch (ePath) {}
    }
  }
  return map;
};

SORI_TOOLS.latestNewUserPreset = function (beforeMap, startedAt) {
  var newest = null;
  var newestTime = 0;
  var folders = SORI_TOOLS.presetScanFolders();
  for (var i = 0; i < folders.length; i += 1) {
    var files = [];
    SORI_TOOLS.collectFfxFiles(folders[i], files);
    for (var f = 0; f < files.length; f += 1) {
      try {
        var path = files[f].fsName;
        var modified = files[f].modified ? files[f].modified.getTime() : 0;
        if (beforeMap && beforeMap[path] && modified < startedAt) continue;
        if (modified >= newestTime) {
          newest = files[f];
          newestTime = modified;
        }
      } catch (eFile) {}
    }
  }
  return newest;
};

SORI_TOOLS.copyPresetToLibrary = function (file) {
  var presetsDir = SORI_TOOLS.getPresetsDir();
  if (!presetsDir) return null;
  var destFile = new File(presetsDir + '/' + file.name);
  var counter = 1;
  while (destFile.exists) {
    var baseName = decodeURI(file.name).replace(/\.ffx$/i, '');
    destFile = new File(presetsDir + '/' + baseName + '_' + counter + '.ffx');
    counter += 1;
  }
  if (!file.copy(destFile)) return null;
  return {
    type: 'preset',
    name: decodeURI(destFile.name).replace(/\.ffx$/i, ''),
    path: destFile.fsName
  };
};

SORI_TOOLS.propertyHasKeysOrExpression = function (prop) {
  try { if (prop.propertyType === PropertyType.PROPERTY && Number(prop.numKeys) > 0) return true; } catch (e) {}
  try { if (prop.canSetExpression && prop.expressionEnabled && prop.expression) return true; } catch (e2) {}
  return false;
};

SORI_TOOLS.selectUsefulPresetProperties = function (layers) {
  var selected = 0;
  function walk(group, inEffects) {
    var count = 0;
    try { count = group.numProperties || 0; } catch (eCount) { return; }
    for (var i = 1; i <= count; i += 1) {
      var prop = null;
      try { prop = group.property(i); } catch (eProp) {}
      if (!prop) continue;
      var matchName = '';
      try { matchName = prop.matchName || ''; } catch (eMatch) {}
      var nextInEffects = inEffects || matchName === 'ADBE Effect Parade';
      if (nextInEffects && prop.propertyType === PropertyType.INDEXED_GROUP && matchName !== 'ADBE Effect Parade') {
        try { prop.selected = true; selected += 1; } catch (eSelFx) {}
      }
      if (SORI_TOOLS.propertyHasKeysOrExpression(prop)) {
        try { prop.selected = true; selected += 1; } catch (eSel) {}
      }
      try {
        if (prop.propertyType !== PropertyType.PROPERTY) walk(prop, nextInEffects);
      } catch (eWalk) {}
    }
  }
  for (var l = 0; l < layers.length; l += 1) walk(layers[l], false);
  return selected;
};

SORI_TOOLS.saveSelectedAnimationPresetWithImport = function (autoSelect) {
  var comp = SORI_TOOLS.comp();
  if (!comp) return SORI_TOOLS.respond(false, 'No active composition.');
  var layers = SORI_TOOLS.selectedLayers(comp);
  if (!layers.length) return SORI_TOOLS.respond(false, 'Select layer/property/keyframe/effect first.');
  if (autoSelect === true) SORI_TOOLS.selectUsefulPresetProperties(layers);

  var beforeMap = SORI_TOOLS.ffxPathMap();
  var startedAt = (new Date()).getTime() - 2000;
  var commandId = 0;
  try { commandId = app.findMenuCommandId('Save Animation Preset...'); } catch (e) {}
  if (!commandId) {
    try { commandId = app.findMenuCommandId('Save Animation Preset…'); } catch (e2) {}
  }
  if (!commandId) return SORI_TOOLS.respond(false, 'Save Animation Preset command not found.');

  try {
    app.executeCommand(commandId);
  } catch (eExec) {
    return SORI_TOOLS.respond(false, 'Save Animation Preset failed: ' + eExec.message);
  }

  var latest = SORI_TOOLS.latestNewUserPreset(beforeMap, startedAt);
  if (!latest || !latest.exists) return SORI_TOOLS.respond(true, 'Preset saved. Use + > Import File(s) if it did not auto-import.', []);

  var node = SORI_TOOLS.copyPresetToLibrary(latest);
  if (!node) return SORI_TOOLS.respond(false, 'Preset saved, but could not copy into Sori Tools library.');
  return SORI_TOOLS.respond(true, 'Saved and imported: ' + node.name, [node]);
};

SORI_TOOLS.safePresetName = function (name) {
  return String(name || 'Preset').replace(/[\/\\:\*\?\"<>\|]/g, '_').replace(/\.ffx$/i, '') || 'Preset';
};

SORI_TOOLS.renamePresetFile = function (payload) {
  try {
    var data = SORI_TOOLS.parse(payload);
    if (!data || !data.path || !data.name) return SORI_TOOLS.respond(false, 'Invalid preset rename.');
    var file = new File(data.path);
    if (!file.exists) return SORI_TOOLS.respond(false, 'Preset file not found.');
    var baseName = SORI_TOOLS.safePresetName(data.name);
    var dest = new File(file.parent.fsName + '/' + baseName + '.ffx');
    var counter = 1;
    while (dest.exists && dest.fsName !== file.fsName) {
      dest = new File(file.parent.fsName + '/' + baseName + '_' + counter + '.ffx');
      counter += 1;
    }
    if (dest.fsName === file.fsName) return SORI_TOOLS.respond(true, 'Renamed.', { path: file.fsName });
    if (!file.rename(dest.name)) return SORI_TOOLS.respond(false, 'Could not rename preset file.');
    return SORI_TOOLS.respond(true, 'Renamed.', { path: dest.fsName });
  } catch (eRename) {
    return SORI_TOOLS.respond(false, 'Could not rename preset file: ' + eRename.message);
  }
};

SORI_TOOLS.revealPresetFile = function (payload) {
  try {
    var path = SORI_TOOLS.parse(payload);
    if (typeof path !== 'string') path = String(payload || '');
    var file = new File(path);
    if (!file.exists) return SORI_TOOLS.respond(false, 'Preset file not found.');
    file.parent.execute();
    return SORI_TOOLS.respond(true, 'Opened preset folder.');
  } catch (eReveal) {
    return SORI_TOOLS.respond(false, 'Could not reveal preset file: ' + eReveal.message);
  }
};

SORI_TOOLS.deleteEmptyPresetParents = function (folder) {
  try {
    var root = SORI_TOOLS.getPresetsDir();
    if (!root || !folder) return;
    var rootFolder = new Folder(root);
    while (folder && folder.exists && folder.fsName !== rootFolder.fsName) {
      var items = folder.getFiles();
      if (items && items.length) return;
      var parent = folder.parent;
      if (!folder.remove()) return;
      folder = parent;
    }
  } catch (e) {}
};

SORI_TOOLS.deletePresetFile = function (payload) {
  try {
    var path = SORI_TOOLS.parse(payload);
    if (typeof path !== 'string') path = String(payload || '');
    if (typeof path === 'string') {
      var file = new File(path);
      var parent = file.parent;
      if (!file.exists) {
        SORI_TOOLS.deleteEmptyPresetParents(parent);
        return SORI_TOOLS.respond(true, 'Deleted.');
      }
      if (!file.remove()) return SORI_TOOLS.respond(false, 'Could not delete preset file:\n' + decodeURI(file.name));
      SORI_TOOLS.deleteEmptyPresetParents(parent);
    }
  } catch (eDel) {
    return SORI_TOOLS.respond(false, 'Could not delete preset file: ' + eDel.message);
  }
  return SORI_TOOLS.respond(true, 'Deleted.');
};

SORI_TOOLS.getAepLibraryDir = function () {
  var extPath = SORI_TOOLS.getExtensionRoot();
  if (!extPath) return '';
  var dir = new Folder(extPath + '/aep-library');
  if (!dir.exists) dir.create();
  return dir.fsName;
};

SORI_TOOLS.exportAepLibraryItem = function (payload) {
  var data = SORI_TOOLS.parse(payload);
  if (!data || !data.path) return SORI_TOOLS.respond(false, 'Invalid export request.');

  var src = new File(data.path);
  if (!src.exists) return SORI_TOOLS.respond(false, 'AEP file not found.');

  var destBase = Folder.selectDialog('Select destination folder for AEP export');
  if (!destBase) return SORI_TOOLS.respond(false, 'Export cancelled.');

  var safeName = decodeURI(data.name || src.name).replace(/[\\\/:\*\?\"<>\|]/g, '_');
  var dest = new File(destBase.fsName + '/' + safeName + '.aep');
  if (dest.exists) dest.remove();
  if (!src.copy(dest)) return SORI_TOOLS.respond(false, 'Could not export AEP file.');

  return SORI_TOOLS.respond(true, 'Exported: ' + safeName);
};

SORI_TOOLS.copyFileRobust = function (sourceFile, destFile) {
  try {
    if (!sourceFile || !sourceFile.exists || !destFile) return false;
    try { if (sourceFile.fsName === destFile.fsName) return true; } catch (esame) {}
    try { if (sourceFile.copy(destFile)) return true; } catch (ecopy) {}
    try { if (sourceFile.copy(destFile.fsName)) return true; } catch (ecopy2) {}
    try {
      if ($.os && $.os.toLowerCase().indexOf("windows") >= 0 && typeof system !== "undefined" && system.callSystem) {
        var command = 'cmd.exe /c copy /Y "' + sourceFile.fsName + '" "' + destFile.fsName + '"';
        system.callSystem(command);
        if (destFile.exists) return true;
      }
    } catch (ecmd) {}
  } catch (e) {}
  return false;
};

SORI_TOOLS.importAepFile = function () {
  var file = File.openDialog('Select AEP file', '*.aep;*.aepx');
  if (!file) return SORI_TOOLS.respond(false, 'Cancelled.');
  if (!file.exists) return SORI_TOOLS.respond(false, 'File not found.');

  var libDir = SORI_TOOLS.getAepLibraryDir();
  if (!libDir) return SORI_TOOLS.respond(false, 'Could not resolve AEP library folder.');

  var safeName = decodeURI(file.name).replace(/[\\\/:\*\?\"<>\|]/g, '_');
  var destFolder = new Folder(libDir + '/' + safeName.replace(/\.aepx?$/i, ''));
  if (!destFolder.exists && !destFolder.create()) return SORI_TOOLS.respond(false, 'Could not create AEP library folder:\n' + destFolder.fsName);

  var destFile = new File(destFolder.fsName + '/' + safeName);
  var alreadyExists = destFile.exists === true;
  if (!alreadyExists) {
    if (!SORI_TOOLS.copyFileRobust(file, destFile)) return SORI_TOOLS.respond(false, 'Could not copy AEP to library.\nFrom: ' + file.fsName + '\nTo: ' + destFile.fsName);
  }

  var collected = SORI_TOOLS.collectAepFootage(file, destFolder);

  return SORI_TOOLS.respond(true, (alreadyExists ? 'Already in library: ' : 'Imported: ') + safeName + (collected > 0 ? ' Footage collected.' : ''), {
    type: 'aep',
    name: safeName.replace(/\.aepx?$/i, ''),
    path: destFile.fsName,
    folder: destFolder.fsName
  });
};

SORI_TOOLS.collectAepFootage = function (aepFile, destFolder) {
  var collected = 0;
  var importedFolder = null;
  var undoOpen = false;
  try {
    var footageFolder = new Folder(destFolder.fsName + '/footage');
    if (!footageFolder.exists && !footageFolder.create()) return 0;

    function clearFolder(folder) {
      try {
        var items = folder.getFiles();
        for (var i = 0; i < items.length; i += 1) {
          if (items[i] instanceof Folder) {
            clearFolder(items[i]);
            try { items[i].remove(); } catch (eFolderRemove) {}
          } else {
            try { items[i].remove(); } catch (eFileRemove) {}
          }
        }
      } catch (eClear) {}
    }

    clearFolder(footageFolder);

    var io = new ImportOptions(aepFile);
    if (io.canImportAs(ImportAsType.PROJECT)) io.importAs = ImportAsType.PROJECT;
    app.beginUndoGroup('SoriTools Collect AEP Footage');
    undoOpen = true;
    importedFolder = app.project.importFile(io);
    if (!importedFolder) return 0;

    var copied = {};

    function folderForPath(parts) {
      var folder = footageFolder;
      for (var i = 0; i < parts.length; i += 1) {
        var name = SORI_TOOLS.cleanName(parts[i]);
        if (!name) continue;
        folder = new Folder(folder.fsName + '/' + name);
        if (!folder.exists) folder.create();
      }
      return folder;
    }

    function copyFootageFile(file, parts) {
      try {
        if (!file || !file.exists) return;
        if (file.fsName === aepFile.fsName) return;
        var key = String(file.fsName).toLowerCase();
        if (copied[key]) return;
        copied[key] = true;
        var targetFolder = folderForPath(parts);
        var destFile = new File(targetFolder.fsName + '/' + file.name);
        var counter = 1;
        while (destFile.exists) {
          var base = decodeURI(file.name).replace(/\.[^\.]+$/, '');
          var ext = decodeURI(file.name).match(/\.[^\.]+$/);
          ext = ext ? ext[0] : '';
          destFile = new File(targetFolder.fsName + '/' + base + '_' + counter + ext);
          counter += 1;
        }
        if (SORI_TOOLS.copyFileRobust(file, destFile)) collected += 1;
      } catch (eCopy) {}
    }

    function scanProjectItem(item, parts) {
      try {
        if (item instanceof FolderItem) {
          var nextParts = parts.slice(0);
          if (item !== importedFolder) nextParts.push(item.name);
          for (var i = 1; i <= item.numItems; i += 1) scanProjectItem(item.item(i), nextParts);
          return;
        }
        if (item instanceof FootageItem) {
          try {
            if (item.mainSource && item.mainSource.file) copyFootageFile(item.mainSource.file, parts);
          } catch (eSource) {}
        }
      } catch (eScan) {}
    }

    scanProjectItem(importedFolder, []);
  } catch (e) {
  } finally {
    try { if (importedFolder) importedFolder.remove(); } catch (eRemove) {}
    if (undoOpen) { try { app.endUndoGroup(); } catch (eEnd) {} }
  }
  return collected;
};

SORI_TOOLS.importDroppedAepItems = function (payload) {
  var data = SORI_TOOLS.parse(payload);
  if (!data || !data.length) return SORI_TOOLS.respond(false, 'No items provided.');

  var libDir = SORI_TOOLS.getAepLibraryDir();
  if (!libDir) return SORI_TOOLS.respond(false, 'Could not resolve AEP library folder.');
  var imported = [];

  for (var i = 0; i < data.length; i += 1) {
    try {
      var path = data[i];
      var file = new File(path);
      if (!file.exists || !file.name.match(/\.aepx?$/i)) continue;

      var safeName = decodeURI(file.name).replace(/[\\\/:\*\?\"<>\|]/g, '_');
      var destFolder = new Folder(libDir + '/' + safeName.replace(/\.aepx?$/i, ''));
      if (!destFolder.exists && !destFolder.create()) continue;

      var destFile = new File(destFolder.fsName + '/' + safeName);
      if (!destFile.exists) {
        if (!SORI_TOOLS.copyFileRobust(file, destFile)) continue;
        SORI_TOOLS.collectAepFootage(file, destFolder);
      }

      imported.push({
        type: 'aep',
        name: safeName.replace(/\.aepx?$/i, ''),
        path: destFile.fsName,
        folder: destFolder.fsName
      });
    } catch (eImport) {}
  }

  if (!imported.length) return SORI_TOOLS.respond(false, 'No .aep files imported.');
  return SORI_TOOLS.respond(true, imported.length + ' AEP(s) imported.', imported);
};

SORI_TOOLS.listAepComps = function (payload) {
  var aepPath = typeof payload === 'string' ? payload : SORI_TOOLS.parse(payload);
  if (typeof aepPath !== 'string') aepPath = aepPath && aepPath.path ? aepPath.path : String(payload || '');

  var file = new File(aepPath);
  if (!file.exists) return SORI_TOOLS.respond(false, 'AEP file not found.');

  var comps = [];
  var compItems = [];
  var importedFolder = null;
  var undoOpen = false;

  try {
    app.beginUndoGroup('SoriTools Read AEP Comps');
    undoOpen = true;
    var io = new ImportOptions(file);
    if (io.canImportAs(ImportAsType.PROJECT)) {
      io.importAs = ImportAsType.PROJECT;
    }

    importedFolder = app.project.importFile(io);

    function scanImportedItem(item) {
      try {
        if (item instanceof CompItem) {
          comps.push({
            name: item.name,
            index: item.index,
            width: item.width,
            height: item.height,
            duration: item.duration,
            frameRate: item.frameRate,
            numLayers: item.numLayers,
            main: true
          });
          compItems.push({ item: item, name: item.name });
          return;
        }
        if (item && item instanceof FolderItem) {
          for (var k = 1; k <= item.numItems; k += 1) {
            try { scanImportedItem(item.item(k)); } catch (eWalk) {}
          }
        }
      } catch (eScan) {}
    }

    if (importedFolder) scanImportedItem(importedFolder);
    var referenced = {};
    for (var r = 0; r < compItems.length; r += 1) {
      try {
        var compItem = compItems[r].item;
        for (var layerIndex = 1; layerIndex <= compItem.numLayers; layerIndex += 1) {
          var layer = compItem.layer(layerIndex);
          try {
            if (layer && layer.source && layer.source instanceof CompItem) referenced[String(layer.source.name)] = true;
          } catch (eLayerSource) {}
        }
      } catch (eRef) {}
    }
    for (var m = 0; m < comps.length; m += 1) comps[m].main = referenced[String(comps[m].name)] !== true;
  } catch (e2) {
    try { if (importedFolder) importedFolder.remove(); } catch (eRemoveFail) {}
    if (undoOpen) { try { app.endUndoGroup(); } catch (eEndFail) {} }
    return SORI_TOOLS.respond(false, 'Could not read AEP: ' + e2.message);
  }

  try { if (importedFolder) importedFolder.remove(); } catch (eRemove) {}
  if (undoOpen) { try { app.endUndoGroup(); } catch (eEnd) {} }

  if (!comps.length) return SORI_TOOLS.respond(false, 'No compositions found in AEP.');
  return SORI_TOOLS.respond(true, comps.length + ' comp(s) found.', comps);
};

SORI_TOOLS.importAepProject = function (payload) {
  var data = SORI_TOOLS.parse(payload);
  var path = data && data.path ? data.path : String(payload || '');
  var file = new File(path);
  if (!file.exists) return SORI_TOOLS.respond(false, 'AEP file not found.');
  app.beginUndoGroup('SoriTools Import AEP');
  try {
    var io = new ImportOptions(file);
    if (io.canImportAs(ImportAsType.PROJECT)) io.importAs = ImportAsType.PROJECT;
    var importedFolder = app.project.importFile(io);
    if (!importedFolder) {
      app.endUndoGroup();
      return SORI_TOOLS.respond(false, 'Could not import AEP project.');
    }
  } catch (e) {
    try { app.endUndoGroup(); } catch (eEndFail) {}
    return SORI_TOOLS.respond(false, 'AEP import failed: ' + e.message);
  }
  app.endUndoGroup();
  return SORI_TOOLS.respond(true, 'AEP imported.');
};

SORI_TOOLS.importAepComps = function (payload) {
  var data = SORI_TOOLS.parse(payload);
  if (!data || !data.path || !data.compNames || !data.compNames.length) {
    return SORI_TOOLS.respond(false, 'Invalid import request.');
  }

  var file = new File(data.path);
  if (!file.exists) return SORI_TOOLS.respond(false, 'AEP file not found.');

  app.beginUndoGroup('SoriTools Import AEP Comps');

  var imported = 0;
  var errors = [];
  var pruned = false;
  var risky = false;
  var kept = 0;
  var removed = 0;

  try {
    var io = new ImportOptions(file);
    if (io.canImportAs(ImportAsType.PROJECT)) {
      io.importAs = ImportAsType.PROJECT;
    }

    var importedFolder = app.project.importFile(io);
    if (!importedFolder) {
      throw new Error('Could not import AEP project.');
    }
    var nameSet = {};
    for (var n = 0; n < data.compNames.length; n += 1) {
      nameSet[data.compNames[n]] = true;
    }

    function findImportedComps(item, list) {
      try {
        if (item instanceof CompItem && nameSet[item.name]) {
          list.push(item);
          imported += 1;
          return;
        }
        if (item && item instanceof FolderItem) {
          for (var c = 1; c <= item.numItems; c += 1) {
            try { findImportedComps(item.item(c), list); } catch (eCollect) {}
          }
        }
      } catch (ePush) {}
    }

    var keepItems = [];
    findImportedComps(importedFolder, keepItems);

    function hasItem(list, item) {
      for (var h = 0; h < list.length; h += 1) {
        if (list[h] === item) return true;
      }
      return false;
    }

    function addKeep(item) {
      if (!item) return;
      if (!hasItem(keepItems, item)) keepItems.push(item);
      try {
        var parent = item.parentFolder;
        while (parent && parent !== importedFolder) {
          if (!hasItem(keepItems, parent)) keepItems.push(parent);
          parent = parent.parentFolder;
        }
      } catch (eParentKeep) {}
    }

    function expressionRiskInProp(prop) {
      try {
        if (!prop) return false;
        if (prop.propertyType === PropertyType.PROPERTY) {
          var expr = "";
          try { expr = String(prop.expression || ""); } catch (eExpr) {}
          if (expr && (expr.indexOf("comp(") >= 0 || expr.indexOf("essentialProperty") >= 0 || expr.indexOf("footage(") >= 0)) return true;
          return false;
        }
        if (prop.numProperties) {
          for (var ep = 1; ep <= prop.numProperties; ep += 1) {
            if (expressionRiskInProp(prop.property(ep))) return true;
          }
        }
      } catch (ePropRisk) {}
      return false;
    }

    var traceVisited = [];

    function traceCompDependencies(comp) {
      if (hasItem(traceVisited, comp)) return;
      traceVisited.push(comp);
      addKeep(comp);
      try {
        if (expressionRiskInProp(comp)) risky = true;
      } catch (eCompRisk) {}
      try {
        for (var li = 1; li <= comp.numLayers; li += 1) {
          var layer = comp.layer(li);
          try { if (expressionRiskInProp(layer)) risky = true; } catch (eLayerRisk) {}
          try {
            if (layer && layer.source) {
              addKeep(layer.source);
              if (layer.source instanceof CompItem) traceCompDependencies(layer.source);
            }
          } catch (eSource) {}
        }
      } catch (eTrace) {}
    }

    for (var ki = 0; ki < keepItems.length; ki += 1) {
      if (keepItems[ki] instanceof CompItem) traceCompDependencies(keepItems[ki]);
    }

    function collectImportedItems(item, out) {
      try {
        if (!item) return;
        out.push(item);
        if (item instanceof FolderItem) {
          for (var ii = 1; ii <= item.numItems; ii += 1) collectImportedItems(item.item(ii), out);
        }
      } catch (eCollectAll) {}
    }

    if (!risky && keepItems.length) {
      var allItems = [];
      collectImportedItems(importedFolder, allItems);
      for (var ri = allItems.length - 1; ri >= 0; ri -= 1) {
        var removeItem = allItems[ri];
        if (removeItem === importedFolder || hasItem(keepItems, removeItem)) continue;
        try { removeItem.remove(); removed += 1; } catch (eRemoveItem) {}
      }
      kept = keepItems.length;
      pruned = true;
    }

  } catch (e) {
    errors.push(e.message);
  }

  app.endUndoGroup();

  if (imported === 0) {
    return SORI_TOOLS.respond(false, 'No comps imported.' + (errors.length ? '\n' + errors[0] : ''));
  }
  return SORI_TOOLS.respond(true, 'Imported ' + imported + ' comp(s).' + (pruned ? ' Unused items pruned.' : (risky ? ' Risky expressions found; full import kept.' : '')), { imported: imported, pruned: pruned, risky: risky, kept: kept, removed: removed });
};

SORI_TOOLS.renameAepLibraryItem = function (payload) {
  try {
    var data = SORI_TOOLS.parse(payload);
    var folderPath = data && data.folder ? data.folder : '';
    var nextName = data && data.name ? String(data.name) : '';
    if (!folderPath || !nextName) return SORI_TOOLS.respond(false, 'Invalid rename request.');

    var folder = new Folder(folderPath);
    if (!folder.exists) return SORI_TOOLS.respond(false, 'Folder not found.');

    var parent = folder.parent;
    var safeName = SORI_TOOLS.cleanName(nextName).replace(/\.aepx?$/i, '');
    var destFolder = new Folder(parent.fsName + '/' + safeName);
    var suffix = 2;
    while (destFolder.exists && destFolder.fsName !== folder.fsName) {
      destFolder = new Folder(parent.fsName + '/' + safeName + '_' + suffix);
      suffix += 1;
    }

    if (destFolder.fsName === folder.fsName) {
      return SORI_TOOLS.respond(true, 'Renamed.', { name: safeName, folder: folder.fsName, path: folder.fsName + '/' + folder.name });
    }

    if (!folder.rename(destFolder.name)) return SORI_TOOLS.respond(false, 'Could not rename library folder.');

    var aepName = '';
    try {
      var files = destFolder.getFiles('*.aep*');
      if (files && files.length) aepName = files[0].name;
    } catch (eFind) {}

    return SORI_TOOLS.respond(true, 'Renamed.', { name: safeName, folder: destFolder.fsName, path: aepName ? destFolder.fsName + '/' + aepName : destFolder.fsName });
  } catch (eRename) {
    return SORI_TOOLS.respond(false, 'Rename failed: ' + eRename.message);
  }
};

SORI_TOOLS.deleteAepLibraryItem = function (payload) {
  try {
    var data = SORI_TOOLS.parse(payload);
    var folderPath = data && data.folder ? data.folder : '';
    if (!folderPath) return SORI_TOOLS.respond(false, 'No folder path.');

    var folder = new Folder(folderPath);
    if (!folder.exists) return SORI_TOOLS.respond(true, 'Already deleted.');

    function removeRecursive(f) {
      var items = f.getFiles();
      for (var i = 0; i < items.length; i += 1) {
        if (items[i] instanceof Folder) removeRecursive(items[i]);
        else { try { items[i].remove(); } catch (e) {} }
      }
      try { f.remove(); } catch (e2) {}
    }

    removeRecursive(folder);
    return SORI_TOOLS.respond(true, 'Deleted.');
  } catch (e) {
    return SORI_TOOLS.respond(false, 'Delete failed: ' + e.message);
  }
};

SORI_TOOLS.recollectAepFootage = function (payload) {
  var data = SORI_TOOLS.parse(payload);
  if (!data || !data.path || !data.folder) return SORI_TOOLS.respond(false, 'Invalid recollect request.');
  var file = new File(data.path);
  if (!file.exists) return SORI_TOOLS.respond(false, 'AEP file not found.');
  var folder = new Folder(data.folder);
  if (!folder.exists) return SORI_TOOLS.respond(false, 'Library folder not found.');

  var collected = SORI_TOOLS.collectAepFootage(file, folder);
  return SORI_TOOLS.respond(true, 'Re-collected ' + collected + ' file(s).', { collected: collected });
};

SORI_TOOLS.revealAepFolder = function (payload) {
  try {
    var data = SORI_TOOLS.parse(payload);
    var folderPath = data && data.folder ? data.folder : '';
    if (!folderPath) return SORI_TOOLS.respond(false, 'No folder path.');
    var folder = new Folder(folderPath);
    if (!folder.exists) return SORI_TOOLS.respond(false, 'Folder not found.');
    folder.execute();
    return SORI_TOOLS.respond(true, 'Opened folder.');
  } catch (e) {
    return SORI_TOOLS.respond(false, 'Could not open folder: ' + e.message);
  }
};

SORI_TOOLS.topazProjectName = function () {
  try {
    if (app.project && app.project.file) return SORI_TOOLS.safeFileStem(app.project.file.displayName || app.project.file.name || 'Untitled_Project');
  } catch (e) {}
  return 'Untitled_Project';
};

SORI_TOOLS.topazRootFolder = function () {
  var base = null;
  try {
    if (app.project && app.project.file && app.project.file.parent) base = app.project.file.parent;
  } catch (e) {}
  if (!base) base = SORI_TOOLS.tmpFolder();
  if (!base) return null;
  var root = new Folder(base.fsName + '/_SoriTools_Topaz/' + SORI_TOOLS.topazProjectName());
  if (!root.exists) root.create();
  return root;
};

SORI_TOOLS.ensureFolder = function (path) {
  var folder = new Folder(path);
  if (!folder.exists) folder.create();
  return folder;
};

SORI_TOOLS.topazFolders = function () {
  var root = SORI_TOOLS.topazRootFolder();
  if (!root) return null;
  var inFolder = SORI_TOOLS.ensureFolder(root.fsName + '/IN');
  var outFolder = SORI_TOOLS.ensureFolder(root.fsName + '/OUT');
  var metaFolder = SORI_TOOLS.ensureFolder(root.fsName + '/META');
  return { root: root, input: inFolder, output: outFolder, meta: metaFolder, metaFile: new File(metaFolder.fsName + '/topaz-flow-meta.json') };
};

SORI_TOOLS.topazLayerKey = function (layer) {
  try { if (layer.id !== undefined && layer.id !== null) return 'layer-id:' + String(layer.id); } catch (e) {}
  try { return 'layer-index:' + String(layer.index) + ':' + String(layer.name || ''); } catch (e2) {}
  return '';
};

SORI_TOOLS.findLayerByTopazMeta = function (comp, data) {
  if (!comp || !data) return null;
  try {
    for (var i = 1; i <= comp.numLayers; i += 1) {
      var layer = comp.layer(i);
      if (data.layerId !== null && data.layerId !== undefined) {
        try { if (layer.id === data.layerId) return layer; } catch (eId) {}
      }
      if (data.layerKey && SORI_TOOLS.topazLayerKey(layer) === data.layerKey) return layer;
    }
  } catch (e) {}
  try {
    if (data.layerIndex && comp.layer(data.layerIndex)) return comp.layer(data.layerIndex);
  } catch (e2) {}
  return null;
};

SORI_TOOLS.topazRenderTemplate = function (module) {
  var names = ['Lossless', 'AVI DV NTSC 48kHz', 'High Quality'];
  for (var i = 0; i < names.length; i += 1) {
    try { module.applyTemplate(names[i]); return; } catch (e) {}
  }
};

SORI_TOOLS.renderTopazSelected = function () {
  var comp = SORI_TOOLS.comp();
  if (!comp) return SORI_TOOLS.respond(false, 'Open a comp first.');
  var layers = SORI_TOOLS.selectedLayers(comp);
  if (!layers.length) return SORI_TOOLS.respond(false, 'Select trimmed footage layers first.');
  var folders = SORI_TOOLS.topazFolders();
  if (!folders) return SORI_TOOLS.respond(false, 'Could not create Topaz folders.');

  var jobs = [];
  var tempComps = [];
  var undoOpen = false;
  app.beginUndoGroup('SoriTools Topaz Flow Export');
  undoOpen = true;
  try {
    for (var i = 0; i < layers.length; i += 1) {
      var layer = layers[i];
      var duration = Math.max(1 / comp.frameRate, Number(layer.outPoint) - Number(layer.inPoint));
      var stem = 'topaz_' + ('000' + (i + 1)).slice(-3) + '_' + SORI_TOOLS.safeFileStem(layer.name || 'clip');
      var file = SORI_TOOLS.ensureUniqueFile(folders.input, stem, '.avi');
      var renderComp = comp.duplicate();
      renderComp.name = SORI_TOOLS.uniqueProjectItemName(stem + '_render');
      renderComp.workAreaStart = Number(layer.inPoint);
      renderComp.workAreaDuration = duration;
      for (var li = 1; li <= renderComp.numLayers; li += 1) {
        try { renderComp.layer(li).enabled = (li === layer.index); } catch (eLayer) {}
      }
      var rq = app.project.renderQueue.items.add(renderComp);
      rq.timeSpanStart = Number(layer.inPoint);
      rq.timeSpanDuration = duration;
      var om = rq.outputModule(1);
      SORI_TOOLS.topazRenderTemplate(om);
      om.file = file;
      jobs.push({
        stem: stem,
        inputPath: file.fsName,
        outputFolder: folders.output.fsName,
        compName: comp.name,
        compId: (function () { try { return comp.id; } catch (eId) {} return null; })(),
        layerId: (function () { try { return layer.id; } catch (eLayerId) {} return null; })(),
        layerIndex: layer.index,
        layerKey: SORI_TOOLS.topazLayerKey(layer),
        layerName: String(layer.name || ''),
        inPoint: Number(layer.inPoint),
        outPoint: Number(layer.outPoint),
        startTime: Number(layer.startTime),
        stretch: Number(layer.stretch),
        compWidth: Number(comp.width),
        compHeight: Number(comp.height),
        frameRate: Number(comp.frameRate)
      });
      tempComps.push(renderComp);
    }
    folders.metaFile.encoding = 'UTF-8';
    folders.metaFile.open('w');
    folders.metaFile.write(SORI_TOOLS.stringify({ project: SORI_TOOLS.topazProjectName(), root: folders.root.fsName, input: folders.input.fsName, output: folders.output.fsName, jobs: jobs }));
    folders.metaFile.close();
    app.endUndoGroup();
    undoOpen = false;
    app.project.renderQueue.render();
    for (var r = 0; r < tempComps.length; r += 1) {
      try { tempComps[r].remove(); } catch (eRemove) {}
    }
  } catch (e) {
    try { folders.metaFile.close(); } catch (eClose) {}
    try { if (undoOpen) app.endUndoGroup(); } catch (eUndo) {}
    return SORI_TOOLS.respond(false, 'Topaz export failed: ' + e.message);
  }
  return SORI_TOOLS.respond(true, 'Rendered ' + jobs.length + ' Topaz clip(s).', { root: folders.root.fsName, input: folders.input.fsName, output: folders.output.fsName, jobs: jobs });
};

SORI_TOOLS.topazOutputNameIsTemporary = function (name) {
  return /(^|[_\-.])temp\./i.test(name) || /[_\-.]temp\./i.test(name) || /\.tmp$/i.test(name) || /\.part$/i.test(name) || /\.crdownload$/i.test(name);
};

SORI_TOOLS.findTopazOutput = function (folder, stem, inputPath) {
  var exts = ['.mov', '.mp4', '.avi', '.mkv'];
  var files = folder.getFiles();
  var inputText = String(inputPath || '').replace(/\\/g, '/').toLowerCase();
  var best = null;
  var bestTime = -1;
  for (var e = 0; e < exts.length; e += 1) {
    for (var i = 0; i < files.length; i += 1) {
      if (!(files[i] instanceof File)) continue;
      var name = String(files[i].name || '').toLowerCase();
      try { name = decodeURI(name); } catch (eName) {}
      if (SORI_TOOLS.topazOutputNameIsTemporary(name)) continue;
      var pathText = String(files[i].fsName || '').replace(/\\/g, '/').toLowerCase();
      if (inputText && pathText === inputText) continue;
      if (name.indexOf(String(stem).toLowerCase()) !== 0 || name.lastIndexOf(exts[e]) !== name.length - exts[e].length) continue;
      try {
        if (!files[i].exists || Number(files[i].length || 0) <= 0) continue;
        var time = files[i].modified ? files[i].modified.getTime() : 0;
        if (!best || time > bestTime) {
          best = files[i];
          bestTime = time;
        }
      } catch (eFile) {}
    }
  }
  return best;
};

SORI_TOOLS.getTopazFlowMeta = function () {
  var folders = SORI_TOOLS.topazFolders();
  if (!folders || !folders.metaFile.exists) return SORI_TOOLS.respond(false, 'Topaz metadata not found.');
  folders.metaFile.encoding = 'UTF-8';
  if (!folders.metaFile.open('r')) return SORI_TOOLS.respond(false, 'Could not read Topaz metadata.');
  var meta = SORI_TOOLS.parse(folders.metaFile.read());
  folders.metaFile.close();
  if (!meta || !meta.jobs || !meta.jobs.length) return SORI_TOOLS.respond(false, 'No Topaz jobs found.');
  return SORI_TOOLS.respond(true, 'Topaz metadata loaded.', meta);
};

SORI_TOOLS.topazJobKey = function (job) {
  if (!job) return '';
  return 'SORI_TOPAZ|' + String(job.compId || '') + '|' + String(job.layerId || '') + '|' + String(job.stem || '') + '|' + String(job.inPoint || '') + '|' + String(job.outPoint || '');
};

SORI_TOOLS.topazLayerAlreadyImported = function (comp, target, job) {
  if (!comp || !target || !job) return false;
  var jobKey = SORI_TOOLS.topazJobKey(job);
  var expectedName = String(target.name || '') + '_TOPAZ';
  for (var i = 1; i <= comp.numLayers; i += 1) {
    try {
      var layer = comp.layer(i);
      if (jobKey && String(layer.comment || '') === jobKey) return true;
      if (String(layer.name || '') !== expectedName) continue;
      if (Math.abs(Number(layer.inPoint) - Number(job.inPoint)) > 0.001) continue;
      if (Math.abs(Number(layer.outPoint) - Number(job.outPoint)) > 0.001) continue;
      return true;
    } catch (e) {}
  }
  return false;
};

SORI_TOOLS.importTopazOutputSafe = function () {
  var comp = SORI_TOOLS.comp();
  if (!comp) return SORI_TOOLS.respond(false, 'Open the target comp first.');
  var folders = SORI_TOOLS.topazFolders();
  if (!folders || !folders.metaFile.exists) return SORI_TOOLS.respond(false, 'Topaz metadata not found. Export selected clips first.');
  folders.metaFile.encoding = 'UTF-8';
  if (!folders.metaFile.open('r')) return SORI_TOOLS.respond(false, 'Could not read Topaz metadata.');
  var meta = SORI_TOOLS.parse(folders.metaFile.read());
  folders.metaFile.close();
  var jobs = meta && meta.jobs ? meta.jobs : [];
  if (!jobs.length) return SORI_TOOLS.respond(false, 'No Topaz jobs found.');

  var imported = 0;
  var completed = 0;
  var missing = 0;
  app.beginUndoGroup('SoriTools Topaz Safe Replace');
  for (var i = 0; i < jobs.length; i += 1) {
    try {
      var job = jobs[i];
      var output = SORI_TOOLS.findTopazOutput(folders.output, job.stem, job.inputPath);
      if (!output || !output.exists) output = SORI_TOOLS.findTopazOutput(folders.input, job.stem, job.inputPath);
      if (!output || !output.exists) {
        missing += 1;
        continue;
      }
      var target = SORI_TOOLS.findLayerByTopazMeta(comp, job);
      if (!target) {
        missing += 1;
        continue;
      }
      if (SORI_TOOLS.topazLayerAlreadyImported(comp, target, job)) {
        completed += 1;
        continue;
      }
      if (!output.exists || Number(output.length || 0) <= 0) {
        output = SORI_TOOLS.findTopazOutput(folders.output, job.stem, job.inputPath);
        if (!output || !output.exists) output = SORI_TOOLS.findTopazOutput(folders.input, job.stem, job.inputPath);
      }
      if (!output || !output.exists || Number(output.length || 0) <= 0) {
        missing += 1;
        continue;
      }
      var importOptions = new ImportOptions(output);
      var footage = app.project.importFile(importOptions);
      var newLayer = comp.layers.add(footage);
      newLayer.name = target.name + '_TOPAZ';
      try { newLayer.comment = SORI_TOOLS.topazJobKey(job); } catch (eComment) {}
      newLayer.startTime = Number(job.inPoint);
      newLayer.inPoint = Number(job.inPoint);
      newLayer.outPoint = Number(job.outPoint);
      try { newLayer.moveBefore(target); } catch (eMove) {}
      try {
        if (footage.width && footage.height && job.compWidth && job.compHeight) {
          var scale = Math.min((Number(job.compWidth) / Number(footage.width)) * 100, (Number(job.compHeight) / Number(footage.height)) * 100);
          newLayer.property('ADBE Transform Group').property('ADBE Scale').setValue([scale, scale]);
        }
      } catch (eScale) {}
      try { target.enabled = false; } catch (eDisable) {}
      imported += 1;
      completed += 1;
    } catch (eJob) {
      missing += 1;
    }
  }
  app.endUndoGroup();
  if (!completed) return SORI_TOOLS.respond(false, 'No Topaz outputs imported. Check OUT folder names.', { imported: imported, completed: completed, missing: missing, output: folders.output.fsName });
  return SORI_TOOLS.respond(true, 'Safe replaced ' + imported + ' Topaz clip(s).' + (missing ? ' Missing ' + missing + '.' : ''), { imported: imported, completed: completed, missing: missing, output: folders.output.fsName });
};

SORI_TOOLS.revealTopazFolder = function () {
  var folders = SORI_TOOLS.topazFolders();
  if (!folders) return SORI_TOOLS.respond(false, 'Could not create Topaz folder.');
  return SORI_TOOLS.respond(true, 'Topaz folder ready.', { root: folders.root.fsName, input: folders.input.fsName, output: folders.output.fsName });
};

SORI_TOOLS.cleanTopazInput = function () {
  var folders = SORI_TOOLS.topazFolders();
  if (!folders) return SORI_TOOLS.respond(false, 'Topaz folder not found.');
  var jobs = [];
  if (folders.metaFile.exists) {
    try {
      folders.metaFile.encoding = 'UTF-8';
      if (folders.metaFile.open('r')) {
        var meta = SORI_TOOLS.parse(folders.metaFile.read());
        folders.metaFile.close();
        jobs = meta && meta.jobs ? meta.jobs : [];
      }
    } catch (eMeta) {
      try { folders.metaFile.close(); } catch (eClose) {}
    }
  }
  var removed = 0;
  for (var i = 0; i < jobs.length; i += 1) {
    try {
      if (!jobs[i] || !jobs[i].inputPath) continue;
      var file = new File(jobs[i].inputPath);
      if (file.exists && String(file.fsName || '').replace(/\\/g, '/').toLowerCase() === String(jobs[i].inputPath || '').replace(/\\/g, '/').toLowerCase() && file.remove()) removed += 1;
    } catch (e) {}
  }
  return SORI_TOOLS.respond(true, 'Cleaned ' + removed + ' Topaz input render(s).');
};
