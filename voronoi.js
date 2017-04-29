/**
Constant values
*/
const SIZE_CANVAS_X = 600;
const SIZE_CANVAS_Y = 600;
const HALFX = SIZE_CANVAS_X / 2;
const HALFY = SIZE_CANVAS_Y / 2;
const NO_SITES = 1 << 3;

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
let undoList = [];

let angle1 = 0;
let angle2 = Math.PI;
let radius = 100;
let a = 0;
let tdir   = SIZE_CANVAS_X / 2 + 120;

let bpt 		= undefined;
// pointer to list of beach line segments
let blsFirst = undefined;
let sweepy  = 0;

document.getElementById("back").onclick = function() {
	a -= 0.05;
	if ( a <= 0 ) a = 2 * Math.PI;
	tdir2 -= 1;
	if ( tdir2 <= Math.max(p21.y, p22.y)) tdir2 = SIZE_CANVAS_Y;
	drawAnimation();
}

document.getElementById("next").onclick = function() {
	a += 0.05;
	if ( a >= 2 * Math.PI ) a = 0;
	tdir2 += 1;
	if ( tdir2 >= SIZE_CANVAS_Y ) tdir2 = Math.max(p21.y, p22.y);
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
Data structures
*/
let Site = function(point) {
	this.x = point.x;
	this.y = point.y;
}

Site.prototype.toString = function() {
	return `(${this.x}, ${this.y})`;
}

Site.prototype.equals = function(other) {
	return (this.x == other.x) && (this.y == other.y);
}

let CircleEvent = function(point, radius, ref) {
	this.p = point;
	this.x = point.x;
	this.y = point.y;
	this.r = radius;
	this.ref = ref;
}

CircleEvent.prototype.toString = function() {
	return `(${this.x}, ${this.y}) ${this.r} ${this.ref}`
}

let ParabolaAhk = function(a, h, k) {
	this.a = a;
	this.h = h;
	this.k = k;
}

ParabolaAhk.prototype.valuex = function(x) {
	return this.a * Math.pow(x - this.h, 2) + this.k
}

ParabolaAhk.prototype.draw = function(xl, xr, color) {
	drawPoint({ x: xl, y: this.valuex(xl) }, "orange", 8 );
	for (let x = xl; x < xr ; x++) {
		let y = this.valuex(x);
		if( y < 0) continue;
		drawPoint({ x: x, y: y }, color, 0.5 );
	}
	drawPoint({ x: xr, y: this.valuex(xr) }, "DarkMagenta", 8 );
}

let DegenParabolaAhk = function(a, h, k) {
	this.a = a;
	this.h = h;
	this.k = k;
}

DegenParabolaAhk.prototype.valuex = function(x) {
	return Infinity;
}

DegenParabolaAhk.prototype.draw = function(xl, xr, color) {
}

let BeachlineSegment = function(sitepoint, avlnode, prev, next) {
	this.sitepoint = sitepoint;
	this.avlnode   = avlnode;
	this.prev			 = prev;
	this.next 		 = next;
}

let DcelVertex  = function(halfedge) {
	this.halfedge = halfedge;
}

let DcelHalfEdge = function(vertex, face, next, twin) {
	this.vertex 	= vertex;
	this.face 		= face;
	this.next 		= next;
	this.twin			= twin;
}

let DcelFace = function(edge) {
	this.edge 		= edge;
}

/******************************************************
math stuff
*/
// calculates intersection points of two parabolas
// return { l: ipoint1, r: ipoint2 }
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

// calc roots of a quadratic
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

// finds the intersections of two parabolas
// in: sites site1 and site2
// return: { l: ipoint1, r: ipoint2 }
function findIntersect(site1, site2, tdir) {
	let p1  = getParabolaFromFokusAndDir( site1, tdir );
	let p2  = getParabolaFromFokusAndDir( site2, tdir );
	let i	  = (site1.y > site2.y) ? intersect(p1, p2, tdir): intersect(p2, p1, tdir)
	// console.log(`findIntersect(${site1}, ${site2}, ${tdir}) = {${i.l}, ${i.r}}`);
	return i;
}
/******************************************************
algorithm
*/
// let testsites = undefined;
// let testsites = [{x:323,y:509},{x:695,y:619},{x:610,y:635}];
// let testsites = [{x:323,y:309},{x:495,y:419},{x:410,y:435}];
let testsites = [{x:60,y:323},{x:393,y:374},{x:259,y:427},{x:429,y:530}];

function initAlgorithm() {
	bpt = undefined;
	circleList = [];
	pqueue.clear();
	firstBls = undefined;

	if(testsites) {
		for (let i = 0; i < testsites.length; i++) {
			sites[i] = new Site(testsites[i]);
			pqueue.queue(sites[i]);
		}
	} else {
		for (let i = 0; i < NO_SITES; i++) {
			sites[i] = new Site( { x: Math.round( Math.random() * SIZE_CANVAS_X),
													   y: Math.round( Math.random() * HALFY) + HALFY } );
			pqueue.queue(sites[i]);
		}
	}
}

/*
comparator function:
-1 means e is smaller than this.value
1 means e is bigger than this.value
0 e is (kind of) equal to this.value
*/
let vcomp = function( e ) {
	// findIntersect returns NaN if one of it's arguments is undefined
	let lt = this.left ?
		chooseRight( this.left.biggest().value, this.value, sweepy ) : Number.MIN_SAFE_INTEGER;
	if ( e.x <=  lt ) return -1; // proceed to the left
	let tr = this.right ?
		chooseRight( this.value, this.right.smallest().value, sweepy ) : Number.MAX_SAFE_INTEGER;
	if ( e.x >  tr ) return 1; // proceed to the right
  return 0;
}

// given to sites site1 and site2, returns the leftmost intersection point (wrt the x-axis) of the 
// two parabolas defined by the sites as focus and global tdir as directrix
function chooseLeft( site1, site2 ) {
	let fi = findIntersect( site1, site2, sweepy );
	return (site1.y > site2.y) ? fi.l : fi.r;
}

// given to sites site1 and site2, returns the rightmost intersection point (wrt the x-axis) of the 
// two parabolas defined by the sites as focus and global tdir as directrix
function chooseRight( site1, site2 ) {
	let fi = findIntersect( site1, site2, sweepy );
	return (site1.y > site2.y) ? fi.r : fi.l;
}

// callback for avltreenode, called by insert method
// this breaks up this into three nodes, left and right contain the same value
// as this, the new root contains the new value
let insertProcess = function( value, rel ) {

	// left subtree
	let nl 		  = new AvlTreeNode( this.value, this, vcomp, insertProcess );
	nl.left     = this.left;
	this.left   = nl;
	nl.bls 			= new BeachlineSegment( this.value, nl, this.bls.prev, undefined );
	// store the leftest bls
	if(this.bls.prev) {
		this.bls.prev.next = nl.bls;
	} else {
		blsFirst  = nl.bls;
	}

	// right subtree
	let nr 		  = new AvlTreeNode( this.value, this, vcomp, insertProcess );
	nr.right 	  = this.right;
	this.right  = nr;
	nr.bls 			= new BeachlineSegment( this.value, nr, undefined, this.bls.next );
	if(this.bls.next) {
		this.bls.next.prev = nl.bls;
	} 
	
	// swap value
	this.value  = value;
	this.height = this.calcHeight();

	let newbls  = new BeachlineSegment( value, this, nl.bls, nr.bls );
	this.bls 		= newbls;
	nl.bls.next = nr.bls.prev = newbls;
	createCircleEvent(this);
}

function createCircleEvent( node ) {
}

let graph = undefined;

function calcVoronoi(e, bptree) {
	sweepy = e.y;
	drawPoint(e, "blue", 5);
	if( e instanceof Site ) {
		if (!bptree) {
			bptree     = new AvlTreeNode(e, undefined, vcomp, insertProcess);
			blsFirst   = bptree.bls = new BeachlineSegment(e, bptree, undefined, undefined);
		} else {
			bptree     = bptree.insert(e);
		}
		// graph(e) = e;
		// wenn breakpoint, woher
	} else if (e instanceof CircleEvent) {
		drawCircle(e.ref.x, e.ref.y, e.r, "red");
		console.log(`e.ref => ${e.ref.x}, ${e.ref.y}`);
		bptree   = bptree.deleteNode(e.ref);
	}
	return bptree;
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
	//  parabolaResearch2();
	drawVoronoi();
}

function drawVoronoi() {
  let e = pqueue.dequeue();
	undoList.push(e);
	bpt = calcVoronoi(e, bpt);
	drawTree(bpt, {x: 300, y: 50}, 150 );
	drawBeachline2(bpt);
	sites.forEach( c => {
		drawPoint( c, "red", 4);
	});
	drawLineOnCanvas({x: 0, y:sweepy},{x: SIZE_CANVAS_X, y:sweepy}, "grey");
}

function drawBeachline2(egal) {
	console.log("draw beachline");
	let curr   = blsFirst;
	let currX  = 0;
	while(curr) {
		let next = curr.next;
		let bp   = next ? Math.min( chooseRight( curr.sitepoint, next.sitepoint ), SIZE_CANVAS_X - 1 ) : SIZE_CANVAS_X - 1;
		if ( bp >= SIZE_CANVAS_X ) return;
		console.log(`drawParabola( ${curr.sitepoint}, ${sweepy}, ${currX}, ${bp} )`);
		drawParabola( curr.sitepoint, sweepy, currX, bp );
		currX    = bp;
		curr     = curr.next;
	}
}

function drawBeachline(bptree) {
	let myList = [];
	let x = 0;
	makeBlList(bptree, myList);
	if( myList.length == 0 ) return;
	myList.push(SIZE_CANVAS_X - 1);
	console.log(`${myList}`);
	while(myList.length > 0) {
		let currSite = myList.shift();
		let brpt     = myList.shift();
		let p 			 = getParabolaFromFokusAndDir(currSite, sweepy)
		p.draw( x, brpt, "green" );
		x = brpt;
	}
}

function makeBlList( n, list ) {
	if ( n.left ) {
		makeBlList(n.left, list);
		let x = chooseRight(n.left.biggest().value, n.value, sweepy);
		list.push(x);
	}
	// if ( n.value.y == sweepy ) return;
	list.push( n.value );
	if ( n.right ) {
		let x = chooseRight(n.value, n.right.smallest().value, sweepy);
		list.push(x);
		makeBlList(n.right, list);
	}
}

function makeBlList2(n) {
	if(n.left){
		let bigl = makeBlList(n.left);
		let x = findIntersect(bigl, n.value);
	}
}

function drawParabola(site, sweepy, xl, xr, color = "red") {
	let p = getParabolaFromFokusAndDir(site, sweepy);
	drawPoint({ x: xl, y: p.valuex(xl) }, "orange", 8 );
	for (let x = xl; x < xr ; x++) {
		let y = p.valuex(x);
		if( y < 0) continue;
		drawPoint({ x: x, y: y }, color, 0.5 );
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
	drawPoint({x:x,y:y}, "red");
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
						 y: Math.sin(angle1 + a) * radius + SIZE_CANVAS_Y / 2 };
  let p2 = { x: Math.cos(angle2 + a) * radius + SIZE_CANVAS_X / 2,
			 		 	 y: Math.sin(angle2 + a) * radius + SIZE_CANVAS_Y / 2 };

 	let zw = { x: Math.min(p1.x,p2.x) + Math.abs(p2.x - p1.x)/2,
 						 y: Math.min(p1.y,p2.y) + Math.abs(p2.y - p1.y)/2 };

  drawPoint( p1, "green", 3 );
 	drawPoint( p2, "orange", 3 );
 	drawPoint( zw, "blue", 3 );

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

let p21 = { x: Math.round( Math.random() * SIZE_CANVAS_X),
					  y: Math.round( Math.random() * HALFY) + HALFY };
let p22 = { x: Math.round( Math.random() * SIZE_CANVAS_X),
				    y: Math.round( Math.random() * HALFY) + HALFY };
let tdir2 = Math.max(p21.y, p22.y);

function parabolaResearch2() {
	drawLineOnCanvas({x: 0, y:tdir2},{x: SIZE_CANVAS_X, y:tdir2}, "grey");

 	let zw = { x: Math.min(p21.x,p22.x) + Math.abs(p22.x - p21.x)/2,
 						 y: Math.min(p21.y,p22.y) + Math.abs(p22.y - p21.y)/2 };

  drawPoint( p21, "green", 3 );
 	drawPoint( p22, "orange", 3 );
 	drawPoint( zw, "blue", 3 );

	drawParabola( p21, tdir2, 0, SIZE_CANVAS_X )
	drawParabola( p22, tdir2, 0, SIZE_CANVAS_X )

	let i  = findIntersect( p21, p22, tdir2 );
	let dp = getParabolaFromFokusAndDir( p21, tdir2 );
	drawPoint( {x: i.l, y: dp.valuex(i.l)}, "orange", 6);
	drawPoint( {x: i.r, y: dp.valuex(i.r)}, "green", 6);
	drawLineOnCanvas(	{x: i.l, y: dp.valuex(i.l)},
									  {x: i.r, y: dp.valuex(i.r)},
										"black" );
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
