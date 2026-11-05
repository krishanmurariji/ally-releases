/* Black / white theme. Loaded in <head> so the saved choice is applied before the first paint (no flash). Default: black. */
(function () {
  var KEY = 'ally.site.theme', d = document.documentElement, t = null
  try { t = localStorage.getItem(KEY) } catch (e) {}
  if (t !== 'light' && t !== 'dark') t = 'dark'
  d.setAttribute('data-theme', t)
  function sync() {
    var light = d.getAttribute('data-theme') === 'light', b = document.getElementById('themeBtn')
    var m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute('content', light ? '#f6f8f7' : '#080b10')
    if (!b) return
    b.setAttribute('aria-pressed', String(light)); b.setAttribute('aria-label', light ? 'Switch to the black theme' : 'Switch to the white theme'); b.title = b.getAttribute('aria-label')
  }
  document.addEventListener('DOMContentLoaded', function () {
    sync()
    var b = document.getElementById('themeBtn'); if (!b) return
    b.addEventListener('click', function () {
      var next = d.getAttribute('data-theme') === 'light' ? 'dark' : 'light'
      d.setAttribute('data-theme', next); try { localStorage.setItem(KEY, next) } catch (e) {}
      sync(); window.dispatchEvent(new Event('ally-theme'))
    })
  })
})()
