(function(){
  "use strict";

  const LESSONS = window.WEBCODE_LESSONS || [];
  const STORAGE_KEY = "webcode_github_pages_v1";
  const defaultState = {course:"html", lessonIndex:0, completed:{}, code:{}};
  let state = loadState();
  const materialCache = new Map();

  const $ = (s, root=document) => root.querySelector(s);

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
    return LESSONS.filter(x => x.course === state.course);
  }

  function currentLesson(){
    const list=courseLessons();
    return list[state.lessonIndex] || list[0];
  }

  function lessonKey(id){
    return String(id);
  }

  function escapeHtml(value){
    return String(value ?? "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;");
  }

  function safeRegex(pattern){
    try{return new RegExp(pattern,"i");}catch{return null;}
  }

  function taskCode(taskId){
    const lesson=currentLesson();
    const saved=state.code[lessonKey(lesson.id)] || {};
    if(saved[taskId]) return saved[taskId];

    const first=lesson.lang==="HTML" ? lesson.starter : "";
    const css=lesson.lang==="CSS" ? lesson.starter : "";
    const js=lesson.lang==="JavaScript" ? lesson.starter : "";

    return {html:first,css,js};
  }

  function taskText(taskId){
    const c=taskCode(taskId);
    return `${c.html}\n${c.css}\n${c.js}`;
  }

  function taskPassed(task){
    const re=safeRegex(task.pattern);
    return !!re && re.test(taskText(task.id));
  }

  function allTaskResults(lesson){
    return lesson.tasks.map(taskPassed);
  }

  function courseProgress(){
    const lessons=courseLessons();
    const done=lessons.filter(l=>state.completed[lessonKey(l.id)]).length;
    return {
      done,
      total:lessons.length,
      pct:lessons.length ? Math.round(done/lessons.length*100) : 0
    };
  }

  function markLessonCompleteIfNeeded(lesson){
    const results=allTaskResults(lesson);
    if(results.length && results.every(Boolean)){
      state.completed[lessonKey(lesson.id)]=true;
      saveState();
    }
  }

  function renderNavigation(){
    const nav=$("#lessonNav");
    const groups={};
    courseLessons().forEach((lesson,index)=>{
      (groups[lesson.section] ||= []).push([lesson,index]);
    });

    nav.innerHTML=Object.entries(groups).map(([section,items])=>`
      <div class="section-title">${escapeHtml(section)}</div>
      ${items.map(([lesson,index])=>`
        <button class="lesson-nav ${index===state.lessonIndex?"active":""}" data-index="${index}">
          ${state.completed[lessonKey(lesson.id)]?"✓ ":""}${index+1}. ${escapeHtml(lesson.title)}
        </button>
      `).join("")}
    `).join("");

    nav.querySelectorAll(".lesson-nav").forEach(btn=>{
      btn.addEventListener("click",()=>{
        state.lessonIndex=Number(btn.dataset.index);
        saveState();
        render();
        window.scrollTo({top:0,behavior:"smooth"});
      });
    });
  }

  function buildMaterialFallback(lesson){
    const intro={
      HTML:"HTML adalah bahasa yang digunakan untuk menyusun struktur halaman web menggunakan elemen dan atribut.",
      CSS:"CSS digunakan untuk mengatur tampilan halaman web, seperti warna, ukuran, jarak, posisi, dan layout.",
      JavaScript:"JavaScript digunakan untuk membuat halaman web menjadi interaktif dan dapat melakukan logika."
    }[lesson.lang];

    return `${intro} Fokus pada materi "${lesson.title}". Pelajari contoh, perhatikan bagian-bagian kode, kemudian praktikkan pada tugas.`;
  }

  async function loadMaterial(lesson){
    const target=$("#materialBody");
    if(!target) return;

    try{
      let fragment=materialCache.get(lesson.id);
      if(!fragment && lesson.contentPath){
        const response=await fetch(lesson.contentPath);
        if(!response.ok) throw new Error("HTTP "+response.status);
        fragment=await response.text();
        materialCache.set(lesson.id,fragment);
      }

      if(fragment){
        target.innerHTML=fragment;
      }else{
        target.innerHTML=`<div class="box"><p>${escapeHtml(buildMaterialFallback(lesson))}</p></div>`;
      }
    }catch(error){
      target.innerHTML=`
        <div class="box note">
          <b>Materi tidak dapat dimuat.</b><br>
          ${escapeHtml(error.message)}
        </div>`;
    }
  }

  function renderLesson(){
    const lesson=currentLesson();
    if(!lesson) return;

    const progress=courseProgress();
    $("#courseName").textContent=lesson.lang;
    $("#progressBar").style.width=progress.pct+"%";
    $("#progressText").textContent=`${progress.pct}% (${progress.done}/${progress.total} lesson selesai)`;

    $("#lessonContent").innerHTML=`
      <div class="lesson-shell">
        <div class="crumb">${escapeHtml(lesson.lang)} › ${escapeHtml(lesson.section)}</div>

        <h1>${escapeHtml(lesson.title)}</h1>
        <p class="lead">${escapeHtml(lesson.summary)}</p>

        <div class="box info">
          <b>🎓 Tujuan belajar</b>
          <ul>${lesson.objectives.map(x=>`<li>${escapeHtml(x)}</li>`).join("")}</ul>
        </div>

        <div id="materialBody">
          <div class="box note">Memuat materi...</div>
        </div>

        <h2 id="training">Latihan</h2>
        <div class="box note">
          Setiap tugas memiliki playground sendiri. Buka playground hanya pada tugas yang sedang kamu kerjakan supaya halaman materi tetap luas dan mudah dibaca.
        </div>

        <div id="lessonTasks"></div>

        <div class="lesson-footer">
          <button id="prevLesson" ${state.lessonIndex<=0?"disabled":""}>← Materi Sebelumnya</button>
          <button id="nextLesson" class="next" ${state.lessonIndex>=courseLessons().length-1?"disabled":""}>Materi Berikutnya →</button>
        </div>
      </div>
    `;

    const host=$("#lessonTasks");
    host.innerHTML=lesson.tasks.map((task,index)=>{
      const pass=taskPassed(task);
      return `
        <div class="task ${pass?"done":""}" id="task-${escapeHtml(task.id)}">
          <div class="task-row">
            <div class="task-icon">${pass?"✓":"•"}</div>
            <div style="flex:1;min-width:0">
              <b>Task ${index+1}: ${escapeHtml(task.title)}</b>
              <div>${escapeHtml(task.prompt)}</div>
              <small>${pass?"✅ Tugas selesai":"Baca instruksi, lalu buka playground untuk mengerjakan."}</small>

              <div class="task-tools">
                <button class="open-task-playground primary" data-task="${escapeHtml(task.id)}">
                  🎮 Buka Playground
                </button>
              </div>

              <div class="inline-playground hidden-playground" id="pg-${escapeHtml(task.id)}">
                <div class="pg-head">
                  <strong>🎮 Playground Task ${index+1}</strong>
                  <div class="pg-actions">
                    <button class="inline-reset" data-task="${escapeHtml(task.id)}">Reset</button>
                    <button class="pg-run" data-task="${escapeHtml(task.id)}">Jalankan ▶</button>
                  </div>
                </div>

                <div class="inline-editors">
                  <button class="inline-tab active" data-task="${escapeHtml(task.id)}" data-editor="html">HTML</button>
                  <button class="inline-tab" data-task="${escapeHtml(task.id)}" data-editor="css">CSS</button>
                  <button class="inline-tab" data-task="${escapeHtml(task.id)}" data-editor="js">JS</button>
                </div>

                <textarea class="inline-editor active" data-task="${escapeHtml(task.id)}" data-editor="html" spellcheck="false"></textarea>
                <textarea class="inline-editor" data-task="${escapeHtml(task.id)}" data-editor="css" spellcheck="false"></textarea>
                <textarea class="inline-editor" data-task="${escapeHtml(task.id)}" data-editor="js" spellcheck="false"></textarea>

                <div class="inline-controls">
                  <span>Ctrl+Enter = Run · Tab = indent</span>
                  <span class="autosave-inline">Auto saved</span>
                </div>

                <div class="inline-result-title">Hasil</div>
                <iframe class="inline-preview" data-task="${escapeHtml(task.id)}" sandbox="allow-scripts allow-forms"></iframe>
                <div class="task-status ${pass?"pass":"fail"}" data-status="${escapeHtml(task.id)}">
                  ${pass?"✅ Task selesai":"○ Task belum selesai"}
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join("");

    bindTaskPlaygrounds();
    bindLessonNavigation();

    loadMaterial(lesson);
  }

  function bindLessonNavigation(){
    const prev=$("#prevLesson");
    const next=$("#nextLesson");

    if(prev){
      prev.addEventListener("click",()=>{
        if(state.lessonIndex>0){
          state.lessonIndex--;
          saveState();
          render();
          window.scrollTo({top:0,behavior:"smooth"});
        }
      });
    }

    if(next){
      next.addEventListener("click",()=>{
        if(state.lessonIndex<courseLessons().length-1){
          state.lessonIndex++;
          saveState();
          render();
          window.scrollTo({top:0,behavior:"smooth"});
        }
      });
    }
  }

  function saveTaskCode(taskId,code){
    const lesson=currentLesson();
    const bucket=state.code[lessonKey(lesson.id)] || {};
    bucket[taskId]=code;
    state.code[lessonKey(lesson.id)]=bucket;
    saveState();
  }

  function getEditors(root){
    return {
      html:root.querySelector('[data-editor="html"]'),
      css:root.querySelector('[data-editor="css"]'),
      js:root.querySelector('[data-editor="js"]')
    };
  }

  function fillTaskEditors(root,taskId){
    const code=taskCode(taskId);
    const editors=getEditors(root);
    editors.html.value=code.html||"";
    editors.css.value=code.css||"";
    editors.js.value=code.js||"";
    runTask(taskId,false);
  }

  function runTask(taskId,shouldSave=true){
    const root=document.querySelector(`#pg-${CSS.escape(taskId)}`);
    if(!root) return;

    const editors=getEditors(root);
    const code={
      html:editors.html.value,
      css:editors.css.value,
      js:editors.js.value
    };

    if(shouldSave){
      saveTaskCode(taskId,code);
    }

    const js=code.js.replaceAll("</script>","<\\/script>");
    root.querySelector(".inline-preview").srcdoc=
      `<!doctype html><html><head><meta charset="utf-8"><style>${code.css}</style></head>`+
      `<body>${code.html}<script>${js}<\/script></body></html>`;

    updateTaskChecks();
  }

  function resetTask(taskId){
    const lesson=currentLesson();
    const bucket=state.code[lessonKey(lesson.id)] || {};
    delete bucket[taskId];
    state.code[lessonKey(lesson.id)]=bucket;
    saveState();

    const root=document.querySelector(`#pg-${CSS.escape(taskId)}`);
    if(root) fillTaskEditors(root,taskId);
    updateTaskChecks();
  }

  function bindTaskPlaygrounds(){
    document.querySelectorAll(".open-task-playground").forEach(btn=>{
      btn.addEventListener("click",()=>{
        const taskId=btn.dataset.task;
        const root=document.querySelector(`#pg-${CSS.escape(taskId)}`);
        const opening=root.classList.toggle("hidden-playground");
        btn.textContent=opening?"🎮 Buka Playground":"✕ Tutup Playground";

        if(!opening){
          fillTaskEditors(root,taskId);
          setTimeout(()=>root.scrollIntoView({behavior:"smooth",block:"nearest"}),30);
        }
      });
    });

    document.querySelectorAll(".pg-run").forEach(btn=>{
      btn.addEventListener("click",()=>runTask(btn.dataset.task));
    });

    document.querySelectorAll(".inline-reset").forEach(btn=>{
      btn.addEventListener("click",()=>resetTask(btn.dataset.task));
    });

    document.querySelectorAll(".inline-tab").forEach(btn=>{
      btn.addEventListener("click",()=>{
        const root=document.querySelector(`#pg-${CSS.escape(btn.dataset.task)}`);
        root.querySelectorAll(".inline-tab").forEach(x=>x.classList.toggle("active",x===btn));
        root.querySelectorAll(".inline-editor").forEach(x=>x.classList.toggle("active",x.dataset.editor===btn.dataset.editor));
      });
    });

    document.querySelectorAll(".inline-editor").forEach(editor=>{
      editor.addEventListener("input",()=>{
        const root=document.querySelector(`#pg-${CSS.escape(editor.dataset.task)}`);
        const editors=getEditors(root);
        saveTaskCode(editor.dataset.task,{
          html:editors.html.value,
          css:editors.css.value,
          js:editors.js.value
        });
        updateTaskChecks();
      });

      editor.addEventListener("keydown",event=>{
        if((event.ctrlKey||event.metaKey)&&event.key==="Enter"){
          event.preventDefault();
          runTask(editor.dataset.task);
        }

        if(event.key==="Tab"){
          event.preventDefault();
          const start=editor.selectionStart;
          const end=editor.selectionEnd;
          editor.value=editor.value.slice(0,start)+"  "+editor.value.slice(end);
          editor.selectionStart=editor.selectionEnd=start+2;

          const root=document.querySelector(`#pg-${CSS.escape(editor.dataset.task)}`);
          const editors=getEditors(root);
          saveTaskCode(editor.dataset.task,{
            html:editors.html.value,
            css:editors.css.value,
            js:editors.js.value
          });
          updateTaskChecks();
        }
      });
    });
  }

  function updateTaskChecks(){
    const lesson=currentLesson();
    if(!lesson) return;

    const results=allTaskResults(lesson);

    results.forEach((pass,index)=>{
      const task=lesson.tasks[index];
      const el=document.querySelector(`#task-${CSS.escape(task.id)}`);
      if(!el) return;

      el.classList.toggle("done",pass);
      el.querySelector(".task-icon").textContent=pass?"✓":"•";

      const small=el.querySelector("small");
      if(small) small.textContent=pass?"✅ Tugas selesai":"Baca instruksi, lalu buka playground untuk mengerjakan.";

      const status=el.querySelector(`[data-status="${CSS.escape(task.id)}"]`);
      if(status){
        status.className=`task-status ${pass?"pass":"fail"}`;
        status.textContent=pass?"✅ Task selesai":"○ Task belum selesai";
      }
    });

    markLessonCompleteIfNeeded(lesson);
    renderNavigation();

    const progress=courseProgress();
    $("#progressBar").style.width=progress.pct+"%";
    $("#progressText").textContent=`${progress.pct}% (${progress.done}/${progress.total} lesson selesai)`;
  }

  function exportProgress(){
    const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;
    a.download="webcode-progress.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function importProgress(file){
    const reader=new FileReader();
    reader.onload=()=>{
      try{
        const imported=JSON.parse(reader.result);
        if(!imported || typeof imported!=="object") throw new Error("Format tidak valid");
        state=Object.assign({},defaultState,imported);
        saveState();
        render();
      }catch{
        alert("File progress tidak valid.");
      }
    };
    reader.readAsText(file);
  }

  function setupCourses(){
    document.querySelectorAll(".course").forEach(btn=>{
      btn.addEventListener("click",()=>{
        document.querySelectorAll(".course").forEach(x=>x.classList.remove("active"));
        btn.classList.add("active");
        state.course=btn.dataset.course;
        state.lessonIndex=0;
        saveState();
        render();
        window.scrollTo({top:0,behavior:"smooth"});
      });
    });
  }

  async function render(){
    document.querySelectorAll(".course").forEach(btn=>{
      btn.classList.toggle("active",btn.dataset.course===state.course);
    });
    renderNavigation();
    renderLesson();
  }

  $("#exportBtn").addEventListener("click",exportProgress);
  $("#importBtn").addEventListener("click",()=>$("#importFile").click());
  $("#importFile").addEventListener("change",event=>{
    const file=event.target.files && event.target.files[0];
    if(file) importProgress(file);
    event.target.value="";
  });

  setupCourses();
  render();
})();
