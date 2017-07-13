/*****************************
Avl Tree
*/
let avl_node_id = 0;

function safeHeight(node) {
	return (node == undefined) ? -1 : node.height;
}

// process this node
// rel == -1 => value < this.value
// rel == 1 => value > this.value
// rel == 0 => value == this.value
let defaultprocess = function(newval, rel) {
	if (rel < 0) {
		this.left = new AvlTreeNode(newval, this);
	}
	if (rel > 0) {
		this.right = new AvlTreeNode(newval, this);
	} else {
		// ignore ?
	}
}

let AvlTreeNode = function(value,
	parent,
	sanityCheck = function() {},
	comparator = function(a) {
		return a - this.value;
	},
	proc = defaultprocess) {
	this.value = value;
	this.comp = comparator;
	this.process = proc;
	this.parent = parent;
	this.left = undefined;
	this.right = undefined;
	this.height = 0;
	this.a_id = avl_node_id;
	this.sanityCheck = sanityCheck;
	avl_node_id += 1;
}

if (typeof module !== 'undefined') {
	module.exports = AvlTreeNode;
}

AvlTreeNode.prototype.checkSanity = function() {
	this.sanityCheck();
}

AvlTreeNode.prototype.balfac = function() {
	return safeHeight(this.left) - safeHeight(this.right);
}

AvlTreeNode.prototype.calcHeight = function() {
	let retval = Math.max(safeHeight(this.left), safeHeight(this.right)) + 1;
	this.height = retval;
	return retval;
}

AvlTreeNode.prototype.balanceLeft = function() {
	let retval = undefined;
	if (this.left.balfac() > 0) {
		// left left
		retval = this.rotateRight()
	} else if (this.left.balfac() < 0) {
		// left right
		this.left = this.left.rotateLeft()
		retval = this.rotateRight()
	} else {
		retval = this;
	}
	return retval;
}

AvlTreeNode.prototype.balanceRight = function() {
	let retval = undefined;
	if (this.right.balfac() > 0) {
		// right left
		this.right = this.right.rotateRight();
		retval = this.rotateLeft();
	} else if (this.right.balfac() < 0) {
		// right right
		retval = this.rotateLeft()
	} else {
		retval = this;
	}
	return retval;
}

// balance this subtree after am insert, return the new root
AvlTreeNode.prototype.balanceInsert = function() {
	let retval = this;
	let tbalfac = this.balfac();
	if (tbalfac > 1) {
		retval = this.balanceLeft();
	} else if (tbalfac < -1) {
		retval = this.balanceRight();
	}
	return retval;
}

AvlTreeNode.prototype.balanceNodeDelete = function() {
	let retval = this;
	this.calcHeight();
	if (!this.left && !this.right) return this;
	if (this.balfac() > 1) { // tree is skewed left
		let y = this.left;
		if (y.balfac() <= 0) this.left = y.rotateLeft();
		retval = this.rotateRight();
	} else if (this.balfac() < -1) { // tree is skewed right
		let y = this.right;
		if (y.balfac() >= 0) this.right = y.rotateRight();
		retval = this.rotateLeft();
	}
	retval.updateHeight();
	return retval;
}

AvlTreeNode.prototype.updateHeight = function() {
	let tmp = this.height;
	this.calcHeight();
	let retval = this;
	if (this.height != tmp) {
		if (this.parent) this.parent.updateHeight();
	}
}

// rotate right: swap node with it's left child,
AvlTreeNode.prototype.rotateRight = function() {
	let newTop = this.left;
	this.handleParent(newTop);
	newTop.parent = this.parent;
	this.parent = newTop;
	// make right child of newTop left child of this
	this.left = newTop.right;
	if (this.left) this.left.parent = this;
	newTop.right = this;
	this.updateHeight();
	return newTop;
}

// rotate left: swap this node (being the root of this subtree) with it's right child,
AvlTreeNode.prototype.rotateLeft = function() {
	let newTop = this.right;
	this.handleParent(newTop);
	newTop.parent = this.parent;
	this.parent = newTop;
	// make left child of newTop right child of this
	this.right = newTop.left;
	if (this.right) this.right.parent = this;
	newTop.left = this;
	this.updateHeight();
	return newTop;
}

// handle the parent situation
AvlTreeNode.prototype.handleParent = function(newTop) {
	if (!this.parent) return;
	if (this == this.parent.left) {
		this.parent.left = newTop;
	} else {
		this.parent.right = newTop
	}
	this.parent.updateHeight();
}


// insert
AvlTreeNode.prototype.insert = function(newval) {
	let cv = this.comp(newval);
	if (cv < 0) {
		if (this.left) {
			this.left.insert(newval);
		} else {
			this.process(newval, -1);
		}
	} else if (cv > 0) {
		if (this.right) {
			this.right.insert(newval);
		} else {
			this.process(newval, 1);
		}
	} else if (cv == 0) {
		this.process(newval, 0);
	}
	this.calcHeight();
	let retval = this.balanceInsert();
	// retval.checkSanity();
	return retval;
}

