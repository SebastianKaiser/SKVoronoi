/**
Constant values
*/
const SIZE_CANVAS_X = 800;
const SIZE_CANVAS_Y = 800;
const NO_SITES = 1 << 3

/**
	Initializsation of stuff
*/
let ctx 		= undefined;
let points  = new Array();
let y       = 0;
let cs      = undefined;
let line 	  = undefined;
let sites   = new Array();
let pqueue  = new PriorityQueue({
	comparator: (s, r) => {
		let yd = s.y - r.y;
		if (yd == 0) {
			return s.x - r.x;
		}
		return yd;
	}
});


let angle1 = 0;
let angle2 = Math.PI;
let radius = 20;
let a = 0;
let tdir   = SIZE_CANVAS_X / 2 + 40;

document.getElementById("back").onclick = function() {
	a -= 0.05;
	if ( a <= 0 ) a = Math.PI;
	drawAnimation();
}

document.getElementById("next").onclick = function() {
	a += 0.05;
	if ( a >= Math.PI ) a = 0;
	drawAnimation();
}

window.onload = function() {
 	init()
 	y = 0;
 	// window.setInterval( drawAnimation, 200 );
};

function init() {
	if (document == null) {
		alert("document is null");
		window.clearInterval(active);
		return null;
	}
	var canvas = document.getElementById("forces");
	if (typeof canvas === "undefined" || canvas == null) {
		alert("Canvas is undefined " + canvas);
		window.clearInterval(active);
	}
	ctx = canvas.getContext("2d");
	return true;
}

/******************************************************
algorithm
*/
let Site = function(point) {
	this.x = point.x;
	this.y = point.y;
}

let CircleEvent = function(point, radius, ref) {
	this.p = point;
	this.x = point.x;
	this.y = point.y;
	this.r = radius;
	this.ref = ref;
}

let ParabolaAhk = function(a, h, k) {
	this.a = a;
	this.h = h;
	this.k = k;
}

ParabolaAhk.prototype.valuex = function(x) {
	return this.a * Math.pow(x - this.h, 2) + this.k
}

let DegenParabolaAhk = function(a, h, k) {
	this.a = a;
	this.h = h;
	this.k = k;
}

DegenParabolaAhk.prototype.valuex = function(x) {
	return Infinity;
}

DegenParabolaAhk.prototype.intersect = function(op) {
	if ( op instanceof DegenParabolaAhk )  {
		return undefined;
	} else {
		return {l: this.h, r: this.h}
	}
}

function intersect(p, op) {
	if( p instanceof DegenParabolaAhk ) {
		return {r: p.h, l: p.h};
	}
	if( op instanceof DegenParabolaAhk ) {
		return {r: op.h, l: op.h};
	}
	let ra = p.a - op.a;
	let rb = -2 * (p.a * p.h - op.a * op.h);
	let rc = (p.a * p.h * p.h - op.a * op.h * op.h) + (p.k - op.k);
	return rootsOfQuadratic(ra, rb, rc);
}

function rootsOfQuadratic(a, b, c) {
	if( a == 0 ) return { l: -c / b, r: -c / b };
	let d = Math.sqrt(b * b - 4 * a * c);
	let x1 = (-b + d) / (2 * a);
	let x2 = (-b - d) / (2 * a);
	return { l: x1,	r: x2	};
}

// clamp numbers between min and max
function clamp(num, min, max) {
	return num <= min ? min : num >= max ? max : num;
}

// barycentric coordinates
function bc(a, b, c) {
	return a * a * (b * b + c * c - a * a)
}

// calculate the center of the circumcircle of three points A, B, C
function circumVector(A, B, C) {
	let a = distance(B, C);
	let b = distance(C, A);
	let c = distance(A, B);
	let bca = bc(a, b, c);
	let bcb = bc(b, c, a);
	let bcc = bc(c, a, b);
	let n = bca + bcb + bcc;
	let z = {
		x: (A.x * bca + B.x * bcb + C.x * bcc) / n,
		y: (A.y * bca + B.y * bcb + C.y * bcc) / n
	};
	let r = distance(z, A);
	return { p: z, r: r };
}

// distance between two points
function distance(p, op) {
	let diffx = p.x - op.x;
	let diffy = p.y - op.y;
	return Math.sqrt(diffx * diffx + diffy * diffy);
}

