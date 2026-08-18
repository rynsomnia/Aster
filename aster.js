/*
 * Aster — manual starmap / galaxy cartographer
 * ------------------------------------------------------------
 * Aster.mount();                 // full-screen
 * Aster.mount('#container');     // into a sized, position:relative element
 * const app = Aster.mount(el);
 *   app.getState() / app.loadState(obj) / app.clear() / app.destroy()
 *   app.exportImage(4096)        // fitted PNG, long edge in px
 *
 * Self-contained: injects scoped CSS + builds its own DOM.
 * No native prompt()/confirm()/alert() (safe in sandboxed iframes).
 */
(function (global) {
  "use strict";

  var STYLE_ID = "aster-style";
  var CSS = `
  .aster{--void:#05060a;--panel:#0d1017;--panel-2:#131826;--line:#20283a;--ink:#c9d4e8;--ink-dim:#7c8aa6;
    --accent:#e8b45f;--accent-dim:#8a6d3a;--plasma:#4bd6e0;--danger:#e06b6b;
    --mono:ui-monospace,"SF Mono",Menlo,Consolas,"Roboto Mono",monospace;
    --sans:ui-sans-serif,system-ui,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
    position:relative;width:100%;height:100%;overflow:hidden;background:var(--void);color:var(--ink);
    font-family:var(--sans);-webkit-user-select:none;user-select:none}
  .aster *{box-sizing:border-box}
  .aster canvas.stage{position:absolute;inset:0;display:block;touch-action:none;cursor:crosshair;z-index:1}
  .aster canvas.overlay{position:absolute;inset:0;display:block;pointer-events:none;z-index:5}
  .aster.panning canvas.stage{cursor:grabbing}
  .aster.lane canvas.stage{cursor:cell}

  .aster .footer{position:absolute;left:50%;bottom:16px;transform:translateX(-50%);display:flex;align-items:center;gap:12px;
    background:linear-gradient(180deg,var(--panel-2),var(--panel));border:1px solid var(--line);border-radius:14px;padding:8px 12px;
    box-shadow:0 12px 40px rgba(0,0,0,.55);z-index:30;max-width:calc(100% - 20px)}
  .aster .seg{display:flex;background:#0a0d15;border:1px solid var(--line);border-radius:9px;overflow:hidden;flex:0 0 auto}
  .aster .seg button{appearance:none;border:0;background:transparent;color:var(--ink-dim);font-family:var(--mono);font-size:12px;
    letter-spacing:.08em;text-transform:uppercase;padding:8px 14px;cursor:pointer;transition:.15s}
  .aster .seg button.active{background:var(--accent);color:#1a1206;font-weight:600}
  .aster .seg button:not(.active):hover{color:var(--ink)}
  .aster .fdiv{width:1px;height:26px;background:var(--line);flex:0 0 auto}
  .aster .brush{display:flex;align-items:center;gap:7px;font-family:var(--mono);font-size:10px;color:var(--ink-dim);letter-spacing:.05em}
  .aster .brush.disabled{opacity:.35;pointer-events:none}
  .aster .brush .v{color:var(--accent);min-width:26px;text-align:right}
  .aster input[type=range]{-webkit-appearance:none;appearance:none;height:4px;border-radius:3px;background:var(--line);outline:none;width:84px}
  .aster input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;border-radius:50%;background:var(--accent);cursor:pointer;border:2px solid #1a1206}
  .aster input[type=range]::-moz-range-thumb{width:14px;height:14px;border-radius:50%;background:var(--accent);cursor:pointer;border:2px solid #1a1206}
  .aster .iconbtn{appearance:none;display:grid;place-items:center;width:36px;height:36px;background:#0a0d15;border:1px solid var(--line);
    border-radius:9px;color:var(--ink-dim);cursor:pointer;transition:.15s;flex:0 0 auto}
  .aster .iconbtn:hover{color:var(--accent);border-color:var(--accent-dim)}
  .aster .readout{font-family:var(--mono);font-size:10.5px;color:var(--ink-dim);letter-spacing:.05em;line-height:1.4;white-space:nowrap}
  .aster .readout b{color:var(--ink);font-weight:600}

  .aster .legend{position:absolute;top:16px;left:16px;z-index:25;background:linear-gradient(180deg,var(--panel-2),var(--panel));
    border:1px solid var(--line);border-radius:12px;width:224px;box-shadow:0 10px 34px rgba(0,0,0,.5);overflow:hidden}
  .aster .legend > header{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-bottom:1px solid var(--line)}
  .aster .brand{font-family:var(--mono);letter-spacing:.34em;font-size:13px;color:var(--accent);font-weight:600}
  .aster .brand small{display:block;letter-spacing:.14em;font-size:8.5px;color:var(--ink-dim);margin-top:2px}
  .aster .natList{max-height:44vh;overflow:auto;padding:5px}
  .aster .nat{display:flex;align-items:center;gap:7px;padding:4px 6px;border-radius:8px}
  .aster .nat:hover{background:#0a0d15}
  .aster .nat .swin{width:16px;height:16px;padding:0;border:1px solid var(--line);border-radius:5px;background:none;cursor:pointer;flex:0 0 auto}
  .aster .nat .nmin{flex:1;background:transparent;border:1px solid transparent;color:var(--ink);font-size:12.5px;padding:3px 5px;border-radius:5px;outline:none;min-width:0;font-family:var(--sans)}
  .aster .nat .nmin:hover{border-color:var(--line)} .aster .nat .nmin:focus{border-color:var(--accent-dim);background:#0a0d15}
  .aster .nat .ct{font-family:var(--mono);font-size:10px;color:var(--ink-dim);flex:0 0 auto}
  .aster .nat .delx{color:var(--ink-dim);cursor:pointer;font-size:12px;opacity:0;flex:0 0 auto;padding:0 2px}
  .aster .nat:hover .delx{opacity:.7} .aster .nat .delx:hover{color:var(--danger)}
  .aster .empty{padding:12px;color:var(--ink-dim);font-size:11.5px;line-height:1.5}
  .aster .addNat{width:100%;border:0;border-top:1px solid var(--line);background:transparent;color:var(--ink-dim);
    font-family:var(--mono);font-size:11px;letter-spacing:.08em;padding:9px;cursor:pointer}
  .aster .addNat:hover{color:var(--accent)}

  .aster .ctx{position:absolute;z-index:60;min-width:180px;background:linear-gradient(180deg,var(--panel-2),var(--panel));
    border:1px solid var(--line);border-radius:11px;box-shadow:0 16px 48px rgba(0,0,0,.6);overflow:hidden}
  .aster .ctx .row{display:flex;align-items:center;gap:8px;padding:9px 12px;cursor:pointer;font-size:13px;color:var(--ink)}
  .aster .ctx .row:hover{background:#0a0d15}
  .aster .ctx .row.danger{color:var(--danger)}
  .aster .ctx .row svg{opacity:.7}
  .aster .ctx .sep{height:1px;background:var(--line);margin:2px 0}
  .aster .ctx .ttl{font-family:var(--mono);font-size:10px;letter-spacing:.14em;color:var(--ink-dim);padding:9px 12px 4px;text-transform:uppercase}

  .aster .starEditor{width:252px;padding:0}
  .aster .starEditor .hd{display:flex;align-items:center;justify-content:space-between;padding:11px 12px;border-bottom:1px solid var(--line)}
  .aster .starEditor .hd .id{font-family:var(--mono);font-size:11px;letter-spacing:.1em;color:var(--accent)}
  .aster .starEditor .hd .x{cursor:pointer;color:var(--ink-dim);font-size:16px;line-height:1}
  .aster .starEditor .bd{padding:11px 12px;display:flex;flex-direction:column;gap:11px}
  .aster .fld{display:flex;flex-direction:column;gap:5px}
  .aster .fld label{font-family:var(--mono);font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-dim)}
  .aster .fld input[type=text],.aster .fld textarea,.aster .fld select{background:#0a0d15;border:1px solid var(--line);border-radius:7px;
    color:var(--ink);font-family:var(--sans);font-size:13px;padding:7px 9px;outline:none;width:100%}
  .aster .fld input:focus,.aster .fld textarea:focus,.aster .fld select:focus{border-color:var(--accent-dim)}
  .aster .fld textarea{resize:vertical;min-height:48px;font-size:12px;line-height:1.4}
  .aster .swatches{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
  .aster .swatches .c{width:20px;height:20px;border-radius:6px;cursor:pointer;box-shadow:0 0 0 1px rgba(255,255,255,.1)}
  .aster .swatches .c.sel{box-shadow:0 0 0 2px var(--accent)}
  .aster input[type=color]{width:26px;height:26px;padding:0;border:1px solid var(--line);border-radius:6px;background:none;cursor:pointer}
  .aster .btnrow{display:flex;gap:8px}
  .aster .btn{flex:1;appearance:none;border:1px solid var(--line);background:#0a0d15;color:var(--ink);font-family:var(--mono);
    font-size:11px;letter-spacing:.06em;padding:8px;border-radius:7px;cursor:pointer;transition:.15s}
  .aster .btn:hover{border-color:var(--accent-dim);color:var(--accent)}
  .aster .btn.warn:hover{border-color:var(--danger);color:var(--danger)}

  .aster .scrim{position:absolute;inset:0;background:rgba(2,3,6,.66);backdrop-filter:blur(3px);z-index:80;display:none}
  .aster .scrim.show{display:block}
  .aster .settings{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:90;width:min(470px,92%);
    max-height:88%;overflow:auto;display:none;background:linear-gradient(180deg,var(--panel-2),var(--panel));
    border:1px solid var(--line);border-radius:16px;box-shadow:0 24px 70px rgba(0,0,0,.7)}
  .aster .settings.show{display:block}
  .aster .settings .sh{display:flex;align-items:center;justify-content:space-between;padding:16px 18px;border-bottom:1px solid var(--line)}
  .aster .settings .sh h2{margin:0;font-family:var(--mono);font-size:14px;letter-spacing:.2em;color:var(--accent);font-weight:600}
  .aster .settings .sb{padding:6px 18px 18px}
  .aster .sgroup{padding:14px 0;border-bottom:1px solid var(--line)}
  .aster .sgroup:last-child{border-bottom:0}
  .aster .sgroup h3{margin:0 0 10px;font-family:var(--mono);font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-dim)}
  .aster .set{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:6px 0}
  .aster .set .lbl{font-size:13px}
  .aster .set .lbl small{display:block;color:var(--ink-dim);font-size:10.5px;margin-top:1px}
  .aster .set .ctl{display:flex;align-items:center;gap:8px;flex:0 0 auto}
  .aster .num{width:72px;background:#0a0d15;border:1px solid var(--line);border-radius:7px;color:var(--ink);font-family:var(--mono);font-size:12px;padding:6px 8px;outline:none}
  .aster .num:focus{border-color:var(--accent-dim)}
  .aster .val{font-family:var(--mono);font-size:11px;color:var(--accent);min-width:34px;text-align:right}
  .aster .toggle{width:42px;height:24px;border-radius:13px;background:var(--line);position:relative;cursor:pointer;transition:.15s;flex:0 0 auto}
  .aster .toggle::after{content:"";position:absolute;top:2px;left:2px;width:20px;height:20px;border-radius:50%;background:#556;transition:.15s}
  .aster .toggle.on{background:var(--accent-dim)}
  .aster .toggle.on::after{left:20px;background:var(--accent)}
  .aster select.sel{background:#0a0d15;border:1px solid var(--line);border-radius:7px;color:var(--ink);font-family:var(--mono);font-size:12px;padding:6px 8px;outline:none}
  .aster .exgrid{display:flex;flex-wrap:wrap;gap:8px 14px;padding:2px 0 8px}
  .aster .exgrid label{display:flex;align-items:center;gap:6px;font-size:12.5px;color:var(--ink);cursor:pointer}
  .aster .exgrid input{accent-color:var(--accent);width:15px;height:15px}

  .aster .toasts{position:absolute;top:16px;left:50%;transform:translateX(-50%);z-index:100;display:flex;flex-direction:column;gap:8px;align-items:center;pointer-events:none}
  .aster .toast{background:var(--panel-2);border:1px solid var(--line);border-left:3px solid var(--accent);padding:9px 14px;border-radius:9px;
    font-size:12.5px;box-shadow:0 8px 26px rgba(0,0,0,.5);animation:aster-tin .2s ease}
  .aster .toast.err{border-left-color:var(--danger)}
  @keyframes aster-tin{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
  .aster .hint{position:absolute;bottom:76px;left:50%;transform:translateX(-50%);z-index:20;font-family:var(--mono);font-size:10.5px;
    letter-spacing:.05em;color:var(--ink-dim);background:rgba(10,13,21,.7);border:1px solid var(--line);border-radius:20px;padding:6px 14px;white-space:nowrap}
  .aster .hint b{color:var(--ink)}
  @media (max-width:820px){.aster .readout{display:none}.aster .legend{width:180px}.aster .hint{display:none}}
  `;

  var GEAR = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';

  function injectStyle(){ if(document.getElementById(STYLE_ID))return; var st=document.createElement("style"); st.id=STYLE_ID; st.textContent=CSS; document.head.appendChild(st); }

  function buildDOM(root){
    root.classList.add("aster");
    root.innerHTML = `
      <canvas class="stage"></canvas>
      <canvas class="overlay"></canvas>
      <aside class="legend">
        <header><div class="brand">ASTER<small>STARMAP CARTOGRAPHER</small></div></header>
        <div class="natList" data-r="natList"></div>
        <button class="addNat" data-r="addNat">+ new nation</button>
      </aside>
      <div class="footer">
        <div class="seg" data-r="modeSeg"><button data-mode="star" class="active">Stars</button><button data-mode="lane">Lanes</button></div>
        <div class="fdiv"></div>
        <div class="brush" data-r="brushWrap">
          <span>RADIUS</span><input type="range" data-r="brush" min="6" max="220" step="2" value="40"><span class="v" data-r="brushVal">40</span>
          <span style="margin-left:4px">SPACING</span><input type="range" data-r="spacing" min="4" max="120" step="2" value="18"><span class="v" data-r="spacingVal">18</span>
        </div>
        <div class="fdiv"></div>
        <div class="readout" data-r="readout"></div>
        <div class="fdiv"></div>
        <button class="iconbtn" data-r="settingsBtn" title="Settings">${GEAR}</button>
      </div>
      <div class="hint" data-r="hint"></div>
      <div class="scrim" data-r="scrim"></div>
      <div class="settings" data-r="settings">
        <div class="sh"><h2>SETTINGS</h2><span class="x iconbtn" data-r="closeSettings" style="border:0;background:none;font-size:18px">&#10005;</span></div>
        <div class="sb">
          <div class="sgroup"><h3>Export image</h3>
            <div class="exgrid" data-r="exgrid">
              <label><input type="checkbox" data-x="bg" checked> Background</label>
              <label><input type="checkbox" data-x="lanes" checked> Hyperlanes</label>
              <label><input type="checkbox" data-x="borders" checked> Nation borders</label>
              <label><input type="checkbox" data-x="hole" checked> Black hole</label>
              <label><input type="checkbox" data-x="labels"> Star names</label>
            </div>
            <div class="set"><div class="lbl">Resolution<small>Fitted to your star bounds</small></div><div class="ctl">
              <button class="btn" data-res="1024" style="flex:0 0 auto">1K</button>
              <button class="btn" data-res="2048" style="flex:0 0 auto">2K</button>
              <button class="btn" data-res="4096" style="flex:0 0 auto">4K</button>
            </div></div>
          </div>
          <div class="sgroup"><h3>Appearance</h3>
            <div class="set"><div class="lbl">Background<small>Canvas void color</small></div><div class="ctl"><input type="color" data-r="setBg" value="#05060a"></div></div>
            <div class="set"><div class="lbl">Backdrop starfield</div><div class="ctl"><div class="toggle on" data-r="setStarfield"></div></div></div>
            <div class="set"><div class="lbl">Overlay</div><div class="ctl"><select class="sel" data-r="setOverlay">
              <option value="none">None</option><option value="grid">Coordinate grid</option><option value="nebula">Nebula wash</option><option value="vignette">Vignette</option>
            </select></div></div>
            <div class="set"><div class="lbl">Overlay opacity</div><div class="ctl"><input type="range" data-r="setOverlayOp" min="0" max="100" value="50"><span class="val" data-r="setOverlayOpV">50%</span></div></div>
          </div>
          <div class="sgroup"><h3>Hyperlanes</h3>
            <div class="set"><div class="lbl">Max connections<small>Per star</small></div><div class="ctl"><input type="number" class="num" data-r="setMaxConn" min="1" max="12" value="4"></div></div>
            <div class="set"><div class="lbl">Lane min<small>Skip pairs closer than this</small></div><div class="ctl"><input type="number" class="num" data-r="setLaneMin" min="0" max="2000" value="40"></div></div>
            <div class="set"><div class="lbl">Lane max<small>Skip pairs farther than this</small></div><div class="ctl"><input type="number" class="num" data-r="setLaneMax" min="20" max="4000" value="220"></div></div>
          </div>
          <div class="sgroup"><h3>Nation borders</h3>
            <div class="set"><div class="lbl">Influence radius<small>Territory reach per star</small></div><div class="ctl"><input type="number" class="num" data-r="setInflu" min="30" max="900" value="130"></div></div>
            <div class="set"><div class="lbl">Border threshold</div><div class="ctl"><input type="range" data-r="setThresh" min="5" max="60" value="18"><span class="val" data-r="setThreshV">.18</span></div></div>
            <div class="set"><div class="lbl">Smoothing<small>Higher = rounder borders</small></div><div class="ctl"><input type="range" data-r="setSmooth" min="0" max="4" value="2"><span class="val" data-r="setSmoothV">2</span></div></div>
          </div>
          <div class="sgroup"><h3>Map</h3>
            <div class="set"><div class="lbl">Reset view</div><div class="ctl"><button class="btn" data-r="resetView" style="flex:0 0 auto">Center</button></div></div>
            <div class="set"><div class="lbl">Save / load data<small>JSON project file</small></div><div class="ctl">
              <button class="btn" data-r="exportBtn" style="flex:0 0 auto">Save</button>
              <button class="btn" data-r="importBtn" style="flex:0 0 auto">Load</button>
              <input type="file" data-r="importFile" accept="application/json" hidden>
            </div></div>
            <div class="set"><div class="lbl">Clear map<small>Removes all stars, lanes, nations</small></div><div class="ctl"><button class="btn warn" data-r="clearMap" style="flex:0 0 auto">Clear</button></div></div>
          </div>
        </div>
      </div>
      <div class="toasts" data-r="toasts"></div>`;
    var refs={}; root.querySelectorAll("[data-r]").forEach(function(el){ refs[el.getAttribute("data-r")]=el; }); return refs;
  }

  function Instance(root){
    var refs = buildDOM(root);
    var cv = root.querySelector("canvas.stage"), ctx = cv.getContext("2d");
    var oc = root.querySelector("canvas.overlay"), octx = oc.getContext("2d");
    var W=0,H=0,DPR=1;

    var NATION_PALETTE=['#e0555f','#4f8ef0','#54c46a','#c47fe0','#e0a24f','#43c6c6','#e07fb0','#8fbf47','#6f77e0','#d06a3a'];
    var STAR_SWATCHES=['#dfe8ff','#ffe9b0','#ffc48a','#ff9d9d','#a8ffe0','#b8c6ff','#e6b8ff','#ffffff'];

    var view={scale:1,ox:0,oy:0};
    var settings={bg:'#05060a',starfield:true,overlay:'none',overlayOp:0.5,maxConn:4,laneMin:40,laneMax:220,influ:130,thresh:0.18,smooth:2,cell:14};
    var exp={bg:true,lanes:true,borders:true,hole:true,labels:false};
    var mode='star', brushRadius=40, spacingVal=18;

    var stars=[], lanes=[], nations=[];
    var starSeq=0,laneSeq=0,natSeq=0;
    var BH_R=26;

    var hoverStar=null, laneSource=null, cursorWorld={x:0,y:0}, cursorScreen={x:0,y:0}, brushVisible=false;
    var territory=null, territoryDirty=true, legendRows={};

    var backdrop=[];
    (function(){var s=987654321,r=function(){s=(s*1103515245+12345)&0x7fffffff;return s/0x7fffffff;};
      for(var i=0;i<620;i++) backdrop.push({x:(r()-.5)*6400,y:(r()-.5)*6400,b:0.12+r()*0.5,rr:r()<0.08?1.6:0.9});})();
    var nebulaBlobs=[{x:-700,y:-400,r:900,c:'120,80,200'},{x:600,y:500,r:1100,c:'40,120,180'},{x:200,y:-800,r:800,c:'150,60,120'},{x:-500,y:700,r:700,c:'40,150,140'}];

    var sx=function(wx){return wx*view.scale+view.ox;}, sy=function(wy){return wy*view.scale+view.oy;};
    var wxAt=function(px){return (px-view.ox)/view.scale;}, wyAt=function(py){return (py-view.oy)/view.scale;};
    function localXY(e){ var r=cv.getBoundingClientRect(); return {x:e.clientX-r.left,y:e.clientY-r.top}; }

    function resize(){ DPR=Math.min(2,window.devicePixelRatio||1);
      var nW=root.clientWidth||window.innerWidth, nH=root.clientHeight||window.innerHeight;
      if(W){view.ox+=(nW-W)/2;view.oy+=(nH-H)/2;} else {view.ox=nW/2;view.oy=nH/2;}
      W=nW;H=nH;
      [cv,oc].forEach(function(c){c.width=W*DPR;c.height=H*DPR;c.style.width=W+'px';c.style.height=H+'px';});
      scheduleDraw(); drawOverlay();
    }

    var dist2=function(ax,ay,bx,by){var dx=ax-bx,dy=ay-by;return dx*dx+dy*dy;};
    var starById=function(id){return stars.find(function(s){return s.id===id;});};
    var connCount=function(id){var c=0;for(var i=0;i<lanes.length;i++)if(lanes[i].a===id||lanes[i].b===id)c++;return c;};
    var laneExists=function(a,b){return lanes.some(function(l){return (l.a===a&&l.b===b)||(l.a===b&&l.b===a);});};
    function hexA(hex,a){hex=(hex||'#888').replace('#','');if(hex.length===3)hex=hex.split('').map(function(c){return c+c;}).join('');
      var n=parseInt(hex,16);return 'rgba('+((n>>16)&255)+','+((n>>8)&255)+','+(n&255)+','+a+')';}
    function escapeHtml(s){return (s||'').replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
    function toast(msg,err){var t=document.createElement('div');t.className='toast'+(err?' err':'');t.textContent=msg;
      refs.toasts.appendChild(t);setTimeout(function(){t.style.opacity='0';t.style.transition='.3s';setTimeout(function(){t.remove();},300);},1900);}

    // ---------- territory ----------
    function computeTerritory(){
      var realNats=nations.filter(function(n){return stars.some(function(s){return s.nationId===n.id;});});
      if(!realNats.length){territory=null;return;}
      var R=settings.influ,R2=R*R,cell=settings.cell,thr=settings.thresh;
      var hasNeutral=stars.some(function(s){return s.nationId==null;});
      var groups=realNats.map(function(n){return {nid:n.id,color:n.color,real:true};});
      if(hasNeutral) groups.push({nid:'__neutral',color:null,real:false});
      var minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
      stars.forEach(function(s){if(s.x<minX)minX=s.x;if(s.y<minY)minY=s.y;if(s.x>maxX)maxX=s.x;if(s.y>maxY)maxY=s.y;});
      minX-=R;minY-=R;maxX+=R;maxY+=R;
      var cols=Math.max(2,Math.ceil((maxX-minX)/cell)+1), rows=Math.max(2,Math.ceil((maxY-minY)/cell)+1);
      if(cols*rows>260000){territory=null;return;}
      var best=new Float32Array(cols*rows), owner=new Int32Array(cols*rows).fill(-1), temp=new Float32Array(cols*rows);
      for(var gi=0;gi<groups.length;gi++){ temp.fill(0); var gnid=groups[gi].nid;
        for(var si=0;si<stars.length;si++){ var s=stars[si]; var sn=s.nationId==null?'__neutral':s.nationId; if(sn!==gnid)continue;
          var c0=Math.max(0,Math.floor((s.x-R-minX)/cell)),c1=Math.min(cols-1,Math.ceil((s.x+R-minX)/cell));
          var r0=Math.max(0,Math.floor((s.y-R-minY)/cell)),r1=Math.min(rows-1,Math.ceil((s.y+R-minY)/cell));
          for(var r=r0;r<=r1;r++){var cy=minY+r*cell; for(var c=c0;c<=c1;c++){var cx=minX+c*cell; var d2=(cx-s.x)*(cx-s.x)+(cy-s.y)*(cy-s.y);
            if(d2<R2){var f=1-d2/R2;f*=f;temp[r*cols+c]+=f;}}}
        }
        for(var i=0;i<temp.length;i++){if(temp[i]>best[i]){best[i]=temp[i];owner[i]=gi;}}
      }
      var contours=[];
      for(var g=0;g<groups.length;g++){ if(!groups[g].real)continue;
        contours.push({color:groups[g].color, loops:stitch(marching(g)).map(function(p){return chaikin(p,settings.smooth);})}); }
      territory={contours:contours};

      function marching(gi){ var segs=[];
        function m(r,c){ if(r<0||c<0||r>=rows||c>=cols)return 0; var i=r*cols+c; return (best[i]>=thr&&owner[i]===gi)?1:0; }
        function P(kx,ky){ return {key:kx+'_'+ky,x:minX+kx*0.5*cell,y:minY+ky*0.5*cell}; }
        for(var r=-1;r<rows;r++)for(var c=-1;c<cols;c++){
          var tl=m(r,c),tr=m(r,c+1),br=m(r+1,c+1),bl=m(r+1,c),cs=(tl<<3)|(tr<<2)|(br<<1)|bl; if(cs===0||cs===15)continue;
          var rr=r,cc=c;
          var T=function(){return P(2*cc+1,2*rr);},Rr=function(){return P(2*cc+2,2*rr+1);},B=function(){return P(2*cc+1,2*rr+2);},L=function(){return P(2*cc,2*rr+1);};
          var add=function(a,b){segs.push({a:a(),b:b()});};
          switch(cs){case 1:add(L,B);break;case 2:add(B,Rr);break;case 3:add(L,Rr);break;case 4:add(T,Rr);break;
            case 5:add(T,L);add(B,Rr);break;case 6:add(T,B);break;case 7:add(T,L);break;case 8:add(T,L);break;
            case 9:add(T,B);break;case 10:add(T,Rr);add(B,L);break;case 11:add(T,Rr);break;case 12:add(L,Rr);break;
            case 13:add(B,Rr);break;case 14:add(B,L);break;}
        } return segs;
      }
      function stitch(segs){ var adj=new Map(),coord=new Map();
        function ek(a,b){return a<b?a+'|'+b:b+'|'+a;}
        segs.forEach(function(s){var ka=s.a.key,kb=s.b.key;coord.set(ka,{x:s.a.x,y:s.a.y});coord.set(kb,{x:s.b.x,y:s.b.y});
          if(!adj.has(ka))adj.set(ka,[]);if(!adj.has(kb))adj.set(kb,[]);adj.get(ka).push(kb);adj.get(kb).push(ka);});
        var used=new Set(),loops=[];
        segs.forEach(function(s){var e0=ek(s.a.key,s.b.key);if(used.has(e0))return;used.add(e0);
          var start=s.a.key,prev=start,cur=s.b.key,pts=[coord.get(start),coord.get(cur)],guard=0;
          while(guard++<100000){var neigh=adj.get(cur)||[],moved=false;
            for(var k=0;k<neigh.length;k++){var nb=neigh[k],e=ek(cur,nb);if(used.has(e))continue;if(nb===prev&&neigh.length>1)continue;
              used.add(e);pts.push(coord.get(nb));prev=cur;cur=nb;moved=true;break;}
            if(!moved||cur===start)break;}
          if(pts.length>2)loops.push(pts);});
        return loops;
      }
      function chaikin(pts,iters){var p=pts.slice();
        for(var k=0;k<iters;k++){var q=[],n=p.length;
          for(var i=0;i<n;i++){var a=p[i],b=p[(i+1)%n];q.push({x:a.x*0.75+b.x*0.25,y:a.y*0.75+b.y*0.25});q.push({x:a.x*0.25+b.x*0.75,y:a.y*0.25+b.y*0.75});}
          p=q;}
        return p;}
    }

    // generic contour drawer usable for screen + export
    function paintContours(g, mapx, mapy, lw){
      if(!territory)return;
      g.save(); g.lineJoin='round'; g.lineCap='round';
      territory.contours.forEach(function(cn){ var path=new Path2D();
        cn.loops.forEach(function(lp){ if(lp.length<2)return; path.moveTo(mapx(lp[0].x),mapy(lp[0].y));
          for(var i=1;i<lp.length;i++) path.lineTo(mapx(lp[i].x),mapy(lp[i].y)); path.closePath(); });
        g.fillStyle=hexA(cn.color,0.15); g.fill(path,'evenodd');
        g.strokeStyle=hexA(cn.color,0.13); g.lineWidth=lw*3; g.stroke(path);
        g.strokeStyle=hexA(cn.color,0.9); g.lineWidth=lw; g.stroke(path);
      }); g.restore();
    }

    // ---------- screen render ----------
    function drawBackground(){ ctx.setTransform(DPR,0,0,DPR,0,0); ctx.fillStyle=settings.bg; ctx.fillRect(0,0,W,H);
      if(settings.overlay==='nebula')drawNebula(); if(settings.overlay==='grid')drawGrid(); if(settings.starfield)drawStarfield(); }
    function drawStarfield(){ ctx.save(); backdrop.forEach(function(p){var x=sx(p.x),y=sy(p.y);if(x<-4||x>W+4||y<-4||y>H+4)return;
      ctx.globalAlpha=p.b;ctx.fillStyle='#cdd9f2';ctx.beginPath();ctx.arc(x,y,p.rr,0,7);ctx.fill();}); ctx.restore(); }
    function drawGrid(){ ctx.save();ctx.globalAlpha=settings.overlayOp*0.5;ctx.strokeStyle='#2a3550';ctx.lineWidth=1;
      var step=100*view.scale;if(step<8){ctx.restore();return;}while(step<60)step*=2;var ox=view.ox%step,oy=view.oy%step;ctx.beginPath();
      for(var x=ox;x<W;x+=step){ctx.moveTo(x,0);ctx.lineTo(x,H);}for(var y=oy;y<H;y+=step){ctx.moveTo(0,y);ctx.lineTo(W,y);}ctx.stroke();ctx.restore();}
    function drawNebula(){ ctx.save();ctx.globalAlpha=settings.overlayOp;nebulaBlobs.forEach(function(b){var x=sx(b.x),y=sy(b.y),r=b.r*view.scale;
      var g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'rgba('+b.c+',0.28)');g.addColorStop(1,'rgba('+b.c+',0)');
      ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,7);ctx.fill();});ctx.restore();}
    function drawVignette(){ ctx.save();ctx.globalAlpha=settings.overlayOp;
      var g=ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*0.35,W/2,H/2,Math.max(W,H)*0.75);
      g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,0.85)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);ctx.restore();}

    function drawLanes(){ ctx.save();ctx.lineWidth=Math.max(1,1.2*Math.pow(view.scale,0.4));
      lanes.forEach(function(l){var a=starById(l.a),b=starById(l.b);if(!a||!b)return;var ax=sx(a.x),ay=sy(a.y),bx=sx(b.x),by=sy(b.y);
        var g=ctx.createLinearGradient(ax,ay,bx,by);g.addColorStop(0,'rgba(75,214,224,0.55)');g.addColorStop(.5,'rgba(75,214,224,0.22)');g.addColorStop(1,'rgba(75,214,224,0.55)');
        ctx.strokeStyle=g;ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.stroke();});ctx.restore();}

    function drawBlackHole(g,X,Y,scl){ var x=X(0),y=Y(0),r=BH_R*scl; g.save();
      var gr=g.createRadialGradient(x,y,r*0.9,x,y,r*3.4);gr.addColorStop(0,'rgba(232,180,95,0.55)');gr.addColorStop(0.3,'rgba(226,120,60,0.28)');gr.addColorStop(1,'rgba(226,120,60,0)');
      g.fillStyle=gr;g.beginPath();g.arc(x,y,r*3.4,0,7);g.fill();
      g.strokeStyle='rgba(255,214,150,0.85)';g.lineWidth=Math.max(1.5,r*0.09);g.beginPath();g.arc(x,y,r*1.12,0,7);g.stroke();
      g.fillStyle='#000';g.beginPath();g.arc(x,y,r,0,7);g.fill();g.strokeStyle='rgba(60,50,40,0.8)';g.lineWidth=1;g.stroke();g.restore();}

    var starScreenR=function(){return Math.max(2.2,3.0*Math.pow(view.scale,0.55));};
    function drawStars(){
      var R=starScreenR(), many=stars.length>1200, showLabels=view.scale>0.85&&!many;
      ctx.save();
      if(many){ // crisp points, no per-star gradient (scales to thousands)
        for(var i=0;i<stars.length;i++){var s=stars[i],x=sx(s.x),y=sy(s.y);if(x<-4||x>W+4||y<-4||y>H+4)continue;
          ctx.fillStyle=s.color;ctx.beginPath();ctx.arc(x,y,R*0.8,0,7);ctx.fill();}
      } else {
        stars.forEach(function(s){var x=sx(s.x),y=sy(s.y);if(x<-30||x>W+30||y<-30||y>H+30)return;
          var g=ctx.createRadialGradient(x,y,0,x,y,R*3.2);g.addColorStop(0,s.color);g.addColorStop(0.25,hexA(s.color,0.5));g.addColorStop(1,hexA(s.color,0));
          ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,R*3.2,0,7);ctx.fill();
          ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(x,y,R*0.55,0,7);ctx.fill();
          ctx.globalAlpha=0.9;ctx.fillStyle=s.color;ctx.beginPath();ctx.arc(x,y,R,0,7);ctx.fill();ctx.globalAlpha=1;
          if(showLabels&&s.name){ctx.font='11px ui-monospace, Menlo, monospace';ctx.fillStyle='rgba(201,212,232,0.85)';ctx.textAlign='center';ctx.fillText(s.name,x,y+R*3.6+4);}
        });
      }
      if(hoverStar&&hoverStar.name){ctx.font='11px ui-monospace, Menlo, monospace';ctx.fillStyle='rgba(201,212,232,0.9)';ctx.textAlign='center';ctx.fillText(hoverStar.name,sx(hoverStar.x),sy(hoverStar.y)+R*3.6+4);}
      ctx.restore();
    }

    function drawMain(){ if(territoryDirty&&!painting){computeTerritory();territoryDirty=false;}
      drawBackground(); paintContours(ctx,sx,sy,2); drawLanes(); drawBlackHole(ctx,sx,sy,view.scale); drawStars();
      if(settings.overlay==='vignette')drawVignette(); }

    // ---------- overlay (cursor / preview) ----------
    function drawOverlay(){ octx.setTransform(DPR,0,0,DPR,0,0); octx.clearRect(0,0,W,H);
      var R=starScreenR();
      if(laneSource){var s=starById(laneSource);if(s){ring(octx,sx(s.x),sy(s.y),R*2.1,'#4bd6e0');
        var tx=hoverStar?sx(hoverStar.x):cursorScreen.x,ty=hoverStar?sy(hoverStar.y):cursorScreen.y;
        octx.save();octx.setLineDash([5,5]);octx.strokeStyle='rgba(75,214,224,0.6)';octx.lineWidth=1.4;octx.beginPath();octx.moveTo(sx(s.x),sy(s.y));octx.lineTo(tx,ty);octx.stroke();octx.restore();}}
      if(hoverStar) ring(octx,sx(hoverStar.x),sy(hoverStar.y),R*2.0,'#e8b45f');
      if(mode==='star'&&brushVisible&&!panning){ octx.save();octx.setLineDash([4,4]);octx.strokeStyle='rgba(232,180,95,0.5)';octx.lineWidth=1.2;
        octx.beginPath();octx.arc(cursorScreen.x,cursorScreen.y,brushRadius*view.scale,0,7);octx.stroke();octx.restore(); }
      function ring(g,x,y,rr,col){g.strokeStyle=col;g.lineWidth=1.6;g.beginPath();g.arc(x,y,rr,0,7);g.stroke();}
    }

    var needsDraw=true, rafId=0, alive=true, painting=false;
    function scheduleDraw(){needsDraw=true;}
    function markTerritory(){territoryDirty=true;scheduleDraw();updateReadout();updateLegendCounts();}
    (function loop(){if(!alive)return;if(needsDraw){needsDraw=false;drawMain();}rafId=requestAnimationFrame(loop);})();

    // ---------- picking ----------
    function pickStar(px,py,tol){var R=starScreenR(),lim=R*1.6+(tol||8),best=null,bd=lim*lim;
      for(var i=0;i<stars.length;i++){var s=stars[i],dx=sx(s.x)-px,dy=sy(s.y)-py,d=dx*dx+dy*dy;if(d<bd){bd=d;best=s;}}return best;}
    function ptSeg(px,py,ax,ay,bx,by){var dx=bx-ax,dy=by-ay,L=dx*dx+dy*dy||1;var t=((px-ax)*dx+(py-ay)*dy)/L;t=Math.max(0,Math.min(1,t));
      var x=ax+t*dx,y=ay+t*dy,ex=px-x,ey=py-y;return ex*ex+ey*ey;}
    function laneHit(px,py,tol){tol=tol||8;var best=null,bd=tol*tol;
      lanes.forEach(function(l){var a=starById(l.a),b=starById(l.b);if(!a||!b)return;var d=ptSeg(px,py,sx(a.x),sy(a.y),sx(b.x),sy(b.y));if(d<bd){bd=d;best=l;}});return best;}

    // ---------- ops ----------
    function canPlace(wx,wy,gap){if(dist2(wx,wy,0,0)<(BH_R+8)*(BH_R+8))return false;var g=gap*gap;
      for(var i=0;i<stars.length;i++)if(dist2(wx,wy,stars[i].x,stars[i].y)<g)return false;return true;}
    function addStar(wx,wy){var s={id:'s'+(++starSeq),x:wx,y:wy,name:'',color:'#dfe8ff',notes:'',nationId:null};stars.push(s);return s;}
    function deleteStar(id){var i=stars.findIndex(function(s){return s.id===id;});if(i<0)return;stars.splice(i,1);
      for(var k=lanes.length-1;k>=0;k--)if(lanes[k].a===id||lanes[k].b===id)lanes.splice(k,1);markTerritory();}
    function addLane(a,b){if(a===b)return{ok:false};if(laneExists(a,b))return{ok:false,msg:'Lane already exists'};
      var A=starById(a),B=starById(b);if(!A||!B)return{ok:false};
      if(Math.sqrt(dist2(A.x,A.y,B.x,B.y))>settings.laneMax)return{ok:false,msg:'Beyond lane max distance'};
      if(connCount(a)>=settings.maxConn)return{ok:false,msg:'Source at max connections'};
      if(connCount(b)>=settings.maxConn)return{ok:false,msg:'Target at max connections'};
      lanes.push({id:'l'+(++laneSeq),a:a,b:b});return{ok:true};}
    function generateForStar(id){var s=starById(id);if(!s)return 0;
      var cand=stars.filter(function(o){return o.id!==id;}).map(function(o){return {o:o,d:Math.sqrt(dist2(s.x,s.y,o.x,o.y))};})
        .filter(function(c){return c.d>=settings.laneMin&&c.d<=settings.laneMax;}).sort(function(a,b){return a.d-b.d;});
      var made=0;for(var i=0;i<cand.length;i++){if(connCount(id)>=settings.maxConn)break;if(addLane(id,cand[i].o.id).ok)made++;}return made;}
    function generateNetwork(){var pairs=[];
      for(var i=0;i<stars.length;i++)for(var j=i+1;j<stars.length;j++){var d=Math.sqrt(dist2(stars[i].x,stars[i].y,stars[j].x,stars[j].y));
        if(d>=settings.laneMin&&d<=settings.laneMax)pairs.push({a:stars[i].id,b:stars[j].id,d:d});}
      pairs.sort(function(x,y){return x.d-y.d;});var made=0;
      pairs.forEach(function(p){if(connCount(p.a)>=settings.maxConn||connCount(p.b)>=settings.maxConn)return;if(addLane(p.a,p.b).ok)made++;});return made;}

    function createNation(name){var n={id:'n'+(++natSeq),name:name||('Nation '+natSeq),color:NATION_PALETTE[(natSeq-1)%NATION_PALETTE.length]};nations.push(n);return n;}
    function deleteNation(id){var i=nations.findIndex(function(n){return n.id===id;});if(i<0)return;nations.splice(i,1);
      stars.forEach(function(s){if(s.nationId===id)s.nationId=null;});buildLegend();markTerritory();}

    // ---------- legend ----------
    function buildLegend(){var list=refs.natList;list.innerHTML='';legendRows={};
      if(!nations.length){list.innerHTML='<div class="empty">No nations yet. Add one below, or assign a star to a nation by right-clicking it.</div>';return;}
      nations.forEach(function(n){var row=document.createElement('div');row.className='nat';
        var col=document.createElement('input');col.type='color';col.className='swin';col.value=/^#([0-9a-f]{6})$/i.test(n.color)?n.color:'#888888';col.oninput=function(){n.color=col.value;markTerritory();};
        var nm=document.createElement('input');nm.type='text';nm.className='nmin';nm.value=n.name;nm.placeholder='Nation name';nm.oninput=function(){n.name=nm.value;};
        var ct=document.createElement('span');ct.className='ct';
        var del=document.createElement('span');del.className='delx';del.textContent='\u2715';del.title='Delete nation';del.onclick=function(){deleteNation(n.id);};
        row.append(col,nm,ct,del);list.appendChild(row);legendRows[n.id]={ct:ct};});
      updateLegendCounts();}
    function updateLegendCounts(){nations.forEach(function(n){var r=legendRows[n.id];if(r)r.ct.textContent=stars.filter(function(s){return s.nationId===n.id;}).length+'\u2605';});}
    refs.addNat.onclick=function(){createNation();buildLegend();var el=refs.natList.querySelector('.nat:last-child .nmin');if(el){el.focus();el.select();}};

    function updateReadout(){refs.readout.innerHTML='STARS <b>'+stars.length+'</b> · LANES <b>'+lanes.length+'</b><br>NATIONS <b>'+nations.length+'</b> · ZOOM <b>'+Math.round(view.scale*100)+'%</b>';}

    // ---------- pointer ----------
    var spaceDown=false, panning2=false, panStart=null, lastChunk=null;
    function paintChunk(cx,cy){var R=brushRadius,gap=spacingVal,area=Math.PI*R*R;
      var attempts=Math.min(500,Math.max(1,Math.round(area/(gap*gap)*1.4))),placed=false;
      for(var i=0;i<attempts;i++){var a=Math.random()*6.283,rr=R*Math.sqrt(Math.random());var px=cx+Math.cos(a)*rr,py=cy+Math.sin(a)*rr;
        if(canPlace(px,py,gap)){addStar(px,py);placed=true;}}
      if(placed){scheduleDraw();updateReadout();updateLegendCounts();}}

    function onDown(e){cv.setPointerCapture(e.pointerId);var L=localXY(e);cursorScreen=L;var wx=wxAt(L.x),wy=wyAt(L.y);
      if(e.button===1||(e.button===0&&spaceDown)){panning2=true;panStart={x:L.x,y:L.y,ox:view.ox,oy:view.oy};root.classList.add('panning');drawOverlay();return;}
      if(e.button!==0)return;
      if(mode==='star'){painting=true;lastChunk={x:wx,y:wy};paintChunk(wx,wy);}
      else{var hit=pickStar(L.x,L.y,16);
        if(hit){if(laneSource===hit.id){laneSource=null;}else{if(laneSource){var r=addLane(laneSource,hit.id);if(r.ok)updateReadout();else if(r.msg)toast(r.msg,true);}laneSource=hit.id;}}
        else laneSource=null; drawOverlay();}
    }
    function onMove(e){var L=localXY(e);cursorScreen=L;var wx=wxAt(L.x),wy=wyAt(L.y);cursorWorld={x:wx,y:wy};brushVisible=true;
      if(panning2&&panStart){view.ox=panStart.ox+(L.x-panStart.x);view.oy=panStart.oy+(L.y-panStart.y);scheduleDraw();drawOverlay();updateReadout();return;}
      if(painting){var R=brushRadius;if(!lastChunk||Math.hypot(wx-lastChunk.x,wy-lastChunk.y)>=R*0.55){paintChunk(wx,wy);lastChunk={x:wx,y:wy};}}
      var h=pickStar(L.x,L.y,12);if(h!==hoverStar)hoverStar=h;
      drawOverlay();
    }
    function onUp(){if(panning2){panning2=false;root.classList.remove('panning');}
      if(painting){painting=false;lastChunk=null;markTerritory();} drawOverlay();}
    function onLeave(){brushVisible=false;drawOverlay();}
    function onWheel(e){e.preventDefault();var L=localXY(e);cursorScreen=L;
      var ns=Math.max(0.05,Math.min(8,view.scale*Math.exp(-e.deltaY*0.0015))),k=ns/view.scale;
      view.ox=L.x-(L.x-view.ox)*k;view.oy=L.y-(L.y-view.oy)*k;view.scale=ns;scheduleDraw();drawOverlay();updateReadout();}
    cv.addEventListener('pointerdown',onDown);cv.addEventListener('pointermove',onMove);
    cv.addEventListener('pointerup',onUp);cv.addEventListener('pointercancel',onUp);cv.addEventListener('pointerleave',onLeave);
    cv.addEventListener('wheel',onWheel,{passive:false});

    // ---------- context menus ----------
    var openCtx=null;
    function closeCtx(){if(openCtx){openCtx.remove();openCtx=null;}}
    function onDocDown(e){if(openCtx&&!openCtx.contains(e.target))closeCtx();}
    document.addEventListener('pointerdown',onDocDown,true);
    function onCtxMenu(e){e.preventDefault();closeCtx();var L=localXY(e);
      var star=pickStar(L.x,L.y,14);if(star){openStarEditor(star,L.x,L.y);return;}
      var lane=laneHit(L.x,L.y,8);if(lane){var i=lanes.indexOf(lane);if(i>=0)lanes.splice(i,1);updateReadout();scheduleDraw();toast('Lane deleted');return;}
      openSpaceMenu(wxAt(L.x),wyAt(L.y),L.x,L.y);}
    cv.addEventListener('contextmenu',onCtxMenu);

    function placeMenu(m,x,y){root.appendChild(m);openCtx=m;var r=m.getBoundingClientRect();var px=x,py=y;
      if(px+r.width>W-8)px=W-r.width-8;if(py+r.height>H-8)py=H-r.height-8;m.style.left=Math.max(8,px)+'px';m.style.top=Math.max(8,py)+'px';}
    function ic(k){var p={plus:'M12 5v14M5 12h14',link:'M9 15l6-6M8 7h-2a4 4 0 0 0 0 8h2M16 17h2a4 4 0 0 0 0-8h-2',x:'M6 6l12 12M18 6L6 18'}[k];
      return '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="'+p+'"/></svg>';}

    function openSpaceMenu(wx,wy,px,py){var m=document.createElement('div');m.className='ctx';
      m.innerHTML='<div class="ttl">Deep space</div>'+
        '<div class="row" data-a="add">'+ic('plus')+' Add star here</div>'+
        '<div class="row" data-a="net">'+ic('link')+' Generate hyperlanes</div>'+
        '<div class="sep"></div><div class="row danger" data-a="clearlanes">'+ic('x')+' Clear all lanes</div>';
      m.querySelector('[data-a=add]').onclick=function(){if(canPlace(wx,wy,8)){addStar(wx,wy);markTerritory();}else toast('Too close to a star or the black hole',true);closeCtx();};
      m.querySelector('[data-a=net]').onclick=function(){var n=generateNetwork();toast(n?('Generated '+n+' hyperlane'+(n>1?'s':'')):'No new lanes within limits');updateReadout();scheduleDraw();closeCtx();};
      m.querySelector('[data-a=clearlanes]').onclick=function(){lanes.length=0;updateReadout();scheduleDraw();closeCtx();};
      placeMenu(m,px,py);}
    function openStarEditor(s,px,py){var m=document.createElement('div');m.className='ctx starEditor';
      m.innerHTML='<div class="hd"><span class="id">STAR '+s.id.toUpperCase()+'</span><span class="x">\u2715</span></div>'+
        '<div class="bd">'+
        '<div class="fld"><label>Name</label><input type="text" data-e="name" value="'+escapeHtml(s.name)+'" placeholder="Unnamed system"></div>'+
        '<div class="fld"><label>Color</label><div class="swatches" data-e="sw"></div></div>'+
        '<div class="fld"><label>Nation</label><select data-e="nat"></select></div>'+
        '<div class="fld"><label>Notes</label><textarea data-e="notes" placeholder="System notes\u2026">'+escapeHtml(s.notes)+'</textarea></div>'+
        '<button class="btn" data-e="gen">Generate lanes for this star</button>'+
        '<div class="btnrow"><button class="btn warn" data-e="del">Delete star</button><button class="btn" data-e="close">Done</button></div></div>';
      var swWrap=m.querySelector('[data-e=sw]');
      STAR_SWATCHES.forEach(function(col){var c=document.createElement('span');c.className='c'+(col.toLowerCase()===s.color.toLowerCase()?' sel':'');c.style.background=col;
        c.onclick=function(){s.color=col;swWrap.querySelectorAll('.c').forEach(function(x){x.classList.remove('sel');});c.classList.add('sel');picker.value=col;scheduleDraw();};swWrap.appendChild(c);});
      var picker=document.createElement('input');picker.type='color';picker.value=/^#([0-9a-f]{6})$/i.test(s.color)?s.color:'#dfe8ff';
      picker.oninput=function(){s.color=picker.value;swWrap.querySelectorAll('.c').forEach(function(x){x.classList.remove('sel');});scheduleDraw();};swWrap.appendChild(picker);
      var sel=m.querySelector('[data-e=nat]');
      function fillSel(){sel.innerHTML=['<option value="">— None —</option>']
        .concat(nations.map(function(n){return '<option value="'+n.id+'" '+(s.nationId===n.id?'selected':'')+'>'+escapeHtml(n.name)+'</option>';}))
        .concat('<option value="__new">+ New nation…</option>').join('');}
      fillSel();
      sel.onchange=function(e){var v=e.target.value;if(v==='__new'){var n=createNation();s.nationId=n.id;buildLegend();fillSel();toast('Nation created — rename it in the legend');}else s.nationId=v||null;markTerritory();};
      m.querySelector('.x').onclick=closeCtx;m.querySelector('[data-e=close]').onclick=closeCtx;
      m.querySelector('[data-e=name]').oninput=function(e){s.name=e.target.value;scheduleDraw();};
      m.querySelector('[data-e=notes]').oninput=function(e){s.notes=e.target.value;};
      m.querySelector('[data-e=gen]').onclick=function(){var n=generateForStar(s.id);toast(n?('Generated '+n+' lane'+(n>1?'s':'')):'No lanes within limits');updateReadout();scheduleDraw();};
      m.querySelector('[data-e=del]').onclick=function(){deleteStar(s.id);closeCtx();};
      m.addEventListener('pointerdown',function(e){e.stopPropagation();});
      placeMenu(m,px,py);}

    // ---------- footer / mode ----------
    refs.modeSeg.addEventListener('click',function(e){var b=e.target.closest('button');if(b)setMode(b.dataset.mode);});
    var HINTS={star:'Brush stars \u00b7 Right-click a star to edit \u00b7 Wheel zoom \u00b7 Space / middle-drag to pan',
               lane:'Click stars in order to chain-connect \u00b7 Right-click a lane to delete \u00b7 Esc ends the chain'};
    function setMode(m){mode=m;laneSource=null;
      refs.modeSeg.querySelectorAll('button').forEach(function(x){x.classList.toggle('active',x.dataset.mode===m);});
      root.classList.toggle('lane',m==='lane');refs.brushWrap.classList.toggle('disabled',m!=='star');
      refs.hint.innerHTML=HINTS[m];scheduleDraw();drawOverlay();}
    refs.brush.oninput=function(){brushRadius=+refs.brush.value;refs.brushVal.textContent=brushRadius;drawOverlay();};
    refs.spacing.oninput=function(){spacingVal=+refs.spacing.value;refs.spacingVal.textContent=spacingVal;};

    // ---------- settings ----------
    refs.settingsBtn.onclick=function(){refs.scrim.classList.add('show');refs.settings.classList.add('show');};
    function closeSettings(){refs.scrim.classList.remove('show');refs.settings.classList.remove('show');}
    refs.closeSettings.onclick=closeSettings;refs.scrim.onclick=closeSettings;
    refs.setBg.oninput=function(e){settings.bg=e.target.value;scheduleDraw();};
    refs.setStarfield.onclick=function(e){settings.starfield=!settings.starfield;e.currentTarget.classList.toggle('on',settings.starfield);scheduleDraw();};
    refs.setOverlay.onchange=function(e){settings.overlay=e.target.value;scheduleDraw();};
    refs.setOverlayOp.oninput=function(e){settings.overlayOp=+e.target.value/100;refs.setOverlayOpV.textContent=e.target.value+'%';scheduleDraw();};
    refs.setMaxConn.onchange=function(e){settings.maxConn=Math.max(1,+e.target.value||4);};
    refs.setLaneMin.onchange=function(e){settings.laneMin=Math.max(0,+e.target.value||0);};
    refs.setLaneMax.onchange=function(e){settings.laneMax=Math.max(20,+e.target.value||220);};
    refs.setInflu.onchange=function(e){settings.influ=Math.max(30,+e.target.value||130);settings.cell=Math.max(6,Math.min(40,Math.round(settings.influ/9)));markTerritory();};
    refs.setThresh.oninput=function(e){settings.thresh=+e.target.value/100;refs.setThreshV.textContent=settings.thresh.toFixed(2).replace(/^0/,'');markTerritory();};
    refs.setSmooth.oninput=function(e){settings.smooth=+e.target.value;refs.setSmoothV.textContent=settings.smooth;markTerritory();};
    refs.resetView.onclick=function(){fitView();};
    refs.exgrid.querySelectorAll('input[data-x]').forEach(function(cb){cb.checked=exp[cb.getAttribute('data-x')];cb.onchange=function(){exp[cb.getAttribute('data-x')]=cb.checked;};});
    refs.settings.querySelectorAll('button[data-res]').forEach(function(b){b.onclick=function(){exportImage(+b.getAttribute('data-res'));};});

    var clearArm=false,clearTimer=null;
    refs.clearMap.onclick=function(){
      if(!clearArm){clearArm=true;refs.clearMap.textContent='Confirm?';clearTimer=setTimeout(function(){clearArm=false;refs.clearMap.textContent='Clear';},3000);return;}
      clearTimeout(clearTimer);clearArm=false;refs.clearMap.textContent='Clear';
      stars.length=0;lanes.length=0;nations.length=0;starSeq=laneSeq=natSeq=0;hoverStar=null;laneSource=null;painting=false;
      buildLegend();markTerritory();drawOverlay();toast('Map cleared');};

    function getState(){return {version:2,settings:settings,view:{scale:view.scale},stars:stars,lanes:lanes,nations:nations,seq:{starSeq:starSeq,laneSeq:laneSeq,natSeq:natSeq}};}
    function loadState(d){try{stars.length=0;lanes.length=0;nations.length=0;
      (d.stars||[]).forEach(function(s){stars.push(s);});(d.lanes||[]).forEach(function(l){lanes.push(l);});(d.nations||[]).forEach(function(n){nations.push(n);});
      Object.assign(settings,d.settings||{});
      if(d.seq){starSeq=d.seq.starSeq||stars.length;laneSeq=d.seq.laneSeq||lanes.length;natSeq=d.seq.natSeq||nations.length;}
      syncSettingsUI();buildLegend();markTerritory();fitView();return true;}catch(err){return false;}}
    refs.exportBtn.onclick=function(){var blob=new Blob([JSON.stringify(getState(),null,2)],{type:'application/json'});
      var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='aster-map.json';a.click();setTimeout(function(){URL.revokeObjectURL(a.href);},1000);};
    refs.importBtn.onclick=function(){refs.importFile.click();};
    refs.importFile.onchange=function(e){var f=e.target.files[0];if(!f)return;var rd=new FileReader();
      rd.onload=function(){try{var ok=loadState(JSON.parse(rd.result));toast(ok?'Map loaded':'Could not read that file',!ok);if(ok)closeSettings();}catch(err){toast('Could not read that file',true);}};
      rd.readAsText(f);e.target.value='';};
    function syncSettingsUI(){refs.setBg.value=settings.bg;refs.setStarfield.classList.toggle('on',settings.starfield);
      refs.setOverlay.value=settings.overlay;refs.setOverlayOp.value=Math.round(settings.overlayOp*100);refs.setOverlayOpV.textContent=Math.round(settings.overlayOp*100)+'%';
      refs.setMaxConn.value=settings.maxConn;refs.setLaneMin.value=settings.laneMin;refs.setLaneMax.value=settings.laneMax;refs.setInflu.value=settings.influ;
      refs.setThresh.value=Math.round(settings.thresh*100);refs.setThreshV.textContent=settings.thresh.toFixed(2).replace(/^0/,'');
      refs.setSmooth.value=settings.smooth;refs.setSmoothV.textContent=settings.smooth;}

    // ---------- fit view to content ----------
    function contentBounds(pad){ if(!stars.length) return null;
      var minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
      stars.forEach(function(s){if(s.x<minX)minX=s.x;if(s.y<minY)minY=s.y;if(s.x>maxX)maxX=s.x;if(s.y>maxY)maxY=s.y;});
      var w=Math.max(1,maxX-minX),h=Math.max(1,maxY-minY),p=pad!=null?pad:(0.06*Math.max(w,h)+20);
      return {minX:minX-p,minY:minY-p,maxX:maxX+p,maxY:maxY+p,w:w+2*p,h:h+2*p};}
    function fitView(){var b=contentBounds();if(!b){view.scale=1;view.ox=W/2;view.oy=H/2;}else{
      var s=Math.min(W/b.w,H/b.h);view.scale=Math.max(0.05,Math.min(8,s));
      view.ox=W/2-(b.minX+b.w/2)*view.scale;view.oy=H/2-(b.minY+b.h/2)*view.scale;}
      scheduleDraw();drawOverlay();updateReadout();}

    // ---------- image export (fitted PNG) ----------
    function exportImage(res){
      if(!stars.length){toast('Place some stars first',true);return;}
      if(territoryDirty){computeTerritory();territoryDirty=false;}
      var b=contentBounds();var scale=res/Math.max(b.w,b.h);
      var outW=Math.max(1,Math.round(b.w*scale)),outH=Math.max(1,Math.round(b.h*scale));
      var c=document.createElement('canvas');c.width=outW;c.height=outH;var g=c.getContext('2d');
      var EX=function(wx){return (wx-b.minX)*scale;},EY=function(wy){return (wy-b.minY)*scale;};
      if(exp.bg){g.fillStyle=settings.bg;g.fillRect(0,0,outW,outH);}
      if(exp.borders&&territory) paintContours(g,EX,EY,Math.max(1.2,scale*1.6));
      if(exp.lanes){g.lineCap='round';g.lineWidth=Math.max(0.6,scale*0.5);
        lanes.forEach(function(l){var a=starById(l.a),bb=starById(l.b);if(!a||!bb)return;
          g.strokeStyle='rgba(75,214,224,0.45)';g.beginPath();g.moveTo(EX(a.x),EY(a.y));g.lineTo(EX(bb.x),EY(bb.y));g.stroke();});}
      if(exp.hole){var hx=EX(0),hy=EY(0),hr=Math.max(2,BH_R*scale);
        var gr=g.createRadialGradient(hx,hy,hr*0.9,hx,hy,hr*3);gr.addColorStop(0,'rgba(232,180,95,0.5)');gr.addColorStop(1,'rgba(226,120,60,0)');
        g.fillStyle=gr;g.beginPath();g.arc(hx,hy,hr*3,0,7);g.fill();g.fillStyle='#000';g.beginPath();g.arc(hx,hy,hr,0,7);g.fill();
        g.strokeStyle='rgba(255,214,150,0.85)';g.lineWidth=Math.max(1,hr*0.12);g.beginPath();g.arc(hx,hy,hr*1.1,0,7);g.stroke();}
      var starR=Math.max(1,res/1800);
      stars.forEach(function(s){g.fillStyle=s.color;g.beginPath();g.arc(EX(s.x),EY(s.y),starR,0,7);g.fill();});
      if(exp.labels){g.font=Math.max(9,scale*7)+'px ui-monospace, Menlo, monospace';g.fillStyle='rgba(201,212,232,0.8)';g.textAlign='center';
        stars.forEach(function(s){if(s.name)g.fillText(s.name,EX(s.x),EY(s.y)-starR*2.5);});}
      var done=function(url){var a=document.createElement('a');a.href=url;a.download='aster-map-'+outW+'x'+outH+'.png';a.click();
        setTimeout(function(){try{URL.revokeObjectURL(url);}catch(e){}},1500);toast('Exported '+outW+'\u00d7'+outH+' PNG');};
      if(c.toBlob) c.toBlob(function(blob){done(URL.createObjectURL(blob));},'image/png'); else done(c.toDataURL('image/png'));
    }

    // ---------- keyboard ----------
    function onKeyDown(e){if(e.target.matches&&e.target.matches('input,textarea,select'))return;
      if(e.code==='Space'){spaceDown=true;root.classList.add('panning');e.preventDefault();}
      else if(e.key==='s'||e.key==='S')setMode('star');
      else if(e.key==='l'||e.key==='L')setMode('lane');
      else if(e.key==='f'||e.key==='F')fitView();
      else if(e.key==='Escape'){closeCtx();closeSettings();laneSource=null;scheduleDraw();drawOverlay();}
      else if(e.key==='Delete'||e.key==='Backspace'){if(hoverStar){deleteStar(hoverStar.id);hoverStar=null;drawOverlay();}}}
    function onKeyUp(e){if(e.code==='Space'){spaceDown=false;if(!panning2)root.classList.remove('panning');}}
    window.addEventListener('keydown',onKeyDown);window.addEventListener('keyup',onKeyUp);

    // ---------- lifecycle ----------
    var ro=null;if(window.ResizeObserver){ro=new ResizeObserver(function(){resize();});ro.observe(root);}
    window.addEventListener('resize',resize);
    resize();buildLegend();updateReadout();setMode('star');

    return { root:root, getState:getState, loadState:loadState, exportImage:exportImage, fitView:fitView,
      clear:function(){stars.length=0;lanes.length=0;nations.length=0;starSeq=laneSeq=natSeq=0;hoverStar=null;laneSource=null;buildLegend();markTerritory();drawOverlay();},
      destroy:function(){alive=false;cancelAnimationFrame(rafId);document.removeEventListener('pointerdown',onDocDown,true);
        window.removeEventListener('keydown',onKeyDown);window.removeEventListener('keyup',onKeyUp);window.removeEventListener('resize',resize);
        if(ro)ro.disconnect();root.innerHTML='';root.classList.remove('aster','lane','panning');} };
  }

  var Aster={mount:function(target){injectStyle();var el;
    if(!target){el=document.createElement('div');el.style.cssText='position:fixed;inset:0';document.body.appendChild(el);}
    else if(typeof target==='string'){el=document.querySelector(target);} else {el=target;}
    if(!el)throw new Error('Aster.mount: target not found');return Instance(el);}};
  if(typeof module!=='undefined'&&module.exports)module.exports=Aster;
  global.Aster=Aster;
})(typeof window!=='undefined'?window:this);
