// admin.js — GitHub-backed admin panel for solast-art/Solast_art
// NOTE: This script stores the GitHub token in localStorage only for your browser.

const OWNER = 'solast-art';
const REPO  = 'Solast_art';
const BRANCH = 'main';
const CONTENT_PATH = 'content.json'; // root content.json

// helpers for GitHub API
function apiHeaders(token){
  return {
    "Accept": "application/vnd.github.v3+json",
    ...(token ? { Authorization: `token ${token}` } : {})
  };
}

async function ghGetFile(path){
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(path)}?ref=${BRANCH}`;
  const res = await fetch(url, { headers: apiHeaders(getToken()) });
  if(res.status===404) throw new Error('not-found');
  if(!res.ok) throw new Error('GitHub GET failed: '+res.statusText);
  return await res.json(); // contains content (base64), sha, etc.
}

async function ghPutFile(path, contentBase64, message, sha){
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(path)}`;
  const body = { message, content: contentBase64, branch: BRANCH };
  if(sha) body.sha = sha;
  const res = await fetch(url, {
    method: 'PUT',
    headers: apiHeaders(getToken()),
    body: JSON.stringify(body)
  });
  if(!res.ok) {
    const t = await res.text();
    throw new Error('GitHub PUT failed: '+res.status+' '+t);
  }
  return await res.json();
}

// UI elements
const navBtns = document.querySelectorAll('.nav button');
const panels = document.querySelectorAll('.panel');
navBtns.forEach(b=>{
  b.addEventListener('click', ()=>{
    navBtns.forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    panels.forEach(p=>p.classList.add('hidden'));
    document.getElementById(b.dataset.sec).classList.remove('hidden');
  });
});

// token handling
function getToken(){ return localStorage.getItem('gh_pat'); }
function setToken(t){ localStorage.setItem('gh_pat', t); updateTokenUI(); }
function clearToken(){ localStorage.removeItem('gh_pat'); updateTokenUI(); }
function updateTokenUI(){
  const who = document.getElementById('who');
  const status = document.getElementById('tokenStatus');
  const t = getToken();
  status.textContent = t ? 'Token set (stored locally)' : 'No token';
  if(!t) who.textContent = 'Not authenticated (token needed for uploads)';
  else who.textContent = 'Token present (use Upload/Save actions)';
}
document.getElementById('enterToken').addEventListener('click', ()=>{
  const t = prompt('Paste your GitHub Personal Access Token (scope: public_repo or repo). It is stored locally in your browser only.');
  if(t) setToken(t.trim());
});
document.getElementById('clearToken').addEventListener('click', ()=> { if(confirm('Clear token from browser?')) clearToken(); });

updateTokenUI();

// load content.json and populate UI
let CONTENT = null;
async function loadContent(){
  try {
    const file = await ghGetFile(CONTENT_PATH);
    const jsonStr = atob(file.content.replace(/\n/g,''));
    CONTENT = JSON.parse(jsonStr);
    populateAll();
    return true;
  } catch(err){
    if(err.message === 'not-found'){
      alert('content.json not found in repo. Creating initial content.json now.');
      // create default content
      const defaultContent = {
        heroTitle: "Crafting Memories with Elegance",
        brandName: "Solast_art",
        slogan: "Crafting Memories with Elegance",
        aboutText: "Solast Art is a creative studio based in Thaliparamba, Kannur.",
        aboutStyle: { fontFamily: "Arial, Helvetica, sans-serif", fontSize: 16, color: "#123840", bold:false, italic:false },
        services: ["Customised Frame","Invitation card","Birthday Video","Calligraphy"],
        gallery: [],
        videos: [],
        social: { instagram: "https://instagram.com/__solast_art", whatsapp: "https://wa.me/9778739301" },
        seo: { title: "Solast Art | Custom Frames, Gift Hampers & Handmade Creations", description: "" },
        footer: { developer: "@m_safeerr", copyright: "© 2025 Solast_art" }
      };
      await saveContent(defaultContent, 'Create initial content.json');
      CONTENT = defaultContent;
      populateAll();
      return true;
    } else {
      alert('Failed to load content.json: ' + err.message);
      console.error(err);
      return false;
    }
  }
}

