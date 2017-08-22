/**
Constant values
*/
const SIZE_CANVAS_X = 600;
const SIZE_CANVAS_Y = 600;

let SCX_INNER = SIZE_CANVAS_X * 0.9;
let SCX_OUTER = SIZE_CANVAS_X * 0.1;
let SCY_INNER = SIZE_CANVAS_Y * 0.9;
let SCY_OUTER = SIZE_CANVAS_Y * 0.1;

const HALFX = SIZE_CANVAS_X / 2;
const HALFY = SIZE_CANVAS_Y / 2;
const NO_SITES = 1 << 5;

//canvasses
let ctx = undefined;
let ctx2 = undefined;

let angle1 = 0;
let angle2 = Math.PI;
let radius = 100;
let a = 0;
let tdir = SIZE_CANVAS_X / 2 + 120;

let testsites = undefined;

window.onload = function() {
  init();
  initTest();
  y = 0;
  timerId = undefined;
};

function init() {
  if (document == null) {
    alert("document is null");
    return null;
  }
  var canvas = document.getElementById("sites");
  if (typeof canvas === "undefined" || canvas == null) {
    alert("Canvas is undefined " + canvas);
  }
  var tcanvas = document.getElementById("tree");
  if (typeof tcanvas === "undefined" || tcanvas == null) {
    alert("TCanvas is undefined " + tcanvas);
  }
  ctx = canvas.getContext("2d");
  ctx2 = tcanvas.getContext("2d");
  return true;
}

document.getElementById("pause").onclick = function() {
  if (timerId) {
    pause()
  } else {
    timerId = window.setInterval(drawAnimation, 3);
  }
}

function pause() {
  window.clearInterval(timerId)
  timerId = undefined;
  document.getElementById("pause").text = "unpause"
}

document.getElementById("next").onclick = function() {
  drawAnimation();
}

function initTest() {
  if (!testsites) {
    testsites = [];
    for (let i = 0; i < NO_SITES; i++) {
      testsites[i] = new Site({
        x: Math.round(Math.random() * SCX_INNER + SCX_OUTER),
        y: Math.round(Math.random() * SCY_INNER + SCY_OUTER)
      });
    }
    let bla = [];
    testsites.forEach(s => bla += `${s},`);
    console.log(bla);
    initVoronoi(testsites);
  }
}

Site.prototype.draw = function(color = "red") {
  drawPoint(this, color, 5);
}

CircleEvent.prototype.draw = function(color = "blue") {
  drawCircle(this.p.x, this.p.y, this.r, color);
  drawPoint({
    x: this.x,
    y: this.y
  }, "green", 3);
}

ParabolaAhk.prototype.draw = function(xl, xr, color) {
  drawPoint({
    x: xl,
    y: this.valuex(xl)
  }, "orange", 8);
  for (let x = xl; x < xr; x++) {
    let y = this.valuex(x);
    if (y < 0) {
      continue;
    }
    drawPoint({
      x: x,
      y: y
    }, color, 0.5);
  }
  drawPoint({
    x: xr,
    y: this.valuex(xr)
  }, "DarkMagenta", 8);
}

DegenParabolaAhk.prototype.draw = function(xl, xr, color) {}

BeachlineSegment.prototype.drawBeachlineSegment = function(color = "blue") {
  let next = this.next;
  let prev = this.prev;
  let stp = 0;
  let bp = SIZE_CANVAS_X - 1;
  if (prev) {
    stp = Math.max(0, chooseRight(prev.sitepoint, this.sitepoint));
  }
  if (next) {
    bp = Math.min(chooseRight(this.sitepoint, next.sitepoint), SIZE_CANVAS_X -
      1);
  }
  console.log(`BL ${stp} to ${bp}`);
  drawParabola(this.sitepoint, sweepy, stp, bp, color);
}

//////////////////////////////////////////////////////////////////
// drawing stuff
//////////////////////////////////////////////////////////////////
function drawAnimation() {
  if (pqueue.length == 0) {
    // testsites = undefined;
    initTest();
    initVoronoi(testsites
      //   testsites.map(s => {
      //   return {
      //     x: s.x,
      //     y: s.y + 500
      //   };
      // })
    );
  }
  drawVoronoi();
}

