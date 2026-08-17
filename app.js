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