function getParabolaFromFokusAndDir(focus, diry) {
	if ( focus.y === diry) {
		return new DegenParabolaAhk( 0, focus.x, (focus.y + diry) / 2 );
	}
	let a = 1 / (2 * (focus.y - diry));
	let h = focus.x;
	let k = (focus.y + diry) / 2;
	return new ParabolaAhk(a, h, k);
}

function findIntersect(site1, site2, sweepy) {
	let p1  = getParabolaFromFokusAndDir( site1, sweepy );
	let p2  = getParabolaFromFokusAndDir( site2, sweepy );
	let i		= 0;
	if ( site1.y < site2.y ) {
		i = intersect(p2, p1);
	} else {
		i = intersect(p2, p1);
	}
	return i;
}

let firstSite = undefined;

function initAlgorithm() {
	site = new Array();
	line = undefined;
	pqueue.clear();
	for (let i = 0; i < NO_SITES; i++) {
		sites[i] = new Site(
			new THREE.Vector2(
				Math.round(Math.random() * SIZE_CANVAS_X),
				Math.round(Math.random() * SIZE_CANVAS_Y)));
		pqueue.queue(sites[i]);
	}
}

let BlNode = function(v, p, n) {
	this.v = v;
	this.p = p;
	this.n = n;
};

let bl = undefined;

function calcVoronoi() {
	if (pqueue.length == 0) {
		initAlgorithm();
	}
	while ( pqueue.length > 0) {
		let e = pqueue.dequeue();
		let sweepy = e.y;
		if (e instanceof Site) {
			if (!bl) {
				bl		 	 = new BlNode(e, undefined, undefined);
			} else {
				let bps  = [];
				bps[0]   = { x: 0, pa: bl };
				let c = bl.n;
				for (let i = 1; c && c.n; c = c.n ) {
					bps[i] = { x: findIntersect( c, c.n, sweepy ).l,
										 pa: c };
					i += 1;
				}
				if (c) { 
					bps[bps.length] =  {x: SIZE_CANVAS_X, pa: c}
				};
				for (let i = 0; i < bps.length - 1; i += 1 ) {
					if( e.x > bps[i].x && e.x < bps[i+1].x ) {
						let nn = new BlNode(e, bps[i].pa, bps[i+1].pa);
						bps[i].pa.n 	 = nn;
						bps[i+1].pa.p  = nn;
					} // if( e.x > bps[i].x && e.x < bps[i+1].x )
				} // for (let i = 0; i < bps.length - 1; i += 1 )
			} // if (!bl) .. else
		} else if (e instanceof CircleEvent) {
			drawCircle(e.ref.x, e.ref.y, e.r)
		} // if (e instanceof Site) .. else ..
	} // while
}

/*****************************************
drawing stuff
*****************************************/
function drawLine(node, y) {
	if (node === undefined) return;
	if (node instanceof VBreakPoint ) {
		drawLine(node.left, y);
		drawLine(node.right, y);
	} else {
		drawPoint({x: node.x, y: y}, "blue", 10);
	}
}

function drawBeachline( sweepy ) {
	let x = 0;
	let node = firstSite;
	if( !node.next ) return;
	let i = 0;
	while( node && node.next ) {
		let bp = findIntersect(node, node.next, sweepy);
		drawParabola(node, sweepy, 0, SIZE_CANVAS_X);
		node = node.next;
		x = bp;
	}
}

function drawParabola(site, sweepy, xl, xr, color = "blue") {
	let p = getParabolaFromFokusAndDir(site, sweepy);
	for (let x = xl; x < xr; x++) {
		drawPoint({ x:x, y: p.valuex(x) }, color );
	}
}

function drawVoronoiCircle(point, col) {
	let d = minDistToSite(point);
	drawCircle(point.x, point.y, d);
}

function drawCircle(x, y, r, col = "black") {
	ctx.fillStyle = col;
	ctx.beginPath();
	ctx.arc(x, y, r, 0, 2 * Math.PI);
	ctx.stroke();
}

function drawLineOnCanvas(p1, p2, col) {
	ctx.beginPath();
	ctx.strokeStyle = col;
	ctx.moveTo(p1.x, p1.y);
	ctx.lineTo(p2.x, p2.y);
	ctx.stroke();
}

function drawAnimation() {
	ctx.fillStyle = "white";
	ctx.fillRect(0, 0, SIZE_CANVAS_X, SIZE_CANVAS_Y);
	parabolaResearch();
	calcVoronoi();
	sites.forEach(s => {
		drawPoint(s, "blue", 4);
	});
}

