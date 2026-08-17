const menuBtn =
  document.getElementById("menuBtn");

const mobileNav =
  document.getElementById("mobileNav");


if(menuBtn){

  menuBtn.addEventListener("click", () => {

    mobileNav.classList.toggle("open");

  });

}


document
  .querySelectorAll(".mobile-nav a")
  .forEach(a => {

    a.addEventListener("click", () => {

      mobileNav.classList.remove("open");

    });

  });


const year =
  document.getElementById("year");

if(year){

  year.textContent =
    new Date().getFullYear();

}


const searchForm =
  document.getElementById("searchForm");


if(searchForm){

  searchForm.addEventListener(
    "submit",
    e => {

      e.preventDefault();

      const input =
        document.getElementById("searchInput");

      const q =
        input.value.trim();

      if(q){

        window.location.href =
          "library.html?q=" +
          encodeURIComponent(q);

      }

    }
  );

}


/* =========================
   SUPABASE
========================= */

async function loadStats(){

  if(
    typeof supabase === "undefined" ||
    !window.MATHSERA_SUPABASE_URL ||
    !window.MATHSERA_SUPABASE_PUBLISHABLE_KEY
  ){

    return;

  }


  const client =
    supabase.createClient(
      window.MATHSERA_SUPABASE_URL,
      window.MATHSERA_SUPABASE_PUBLISHABLE_KEY
    );


  const { count, error } =
    await client
      .from("resources")
      .select("*", {
        count:"exact",
        head:true
      })
      .eq("published", true);


  if(!error){

    const stat =
      document.getElementById("statSolutions");

    if(stat){

      stat.textContent =
        count || 0;

    }

  }

}


loadStats();

/* =========================================
   MATHSERA HERO POSTER SLIDER
   ========================================= */

async function loadHeroPosters(){

  const slider = document.getElementById("heroPosterSlider");

  if(!slider) return;

  const c = client();

  if(!c){
    slider.innerHTML = `
      <div class="hero-poster-empty">
        MathsEra Classes
      </div>
    `;
    return;
  }

  try{

    const { data, error } = await c
      .from("posters")
      .select("id,title,image_url,button_url,button_text,published")
      .eq("published", true)
      .order("id", { ascending:false })
      .limit(10);

    if(error) throw error;

    if(!data || !data.length){

      slider.innerHTML = `
        <div class="hero-poster-empty">
          MathsEra Classes
        </div>
      `;

      return;
    }

    const posters = data.filter(p => p.image_url);

    if(!posters.length){

      slider.innerHTML = `
        <div class="hero-poster-empty">
          MathsEra Classes
        </div>
      `;

      return;
    }

    slider.innerHTML = `
      <div class="hero-poster-track">

        ${posters.map((p,i) => {

          const image = String(p.image_url || "");
          const title = String(p.title || "MathsEra Classes")
            .replace(/"/g,"&quot;");

          const url = String(p.button_url || "");

          return `
            <div class="hero-poster-slide ${i === 0 ? "active" : ""}">

              ${
                url
                ? `<a href="${url}" target="_blank" rel="noopener noreferrer">`
                : ""
              }

              <img
                src="${image}"
                alt="${title}"
                loading="${i === 0 ? "eager" : "lazy"}"
              >

              ${
                url
                ? `</a>`
                : ""
              }

            </div>
          `;

        }).join("")}

      </div>

      ${
        posters.length > 1
        ? `
          <div class="hero-poster-dots">
            ${posters.map((_,i) => `
              <button
                type="button"
                class="hero-poster-dot ${i === 0 ? "active" : ""}"
                data-poster-index="${i}"
                aria-label="Show poster ${i+1}">
              </button>
            `).join("")}
          </div>
        `
        : ""
      }
    `;

    if(posters.length <= 1) return;

    const slides = [
      ...slider.querySelectorAll(".hero-poster-slide")
    ];

    const dots = [
      ...slider.querySelectorAll(".hero-poster-dot")
    ];

    let current = 0;

    function showPoster(index){

      current = index;

      slides.forEach((slide,i) => {
        slide.classList.toggle("active", i === current);
      });

      dots.forEach((dot,i) => {
        dot.classList.toggle("active", i === current);
      });

    }

    dots.forEach((dot,i) => {

      dot.addEventListener("click", () => {
        showPoster(i);
      });

    });

    setInterval(() => {

      showPoster(
        (current + 1) % slides.length
      );

    }, 4000);

  }catch(error){

    console.error("Hero posters load failed:", error);

    slider.innerHTML = `
      <div class="hero-poster-empty">
        MathsEra Classes
      </div>
    `;

  }

}

/* Load published posters into homepage Hero */
loadHeroPosters();
