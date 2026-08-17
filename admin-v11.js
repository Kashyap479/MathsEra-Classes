/* MathsEra Classes V11 — owner-only CMS + media + homepage banner manager */
(() => {
"use strict";
const TABS=[
 ["courses","Courses"],["batches","Batches"],["fees","Fees"],["achievements","Results / Achievers"],
 ["events","Events / Competitions"],["announcements","Announcements"],["posters","Posters / Ads"],["gallery","Gallery"],["resources","Study Solutions"]
];
const MEDIA={
 achievements:{field:"photo_url",label:"Student Photo",bucket:"student-results",multi:true},
 events:{field:"poster_url",label:"Event Poster",bucket:"event-media",multi:true},
 posters:{field:"image_url",label:"Poster / Advertisement Image",bucket:"site-posters",multi:true, mobileField:"mobileImage", mobileLabel:"Mobile Banner (optional)", mobileBucket:"site-posters"} ,
 gallery:{field:"image_url",label:"Gallery Photo(s)",bucket:"gallery-media",multi:true}
};
const SCHEMAS={
courses:[["title","Title","text",1],["class_name","Class","text"],["subject","Subject","text"],["board","Board","text"],["duration","Duration","text"],["whatsapp_url","WhatsApp URL","url"],["description","Description","textarea"]],
batches:[["title","Batch Title","text",1],["class_name","Class","text"],["subject","Subject","text"],["board","Board","text"],["start_date","Start Date","text"],["timing","Timing","text"],["duration","Duration","text"],["fee","Fee","text"],["status","Status","text"],["description","Description","textarea"]],
fees:[["title","Fee Title","text",1],["course","Course","text"],["amount","Amount","text"],["duration","Duration","text"],["payment_note","Payment Note","text"],["description","Description","textarea"]],
achievements:[["student_name","Student Name","text",1],["class_name","Class","text"],["exam","Exam / Board","text"],["marks","Marks","text"],["percentage","Percentage","text"],["rank","Rank","text"],["year","Year","text"],["photo_url","Student Photo","media"],["achievement","Achievement","textarea"]],
events:[["title","Event Title","text",1],["event_date","Date","text"],["event_time","Time","text"],["venue","Venue","text"],["eligibility","Eligibility","text"],["registration_fee","Registration Fee","text"],["registration_url","Registration URL","url"],["poster_url","Event Poster","media"],["status","Status","text"],["description","Description","textarea"],["prizes","Prizes","textarea"],["rules","Rules","textarea"]],
announcements:[["title","Title","text",1],["type","Type","text"],["publish_date","Publish Date","text"],["body","Announcement","textarea"]],
posters:[["title","Title","text",1],["image_url","Poster / Advertisement Image","media"],["mobile_image","Mobile Banner (optional)","media-mobile"],["placement","Publish Location","select-placement"],["display_order","Display Order","number"],["auto_slide","Auto Slide","select-auto"],["slide_duration","Slide Duration (seconds)","number"],["button_text","Button Text","text"],["button_url","Button URL","url"],["description","Description","textarea"]],
gallery:[["caption","Caption","text",1],["category","Category","text"],["image_url","Gallery Photo(s)","media"]]
};
let client=null,current="courses",editing=null,selectedFiles=[];

const $=id=>document.getElementById(id);
function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}
function msg(text,ok=true){$("loginMsg").innerHTML=`<div class="status ${ok?'ok':'bad'}">${esc(text)}</div>`;}
function editorMsg(text,ok=true){const el=$("editorMsg");if(el)el.innerHTML=`<div class="status ${ok?'ok':'bad'}">${esc(text)}</div>`;}
function fileSafeName(name){return String(name||"file").toLowerCase().replace(/[^a-z0-9._-]+/g,"-").replace(/^-+|-+$/g,"")||"file";}
function fileKey(file){return `${file.name}__${file.size}__${file.lastModified}`;}
function isMediaField(tab,field){return MEDIA[tab]?.field===field;}

async function init(){
 client=window.supabaseClient||window.supabase.createClient(window.MATHSERA_SUPABASE_URL,window.MATHSERA_SUPABASE_PUBLISHABLE_KEY);
 const {data:{session}}=await client.auth.getSession();
 if(session){
   let ok=await isAdmin();
   if(!ok){const boot=await client.rpc("mathsera_bootstrap_owner");if(!boot.error)ok=await isAdmin();}
   if(ok)showApp();
   else{await client.auth.signOut();msg("This account is not authorised as the MathsEra admin. Run the one-time MathsEra owner bootstrap SQL in Supabase, then login again.",false);}
 }
 $("loginForm").addEventListener("submit",login);
 $("logout").addEventListener("click",async()=>{await client.auth.signOut();location.reload();});
}
async function isAdmin(){
 const {data,error}=await client.from("admin_profiles").select("user_id,is_admin").eq("user_id",(await client.auth.getUser()).data.user.id).maybeSingle();
 return !error&&!!data?.is_admin;
}
async function login(e){
 e.preventDefault();msg("Signing in…",true);
 const {error}=await client.auth.signInWithPassword({email:$("email").value.trim(),password:$("password").value});
 if(error){msg(error.message,false);return;}
 if(!(await isAdmin())){const boot=await client.rpc("mathsera_bootstrap_owner");if(boot.error||!(await isAdmin())){await client.auth.signOut();msg("Login succeeded, but this account is not authorised as the MathsEra admin. Run the one-time owner bootstrap SQL in Supabase.",false);return;}}
 showApp();
}
function showApp(){
 $("loginPanel").classList.add("hidden");$("app").classList.remove("hidden");$("logout").classList.remove("hidden");
 $("tabs").innerHTML=TABS.map(([k,n])=>`<button data-tab="${k}" class="${k===current?'active':''}">${n}</button>`).join("");
 $("tabs").querySelectorAll("button").forEach(b=>b.onclick=()=>{current=b.dataset.tab;editing=null;selectedFiles=[];renderTabs();});
 renderTabs();
}
function renderTabs(){$("tabs").querySelectorAll("button").forEach(b=>b.classList.toggle("active",b.dataset.tab===current));renderEditor();loadRows();}
function fieldsFor(tab){
 if(tab==="resources")return [["title","Title","text",1],["category","Exam Category","text"],["class_name","Class","text"],["board","Board","text"],["subject","Subject","text"],["publication","Publication / Book","text"],["chapter","Chapter","text"],["exercise","Exercise","text"],["question_number","Question Number","text"],["content_type","Content Type","text"],["body","Explanation / Solution JSON","textarea"]];
 return SCHEMAS[tab];
}
function renderEditor(){
 const fs=fieldsFor(current), media=MEDIA[current];
 const editingMeta=current==="posters"&&editing?posterMeta(editing):null;
 $("editor").innerHTML=`<form id="contentForm">
 <div class="form-grid">${fs.map(f=>{
   if(f[2]==="media"){
     const m=MEDIA[current];
     return `<div class="field full media-field"><label>${esc(f[1])}</label><input id="f_${f[0]}" class="media-input" type="file" accept="image/*" ${m?.multi?'multiple':''}><div class="media-help">Select ${m?.multi?'one or multiple':'a'} photo${m?.multi?'s':''} directly from your phone/computer. Recommended banner: 1600×600 px desktop.</div><div id="mediaPreview" class="media-preview"></div>${editing?.[f[0]]?`<div class="current-media"><b>Current image:</b><a href="${esc(editing[f[0]])}" target="_blank" rel="noopener">View current image</a></div>`:''}</div>`;
   }
   if(f[2]==="media-mobile"){
     return `<div class="field full media-field"><label>${esc(f[1])}</label><input id="f_mobile_image" class="media-input" type="file" accept="image/*"><div class="media-help">Optional mobile-specific image. Recommended: 1080×675 px. If left empty, the desktop banner is used.</div><div id="mobileMediaPreview" class="media-preview"></div>${editingMeta?.mobileImage?`<div class="current-media"><b>Current mobile image:</b><a href="${esc(editingMeta.mobileImage)}" target="_blank" rel="noopener">View current image</a></div>`:''}</div>`;
   }
   if(f[2]==="select-placement"){
     return `<div class="field"><label>${esc(f[1])}</label><select id="f_placement">
       <option value="homepage-top">Homepage — Top Banner</option>
       <option value="homepage-after-quick">Homepage — After Quick Access</option>
       <option value="homepage-results">Homepage — Results Area</option>
       <option value="homepage-bottom">Homepage — Before Footer</option>
       <option value="posters-page">Posters Page Only</option>
       <option value="all-home">Homepage + Posters Page</option>
     </select></div>`;
   }
   if(f[2]==="select-auto"){
     return `<div class="field"><label>${esc(f[1])}</label><select id="f_auto_slide"><option value="true">Yes — Auto Slide</option><option value="false">No — Manual Swipe Only</option></select></div>`;
   }
   if(f[2]==="number"){
     const attrs=f[0]==="display_order" ? 'min="1" step="1" value="1"' : 'min="2.5" max="15" step="0.5" value="5"';
     return `<div class="field"><label>${esc(f[1])}</label><input id="f_${f[0]}" type="number" ${attrs}></div>`;
   }
   return `<div class="field ${f[2]==='textarea'?'full':''}"><label>${esc(f[1])}${f[3]?' *':''}</label>${f[2]==='textarea'?`<textarea id="f_${f[0]}" ${f[3]?'required':''}></textarea>`:`<input id="f_${f[0]}" type="${f[2]==='url'?'url':'text'}" ${f[3]?'required':''}>`}</div>`;
 }).join('')}
 <div class="field"><label>Publish immediately?</label><select id="f_published"><option value="false">Draft / Hidden</option><option value="true">Published</option></select></div></div>
 <div class="actions"><button class="btn primary">${editing?'Update':'Create'}</button>${editing?'<button type="button" id="cancelEdit" class="btn secondary">Cancel Edit</button>':''}<button type="button" id="clearMedia" class="btn secondary" ${media?'':'style="display:none"'}>Clear Selected Files</button></div><div id="editorMsg"></div></form>`;

 const form=$("contentForm");form.onsubmit=save;
 if(media){
   const input=$("f_"+media.field);
   input?.addEventListener("change",()=>{selectedFiles=Array.from(input.files||[]);renderMediaPreview();});
   $("clearMedia")?.addEventListener("click",()=>{selectedFiles=[];if(input)input.value="";renderMediaPreview();});
 }
 const mobileInput=$("f_mobile_image");
 if(mobileInput) mobileInput.addEventListener("change",()=>renderMobilePreview(mobileInput.files?.[0]));
 if(editing){
   for(const f of fs){
     if(["media","media-mobile","select-placement","select-auto"].includes(f[2])) continue;
     const el=$("f_"+f[0]);if(el)el.value=editing[f[0]]??"";
   }
   if(current==="posters"&&editingMeta){
     $("f_description").value=editingMeta.text;
     $("f_placement").value=editingMeta.placement||"homepage-top";
     $("f_display_order").value=editingMeta.order===9999?1:editingMeta.order;
     $("f_auto_slide").value=String(editingMeta.auto!==false);
     $("f_slide_duration").value=(Number(editingMeta.duration)||5000)/1000;
   }
   $("f_published").value=String(!!editing.published);
   $("cancelEdit").onclick=()=>{editing=null;selectedFiles=[];renderEditor();};
 }
 if(current==="posters"&&!editing){
   $("f_placement").value="homepage-top";$("f_display_order").value="1";$("f_auto_slide").value="true";$("f_slide_duration").value="5";
 }
}
function renderMobilePreview(file){
 const el=$("mobileMediaPreview");if(!el)return;
 if(!file){el.innerHTML="";return;}
 const url=URL.createObjectURL(file);
 el.innerHTML=`<div class="preview-grid"><div class="preview-item"><img src="${url}" alt="Mobile banner preview"><span>${esc(file.name)}</span></div></div>`;
}
function renderMediaPreview(){
 const el=$("mediaPreview");if(!el)return;
 if(!selectedFiles.length){el.innerHTML='';return;}
 el.innerHTML=`<div class="selected-count">${selectedFiles.length} file${selectedFiles.length>1?'s':''} selected</div><div class="preview-grid">${selectedFiles.map((f,i)=>{const url=URL.createObjectURL(f);return `<div class="preview-item"><img src="${url}" alt="Selected image"><span>${esc(f.name)}</span><button type="button" class="remove-file" data-i="${i}" aria-label="Remove selected file">×</button></div>`}).join('')}</div>${MEDIA[current]?.multi&&['gallery','posters'].includes(current)&&selectedFiles.length>1?'<div class="media-note">Multiple selection is enabled. Each selected image will become its own record using the same metadata.</div>':selectedFiles.length>1?'<div class="media-note">Multiple selection is enabled. For this record type, only the first selected image will be attached to this record.</div>':''}`;
 el.querySelectorAll('.remove-file').forEach(b=>b.onclick=()=>{selectedFiles.splice(Number(b.dataset.i),1);const input=$("f_"+MEDIA[current].field);if(input)input.value="";renderMediaPreview();});
}
async function uploadFile(file,bucket,table){
 const stamp=new Date().toISOString().replace(/[:.]/g,'-');
 const path=`cms/${table}/${stamp}-${crypto.randomUUID()}-${fileSafeName(file.name)}`;
 const {error}=await client.storage.from(bucket).upload(path,file,{upsert:false,contentType:file.type||'image/jpeg'});
 if(error)throw error;
 const {data}=client.storage.from(bucket).getPublicUrl(path);
 return data.publicUrl;
}
async function getFormObject(fs){
 // IMPORTANT: the real `posters` table has only the existing columns:
 // id, title, description, image_url, button_text, button_url, published,
 // created_at, updated_at. Banner-only controls are stored inside
 // `description` as JSON. Never send UI-only fields to Supabase.
 if(current==="posters"){
   const title=$("f_title")?.value.trim()||"";
   if(!title){editorMsg("Title is required.",false);return null;}
   const text=$("f_description")?.value.trim()||"";
   return {
     title,
     description:JSON.stringify({
       __mathsera_poster_v1:true,
       text,
       placement:$('f_placement')?.value||'homepage-top',
       order:Math.max(1,Number($('f_display_order')?.value)||1),
       auto:$('f_auto_slide')?.value!=='false',
       duration:Math.max(2500,(Number($('f_slide_duration')?.value)||5)*1000),
       mobileImage:editing ? (window._editingPosterMeta?.mobileImage||'') : ''
     }),
     button_text:$("f_button_text")?.value.trim()||"",
     button_url:$("f_button_url")?.value.trim()||"",
     published:$("f_published")?.value==="true"
   };
 }
 const obj={};
 for(const f of fs){
   if(["media","media-mobile","select-placement","select-auto"].includes(f[2])) continue;
   const el=$("f_"+f[0]); if(!el)continue;
   const v=el.value.trim();
   if(f[3]&&!v){editorMsg(f[1]+" is required.",false);return null;}
   obj[f[0]]=v;
 }
 obj.published=$("f_published").value==="true";
 return obj;
}
function posterMeta(row){
 const fallback={text:row?.description||"",placement:"homepage-top",order:9999,auto:true,duration:5000,mobileImage:""};
 try{const x=JSON.parse(String(row?.description||""));if(x&&x.__mathsera_poster_v1)return {...fallback,...x};}catch(_){}
 return fallback;
}
async function save(e){
 e.preventDefault();
 const fs=fieldsFor(current), media=MEDIA[current];
 if(current==="posters"&&editing) window._editingPosterMeta=posterMeta(editing);
 const obj=await getFormObject(fs);if(!obj)return;
 try{
   if(media && !editing && selectedFiles.length && ['gallery','posters'].includes(current)){
     let done=0;
     for(const file of selectedFiles){
       const url=await uploadFile(file,media.bucket,current);
       let row={...obj,[media.field]:url};
       if(current==="posters"){
         const meta=JSON.parse(row.description);
         meta.text=meta.text||"";
         row.description=JSON.stringify({...meta,mobileImage:""});
       }
       const {error}=await client.from(current).insert(row);if(error)throw error;done++;
     }
     editorMsg(`${done} ${current==='gallery'?'gallery photos':'posters'} created successfully.`,true);
     selectedFiles=[];window._editingPosterMeta=null;renderEditor();loadRows();return;
   }
   if(media && selectedFiles.length){
     const url=await uploadFile(selectedFiles[0],media.bucket,current);obj[media.field]=url;
   }else if(media && editing){obj[media.field]=editing[media.field]||"";}

   if(current==="posters"){
     const mobileInput=$("f_mobile_image");
     let mobileUrl=window._editingPosterMeta?.mobileImage||"";
     if(mobileInput?.files?.[0]) mobileUrl=await uploadFile(mobileInput.files[0],media.mobileBucket,current);
     const meta=JSON.parse(obj.description);
     obj.description=JSON.stringify({...meta,mobileImage:mobileUrl});
   }

   let res;
   if(editing)res=await client.from(current).update(obj).eq("id",editing.id);else res=await client.from(current).insert(obj);
   if(res.error)throw res.error;
   editorMsg(editing?"Updated successfully.":"Created successfully.",true);
   editing=null;selectedFiles=[];window._editingPosterMeta=null;renderEditor();loadRows();
 }catch(err){editorMsg(err.message||"Upload/save failed.",false);}
}
async function loadRows(){
 const table=current;let q=client.from(table).select("*").order("created_at",{ascending:false}).limit(100);const {data,error}=await q;
 if(error){$("rows").innerHTML=`<tr><td colspan="4">${esc(error.message)}</td></tr>`;return;}
 $("rows").innerHTML=(data||[]).map(r=>`<tr><td><b>${esc(r.title||r.student_name||r.caption||"Untitled")}</b></td><td>${r.published?'Published':'Draft'}</td><td>${esc((r.created_at||"").slice(0,10))}</td><td><button class="btn secondary edit" data-id="${r.id}">Edit</button> <button class="btn danger del" data-id="${r.id}">Delete</button> <button class="btn ${r.published?'secondary':'primary'} pub" data-id="${r.id}" data-state="${r.published}">${r.published?'Unpublish':'Publish'}</button></td></tr>`).join("")||`<tr><td colspan="4">No records yet.</td></tr>`;
 $("rows").querySelectorAll(".edit").forEach(b=>b.onclick=async()=>{const {data,error}=await client.from(table).select("*").eq("id",b.dataset.id).single();if(!error){editing=data;selectedFiles=[];renderEditor();window.scrollTo({top:0,behavior:"smooth"});}});
 $("rows").querySelectorAll(".del").forEach(b=>b.onclick=async()=>{if(!confirm("Delete this record permanently?"))return;const {error}=await client.from(table).delete().eq("id",b.dataset.id);if(error)alert(error.message);else loadRows();});
 $("rows").querySelectorAll(".pub").forEach(b=>b.onclick=async()=>{const next=b.dataset.state!=="true";const {error}=await client.from(table).update({published:next}).eq("id",b.dataset.id);if(error)alert(error.message);else loadRows();});
}
init().catch(e=>msg(e.message,false));
})();