function populateAll(){
  // dashboard stats
  document.getElementById('sg').textContent = 18;
  document.getElementById('sv').textContent = (CONTENT.videos || []).length;

  // gallery UI
  renderGallery();

  // videos
  renderVideos();

  // texts
  document.getElementById('brandName').value = CONTENT.brandName || '';
  document.getElementById('slogan').value = CONTENT.slogan || '';
  document.getElementById('services').value = (CONTENT.services || []).join('\n');

  // about
  document.getElementById('aboutText').value = CONTENT.aboutText || '';
  const st = CONTENT.aboutStyle || {};
  document.getElementById('aboutFont').value = st.fontFamily || "Arial, Helvetica, sans-serif";
  document.getElementById('aboutSize').value = st.fontSize || 16;
  document.getElementById('aboutColor').value = st.color || '#123840';
  document.getElementById('aboutBold').checked = !!st.bold;
  document.getElementById('aboutItalic').checked = !!st.italic;

  // social
  document.getElementById('insta').value = (CONTENT.social && CONTENT.social.instagram) || '';
  document.getElementById('wa').value = (CONTENT.social && CONTENT.social.whatsapp) || '';
  document.getElementById('seoTitle').value = (CONTENT.seo && CONTENT.seo.title) || '';
  document.getElementById('seoDesc').value = (CONTENT.seo && CONTENT.seo.description) || '';
}

// Save content.json via GitHub API (PUT). It will fetch current sha first if exists.
async function saveContent(obj, message = 'Update content.json'){
  const token = getToken();
  // get current sha if exists
  let sha = undefined;
  try {
    const existing = await ghGetFile(CONTENT_PATH);
    sha = existing.sha;
  } catch(e){ /* not found — will create */ }
  const contentBase64 = btoa(JSON.stringify(obj, null, 2));
  await ghPutFile(CONTENT_PATH, contentBase64, message, sha);
  // reload content
  await loadContent();
  alert('content.json saved.');
}

/* ========== GALLERY ========== */
const galleryGrid = document.getElementById('galleryGrid');

// Render 18 fixed slots (use existing PATHS if present; otherwise placeholder)
function renderGallery(){
  galleryGrid.innerHTML = '';
  const arr = CONTENT.gallery && CONTENT.gallery.length ? CONTENT.gallery.slice(0,18) : [];
  // ensure length 18
  while(arr.length < 18) arr.push('/assets/placeholder.png');

  arr.forEach((url, idx) => {
    const slot = document.createElement('div');
    slot.className = 'slot';
    slot.draggable = true;
    slot.dataset.index = idx;
    slot.innerHTML = `
      <img src="${url}" alt="slot-${idx}">
      <div class="controls">
        <label class="btn light">
          <input type="file" accept="image/*" data-replace="${idx}" style="display:none">
          Replace
        </label>
        <button class="btn light" data-drag="${idx}">Drag</button>
      </div>
    `;
    galleryGrid.appendChild(slot);

    const fileInput = slot.querySelector('input[type=file]');
    fileInput.addEventListener('change', (e)=>{
      const file = e.target.files[0];
      if(file) replaceGallerySlot(idx, file);
    });

    // drag handlers
    slot.addEventListener('dragstart', galleryDragStart);
    slot.addEventListener('dragover', galleryDragOver);
    slot.addEventListener('drop', galleryDrop);
    slot.addEventListener('dragend', galleryDragEnd);
  });
}

// Drag & drop swap
let dragIndex = null;
function galleryDragStart(e){ dragIndex = Number(this.dataset.index); this.classList.add('dragging'); }
function galleryDragOver(e){ e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }
function galleryDrop(e){
  e.preventDefault();
  const toIndex = Number(this.dataset.index);
  if(dragIndex === null || dragIndex === toIndex) return;
  // swap sources in DOM immediately
  const imgs = Array.from(galleryGrid.querySelectorAll('img'));
  const src = imgs[dragIndex].src;
  imgs[dragIndex].src = imgs[toIndex].src;
  imgs[toIndex].src = src;
}
function galleryDragEnd(){ this.classList.remove('dragging'); dragIndex = null; }

