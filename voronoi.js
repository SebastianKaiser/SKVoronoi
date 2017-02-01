/**
Constant values
*/
const SIZE_CANVAS_X = 800;
const SIZE_CANVAS_Y = 800;
const NO_SITES = 1 << 3

/**
	Initializsation of stuff
*/
let ctx = undefined;
let points = new Array();
let vsitenr = 0
let y = 0;
let cs = undefined;
let line = undefined;
let sites = new Array();
let pqueue = new PriorityQueue({
	comparator: (s, r) => {
		let yd = s.y - r.y;
		if (yd == 0) {
			return s.x - r.x;
		}
		return yd;
	}
});

document.getElementById("next").onclick = drawAnimation;
window.onload = function() {
 	init()
 	y = 0;
 	// window.setInterval( drawAnimation, 200 );
};

let VBreakPoint = function( l, r, left, right) {
	this.lsite = l;
	this.rsite = r;
	this.left  = left;
	this.right = right;
}

VBreakPoint.prototype.toString = function () {
	return `${this.lsite.toString()} + ${this.rsite.toString()}`
}

VBreakPoint.prototype.breakPoint = function( sweepy ) {
	return chooseBp(this.lsite, this.rsite, sweepy);
}

let Site = function(point) {
	this.x = point.x;
	this.y = point.y;
}

let VSite = function(point) {
	this.vsitenr = vsitenr++
	this.x = point.x;
	this.y = point.y;

	this.prev = undefined;
	this.next = undefined;
}

VSite.prototype.toString = function() {
	return `( ${this.x}, ${this.y} )`
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

ParabolaAhk.prototype.intersect = function(op) {
	if( op instanceof DegenParabolaAhk ) {
		return {r: op.h, l: op.h};
	}
	let ra = this.a - op.a;
	let rb = -2 * (this.a * this.h - op.a * op.h);
	let rc = (this.a * this.h * this.h - op.a * op.h * op.h) + (this.k - op.k);
	return rootsOfQuadratic(ra, rb, rc);
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

function rootsOfQuadratic(a, b, c) {
	if( a == 0 ) return { l: -c / b, r: -c / b }
	let d = Math.sqrt(b * b - 4 * a * c)
	let x1 = (-b + d) / (2 * a)
	let x2 = (-b - d) / (2 * a)
	return {
		l: Math.min(x1, x2),
		r: Math.max(x1, x2)
	};
}

function getParabolaFromFokusAndDir(focus, diry) {
	if ( focus.y === diry) {
		return new DegenParabolaAhk( 0, focus.x, (focus.y + diry) / 2 );
	}
	let a = 1 / (2 * (focus.y - diry));
	let h = focus.x;
	let k = (focus.y + diry) / 2;
	drawPoint(focus, "red", 8);
	return new ParabolaAhk(a, h, k);
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
	return {
		p: z,
		r: r
	};
}

// distance between two points
function distance(p, op) {
	let diffx = p.x - op.x;
	let diffy = p.y - op.y;
	return Math.sqrt(diffx * diffx + diffy * diffy);
}

function chooseBp( p1, p2, sweepy ) {
	let int = findIntersect(p1, p2, sweepy);
	console.log(`int => ${int.l}, ${int.r}`);
	if ( Math.min(p1.x, p2.x) <= int.l && int.l <= Math.max(p1.x, p2.x) ) {
		return int.l;
	} else {
		return int.r;
	}
}

/*
insert a site into the beachline
*/
function insertSiteInL(e, node) {
	let sweepy = e.y;
	if (node == undefined) {
		firstSite = new VSite( e );
		return firstSite;
	} else if (node instanceof VSite) {
		let ln = new VSite( node );
		let nn = new VSite( e );
		let rn = new VSite( node );
		ln.prev = node.prev;
		if( ln.prev == undefined ) {
			firstSite = ln;
		}
		ln.prev = node.prev;
		ln.next = nn;
		nn.prev = ln;
		nn.next = rn;
		rn.prev = nn;
		rn.next = node.next;
		let newBp1 = new VBreakPoint( e, new Site( node ), ln, nn );
		return new VBreakPoint( new Site( node ), e, newBp1, rn );
	} else if (node instanceof VBreakPoint) {
		// find intersection for comparison with site event
		let xa = node.breakPoint(sweepy);
		if (e.x < xa) {
			node.left = insertSiteInL( e, node.left)
		} else if ( e.x >= xa ) {
			node.right = insertSiteInL( e, node.right)
		}
		return node;
	}
}

function findSiteInL( e, node ) {
	let sweepy = e.y;
	if ( node instanceof VSite ) {
		return node;
	} else if ( node instanceof VBreakPoint ) {
		// find intersection for comparison with site event
		let xa = node.breakPoint( sweepy );
		if (e.x < xa) {
			return findSiteInL( e, node.left )
		} else if ( e.x >= xa ) {
			return findSiteInL( e, node.right )
		} else {
			console.log("?=")
		}
	}
}

function findIntersect(site1, site2, sweepy) {
	let rp  = getParabolaFromFokusAndDir( site2, sweepy );
	let lp  = getParabolaFromFokusAndDir( site1, sweepy );
	return lp.intersect(rp);
}

function calcVoronoi() {
	if (pqueue.length == 0) {
		initAlgorithm();
	}
	let e = pqueue.dequeue();
	if (e instanceof Site) {
		drawLine(line, e.y);
		line = insertSiteInL(e, line);
		console.log( findSiteInL(e, line, e.y) );
		drawBeachline( e.y );
		// let z = circumVector( list[vl-3], list[vl-2], list[vl-1] );
		// pqueue.queue( new CircleEvent( { x: z.p.x, y: z.p.y - z.r }, z.r, {x: z.p.x, y: z.p.y} ));
	} else if (e instanceof CircleEvent) {
		drawCircle(e.ref.x, e.ref.y, e.r)
	}
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
	//parabolaResearch3();
  calcVoronoi();
	drawTree( line, { x: SIZE_CANVAS_X / 2, y: 30}, SIZE_CANVAS_X / 4 );
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

let angle1 = 0;
let angle2 = Math.PI;
let radius = 20;
let a = 0;
let tdir   = SIZE_CANVAS_X / 2 + 40;

function parabolaResearch() {
	let p1 = { x: Math.cos(angle1 + a) * radius + SIZE_CANVAS_X / 2,
						 y: Math.sin(angle1 + a) * radius + SIZE_CANVAS_Y / 2 }
  let p2 = { x: Math.cos(angle2 + a) * radius + SIZE_CANVAS_X / 2,
			 		 	 y: Math.sin(angle2 + a) * radius + SIZE_CANVAS_Y / 2 }


	drawPoint( p1, "blue" );
	drawPoint( p2, "red" );

	drawParabola( p1, tdir, 0, SIZE_CANVAS_X )
	drawParabola( p2, tdir, 0, SIZE_CANVAS_X )

	let i = findIntersect( p1, p2, tdir );
	let dp = getParabolaFromFokusAndDir( p1, tdir );
	drawPoint( {x: i.l, y: dp.valuex(i.l)}, "orange", 6);
	drawPoint( {x: i.r, y: dp.valuex(i.r)}, "green", 6);

	a += 0.05;
	if ( a >= Math.PI ) a = 0;
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

	a += 0.05;
	if ( a >= Math.PI ) a = 0;
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
		drawParabola( bps[i].p, tdir, 0, SIZE_CANVAS_X, "yellow" );
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

let firstSite = undefined;

