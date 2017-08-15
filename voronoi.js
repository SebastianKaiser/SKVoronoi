/**
Constant values
*/
const SIZE_CANVAS_X = 600;
const SIZE_CANVAS_Y = 600;
const HALFX = SIZE_CANVAS_X / 2;
const HALFY = SIZE_CANVAS_Y / 2;
const NO_SITES = 1 << 5;

/**
	Initializsation of stuff
*/
let ctx = undefined;
let ctx2 = undefined;
let points = new Array();
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
let undoList = [];

let angle1 = 0;
let angle2 = Math.PI;
let radius = 100;
let a = 0;
let tdir = SIZE_CANVAS_X / 2 + 120;

let bpt = undefined;
// pointer to list of beach line segments
let blsFirst = undefined;
let sweepy = 0;
let siteIdCounter = 0;
let circleIdCounter = 0;
let beachlineSegmentCounter = 0;

document.getElementById("next").onclick = function() {
	a += 0.05;
	if (a >= 2 * Math.PI) {
		a = 0;
	}
	tdir2 += 1;
	if (tdir2 >= SIZE_CANVAS_Y) {
		tdir2 = Math.max(p21.y, p22.y);
	}
	drawAnimation();
}

window.onload = function() {
	init()
	y = 0;
	window.setInterval(drawAnimation, 1);
};

function init() {
	if (document == null) {
		alert("document is null");
		window.clearInterval(active);
		return null;
	}
	var canvas = document.getElementById("sites");
	if (typeof canvas === "undefined" || canvas == null) {
		alert("Canvas is undefined " + canvas);
		window.clearInterval(active);
	}
	var tcanvas = document.getElementById("tree");
	if (typeof tcanvas === "undefined" || tcanvas == null) {
		alert("TCanvas is undefined " + tcanvas);
		window.clearInterval(active);
	}
	ctx = canvas.getContext("2d");
	ctx2 = tcanvas.getContext("2d");
	return true;
}

//////////////////////////////////////////////////////////////////
// Data structures
//////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////////
// Site event
//////////////////////////////////////////////////////////////////
let Site = function(point) {
	this.id = siteIdCounter++;
	this.x = point.x;
	this.y = point.y;
}

Site.prototype.toString = function() {
	return `{x:${this.x}, y:${this.y}}`;
}

Site.prototype.equals = function(other) {
	return (this.x == other.x) && (this.y == other.y);
}

Site.prototype.hashCode = function() {
	return (this.x * 31) + this.y;
}

Site.prototype.draw = function(color = "red") {
	drawPoint(this, color, 5);
}

//////////////////////////////////////////////////////////////////
// Circle event.
// y contains the y coordinate, where this event is
// supposed to fire, meaning this.y == point.x + radius.
// point, probable vertex point
// radius, the radius of the circle
// ref, the beach line segment to be deleted
//////////////////////////////////////////////////////////////////
let CircleEvent = function(point, radius, ref) {
	this.id = circleIdCounter++;
	this.deleted = false;
	this.p = point;
	this.x = point.x;
	this.y = point.y + radius;
	this.r = radius;
	this.ref = ref;
}

CircleEvent.prototype.toString = function() {
	return `id:${this.id} x:${this.p.x} y:${this.p.y} bls:${this.ref.toString()}`
}

CircleEvent.prototype.draw = function(color = "blue") {
	drawCircle(this.p.x, this.p.y, this.r, color);
	drawPoint({
		x: this.x,
		y: this.y
	}, "green", 3);
}

//////////////////////////////////////////////////////////////////
// Parabolas
//////////////////////////////////////////////////////////////////
let ParabolaAhk = function(a, h, k) {
	this.a = a;
	this.h = h;
	this.k = k;
}