// Save gallery order into content.json (reads srcs in DOM order)
document.getElementById('saveGallery').addEventListener('click', async ()=>{
  const imgs = Array.from(galleryGrid.querySelectorAll('img')).map(i=>i.src);
  // normalize to relative paths if raw.githubusercontent urls
  const normalized = imgs.map(s => normalizeGithubUrlToPath(s));
  CONTENT.gallery = normalized.slice(0,18);
  await saveContent(CONTENT, 'Update gallery order');
});

// Replace single slot: upload image to /assets/gallery/<timestamp>_<name>
async function replaceGallerySlot(idx, file){
  if(!confirm('Replace slot '+(idx+1)+'?')) return;
  const token = getToken();
  if(!token){ alert('You need to set a GitHub token to upload. Click "Set GitHub Token".'); return; }

  // build path
  const safeName = file.name.replace(/\s+/g,'_');
  const path = `assets/gallery/${Date.now()}_${safeName}`;

  try {
    // get file as base64
    const base64 = await fileToBase64(file);
    await ghPutFile(path, base64.split(',')[1], `Upload gallery slot ${idx+1} - ${file.name}`);
    // update CONTENT.gallery at idx with raw.githubusercontent url
    const rawUrl = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${path}`;
    // ensure array length
    if(!CONTENT.gallery) CONTENT.gallery = [];
    while(CONTENT.gallery.length < 18) CONTENT.gallery.push('/assets/placeholder.png');
    CONTENT.gallery[idx] = rawUrl;
    await saveContent(CONTENT, `Replace gallery slot ${idx+1}`);
    renderGallery();
  } catch(err){
    alert('Upload failed: '+err.message);
    console.error(err);
  }
}

/* ========== VIDEOS ========== */
const videoListDiv = document.getElementById('videoList');
document.getElementById('uploadVideo').addEventListener('click', async ()=>{
  const f = document.getElementById('videoFile').files[0];
  if(!f){ alert('Choose a video file first'); return; }
  if(!confirm('Upload selected video?')) return;
  const token = getToken();
  if(!token){ alert('You need to set a GitHub token to upload.'); return; }
  const safeName = f.name.replace(/\s+/g,'_');
  const path = `assets/videos/${Date.now()}_${safeName}`;
  try {
    const base64 = await fileToBase64(f);
    await ghPutFile(path, base64.split(',')[1], `Upload video ${f.name}`);
    const rawUrl = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${path}`;
    CONTENT.videos = CONTENT.videos || [];
    CONTENT.videos.push(rawUrl);
    await saveContent(CONTENT, `Add video ${f.name}`);
    renderVideos();
  } catch(err){ alert('Video upload failed: '+err.message); console.error(err); }
});

function renderVideos(){
  videoListDiv.innerHTML = '';
  (CONTENT.videos || []).forEach((url, idx)=>{
    const item = document.createElement('div');
    item.className = 'video-item';
    item.innerHTML = `
      <video src="${url}" controls muted></video>
      <div style="flex:1">
        <input type="text" value="${url}" class="video-url" />
        <div style="margin-top:8px;display:flex;gap:8px">
          <button class="btn light" data-up="${idx}">↑</button>
          <button class="btn light" data-down="${idx}">↓</button>
          <button class="btn light" data-replace="${idx}">Replace</button>
          <button class="btn" data-delete="${idx}">Delete</button>
        </div>
      </div>
    `;
    videoListDiv.appendChild(item);

    item.querySelector('[data-up]').addEventListener('click', ()=> swapVideos(idx, idx-1));
    item.querySelector('[data-down]').addEventListener('click', ()=> swapVideos(idx, idx+1));
    item.querySelector('[data-delete]').addEventListener('click', ()=> deleteVideo(idx));
    item.querySelector('[data-replace]').addEventListener('click', ()=>{
      const inp = document.createElement('input'); inp.type='file'; inp.accept='video/*';
      inp.addEventListener('change', e=> replaceVideo(idx, e.target.files[0]));
      inp.click();
    });
  });
}

