//////////////////////////////////////////////////////////////////
// Initializsation of stuff
//////////////////////////////////////////////////////////////////
let points = new Array();
let y = 0;
let sites = new Array();

// the event queue
let pqueue = new PriorityQueue({
	comparator: (s, r) => {
		let yd = s.y - r.y;
		if (yd == 0) {
			return s.x - r.x;
		}
		return yd;
	}
});

// break point tree
let bpt = undefined;
// pointer to list of beach line segments
let blsFirst = undefined;
// the sweepline
let sweepy = 0;
// Ids for site events
let siteIdCounter = 0;
// Ids for circle events
let circleIdCounter = 0;
// ids for beach line segments
let beachlineSegmentCounter = 0;

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

let DegenParabolaAhk = function(a, h, k) {
	this.a = a;
	this.h = h;
	this.k = k;
}

DegenParabolaAhk.prototype.valuex = function(x) {
	return Infinity;
}

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

// Id counter
let v_id = 0;
let DcelVertex = function(coord, halfEdge) {
	this.id = v_id++;
	this.coord = coord;
	this.halfEdge = halfEdge; // this halfedge has its origin in this
}

//////////////////////////////////////////////////////////////////
// DCEL half-edge
//////////////////////////////////////////////////////////////////

// Id counter
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

// Id counter
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
	if (p instanceof DegenParabolaAhk && op instanceof DegenParabolaAhk) {
		return undefined;
	}
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

// finds the intersections of two parabolas
// in: sites site1 and site2
// return: { l: ipoint1, r: ipoint2 }
function findIntersect(site1, site2, tdir) {
	let p1 = getParabolaFromFokusAndDir(site1, tdir);
	let p2 = getParabolaFromFokusAndDir(site2, tdir);
	return (site1.y > site2.y) ? intersect(p1, p2, tdir) : intersect(p2, p1, tdir)
}

// given to sites site1 and site2, returns the rightmost intersection point (wrt the x-axis) of the
// two parabolas defined by the sites as focus and global tdir as directrix
function chooseRight(site1, site2) {
	let fi = findIntersect(site1, site2, sweepy);
	return (site1.y > site2.y) ? fi.r : fi.l;
}

// calc roots of a quadratic
function rootsOfQuadratic(a, b, c) {
	if (a == 0) {
		return {
			d: b * b,
			l: -c / b,
			r: -c / b
		};
	}
	let discriminant = b * b - 4 * a * c
	let d = Math.sqrt(discriminant);
	let x1 = (-b + d) / (2 * a);
	let x2 = (-b - d) / (2 * a);
	return {
		d: discriminant,
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

// are these 3 sites in clockwise orientation
function orientationClockwise(site1, site2, site3) {
	let area = 0;
	area += site1.x * site2.y - site1.y * site2.x
	area += site2.x * site3.y - site2.y * site3.x
	area += site3.x * site1.y - site3.y * site1.x
	return area > 0;
}

//////////////////////////////////////////////////////////////////
// algorithm
//////////////////////////////////////////////////////////////////
let halfEdges = new Map();
let faces = new Map();
let vertices = new Map();

function initVoronoi(sitesIn) {
	bpt = undefined;
	circleIdCounter = 0;
	stepcntr = 0; // for debugging
	firstBls = undefined;
	halfEdges.clear();
	faces.clear();
	vertices.clear();
	pqueue.clear();
	sites = [];
	for (let i = 0; i < sitesIn.length; i++) {
		sites[i] = new Site(sitesIn[i]);
		pqueue.queue(sites[i]);
	}
}

// comparator function:
// -1 means e is smaller than this.value
// 1 means e is bigger than this.value
// 0 e is (kind of) equal to this.value
let vcomp = function(e) {
	// if (e.y == this.value.y && this.parent == undefined && !this.left & !this.right) {
	// 	sweepy += 1;
	// 	e.y += 1;
	// }
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

if (typeof exports !== 'undefined') {
	exports.intersect = intesect;
}
