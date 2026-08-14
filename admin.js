(() => {
"use strict";
const $ = id => document.getElementById(id);

const loginPanel=$("loginPanel"), dashboard=$("dashboard");
const loginForm=$("loginForm"), loginEmail=$("loginEmail"), loginPassword=$("loginPassword");
const loginMessage=$("loginMessage"), loginBtn=$("loginBtn"), logoutBtn=$("logoutBtn");
const materialForm=$("materialForm"), publishBtn=$("publishBtn"), publishMessage=$("publishMessage");
const imagesInput=$("images"), imagePreview=$("imagePreview"), pdfInput=$("pdf"), list=$("list");

function client(){
  try{
    if(window.supabaseClient && window.supabaseClient.auth) return window.supabaseClient;
  }catch(e){}
  try{
    if(typeof supabaseClient!=="undefined" && supabaseClient?.auth) return supabaseClient;
  }catch(e){}
  if(window.MATHSERA_SUPABASE_URL && window.MATHSERA_SUPABASE_PUBLISHABLE_KEY){
    try{return window.supabase.createClient(window.MATHSERA_SUPABASE_URL,window.MATHSERA_SUPABASE_PUBLISHABLE_KEY)}catch(e){}
  }
  return null;
}
const setStatus=(el,msg,ok=false)=>{if(el){el.textContent=msg;el.className="status "+(ok?"success":"")}};

function showLogin(){loginPanel.style.display="block";dashboard.style.display="none";logoutBtn.style.display="none"}
function showDashboard(){loginPanel.style.display="none";dashboard.style.display="block";logoutBtn.style.display="inline-block";loadResources()}

async function login(e){
  e.preventDefault(); const c=client(); if(!c){setStatus(loginMessage,"Supabase client नहीं मिला.");return}
  const email=loginEmail.value.trim(), password=loginPassword.value;
  if(!email||!password){setStatus(loginMessage,"Email और password भरें.");return}
  loginBtn.disabled=true;loginBtn.textContent="LOGGING IN...";setStatus(loginMessage,"Logging in...");
  try{
    const {data,error}=await c.auth.signInWithPassword({email,password});
    if(error) throw error;
    if(!data?.session) throw new Error("Session नहीं मिला.");
    setStatus(loginMessage,"Login successful!",true);showDashboard();
  }catch(e){setStatus(loginMessage,"Login failed: "+(e.message||e))}
  finally{loginBtn.disabled=false;loginBtn.textContent="LOGIN"}
}
async function logout(){const c=client();try{if(c)await c.auth.signOut()}catch(e){}showLogin()}

function safe(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function slug(v){return String(v||"file").replace(/\.[^/.]+$/,"").replace(/[^a-zA-Z0-9_-]/g,"-").slice(0,55)||"file"}

imagesInput.addEventListener("change",()=>{
  imagePreview.innerHTML="";
  const files=[...(imagesInput.files||[])];
  files.forEach((f,i)=>{
    if(!f.type.startsWith("image/")) return;
    const img=document.createElement("img"); img.alt=`Page ${i+1}`; img.src=URL.createObjectURL(f); imagePreview.appendChild(img);
  });
});

$("clearBtn").addEventListener("click",()=>{
  materialForm.reset();imagePreview.innerHTML="";
  $("examCategory").value="Board Exams";$("contentType").value="Notes";$("language").value="English";
  setStatus(publishMessage,"");
});

async function uploadFile(c,file,folder){
  const {data:sess}=await c.auth.getSession(); const uid=sess?.session?.user?.id;
  if(!uid) throw new Error("Session expired. फिर से login करें.");
  const ext=(file.name.split(".").pop()||"bin").toLowerCase();
  const path=`${uid}/${folder}/${Date.now()}-${Math.random().toString(36).slice(2,8)}-${slug(file.name)}.${ext}`;
  const {error}=await c.storage.from("library-files").upload(path,file,{cacheControl:"31536000",upsert:false,contentType:file.type});
  if(error) throw new Error("File upload failed: "+error.message);
  const {data}=c.storage.from("library-files").getPublicUrl(path);
  if(!data?.publicUrl) throw new Error("Public URL नहीं बनी.");
  return data.publicUrl;
}

function galleryBody(explanation,urls){
  return JSON.stringify({
    mathsEraGallery:true,
    explanation:explanation||"",
    images:urls||[]
  });
}

async function publish(e){
  e.preventDefault(); const c=client(); if(!c){setStatus(publishMessage,"Supabase client नहीं मिला.");return}
  const imageFiles=[...(imagesInput.files||[])], pdf=pdfInput.files?.[0]||null;
  if(!imageFiles.length && !pdf){setStatus(publishMessage,"कम से कम एक image या PDF चुनें.");return}
  if(imageFiles.length>20){setStatus(publishMessage,"एक material में maximum 20 images रखें.");return}
  for(const f of imageFiles){if(!f.type.startsWith("image/")){setStatus(publishMessage,"सभी selected files images होनी चाहिए.");return}if(f.size>20*1024*1024){setStatus(publishMessage,"हर image 20 MB से छोटी रखें.");return}}
  if(pdf && pdf.size>60*1024*1024){setStatus(publishMessage,"PDF 60 MB से छोटी रखें.");return}

  const payload={
    title:$("title").value.trim(),
    category:$("examCategory").value.trim(),
    class_name:$("className").value.trim(),
    board:$("board").value.trim(),
    subject:$("category").value.trim(),
    chapter:$("chapter").value.trim(),
    exercise:$("exercise").value.trim(),
    question_number:$("questionNumber").value.trim(),
    content_type:$("contentType").value.trim(),
    published:true
  };
  if(!payload.title||!payload.category||!payload.content_type||!payload.subject){setStatus(publishMessage,"Exam category, subject, title और material type जरूरी हैं.");return}

  publishBtn.disabled=true;publishBtn.textContent="UPLOADING...";setStatus(publishMessage,"Files upload हो रही हैं...");
  try{
    const imageUrls=[];
    for(let i=0;i<imageFiles.length;i++){
      setStatus(publishMessage,`Image ${i+1}/${imageFiles.length} upload हो रही है...`);
      imageUrls.push(await uploadFile(c,imageFiles[i],"images"));
    }
    let pdfUrl="";
    if(pdf){setStatus(publishMessage,"PDF upload हो रही है...");pdfUrl=await uploadFile(c,pdf,"pdfs")}

    const body=JSON.stringify({
      mathsEraGallery:true,
      explanation:$("body").value.trim(),
      images:imageUrls,
      pdf:pdfUrl||"",
      examName:$("examName").value.trim(),
      examYear:$("examYear").value.trim(),
      language:$("language").value.trim(),
      subject:$("category").value.trim()
    });
    const row={
      ...payload,
      body,
      image_url:imageUrls[0]||"",
      pdf_url:pdfUrl||""
    };
    setStatus(publishMessage,"Database में material save हो रहा है...");
    const {data,error}=await c.from("resources").insert(row).select("id").single();
    if(error) throw new Error("Database save failed: "+error.message);

    setStatus(publishMessage,`✅ Material publish हो गया! Resource ID: ${data?.id||"saved"}`,true);
    materialForm.reset();imagePreview.innerHTML="";
    $("examCategory").value="Board Exams";$("contentType").value="Notes";$("language").value="English";
    await loadResources();
  }catch(e){console.error(e);setStatus(publishMessage,"❌ "+(e.message||e))}
  finally{publishBtn.disabled=false;publishBtn.textContent="PUBLISH MATERIAL"}
}

function parseBody(body){
  try{const x=JSON.parse(body);if(x?.mathsEraGallery)return x}catch(e){}
  return {mathsEraGallery:false,explanation:String(body||""),images:[]};
}

function render(rows){
  if(!rows?.length){list.innerHTML='<p class="muted">अभी कोई material publish नहीं हुआ.</p>';return}
  list.innerHTML=rows.map(r=>{
    const g=parseBody(r.body),img=r.image_url||g.images?.[0]||"";
    return `<div class="item">
      ${img?`<img src="${safe(img)}" loading="lazy" alt="${safe(r.title)}">`:""}
      <div class="item-main">
        <div class="item-title">${safe(r.title)}</div>
        <div class="item-meta">${safe(r.category)}${g.examName?" • "+safe(g.examName):""} • ${safe(r.content_type||"Resource")}</div>
        <div class="item-meta">${r.class_name?"Class/Level "+safe(r.class_name)+" • ":""}${safe(r.board)}${r.chapter?" • "+safe(r.chapter):""}</div>
        <div class="item-meta">${g.images?.length||0} image(s)${r.pdf_url?" • PDF attached":""}</div>
        <a href="resource.html?id=${encodeURIComponent(r.id)}">VIEW MATERIAL →</a>
      </div>
    </div>`
  }).join("");
}

async function loadResources(){
  const c=client();if(!c)return;list.innerHTML='<p class="muted">Loading...</p>';
  try{
    const {data,error}=await c.from("resources").select("id,title,category,class_name,board,chapter,content_type,body,image_url,pdf_url,published,created_at").eq("published",true).order("created_at",{ascending:false}).limit(20);
    if(error)throw error;render(data||[]);
  }catch(e){list.innerHTML=`<p class="muted">Library load failed: ${safe(e.message||e)}</p>`}
}

async function init(){
  loginForm.addEventListener("submit",login);logoutBtn.addEventListener("click",logout);materialForm.addEventListener("submit",publish);
  const c=client();if(!c){setStatus(loginMessage,"Supabase client नहीं मिला. supabase-config.js check करें.");return}
  c.auth.onAuthStateChange((event,session)=>{if(session)showDashboard();else if(event==="SIGNED_OUT")showLogin()});
  const {data}=await c.auth.getSession();if(data?.session)showDashboard();else showLogin();
}
init();
})();