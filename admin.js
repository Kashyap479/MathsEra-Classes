(() => {
"use strict";

const $ = (id) => document.getElementById(id);

const loginCard = $("loginCard");
const dashboard = $("dashboard");
const loginForm = $("loginForm");
const loginEmail = $("loginEmail");
const loginPassword = $("loginPassword");
const loginBtn = $("loginBtn");
const loginStatus = $("loginStatus");

const solutionForm = $("solutionForm");
const publishBtn = $("publishBtn");
const publishStatus = $("publishStatus");
const resourceList = $("resourceList");
const imageInput = $("image");
const imagePreview = $("imagePreview");

const logoutBtn = $("logoutBtn");
const dashboardLogoutBtn = $("dashboardLogoutBtn");
const mobileLogoutBtn = $("mobileLogoutBtn");
const refreshBtn = $("refreshBtn");
const clearBtn = $("clearBtn");

const menuBtn = $("menuBtn");
const mobileNav = $("mobileNav");

$("year").textContent = new Date().getFullYear();

if (menuBtn && mobileNav) {
  menuBtn.addEventListener("click", () => mobileNav.classList.toggle("open"));
}

document.querySelectorAll(".mobile-nav a").forEach((a) => {
  a.addEventListener("click", () => mobileNav.classList.remove("open"));
});

function getClient() {
  try {
    const client =
      window.supabaseClient ||
      (typeof supabaseClient !== "undefined" ? supabaseClient : null);

    if (
      client &&
      client.auth &&
      typeof client.auth.signInWithPassword === "function"
    ) {
      return client;
    }
  } catch (e) {
    console.error("Supabase client detection error:", e);
  }

  return null;
}

function setStatus(el, text, type = "") {
  if (!el) return;
  el.textContent = text || "";
  el.className = "status" + (type ? " " + type : "");
}

function showLogin() {
  loginCard.classList.remove("hidden");
  dashboard.classList.add("hidden");
  logoutBtn.classList.add("hidden");
  mobileLogoutBtn.classList.add("hidden");
}

function showDashboard(email = "") {
  loginCard.classList.add("hidden");
  dashboard.classList.remove("hidden");
  logoutBtn.classList.remove("hidden");
  mobileLogoutBtn.classList.remove("hidden");

  const sessionBox = $("sessionBox");
  if (sessionBox) {
    sessionBox.textContent = email
      ? `Logged in as ${email}`
      : "Admin session active.";
  }

  loadResources();
}

async function checkSession(client) {
  try {
    const { data, error } = await client.auth.getSession();

    if (error) {
      setStatus(loginStatus, "Session check failed: " + error.message, "error");
      showLogin();
      return;
    }

    if (data?.session?.user) {
      showDashboard(data.session.user.email || "");
    } else {
      showLogin();
    }
  } catch (error) {
    setStatus(loginStatus, "Session error: " + (error.message || error), "error");
    showLogin();
  }
}

async function login(event) {
  event.preventDefault();

  const client = getClient();

  if (!client) {
    setStatus(loginStatus, "Supabase client load नहीं हुआ. supabase-config.js check करें.", "error");
    return;
  }

  const email = loginEmail.value.trim();
  const password = loginPassword.value;

  if (!email || !password) {
    setStatus(loginStatus, "Email और password दोनों भरें.", "error");
    return;
  }

  loginBtn.disabled = true;
  loginBtn.textContent = "LOGGING IN...";
  setStatus(loginStatus, "Logging in...");

  try {
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      setStatus(loginStatus, "Login failed: " + error.message, "error");
      return;
    }

    if (!data?.session) {
      setStatus(loginStatus, "Login हुआ, लेकिन session नहीं मिला.", "error");
      return;
    }

    setStatus(loginStatus, "Login successful!", "success");
    showDashboard(data.session.user?.email || email);

  } catch (error) {
    setStatus(loginStatus, "Login error: " + (error.message || error), "error");
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = "LOGIN";
  }
}

async function logout() {
  const client = getClient();

  if (client) {
    try {
      await client.auth.signOut();
    } catch (error) {
      console.error("Logout error:", error);
    }
  }

  solutionForm.reset();
  imagePreview.style.display = "none";
  imagePreview.removeAttribute("src");

  showLogin();
  setStatus(loginStatus, "Logged out.");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function safeName(filename) {
  return filename
    .replace(/\.[^/.]+$/, "")
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .slice(0, 70) || "solution";
}

async function uploadImage(client, file) {
  const extension = (file.name.split(".").pop() || "jpg").toLowerCase();

  const path =
    "solutions/" +
    Date.now() +
    "-" +
    Math.random().toString(36).slice(2, 8) +
    "-" +
    safeName(file.name) +
    "." +
    extension;

  const { error } = await client.storage
    .from("solution-images")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "image/jpeg"
    });

  if (error) {
    throw new Error("Image upload failed: " + error.message);
  }

  const { data } = client.storage
    .from("solution-images")
    .getPublicUrl(path);

  if (!data?.publicUrl) {
    throw new Error("Public image URL नहीं बन सकी.");
  }

  return data.publicUrl;
}

