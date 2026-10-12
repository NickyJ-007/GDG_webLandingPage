(() => {
  "use strict";

  // Mini Arcade: pick one game at a time. Ship the Web is the page's own game;
  // Commit Rush and Bug Smasher load in iframes from mini-arcade/.
  const tabs = Array.from(document.querySelectorAll("[data-arcade]"));
  const panels = Array.from(document.querySelectorAll("[data-arcade-panel]"));
  const titleEl = document.getElementById("arcade-title");
  const timeEl = document.getElementById("arcade-time");
  const blurbEl = document.getElementById("arcade-blurb");
  const controlsEl = document.getElementById("arcade-controls");
  if (!tabs.length || !panels.length) return;

  const names = tabs.map((tab) => tab.dataset.arcade);
  let current = null;

  const frameOf = (panel) => panel.querySelector("iframe");
  const loaderOf = (panel) => panel.querySelector(".arcade-loader");

  function enter(panel) {
    if (panel.dataset.arcadePanel === "ship") {
      // The canvas was hidden (0×0) while another game was showing; re-measure it.
      window.dispatchEvent(new Event("resize"));
      return;
    }
    const frame = frameOf(panel);
    const loader = loaderOf(panel);
    if (!frame) return;
    if (loader) loader.hidden = false;
    frame.src = frame.dataset.src;
  }

  function leave(panel) {
    if (panel.dataset.arcadePanel === "ship") {
      window.dispatchEvent(new Event("arcade:stop"));
      return;
    }
    // Unloading the frame stops that game's loop and music.
    const frame = frameOf(panel);
    const loader = loaderOf(panel);
    if (loader) loader.hidden = true;
    if (frame) frame.src = "about:blank";
  }

  function describe(tab) {
    titleEl.textContent = tab.dataset.title;
    timeEl.textContent = tab.dataset.time;
    blurbEl.textContent = tab.dataset.blurb;
    controlsEl.textContent = tab.dataset.controls;
  }

  function show(name, { updateHash = true } = {}) {
    if (!names.includes(name)) return;
    if (name === current) return;
    panels.forEach((panel) => {
      const active = panel.dataset.arcadePanel === name;
      if (!active && !panel.hidden) leave(panel);
      panel.hidden = !active;
      if (active) enter(panel);
    });
    tabs.forEach((tab) => {
      const active = tab.dataset.arcade === name;
      tab.classList.toggle("is-active", active);
      tab.setAttribute("aria-selected", String(active));
      tab.tabIndex = active ? 0 : -1;
      if (active) describe(tab);
    });
    current = name;
    if (updateHash) history.replaceState(null, "", `#arcade=${name}`);
  }

  function nameFromHash() {
    const match = window.location.hash.match(/arcade=(\w+)/);
    return match && names.includes(match[1]) ? match[1] : null;
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => show(tab.dataset.arcade));
    tab.addEventListener("keydown", (event) => {
      const keys = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
      let next = null;
      if (keys[event.key]) next = (index + keys[event.key] + tabs.length) % tabs.length;
      if (event.key === "Home") next = 0;
      if (event.key === "End") next = tabs.length - 1;
      if (next === null) return;
      event.preventDefault();
      tabs[next].focus();
      show(tabs[next].dataset.arcade);
    });
  });

  // Each mini-game loads its own loader away once its page has finished loading.
  panels.forEach((panel) => {
    const frame = frameOf(panel);
    if (!frame) return;
    frame.addEventListener("load", () => {
      const loader = loaderOf(panel);
      if (loader && frame.getAttribute("src") !== "about:blank") loader.hidden = true;
    });
  });

  document.querySelectorAll("[data-restart]").forEach((button) => {
    button.addEventListener("click", () => {
      const panel = panels.find((item) => item.dataset.arcadePanel === button.dataset.restart);
      const frame = panel && frameOf(panel);
      const loader = panel && loaderOf(panel);
      if (!frame) return;
      if (loader) loader.hidden = false;
      frame.src = "about:blank";
      frame.src = frame.dataset.src;
    });
  });

  window.addEventListener("hashchange", () => {
    const name = nameFromHash();
    if (name) show(name, { updateHash: false });
  });

  // Each mini-game reports its height so its iframe fits the content.
  window.addEventListener("message", (event) => {
    const data = event.data;
    if (!data || data.type !== "mini-arcade:height") return;
    const frame = document.querySelector(`iframe[data-game="${data.game}"]`);
    if (!frame || event.source !== frame.contentWindow) return;
    frame.style.height = `${Math.max(320, Math.ceil(data.height))}px`;
  });

  show(nameFromHash() || "ship", { updateHash: false });
})();
