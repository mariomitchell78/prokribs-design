(function () {
  if (/[?&]thumb=1/.test(location.search)) document.documentElement.classList.add('thumb');
  function fit() {
    var host = document.querySelector('x-dc');
    if (!host) return;
    var thumb = document.documentElement.classList.contains('thumb');
    var w = window.innerWidth;
    var z = (!thumb && w <= 500) ? Math.min(1.2, w / 390) : 1;
    host.style.zoom = z === 1 ? '' : String(z);
  }
  fit();
  window.addEventListener('resize', fit);
})();
