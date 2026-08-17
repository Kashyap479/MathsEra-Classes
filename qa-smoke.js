const fs=require('fs');const cp=require('child_process');
const required=['index.html','library.html','library.js','resource.html','resource.js','solution.html','solution.js','admin.html','admin.js','supabase-config.js','supabase-schema.sql'];
for(const f of required)if(!fs.existsSync(f))throw new Error('Missing '+f);
for(const f of ['app.js','library.js','resource.js','solution.js','admin.js','supabase-config.js']){cp.execFileSync(process.execPath,['--check',f],{stdio:'inherit'})}
const lib=fs.readFileSync('library.js','utf8');
for(const x of ['Board Exams','JEE','NEET','NDA','CUET','TET','NET','Other Competitive','School / General','Exercise Solutions','Notes','navigateLibrary','popstate'])if(!lib.includes(x))throw new Error('Library requirement missing: '+x);
const sol=fs.readFileSync('solution.js','utf8');
for(const x of ['Download Current Image','Download All Images','Previous Question','Next Question','katex'])if(!sol.includes(x))throw new Error('Solution requirement missing: '+x);
const adm=fs.readFileSync('admin.js','utf8');
for(const x of ['editingId','deleteResource','openPreview','UPDATE MATERIAL'])if(!adm.includes(x))throw new Error('Admin requirement missing: '+x);
console.log('MathsEra V9-PRO static smoke test: PASS');
