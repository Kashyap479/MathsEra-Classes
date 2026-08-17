const EXAMS=[
  ["Board Exams","🏫"],["JEE","🎯"],["NEET","🧬"],["NDA","📕"],["CUET","🎓"],["TET","📚"],["NET","📐"],["Other Competitive","🏆"],["School / General","📚"]
];
const MATERIAL_SECTIONS=[
  ["📘","Syllabus"],["📊","Exam Pattern"],["📝","PYQs"],["✅","PYQ Solutions"],
  ["🧮","Exercise Solutions"],["📚","Notes"],["🎯","Important Questions"],["📄","Practice Sets"],
  ["🧾","Sample Papers"],["🔢","Chapter-wise Questions"],["📈","Previous Year Analysis"],
  ["🧠","Formula Sheet"],["📖","Study Material"],["📂","Other Resources"]
];
const examGrid=document.getElementById("examGrid"),results=document.getElementById("results"),publishedCount=document.getElementById("publishedCount"),resultCount=document.getElementById("resultCount");
const examModal=document.getElementById("examModal"),modalTitle=document.getElementById("modalTitle"),modalCount=document.getElementById("modalCount"),modalResources=document.getElementById("modalResources");
let client=null,allResources=[];

function esc(v){return String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;")}
function clean(v){return String(v??"").trim().replace(/\s+/g," ")}
function lower(v){return clean(v).toLowerCase()}
function parseMeta(r){
  let b={};
  try{const x=JSON.parse(r?.body||""); if(x&&typeof x==="object") b=x}catch(e){}
  const t=(b.taxonomy&&typeof b.taxonomy==="object")?b.taxonomy:b;
  return {rawBody:b,
    category:clean(t.examCategory||r?.exam_category||r?.category),
    examName:clean(t.examName||r?.exam_name||b.examName),
    classLevel:clean(t.classLevel||r?.class_level||r?.class_name||r?.level),
    board:clean(t.board||r?.board_exam_body||r?.board||r?.exam_body),
    subject:clean(t.subject||r?.subject_category||r?.subject),
    publication:clean(r?.publication||t.publication||b.publication||r?.book_source||r?.book),
    chapter:clean(t.chapter||r?.chapter_topic||r?.chapter||r?.topic),
    exercise:clean(t.exercise||r?.exercise),
    questionNumber:clean(t.questionNumber||r?.question_number),
    materialType:clean(t.materialType||r?.material_type||r?.content_type||r?.type),
    year:clean(t.year||b.examYear||r?.year||r?.exam_year),
    language:clean(t.language||r?.language||b.language),
    explanation:clean((b.mathsEraResourceVersion||b.mathsEraGallery||Object.prototype.hasOwnProperty.call(b,"explanation"))?b.explanation:(r?.description||r?.body))
  };
}
function normalizeCategory(v){
  const x=lower(v); const hit=EXAMS.find(([name])=>lower(name)===x); return hit?hit[0]:"School / General";
}
function normalizeMaterialType(v){
  const x=lower(v).replace(/[_-]+/g," ").replace(/\s+/g," ");
  const aliases={
    "solution":"Exercise Solutions","solutions":"Exercise Solutions","exercise solution":"Exercise Solutions","exercise solutions":"Exercise Solutions","ncert solution":"Exercise Solutions","ncert solutions":"Exercise Solutions","chapter solution":"Exercise Solutions",
    "pyq solution":"PYQ Solutions","pyq solutions":"PYQ Solutions","previous year solution":"PYQ Solutions",
    "pyq":"PYQs","practice set":"Practice Sets","practice sets":"Practice Sets","sample paper":"Sample Papers","sample papers":"Sample Papers",
    "important question":"Important Questions","important questions":"Important Questions","chapter wise questions":"Chapter-wise Questions","chapter-wise questions":"Chapter-wise Questions"
  };
  return aliases[x]||MATERIAL_SECTIONS.find(([,name])=>lower(name)===x)?.[1]||clean(v)||"Other Resources";
}
function inferPublication(r,m){
  if(m.publication) return m.publication;
  const hay=lower([r?.title,m?.chapter,m?.exercise,m?.explanation].filter(Boolean).join(" "));
  if(/ncert\s+exemplar|exemplar/.test(hay)) return "NCERT Exemplar";
  if(/\bncert\b/.test(hay)) return "NCERT";
  if(/rd\.?\s*sharma/.test(hay)) return "RD Sharma";
  if(/r\.?s\.?\s*aggarwal/.test(hay)) return "R.S. Aggarwal";
  return "";
}
function normalizeResource(r){
  const m=parseMeta(r);
  m.publication=inferPublication(r,m);
  m.category=normalizeCategory(m.category);

  /*
   * Canonical exam identity:
   * For Board Exams, the exam/body is the board itself (CBSE, UP, ICSE, ...).
   * Class is a separate filter. Older records sometimes stored "CBSE Class 11"
   * or omitted examName entirely; treating those as different exam values made
   * one record match while other records disappeared from the same filter.
   * Always normalize Board Exams to the board name so legacy and new records
   * behave identically.
   */
  if(m.category==="Board Exams"){
    if(m.board) m.examName=m.board;
    else if(!m.examName) m.examName="Board Exams";
  }else if(!m.examName){
    m.examName=m.category==="School / General" ? "School / General" : m.category;
  }

  m.materialType=normalizeMaterialType(m.materialType);
  m.images=[];
  if(Array.isArray(m.rawBody?.images)) m.images=m.rawBody.images.filter(Boolean);
  if(!m.images.length && r?.image_url) m.images=[r.image_url];
  m.pdf=m.rawBody?.pdf||r?.pdf_url||"";
  return m;
}
function model(r){return {...r,...normalizeResource(r)}}
function identityKey(r){
  const m=model(r); return [m.category,m.examName,m.board,m.classLevel].map(lower).join("|");
}
function identityLabel(r){
  const m=model(r), parts=[];
  if(m.examName && lower(m.examName)!==lower(m.category)) parts.push(m.examName);
  if(m.board && !lower(m.examName).includes(lower(m.board))) parts.push(m.board);
  if(m.classLevel && !lower(m.examName).includes(`class ${lower(m.classLevel)}`)) parts.push(`Class ${m.classLevel}`);
  return parts.join(" • ")||m.examName||m.category;
}
function title(r){return clean(r?.title)||"MathsEra Resource"}
function subject(r){return model(r).subject}
function publication(r){return model(r).publication||""}
function chapter(r){return model(r).chapter}
function materialType(r){return model(r).materialType}
function classLevel(r){return model(r).classLevel}
function board(r){return model(r).board}
function year(r){return model(r).year}
function examCategory(r){return model(r).category}
function examName(r){return model(r).examName}
function body(r){return model(r).explanation}
function image(r){const m=model(r);return m.images[0]||""}
function searchableText(r){const m=model(r);return [title(r),m.category,m.examName,m.board,m.classLevel,m.subject,m.publication,m.chapter,m.exercise,m.questionNumber,m.materialType,m.year,m.language,m.explanation].join(" ").toLowerCase()}

function fillSelect(id,values){
  const s=document.getElementById(id);if(!s)return;const first=s.options[0]?.textContent||"";s.innerHTML="";
  const base=document.createElement("option");base.value="";base.textContent=first;s.appendChild(base);
  [...new Set(values.map(clean).filter(Boolean))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})).forEach(v=>{const o=document.createElement("option");o.value=v;o.textContent=v;s.appendChild(o)})
}
function resourcesForExam(name){const key=lower(name);return allResources.filter(r=>lower(examCategory(r))===key)}
function renderExamCards(){
  examGrid.innerHTML=EXAMS.map(([name,icon])=>{const n=resourcesForExam(name).length;return `<button class="exam-card" data-exam="${esc(name)}"><div class="exam-icon">${icon}</div><div class="exam-name">${esc(name)}</div><div class="exam-count">${n} ${n===1?"material":"materials"}</div></button>`}).join("");
  document.querySelectorAll(".exam-card").forEach(card=>card.addEventListener("click",()=>openExam(card.dataset.exam)));
  publishedCount.textContent=`${allResources.length} published ${allResources.length===1?"material":"materials"}`;
}
function resourceCard(r){
  const m=model(r),img=image(r);
  const target=["Exercise Solutions","PYQ Solutions"].includes(m.materialType)?"solution.html":"resource.html";
  return `<a class="resource" href="${target}?id=${encodeURIComponent(r.id)}" aria-label="Open ${esc(title(r))}">${img?`<img src="${esc(img)}" alt="${esc(title(r))}" loading="lazy">`:``}<div class="resource-body"><div class="resource-type">${esc(m.materialType)}</div><h3>${esc(title(r))}</h3><div class="tags">${[m.category,m.examName,m.classLevel?`Class ${m.classLevel}`:"",m.board,m.subject,m.publication,m.chapter,m.year].filter(Boolean).map(x=>`<span class="tag">${esc(x)}</span>`).join("")}</div>${m.explanation?`<p>${esc(m.explanation.slice(0,220))}${m.explanation.length>220?"...":""}</p>`:""}</div></a>`;
}
function renderResults(rows=allResources){resultCount.textContent=`${rows.length} ${rows.length===1?"resource":"resources"}`;results.innerHTML=rows.length?rows.map(resourceCard).join(""):`<div class="empty"><div style="font-size:38px">🔎</div><h3>No content found</h3><p>Try another filter or search.</p></div>`}
function filtered(){
  const q=lower(document.getElementById("globalSearch").value),category=lower(document.getElementById("categoryFilter").value),exam=lower(document.getElementById("examFilter").value),b=lower(document.getElementById("boardFilter").value),c=lower(document.getElementById("classFilter").value),s=lower(document.getElementById("subjectFilter").value),p=lower(document.getElementById("publicationFilter").value),t=lower(document.getElementById("typeFilter").value),y=lower(document.getElementById("yearFilter").value),ch=lower(document.getElementById("chapterFilter").value);
  const same=(a,b)=>lower(a)===lower(b);
  return allResources.filter(r=>{
    const m=model(r);
    return (!q||searchableText(r).includes(q))
      &&(!category||same(m.category,category))
      &&(!exam||same(m.examName,exam))
      &&(!b||same(m.board,b))
      &&(!c||same(m.classLevel,c))
      &&(!s||same(m.subject,s))
      &&(!p||same(m.publication,p))
      &&(!t||same(m.materialType,t))
      &&(!y||same(m.year,y))
      &&(!ch||same(m.chapter,ch));
  });
}
function groupLibraries(rows){
  const map=new Map();rows.forEach(r=>{const k=identityKey(r);if(!map.has(k))map.set(k,[]);map.get(k).push(r)});return [...map.values()].sort((a,b)=>identityLabel(a[0]).localeCompare(identityLabel(b[0]),undefined,{numeric:true}))
}
function libraryGroupCard(rows){
  const first=model(rows[0]), label=identityLabel(rows[0]), subjects=[...new Set(rows.map(r=>model(r).subject).filter(Boolean))];
  return `<button class="library-group" data-key="${esc(identityKey(rows[0]))}"><div class="library-group-main"><b>${esc(label)}</b><small>${esc(first.category)}${first.board?` • ${esc(first.board)}`:""}${first.classLevel?` • Class ${esc(first.classLevel)}`:""}</small>${subjects.length?`<span>${esc(subjects.slice(0,3).join(" • "))}${subjects.length>3?" • ...":""}</span>`:""}</div><strong>${rows.length}</strong></button>`
}
function publicationRequired(r){
  const t=materialType(r);
  return ["Exercise Solutions"].includes(t);
}
function materialIcon(type){
  return (MATERIAL_SECTIONS.find(([icon,name])=>name===type)||["📘"])[0];
}
function activeTypes(rows){
  return [...new Set(rows.map(materialType))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
}
function backButton(){return `<button type="button" class="library-back" id="libraryBack">← Back</button>`}
function bindBack(){
  const btn=document.getElementById("libraryBack");
  if(btn) btn.addEventListener("click",()=>history.back());
}
function stateParams(state){
  const p=new URLSearchParams();
  p.set("library",state.level);
  if(state.exam)p.set("exam",state.exam);
  if(state.group)p.set("group",state.group);
  if(state.subject)p.set("subject",state.subject);
  if(state.publication)p.set("publication",state.publication);
  if(state.type)p.set("type",state.type);
  return p.toString();
}
function navigateLibrary(state,replace=false){
  const hash="#"+stateParams(state);
  const url=location.pathname+location.search+hash;
  if(replace) history.replaceState(state,"",url); else history.pushState(state,"",url);
  renderLibraryState(state);
}
function clearLibraryState(replace=false){
  const url=location.pathname+location.search;
  if(replace) history.replaceState({},"",url); else history.pushState({},"",url);
  closeExam(false);
}
function readLibraryState(){
  const raw=location.hash.replace(/^#/,'');
  if(!raw)return null;
  const p=new URLSearchParams(raw);
  const level=p.get("library");
  if(!["exam","group","subject","publication","type"].includes(level))return null;
  return {level,exam:p.get("exam")||"",group:p.get("group")||"",subject:p.get("subject")||"",publication:p.get("publication")||"",type:p.get("type")||""};
}
function openExam(name){navigateLibrary({level:"exam",exam:name})}
function closeExam(updateHistory=true){
  if(updateHistory){
    if(history.state?.library) history.back();
    else {history.replaceState({},"",location.pathname+location.search); closeExam(false)}
    return;
  }
  if(examModal){examModal.classList.remove("open");examModal.setAttribute("aria-hidden","true")}
  document.body.style.overflow="";
}
function groupFromKey(key){
  const groups=groupLibraries(allResources);
  return groups.find(g=>identityKey(g[0])===key)||null;
}
function renderMaterialTypeLibrary(rows,label,type,backState,fromState){
  const list=rows.filter(r=>materialType(r)===type);
  modalTitle.textContent=label; modalCount.textContent=list.length;
  const byChapter={};
  list.forEach(r=>{const m=model(r);const key=m.chapter||m.exercise||"General";(byChapter[key] ||= []).push(r)});
  const groups=Object.entries(byChapter).sort((a,b)=>a[0].localeCompare(b[0],undefined,{numeric:true}));
  const isSolution=["Exercise Solutions","PYQ Solutions"].includes(type);
  modalResources.innerHTML=`<div class="modal-library-head library-breadcrumb">${backButton()}<div><div class="crumb-label">${esc(label)}</div><p>${esc(type)} में उपलब्ध content चुनें.</p></div></div>${groups.map(([key,items])=>`<section class="category-block"><div class="category-title"><span>${materialIcon(type)}</span><b>${esc(key)}</b><small>${items.length}</small></div><div class="category-items">${items.sort((a,b)=>title(a).localeCompare(title(b),undefined,{numeric:true})).map(r=>`<a class="mini resource-link" href="${isSolution?"solution.html":"resource.html"}?id=${encodeURIComponent(r.id)}"><b>${esc(title(r))}</b><br><small>${esc(model(r).subject||"")}${model(r).exercise?` • ${esc(model(r).exercise)}`:""}${model(r).questionNumber?` • ${esc(model(r).questionNumber)}`:""}${model(r).year?` • ${esc(model(r).year)}`:""}</small></a>`).join("")}</div></section>`).join("")||`<div class="library-empty"><div class="empty-icon">📚</div><h3>No content available</h3></div>`}`;
  bindBack();
}
function renderPublicationLibrary(subjectRows,label,pub,state){
  const list=subjectRows.filter(r=>publicationRequired(r)&&publication(r)===pub);
  const types=activeTypes(list);
  modalTitle.textContent=label; modalCount.textContent=list.length;
  modalResources.innerHTML=`<div class="modal-library-head library-breadcrumb">${backButton()}<div><div class="crumb-label">${esc(pub)}</div><p>Book-specific content. Only sections that actually contain published material are shown.</p></div></div><div class="smart-card-grid">${types.map(type=>`<button type="button" class="smart-card" data-type="${esc(type)}"><span>${materialIcon(type)}</span><b>${esc(type)}</b><small>${list.filter(r=>materialType(r)===type).length} materials</small></button>`).join("")}</div>`;
  modalResources.querySelectorAll(".smart-card").forEach(btn=>btn.addEventListener("click",()=>navigateLibrary({...state,level:"type",type:btn.dataset.type})));
  bindBack();
}
function renderSubjectLibrary(rows,label,state){
  const subjects=[...new Set(rows.map(r=>model(r).subject||"General"))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
  if(subjects.length>1){
    modalTitle.textContent=label; modalCount.textContent=rows.length;
    modalResources.innerHTML=`<div class="modal-library-head library-breadcrumb">${backButton()}<div><div class="crumb-label">Subjects</div><p>Select a subject.</p></div></div><div class="smart-card-grid">${subjects.map(sub=>{const list=rows.filter(r=>(model(r).subject||"General")===sub);return `<button type="button" class="smart-card" data-subject="${esc(sub)}"><span>📘</span><b>${esc(sub)}</b><small>${list.length} materials</small></button>`}).join("")}</div>`;
    modalResources.querySelectorAll(".smart-card").forEach(btn=>btn.addEventListener("click",()=>navigateLibrary({...state,level:"subject",subject:btn.dataset.subject})));
    bindBack(); return;
  }
  const subject=subjects[0]||"General";
  const subjectRows=rows.filter(r=>(model(r).subject||"General")===subject);
  const pubRows=subjectRows.filter(r=>publicationRequired(r)&&publication(r));
  const generalRows=subjectRows.filter(r=>!publicationRequired(r));
  const pubs=[...new Set(pubRows.map(publication))].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
  const generalTypes=activeTypes(generalRows);
  modalTitle.textContent=label; modalCount.textContent=rows.length;
  let html=`<div class="modal-library-head library-breadcrumb">${backButton()}<div><div class="crumb-label">${esc(subject)}</div><p>Only published sections are shown. No empty/fake folders.</p></div></div>`;
  if(pubs.length){
    html+=`<section class="smart-section"><div class="smart-section-head"><div><b>📚 Publications / Books</b><small>Exercise solutions are grouped by book source.</small></div><span>${pubs.length}</span></div><div class="smart-card-grid">${pubs.map(pub=>{const list=pubRows.filter(r=>publication(r)===pub);return `<button type="button" class="smart-card" data-publication="${esc(pub)}"><span>📚</span><b>${esc(pub)}</b><small>${list.length} ${list.length===1?"material":"materials"}</small></button>`}).join("")}</div></section>`;
  }
  if(generalTypes.length){
    html+=`<section class="smart-section"><div class="smart-section-head"><div><b>📖 Study Materials</b><small>Notes, PYQs, practice sets and other general content.</small></div><span>${generalRows.length}</span></div><div class="smart-card-grid">${generalTypes.map(type=>`<button type="button" class="smart-card" data-type="${esc(type)}"><span>${materialIcon(type)}</span><b>${esc(type)}</b><small>${generalRows.filter(r=>materialType(r)===type).length} materials</small></button>`).join("")}</div></section>`;
  }
  if(!pubs.length&&!generalTypes.length)html+=`<div class="library-empty"><div class="empty-icon">📚</div><h3>No content available</h3><p>This library has no published material yet.</p></div>`;
  modalResources.innerHTML=html;
  modalResources.querySelectorAll(".smart-card[data-publication]").forEach(btn=>btn.addEventListener("click",()=>navigateLibrary({...state,level:"publication",publication:btn.dataset.publication})));
  modalResources.querySelectorAll(".smart-card[data-type]").forEach(btn=>btn.addEventListener("click",()=>navigateLibrary({...state,level:"type",type:btn.dataset.type,publication:""})));
  bindBack();
}
function renderGroupLevel(rows,state){
  const label=identityLabel(rows[0]);
  const subjects=[...new Set(rows.map(r=>model(r).subject||"General"))];
  if(subjects.length>1 && !state.subject){
    renderSubjectLibrary(rows,label,{...state,level:"group"}); return;
  }
  renderSubjectLibrary(rows,label,{...state,level:"group",subject:state.subject||subjects[0]||"General"});
}
function renderExamLevel(name,state){
  const rows=resourcesForExam(name), groups=groupLibraries(rows);
  modalTitle.textContent=name+" Library"; modalCount.textContent=rows.length;
  if(!rows.length){
    modalResources.innerHTML=`<div class="library-empty"><div class="empty-icon">📚</div><h3>No content available</h3><p>${esc(name)} के लिए अभी कोई material publish नहीं हुआ है.</p></div>`;
  }else if(groups.length===1){
    const g=groups[0];
    renderSubjectLibrary(g,identityLabel(g[0]),{...state,level:"group",group:identityKey(g[0])});
  }else{
    modalResources.innerHTML=`<div class="modal-library-head library-breadcrumb">${backButton()}<div><div class="crumb-label">${esc(name)}</div><p>Choose the exact class / board library.</p></div></div><div class="library-groups">${groups.map(libraryGroupCard).join("")}</div>`;
    modalResources.querySelectorAll(".library-group").forEach(btn=>btn.addEventListener("click",()=>navigateLibrary({level:"group",exam:name,group:btn.dataset.key})));
    bindBack();
  }
}
function renderLibraryState(state){
  examModal.classList.add("open");examModal.setAttribute("aria-hidden","false");document.body.style.overflow="hidden";
  if(state.level==="exam"){renderExamLevel(state.exam,state);return}
  const group=state.group?groupFromKey(state.group):null;
  if(!group){navigateLibrary({level:"exam",exam:state.exam},true);return}
  if(state.level==="group" && !state.subject){renderGroupLevel(group,state);return}
  const rows=group.filter(r=>(model(r).subject||"General")===(state.subject||model(group[0]).subject||"General"));
  const subjectLabel=`${identityLabel(group[0])} • ${state.subject||model(group[0]).subject||"General"}`;
  if(state.level==="publication"){
    renderPublicationLibrary(rows,subjectLabel,state.publication,state);return;
  }
  if(state.level==="type"){
    const typeRows=state.publication?rows.filter(r=>publicationRequired(r)&&publication(r)===state.publication):rows.filter(r=>!publicationRequired(r));
    renderMaterialTypeLibrary(typeRows,`${subjectLabel}${state.publication?` • ${state.publication}`:""} • ${state.type}`,state.type,state,state);return;
  }
  renderSubjectLibrary(rows,subjectLabel,state);
}
function setupFilters(){fillSelect("categoryFilter",allResources.map(examCategory));
fillSelect("examFilter",allResources.map(r=>{
  const m=model(r);
  return m.category==="Board Exams" ? m.board : m.examName;
}));
fillSelect("boardFilter",allResources.map(board));fillSelect("classFilter",allResources.map(classLevel));fillSelect("subjectFilter",allResources.map(subject));fillSelect("publicationFilter",allResources.map(publication).filter(Boolean));fillSelect("typeFilter",allResources.map(materialType));fillSelect("yearFilter",allResources.map(year));fillSelect("chapterFilter",allResources.map(chapter))}
function setupFilters(){fillSelect("categoryFilter",allResources.map(examCategory));
fillSelect("examFilter",allResources.map(r=>{
  const m=model(r);
  return m.category==="Board Exams" ? m.board : m.examName;
}));
fillSelect("boardFilter",allResources.map(board));fillSelect("classFilter",allResources.map(classLevel));fillSelect("subjectFilter",allResources.map(subject));fillSelect("publicationFilter",allResources.map(publication).filter(Boolean));fillSelect("typeFilter",allResources.map(materialType));fillSelect("yearFilter",allResources.map(year));fillSelect("chapterFilter",allResources.map(chapter))}
async function load(){
  const TIMEOUT_MS=8000;
  const CACHE_KEY="mathsera_library_snapshot_v8_canonical_exam";

  const setLoading=()=>{
    publishedCount.textContent="Connecting...";
    examGrid.innerHTML='<div class="empty"><h3>Connecting to MathsEra Library…</h3><p>Loading published exam libraries.</p></div>';
    results.innerHTML='<div class="empty"><h3>Loading published materials…</h3><p>Please wait a moment.</p></div>';
    resultCount.textContent="Connecting...";
  };

  const showError=(e)=>{
    console.error("MathsEra Library error:",e);
    const msg=String(e?.message||e||"Unknown error");
    publishedCount.textContent="Library unavailable";
    examGrid.innerHTML=`<div class="error">
      <h3>Library could not be loaded</h3>
      <p>${esc(msg)}</p>
      <p><b>Your published materials have not been deleted.</b></p>
      <button type="button" class="btn clear" onclick="location.reload()">RETRY</button>
    </div>`;
    results.innerHTML=`<div class="empty"><h3>Published materials are temporarily unavailable</h3><p>The page is working, but the database request did not complete.</p></div>`;
    resultCount.textContent="0 resources";
  };

  const saveSnapshot=()=>{
    try{
      if(allResources.length){
        localStorage.setItem(CACHE_KEY,JSON.stringify({
          savedAt:Date.now(),
          resources:allResources
        }));
      }
    }catch(_){}
  };

  const useSnapshot=()=>{
    try{
      const raw=localStorage.getItem(CACHE_KEY);
      if(!raw)return false;
      const snap=JSON.parse(raw);
      if(!Array.isArray(snap?.resources)||!snap.resources.length)return false;
      allResources=snap.resources;
      return true;
    }catch(_){return false}
  };

  const fetchResources=async()=>{
    const url=String(window.MATHSERA_SUPABASE_URL||"").trim().replace(/\/$/,"");
    const key=String(window.MATHSERA_SUPABASE_PUBLISHABLE_KEY||"").trim();
    if(!url)throw new Error("Supabase URL is missing in supabase-config.js.");
    if(!key)throw new Error("Supabase publishable key is missing in supabase-config.js.");

    // Public Library intentionally uses one direct REST request.
    // This removes dependency on the Supabase JS CDN/client initialization.
    const endpoint=new URL(url+"/rest/v1/resources");
    endpoint.searchParams.set("select","*");
    endpoint.searchParams.set("published","eq.true");
    endpoint.searchParams.set("order","created_at.desc");

    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),TIMEOUT_MS);

    try{
      const response=await fetch(endpoint.toString(),{
        method:"GET",
        headers:{
          "apikey":key,
          "Authorization":"Bearer "+key,
          "Accept":"application/json"
        },
        cache:"no-store",
        signal:controller.signal
      });

      const text=await response.text();

      if(!response.ok){
        let detail=text;
        try{
          const j=JSON.parse(text);
          detail=j.message||j.hint||j.details||j.error||text;
        }catch(_){}
        throw new Error(`Database request failed (HTTP ${response.status}): ${String(detail).slice(0,300)}`);
      }

      let data;
      try{data=JSON.parse(text)}
      catch(_){throw new Error("Database returned an invalid response.")}

      if(!Array.isArray(data))throw new Error("Database returned an unexpected data format.");
      return data;
    }catch(e){
      if(e?.name==="AbortError")throw new Error(`Database request timed out after ${TIMEOUT_MS/1000} seconds.`);
      if(e instanceof TypeError)throw new Error("Could not reach the database. Check the internet connection or Supabase project URL.");
      throw e;
    }finally{
      clearTimeout(timer);
    }
  };

  setLoading();

  try{
    allResources=await fetchResources();

    // A valid empty response is still a successful connection.
    saveSnapshot();
    setupFilters();
    renderExamCards();
    renderResults();
    publishedCount.textContent=`${allResources.length} published ${allResources.length===1?"material":"materials"}`;
    const state=readLibraryState(); if(state) renderLibraryState(state);
  }catch(e){
    // Never leave the student-facing page stuck on "Loading..." indefinitely.
    if(useSnapshot()){
      setupFilters();
      renderExamCards();
      renderResults();
      publishedCount.textContent=`${allResources.length} published ${allResources.length===1?"material":"materials"}`;
      const state=readLibraryState(); if(state) renderLibraryState(state);
      const stamp=document.createElement("div");
      stamp.className="empty";
      stamp.style.marginBottom="14px";
      stamp.innerHTML="<b>Showing the last successfully loaded Library data.</b><br><small>The latest database refresh failed, but your previous Library data is still available.</small>";
      results.prepend(stamp);
    }else{
      showError(e);
    }
  }
}

function bootLibrary(){
  try{
    document.getElementById("year").textContent=new Date().getFullYear();

    document.getElementById("filterBtn").addEventListener("click",()=>renderResults(filtered()));
    document.getElementById("globalSearchBtn").addEventListener("click",()=>renderResults(filtered()));
    document.getElementById("globalSearch").addEventListener("keydown",e=>{if(e.key==="Enter")renderResults(filtered())});

    document.getElementById("clearBtn").addEventListener("click",()=>{
      ["globalSearch","categoryFilter","examFilter","boardFilter","classFilter","subjectFilter","publicationFilter","typeFilter","yearFilter","chapterFilter"]
        .forEach(id=>{const el=document.getElementById(id);if(el)el.value=""});
      renderResults();
    });

    document.getElementById("closeModal").addEventListener("click",()=>clearLibraryState());
    document.getElementById("backFromExam").addEventListener("click",()=>clearLibraryState());
    examModal.addEventListener("click",e=>{if(e.target===examModal)clearLibraryState()});
    window.addEventListener("popstate",()=>{const state=readLibraryState(); if(state){if(allResources.length)renderLibraryState(state)} else closeExam(false)});
    document.getElementById("menuBtn").addEventListener("click",()=>alert("Use the Library/Admin links from the website navigation."));

    const chips=document.getElementById("chips");
    EXAMS.forEach(([name])=>{
      const b=document.createElement("button");
      b.className="chip";
      b.textContent=name;
      b.addEventListener("click",()=>openExam(name));
      chips.appendChild(b);
    });

    load();
  }catch(e){
    console.error("MathsEra Library bootstrap error:",e);
    showFatalBootstrapError(e);
  }
}

function showFatalBootstrapError(e){
  const msg=String(e?.message||e||"Unknown startup error");
  publishedCount.textContent="Library error";
  examGrid.innerHTML=`<div class="error">
    <h3>Library startup error</h3>
    <p>${esc(msg)}</p>
    <p>This is a website-code error, not missing student content.</p>
    <button type="button" class="btn clear" onclick="location.reload()">RETRY</button>
  </div>`;
  results.innerHTML=`<div class="empty"><h3>Library did not start correctly</h3><p>Please retry this page.</p></div>`;
  resultCount.textContent="0 resources";
}

bootLibrary();