function drawPoint(p, col, size = 2) {
	ctx.fillStyle = col;
	ctx.fillRect(p.x, p.y, size, size);
}

function drawTree(node, cp, step) {
	if( !node ) return;
  drawPoint( cp, "green", 4 );
  if ( node.left ) {
    let np = { x: cp.x - step, y: cp.y + 30 };
	  drawLineOnCanvas( np, cp, "blue" );
    drawTree ( node.left, np, step / 3 );
  }
  if ( node.right ) {
    let np = { x: cp.x + step, y: cp.y + 30 };
    drawLineOnCanvas( np, cp, "red" );
    drawTree ( node.right, np, step / 3 );
  }
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
	drawLineOnCanvas({x: 0, y:tdir},{x: SIZE_CANVAS_X, y:tdir}, "grey");
	let p1 = { x: Math.cos(angle1 + a) * radius + SIZE_CANVAS_X / 2,
						 y: Math.sin(angle1 + a) * radius + SIZE_CANVAS_Y / 2 }
  let p2 = { x: Math.cos(angle2 + a) * radius + SIZE_CANVAS_X / 2,
			 		 	 y: Math.sin(angle2 + a) * radius + SIZE_CANVAS_Y / 2 }

	drawPoint( p1, "blue" );
	drawPoint( p2, "red" );

	drawParabola( p1, tdir, 0, SIZE_CANVAS_X )
	drawParabola( p2, tdir, 0, SIZE_CANVAS_X )

	let i  = findIntersect( p1, p2, tdir );
	let dp = getParabolaFromFokusAndDir( p1, tdir );
	drawPoint( {x: i.l, y: dp.valuex(i.l)}, "orange", 6);
	drawPoint( {x: i.r, y: dp.valuex(i.r)}, "green", 6);
}

function parabolaResearch2() {
		let p1 = { x: Math.cos(angle1 + a) * radius + SIZE_CANVAS_X / 2,
						 y: Math.sin(angle1 + a) * radius + SIZE_CANVAS_Y / 2 }
    let p2 = { x: Math.cos(angle2 + a) * radius + SIZE_CANVAS_X / 2,
				 		 y: Math.sin(angle2 + a) * radius + SIZE_CANVAS_Y / 2 }
	drawPoint( p1, "blue" );
	drawPoint( p2, "red" );
	let i = findIntersect( p1, p2, tdir );

	drawParabola( p1, tdir, 0, i.l );
	if ( i.l != i.r) {
		drawParabola( p2, tdir, i.l, i.r, "red" );
		drawParabola( p1, tdir, i.r, SIZE_CANVAS_X );
	} else {
		drawParabola( p2, tdir, i.r, SIZE_CANVAS_X, "red" );
	}

	let dp = getParabolaFromFokusAndDir( p1, tdir );
	drawPoint( {x: i.l, y: dp.valuex(i.l)}, "orange", 6);
	drawPoint( {x: i.r, y: dp.valuex(i.r)}, "green", 6);
}


function parabolaResearch3() {
	let paras = [];
	let no = 5;
	let step = SIZE_CANVAS_X / no;
	for ( let i = 0; i < 5; i += 1 ) {
		let x = Math.round( Math.random() * step ) + i * step;
		let y = Math.round( Math.random() * 20 ) + SIZE_CANVAS_Y / 2;
		paras[ i ] = { x: x, y: y };
	}

	let bps = [];
	let last = 0;
	for ( let i = 0; i < no - 1; i += 1 ) {
		let ci = chooseBp(paras[i], paras[i+1], tdir);
		bps[i] = { l: last, r: ci, p: paras[i] };
		last = bps[i].r;
	}
	bps[no-1] = {l: last, r: SIZE_CANVAS_X, p: paras[no-1]};

	drawLineOnCanvas({x: 0, y: tdir},{x: SIZE_CANVAS_X, y: tdir}, "yellow");
	for ( let i = 0; i < 5; i += 1 ) {
		drawParabola( bps[i].p, tdir, 0, SIZE_CANVAS_X, "red" );
		drawParabola( bps[i].p, tdir, bps[i].l, bps[i].r );
	}
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
		if (s.y < point.y) return;
		let d = distance(s, point);
		if (minv > d) {
			minv = d;
			nearSite = s;
		}
	});
	return nearSite;
}