function drawVoronoi() {
  bpt = calcVoronoi(bpt);
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, SIZE_CANVAS_X, SIZE_CANVAS_Y);
  ctx2.fillStyle = "white";
  ctx2.fillRect(0, 0, SIZE_CANVAS_X, SIZE_CANVAS_Y);
  drawTree(bpt, {
    x: 300,
    y: 50
  }, 150, ctx2);
  drawBeachline();
  bpt.checkSanity();
  sites.forEach(c => {
    drawPoint(c, "red", 4);
    ctx.fillStyle = "black";
    ctx.fillText(c.toString(), c.x + 10, c.y + 5)
  });
  if (lastEvent) lastEvent.draw();
  drawLineOnCanvas({
    x: 0,
    y: sweepy
  }, {
    x: SIZE_CANVAS_X,
    y: sweepy
  }, "grey");
  // drawPoint(v.coord, "yellow", 8);
  for (var v of vertices.values()) {
    let nextV = v.halfEdge.twin.vertex;
    if (nextV) {
      drawLineOnCanvas(v.coord, nextV.coord);
    }

    let currEdge = endMark = v.halfEdge;
    while (currEdge && currEdge.next) {
      let v1 = currEdge.vertex;
      let v2 = currEdge.next.vertex;
      drawLineOnCanvas(v1.coord, v2.coord);
      currEdge = currEdge.next;
      if (endMark.id == currEdge.id) break;
    }
  };
}

function drawBeachline() {
  let curr = blsFirst;
  while (curr) {
    curr.drawBeachlineSegment();
    curr = curr.next;
  }
}

function drawParabola(site, sweepy, xl, xr, color = "red") {
  let p = getParabolaFromFokusAndDir(site, sweepy);
  drawPoint({
    x: xl,
    y: p.valuex(xl)
  }, "orange", 4);
  for (let x = xl; x < xr; x++) {
    let y = p.valuex(x);
    if (y < 0) {
      continue;
    }
    drawPoint({
      x: x,
      y: y
    }, color, 0.5);
  }
  drawPoint({
    x: xr,
    y: p.valuex(xr)
  }, "DarkMagenta", 2);
}

function drawLineOnCanvas(p1, p2, col = "black", canvas = ctx) {
  canvas.save();
  canvas.beginPath();
  canvas.strokeStyle = col;
  canvas.moveTo(p1.x, p1.y);
  canvas.lineTo(p2.x, p2.y);
  canvas.stroke();
  canvas.closePath();
  canvas.restore();
}

function drawPoint(p, col, size = 1, canvas = ctx) {
  canvas.save();
  canvas.beginPath();
  canvas.arc(p.x, p.y, size, 0, 2 * Math.PI, false);
  canvas.fillStyle = col;
  canvas.fill();
  canvas.stroke();
  canvas.closePath();
  canvas.restore();
}

function drawVoronoiCircle(point, col) {
  let d = minDistToSite(point);
  drawCircle(point.x, point.y, d);
}

function drawCircle(x, y, r, col = "black") {
  ctx.save();
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, 2 * Math.PI);
  ctx.stroke();
  ctx.restore();
  drawPoint({
    x: x,
    y: y
  }, "red");
}

/////////////////////////////////
// test, obsolete, unused and obscure
let parabolaAbc = function(a, b, c) {
  this.a = a;
  this.b = b;
  this.c = c;

  this.valuex = function(x) {
    return this.a * (this.x * this.x) + this.b * this.x + this.c;
  }
}

function parabolaResearch() {
  drawLineOnCanvas({
    x: 0,
    y: tdir
  }, {
    x: SIZE_CANVAS_X,
    y: tdir
  }, "grey");
  let p1 = {
    x: Math.cos(angle1 + a) * radius + SIZE_CANVAS_X / 2,
    y: Math.sin(angle1 + a) * radius + SIZE_CANVAS_Y / 2
  };
  let p2 = {
    x: Math.cos(angle2 + a) * radius + SIZE_CANVAS_X / 2,
    y: Math.sin(angle2 + a) * radius + SIZE_CANVAS_Y / 2
  };

  let zw = {
    x: Math.min(p1.x, p2.x) + Math.abs(p2.x - p1.x) / 2,
    y: Math.min(p1.y, p2.y) + Math.abs(p2.y - p1.y) / 2
  };

  drawPoint(p1, "green", 3);
  drawPoint(p2, "orange", 3);
  drawPoint(zw, "blue", 3);

  drawParabola(p1, tdir, 0, SIZE_CANVAS_X)
  drawParabola(p2, tdir, 0, SIZE_CANVAS_X)

  let i = findIntersect(p1, p2, tdir);
  let dp = getParabolaFromFokusAndDir(p1, tdir);
  drawPoint({
    x: i.l,
    y: dp.valuex(i.l)
  }, "orange", 6);
  drawPoint({
    x: i.r,
    y: dp.valuex(i.r)
  }, "green", 6);
  drawLineOnCanvas({
      x: i.l,
      y: dp.valuex(i.l)
    }, {
      x: i.r,
      y: dp.valuex(i.r)
    },
    "black");
}

let p21 = {
  x: Math.round(Math.random() * SIZE_CANVAS_X),
  y: Math.round(Math.random() * HALFY) + HALFY
};
let p22 = {
  x: Math.round(Math.random() * SIZE_CANVAS_X),
  y: Math.round(Math.random() * HALFY) + HALFY
};
let tdir2 = Math.max(p21.y, p22.y);

