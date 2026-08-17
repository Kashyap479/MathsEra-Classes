/* MathsEra Classes V11 — public CMS reader */
(() => {
  "use strict";
  const cfg = {
    url: String(window.MATHSERA_SUPABASE_URL || "").replace(/\/$/,""),
    key: String(window.MATHSERA_SUPABASE_PUBLISHABLE_KEY || "")
  };
  if (!cfg.url || !cfg.key || !window.supabase) return;
  const client = window.supabase.createClient(cfg.url, cfg.key);

  function esc(v){
    return String(v ?? "").replace(/[&<>"']/g,m=>({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    }[m]));
  }

  function posterMeta(row){
    const fallback = {
      text: row?.description || "",
      placement: "homepage-top",
      order: 9999,
      auto: true,
      duration: 5000,
      mobileImage: ""
    };
    const raw = String(row?.description || "");
    try{
      const x = JSON.parse(raw);
      if(x && x.__mathsera_poster_v1){
        return {
          ...fallback,
          ...x,
          text: String(x.text ?? ""),
          order: Number.isFinite(Number(x.order)) ? Number(x.order) : 9999,
          duration: Math.max(2500, Number(x.duration) || 5000),
          auto: x.auto !== false,
          mobileImage: String(x.mobileImage || "")
        };
      }
    }catch(_){}
    return fallback;
  }

  window.mathseraCMS = {
    client,
    esc,
    posterMeta,
    async published(table, order="created_at"){
      const {data,error}=await client.from(table).select("*").eq("published",true).order(order,{ascending:false});
      if(error) throw error; return data||[];
    },
    async publishedWhere(table, column, value){
      const {data,error}=await client.from(table).select("*").eq("published",true).eq(column,value).order("created_at",{ascending:false});
      if(error) throw error; return data||[];
    }
  };
})();
