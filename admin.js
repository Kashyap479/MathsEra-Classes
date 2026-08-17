(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const loginPanel = $("loginPanel"), dashboard = $("dashboard");
  const loginForm = $("loginForm"), loginEmail = $("loginEmail"), loginPassword = $("loginPassword");
  const loginMessage = $("loginMessage"), loginBtn = $("loginBtn"), logoutBtn = $("logoutBtn");
  const materialForm = $("materialForm"), publishBtn = $("publishBtn"), publishMessage = $("publishMessage");
  const imagesInput = $("images"), imagePreview = $("imagePreview"), pdfInput = $("pdf"), list = $("list");
  const previewBtn = $("previewBtn"), cancelEditBtn = $("cancelEditBtn"), previewModal = $("previewModal"), previewContent = $("previewContent"), closePreviewBtn = $("closePreviewBtn");
  const solutionEditor = $("solutionEditor");

  let clientInstance = null;
  let selectedImageFiles = [];
  let existingImages = [];
  let existingPdf = "";
  let editingId = null;

  const TAXONOMY = {
    categories: ["Board Exams","JEE","NEET","NDA","CUET","TET","NET","Other Competitive","School / General"],
    materialTypes: ["Syllabus","Exam Pattern","PYQs","PYQ Solutions","Exercise Solutions","Notes","Important Questions","Practice Sets","Sample Papers","Chapter-wise Questions","Previous Year Analysis","Formula Sheet","Study Material","Other Resources"]
  };
  const SOLUTION_TYPES = ["Exercise Solutions","PYQ Solutions"];

  function client(){
    if(clientInstance?.auth) return clientInstance;
    try {
      if(window.supabaseClient?.auth) return clientInstance = window.supabaseClient;
      if(window.supabase?.createClient && window.MATHSERA_SUPABASE_URL && window.MATHSERA_SUPABASE_PUBLISHABLE_KEY){
        return clientInstance = window.supabase.createClient(window.MATHSERA_SUPABASE_URL,window.MATHSERA_SUPABASE_PUBLISHABLE_KEY);
      }
    } catch(e){ console.error(e); }
    return null;
  }

  function safe(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
  function normalizeText(v){return String(v??"").trim().replace(/\s+/g," ")}
  function slugify(v){return String(v||"resource").toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g,"").trim().replace(/[\s_-]+/g,"-").replace(/^-+|-+$/g,"").slice(0,100)||"resource"}
  function canonicalType(value){
    const v=normalizeText(value).toLowerCase().replace(/[_-]+/g," ").replace(/\s+/g," ");
    const aliases={"solution":"Exercise Solutions","solutions":"Exercise Solutions","exercise solution":"Exercise Solutions","exercise solutions":"Exercise Solutions","ncert solution":"Exercise Solutions","ncert solutions":"Exercise Solutions","chapter solution":"Exercise Solutions","pyq solution":"PYQ Solutions","pyq solutions":"PYQ Solutions","previous year solution":"PYQ Solutions","practice set":"Practice Sets","practice sets":"Practice Sets","sample paper":"Sample Papers","sample papers":"Sample Papers","important question":"Important Questions","important questions":"Important Questions","chapter wise questions":"Chapter-wise Questions","chapter-wise questions":"Chapter-wise Questions"};
    return aliases[v] || TAXONOMY.materialTypes.find(x=>x.toLowerCase()===v) || normalizeText(value);
  }
  function setStatus(el,msg,ok=false){if(el){el.textContent=msg;el.className="status "+(ok?"success":"")}}
  function showLogin(){loginPanel.style.display="block";dashboard.style.display="none";logoutBtn.style.display="none"}
  async function showDashboard(){loginPanel.style.display="none";dashboard.style.display="block";logoutBtn.style.display="inline-block";await loadResources()}

  async function login(e){
    e.preventDefault(); const c=client(); if(!c){setStatus(loginMessage,"Supabase client नहीं मिला.");return}
    const email=loginEmail.value.trim(),password=loginPassword.value;
    if(!email||!password){setStatus(loginMessage,"Email और password भरें.");return}
    loginBtn.disabled=true;loginBtn.textContent="LOGGING IN...";setStatus(loginMessage,"Logging in...");
    try{const {data,error}=await c.auth.signInWithPassword({email,password});if(error)throw error;if(!data?.session)throw new Error("Session नहीं मिला.");setStatus(loginMessage,"Login successful!",true);await showDashboard()}
    catch(e){setStatus(loginMessage,"Login failed: "+(e.message||e))}
    finally{loginBtn.disabled=false;loginBtn.textContent="LOGIN"}
  }
  async function logout(){const c=client();try{if(c)await c.auth.signOut()}catch(e){}resetEditor();showLogin()}

  function parseBody(body){
    try{const x=JSON.parse(body||"");if(x&&typeof x==="object")return x}catch(e){}
    return {};
  }
  function parseResource(r){
    const b=parseBody(r.body),t=b.taxonomy&&typeof b.taxonomy==="object"?b.taxonomy:{};
    const solution=b.solution&&typeof b.solution==="object"?b.solution:{};
    const seo=b.seo&&typeof b.seo==="object"?b.seo:{};
    const pages=Array.isArray(b.pages)?b.pages.filter(x=>x&&x.url).sort((a,b)=>Number(a.page||0)-Number(b.page||0)):[];
    const urls=pages.length?pages.map(x=>x.url):(Array.isArray(b.images)?b.images.filter(Boolean):(r.image_url?[r.image_url]:[]));
    const paths=Array.isArray(b.storagePaths)?b.storagePaths.filter(Boolean):[];
    return {r,b,t,solution,seo,images:urls,paths,pdf:b.pdf||r.pdf_url||"",title:r.title||"",category:t.examCategory||r.category||"",examName:t.examName||b.examName||"",className:t.classLevel||r.class_name||"",board:t.board||r.board||"",subject:t.subject||r.subject||"",publication:t.publication||b.publication||"",chapter:t.chapter||r.chapter||"",exercise:t.exercise||r.exercise||"",questionNumber:t.questionNumber||r.question_number||"",type:t.materialType||r.content_type||"",year:t.year||b.examYear||"",language:t.language||b.language||"",explanation:b.explanation||"",slug:seo.slug||""};
  }

  function renderImagePreview(){
    imagePreview.innerHTML="";
    existingImages.forEach((item,i)=>{
      const wrap=document.createElement("div");wrap.className="preview-item";wrap.dataset.kind="existing";
      const img=document.createElement("img");img.src=item.url;img.alt=`Existing page ${i+1}`;wrap.appendChild(img);
      const label=document.createElement("div");label.className="preview-page";label.textContent=`Page ${i+1}`;wrap.appendChild(label);
      const actions=document.createElement("div");actions.className="preview-actions";
      const left=document.createElement("button");left.type="button";left.textContent="←";left.disabled=i===0;left.onclick=()=>{[existingImages[i-1],existingImages[i]]=[existingImages[i],existingImages[i-1]];renderImagePreview()};
      const right=document.createElement("button");right.type="button";right.textContent="→";right.disabled=i===existingImages.length-1;right.onclick=()=>{[existingImages[i],existingImages[i+1]]=[existingImages[i+1],existingImages[i]];renderImagePreview()};
      const remove=document.createElement("button");remove.type="button";remove.textContent="×";remove.title="Remove existing page";remove.onclick=()=>{existingImages.splice(i,1);renderImagePreview()};
      actions.append(left,right,remove);wrap.appendChild(actions);imagePreview.appendChild(wrap);
    });
    selectedImageFiles.forEach((f,i)=>{
      if(!f.type.startsWith("image/"))return;
      const wrap=document.createElement("div");wrap.className="preview-item new-preview";
      const img=document.createElement("img");img.alt=`New page ${i+1}`;img.src=URL.createObjectURL(f);wrap.appendChild(img);
      const label=document.createElement("div");label.className="preview-page";label.textContent=`New ${i+1}`;wrap.appendChild(label);
      const actions=document.createElement("div");actions.className="preview-actions";
      const left=document.createElement("button");left.type="button";left.textContent="←";left.disabled=i===0;left.onclick=()=>{[selectedImageFiles[i-1],selectedImageFiles[i]]=[selectedImageFiles[i],selectedImageFiles[i-1]];renderImagePreview()};
      const right=document.createElement("button");right.type="button";right.textContent="→";right.disabled=i===selectedImageFiles.length-1;right.onclick=()=>{[selectedImageFiles[i],selectedImageFiles[i+1]]=[selectedImageFiles[i+1],selectedImageFiles[i]];renderImagePreview()};
      const remove=document.createElement("button");remove.type="button";remove.textContent="×";remove.onclick=()=>{selectedImageFiles.splice(i,1);renderImagePreview()};
      actions.append(left,right,remove);wrap.appendChild(actions);imagePreview.appendChild(wrap);
    });
  }

  imagesInput.addEventListener("change",()=>{selectedImageFiles=[...imagesInput.files];renderImagePreview()});

  function toggleSolutionEditor(){
    const type=canonicalType($("contentType").value);
    const show=SOLUTION_TYPES.includes(type);
    solutionEditor.style.display=show?"block":"none";
  }
  $("contentType").addEventListener("change",toggleSolutionEditor);

  function collectForm(){
    const type=canonicalType($("contentType").value);
    return {
      title:normalizeText($("title").value),category:normalizeText($("examCategory").value),examName:normalizeText($("examName").value),className:normalizeText($("className").value),board:normalizeText($("board").value),subject:normalizeText($("category").value),publication:normalizeText($("publication").value),chapter:normalizeText($("chapter").value),exercise:normalizeText($("exercise").value),questionNumber:normalizeText($("questionNumber").value),type,year:normalizeText($("examYear").value),language:normalizeText($("language").value),explanation:String($("body").value||"").trim(),solution:{question:String($("solutionQuestion")?.value||"").trim(),given:String($("solutionGiven")?.value||"").trim(),formula:String($("solutionFormula")?.value||"").trim(),steps:String($("solutionSteps")?.value||"").split(/\r?\n/).map(x=>x.trim()).filter(Boolean),finalAnswer:String($("solutionFinal")?.value||"").trim(),teacherTip:String($("solutionTip")?.value||"").trim()},seo:{title:normalizeText($("seoTitle")?.value)||normalizeText($("title").value),description:normalizeText($("seoDescription")?.value),slug:slugify($("seoTitle")?.value||$("title").value)}};
  }

  function validatePayload(p){
    if(!TAXONOMY.categories.includes(p.category))throw new Error("Invalid exam category.");
    if(!p.title||!p.subject||!p.type)throw new Error("Exam category, subject, title और material type जरूरी हैं.");
    if(p.category!=="School / General"&&!p.examName)throw new Error("Exam Name जरूरी है — इसी से material सही exam library में जाएगा.");
    if(p.category==="Board Exams"&&(!p.board||!p.className))throw new Error("Board Exams के लिए Board और Class/Level दोनों जरूरी हैं.");
    if(p.type==="Exercise Solutions"&&!p.publication)throw new Error("Exercise Solutions के लिए Publication / Book Source जरूरी है.");
    if(p.year&&!/^20\d{2}$/.test(p.year))throw new Error("Year 2000–2099 के बीच डालें.");
    if(SOLUTION_TYPES.includes(p.type)&&!p.solution.question&&!p.explanation&&!selectedImageFiles.length&&!existingImages.length&&!pdfInput.files?.length&&!existingPdf)throw new Error("Solution content, image या PDF देना जरूरी है.");
  }

  async function uploadFile(c,file,folder){
    const {data:{session}}=await c.auth.getSession();const uid=session?.user?.id;if(!uid)throw new Error("Session expired. फिर से login करें.");
    const ext=(file.name.split(".").pop()||"bin").toLowerCase();
    const path=`${uid}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2,9)}-${slugify(file.name)}.${ext}`;
    const {error}=await c.storage.from("library-files").upload(path,file,{cacheControl:"31536000",upsert:false,contentType:file.type});
    if(error)throw new Error("File upload failed: "+error.message);
    const {data}=c.storage.from("library-files").getPublicUrl(path);
    if(!data?.publicUrl)throw new Error("Public URL नहीं बनी.");
    return {url:data.publicUrl,path};
  }

  function extractPath(url){
    try{const u=new URL(url);const marker="/storage/v1/object/public/library-files/";const i=u.pathname.indexOf(marker);return i>=0?decodeURIComponent(u.pathname.slice(i+marker.length)):""}catch(e){return ""}
  }
  async function removeStorageFiles(c,paths){
    const clean=[...new Set((paths||[]).map(String).filter(Boolean))];
    if(!clean.length)return;
    const {error}=await c.storage.from("library-files").remove(clean);if(error)console.warn("Storage cleanup failed:",error.message);
  }

  function buildBody(p,images,pdf,storagePaths){
    return JSON.stringify({
      mathsEraResourceVersion:3,
      taxonomy:{examCategory:p.category,examName:p.examName,classLevel:p.className,board:p.board,subject:p.subject,chapter:p.chapter,exercise:p.exercise,questionNumber:p.questionNumber,materialType:p.type,year:p.year,language:p.language,publication:p.publication},
      explanation:p.explanation,
      solution:SOLUTION_TYPES.includes(p.type)?p.solution:{},
      seo:p.seo,
      images:images.map(x=>x.url),
      pages:images.map((x,i)=>({page:i+1,url:x.url,path:x.path||""})),
      storagePaths:storagePaths||images.map(x=>x.path).filter(Boolean),
      pdf:pdf||""
    });
  }

  function fillForm(parsed){
    $("examCategory").value=parsed.category||"Board Exams";$("examName").value=parsed.examName;$("className").value=parsed.className;$("board").value=parsed.board;$("category").value=parsed.subject;$("publication").value=parsed.publication;$("chapter").value=parsed.chapter;$("exercise").value=parsed.exercise;$("questionNumber").value=parsed.questionNumber;$("contentType").value=parsed.type||"Notes";$("examYear").value=parsed.year;$("language").value=parsed.language||"English";$("title").value=parsed.title;$("body").value=parsed.explanation;$("seoTitle").value=parsed.seo.title||parsed.title;$("seoDescription").value=parsed.seo.description||"";
    $("solutionQuestion").value=parsed.solution.question||"";$("solutionGiven").value=parsed.solution.given||"";$("solutionFormula").value=parsed.solution.formula||"";$("solutionSteps").value=Array.isArray(parsed.solution.steps)?parsed.solution.steps.join("\n"):"";$("solutionFinal").value=parsed.solution.finalAnswer||"";$("solutionTip").value=parsed.solution.teacherTip||"";
    existingImages=parsed.images.map((url,i)=>({url,path:parsed.paths[i]||extractPath(url)}));selectedImageFiles=[];imagesInput.value="";existingPdf=parsed.pdf||"";pdfInput.value="";editingId=parsed.r.id;
    $("editState").textContent=`Editing resource #${editingId}`;$("cancelEditBtn").style.display="inline-block";publishBtn.textContent="UPDATE MATERIAL";renderImagePreview();toggleSolutionEditor();
    if(existingPdf)$("pdfHint").textContent="Existing PDF attached. Select a new PDF to replace it, or clear edit mode to leave it unchanged.";
    window.scrollTo({top:0,behavior:"smooth"});
  }

  function resetEditor(){
    materialForm.reset();selectedImageFiles=[];existingImages=[];existingPdf="";editingId=null;imagesInput.value="";pdfInput.value="";imagePreview.innerHTML="";$("examCategory").value="Board Exams";$("contentType").value="Notes";$("language").value="English";$("editState").textContent="New material";cancelEditBtn.style.display="none";publishBtn.textContent="PUBLISH MATERIAL";$("pdfHint").textContent="अगर पूरा Notes/PYQ PDF है तो यहाँ upload करें.";toggleSolutionEditor();setStatus(publishMessage,"");
  }
  cancelEditBtn.addEventListener("click",resetEditor);
  $("clearBtn").addEventListener("click",resetEditor);

  function latexToHtml(text){
    const escaped=safe(text||"");
    return escaped.replace(/\$\$(.+?)\$\$/gs,(_,m)=>`<div class="preview-math display" data-tex="${safe(m)}"></div>`).replace(/\$(.+?)\$/gs,(_,m)=>`<span class="preview-math" data-tex="${safe(m)}"></span>`);
  }
  function renderPreviewMath(){
    if(!window.katex)return;
    document.querySelectorAll("#previewContent .preview-math").forEach(el=>{try{window.katex.render(el.dataset.tex,el,{displayMode:el.classList.contains("display"),throwOnError:false})}catch(e){el.textContent=el.dataset.tex}});
  }
  function openPreview(){
    const p=collectForm();
    previewContent.innerHTML=`<div class="preview-meta"><b>${safe(p.title)}</b><span>${safe([p.category,p.examName,p.className?`Class ${p.className}`:"",p.subject,p.publication,p.chapter,p.exercise].filter(Boolean).join(" • "))}</span></div>${p.solution.question?`<section class="preview-box question"><h3>Question</h3><div>${latexToHtml(p.solution.question)}</div></section>`:""}${p.solution.given?`<section class="preview-box"><h3>Given / Concept</h3><div>${latexToHtml(p.solution.given)}</div></section>`:""}${p.solution.formula?`<section class="preview-box formula"><h3>Formula</h3><div>${latexToHtml(p.solution.formula)}</div></section>`:""}${p.solution.steps.length?`<section class="preview-box"><h3>Step-by-Step Solution</h3>${p.solution.steps.map((x,i)=>`<div class="preview-step"><b>${i+1}</b><div>${latexToHtml(x)}</div></div>`).join("")}</section>`:""}${p.solution.finalAnswer?`<section class="preview-box final"><h3>Final Answer</h3><div>${latexToHtml(p.solution.finalAnswer)}</div></section>`:""}${p.solution.teacherTip?`<section class="preview-box tip"><h3>Teacher's Tip</h3><div>${safe(p.solution.teacherTip)}</div></section>`:""}${p.explanation?`<section class="preview-box"><h3>Description</h3><div>${safe(p.explanation)}</div></section>`:""}`;
    previewModal.classList.add("open");document.body.style.overflow="hidden";renderPreviewMath();
  }
  previewBtn.addEventListener("click",openPreview);closePreviewBtn.addEventListener("click",()=>{previewModal.classList.remove("open");document.body.style.overflow=""});previewModal.addEventListener("click",e=>{if(e.target===previewModal){previewModal.classList.remove("open");document.body.style.overflow=""}});

  async function saveRow(c,row){
    if(!editingId){
      let result=await c.from("resources").insert(row).select("id").single();
      if(result.error && /publication/i.test(result.error.message||"")){
        const fallback={...row};delete fallback.publication;result=await c.from("resources").insert(fallback).select("id").single();
      }
      if(result.error)throw new Error("Database save failed: "+result.error.message);return result.data.id;
    }
    // UPDATE can legitimately return an empty result set when PostgREST/RLS
    // does not expose the updated row. Do not use .single() here: it turns
    // that valid HTTP response into the misleading "Cannot coerce the result
    // to a single JSON object" error. Fetch the returned rows as an array and
    // verify the target resource separately.
    let result=await c.from("resources").update(row).eq("id",editingId).select("id");
    if(result.error && /publication/i.test(result.error.message||"")){
      const fallback={...row};delete fallback.publication;result=await c.from("resources").update(fallback).eq("id",editingId).select("id");
    }
    if(result.error)throw new Error("Database update failed: "+result.error.message);
    const rows=Array.isArray(result.data)?result.data:[];
    if(!rows.length){
      const verify=await c.from("resources").select("id").eq("id",editingId).maybeSingle();
      if(verify.error)throw new Error("Database update verification failed: "+verify.error.message);
      if(!verify.data)throw new Error("Database update failed: resource not found or your admin account is not authorized to update it.");
      throw new Error("Database update was not confirmed by Supabase. Please check the admin UPDATE policy.");
    }
    return editingId;
  }

  async function publish(e){
    e.preventDefault();const c=client();if(!c){setStatus(publishMessage,"Supabase client नहीं मिला.");return}
    const p=collectForm();
    try{validatePayload(p)}catch(err){setStatus(publishMessage,err.message);return}
    const newFiles=[...selectedImageFiles],pdfFile=pdfInput.files?.[0]||null;
    if(newFiles.length+existingImages.length>30) {setStatus(publishMessage,"एक material में maximum 30 image pages रखें.");return}
    for(const f of newFiles){if(!f.type.startsWith("image/"))return setStatus(publishMessage,"सभी selected files images होनी चाहिए.");if(f.size>20*1024*1024)return setStatus(publishMessage,"हर image 20 MB से छोटी रखें.")}
    if(pdfFile&&pdfFile.size>80*1024*1024)return setStatus(publishMessage,"PDF 80 MB से छोटी रखें.");
    publishBtn.disabled=true;setStatus(publishMessage,editingId?"Material update हो रहा है...":"Material publish हो रहा है...");
    const uploaded=[];
    try{
      for(let i=0;i<newFiles.length;i++){setStatus(publishMessage,`Image ${i+1}/${newFiles.length} upload हो रही है...`);uploaded.push(await uploadFile(c,newFiles[i],"images"))}
      let pdfUrl=existingPdf;
      let pdfPath=extractPath(existingPdf);
      if(pdfFile){setStatus(publishMessage,"PDF upload हो रही है...");const up=await uploadFile(c,pdfFile,"pdfs");pdfUrl=up.url;pdfPath=up.path}
      const images=[...existingImages,...uploaded];
      const storagePaths=images.map(x=>x.path).filter(Boolean);
      if(pdfPath)storagePaths.push(pdfPath);
      const body=buildBody(p,images,pdfUrl,storagePaths);
      const row={title:p.title,category:p.category,class_name:p.className,board:p.board,subject:p.subject,chapter:p.chapter,exercise:p.exercise,question_number:p.questionNumber,content_type:p.type,body,image_url:images[0]?.url||"",pdf_url:pdfUrl||"",published:true,publication:p.publication};
      // Use publication column when the schema has it; the fallback above keeps older databases compatible.
      row.publication=p.publication;
      
      const oldPaths=editingId?await getExistingPaths(c,editingId):[];
      const id=await saveRow(c,row);
      const oldSet=new Set(oldPaths),newSet=new Set(storagePaths);const toDelete=[...oldSet].filter(x=>!newSet.has(x));if(toDelete.length)await removeStorageFiles(c,toDelete);
      setStatus(publishMessage,`${editingId?"✅ Material updated":"✅ Material published"}! Resource ID: ${id}`,true);resetEditor();await loadResources();
    }catch(err){
      if(uploaded.length)await removeStorageFiles(c,uploaded.map(x=>x.path));
      console.error(err);setStatus(publishMessage,"❌ "+(err.message||err));
    }finally{publishBtn.disabled=false}
  }

  async function getExistingPaths(c,id){
    try{const {data,error}=await c.from("resources").select("body,image_url,pdf_url").eq("id",id).single();if(error||!data)return[];const b=parseBody(data.body);const paths=Array.isArray(b.storagePaths)?b.storagePaths.filter(Boolean):[];if(paths.length)return paths;return [...(Array.isArray(b.images)?b.images:[]).map(extractPath),extractPath(data.pdf_url)].filter(Boolean)}catch(e){return[]}
  }

  async function editResource(id){
    const c=client();if(!c)return;
    setStatus(publishMessage,"Loading material...");
    try{const {data,error}=await c.from("resources").select("*").eq("id",id).single();if(error)throw error;fillForm(parseResource(data));setStatus(publishMessage,"Edit mode ready.",true)}catch(e){setStatus(publishMessage,"Edit failed: "+(e.message||e))}
  }
  async function deleteResource(id,title){
    if(!confirm(`Delete “${title}” permanently?

This removes the published resource. Uploaded files will also be removed when their storage paths are known.`))return;
    const c=client();if(!c)return;
    try{
      setStatus(publishMessage,"Deleting material...");
      const paths=await getExistingPaths(c,id);
      let deleted = null;
      const {data:rpcDeleted,error:rpcError}=await c.rpc("mathsera_delete_resource",{p_id:Number(id)});
      if(!rpcError){
        deleted = rpcDeleted;
      }else if(/could not find the function .*mathsera_delete_resource|schema cache/i.test(rpcError.message||"")){
        // If PostgREST has not refreshed its function cache yet, use the existing
        // admin RLS DELETE policy instead of pretending the deletion succeeded.
        const {data:directRows,error:directError}=await c.from("resources").delete().eq("id",Number(id)).select("id");
        if(directError)throw new Error("Delete RPC is not available yet, and direct admin delete was rejected: "+directError.message);
        deleted = Array.isArray(directRows) && directRows.length > 0;
      }else{
        throw new Error(rpcError.message||"Delete RPC failed");
      }
      if(deleted!==true)throw new Error("Delete was not completed. The resource still exists or your admin account is not authorized.");
      const {data:stillThere,error:verifyError}=await c.from("resources").select("id").eq("id",id).maybeSingle();
      if(verifyError)throw new Error("Delete verification failed: "+verifyError.message);
      if(stillThere)throw new Error("Delete was not completed: the resource still exists in the database.");
      if(paths.length)await removeStorageFiles(c,paths);
      if(String(editingId)===String(id))resetEditor();
      await loadResources();
      setStatus(publishMessage,"Material deleted permanently.",true);
    }catch(e){
      console.error("Delete failed",e);
      setStatus(publishMessage,"Delete failed: "+(e.message||e));
    }
  }

  function render(rows){
    if(!rows?.length){list.innerHTML='<p class="muted">अभी कोई material publish नहीं हुआ.</p>';return}
    list.innerHTML=rows.map(r=>{const p=parseResource(r),img=p.images[0]||"";return `<div class="item">${img?`<img src="${safe(img)}" loading="lazy" alt="${safe(p.title)}">`:""}<div class="item-main"><div class="item-title">${safe(p.title)}</div><div class="item-meta">${safe(p.category)} • ${safe(p.examName)} • ${safe(p.type)}</div><div class="item-meta">${p.className?`Class ${safe(p.className)} • `:""}${safe(p.board)}${p.publication?` • ${safe(p.publication)}`:""}${p.chapter?` • ${safe(p.chapter)}`:""}${p.exercise?` • ${safe(p.exercise)}`:""}</div><div class="item-meta">${p.images.length} image page(s)${p.pdf?" • PDF attached":""}</div><div class="item-actions"><a href="${SOLUTION_TYPES.includes(p.type)?`solution.html?id=${encodeURIComponent(r.id)}`:`resource.html?id=${encodeURIComponent(r.id)}`}" target="_blank" rel="noopener">VIEW</a><button type="button" data-edit="${r.id}">EDIT</button><button type="button" class="danger-mini" data-delete="${r.id}" data-title="${safe(p.title)}">DELETE</button></div></div></div>`}).join("");
    list.querySelectorAll("[data-edit]").forEach(b=>b.addEventListener("click",()=>editResource(b.dataset.edit)));
    list.querySelectorAll("[data-delete]").forEach(b=>b.addEventListener("click",()=>deleteResource(b.dataset.delete,b.dataset.title)));
  }
  async function loadResources(){
    const c=client();if(!c)return;list.innerHTML='<p class="muted">Loading...</p>';
    try{const {data,error}=await c.from("resources").select("*").eq("published",true).order("created_at",{ascending:false}).limit(100);if(error)throw error;render(data||[])}catch(e){list.innerHTML=`<p class="muted">Library load failed: ${safe(e.message||e)}</p>`}
  }

  async function init(){
    loginForm.addEventListener("submit",login);logoutBtn.addEventListener("click",logout);materialForm.addEventListener("submit",publish);
    const c=client();if(!c){setStatus(loginMessage,"Supabase client नहीं मिला. supabase-config.js check करें.");return}
    c.auth.onAuthStateChange((event,session)=>{if(session)showDashboard();else if(event==="SIGNED_OUT")showLogin()});
    const {data}=await c.auth.getSession();if(data?.session)await showDashboard();else showLogin();
    toggleSolutionEditor();
  }
  init();
})();
