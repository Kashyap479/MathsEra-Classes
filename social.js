/* MathsEra Classes — Social & Contact UI Integration */
(function(){
  "use strict";
  const cfg=window.MATHSERA_SOCIAL;
  if(!cfg)return;
  const external=new Set(["instagram","youtube","facebook","telegram","whatsapp","googleMaps"]);
  const attrs=k=>external.has(k)?'target="_blank" rel="noopener noreferrer"':'';
  const card=(k,text)=>{const x=cfg[k];return x?`<a class="social-card social-${k}" href="${x.url}" ${attrs(k)} aria-label="${x.label}: ${x.handle}"><span class="social-icon" aria-hidden="true">${x.icon}</span><span class="social-copy"><strong>${x.label}</strong><small>${text||x.handle}</small></span><span class="social-arrow" aria-hidden="true">↗</span></a>`:""};
  const link=k=>{const x=cfg[k];return x?`<a href="${x.url}" ${attrs(k)}>${x.icon} ${x.label}</a>`:""};
  const grid=document.getElementById("mathseraSocialGrid");
  if(grid)grid.innerHTML=[card("instagram","Follow @mathsera_classes"),card("youtube","Subscribe @MathsEraClasses"),card("facebook","Follow MathsEra Classes"),card("telegram","Join @MathsEraClasses"),card("whatsapp","Chat Now"),card("googleMaps","Get Directions")].join("");
  const footer=document.getElementById("mathseraFooterSocial");
  if(footer)footer.innerHTML=["instagram","youtube","facebook","telegram","whatsapp","googleMaps"].map(link).join("");
  const mobile=document.getElementById("mathseraMobileConnect");
  if(mobile)mobile.innerHTML=["instagram","youtube","facebook","telegram","whatsapp","googleMaps","phone"].map(link).join("");
  const quick=document.getElementById("mathseraQuickActions");
  if(quick)quick.innerHTML=["phone","whatsapp","googleMaps"].map(k=>{const x=cfg[k],label=k==="phone"?"Call":k==="whatsapp"?"WhatsApp":"Directions";return `<a href="${x.url}" ${attrs(k)} aria-label="${x.label}"><span>${x.icon}</span><b>${label}</b></a>`}).join("");
  const contact=document.getElementById("mathseraContactGrid");
  if(contact)contact.innerHTML=["instagram","youtube","facebook","telegram","whatsapp","googleMaps","phone"].map(k=>card(k)).join("");
  document.querySelectorAll("[data-social-link]").forEach(el=>{const x=cfg[el.getAttribute("data-social-link")];if(!x)return;el.href=x.url;if(external.has(el.getAttribute("data-social-link"))){el.target="_blank";el.rel="noopener noreferrer";}});
})();