async function publishSolution(event) {
  event.preventDefault();

  const client = getClient();

  if (!client) {
    setStatus(publishStatus, "Supabase client नहीं मिला.", "error");
    return;
  }

  const { data: sessionData } = await client.auth.getSession();

  if (!sessionData?.session) {
    setStatus(publishStatus, "Session expired. फिर से login करें.", "error");
    showLogin();
    return;
  }

  const file = imageInput.files?.[0];

  if (!file) {
    setStatus(publishStatus, "पहले Solution Image चुनें.", "error");
    return;
  }

  if (!file.type.startsWith("image/")) {
    setStatus(publishStatus, "केवल image file upload करें.", "error");
    return;
  }

  if (file.size > 50 * 1024 * 1024) {
    setStatus(publishStatus, "Image 50 MB से छोटी होनी चाहिए.", "error");
    return;
  }

  const payload = {
    title: $("title").value.trim(),
    category: $("category").value.trim(),
    class_name: $("className").value.trim(),
    board: $("board").value.trim(),
    chapter: $("chapter").value.trim(),
    exercise: $("exercise")?.value.trim() || "",
    question_number: $("questionNumber")?.value.trim() || "",
    content_type: $("contentType").value.trim(),
    body: $("body").value.trim(),
    published: true
  };

  if (
    !payload.title ||
    !payload.category ||
    !payload.class_name ||
    !payload.board ||
    !payload.chapter ||
    !payload.content_type
  ) {
    setStatus(publishStatus, "सभी जरूरी fields भरें.", "error");
    return;
  }

  publishBtn.disabled = true;
  publishBtn.textContent = "UPLOADING...";
  setStatus(publishStatus, "Solution image upload हो रही है...");

  let imageUrl = "";

  try {
    imageUrl = await uploadImage(client, file);

    setStatus(publishStatus, "Image upload हो गई. Resource database में save हो रहा है...");

    const { data, error } = await client
      .from("resources")
      .insert({
        ...payload,
        image_url: imageUrl
      })
      .select("id")
      .single();

    if (error) {
      throw new Error("Database save failed: " + error.message);
    }

    setStatus(
      publishStatus,
      `✅ Solution publish हो गया! Resource ID: ${data?.id || "saved"}`,
      "success"
    );

    solutionForm.reset();

    $("className").value = "10";
    $("board").value = "CBSE";
    $("category").value = "Mathematics";
    $("contentType").value = "Solution";

    imagePreview.style.display = "none";
    imagePreview.removeAttribute("src");

    await loadResources();

  } catch (error) {
    console.error("Publish error:", error);
    setStatus(
      publishStatus,
      "❌ " + (error.message || error),
      "error"
    );
  } finally {
    publishBtn.disabled = false;
    publishBtn.textContent = "PUBLISH SOLUTION";
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-IN");
}

function renderResources(rows) {
  if (!rows?.length) {
    resourceList.innerHTML =
      '<div class="status">अभी कोई published resource नहीं मिला.</div>';
    return;
  }

  resourceList.innerHTML = rows.map((row) => `
    <article class="resource-admin-item">
      ${
        row.image_url
          ? `<img src="${escapeHtml(row.image_url)}"
                  alt="${escapeHtml(row.title || "Solution")}"
                  loading="lazy">`
          : `<div style="width:110px;height:82px;border-radius:10px;background:#eef3f8"></div>`
      }

      <div>
        <h3>${escapeHtml(row.title || "MathsEra Resource")}</h3>

        <div class="meta">
          Class ${escapeHtml(row.class_name || "")}
          • ${escapeHtml(row.board || "")}
          • ${escapeHtml(row.category || "")}
          • ${escapeHtml(row.chapter || "")}
        </div>

        <div class="meta">
          ${escapeHtml(row.content_type || "Resource")}
          • Published ${escapeHtml(formatDate(row.created_at))}
        </div>
      </div>

      <div class="view-wrap">
        <a class="view-btn"
           href="resource.html?id=${encodeURIComponent(row.id)}">
          VIEW
        </a>
      </div>
    </article>
  `).join("");
}

async function loadResources() {
  const client = getClient();

  if (!client) return;

  resourceList.innerHTML = '<div class="status">Loading published resources...</div>';

  try {
    const { data, error } = await client
      .from("resources")
      .select(
        "id,title,category,class_name,board,subject,chapter,exercise,question_number,content_type,body,image_url,published,created_at"
      )
      .eq("published", true)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    renderResources(data || []);

  } catch (error) {
    console.error("Resource list error:", error);
    resourceList.innerHTML =
      `<div class="status error">Library load failed: ${escapeHtml(error.message || error)}</div>`;
  }
}

imageInput.addEventListener("change", () => {
  const file = imageInput.files?.[0];

  if (!file) {
    imagePreview.style.display = "none";
    imagePreview.removeAttribute("src");
    return;
  }

  if (!file.type.startsWith("image/")) {
    setStatus(publishStatus, "केवल image file चुनें.", "error");
    imageInput.value = "";
    return;
  }

  const url = URL.createObjectURL(file);
  imagePreview.src = url;
  imagePreview.style.display = "block";
});

clearBtn.addEventListener("click", () => {
  solutionForm.reset();

  $("className").value = "10";
  $("board").value = "CBSE";
  $("category").value = "Mathematics";
  $("contentType").value = "Solution";

  imagePreview.style.display = "none";
  imagePreview.removeAttribute("src");

  setStatus(publishStatus, "");
});

loginForm.addEventListener("submit", login);
solutionForm.addEventListener("submit", publishSolution);
refreshBtn.addEventListener("click", loadResources);
dashboardLogoutBtn.addEventListener("click", logout);
logoutBtn.addEventListener("click", logout);
mobileLogoutBtn.addEventListener("click", logout);

const client = getClient();

if (!client) {
  setStatus(
    loginStatus,
    "Supabase client नहीं मिला. supabase-config.js check करें.",
    "error"
  );
  showLogin();
} else {
  client.auth.onAuthStateChange((event, session) => {
    if (session) {
      showDashboard(session.user?.email || "");
    } else if (event === "SIGNED_OUT") {
      showLogin();
    }
  });

  checkSession(client);
}

})();
