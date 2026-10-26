// Minimal runtime for the exported ProKribs design screens.
// Renders the <x-dc> template with {{holes}}, <sc-for>, <sc-if>, events and state.
(function () {
  class DCLogic {
    constructor(props) { this.props = props || {}; this.state = {}; }
    setState(patch) {
      const next = typeof patch === 'function' ? patch(this.state) : patch;
      this.state = Object.assign({}, this.state, next);
      if (this.__render) this.__render();
    }
    forceUpdate() { if (this.__render) this.__render(); }
  }
  window.DCLogic = DCLogic;

  const HOLE = /\{\{\s*([^}]+?)\s*\}\}/g;
  const WHOLE = /^\s*\{\{\s*([^}]+?)\s*\}\}\s*$/;

  function lookup(path, scope) {
    if (path === 'true') return true;
    if (path === 'false') return false;
    if (path === 'null') return null;
    if (/^-?\d+(\.\d+)?$/.test(path)) return Number(path);
    if (/^'.*'$|^".*"$/.test(path)) return path.slice(1, -1);
    let v = scope;
    for (const part of path.split('.')) {
      if (v == null) return undefined;
      v = v[part];
    }
    return v;
  }

  function interp(str, scope) {
    return str.replace(HOLE, (_, p) => {
      const v = lookup(p, scope);
      return v == null ? '' : String(v);
    });
  }

  function renderChildren(src, scope, out) {
    src.childNodes.forEach((n) => renderNode(n, scope, out));
  }

  function renderNode(node, scope, out) {
    if (node.nodeType === 3) {
      out.appendChild(document.createTextNode(interp(node.nodeValue, scope)));
      return;
    }
    if (node.nodeType !== 1) return;
    const tag = node.tagName.toLowerCase();
    if (tag === 'sc-for') {
      const list = lookup((node.getAttribute('list').match(WHOLE) || [])[1] || '', scope) || [];
      const as = node.getAttribute('as') || 'item';
      list.forEach((item, i) => {
        const s = Object.create(scope);
        s[as] = item;
        s.$index = i;
        renderChildren(node, s, out);
      });
      return;
    }
    if (tag === 'sc-if') {
      const v = lookup((node.getAttribute('value').match(WHOLE) || [])[1] || '', scope);
      if (v) renderChildren(node, scope, out);
      return;
    }
    const el = node.namespaceURI === 'http://www.w3.org/1999/xhtml'
      ? document.createElement(node.localName)
      : document.createElementNS(node.namespaceURI, node.localName);
    for (const attr of Array.from(node.attributes)) {
      const name = attr.name;
      const whole = attr.value.match(WHOLE);
      if (/^on[a-z]/i.test(name) && whole) {
        const fn = lookup(whole[1], scope);
        if (typeof fn === 'function') {
          let ev = name.slice(2).toLowerCase();
          if (ev === 'change' && (node.getAttribute('type') === 'checkbox' || tag === 'select')) ev = 'change';
          el.addEventListener(ev, (e) => fn(e));
        }
        continue;
      }
      if (name.startsWith('hint-')) continue;
      if ((name === 'checked' || name === 'disabled' || name === 'selected') && whole) {
        const v = lookup(whole[1], scope);
        if (v) el.setAttribute(name, '');
        el[name] = !!v;
        continue;
      }
      if (whole) {
        const v = lookup(whole[1], scope);
        if (v === false || v == null) continue;
        el.setAttribute(name, String(v));
      } else {
        el.setAttribute(name, interp(attr.value, scope));
      }
    }
    if (tag === 'template') return;
    renderChildren(node, scope, el);
    out.appendChild(el);
  }

  function boot() {
    const host = document.querySelector('x-dc');
    if (!host) return;
    const helmet = host.querySelector('helmet');
    if (helmet) {
      Array.from(helmet.childNodes).forEach((n) => document.head.appendChild(n));
      helmet.remove();
    }
    const tpl = document.createElement('div');
    while (host.firstChild) tpl.appendChild(host.firstChild);

    const scriptEl = document.querySelector('script[data-dc-script]');
    let props = {};
    try { props = JSON.parse(scriptEl.getAttribute('data-props') || '{}'); } catch (e) { props = {}; }
    const defaults = {};
    Object.keys(props).forEach((k) => { if (k[0] !== '$' && props[k] && 'default' in props[k]) defaults[k] = props[k].default; });
    const Component = new Function('DCLogic', scriptEl.textContent + '\nreturn Component;')(DCLogic);
    const inst = new Component(defaults);
    if (!inst.props) inst.props = defaults;

    inst.__render = function () {
      const vals = inst.renderVals ? inst.renderVals() : {};
      const frag = document.createDocumentFragment();
      renderChildren(tpl, vals, frag);
      host.replaceChildren(frag);
    };
    inst.__render();
    host.style.visibility = 'visible';
    if (inst.componentDidMount) inst.componentDidMount();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
