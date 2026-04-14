 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/index.html b/index.html
index a6d1f70de587187cc61505d3423fac813dc539ab..894f42d4891efab05f77f19459162e6f15074dea 100644
--- a/index.html
+++ b/index.html
@@ -168,52 +168,50 @@
   <div class="spinner"></div>
   <div class="loading-msg">Loading saved scores from cloud...</div>
 </div>
 
 <header class="site-header">
   <div class="brand">
     <div class="brand-bar"></div>
     <div>
       <div class="brand-company">Cooper Lighting Solutions</div>
       <div class="brand-tool">Agent Score Card</div>
     </div>
   </div>
   <div class="header-nav">
     <button class="btn btn-ghost" id="btn-score" onclick="setView('score')">&#9654; Score Agents</button>
     <button class="btn btn-ghost" id="btn-kpi"   onclick="setView('kpi')">&#9783; KPI Dashboard</button>
   </div>
 </header>
 
 <div class="sync-bar">
   <div class="sync-left">
     <div class="sync-dot" id="sync-dot"></div>
     <span id="sync-msg">Connecting to cloud...</span>
   </div>
   <div class="sync-right">
     <button class="mini-btn" onclick="exportExcel()">&#8595; Export Excel</button>
-    <button class="mini-btn" onclick="exportScoresJSON()">&#8681; Backup Scores</button>
-    <button class="mini-btn" onclick="importScoresJSON()">&#8679; Restore Backup</button>
     <button class="mini-btn" onclick="confirmReset()">&#8635; Reset All Scores</button>
   </div>
 </div>
 
 <main class="page-wrap">
   <div id="score-view">
     <div class="progress-banner">
       <span class="progress-label">Overall Progress</span>
       <div class="progress-track"><div class="progress-fill" id="progress-fill"></div></div>
       <span class="progress-count" id="progress-count">0 / 12 agents fully scored</span>
     </div>
     <div class="tabs-bar">
       <div class="tabs-label">Select Agent</div>
       <div class="tabs-bar-inner">
         <div class="tabs" id="agent-tabs"></div>
         <div class="nav-controls">
           <button class="nav-arrow" id="prev-btn" onclick="nav(-1)">&#8592;</button>
           <span class="nav-progress" id="prog"></span>
           <button class="nav-arrow" id="next-btn" onclick="nav(1)">&#8594;</button>
         </div>
       </div>
     </div>
     <div class="summary-row" id="agent-summary"></div>
     <div id="scorecard-content"></div>
     <div class="action-row">
