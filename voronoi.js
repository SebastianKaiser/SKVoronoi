/**
Constant values
*/
const SIZE_CANVAS_X = 600;
const SIZE_CANVAS_Y = 600;
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
let radius = 40;
let a = 0;
let tdir   = SIZE_CANVAS_X / 2 + 40;

let bpt 		= undefined;
let sweepy  = undefined;

document.getElementById("back").onclick = function() {
	a -= 0.05;
	if ( a <= 0 ) a = 2 * Math.PI;
	drawAnimation();
}

document.getElementById("next").onclick = function() {
	a += 0.05;
	if ( a >= 2 * Math.PI ) a = 0;
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

Site.prototype.toString = function() {
	return `(${this.x}, ${this.y})`
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

function findIntersect(site1, site2, tdir) {
	let p1  = getParabolaFromFokusAndDir( site1, tdir );
	let p2  = getParabolaFromFokusAndDir( site2, tdir );
	let i	  = intersect(p1, p2, tdir)
  return ( site1.y > site2.y ) ? {l: i.l, r: i.r} : {l: i.l, r: i.r};
}

function intersect(p, op) {
	if( p instanceof DegenParabolaAhk ) {
		return {l: p.h, r: p.h};
	}
	if( op instanceof DegenParabolaAhk ) {
		return {l: op.h, r: op.h};
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
	return { l: x1,	r: x2 };
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

function initAlgorithm() {
	bpt = undefined;
	pqueue.clear();
	for (let i = 0; i < NO_SITES; i++) {
		sites[i] = new Site( { x: Math.round( Math.random() * SIZE_CANVAS_X),
												   y: Math.round( Math.random() * SIZE_CANVAS_Y) } );
		pqueue.queue(sites[i]);
	}
}

/*
comparator function:
*/
let vcomp = function( e ) {
	// findIntersect returns NaN if one of it's arguments is undefined
	let lt = this.left ?
		findIntersect( biggest(this.left).value, this.value, sweepy ).l : undefined;
	let tr = this.right ?
		findIntersect( this.value, smallest(this.right).value, sweepy ).r : undefined;
	if ( lt < e.x && e.x < tr) return 0;
	if ( e.x < lt ) return -1;
	if ( e.x > tr ) return 1;
	return 0;
}

// find smallest element
function smallest( node ) {
	return getExtreme( node, function( node ) {return node.left} );
}

// find biggest element
function biggest( node ) {
	return getExtreme( node, function( node ) {return node.right} );
}

// this breaks up a given node
let insertProcess = function( value, rel ) {
	// left subtree
	let nl 		 = new AvlTreeNode( this.value, this, vcomp, insertProcess);
	nl.left    = this.left;
	this.left  = nl;
	// right subtree
	let nr 		 = new AvlTreeNode( this.value, this, vcomp, insertProcess);
	nr.right 	 = this.right;
	this.right = nr;
	// swap value
	this.value = value;
	this.height = this.calcHeight();
}

function calcVoronoi(e) {
	sweepy = e.y;
	drawPoint(e, "blue", 10);
	if (e instanceof Site) {
		if (!bpt) {
			bpt = new AvlTreeNode(e, undefined, vcomp, insertProcess);
		} else {
			bpt = bpt.insert(e);
		}
	} else if (e instanceof CircleEvent) {
		// ???
	}
	return e.y;
}

/*****************************************
drawing stuff
*****************************************/

function drawAnimation() {
	ctx.fillStyle = "white";
	ctx.fillRect(0, 0, SIZE_CANVAS_X, SIZE_CANVAS_Y);
	if (pqueue.length == 0) {
		initAlgorithm();
	}
	// parabolaResearch3();
	let e = pqueue.dequeue()
	let sweepy = calcVoronoi(e);
	drawTree(bpt, {x: 300, y: 30}, 150 );
	console.log(sweepy);
	drawBeachline();
	sites.forEach( c => {
		drawPoint( c, "red", 4);
	});
}

function drawBeachline() {
	let prevx = 0
	bpt.inorder( function(n) {
		let bl = 0
		let br = SIZE_CANVAS_X
		if (n.left) {
			let x = findIntersect(biggest(n.left).value, n.value, sweepy).l;
			console.log(`${biggest(n.left).value} © ${n.value} = ${x}`)
			drawParabola(n.left.value, sweepy, bl, x, "green");
			bl = x;
		}
		if (n.right) {
			let x = findIntersect(n.value, smallest(n.right).value, sweepy).l;
			console.log(`${n.value} © ${smallest(n.left).value} = ${x}`)
			drawParabola(n.value, sweepy, x, br, "blue");
			br = x;
		}
		//drawParabola(n.value, sweepy, bl, br, "magenta");
	});
}

function drawLine(node, y) {
	if (node === undefined) return;
	if (node instanceof VBreakPoint ) {
		drawLine(node.left, y);
		drawLine(node.right, y);
	} else {
		drawPoint({x: node.x, y: y}, "blue", 10);
	}
}

function drawParabola(site, sweepy, xl, xr, color = "blue") {
	let p = getParabolaFromFokusAndDir(site, sweepy);
	drawPoint({ x: xl, y: p.valuex(xl) }, "orange", 8 );
	for (let x = xl; x < xr ; x++) {
		let y = p.valuex(x);
		if( y < 0) continue;
		drawPoint({ x: x, y: y }, color, 1 );
	}
	drawPoint({ x: xr, y: p.valuex(xr) }, "DarkMagenta", 8 );
}

function drawLineOnCanvas(p1, p2, col) {
	ctx.save();
	ctx.beginPath();
	ctx.strokeStyle = col;
	ctx.moveTo(p1.x, p1.y);
	ctx.lineTo(p2.x, p2.y);
	ctx.stroke();
	ctx.closePath();
	ctx.restore();
}

function drawPoint(p, col, size = 1) {
	ctx.save();
	ctx.beginPath();
	ctx.arc( p.x, p.y, size, 0, 2 * Math.PI, false);
	ctx.fillStyle = col;
	ctx.fill();
	ctx.stroke();
	ctx.closePath();
	ctx.restore();
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

  drawPoint( p1, "green", 3 );
 	drawPoint( p2, "orange", 3 );

	drawParabola( p1, tdir, 0, SIZE_CANVAS_X )
	drawParabola( p2, tdir, 0, SIZE_CANVAS_X )

	let i  = findIntersect( p1, p2, tdir );
	let dp = getParabolaFromFokusAndDir( p1, tdir );
	drawPoint( {x: i.l, y: dp.valuex(i.l)}, "orange", 6);
	drawPoint( {x: i.r, y: dp.valuex(i.r)}, "green", 6);
	drawLineOnCanvas(	{x: i.l, y: dp.valuex(i.l)},
									  {x: i.r, y: dp.valuex(i.r)},
										"black" );
}

function parabolaResearch3() {
	let paras = [];
	let no = 3;
	let step = SIZE_CANVAS_X / no;
	for ( let i = 0; i < no; i += 1 ) {
		let x = Math.round( Math.random() * step ) + i * step;
		let y = Math.round( Math.random() * 20 ) + SIZE_CANVAS_Y / 2;
		paras[ i ] = { x: x, y: y };
	}

	let bps = [];
	let last = 0;
	for ( let i = 0; i < no - 1; i += 1 ) {
		drawPoint(paras[i]);
		let ci = findIntersect(paras[i], paras[i+1], tdir).r;
		let pd = getParabolaFromFokusAndDir(paras[i], tdir);
		drawPoint({x: ci, y: pd.valuex( ci )}, "blue", 4);
		bps[i] = { l: last, r: ci, p: paras[i] };
		last = bps[i].r;
	}
	drawPoint(paras[no-1]);
	bps[no-1] = {l: last, r: SIZE_CANVAS_X, p: paras[no-1]};

	drawLineOnCanvas({x: 0, y: tdir},{x: SIZE_CANVAS_X, y: tdir}, "lightgrey");
	for ( let i = 0; i < no; i += 1 ) {
		console.log(`l:${bps[i].l} r:${bps[i].r}`)
		// drawParabola( bps[i].p, tdir, 0, SIZE_CANVAS_X, "red" );
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