function parabolaResearch2() {
  drawLineOnCanvas({
    x: 0,
    y: tdir2
  }, {
    x: SIZE_CANVAS_X,
    y: tdir2
  }, "grey");

  let zw = {
    x: Math.min(p21.x, p22.x) + Math.abs(p22.x - p21.x) / 2,
    y: Math.min(p21.y, p22.y) + Math.abs(p22.y - p21.y) / 2
  };

  drawPoint(p21, "green", 3);
  drawPoint(p22, "orange", 3);
  drawPoint(zw, "blue", 3);

  drawParabola(p21, tdir2, 0, SIZE_CANVAS_X)
  drawParabola(p22, tdir2, 0, SIZE_CANVAS_X)

  let i = findIntersect(p21, p22, tdir2);
  let dp = getParabolaFromFokusAndDir(p21, tdir2);
  drawPoint({
    x: i.l,
    y: dp.valuex(i.l)
  }, "orange", 6);
  drawPoint({
    x: i.r,
    y: dp.valuex(i.r)
  }, "green", 6);
  drawLineOnCanvas({
      x: i.l,
      y: dp.valuex(i.l)
    }, {
      x: i.r,
      y: dp.valuex(i.r)
    },
    "black");
}

// star function
function star(z) {
  return {
    x: z.x,
    y: z.y + minDistToSite(z)
  };
}

// star to point function
function starP(z, p) {
  return {
    x: z.x,
    y: z.y + distance(z, p)
  };
}

// dist to nearest site
function minDistToSite(point) {
  let minv = 9999999999;
  visiSites.forEach(s => {
    minv = Math.min(minv, distance(s, point));
  });
  return minv;
}

// nearest site to point
function nearSiteToPoint(point) {
  let minv = 9999999999;
  let nearSite = undefined;
  sites.forEach(s => {
    if (s.y < point.y) {
      return;
    }
    let d = distance(s, point);
    if (minv > d) {
      minv = d;
      nearSite = s;
    }
  });
  return nearSite;
}

testsites = [{
  x: 411,
  y: 91
}, {
  x: 298,
  y: 250
}, {
  x: 114,
  y: 106
}, {
  x: 241,
  y: 327
}, {
  x: 569,
  y: 391
}, {
  x: 476,
  y: 228
}, {
  x: 95,
  y: 214
}, {
  x: 110,
  y: 391
}, {
  x: 336,
  y: 266
}, {
  x: 208,
  y: 384
}, {
  x: 434,
  y: 127
}, {
  x: 262,
  y: 312
}, {
  x: 98,
  y: 310
}, {
  x: 554,
  y: 573
}, {
  x: 455,
  y: 228
}, {
  x: 129,
  y: 72
}, {
  x: 114,
  y: 147
}, {
  x: 569,
  y: 288
}, {
  x: 182,
  y: 370
}, {
  x: 471,
  y: 311
}, {
  x: 523,
  y: 72
}, {
  x: 482,
  y: 168
}, {
  x: 396,
  y: 595
}, {
  x: 213,
  y: 274
}, {
  x: 550,
  y: 393
}, {
  x: 190,
  y: 145
}, {
  x: 243,
  y: 149
}, {
  x: 223,
  y: 114
}, {
  x: 327,
  y: 241
}, {
  x: 360,
  y: 324
}, {
  x: 287,
  y: 105
}, {
  x: 115,
  y: 151
}]

// testsites = [
// 	{
// 		x: 391,
// 		y: 299
// 	}, {
// 		x: 461,
// 		y: 259
// 	}, {
// 		x: 147,
// 		y: 129
// 	}, {
// 		x: 439,
// 		y: 451
// 	}, {
// 		x: 216,
// 		y: 156
// 	}, {
// 		x: 488,
// 		y: 114
// 	}, {
// 		x: 155,
// 		y: 335
// 	}, {
// 		x: 528,
// 		y: 209
// 	}, {
// 		x: 301,
// 		y: 70
// 	}, {
// 		x: 151,
// 		y: 316
// 	}, {
// 		x: 91,
// 		y: 161
// 	}, {
// 		x: 308,
// 		y: 528
// 	}, {
// 		x: 79,
// 		y: 282
// 	}, {
// 		x: 427,
// 		y: 109
// 	}, {
// 		x: 340,
// 		y: 102
// 	}, {
// 		x: 65,
// 		y: 226
// 	}];

// testsites = [{
// 	x: 326,
// 	y: 465
// }, {
// 	x: 238,
// 	y: 461
// }, {
// 	x: 244,
// 	y: 530
// }, {
// 	x: 586,
// 	y: 498
// }, {
// 	x: 233,
// 	y: 121
// }, {
// 	x: 311,
// 	y: 528
// }, {
// 	x: 439,
// 	y: 60
// }, {
// 	x: 147,
// 	y: 576
// }];