@@ -282,124 +280,101 @@ const SEGMENTS=[
     {name:'Education & Training',s:['Unable to cross competitive products','Dedicated / defined outside sales resource to support stock sales','Reviews and adjusts distributor online product presence','Inside sales resource assigned to actively support stock sales']},
     {name:'Organizational Align.',s:['Mainly rely on crossing specs, do not utilize layout support','Know of CLS application team but seldom use — can use online calculator tools','Predominately use CLS application team for complete layouts','Agency has internal staff capable of full performance layouts']}
   ]},
   {key:'industrial',label:'Industrial',color:'#d97706',criteria:[
     {name:'Customer Relations',s:['No direct relationships','Less than 3 direct relationships','4-7 Direct relationships','7+ Direct relationships']},
     {name:'Lead Management',s:['Reactive to direct contact','Targeted customer list identified (warehouse, logistics, manufacturing)','National Accounts active relationships','Enterprise / National accounts active relationships']},
     {name:'Marketing Presence',s:['Basic understanding of the market','Industry associations and events','Dedicated / focused sales team','Internal applications / design team']},
     {name:'Quoting & Pricing',s:['Utilization of applications / quotes team','Local reference projects','Dedicated quotes team','Connected systems proposed, closed']},
     {name:'Tool & Resource Util.',s:['Basic understanding of the CLS tools','Utility rebate program execution processes','Utilization of all CLS tools and programs','Lead generation tools, pipeline management (e.g. Construct Connect)']},
     {name:'Education & Training',s:['Product and Application training','Competitive product cross and design training','Inverter, emergency competency','Controls (WLX Lite, etc.)']},
     {name:'Organizational Align.',s:['Identified industrial sales leader, can tell the story','In house CLS optimized application and design','In house MWS quote layout resources','Internal audit resources for retrofit']}
   ]},
   {key:'connected',label:'Connected',color:'#059669',criteria:[
     {name:'Customer Relations',s:['No direct relationships','Less than 3 direct relationships','4-7 Direct relationships','7+ Direct relationships']},
     {name:'Lead Management',s:['Developed connected lighting pipeline','ConstructConnect usage','Bi-weekly CLS project review','Pre-wire meetings capability']},
     {name:'Marketing Presence',s:['Industry associations (IES, etc.)','Active promotion on Social Media','Demo cases for controls','Advanced — not specified']},
     {name:'Quoting & Pricing',s:['Utilization of applications / quotes team','Quotes under $50K','Quotes over $50K','Full WLX quoting capabilities']},
     {name:'Tool & Resource Util.',s:['Control specialist training / Lighting spec team controls trained','WLX certification','Electronic tools (CAD / Bluebeam)','SFDC / CRM integration']},
     {name:'Organizational Align.',s:['No dedicated controls team','Dedicated inside support / Basic troubleshooting, Controls PM, WLX Lite','Benchmarking / mentoring — high performing agent (as participant)','Benchmarking / mentoring — high performing agent (as mentor)']},
     {name:'Other',s:['Not specified','Not specified','3rd Party / agent start-up certified','Dedicated outside controls sales / Controls PM / Direct pricing set-up']}
   ]}
 ];
 const MAX={stock:24,spec:28,industrial:28,connected:28};
 const TOTAL_CRITERIA=SEGMENTS.reduce((a,s)=>a+s.criteria.length,0);
 let cur=0,scores={},saveTimer=null;
+const API_URL='/api/scores';
 
 function initScores(){scores={};AGENTS.forEach(a=>{scores[a]={};SEGMENTS.forEach(s=>s.criteria.forEach((_,i)=>{scores[a][s.key+'_'+i]=0;}));});}
 initScores();
 
 /* ── SYNC ENGINE ── */
 function setSyncStatus(state,msg){
   document.getElementById('sync-dot').className='sync-dot '+state;
   document.getElementById('sync-msg').textContent=msg;
 }
