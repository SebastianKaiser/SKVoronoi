const SIZE_CANVAS_X = 800;
const SIZE_CANVAS_Y = 800;

let ctx = undefined;

let size        = 1 << 7
let at          = undefined;
let values      = [29,25,29,54,35,65,63,70];
let values2     = [27, 55, 41, 38, 75, 49, 97, 11];
let values3     = [54,80,50,40,1,59,73,90,99,80,25,35,90,70,78,63];
let insertnodes = 1;
let deletenodes = 1;
let timerId     = undefined;

window.onload = function() {
 	init();
 	y = 0;
  timerId = window.setInterval( drawAnimation, 3 );
};

document.getElementById("pause").onclick = function() {
  if( timerId ) {
    pause()
  } else {
    timerId = window.setInterval( drawAnimation, 3 );
  }
}

function pause() {
  window.clearInterval( timerId )
  timerId = undefined;
  document.getElementById("pause").text = "unpause"
}

function init() {
	var canvas = document.getElementById("tree");
	if (typeof canvas === "undefined" || canvas == null) {
		alert("Canvas is undefined " + canvas);
	}
	ctx = canvas.getContext("2d");
  ctx.font = "16px serif";

  createValues();
  drawAnimation()
	return true;
}

function createValues() {
  values = []
  for ( let i = 0; i < size; i += 1 ) {
	 	values[i] = Math.round( Math.random() * 100 );
	}
  at = new AvlTreeNode(values[0]);
  insertnodes = 1;
  deletenodes = 1;
}

/*****************************
Avl Tree
*/

let AvlTreeNode = function(value) {
  this.value  = value;
  this.left   = undefined;
  this.right  = undefined;
  this.height = 0;
}

AvlTreeNode.prototype.balfac = function() {
  return safeHeight(this.left) - safeHeight(this.right);
}

function safeHeight( node )  {
  return ( node == undefined ) ? -1 : node.height;
}

AvlTreeNode.prototype.balanceLeft = function() {
  if( this.left.balfac() > 0 ) {
    // left left
    return this.rotateRight()
  } else if( this.left.balfac() < 0 ) {
    // left right
    this.left = this.left.rotateLeft()
    return this.rotateRight()
  } else {
    console.log(`${this.value} no balancing although .. `)
    pause();
    return this;
  }
}

AvlTreeNode.prototype.balanceRight = function() {
  if( this.right.balfac() > 0 ) {
    // right left
    this.right = this.right.rotateRight()
    return this.rotateLeft()
  } else if( this.right.balfac() < 0 ) {
    // right right
    return this.rotateLeft()
  } else {
    return this;
  }
}

AvlTreeNode.prototype.rotateRight = function() {
	let newTop 		 = this.left;
	this.left  		 = newTop.right;
	newTop.right 	 = this;
  this.height  	 = height( this );
  newTop.height  = height( newTop );
	return newTop;
}

AvlTreeNode.prototype.rotateLeft = function() {
  let newTop     = this.right;
  this.right     = newTop.left;
  newTop.left    = this;
  this.height  	 = height( this );
  newTop.height  = height( newTop );
  return newTop;
}

AvlTreeNode.prototype.getLeftmostLeaf = function () {
  return getExtreme( this,
    function ( node ) { return node.left; },
    function ( parent, node ) {
      parent.left   = node.right;
      parent.height = height(parent);
    }
  );
}

AvlTreeNode.prototype.getRightmostLeaf = function () {
  return getExtreme( this,
    function ( node ) { return node.right; },
    function ( parent, node ) {
      parent.right  = node.left;
      parent.height = height(parent);
    }
  );
}

AvlTreeNode.prototype.insert = function (e) {
  if ( e <= this.value ) {
    this.left  = (this.left) ? this.left.insert( e ) : new AvlTreeNode(e);
  } else if ( e > this.value ) {
    this.right = (this.right) ? this.right.insert( e ) : new AvlTreeNode(e);
  }
  this.height    = Math.max( safeHeight(this.left),
                             safeHeight(this.right)) + 1;
  let retval = this;
  if ( this.balfac() > 1 ) {
    retval = this.balanceLeft();
  } else if ( this.balfac() < -1 ) {
    retval = this.balanceRight();
  }
  return retval;
}

function height( node ) {
	return Math.max( safeHeight(node.left), safeHeight(node.right)) + 1;
}

