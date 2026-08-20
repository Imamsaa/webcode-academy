
(function(){
  "use strict";

  const LESSONS = window.WEBCODE_LESSONS || [];
  const STORAGE_KEY = "webcode_github_pages_v1";
  const defaultState = {course:"html", lessonIndex:0, completed:{}, code:{}};
  let state = loadState();
  const materialCache = new Map();

  const $ = (s) => document.querySelector(s);

  function loadState(){
    try{
      return Object.assign({}, defaultState, JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"));
    }catch{
      return Object.assign({}, defaultState);
    }
  }

  function saveState(){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function courseLessons(){
    return LESSONS.filter((x) => x.course === state.course);
  }

  function currentLesson(){
    return courseLessons()[state.lessonIndex] || courseLessons()[0];
  }

  function codeFor(lessonId){
    return state.code[lessonId] || {};
  }

  function setCourse(course){
    state.course = course;
    state.lessonIndex = 0;
    saveState();
    render();
  }

  function lessonKey(lessonId){
    return String(lessonId);
  }

  function normalize(value){
    return String(value || "").replace(/\s+/g," ").trim().toLowerCase();
  }

  function buildCode(){
    return [
      $("#htmlEditor").value,
      $("#cssEditor").value,
      $("#jsEditor").value
    ].join("\n");
  }

  function safeRegex(pattern){
    try { return new RegExp(pattern,"i"); }
    catch { return null; }
  }

  function taskPassed(task){
    const re = safeRegex(task.pattern);
    return !!re && re.test(buildCode());
  }

  function allTaskResults(lesson){
    return lesson.tasks.map(taskPassed);
  }

  function courseProgress(){
    const arr = courseLessons();
    const done = arr.filter((l) => !!state.completed[lessonKey(l.id)]).length;
    return {done,total:arr.length,pct:arr.length ? Math.round(done/arr.length*100) : 0};
  }

  function markLessonCompleteIfNeeded(lesson){
    if(!lesson) return;
    const results = allTaskResults(lesson);
    if(results.length && results.every(Boolean)){
      state.completed[lessonKey(lesson.id)] = true;
      saveState();
    }
  }

  function renderNavigation(){
    const nav = $("#lessonNav");
    const groups = {};
    courseLessons().forEach((lesson,index) => {
      (groups[lesson.section] ||= []).push([lesson,index]);
    });
    nav.innerHTML = Object.entries(groups).map(([section,items]) => `
      <div class="section-title">${escapeHtml(section)}</div>
      ${items.map(([lesson,index]) => `
        <button class="lesson-nav ${index === state.lessonIndex ? "active" : ""}" data-index="${index}">
          ${state.completed[lessonKey(lesson.id)] ? "✓ " : ""}${index+1}. ${escapeHtml(lesson.title)}
        </button>
      `).join("")}
    `).join("");

    nav.querySelectorAll(".lesson-nav").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.lessonIndex = Number(btn.dataset.index);
        saveState();
        render();
      });
    });
  }

  async function renderLesson(){
    const lesson = currentLesson();
    if(!lesson) return;
    $('#courseName').textContent = lesson.lang;
    const progress = courseProgress();
    $('#progressBar').style.width = progress.pct + '%';
    $('#progressText').textContent = `${progress.pct}% (${progress.done}/${progress.total} lesson selesai)`;
    $('#lessonContent').innerHTML = `
      <div class="crumb">${escapeHtml(lesson.lang)} › ${escapeHtml(lesson.section)}</div>
      <h1>${escapeHtml(lesson.title)}</h1>
      <p class="lead">${escapeHtml(lesson.summary)}</p>
      <div class="box info"><b>🎓 Tujuan belajar</b><ul>${lesson.objectives.map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul></div>
      <div id="materialBody"><div class="box note">Memuat materi...</div></div>
      <h2>Latihan</h2><div id="lessonTasks"></div>`;
    try{
      let fragment=materialCache.get(lesson.id);
      if(!fragment){
        const response=await fetch(lesson.contentPath);
        if(!response.ok) throw new Error(`Gagal memuat ${lesson.contentPath}`);
        fragment=await response.text(); materialCache.set(lesson.id,fragment);
      }
      const body=document.querySelector('#materialBody'); if(body) body.innerHTML=fragment;
    }catch(error){
      const body=document.querySelector('#materialBody');
      if(body) body.innerHTML=`<div class="box note"><b>Materi belum dapat dimuat.</b><br>${escapeHtml(error.message)}<br><br>Pastikan project dibuka melalui HTTP server atau GitHub Pages, bukan file://.</div>`;
    }
    const host=document.querySelector('#lessonTasks');
    if(host) host.innerHTML=lesson.tasks.map((task,index)=>`
      <div class="task" id="task-${escapeHtml(task.id)}"><div class="task-row"><div class="task-icon">•</div><div><b>Task ${index+1}: ${escapeHtml(task.title)}</b><div>${escapeHtml(task.prompt)}</div><small>Kerjakan di playground. Status berubah otomatis.</small></div></div></div>`).join('');
  }

  function renderEditors(){
    const lesson = currentLesson();
    const saved = codeFor(lesson.id);

    const defaultHtml = lesson.lang === "CSS"
      ? `<div class="card"><h2>${escapeHtml(lesson.title)}</h2><p>Ubah CSS untuk melihat hasilnya.</p></div>`
      : lesson.lang === "JavaScript"
        ? `<h2 id="output">${escapeHtml(lesson.title)}</h2><button id="demoButton">Klik saya</button>`
        : lesson.starter;

    $("#htmlEditor").value = saved.html != null ? saved.html : defaultHtml;
    $("#cssEditor").value = saved.css != null ? saved.css : lesson.lang === "CSS" ? lesson.starter : "";
    $("#jsEditor").value = saved.js != null ? saved.js : lesson.lang === "JavaScript" ? lesson.starter : "";

    const initialTab = lesson.lang === "HTML" ? "html" : lesson.lang === "CSS" ? "css" : "js";
    document.querySelectorAll(".editor-tab").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.editor === initialTab);
    });
    ["html","css","js"].forEach((name) => {
      document.getElementById(name+"Editor").classList.toggle("hidden", name !== initialTab);
    });

    run(false);
  }

  function saveEditors(){
    const lesson = currentLesson();
    state.code[lessonKey(lesson.id)] = {
      html:$("#htmlEditor").value,
      css:$("#cssEditor").value,
      js:$("#jsEditor").value
    };
    saveState();
    $("#autosave").textContent = "Auto saved";
  }

  function renderTaskPanel(){
    const lesson = currentLesson();
    if(!lesson) return;
    const host = $("#tasks");
    host.innerHTML = lesson.tasks.map((task,index) => {
      const pass = taskPassed(task);
      return `
        <div class="pg-task ${pass ? "done" : ""}">
          <b>${pass ? "✓" : "•"} Task ${index+1}: ${escapeHtml(task.title)}</b>
          <small>${pass ? "Selesai" : "Belum selesai"}</small>
        </div>
      `;
    }).join("");
  }

  function updateTaskChecks(){
    const lesson = currentLesson();
    if(!lesson) return;

    const results = allTaskResults(lesson);
    results.forEach((pass,index) => {
      const task = lesson.tasks[index];
      const el = document.querySelector(`#task-${CSS.escape(task.id)}`);
      if(el){
        el.classList.toggle("done",pass);
        el.querySelector(".task-icon").textContent = pass ? "✓" : "•";
      }
    });

    markLessonCompleteIfNeeded(lesson);
    renderTaskPanel();
    renderNavigation();
    const progress = courseProgress();
    $("#progressBar").style.width = progress.pct + "%";
    $("#progressText").textContent = `${progress.pct}% (${progress.done}/${progress.total} lesson selesai)`;
  }

  function run(shouldSave=true){
    if(shouldSave) saveEditors();

    const html = $("#htmlEditor").value;
    const css = $("#cssEditor").value;
    const js = $("#jsEditor").value.replaceAll("</script>","<\\/script>");
    $("#preview").srcdoc =
      `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head>` +
      `<body>${html}<script>${js}<\/script></body></html>`;

    updateTaskChecks();
  }

  function resetLesson(){
    const lesson = currentLesson();
    delete state.code[lessonKey(lesson.id)];
    saveState();
    renderEditors();
    updateTaskChecks();
  }

  function exportProgress(){
    const blob = new Blob([JSON.stringify(state,null,2)], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "webcode-progress.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function importProgress(file){
    const reader = new FileReader();
    reader.onload = () => {
      try{
        const imported = JSON.parse(reader.result);
        if(!imported || typeof imported !== "object") throw new Error("Format tidak valid");
        state = Object.assign({}, defaultState, imported);
        saveState();
        render();
      }catch(err){
        alert("File progress tidak valid.");
      }
    };
    reader.readAsText(file);
  }

  function escapeHtml(s){
    return String(s)
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;");
  }

  function setupEditors(){
    ["htmlEditor","cssEditor","jsEditor"].forEach((id) => {
      const editor = document.getElementById(id);

      editor.addEventListener("input", () => {
        saveEditors();
        updateTaskChecks();
      });

      editor.addEventListener("keydown", (event) => {
        if((event.ctrlKey || event.metaKey) && event.key === "Enter"){
          event.preventDefault();
          run();
        }

        if(event.key === "Tab"){
          event.preventDefault();
          const start = editor.selectionStart;
          const end = editor.selectionEnd;
          editor.value = editor.value.slice(0,start) + "  " + editor.value.slice(end);
          editor.selectionStart = editor.selectionEnd = start + 2;
          saveEditors();
          updateTaskChecks();
        }
      });
    });
  }

  function setupTabs(){
    document.querySelectorAll(".editor-tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".editor-tab").forEach((x) => x.classList.remove("active"));
        btn.classList.add("active");

        ["html","css","js"].forEach((name) => {
          document.getElementById(name+"Editor").classList.toggle(
            "hidden",
            name !== btn.dataset.editor
          );
        });
      });
    });
  }

  function setupCourses(){
    document.querySelectorAll(".course").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".course").forEach((x) => x.classList.remove("active"));
        btn.classList.add("active");
        state.course = btn.dataset.course;
        state.lessonIndex = 0;
        saveState();
        render();
      });
    });
  }

  async function render(){
    document.querySelectorAll(".course").forEach((btn) => {
      btn.classList.toggle("active",btn.dataset.course === state.course);
    });
    renderNavigation();
    await renderLesson();
    renderEditors();
  }

  function updateCompactMode(){
    document.body.classList.toggle("compact-view", window.innerWidth <= 1050);
  }

  $("#runBtn").addEventListener("click",() => run());
  $("#resetBtn").addEventListener("click",resetLesson);
  $("#exportBtn").addEventListener("click",exportProgress);
  $("#importBtn").addEventListener("click",() => $("#importFile").click());
  $("#importFile").addEventListener("change",(e) => {
    const file = e.target.files && e.target.files[0];
    if(file) importProgress(file);
    e.target.value = "";
  });

  setupCourses();
  setupEditors();
  setupTabs();
  updateCompactMode();
  render();
  window.addEventListener("resize", updateCompactMode);
})();
