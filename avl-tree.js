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
		this.left  = new AvlTreeNode(newval, this, this.comparator, this.process);
	} if (rel > 0) {
		this.right = new AvlTreeNode(newval, this, this.comparator, this.process);
	} else {
		// ignore ?
	}
}

let AvlTreeNode = function(value,	parent = undefined,
	comparator = function(a) {
		return a - this.value;
	},
  proc = defaultprocess ) {
	this.value   = value;
	this.comp    = comparator;
  this.process = proc;
	this.parent  = parent;
	this.left    = undefined;
	this.right   = undefined;
	this.height  = 0;
  this.a_id    = avl_node_id;
  avl_node_id  += 1;
}

if (typeof module !== 'undefined'){
	module.exports = AvlTreeNode;
}

AvlTreeNode.prototype.balfac = function() {
	return safeHeight(this.left) - safeHeight(this.right);
}

AvlTreeNode.prototype.calcHeight = function() {
	return Math.max(safeHeight(this.left), safeHeight(this.right)) + 1
}

AvlTreeNode.prototype.balanceLeft = function() {
	let retval = undefined;
	if (this.left.balfac() > 0) {
		// left left
		retval =  this.rotateRight()
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

// balance this subtree, return the new root
AvlTreeNode.prototype.balance = function() {
	let retval = this;
	if (this.balfac() > 1) {
		retval = this.balanceLeft();
	} else if (this.balfac() < -1) {
		retval = this.balanceRight();
	}
	return retval;
}

// rotate right: swap node with it's left child,
AvlTreeNode.prototype.rotateRight = function() {
	let newTop 		= this.left;
	this.handleParent(newTop);
	newTop.parent = this.parent;
	this.parent 	= newTop;
	// make right child of newTop left child of this
	this.left 		= newTop.right;
	if(this.left) this.left.parent = this;
	newTop.right 	= this;
	this.height 	= this.calcHeight();
	newTop.height = newTop.calcHeight();
	return newTop;
}

// rotate left: swap this node (being the root of this subtree) with it's right child,
AvlTreeNode.prototype.rotateLeft = function() {
	let newTop 		= this.right;
	this.handleParent(newTop);
	newTop.parent = this.parent;
	this.parent 	= newTop;
	// make left child of newTop right child of this
	this.right 		= newTop.left;
	if(this.right) this.right.parent = this;
	newTop.left 	= this;
	this.height 	= this.calcHeight();
	newTop.height = newTop.calcHeight();
	return newTop;
}

// handle the parent situation
AvlTreeNode.prototype.handleParent = function( newTop ) {
	if(!this.parent) return;
	if (this == this.parent.left) {
		this.parent.left = newTop;
	} else {
		this.parent.right = newTop
	}
}

// go down left in this subtree until no lefterer child
// can be found, then remove that node and return it
// if this has no left child, just remove this and
// return it. returned node has no children.
AvlTreeNode.prototype.removeLeftmost = function() {
  let curr = this.smallest();
  if (curr == this) {
    if( this.right ) this.right.parent = this.parent; // undefined incl.
    this.replaceInParentWith(this.right);
  } else {
    curr.parent.left = curr.right; // might be undefined
    if (curr.right) curr.right.parent = curr.parent;
    curr.parent.height = curr.parent.calcHeight();
  }
	curr.right = undefined;
  return curr;
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
	this.height  = this.calcHeight();
	let retval   = this.balance();
	return retval;
}

AvlTreeNode.prototype.deleteNode = function(toDelete) {
	return toDelete ? toDelete.removeNode() : undefined;
}

AvlTreeNode.prototype.deleteValue = function( value ) {
	let toRemove = this.findNode(value);
	if (!toRemove) return this;
	let replacement = toRemove.removeNode();
	if (this == toRemove) {
		// root for this subtree is removed, return replacement
		return replacement;
	} else {
		return this;
	}
}

// remove node
AvlTreeNode.prototype.removeNode = function() {
	// found the desired node => delete it
	let newNode = undefined;
	// choose the node to replace this with
	if (!this.left && !this.right) {
		// the node is a leaf, newNode is undefined
	} else if (!this.right) {
		newNode = this.left;
	} else if (!this.left) {
		newNode = this.right;
	}	else {
		// replace with leftmostest node of the right subtree
		newNode = this.right.removeLeftmost();
		newNode.right = this.right;
		newNode.left  = this.left;
		if (newNode.left)  newNode.left.parent = newNode;
		if (newNode.right) newNode.right.parent = newNode;
  }
  this.replaceInParentWith(newNode);
	return newNode;
}

// replace this in parent by newNode, might be undefined
AvlTreeNode.prototype.replaceInParentWith = function(newNode) {
  if( this.parent && this == this.parent.left ) {
		this.parent.left = newNode;
	} else if( this.parent && this == this.parent.right) {
		this.parent.right = newNode;
	}
  // point newNode to new parent
	if( newNode ) {
		newNode.parent  = this.parent; // can be undefined
	}
}

AvlTreeNode.prototype.balanceNodeDelete = function() {
	let retval = this;
	if (!this.left && !this.right) return this;
	if (this.balfac() < 2 && this.balfac() > -2) return this;
	let y = (safeHeight(this.left) > safeHeight(this.right)) ?
		this.left : this.right;
	let x = (safeHeight(y.left) > safeHeight(y.right)) ?
		y.left : y.right;
	if (y == this.left && x == y.left) {
		retval = this.rotateRight();
	} else if (y == this.left && x == y.right) {
		this.left = y.rotateLeft()
		retval = this.rotateRight();
	} else if (y == this.right && x == y.right) {
		retval = this.rotateLeft();
	} else if (y == this.right && x == y.left) {
		this.right = y.rotateRight()
		retval = this.rotateLeft();
	}
	return retval;
}

AvlTreeNode.prototype.findNode =
	function(e, process = function(e, n) {
		return n
	}) {
		let curr = this;
		while( curr ) {
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
  function(process = function (n) {
      console.log(n.value);
  }){
    this.left && this.left.inorder(process);
    process(this);
    this.right && this.right.inorder(process);
}

AvlTreeNode.prototype.inorderValue =
  function(process = function ( value ) {
      console.log( value );
  }){
    this.left && this.left.inorderValue( process );
    process( this.value );
    this.right && this.right.inorderValue( process );
}

// find smallest element in subtree
AvlTreeNode.prototype.smallest = function() {
	let cursor = this;
	while( cursor.left ) {
		cursor = cursor.left;
	}
	return cursor;
}

// find biggest element in subtree
AvlTreeNode.prototype.biggest = function() {
	let cursor = this;
	while( cursor.right ) {
		cursor = cursor.right;
	}
	return cursor;
}

AvlTreeNode.prototype.root = function() {
	let cursor = this;
	while( cursor.parent ) {
		cursor = cursor.parent;
	}
	return cursor;
}

/*****************************************
testing && drawing stuff
*****************************************/
AvlTreeNode.prototype.testSanity = function() {
	if( this.left ) {
		if(this  != this.left.parent) {
			throw `tantrum: left child parent inconsistent: this ${this.value}, left parent ${this.left.parent.value}`;
		}
		if(this.left  == this.parent) {
			throw `tantrum: parent and left child identical (wrong!)`;
		}
	}
	if( this.right ) {
		if(this != this.right.parent) {
			throw `tantrum: left child parent inconsistent: this ${this.value}, right parent ${this.right.parent.value}`;
		}
		if(this.right  == this.parent) {
			throw `tantrum: parent and right child identical (wrong!)`;
		}
	}
}

function drawTree(node, cp, step) {
	if (!node) return;
	if (cp.y > 600) {
		return;
	}
	drawPoint(cp, "green", 4);
  ctx.fillStyle = "black";
	ctx.fillText(node.balfac(), cp.x + 10, cp.y);
	ctx.fillText(node.height, cp.x - 10, cp.y);
	ctx.fillText(node.value, cp.x, cp.y + 20);
	if (node.left) {
		let np = {
			x: cp.x - step,
			y: cp.y + 30
		};
		drawLineOnCanvas(np, cp, "blue");
		drawTree(node.left, np, step / 2);
	}
	if (node.right) {
		let np = {
			x: cp.x + step,
			y: cp.y + 30
		};
		drawLineOnCanvas(np, cp, "red");
		drawTree(node.right, np, step / 2);
	}
}

function drawPoint(p, col, size = 2) {
	ctx.fillStyle = col;
	ctx.fillRect(p.x, p.y, size, size);
}

function drawLineOnCanvas(p1, p2, col) {
	if (!p1 || !p2) return;
	ctx.beginPath();
	ctx.strokeStyle = col;
	ctx.moveTo(p1.x, p1.y);
	ctx.lineTo(p2.x, p2.y);
	ctx.stroke();
}