function balanceNodeDelete( node ) {
  let retval = node;
  if ( !node.left && !node.right) return node;
  if ( node.balfac() < 2 && node.balfac() > -2 ) return node;
  let y = (safeHeight( node.left ) > safeHeight(node.right)) ? node.left : node.right;
  let x = (safeHeight( y.left )    > safeHeight(y.right)) ? y.left : y.right;
  if ( y == node.left && x == y.left ) {
    retval = node.rotateRight();
  } else if( y == node.left && x == y.right ) {
    node.left  = y.rotateLeft()
    retval     = node.rotateRight();
  } else if( y == node.right && x == y.right ) {
    retval     = node.rotateLeft();
  } else if( y == node.right && x == y.left ) {
    node.right = y.rotateRight()
    retval     = node.rotateLeft();
  }
  return retval;
}


// delete a node
function deleteNode( toDelete, curr ) {
  if ( !curr ) return undefined;
  if ( toDelete < curr.value ) {
    // value is smaller => left
    curr.left    = deleteNode( toDelete, curr.left );
    curr.height  = height(curr);
    return balanceNodeDelete (curr);
  } else if ( toDelete > curr.value ) {
    // value is bigger => right
    curr.right   = deleteNode( toDelete, curr.right );
    curr.height  = height(curr);
    return balanceNodeDelete (curr);
  } else if ( toDelete == curr.value ) {
    // found the desired node => delete it
    let newNode = undefined;
    if ( !curr.left && !curr.right ) {
      // the node is a leaf, just delete it
      return undefined;
    } else if ( ! curr.right ) {
      newNode        = curr.left.getRightmostLeaf();
      newNode.right  = curr.right;
			if( newNode    != curr.left ) {
				newNode.left = curr.left;
			}
    } else {
      newNode         = curr.right.getLeftmostLeaf();
      newNode.left    = curr.left;
			if( newNode    != curr.right ) {
				newNode.right = curr.right;
			}
    }
    newNode.height = height(newNode);
    return balanceNodeDelete ( newNode );
  } else {
    // value not found
    return curr;
  }
}

// get some left or right- mostest element of a sub tree
function getExtreme( node, accessor, process ) {
  if(!node) return undefined;
  let cursor = node;
  let parent = undefined;
  while (  accessor( cursor ) ) {
    parent = cursor;
    cursor = accessor( cursor );
  }
  if (parent) {
    process(parent, cursor);
  }
  return cursor;
}

function drawAnimation() {
  if (insertnodes < values.length) {
    at = at.insert( values[insertnodes] );
    insertnodes += 1;
    assert("lost a node inserting", countNodes(at) == insertnodes )
  } else if (insertnodes == values.length && deletenodes < values.length) {
    at = deleteNode( values[deletenodes], at);
    assert(`lost nodes deleting ${values[deletenodes]}`,
            countNodes(at) == (values.length - deletenodes) );
    deletenodes += 1;
  } else {
    createValues();
  }
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, SIZE_CANVAS_X, SIZE_CANVAS_Y);
  drawTree(at, {x: 300, y: 30}, 150 );
}

function drawTree(node, cp, step) {
	if( !node ) return;
  if(cp.y > 600) {
    return;
  }
  drawPoint( cp, "green", 4 );
  ctx.fillText(node.balfac(), cp.x + 10, cp.y);
  ctx.fillText(node.height,   cp.x - 10, cp.y);
  ctx.fillText(node.value,    cp.x, cp.y + 20);
  if ( node.left ) {
    let np = { x: cp.x - step, y: cp.y + 30 };
	  drawLineOnCanvas( np, cp, "blue" );
    drawTree ( node.left, np, step / 2 );
  }
  if ( node.right ) {
    let np = { x: cp.x + step, y: cp.y + 30 };
    drawLineOnCanvas( np, cp, "red" );
    drawTree ( node.right, np, step / 2 );
  }
}

function drawPoint(p, col, size = 2) {
	ctx.fillStyle = col;
	ctx.fillRect(p.x, p.y, size, size);
}

function drawLineOnCanvas(p1, p2, col) {
  if ( !p1 || !p2 ) return;
	ctx.beginPath();
	ctx.strokeStyle = col;
	ctx.moveTo(p1.x, p1.y);
	ctx.lineTo(p2.x, p2.y);
	ctx.stroke();
}

function countNodes( node ) {
  if (!node) return 0;
  return countNodes( node.left ) + countNodes( node.right ) + 1;
}

function assert( description ,test ) {
  if ( !test ) throw `${description} ${values}`;
}
