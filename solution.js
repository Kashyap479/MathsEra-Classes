(() => {
  "use strict";
  const $=id=>document.getElementById(id), esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
  const cfg={url:String(window.MATHSERA_SUPABASE_URL||"").replace(/\/$/,""),key:String(window.MATHSERA_SUPABASE_PUBLISHABLE_KEY||"")};
  const id=new URLSearchParams(location.search).get("id");
  let R=null,imgs=[],idx=0,touchX=0,touchY=0;

  function parse(data){
    let b={};try{const x=JSON.parse(data.body||"");if(x&&typeof x==="object")b=x}catch(e){}
    const t=b.taxonomy&&typeof b.taxonomy==="object"?b.taxonomy:{};const s=b.solution&&typeof b.solution==="object"?b.solution:{};const seo=b.seo&&typeof b.seo==="object"?b.seo:{};
    const pages=Array.isArray(b.pages)?b.pages.filter(x=>x&&x.url).sort((a,b)=>Number(a.page||0)-Number(b.page||0)):[];
    const images=pages.length?pages.map(x=>x.url):(Array.isArray(b.images)?b.images.filter(Boolean):(data.image_url?[data.image_url]:[]));
    return {...data,b,t,s,seo,images,examCategory:t.examCategory||data.category||"",examName:t.examName||b.examName||"",classLevel:t.classLevel||data.class_name||"",board:t.board||data.board||"",subject:t.subject||data.subject||"",publication:t.publication||b.publication||"",chapter:t.chapter||data.chapter||"",exercise:t.exercise||data.exercise||"",question:t.questionNumber||data.question_number||"",type:t.materialType||data.content_type||"",year:t.year||b.examYear||"",language:t.language||b.language||"",questionText:s.question||"",given:s.given||"",formula:s.formula||"",steps:Array.isArray(s.steps)?s.steps.filter(Boolean):[],final:s.finalAnswer||"",tip:s.teacherTip||"",pdf:b.pdf||data.pdf_url||"",seoTitle:seo.title||data.title||"",seoDescription:seo.description||""};
  }
  function latexText(text){
    let out=esc(text||"");
    out=out.replace(/\\\[(.+?)\\\]/gs,(_,m)=>`<div class="math-block" data-tex="${esc(m)}" data-display="1"></div>`);
    out=out.replace(/\\\((.+?)\\\)/gs,(_,m)=>`<span class="math-inline" data-tex="${esc(m)}"></span>`);
    out=out.replace(/\$\$(.+?)\$\$/gs,(_,m)=>`<div class="math-block" data-tex="${esc(m)}" data-display="1"></div>`);
    out=out.replace(/\$(.+?)\$/gs,(_,m)=>`<span class="math-inline" data-tex="${esc(m)}"></span>`);
    return out;
  }
  function renderMath(){
    if(!window.katex)return;document.querySelectorAll("[data-tex]").forEach(el=>{try{window.katex.render(el.dataset.tex,el,{displayMode:el.dataset.display==="1",throwOnError:false})}catch(e){el.textContent=el.dataset.tex}});
  }
  function directMath(text,display){
    const value=String(text||"").trim();if(!value)return"";
    if(/(\$|\\\(|\\\[|\\frac|\\sqrt|\\sin|\\cos|\\tan|\\cot|\\sec|\\csc|\\pi|\^|_)/.test(value)) return `<div class="math-block" data-tex="${esc(value)}" data-display="${display?1:0}"></div>`;
    return `<div class="solution-text">${latexText(value)}</div>`;
  }
  function groupKey(){
    return [R.examCategory,R.examName,R.board,R.classLevel].map(x=>String(x||"").trim().toLowerCase()).join("|");
  }
  function libraryHash(){
    const p=new URLSearchParams();p.set("library","type");if(R.examName)p.set("exam",R.examName);p.set("group",groupKey());if(R.subject)p.set("subject",R.subject);if(R.type)p.set("type",R.type);if(R.publication)p.set("publication",R.publication);return "#"+p.toString();
  }
  function safeFileName(name,ext){return String(name||"mathsera-solution").replace(/[^a-z0-9._-]+/gi,"-").replace(/-+/g,"-").replace(/^-|-$/g,"").slice(0,90)+(ext||"")}
  async function downloadUrl(url,fileName){
    if(!url)return;try{const res=await fetch(url,{mode:"cors"});if(!res.ok)throw new Error("Download request failed");const blob=await res.blob();const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=fileName;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),2000)}catch(e){window.open(url,"_blank","noopener")}}
  async function downloadAll(){
    if(!imgs.length)return;if(!window.JSZip){alert("Download-all support is temporarily unavailable. Please download pages individually.");return}
    const btn=$("downloadAll");if(btn){btn.disabled=true;btn.textContent="Preparing ZIP…"}
    try{const zip=new JSZip();for(let i=0;i<imgs.length;i++){const res=await fetch(imgs[i]);if(!res.ok)throw new Error(`Page ${i+1} download failed`);zip.file(safeFileName(`${R.title}-page-${i+1}`,guessExt(imgs[i])) ,await res.blob())}const blob=await zip.generateAsync({type:"blob"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=safeFileName(R.title,".zip");document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),3000)}catch(e){alert(e.message||"Could not prepare ZIP.")}finally{if(btn){btn.disabled=false;btn.textContent="⬇ Download All Images"}}
  }
  function guessExt(url){const p=String(url||"").split("?")[0].toLowerCase();if(p.endsWith(".png"))return".png";if(p.endsWith(".webp"))return".webp";return".jpg"}
  function gallery(){
    if(!imgs.length)return"";
    return `<section class="box"><h2>Solution Pages</h2><img id="mainImage" class="gallery-main" src="${esc(imgs[0])}" alt="${esc(R.title)} — Page 1"><div class="gallery-nav"><button id="prevPage" type="button">← Previous</button><b id="pageCount">Page 1 of ${imgs.length}</b><button id="nextPage" type="button">Next →</button></div><div class="thumbs">${imgs.map((u,i)=>`<button type="button" class="thumb ${i===0?"active":""}" data-page="${i}"><img src="${esc(u)}" alt="Page ${i+1}" loading="lazy"></button>`).join("")}</div><div class="actions"><button id="downloadCurrent" class="download-btn primary" type="button">⬇ Download Current Image</button><button id="downloadAll" class="download-btn" type="button">⬇ Download All Images</button>${R.pdf?`<button id="downloadPdf" class="download-btn primary" type="button">⬇ Download PDF</button><a class="download-btn" href="${esc(R.pdf)}" target="_blank" rel="noopener">📄 Open PDF</a>`:""}</div><div class="light-note">Images are shown in the exact order selected while publishing.</div></section>`;
  }
  function updateGallery(){
    if(!imgs.length)return;const main=$("mainImage"),count=$("pageCount"),prev=$("prevPage"),next=$("nextPage"),download=$("downloadCurrent");if(main){main.src=imgs[idx];main.alt=`${R.title} — Page ${idx+1}`}if(count)count.textContent=`Page ${idx+1} of ${imgs.length}`;if(prev)prev.disabled=idx===0;if(next)next.disabled=idx===imgs.length-1;if(download)download.onclick=()=>downloadUrl(imgs[idx],safeFileName(`${R.title}-page-${idx+1}`,guessExt(imgs[idx])));document.querySelectorAll(".thumb").forEach((b,i)=>{b.classList.toggle("active",i===idx);if(i===idx)b.scrollIntoView({behavior:"smooth",block:"nearest",inline:"center"})})
  }
  async function pager(){
    try{
      const u=new URL(cfg.url+"/rest/v1/resources");u.searchParams.set("select","*");u.searchParams.set("published","eq.true");u.searchParams.set("limit","500");
      const q=await fetch(u,{headers:{apikey:cfg.key,Authorization:"Bearer "+cfg.key,Accept:"application/json"}});if(!q.ok)return;const rows=(await q.json()).map(parse).filter(x=>x.type===R.type&&x.examName===R.examName&&x.examCategory===R.examCategory&&x.classLevel===R.classLevel&&x.board===R.board&&x.subject===R.subject&&x.chapter===R.chapter&&x.exercise===R.exercise&&x.publication===R.publication);const unique=[...new Map(rows.map(x=>[String(x.id),x])).values()];unique.sort((a,b)=>{const na=parseInt(String(a.question).match(/\d+/)?.[0]||999999),nb=parseInt(String(b.question).match(/\d+/)?.[0]||999999);return na-nb||String(a.title).localeCompare(String(b.title),undefined,{numeric:true})});const pos=unique.findIndex(x=>String(x.id)===String(R.id));if(pos<0)return;const prev=pos>0?unique[pos-1]:null,next=pos<unique.length-1?unique[pos+1]:null;$('pager').innerHTML=`${prev?`<a href="solution.html?id=${encodeURIComponent(prev.id)}"><small>← Previous Question</small><b>${esc(prev.question||prev.title)}</b></a>`:`<span></span>`}${next?`<a href="solution.html?id=${encodeURIComponent(next.id)}"><small>Next Question →</small><b>${esc(next.question||next.title)}</b></a>`:`<span></span>`}`;
    }catch(e){console.warn("Pager error",e)}
  }
  function render(){
    const tags=[R.examName,R.board,R.classLevel?`Class ${R.classLevel}`:"",R.subject,R.publication,R.chapter,R.exercise,R.question,R.year,R.language].filter(Boolean).map(x=>`<span class="tag">${esc(x)}</span>`).join("");
    const crumb=[R.examName,R.board,R.classLevel?`Class ${R.classLevel}`:"",R.subject,R.publication,R.chapter,R.exercise,R.question].filter(Boolean).map(esc).join(" › ");
    $("app").innerHTML=`<article><div class="crumb">${crumb}</div><header class="hero"><div class="tags">${tags}</div><h1>${esc(R.seoTitle||R.title)}</h1><p>${esc(R.title)}</p></header>${R.questionText?`<section class="box question"><h2>Question</h2>${directMath(R.questionText,false)}</section>`:""}${R.given?`<section class="box given"><h2>Given / Concept</h2>${directMath(R.given,false)}</section>`:""}${R.formula?`<section class="box formula"><h2>Formula</h2>${directMath(R.formula,true)}</section>`:""}${R.steps.length?`<section class="box"><h2>Step-by-Step Solution</h2>${R.steps.map((x,i)=>`<div class="step"><span class="num">${i+1}</span><div>${directMath(x,false)}</div></div>`).join("")}</section>`:""}${R.final?`<section class="box final"><h2>Final Answer</h2>${directMath(R.final,true)}</section>`:""}${R.tip?`<section class="box tip"><h2>Teacher's Tip / Important Note</h2><div class="solution-text">${latexText(R.tip)}</div></section>`:""}${gallery()}<div id="pager" class="pager"></div></article>`;
    document.title=`${R.seoTitle||R.title} | MathsEra Classes`;$("metaDescription").content=R.seoDescription||`${R.title} — step-by-step Mathematics solution by MathsEra Classes.`;$("canonicalLink").href=location.href;$("libraryLink").href=`library.html${libraryHash()}`;renderMath();
    if(imgs.length){$("prevPage").onclick=()=>{if(idx>0){idx--;updateGallery()}};$("nextPage").onclick=()=>{if(idx<imgs.length-1){idx++;updateGallery()}};document.querySelectorAll(".thumb").forEach(b=>b.onclick=()=>{idx=Number(b.dataset.page);updateGallery()});$("mainImage").onclick=()=>openModal();$("downloadAll").onclick=downloadAll; if(R.pdf)$("downloadPdf").onclick=()=>downloadUrl(R.pdf,safeFileName(R.title,".pdf"));updateGallery();let startX=0,startY=0;$("mainImage").addEventListener("touchstart",e=>{startX=e.changedTouches[0].clientX;startY=e.changedTouches[0].clientY},{passive:true});$("mainImage").addEventListener("touchend",e=>{const dx=e.changedTouches[0].clientX-startX,dy=e.changedTouches[0].clientY-startY;if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)*1.2){if(dx<0&&idx<imgs.length-1)idx++;if(dx>0&&idx>0)idx--;updateGallery()}},{passive:true})}
    pager();
  }
  function openModal(){if(!imgs.length)return;$("modalImage").src=imgs[idx];$("modalImage").alt=`${R.title} — Page ${idx+1}`;$("modalCaption").textContent=`${R.title} • Page ${idx+1} of ${imgs.length}`;$("imageModal").classList.add("open");document.body.style.overflow="hidden"}
  function closeModal(){$("imageModal").classList.remove("open");$("modalImage").src="";document.body.style.overflow=""}
  $("modalClose").onclick=closeModal;$("imageModal").onclick=e=>{if(e.target===$("imageModal"))closeModal()};document.addEventListener("keydown",e=>{if(e.key==="Escape")closeModal();if($("imageModal").classList.contains("open")){if(e.key==="ArrowLeft"&&idx>0){idx--;updateGallery();openModal()}if(e.key==="ArrowRight"&&idx<imgs.length-1){idx++;updateGallery();openModal()}}});
  $("backBtn").onclick=()=>{if(history.length>1&&document.referrer&&new URL(document.referrer).origin===location.origin)history.back();else location.href=$("libraryLink").href};
  $("shareBtn").onclick=async()=>{try{if(navigator.share)await navigator.share({title:document.title,url:location.href});else{await navigator.clipboard.writeText(location.href);const b=$("shareBtn");b.textContent="✓ Link Copied";setTimeout(()=>b.textContent="↗ Share",1600)}}catch(e){}};
  async function load(){
    try{if(!id)throw new Error("Solution ID missing.");if(!cfg.url||!cfg.key)throw new Error("Supabase configuration missing.");const u=new URL(cfg.url+"/rest/v1/resources");u.searchParams.set("select","*");u.searchParams.set("id","eq."+id);u.searchParams.set("published","eq.true");u.searchParams.set("limit","1");const q=await fetch(u,{headers:{apikey:cfg.key,Authorization:"Bearer "+cfg.key,Accept:"application/json"}});if(!q.ok)throw new Error(`Database request failed (HTTP ${q.status}).`);const rows=await q.json();if(!rows.length)throw new Error("Published solution not found.");R=parse(rows[0]);imgs=R.images;render()}catch(e){$("app").innerHTML=`<div class="error"><h2>Solution could not be loaded</h2><p>${esc(e.message||e)}</p><a class="toolbar" href="library.html">← Open Library</a></div>`}}
  load();
})();