ParabolaAhk.prototype.valuex = function(x) {
	return this.a * Math.pow(x - this.h, 2) + this.k
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
let DegenParabolaAhk = function(a, h, k) {
	this.a = a;
	this.h = h;
	this.k = k;
}

DegenParabolaAhk.prototype.valuex = function(x) {
	return Infinity;
}

DegenParabolaAhk.prototype.draw = function(xl, xr, color) {}

//////////////////////////////////////////////////////////////////
// Beach line segment
//////////////////////////////////////////////////////////////////
let BeachlineSegment = function(sitepoint, refnode, prev, next) {
	this.id = beachlineSegmentCounter++;
	this.sitepoint = sitepoint;
	this.refnode = refnode;
	this.event = [];
	this.prev = prev;
	this.next = next;
}

BeachlineSegment.prototype.remove = function() {
	if (this.next) {
		this.next.prev = this.prev;
	}
	if (this.prev) {
		this.prev.next = this.next;
	}
	if (this.next) {
		this.next.checkSanity();
	}
	if (this.prev) {
		this.prev.checkSanity();
	}
};

BeachlineSegment.prototype.drawBeachlineSegment = function(color = "blue") {
	let next = this.next;
	let prev = this.prev;
	let stp = 0;
	let bp = SIZE_CANVAS_X - 1;
	if (prev) {
		stp = Math.max(0, chooseRight(prev.sitepoint, this.sitepoint));
	}
	if (next) {
		bp = Math.min(chooseRight(this.sitepoint, next.sitepoint), SIZE_CANVAS_X - 1);
	}
	drawParabola(this.sitepoint, sweepy, stp, bp, color);
}

BeachlineSegment.prototype.checkSanity = function() {
	if (this.prev && this.prev.next != this) {
		throw `bls ${this.id} or ${this.prev.id} inconsistent: prev.next != this`
	}
	if (this.next && this.next.prev != this) {
		throw `bls ${this.id} or ${this.next.id} inconsistent: next.prev != this`
	}
	if (!this.prev && this != blsFirst) {
		throw `bls ${this.id} has no prev, but is != blsFirst`
	}
};

BeachlineSegment.prototype.toString = function() {
	return `BLS(${this.sitepoint.x}, ${this.sitepoint.y})`;
}

//////////////////////////////////////////////////////////////////
// DCEL Vertex
//////////////////////////////////////////////////////////////////
let v_id = 0;
let DcelVertex = function(coord, halfEdge) {
	this.id = v_id++;
	this.coord = coord;
	this.halfEdge = halfEdge; // this halfedge has its origin in this
}

//////////////////////////////////////////////////////////////////
// DCEL half-edge
//////////////////////////////////////////////////////////////////
let he_id = 0;
let DcelHalfEdge = function(vertex, face, twin, next) {
	this.id = he_id++;
	this.vertex = vertex; // this edge has its origin at vertex
	this.face = face; // this face lies to the left of this
	this.twin = twin; // this is the twin half-edge
	this.next = next; // this is the next half edge
}

DcelHalfEdge.prototype.hashCode = function() {
	return this.face.hashCode() * 31 + this.twin.face.hashCode();
}

function hashCodeSitePair(site1, site2) {
	return site1.hashCode() * 31 + site2.hashCode();
}

//////////////////////////////////////////////////////////////////
// DCEL Face
//////////////////////////////////////////////////////////////////
let f_id = 0;
let DcelFace = function(site, halfEdge) {
	this.id = f_id++;
	this.site = site; // this is the name
	this.halfEdge = halfEdge; // this is some edge on the outer border
}

DcelFace.prototype.hashCode = function() {
	return this.site.hashCode();
}

//////////////////////////////////////////////////////////////////
// Sanity check
let vCheckSanity = function() {
	if (this.left) {
		if (this != this.left.parent) {
			throw `tantrum: left child parent inconsistent: 			this ${this.value}, left parent ${this.left.parent.value}`;
		}
		if (this.left == this.parent) {
			throw `tantrum: parent and left child identical (wrong!)`;
		}
	}
	if (this.right) {
		if (this != this.right.parent) {
			throw `tantrum: left child parent inconsistent: 			this ${this.value}, right parent ${this.right.parent.value}`;
		}
		if (this.right == this.parent) {
			throw `tantrum: parent and right child identical (wrong!)`;
		}
	}
}

//////////////////////////////////////////////////////////////////
// math stuff
//////////////////////////////////////////////////////////////////

// calculates intersection points of two parabolas
function intersect(p, op) {
	if (p instanceof DegenParabolaAhk) {
		return {
			l: p.h,
			r: p.h
		};
	}
	if (op instanceof DegenParabolaAhk) {
		return {
			l: op.h,
			r: op.h
		};
	}
	let ra = p.a - op.a;
	let rb = -2 * (p.a * p.h - op.a * op.h);
	let rc = (p.a * p.h * p.h - op.a * op.h * op.h) + (p.k - op.k);
	return rootsOfQuadratic(ra, rb, rc);
}

// calc roots of a quadratic
function rootsOfQuadratic(a, b, c) {
	if (a == 0) {
		return {
			l: -c / b,
			r: -c / b
		};
	}
	let d = Math.sqrt(b * b - 4 * a * c);
	let x1 = (-b + d) / (2 * a);
	let x2 = (-b - d) / (2 * a);
	return {
		l: x1,
		r: x2
	};
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
// A,B,C are object with attributes x and y
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

// creates a parabola from a given focus and a directrix
function getParabolaFromFokusAndDir(focus, diry) {
	if (focus.y === diry) {
		return new DegenParabolaAhk(0, focus.x, (focus.y + diry) / 2);
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
	let p1 = getParabolaFromFokusAndDir(site1, tdir);
	let p2 = getParabolaFromFokusAndDir(site2, tdir);
	let i = (site1.y > site2.y) ? intersect(p1, p2, tdir) : intersect(p2, p1, tdir)
	return i;
}

function orientationClockwise(site1, site2, site3) {
	let area = 0;
	area += site1.x * site2.y - site1.y * site2.x
	area += site2.x * site3.y - site2.y * site3.x
	area += site3.x * site1.y - site3.y * site1.x
	return area > 0;
}

/******************************************************
algorithm
*/

let edgeBetweenSites = {};

let halfEdges = new Map();
let faces = new Map();
let vertices = new Map();

let testsites = undefined;
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

let SCX_INNER = SIZE_CANVAS_X * 0.9;
let SCX_OUTER = SIZE_CANVAS_X * 0.1;
let SCY_INNER = SIZE_CANVAS_Y * 0.9;
let SCY_OUTER = SIZE_CANVAS_Y * 0.1;

function initAlgorithm() {
	bpt = undefined;
	circleIdCounter = 0;
	stepcntr = 0; // for debugging
	pqueue.clear();
	firstBls = undefined;
	halfEdges.clear();
	faces.clear();
	vertices.clear();

	if (testsites) {
		for (let i = 0; i < testsites.length; i++) {
			sites[i] = new Site(testsites[i]);
			pqueue.queue(sites[i]);
		}
	} else {
		for (let i = 0; i < NO_SITES; i++) {
			sites[i] = new Site({
				x: Math.round(Math.random() * SCX_INNER + SCX_OUTER),
				y: Math.round(Math.random() * SCY_INNER + SCY_OUTER)
			});
			pqueue.queue(sites[i]);
		}
		let bla = [];
		sites.forEach(s => bla += `${s}`);
		console.log(bla);
	}
}

// comparator function:
// -1 means e is smaller than this.value
// 1 means e is bigger than this.value
// 0 e is (kind of) equal to this.value
let vcomp = function(e) {
	// findIntersect returns NaN if one of it's arguments is undefined
	let lt = this.left ?
		chooseRight(this.left.biggest().value, this.value, sweepy) : Number.MIN_SAFE_INTEGER;
	let tr = this.right ?
		chooseRight(this.value, this.right.smallest().value, sweepy) : Number.MAX_SAFE_INTEGER;
	if (e.x >= lt && e.x <= tr) {
		return 0; // the beachline segment is found
	}
	if (e.x < lt) {
		return -1;
	} // proceed to the left
	if (e.x > tr) {
		return 1;
	} // proceed to the right
}

// given to sites site1 and site2, returns the leftmost intersection point (wrt the x-axis) of the
// two parabolas defined by the sites as focus and global tdir as directrix
function chooseLeft(site1, site2) {
	let fi = findIntersect(site1, site2, sweepy);
	return (site1.y > site2.y) ? fi.l : fi.r;
}

// given to sites site1 and site2, returns the rightmost intersection point (wrt the x-axis) of the
// two parabolas defined by the sites as focus and global tdir as directrix
function chooseRight(site1, site2) {
	let fi = findIntersect(site1, site2, sweepy);
	return (site1.y > site2.y) ? fi.r : fi.l;
}

// callback for avltreenode, called by insert method
// this breaks up this into three nodes, left and right contain the same value
// as this, this becomes the new root with the new value
// Also, a halfedge must be created
let insertProcess = function(value, rel) {
	// left subtree
	let nl = new AvlTreeNode(this.value, this, vCheckSanity, vcomp, insertProcess);
	nl.left = this.left;
	if (this.left) {
		this.left.parent = nl;
	}
	this.left = nl;
	nl.calcHeight();

	// store the left most bls
	nl.bls = new BeachlineSegment(this.value, nl, this.bls.prev, undefined);
	if (this.bls.prev) {
		this.bls.prev.next = nl.bls;
	} else {
		blsFirst = nl.bls;
	}

	// right subtree
	let nr = new AvlTreeNode(this.value, this, vCheckSanity, vcomp, insertProcess);
	nr.right = this.right;
	if (this.right) {
		this.right.parent = nr;
	}
	this.right = nr;
	nr.calcHeight();

	nr.bls = new BeachlineSegment(this.value, nr, undefined, this.bls.next);
	if (this.bls.next) {
		this.bls.next.prev = nr.bls;
	}

	// delete all associated circle events
	this.bls.event.forEach(ev => {
		ev.deleted = true;
	});

	createNewDcelEntries(value, this.value);
	// swap value
	this.value = value;
	this.height = this.calcHeight();
	// create a new beach line segment for this
	this.bls = new BeachlineSegment(value, this, nl.bls, nr.bls);
	// set up the pointers
	nl.bls.next = nr.bls.prev = this.bls;
	// balance the tree
	this.left = this.left.balanceInsert();
	this.right = this.right.balanceInsert();
	this.calcHeight();
	// queue two new events
	queueNewCircleEvent(this.bls.prev);
	queueNewCircleEvent(this.bls.next);
}

// create new halfedges between a new and an old site
function createNewDcelEntries(newSite, oldSite) {
	// a new face (b/c new site)
	let newFace = new DcelFace(newSite, undefined);
	faces.set(newSite.hashCode(), newFace);
	pFace = faces.get(oldSite.hashCode());

	// two new half edges between the new face and this
	let ntedge = new DcelHalfEdge(undefined, newFace, undefined, undefined);
	newFace.halfEdge = ntedge;
	let tnedge = new DcelHalfEdge(undefined, pFace, ntedge, undefined);
	ntedge.twin = tnedge;
	if (!pFace.halfEdge) pFace.halfEdge = tnedge;
	// enter edges into map
	halfEdges.set(ntedge.hashCode(), ntedge);
	halfEdges.set(tnedge.hashCode(), tnedge);
}

// create and enqueue
function queueNewCircleEvent(bls) {
	// collect all the sites
	if (!bls || !bls.prev || !bls.next) return;
	let sp = bls.sitepoint;
	let psp = bls.prev.sitepoint;
	let nsp = bls.next.sitepoint;
	// must be three different sites
	if (psp.id == nsp.id || psp.id == sp.id || nsp.id == sp.id) return;
	if (!orientationClockwise(psp, sp, nsp)) return; // false alarm
	// calculate the point where this fires
	let cv = circumVector(psp, sp, nsp);
	// create and register with beach line segments
	let newce = new CircleEvent(cv.p, cv.r, bls);
	bls.event.push(newce);
	// debug
	cevts.push(newce);
	// enqueue into event queue
	pqueue.queue(newce);
	return newce;
}

let graph = undefined;
let stepcntr = 0; // for debugging
let lastEvent = undefined;
let cevts = [];

//////////////////////////////////////////////////////////////////
// Main Algorithm
//////////////////////////////////////////////////////////////////
function calcVoronoi(bptree) {
	let e = pqueue.dequeue();
	stepcntr += 1;
	if (e.deleted) {
		return bptree;
	}
	lastEvent = e;
	sweepy = e.y;
	if (e instanceof Site) {
		if (!bptree) {
			bptree = new AvlTreeNode(e, undefined, vCheckSanity,
				vcomp, insertProcess);
			blsFirst = bptree.bls = new BeachlineSegment(e, bptree, undefined, undefined);
			faces.set(e.hashCode(), new DcelFace(e, undefined));
		} else {
			bptree = bptree.insert(e);
		}
	} else if (e instanceof CircleEvent) {
		let currBls = e.ref;
		currBls.event.forEach(ev => {
			ev.deleted = true;
		});
		currBls.remove();
		let toDelete = currBls.refnode;
		let newNode = toDelete.deleteNode();
		// the parent might be out of balance
		if (toDelete.parent) newNode = toDelete.parent.balanceNodeDelete();
		if (newNode && !newNode.parent) bptree = newNode;

		// create a DCEL Vertex and stuff
		let vertexSite = new Site(e.p);
		createDcelVertex(vertexSite, currBls);
		// enqueue new circle events
		queueNewCircleEvent(currBls.prev);
		queueNewCircleEvent(currBls.next);
	}
	return bptree;
}

// create a DCEL Vertex and new halfedges, and connect these elements
function createDcelVertex(vertexSite, currBls) {
	let vert = new DcelVertex(vertexSite, undefined);
	vertices.set(vertexSite.hashCode(), vert);
	// get the sites
	let pfaceSite = currBls.prev.refnode.value;
	let pface = faces.get(pfaceSite.hashCode());
	let cfaceSite = currBls.refnode.value;
	let cface = faces.get(cfaceSite.hashCode());
	let nfaceSite = currBls.next.refnode.value;
	let nface = faces.get(nfaceSite.hashCode());
	// get the halfedges between p and c as as well as between c and n
	// pcedge is the edge with p to the left
	let pcedge = halfEdges.get(hashCodeSitePair(pfaceSite, cfaceSite));
	let cpedge = pcedge.twin;
	let cnedge = halfEdges.get(hashCodeSitePair(cfaceSite, nfaceSite));
	let ncedge = cnedge.twin;
	// create new halfedges between n and p, since the c bls has disappeared
	let npedge = new DcelHalfEdge(vert, nface, undefined, undefined);
	let pnedge = new DcelHalfEdge(undefined, pface, npedge, undefined);
	npedge.twin = pnedge;
	// enter edges into map
	halfEdges.set(npedge.hashCode(), npedge);
	halfEdges.set(pnedge.hashCode(), pnedge);
	// connect the edges
	cpedge.next = cnedge;
	ncedge.next = npedge;
	pnedge.next = pcedge;

	pcedge.vertex = cnedge.vertex = npedge.vertex = vert;
	vert.halfEdge = npedge;
}

//////////////////////////////////////////////////////////////////
// drawing stuff
//////////////////////////////////////////////////////////////////
function drawAnimation() {
	if (pqueue.length == 0) {
		initAlgorithm();
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
	for (var v of vertices.values()) {
		drawPoint(v.coord, "yellow", 8);
		let nextV = v.halfEdge.twin.vertex;
		if (nextV) {
			drawLineOnCanvas(v.coord, nextV.coord);
		}

		let currEdge = endMark = v.halfEdge;
		while (currEdge) {
			if (currEdge.next) {
				let v1 = currEdge.vertex;
				let v2 = currEdge.next.vertex;
				drawLineOnCanvas(v1.coord, v2.coord);
			};
			currEdge = currEdge.next;
			if (currEdge && currEdge.next && endMark.id == currEdge.next.id) break;
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