async function swapVideos(a,b){
  if(b<0 || b>= (CONTENT.videos||[]).length) return;
  [CONTENT.videos[a], CONTENT.videos[b]] = [CONTENT.videos[b], CONTENT.videos[a]];
  await saveContent(CONTENT, 'Reorder videos');
  renderVideos();
}

async function deleteVideo(idx){
  if(!confirm('Remove this video from list? (file remains in repo)')) return;
  CONTENT.videos.splice(idx,1);
  await saveContent(CONTENT, 'Remove video');
  renderVideos();
}

async function replaceVideo(idx, file){
  if(!file) return;
  const token = getToken();
  if(!token){ alert('Set token'); return; }
  const path = `assets/videos/${Date.now()}_${file.name.replace(/\s+/g,'_')}`;
  try {
    const base64 = await fileToBase64(file);
    await ghPutFile(path, base64.split(',')[1], `Replace video slot ${idx+1}`);
    const rawUrl = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${path}`;
    CONTENT.videos[idx] = rawUrl;
    await saveContent(CONTENT, `Replace video ${idx+1}`);
    renderVideos();
  } catch(e){ alert('Replace failed: '+e.message); console.error(e); }
}

// Save videos (reads any manual edits to URL inputs)
document.getElementById('saveVideos').addEventListener('click', async ()=>{
  const urls = Array.from(document.querySelectorAll('.video-url')).map(i=>i.value.trim()).filter(Boolean);
  CONTENT.videos = urls;
  await saveContent(CONTENT, 'Update video URLs');
  renderVideos();
});

/* ========== TEXTS / ABOUT / SOCIAL ========== */
document.getElementById('saveTexts').addEventListener('click', async ()=>{
  CONTENT.brandName = document.getElementById('brandName').value.trim();
  CONTENT.slogan = document.getElementById('slogan').value.trim();
  CONTENT.services = document.getElementById('services').value.split('\n').map(s=>s.trim()).filter(Boolean);
  await saveContent(CONTENT, 'Update texts & services');
});

document.getElementById('saveAbout').addEventListener('click', async ()=>{
  CONTENT.aboutText = document.getElementById('aboutText').value.trim();
  CONTENT.aboutStyle = {
    fontFamily: document.getElementById('aboutFont').value,
    fontSize: Number(document.getElementById('aboutSize').value) || 16,
    color: document.getElementById('aboutColor').value,
    bold: document.getElementById('aboutBold').checked,
    italic: document.getElementById('aboutItalic').checked
  };
  await saveContent(CONTENT, 'Update about text & style');
});

document.getElementById('saveSocial').addEventListener('click', async ()=>{
  CONTENT.social = { instagram: document.getElementById('insta').value.trim(), whatsapp: document.getElementById('wa').value.trim() };
  CONTENT.seo = { title: document.getElementById('seoTitle').value.trim(), description: document.getElementById('seoDesc').value.trim() };
  await saveContent(CONTENT, 'Update social & SEO');
});

/* ========== misc UI actions ========== */
document.getElementById('reloadAll').addEventListener('click', loadContent);
document.getElementById('refreshGallery').addEventListener('click', renderGallery);
document.getElementById('refreshVideos').addEventListener('click', renderVideos);
document.getElementById('downloadJson').addEventListener('click', async ()=>{
  const a = document.createElement('a');
  a.href = 'data:application/json;charset=utf-8,'+encodeURIComponent(JSON.stringify(CONTENT, null, 2));
  a.download = 'content.json'; a.click();
});

// utility: convert file -> dataURL
function fileToBase64(file){
  return new Promise((res, rej)=>{
    const r = new FileReader();
    r.onload = ()=> res(r.result);
    r.onerror = e=> rej(e);
    r.readAsDataURL(file);
  });
}

// utility: if raw.githubusercontent url convert to repo path /assets/...
function normalizeGithubUrlToPath(url){
  if(!url) return url;
  try {
    const rawPref = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/`;
    if(url.startsWith(rawPref)) return url.slice(rawPref.length).startsWith('/') ? url.slice(rawPref.length+1) : url.slice(rawPref.length);
    // if url already starts with /assets/ return as-is
    if(url.startsWith('/')) return url;
    return url;
  } catch(e){ return url; }
}

// init
loadContent();
