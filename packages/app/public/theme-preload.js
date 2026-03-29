;(function () {
  var key = "castclaw-theme-id"
  var themeId = localStorage.getItem(key) || "castclaw"

  if (themeId === "oc-1" || themeId === "oc-2") {
    themeId = "castclaw"
    localStorage.setItem(key, themeId)
    localStorage.removeItem("castclaw-theme-css-light")
    localStorage.removeItem("castclaw-theme-css-dark")
  }

  var scheme = localStorage.getItem("castclaw-color-scheme") || "system"
  var isDark = scheme === "dark" || (scheme === "system" && matchMedia("(prefers-color-scheme: dark)").matches)
  var mode = isDark ? "dark" : "light"

  document.documentElement.dataset.theme = themeId
  document.documentElement.dataset.colorScheme = mode

  if (themeId === "castclaw") return

  var css = localStorage.getItem("castclaw-theme-css-" + mode)
  if (css) {
    var style = document.createElement("style")
    style.id = "castclaw-theme-preload"
    style.textContent =
      ":root{color-scheme:" +
      mode +
      ";--text-mix-blend-mode:" +
      (isDark ? "plus-lighter" : "multiply") +
      ";" +
      css +
      "}"
    document.head.appendChild(style)
  }
})()
