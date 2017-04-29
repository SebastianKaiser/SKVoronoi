// javascript:/*****************************Avl%20Tree*/function%20getExtreme(%20node,%20accessor,%20process%20)%20{if(!node)%20return%20undefined;let%20cursor%20=%20node;let%20parent%20=%20undefined;while%20(%20accessor(%20cursor%20)%20)%20{parent%20=%20cursor;cursor%20=%20accessor(%20cursor%20);}if%20(parent)%20{process(parent,%20cursor);}return%20cursor;}function%20safeHeight(%20node%20)%20{return%20(%20node%20==%20undefined%20)%20?%20-1%20:%20node.height;}let%20AvlTreeNode%20=%20function(%20value,parent,comparator%20=%20function(a)%20{%20return%20a%20-%20this.value%20})%20{this.value%20=%20value;this.comp%20=%20comparator;this.parent%20=%20parent;this.left%20=%20undefined;this.right%20=%20undefined;this.height%20=%200;}AvlTreeNode.prototype.balfac%20=%20function()%20{return%20safeHeight(this.left)%20-%20safeHeight(this.right);}AvlTreeNode.prototype.calcHeight%20=%20function()%20{return%20Math.max(%20safeHeight(this.left),%20safeHeight(this.right))%20+%201}AvlTreeNode.prototype.balanceLeft%20=%20function()%20{if(%20this.left.balfac()%20>%200%20)%20{return%20this.rotateRight()}%20else%20if(%20this.left.balfac()%20<%200%20)%20{this.left%20=%20this.left.rotateLeft()return%20this.rotateRight()}%20else%20{console.log(`${this.value}%20no%20balancing%20although%20..%20`)pause();return%20this;}}AvlTreeNode.prototype.balanceRight%20=%20function()%20{if(%20this.right.balfac()%20>%200%20)%20{this.right%20=%20this.right.rotateRight()return%20this.rotateLeft()}%20else%20if(%20this.right.balfac()%20<%200%20)%20{return%20this.rotateLeft()}%20else%20{return%20this;}}AvlTreeNode.prototype.rotateRight%20=%20function()%20{let%20newTop%20=%20this.left;this.left%20=%20newTop.right;newTop.right%20=%20this;return%20this.parentAndHeight(newTop);}AvlTreeNode.prototype.rotateLeft%20=%20function()%20{let%20newTop%20=%20this.right;this.right%20=%20newTop.left;newTop.left%20=%20this;return%20this.parentAndHeight(newTop);}//AvlTreeNode.prototype.parentAndHeight%20=%20function(newTop)%20{newTop.parent%20=%20this.parent;this.parent%20=%20newTop;this.height%20=%20this.calcHeight();newTop.height%20=%20newTop.calcHeight();return%20newTop;}AvlTreeNode.prototype.removeLeftmostLeaf%20=%20function%20()%20{return%20getExtreme(%20this,function%20(%20node%20)%20{%20return%20node.left;%20},function%20(%20parent,%20node%20)%20{parent.left%20=%20node.right;if(node.right)%20node.right.parent%20=%20parent;parent.height%20=%20parent.calcHeight();});}AvlTreeNode.prototype.removeRightmostLeaf%20=%20function%20()%20{return%20getExtreme(%20this,function%20(%20node%20)%20{%20return%20node.right;%20},function%20(%20parent,%20node%20)%20{parent.right%20=%20node.left;if(node.left)%20node.left.parent%20=%20parent;parent.height%20=%20parent.calcHeight();});}let%20defaultprocess%20=%20function%20(%20newval,%20rel)%20{if(rel%20==%200)%20{this.left%20=%20this.left%20?%20this.left.insert(%20newval%20)%20:new%20AvlTreeNode(%20newval,%20this,%20this.comparator%20);}%20else%20{return%20new%20AvlTreeNode(%20newval,%20this,%20this.comparator%20);}}AvlTreeNode.prototype.insert%20=%20function%20(%20newval,%20process%20=%20defaultprocess%20)%20{if%20(%20this.comp(%20newval%20)%20<%200%20)%20{this.left%20=%20this.left%20?%20this.left.insert(%20newval%20)%20:%20process(%20newval,%20-1%20);}%20else%20if%20(%20this.comp%20(%20newval%20)%20>%200%20)%20{this.right%20=%20this.right%20?%20this.right.insert(%20newval%20)%20:%20process(%20newval,%201%20);}%20else%20if%20(%20this.comp(%20newval%20)%20==%200%20)%20{process(%20newval,%200%20);}this.height%20=%20this.calcHeight(%20this%20);return%20this.balance();}AvlTreeNode.prototype.balance%20=%20function()%20{let%20retval%20=%20this;if%20(%20this.balfac()%20>%201%20)%20{retval%20=%20this.balanceLeft();}%20else%20if%20(%20this.balfac()%20<%20-1%20)%20{retval%20=%20this.balanceRight();}return%20retval;}AvlTreeNode.prototype.deleteNode%20=%20function%20(toDelete)%20{let%20retval%20=%20this;if%20(%20this.comp%20(toDelete)%20<%200%20)%20{this.left%20=%20this.left%20?%20this.left.deleteNode(%20toDelete%20)%20:%20undefined;}%20else%20if%20(%20this.comp%20(toDelete)%20>%200%20)%20{this.right%20=%20this.right%20?%20this.right.deleteNode(%20toDelete%20)%20:%20undefined;}%20else%20if%20(%20this.comp%20(toDelete)%20==%200%20)%20{let%20newNode%20=%20undefined;if%20(%20!this.left%20&&%20!this.right%20)%20{return%20undefined;}%20else%20if%20(%20!%20this.right%20)%20{newNode%20=%20this.left.removeRightmostLeaf();newNode.right%20=%20this.right;if(%20newNode%20!=%20this.left%20)%20{newNode.left%20=%20this.left;}}%20else%20{newNode%20=%20this.right.removeLeftmostLeaf();newNode.left%20=%20this.left;if(%20newNode%20!=%20this.right%20)%20{newNode.right%20=%20this.right;}}newNode.parent%20=%20this.parent;retval%20=%20newNode;}retval.height%20=%20retval.calcHeight(%20retval%20);return%20retval.balanceNodeDelete();}AvlTreeNode.prototype.balanceNodeDelete%20=%20function()%20{let%20retval%20=%20this;if%20(%20!this.left%20&&%20!this.right)%20return%20this;if%20(%20this.balfac()%20<%202%20&&%20this.balfac()%20>%20-2%20)%20return%20this;let%20y%20=%20(safeHeight(%20this.left%20)%20>%20safeHeight(this.right))%20?this.left%20:%20this.right;let%20x%20=%20(safeHeight(%20y.left%20)%20>%20safeHeight(y.right))%20?y.left%20:%20y.right;if%20(%20y%20==%20this.left%20&&%20x%20==%20y.left%20)%20{retval%20=%20this.rotateRight();}%20else%20if(%20y%20==%20this.left%20&&%20x%20==%20y.right%20)%20{this.left%20=%20y.rotateLeft()retval%20=%20this.rotateRight();}%20else%20if(%20y%20==%20this.right%20&&%20x%20==%20y.right%20)%20{retval%20=%20this.rotateLeft();}%20else%20if(%20y%20==%20this.right%20&&%20x%20==%20y.left%20)%20{this.right%20=%20y.rotateRight()retval%20=%20this.rotateLeft();}return%20retval;}AvlTreeNode.prototype.findNode%20=function(e,%20process%20=%20function(e,%20n)%20{%20return%20n})%20{if(%20this.comp(%20e%20)%20==%200%20)%20{return%20process(e,%20this);}%20else%20if(%20this.left%20&&%20this.comp(%20e%20)%20<%200%20)%20{return%20this.left.findNode(%20e%20);}%20else%20if(%20this.right%20&&%20this.comp(%20e%20)%20>%200%20)%20{return%20this.right.findNode(%20e%20);}%20else%20{return%20undefined;}}function%20drawTree(node,%20cp,%20step)%20{if(%20!node%20)%20return;if(cp.y%20>%20600)%20{return;}drawPoint(%20cp,%20%22green%22,%204%20);ctx.fillText(node.balfac(),%20cp.x%20+%2010,%20cp.y);ctx.fillText(node.height,%20cp.x%20-%2010,%20cp.y);ctx.fillText(node.value,%20cp.x,%20cp.y%20+%2020);if%20(%20node.left%20)%20{let%20np%20=%20{%20x:%20cp.x%20-%20step,%20y:%20cp.y%20+%2030%20};drawLineOnCanvas(%20np,%20cp,%20%22blue%22%20);drawTree%20(%20node.left,%20np,%20step%20/%202%20);}if%20(%20node.right%20)%20{let%20np%20=%20{%20x:%20cp.x%20+%20step,%20y:%20cp.y%20+%2030%20};drawLineOnCanvas(%20np,%20cp,%20%22red%22%20);drawTree%20(%20node.right,%20np,%20step%20/%202%20);}}function%20drawPoint(p,%20col,%20size%20=%202)%20{ctx.fillStyle%20=%20col;ctx.fillRect(p.x,%20p.y,%20size,%20size);}function%20drawLineOnCanvas(p1,%20p2,%20col)%20{if%20(%20!p1%20||%20!p2%20)%20return;ctx.beginPath();ctx.strokeStyle%20=%20col;ctx.moveTo(p1.x,%20p1.y);ctx.lineTo(p2.x,%20p2.y);ctx.stroke();}
/*****************************
Avl Tree
*/