AvlTreeNode.prototype.delete = function(value) {
	let retval = undefined;
	let c = this.comp(value);
	if (c == 0) {
		retval = this.deleteNode();
	} else if (c < 0 && this.left) {
		this.left = this.left.delete(value);
		retval = this.balanceNodeDelete();
	} else if (c > 0 && this.right) {
		this.right = this.right.delete(value);
		retval = this.balanceNodeDelete();
	}
	if (retval) retval.calcHeight();
	return retval;
}

// remove node
AvlTreeNode.prototype.deleteNode = function() {
	// found the desired node => delete it
	let newNode = undefined;
	// choose the node to replace this with
	if (!this.left && !this.right) {
		// the node is a leaf, newNode is undefined
	} else if (!this.right) {
		newNode = this.left;
	} else if (!this.left) {
		newNode = this.right;
	} else { // left and right exist
		// => replace with leftmostest (== smallest valuewise) node of the right subtree
		newNode = this.right.removeLeftmost();
		newNode.left = this.left;
		if (this.left) this.left.parent = newNode;
		// we may have unbalanced the right subtree, rebalance if necessary
		newNode.right = this.right ? this.right.balanceNodeDelete() : undefined;
		if (newNode.right) newNode.right.parent = newNode;
	}
	// rebalance newNode and point newNode to new parent
	if (newNode) {
		newNode.parent = this.parent; // can be undefined
		this.handleParent(newNode);
		newNode = newNode.balanceNodeDelete();
	}
	return newNode;
}

// go down left in this subtree until no lefterer child
// can be found, then remove that node and return it
// if this has no left child, just remove this and
// return it.
AvlTreeNode.prototype.removeLeftmost = function() {
	let curr = this.smallest();
	if (curr == this) { // this is already the leftmost node in this subtree
		if (this.right) this.right.parent = this.parent; // undefined incl.
		this.handleParent(this.right);
	} else { // unlink
		curr.parent.left = curr.right; // might be undefined
		if (curr.right) curr.right.parent = curr.parent;
	}
	// returned node has no children
	curr.right = undefined;
	curr.parent.updateHeight();
	return curr;
}

AvlTreeNode.prototype.findNode =
	function(e, process = function(e, n) {
		return n
	}) {
		let curr = this;
		while (curr) {
			let comp = curr.comp(e);
			if (comp == 0) {
				return process(e, curr);
			} else if (curr.left && comp < 0) {
				curr = curr.left;
			} else if (curr.right && comp > 0) {
				curr = curr.right;
			} else {
				// not found
				return undefined;
			}
		}
		return undefined;
	}

AvlTreeNode.prototype.inorder =
	function(process = function(n) {
		console.log(n.value);
	}) {
		this.left && this.left.inorder(process);
		process(this);
		this.right && this.right.inorder(process);
	}

AvlTreeNode.prototype.inorderValue =
	function(process = function(value) {
		console.log(value);
	}) {
		this.left && this.left.inorderValue(process);
		process(this.value);
		this.right && this.right.inorderValue(process);
	}

// find smallest element in subtree
AvlTreeNode.prototype.smallest = function() {
	let cursor = this;
	while (cursor.left) {
		cursor = cursor.left;
	}
	return cursor;
}

// find biggest element in subtree
AvlTreeNode.prototype.biggest = function() {
	let cursor = this;
	while (cursor.right) {
		cursor = cursor.right;
	}
	return cursor;
}

AvlTreeNode.prototype.root = function() {
	let cursor = this;
	while (cursor.parent) {
		cursor = cursor.parent;
	}
	return cursor;
}


function drawTree(node, cp, step, canvas) {
	if (!node) return;
	if (cp.y > 600) {
		return;
	}
	drawPoint(cp, "green", 4, canvas);
	canvas.fillStyle = "black";
	canvas.fillText(node.balfac(), cp.x + 10, cp.y);
	canvas.fillText(node.height, cp.x - 10, cp.y);
	canvas.fillText(node.value, cp.x, cp.y + 20);
	if (node.left) {
		let np = {
			x: cp.x - step,
			y: cp.y + 30
		};
		drawLineOnCanvas(np, cp, "blue", canvas);
		drawTree(node.left, np, step / 2, canvas);
	}
	if (node.right) {
		let np = {
			x: cp.x + step,
			y: cp.y + 30
		};
		drawLineOnCanvas(np, cp, "red", canvas);
		drawTree(node.right, np, step / 2, canvas);
	}
}

function drawPoint(p, col, size = 2, canvas) {
	canvas.fillStyle = col;
	canvas.fillRect(p.x, p.y, size, size);
}

function drawLineOnCanvas(p1, p2, col, canvas) {
	if (!p1 || !p2) return;
	canvas.beginPath();
	canvas.strokeStyle = col;
	canvas.moveTo(p1.x, p1.y);
	canvas.lineTo(p2.x, p2.y);
	canvas.stroke();
}
