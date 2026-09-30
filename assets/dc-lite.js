/*
 * dc-lite.js - tiny template runtime for the Club72 static site.
 * Renders <template id="tpl"> markup with {{holes}}, <sc-if>, <sc-for>
 * and onX="{{handler}}" bindings, driven by a `Component` class that
 * extends DCLogic (setState / renderVals / componentDidMount).
 * No dependencies. Re-renders patch the live DOM in place so inputs keep focus.
 */
(function () {
  'use strict';

  var BOOL_ATTRS = { disabled: 1, checked: 1, hidden: 1, selected: 1, required: 1, novalidate: 1, readonly: 1, multiple: 1 };
  var HOLE_ONLY = /^\s*\{\{\s*([^}]+?)\s*\}\}\s*$/;
  var HOLE = /\{\{\s*([^}]+?)\s*\}\}/g;

  function lookup(scope, path) {
    if (path === 'true') return true;
    if (path === 'false') return false;
    if (path === 'null') return null;
    if (/^-?\d+(\.\d+)?$/.test(path)) return Number(path);
    if (/^'.*'$|^".*"$/.test(path)) return path.slice(1, -1);
    var parts = path.split('.');
    var v = scope[parts[0]];
    for (var i = 1; i < parts.length; i++) {
      if (v == null) return undefined;
      v = v[parts[i]];
    }
    return v;
  }

  function interp(str, scope) {
    var m = str.match(HOLE_ONLY);
    if (m) return lookup(scope, m[1]);
    if (str.indexOf('{{') < 0) return str;
    return str.replace(HOLE, function (_, p) {
      var v = lookup(scope, p);
      return v == null ? '' : String(v);
    });
  }

  function eventName(attr) {
    // template attribute names are lower-cased by the HTML parser: onclick, onchange, onsubmit...
    return attr.slice(2);
  }

  function build(node, scope, out) {
    if (node.nodeType === 3) {
      out.push(document.createTextNode(interp(node.nodeValue, scope)));
      return;
    }
    if (node.nodeType !== 1) return;
    var tag = node.localName;

    if (tag === 'sc-if') {
      var cond = interp(node.getAttribute('value') || '', scope);
      if (cond) buildChildren(node, scope, out);
      return;
    }
    if (tag === 'sc-for') {
      var list = interp(node.getAttribute('list') || '', scope) || [];
      var as = node.getAttribute('as') || 'item';
      for (var i = 0; i < list.length; i++) {
        var s = Object.create(scope);
        s[as] = list[i];
        s.$index = i;
        buildChildren(node, s, out);
      }
      return;
    }

    var el = node.namespaceURI && node.namespaceURI !== 'http://www.w3.org/1999/xhtml'
      ? document.createElementNS(node.namespaceURI, node.localName)
      : document.createElement(tag);
    var handlers = null, value;

    for (var a = 0; a < node.attributes.length; a++) {
      var at = node.attributes[a];
      var name = at.name;
      if (name.indexOf('hint-') === 0) continue;
      var v = interp(at.value, scope);
      if (name.length > 2 && name.indexOf('on') === 0 && at.value.indexOf('{{') >= 0) {
        if (typeof v === 'function') { (handlers || (handlers = {}))[eventName(name)] = v; }
        continue;
      }
      if (name === 'value' && (tag === 'input' || tag === 'select' || tag === 'textarea')) {
        value = v == null ? '' : String(v);
        if (tag === 'input') el.setAttribute('value', value);
        continue;
      }
      if (v === true || v === false) {
        if (BOOL_ATTRS[name]) { if (v) el.setAttribute(name, ''); }
        else el.setAttribute(name, String(v));
        continue;
      }
      if (v == null) continue;
      el.setAttribute(name, typeof v === 'object' ? '' : String(v));
    }
    el.__h = handlers;
    el.__v = value;

    var kids = [];
    buildChildren(node, scope, kids);
    for (var k = 0; k < kids.length; k++) el.appendChild(kids[k]);
    if (value !== undefined) el.value = value;
    out.push(el);
  }

  function buildChildren(node, scope, out) {
    var src = node.content || node; // <template> uses .content
    for (var c = src.firstChild; c; c = c.nextSibling) build(c, scope, out);
  }

  function sameKind(a, b) {
    return a.nodeType === b.nodeType && (a.nodeType !== 1 || (a.localName === b.localName && a.namespaceURI === b.namespaceURI));
  }

  function patchAttrs(live, fresh) {
    var i, at;
    for (i = live.attributes.length - 1; i >= 0; i--) {
      at = live.attributes[i];
      if (!fresh.hasAttribute(at.name)) live.removeAttribute(at.name);
    }
    for (i = 0; i < fresh.attributes.length; i++) {
      at = fresh.attributes[i];
      if (live.getAttribute(at.name) !== at.value) live.setAttribute(at.name, at.value);
    }
    live.__h = fresh.__h;
  }

  function patchChildren(live, freshKids) {
    var i = 0;
    for (; i < freshKids.length; i++) {
      var f = freshKids[i];
      var l = live.childNodes[i];
      if (!l) { live.appendChild(f); continue; }
      if (!sameKind(l, f)) { live.replaceChild(f, l); continue; }
      if (f.nodeType === 3) { if (l.nodeValue !== f.nodeValue) l.nodeValue = f.nodeValue; continue; }
      patchAttrs(l, f);
      patchChildren(l, Array.prototype.slice.call(f.childNodes));
      if (f.__v !== undefined && l.value !== f.__v) l.value = f.__v;
    }
    while (live.childNodes.length > freshKids.length) live.removeChild(live.lastChild);
  }

  function dispatch(root, e, type) {
    var el = e.target;
    while (el && el !== root.parentNode) {
      if (el.__h && el.__h[type]) { el.__h[type](e); return true; }
      el = el.parentNode;
    }
    return false;
  }

  function DCLogic(props) { this.props = props || {}; this.state = {}; }
  DCLogic.prototype.setState = function (u) {
    var patch = typeof u === 'function' ? u(this.state, this.props) : u;
    this.state = Object.assign({}, this.state, patch);
    if (this.__schedule) this.__schedule();
  };
  DCLogic.prototype.forceUpdate = function () { if (this.__schedule) this.__schedule(); };
  window.DCLogic = DCLogic;

  window.dcMount = function (Comp, tplId, rootId) {
    var tpl = document.getElementById(tplId || 'tpl');
    var root = document.getElementById(rootId || 'app');
    var inst = new Comp({});
    var queued = false;
    function render() {
      queued = false;
      var vals = inst.renderVals ? inst.renderVals() : {};
      var fresh = [];
      buildChildren(tpl, vals, fresh);
      patchChildren(root, fresh);
    }
    inst.__schedule = function () {
      if (queued) return;
      queued = true;
      (window.queueMicrotask || function (f) { Promise.resolve().then(f); })(render);
    };
    render();

    root.addEventListener('click', function (e) { dispatch(root, e, 'click'); });
    root.addEventListener('input', function (e) {
      var t = e.target.localName;
      if (t === 'input' || t === 'textarea') dispatch(root, e, 'change');
    });
    root.addEventListener('change', function (e) {
      if (e.target.localName === 'select') dispatch(root, e, 'change');
    });
    root.addEventListener('submit', function (e) {
      if (!dispatch(root, e, 'submit')) return;
      if (!e.defaultPrevented) e.preventDefault();
    });

    if (inst.componentDidMount) inst.componentDidMount();
    window.addEventListener('pagehide', function () { if (inst.componentWillUnmount) inst.componentWillUnmount(); });
    return inst;
  };
})();