let avl_node_id = 0;

// get some left or right- mostest element of a sub tree
function getExtreme(node, accessor,
                    process = function(p,c) { return c; }) {
	if (!node) return undefined;
	let cursor = node;
	let parent = undefined;
	while (accessor(cursor)) {
		parent = cursor;
		cursor = accessor(cursor);
	}
	process(parent, cursor);
	return cursor;
}

function safeHeight(node) {
	return (node == undefined) ? -1 : node.height;
}

let defaultprocess = function(newval, rel) {
	if (rel == 0) {
		this.left = this.left ? this.left.insert(newval) :
			new AvlTreeNode(newval, this, this.comparator, this.process);
	} else {
		return new AvlTreeNode(newval, this, this.comparator, this.process);
	}
}

let AvlTreeNode = function(value,
	parent,
	comparator = function(a) {
		return a - this.value
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

AvlTreeNode.prototype.balfac = function() {
	return safeHeight(this.left) - safeHeight(this.right);
}

AvlTreeNode.prototype.calcHeight = function() {
	return Math.max(safeHeight(this.left), safeHeight(this.right)) + 1
}

AvlTreeNode.prototype.balanceLeft = function() {
	if (this.left.balfac() > 0) {
		// left left
		return this.rotateRight()
	} else if (this.left.balfac() < 0) {
		// left right
		this.left = this.left.rotateLeft()
		return this.rotateRight()
	} else {
		return this;
	}
}

AvlTreeNode.prototype.balanceRight = function() {
	if (this.right.balfac() > 0) {
		// right left
		this.right = this.right.rotateRight()
		return this.rotateLeft()
	} else if (this.right.balfac() < 0) {
		// right right
		return this.rotateLeft()
	} else {
		return this;
	}
}

// rotate right: swap node with it's left child,
// make node right child
AvlTreeNode.prototype.rotateRight = function() {
	let newTop = this.left;
	this.left = newTop.right;
	newTop.right = this;
	return this.parentAndHeight(newTop);
}

// rotate right: swap node with it's right child,
// make node left child
AvlTreeNode.prototype.rotateLeft = function() {
	let newTop = this.right;
	this.right = newTop.left;
	newTop.left = this;
	return this.parentAndHeight(newTop);
}

//
AvlTreeNode.prototype.parentAndHeight = function(newTop) {
	newTop.parent = this.parent;
	this.parent = newTop;
	this.height = this.calcHeight();
	newTop.height = newTop.calcHeight();
	return newTop;
}

AvlTreeNode.prototype.removeLeftmostLeaf = function() {
	return getExtreme(this,
		function(node) {
			return node.left;
		},
		function(parent, node) {
      if (!parent) return;
			parent.left = node.right;
			if (node.right) node.right.parent = parent;
			parent.height = parent.calcHeight();
		}
	);
}

AvlTreeNode.prototype.removeRightmostLeaf = function() {
	return getExtreme(this,
		function(node) {
			return node.right;
		},
		function(parent, node) {
      if (!parent) return;
			parent.right = node.left;
			if (node.left) node.left.parent = parent;
			parent.height = parent.calcHeight();
		}
	);
}

AvlTreeNode.prototype.insert = function(newval) {
  let cv = this.comp(newval);
	if (cv < 0) {
		this.left = this.left ? this.left.insert(newval) : this.process(newval, -1);
	} else if (cv > 0) {
		this.right = this.right ? this.right.insert(newval) : this.process(newval, 1);
	} else if (cv == 0) {
		this.process(newval, 0);
	}
	this.height = this.calcHeight();
	return this.balance();
}

AvlTreeNode.prototype.balance = function() {
	let retval = this;
	if (this.balfac() > 1) {
		retval = this.balanceLeft();
		console.log("balancing left");
	} else if (this.balfac() < -1) {
		retval = this.balanceRight();
		console.log("balancing right");
	}
	return retval;
}

AvlTreeNode.prototype.deleteNode = function(toDelete) {
	let retval = this;
  let comp = this.comp(toDelete.value);
	if (comp < 0) {
		// value is smaller => left
		this.left = this.left ? this.left.deleteNode(toDelete) : undefined;
	} else if (comp > 0) {
		// value is bigger => right
		this.right = this.right ? this.right.deleteNode(toDelete) : undefined;
	} else if (comp == 0) {
		// found the desired node => delete it
		let newNode = undefined;
		if (!this.left && !this.right) {
			// the node is a leaf, just delete it
			return undefined;
		} else if (!this.right) {
			newNode = this.left.removeRightmostLeaf();
			newNode.right = this.right;
			if (newNode != this.left) {
				newNode.left = this.left;
			}
		} else {
			newNode = this.right.removeLeftmostLeaf();
			newNode.left = this.left;
			if (newNode != this.right) {
				newNode.right = this.right;
			}
		}
		newNode.parent = this.parent;
		retval = newNode;
	}
	retval.height = retval.calcHeight();
	return retval.balanceNodeDelete();
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
    let comp = this.comp(e);
    if (comp == 0) {
			return process(e, this);
		} else if (this.left && comp < 0) {
			return this.left.findNode(e);
		} else if (this.right && comp > 0) {
			return this.right.findNode(e);
		} else {
			return undefined;
		}
	}

AvlTreeNode.prototype.inorder =
  function(process = function (n) {
      console.log(n.value);
  }){
    this.left && this.left.inorder(process);
    process(this);
    this.right && this.right.inorder(process);
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
