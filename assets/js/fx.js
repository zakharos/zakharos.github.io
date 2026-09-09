/* Portrait effects: depth-parallax (WebGL) and hover tilt on the profile photo.
 * Depth map: <photo basename>_depth.png next to the photo (near = white).
 * Respects prefers-reduced-motion; silently falls back to the flat photo. */
(function () {
  'use strict';
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function lerp(a, b, t) { return a + (b - a) * t; }

  function initDepth(figure, img) {
    var canvas, gl, raf, target = { x: 0, y: 0 }, cur = { x: 0, y: 0 }, idle = 0, ready = false;
    var pointer = null, visible = true;
    var VS = 'attribute vec2 p;varying vec2 v;void main(){v=vec2(p.x,1.0-p.y);gl_Position=vec4(p*2.0-1.0,0.0,1.0);}';
    var FS = 'precision mediump float;uniform sampler2D c,d;uniform vec2 o;uniform float s;varying vec2 v;' +
      'void main(){float z=texture2D(d,v).r-0.5;vec2 uv=clamp(v+o*z*s,0.001,0.999);gl_FragColor=texture2D(c,uv);}';

    function tex(unit, image) {
      var t = gl.createTexture();
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      return t;
    }
    function load(src) { return new Promise(function (res, rej) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = rej; i.src = src; }); }
    // Offset from the photo centre, saturating smoothly (tanh) so a far-away cursor
    // reads as a gentle turn rather than the maximum displacement. Vertical is damped:
    // horizontal parallax looks natural on a portrait, vertical stretches ears.
    function retarget() {
      if (!pointer) return;
      var r = figure.getBoundingClientRect();
      var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      target.x = Math.tanh((pointer.x - cx) / 520) * 0.85;
      target.y = Math.tanh((pointer.y - cy) / 520) * 0.45;
    }
    function onMove(e) { pointer = { x: e.clientX, y: e.clientY }; retarget(); idle = 0; }
    function onScroll() { retarget(); }
    function onOrient(e) {
      if (e.gamma == null) return;
      target.x = Math.max(-1, Math.min(1, e.gamma / 30));
      target.y = Math.max(-1, Math.min(1, (e.beta - 45) / 30));
      idle = 0;
    }
    function draw() {
      gl.uniform2f(gl.getUniformLocation(gl.program, 'o'), -cur.x, cur.y);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      if (!ready) { ready = true; canvas.style.opacity = '1'; img.style.visibility = 'hidden'; }
    }
    function frame(t) {
      raf = requestAnimationFrame(frame);
      idle += 1;
      var tx = target.x, ty = target.y;
      if (idle > 240) { tx = Math.sin(t / 2600) * 0.35; ty = Math.cos(t / 3400) * 0.2; } // idle drift
      if (!visible) { tx = 0; ty = 0; } // ease back to neutral while scrolled away
      cur.x = lerp(cur.x, tx, 0.08); cur.y = lerp(cur.y, ty, 0.08);
      if (visible || Math.abs(cur.x) + Math.abs(cur.y) > 0.002) draw();
    }
    function size() {
      var r = img.getBoundingClientRect();
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
      canvas.style.width = r.width + 'px'; canvas.style.height = r.height + 'px';
      canvas.style.borderRadius = getComputedStyle(img).borderRadius;
      gl.viewport(0, 0, canvas.width, canvas.height);
    }

    var src = img.getAttribute('src').split('?')[0];
    var depthSrc = src.replace(/\.(jpe?g|png|webp)$/i, '_depth.png');
    canvas = document.createElement('canvas');
    canvas.className = 'fx-depth-canvas';
    figure.appendChild(canvas);
    gl = canvas.getContext('webgl', { antialias: false, premultipliedAlpha: false });
    if (!gl) { canvas.remove(); return; }
    Promise.all([load(src), load(depthSrc)]).then(function (imgs) {
      var prog = gl.createProgram();
      [[gl.VERTEX_SHADER, VS], [gl.FRAGMENT_SHADER, FS]].forEach(function (s) {
        var sh = gl.createShader(s[0]); gl.shaderSource(sh, s[1]); gl.compileShader(sh); gl.attachShader(prog, sh);
      });
      gl.linkProgram(prog); gl.useProgram(prog); gl.program = prog;
      var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
      var loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      tex(0, imgs[0]); tex(1, imgs[1]);
      gl.uniform1i(gl.getUniformLocation(prog, 'c'), 0);
      gl.uniform1i(gl.getUniformLocation(prog, 'd'), 1);
      gl.uniform1f(gl.getUniformLocation(prog, 's'), 0.03);
      size();
      window.addEventListener('resize', size);
      if (reduceMotion) { draw(); return; }
      window.addEventListener('pointermove', onMove);
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('deviceorientation', onOrient);
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; }, { threshold: 0.05 }).observe(figure);
      }
      raf = requestAnimationFrame(frame);
    }).catch(function () { canvas.remove(); });
  }

  function initTilt(figure) {
    if (reduceMotion) return;
    figure.addEventListener('pointerenter', function () { figure.style.transition = 'transform 0.12s ease-out'; });
    figure.addEventListener('pointermove', function (e) {
      var r = figure.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      figure.style.transform = 'perspective(700px) rotateX(' + (-y * 8).toFixed(2) + 'deg) rotateY(' + (x * 8).toFixed(2) + 'deg) scale(1.02)';
    });
    figure.addEventListener('pointerleave', function () { figure.style.transition = 'transform 0.4s ease'; figure.style.transform = ''; });
  }

  function init() {
    var figure = document.querySelector('.profile figure');
    var img = figure && figure.querySelector('img');
    if (!img) return;
    initTilt(figure);
    initDepth(figure, img);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