-const LS_KEY='cooper_scorecard_v1';
 async function loadFromServer(){
   try{
-    const raw=localStorage.getItem(LS_KEY);
-    if(raw){
-      const d=JSON.parse(raw);
-      if(d.scores&&Object.keys(d.scores).length>0){
-        AGENTS.forEach(a=>{
-          if(d.scores[a]) SEGMENTS.forEach(s=>s.criteria.forEach((_,i)=>{
-            const k=s.key+'_'+i;
-            if(d.scores[a][k]!==undefined) scores[a][k]=d.scores[a][k];
-          }));
-        });
-      }
+    const res=await fetch(API_URL,{cache:'no-store'});
+    if(!res.ok){
+      const txt=await res.text();
+      throw new Error(txt||'Cloud storage is unavailable.');
     }
-    setSyncStatus('synced','✓ Scores saved on this device — use Backup/Restore to share');
+    const d=await res.json();
+    if(d.scores&&Object.keys(d.scores).length>0){
+      AGENTS.forEach(a=>{
+        if(d.scores[a]) SEGMENTS.forEach(s=>s.criteria.forEach((_,i)=>{
+          const k=s.key+'_'+i;
+          if(d.scores[a][k]!==undefined) scores[a][k]=d.scores[a][k];
+        }));
+      });
+    }
+    setSyncStatus('synced','✓ Cloud sync connected — shared across devices');
     return true;
   }catch(e){
-    setSyncStatus('error','Load error: '+e.message);
+    setSyncStatus('error','Cloud sync error: '+e.message);
     return false;
   }
 }
 async function saveToServer(){
   try{
-    localStorage.setItem(LS_KEY,JSON.stringify({scores,ts:Date.now()}));
+    const res=await fetch(API_URL,{
+      method:'PUT',
+      headers:{'Content-Type':'application/json'},
+      body:JSON.stringify({scores,ts:Date.now()})
+    });
+    if(!res.ok){
+      const txt=await res.text();
+      throw new Error(txt||'Unable to sync to cloud');
+    }
     const t=new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
-    setSyncStatus('synced','✓ Saved — '+t);
+    setSyncStatus('synced','✓ Synced to cloud — '+t);
   }catch(e){
-    setSyncStatus('error','Save error: '+e.message);
+    setSyncStatus('error','Cloud save failed: '+e.message);
   }
 }
 function scheduleSave(){clearTimeout(saveTimer);setSyncStatus('saving','Saving...');saveTimer=setTimeout(saveToServer,800);}
-function exportScoresJSON(){
-  const data=JSON.stringify({scores,exportedAt:new Date().toISOString()},null,2);
-  const blob=new Blob([data],{type:'application/json'});
-  const url=URL.createObjectURL(blob);
-  const a=document.createElement('a');a.href=url;
-  a.download='Agent_Scores_'+new Date().toISOString().slice(0,10)+'.json';
-  document.body.appendChild(a);a.click();
-  setTimeout(()=>{document.body.removeChild(a);URL.revokeObjectURL(url);},200);
-  toast('✓ Scores backed up');
-}
-function importScoresJSON(){
-  const inp=document.createElement('input');inp.type='file';inp.accept='.json';
-  inp.onchange=e=>{
-    const file=e.target.files[0];if(!file)return;
-    const reader=new FileReader();
-    reader.onload=ev=>{
-      try{
-        const d=JSON.parse(ev.target.result);
-        if(!d.scores)throw new Error('Invalid backup file');
-        AGENTS.forEach(a=>{
-          if(d.scores[a]) SEGMENTS.forEach(s=>s.criteria.forEach((_,i)=>{
-            const k=s.key+'_'+i;
-            if(d.scores[a][k]!==undefined) scores[a][k]=d.scores[a][k];
-          }));
-        });
-        renderTabs();renderSummary();renderScorecard();updateProgress();saveToServer();
-        toast('✓ Scores restored successfully');
-      }catch(err){toast('⚠ Restore failed: '+err.message);}
-    };
-    reader.readAsText(file);
-  };
-  inp.click();
-}
 
 /* ── UI ── */
 function toast(msg,ms=3200){const el=document.getElementById('toast');el.textContent=msg;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),ms);}
 function badgeClass(pct){return pct===0?'badge-none':pct<0.4?'badge-low':pct<0.65?'badge-mid':pct<0.85?'badge-good':'badge-top';}
 function barColor(pct){return pct<0.4?'#ef4444':pct<0.65?'#f59e0b':pct<0.85?'#22c55e':'#059669';}
 function agentCriteriaCounted(a){return SEGMENTS.reduce((acc,s)=>acc+s.criteria.filter((_,i)=>scores[a][s.key+'_'+i]>0).length,0);}
 function agentPct(a){return agentCriteriaCounted(a)/TOTAL_CRITERIA;}
 function isComplete(a){return agentCriteriaCounted(a)===TOTAL_CRITERIA;}
 function completedCount(){return AGENTS.filter(a=>isComplete(a)).length;}
 function segScore(a,sk){let t=0,mx=0;SEGMENTS.find(s=>s.key===sk).criteria.forEach((_,i)=>{const v=scores[a][sk+'_'+i];if(v>0)t+=v;mx+=4;});return{total:t,max:mx,pct:mx>0?t/mx:0};}
 function agentTotal(a){let t=0,mx=0;SEGMENTS.forEach(s=>{const ss=segScore(a,s.key);t+=ss.total;mx+=ss.max;});return{total:t,max:mx,pct:mx>0?t/mx:0};}
 
 function updateProgress(){
   const done=completedCount(),pct=Math.round((done/AGENTS.length)*100);
   document.getElementById('progress-fill').style.width=pct+'%';
   document.getElementById('progress-count').textContent=done+' / '+AGENTS.length+' agents fully scored';
 }
 
 function renderTabs(){
   const c=document.getElementById('agent-tabs');c.innerHTML='';
   AGENTS.forEach((a,i)=>{
     const pct=agentPct(a),done=isComplete(a),active=i===cur,color=AGENT_COLORS[i],fillW=done?100:Math.round(pct*100);
     const btn=document.createElement('button');btn.className='tab'+(active?' active':'');
     btn.onclick=(idx=>()=>goto(idx))(i);btn.title=a+' \u2014 '+Math.round(pct*100)+'% scored';
     const fd=document.createElement('div');fd.className='tab-fill';
@@ -482,26 +457,26 @@ function exportExcel(){
   const dws=XLSX.utils.aoa_to_sheet(dd);dws['!cols']=[{wch:12},{wch:12},{wch:22},{wch:12},{wch:55}];XLSX.utils.book_append_sheet(wb,'Detailed Scores',dws);
   const sd=[['Agent Score Card \u2014 Summary'],[],['Agent','Stock Score','Stock Max','Stock %','Spec Score','Spec Max','Spec %','Industrial Score','Industrial Max','Industrial %','Connected Score','Connected Max','Connected %','TOTAL Score','TOTAL Max','Overall %']];
   AGENTS.forEach(a=>{const st=segScore(a,'stock'),sp=segScore(a,'spec'),ind=segScore(a,'industrial'),con=segScore(a,'connected'),at=agentTotal(a);sd.push([a,st.total,st.max,Math.round(st.pct*100)+'%',sp.total,sp.max,Math.round(sp.pct*100)+'%',ind.total,ind.max,Math.round(ind.pct*100)+'%',con.total,con.max,Math.round(con.pct*100)+'%',at.total,at.max,Math.round(at.pct*100)+'%']);});
   sd.push([]);const tr2=['TEAM TOTAL'];['stock','spec','industrial','connected'].forEach(k=>{let t=0;AGENTS.forEach(a=>{t+=segScore(a,k).total;});tr2.push(t,MAX[k],Math.round(t/(AGENTS.length*MAX[k])*100)+'%');});
   const gT=AGENTS.reduce((acc,a)=>acc+agentTotal(a).total,0),gMx=AGENTS.length*(MAX.stock+MAX.spec+MAX.industrial+MAX.connected);tr2.push(gT,gMx,Math.round(gT/gMx*100)+'%');sd.push(tr2);
   const sws=XLSX.utils.aoa_to_sheet(sd);sws['!cols']=[{wch:14},{wch:11},{wch:10},{wch:9},{wch:10},{wch:9},{wch:8},{wch:15},{wch:13},{wch:12},{wch:14},{wch:13},{wch:12},{wch:12},{wch:10},{wch:10}];XLSX.utils.book_append_sheet(wb,'Summary',sws);
   const wbout=XLSX.write(wb,{bookType:'xlsx',type:'array'});
   const blob=new Blob([wbout],{type:'application/octet-stream'});
   const url=URL.createObjectURL(blob);
   const a=document.createElement('a');a.href=url;a.download='Agent_Score_Card_KPIs.xlsx';
   document.body.appendChild(a);a.click();
   setTimeout(()=>{document.body.removeChild(a);URL.revokeObjectURL(url);},200);
   toast('\u2713 Excel downloaded');
 }
 
 /* ── BOOT ── */
 (async function(){
   await loadFromServer();
   const ov=document.getElementById('loading-overlay');
   ov.classList.add('hidden');
   setTimeout(()=>{ov.style.display='none';},450);
   goto(0);setView('score');
 })();
 </script>
 </body>
-</html>
\ No newline at end of file
+</html>
 
EOF
)
