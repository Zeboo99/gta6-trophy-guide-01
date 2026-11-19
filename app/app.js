/* Sunset Ledger — GTA VI trophy guide & tracker.
   Static, offline, no network at run time. Progress lives in localStorage only. */
(function () {
  "use strict";

  var STORAGE_KEY = "sunset-ledger-progress-v1";

  var KIND_LABELS = {
    all: "All",
    story: "Story",
    missable: "Missable",
    collectible: "Collectibles",
    activity: "Activities",
    robbery: "Robberies",
    world: "World"
  };

  var ROADMAP_STAGES = [
    {
      title: "Play the story",
      note: "Chapters 1–4, the final mission, and the side-character strands. Story trophies unlock by finishing missions — none of them can be missed, but keep a manual save at the start of each chapter: there is no mission replay.",
      ids: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 22, 23, 24, 25, 26, 27]
    },
    {
      title: "The one missable",
      note: "Meditate at Jason's house in Chapter 1 before the chapter ends — that spot disappears after it. The other 17 meditation spots can be found later.",
      ids: [28]
    },
    {
      title: "Activities & skills",
      note: "Shooting ranges, stunts, races, fishing, arcade, challenges and combat. Most of these grind up alongside normal play.",
      ids: [15, 16, 17, 18, 19, 20, 21, 29, 32, 36, 37, 38, 46, 51]
    },
    {
      title: "Collectibles & the map",
      note: "Cards, WAiNK spots, vehicles and every corner of Leonida.",
      ids: [30, 31, 35, 42]
    },
    {
      title: "Robberies & money",
      note: "Vaults, trucks, jewelry, gangs — and the cash to launder, spend and stash.",
      ids: [33, 34, 39, 40, 41, 43, 52, 53, 54, 55]
    },
    {
      title: "100% & platinum",
      note: "Finish the completion checklist, then the platinum is yours.",
      ids: [14, 1]
    },
    {
      title: "Loose ends in Leonida",
      note: "World moments and open leads. A few triggers are not yet documented in any published guide, so this ledger labels them honestly instead of inventing one.",
      ids: [44, 45, 47, 48, 49, 50]
    }
  ];

  var data = null;
  var byId = {};
  var state = { earned: {}, notes: {}, spoiler: true };
  var filters = { kind: "all", grade: "all", earned: "all", query: "" };
  var selectedId = null;

  function $(id) { return document.getElementById(id); }

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function loadState() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      var saved = JSON.parse(raw);
      if (saved && typeof saved === "object") {
        if (saved.earned) state.earned = saved.earned;
        if (saved.notes) state.notes = saved.notes;
        if (typeof saved.spoiler === "boolean") state.spoiler = saved.spoiler;
      }
    } catch (err) { /* a corrupt save starts fresh */ }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) { /* storage full or blocked: progress stays in memory */ }
  }

  function isEarned(trophy) { return !!state.earned[trophy.id]; }

  function isHidden(trophy) {
    return state.spoiler && trophy.secret && !isEarned(trophy);
  }

  function displayName(trophy) {
    return isHidden(trophy) ? "Hidden Trophy" : trophy.name;
  }

  function displayDescription(trophy) {
    return isHidden(trophy) ? "Hidden on PlayStation until earned." : trophy.description;
  }

  function earnedCount() {
    return data.trophies.filter(isEarned).length;
  }

  function renderProgress() {
    var total = data.trophies.length;
    var earned = earnedCount();
    $("earned-count").textContent = String(earned);
    $("progress-fill").style.width = (total ? (earned / total) * 100 : 0) + "%";
    var counts = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
    var totals = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
    data.trophies.forEach(function (t) {
      totals[t.grade] += 1;
      if (isEarned(t)) counts[t.grade] += 1;
    });
    $("grade-counts").innerHTML = ["platinum", "gold", "silver", "bronze"]
      .map(function (g) {
        return "<span><b>" + counts[g] + "/" + totals[g] + "</b> " + g + "</span>";
      })
      .join("");
  }

  function renderChips() {
    var wrap = $("kind-chips");
    wrap.innerHTML = "";
    Object.keys(KIND_LABELS).forEach(function (key) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip" + (filters.kind === key ? " active" : "");
      btn.textContent = KIND_LABELS[key];
      btn.addEventListener("click", function () {
        filters.kind = key;
        renderChips();
        renderList();
      });
      wrap.appendChild(btn);
    });
  }

  function trophyMatches(trophy) {
    if (filters.kind === "missable") {
      if (!trophy.missable) return false;
    } else if (filters.kind !== "all" && trophy.kind !== filters.kind) {
      return false;
    }
    if (filters.grade !== "all" && trophy.grade !== filters.grade) return false;
    if (filters.earned === "earned" && !isEarned(trophy)) return false;
    if (filters.earned === "unearned" && isEarned(trophy)) return false;
    if (filters.query) {
      var q = filters.query.toLowerCase();
      var hay = (trophy.name + " " + trophy.description + " " + trophy.guide).toLowerCase();
      if (hay.indexOf(q) === -1) return false;
    }
    return true;
  }

  function renderList() {
    var list = $("trophy-list");
    list.innerHTML = "";
    var shown = data.trophies.filter(trophyMatches);
    $("list-count").textContent = shown.length + " of " + data.trophies.length + " trophies shown";
    if (!shown.length) {
      var empty = document.createElement("li");
      empty.className = "empty-list";
      empty.textContent = "No trophies match these filters.";
      list.appendChild(empty);
      return;
    }
    shown.forEach(function (trophy) {
      var row = document.createElement("li");
      row.className = "trophy-row" + (isEarned(trophy) ? " earned" : "") + (selectedId === trophy.id ? " selected" : "");
      row.setAttribute("data-id", String(trophy.id));

      var box = document.createElement("input");
      box.type = "checkbox";
      box.checked = isEarned(trophy);
      box.setAttribute("aria-label", "Mark " + displayName(trophy) + " earned");
      box.addEventListener("click", function (event) {
        event.stopPropagation();
        toggleEarned(trophy.id);
      });
      row.appendChild(box);

      var medal = document.createElement("span");
      medal.className = "medal " + trophy.grade;
      medal.title = trophy.grade;
      row.appendChild(medal);

      var main = document.createElement("div");
      var name = document.createElement("div");
      name.className = "trophy-name";
      name.innerHTML = escapeHtml(displayName(trophy));
      if (isHidden(trophy)) {
        var tag = document.createElement("span");
        tag.className = "hidden-tag";
        tag.textContent = " — hidden until earned";
        name.appendChild(tag);
      }
      main.appendChild(name);
      var desc = document.createElement("div");
      desc.className = "trophy-desc";
      desc.textContent = displayDescription(trophy);
      main.appendChild(desc);
      var tags = document.createElement("div");
      tags.className = "trophy-tags";
      var kindTag = document.createElement("span");
      kindTag.className = "tag";
      kindTag.textContent = KIND_LABELS[trophy.kind] || trophy.kind;
      tags.appendChild(kindTag);
      if (trophy.missable) {
        var miss = document.createElement("span");
        miss.className = "tag missable";
        miss.textContent = "MISSABLE";
        tags.appendChild(miss);
      }
      if (trophy.target) {
        var target = document.createElement("span");
        target.className = "tag target";
        target.textContent = "Target: " + trophy.target + " " + (trophy.target_label || "");
        tags.appendChild(target);
      }
      main.appendChild(tags);
      row.appendChild(main);

      var grade = document.createElement("div");
      grade.className = "trophy-grade";
      var gradeWord = document.createElement("span");
      gradeWord.className = "grade-word";
      gradeWord.textContent = trophy.grade;
      grade.appendChild(gradeWord);
      grade.appendChild(document.createTextNode("PS5"));
      row.appendChild(grade);

      row.addEventListener("click", function () { selectTrophy(trophy.id); });
      list.appendChild(row);
    });
  }

  function renderDetail() {
    var pane = $("detail");
    var trophy = selectedId ? byId[selectedId] : null;
    if (!trophy) {
      pane.innerHTML = '<p class="detail-empty">Pick a trophy on the left to read its guide.</p>';
      return;
    }
    pane.innerHTML = "";
    var hidden = isHidden(trophy);

    var title = document.createElement("h2");
    title.textContent = displayName(trophy);
    pane.appendChild(title);

    var grade = document.createElement("p");
    grade.className = "detail-grade";
    grade.textContent = trophy.grade + " trophy · " + (KIND_LABELS[trophy.kind] || trophy.kind) + (trophy.secret ? " · hidden on PlayStation" : "");
    pane.appendChild(grade);

    var desc = document.createElement("p");
    desc.className = "detail-desc";
    desc.textContent = displayDescription(trophy);
    pane.appendChild(desc);

    if (trophy.missable) {
      var warn = document.createElement("p");
      warn.className = "missable-note";
      warn.textContent = "Missable — do this before the moment passes. See the Missables tab for the save habits that protect a run.";
      pane.appendChild(warn);
    }

    if (trophy.target) {
      var targetHead = document.createElement("h3");
      targetHead.textContent = "PSN target";
      pane.appendChild(targetHead);
      var targetText = document.createElement("p");
      targetText.textContent = trophy.target + " " + (trophy.target_label || "") + " — tracked by PlayStation.";
      pane.appendChild(targetText);
    }

    if (!hidden) {
      var guideHead = document.createElement("h3");
      guideHead.textContent = "Guide";
      pane.appendChild(guideHead);
      var guideText = document.createElement("p");
      guideText.textContent = trophy.guide;
      pane.appendChild(guideText);

      var srcHead = document.createElement("h3");
      srcHead.textContent = "Sources";
      pane.appendChild(srcHead);
      var srcList = document.createElement("ul");
      srcList.className = "source-list";
      trophy.sources.forEach(function (key) {
        var src = data.sources[key];
        if (!src) return;
        var item = document.createElement("li");
        var link = document.createElement("a");
        link.href = src.url;
        link.textContent = src.label;
        link.target = "_blank";
        link.rel = "noopener";
        item.appendChild(link);
        srcList.appendChild(item);
      });
      pane.appendChild(srcList);
    } else {
      var hiddenNote = document.createElement("p");
      hiddenNote.textContent = "This trophy is hidden on PlayStation. Earn it to reveal its guide — or turn Hide spoilers off in the toolbar.";
      pane.appendChild(hiddenNote);
    }

    var noteLabel = document.createElement("label");
    noteLabel.className = "note-label";
    noteLabel.setAttribute("for", "trophy-note");
    noteLabel.textContent = "Your note (saved in this browser)";
    pane.appendChild(noteLabel);
    var note = document.createElement("textarea");
    note.id = "trophy-note";
    note.placeholder = "Where you found it, what worked, what to retry…";
    note.value = state.notes[trophy.id] || "";
    note.addEventListener("input", function () {
      state.notes[trophy.id] = note.value;
      saveState();
    });
    pane.appendChild(note);

    var earnedBtn = document.createElement("button");
    earnedBtn.type = "button";
    earnedBtn.className = "earned-btn" + (isEarned(trophy) ? "" : " primary");
    earnedBtn.textContent = isEarned(trophy) ? "Earned — click to unmark" : "Mark as earned";
    earnedBtn.addEventListener("click", function () { toggleEarned(trophy.id); });
    pane.appendChild(earnedBtn);
  }

  function renderRoadmap() {
    var wrap = $("roadmap");
    wrap.innerHTML = "";
    ROADMAP_STAGES.forEach(function (stage) {
      var item = document.createElement("li");
      var title = document.createElement("h2");
      title.textContent = stage.title;
      item.appendChild(title);
      var note = document.createElement("p");
      note.className = "stage-note";
      note.textContent = stage.note;
      item.appendChild(note);
      var done = stage.ids.filter(function (id) { return state.earned[id]; }).length;
      var progress = document.createElement("p");
      progress.className = "stage-progress";
      progress.textContent = done + " of " + stage.ids.length + " earned";
      item.appendChild(progress);
      var chips = document.createElement("ul");
      chips.className = "stage-trophies";
      stage.ids.forEach(function (id) {
        var t = byId[id];
        if (!t) return;
        var chip = document.createElement("li");
        var btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = displayName(t);
        if (isEarned(t)) btn.className = "done";
        btn.addEventListener("click", function () {
          selectTrophy(id);
          switchView("guide");
        });
        chip.appendChild(btn);
        chips.appendChild(chip);
      });
      item.appendChild(chips);
      wrap.appendChild(item);
    });
  }

  function renderMissables() {
    var wrap = $("missable-list");
    wrap.innerHTML = "";
    var missable = data.trophies.filter(function (t) { return t.missable; });
    missable.forEach(function (t) {
      var card = document.createElement("div");
      card.className = "missable-card";
      var title = document.createElement("h2");
      title.textContent = t.name + " — " + t.grade;
      card.appendChild(title);
      var desc = document.createElement("p");
      desc.textContent = t.description;
      card.appendChild(desc);
      var guide = document.createElement("p");
      guide.textContent = t.guide;
      card.appendChild(guide);
      wrap.appendChild(card);
    });
    var ok = document.createElement("p");
    ok.textContent = "Every other trophy unlocks by playing: story trophies by finishing their missions, the rest by grinding counts that never lock out. The only reported exception is the meditation above.";
    wrap.appendChild(ok);
  }

  function renderAll() {
    renderProgress();
    renderList();
    renderDetail();
    renderRoadmap();
    renderMissables();
  }

  function toggleEarned(id) {
    if (state.earned[id]) delete state.earned[id];
    else state.earned[id] = true;
    saveState();
    renderAll();
  }

  function selectTrophy(id) {
    selectedId = id;
    renderList();
    renderDetail();
    var pane = $("detail");
    if (pane && window.innerWidth <= 900) pane.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  function switchView(name) {
    document.querySelectorAll(".tab").forEach(function (tab) {
      var active = tab.getAttribute("data-view") === name;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
    });
    document.querySelectorAll(".view").forEach(function (view) {
      view.hidden = view.id !== "view-" + name;
    });
  }

  function exportProgress() {
    var payload = {
      app: "sunset-ledger-gta6-trophy-guide",
      exportedAt: new Date().toISOString(),
      earned: Object.keys(state.earned).map(Number).sort(function (a, b) { return a - b; }),
      notes: state.notes,
      spoiler: state.spoiler
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = url;
    link.download = "gta6-trophy-progress.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function importProgress(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var payload = JSON.parse(reader.result);
        if (!payload || typeof payload !== "object") throw new Error("not an object");
        var earned = {};
        (payload.earned || []).forEach(function (id) {
          if (byId[id]) earned[id] = true;
        });
        state.earned = earned;
        state.notes = payload.notes && typeof payload.notes === "object" ? payload.notes : {};
        if (typeof payload.spoiler === "boolean") {
          state.spoiler = payload.spoiler;
          $("spoiler-toggle").checked = state.spoiler;
        }
        saveState();
        renderAll();
      } catch (err) {
        alert("That file is not a Sunset Ledger progress export.");
      }
    };
    reader.readAsText(file);
  }

  function bindEvents() {
    document.querySelectorAll(".tab").forEach(function (tab) {
      tab.addEventListener("click", function () { switchView(tab.getAttribute("data-view")); });
    });
    $("search").addEventListener("input", function (event) {
      filters.query = event.target.value.trim();
      renderList();
    });
    $("grade-filter").addEventListener("change", function (event) {
      filters.grade = event.target.value;
      renderList();
    });
    $("earned-filter").addEventListener("change", function (event) {
      filters.earned = event.target.value;
      renderList();
    });
    $("spoiler-toggle").addEventListener("change", function (event) {
      state.spoiler = event.target.checked;
      saveState();
      renderList();
      renderDetail();
      renderRoadmap();
    });
    $("export-btn").addEventListener("click", exportProgress);
    $("import-btn").addEventListener("click", function () { $("import-file").click(); });
    $("import-file").addEventListener("change", function (event) {
      if (event.target.files && event.target.files[0]) importProgress(event.target.files[0]);
      event.target.value = "";
    });
    $("reset-btn").addEventListener("click", function () {
      if (window.confirm("Clear all earned marks and notes?")) {
        state.earned = {};
        state.notes = {};
        saveState();
        renderAll();
      }
    });
  }

  function boot() {
    loadState();
    $("spoiler-toggle").checked = state.spoiler;
    fetch("data/trophies.json")
      .then(function (response) {
        if (!response.ok) throw new Error("trophies.json failed to load");
        return response.json();
      })
      .then(function (json) {
        data = json;
        data.trophies.forEach(function (t) { byId[t.id] = t; });
        bindEvents();
        renderChips();
        renderAll();
      })
      .catch(function () {
        $("trophy-list").innerHTML = '<li class="empty-list">The trophy data could not be loaded. Serve this folder with a static file server and reload.</li>';
      });
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
