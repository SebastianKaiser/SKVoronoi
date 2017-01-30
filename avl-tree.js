const SIZE_CANVAS_X = 800;
const SIZE_CANVAS_Y = 800;

let ctx = undefined;

let size        = 1 << 6
let at          = undefined;
let values      = [62,54,2,14,18,50,92,26];
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

/*****************************
Avl Tree
*/

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

function safeHeight( node )  {
  return ( node == undefined ) ? -1 : node.height;
}

let AvlTreeNode = function(value) {
  this.value  = value;
  this.left   = undefined;
  this.right  = undefined;
  this.height = 0;
}

AvlTreeNode.prototype.balfac = function() {
  return safeHeight(this.left) - safeHeight(this.right);
}

AvlTreeNode.prototype.calcHeight = function() {
  return Math.max( safeHeight(this.left), safeHeight(this.right)) + 1
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
  this.height  	 = this.calcHeight();
  newTop.height  = newTop.calcHeight();
	return newTop;
}

AvlTreeNode.prototype.rotateLeft = function() {
  let newTop     = this.right;
  this.right     = newTop.left;
  newTop.left    = this;
  this.height  	 = this.calcHeight();
  newTop.height  = newTop.calcHeight();
  return newTop;
}

AvlTreeNode.prototype.getLeftmostLeaf = function () {
  return getExtreme( this,
    function ( node ) { return node.left; },
    function ( parent, node ) {
      parent.left   = node.right;
      parent.height = parent.calcHeight();
    }
  );
}

AvlTreeNode.prototype.getRightmostLeaf = function () {
  return getExtreme( this,
    function ( node ) { return node.right; },
    function ( parent, node ) {
      parent.right  = node.left;
      parent.height = parent.calcHeight();
    }
  );
}

AvlTreeNode.prototype.insert = function (e) {
  if ( e <= this.value ) {
    this.left  = (this.left) ? this.left.insert( e ) : new AvlTreeNode(e);
  } else if ( e > this.value ) {
    this.right = (this.right) ? this.right.insert( e ) : new AvlTreeNode(e);
  }
  this.height = this.calcHeight( this );
  let retval = this;
  if ( this.balfac() > 1 ) {
    retval = this.balanceLeft();
  } else if ( this.balfac() < -1 ) {
    retval = this.balanceRight();
  }
  return retval;
}

AvlTreeNode.prototype.deleteNode = function (toDelete) {
  let retval = this;
  if ( toDelete < this.value ) {
    // value is smaller => left
    this.left    = this.left.deleteNode( toDelete );
  } else if ( toDelete > this.value ) {
    // value is bigger => right
    this.right   = this.right.deleteNode( toDelete );
  } else if ( toDelete == this.value ) {
    // found the desired node => delete it
    let newNode = undefined;
    if ( !this.left && !this.right ) {
      // the node is a leaf, just delete it
      return undefined;
    } else if ( ! this.right ) {
      newNode        = this.left.getRightmostLeaf();
      newNode.right  = this.right;
      if( newNode    != this.left ) {
        newNode.left = this.left;
      }
    } else {
      newNode         = this.right.getLeftmostLeaf();
      newNode.left    = this.left;
      if( newNode    != this.right ) {
        newNode.right = this.right;
      }
    }
    retval = newNode;
  }
  retval.height = retval.calcHeight( retval );
  return retval.balanceNodeDelete();
}

AvlTreeNode.prototype.balanceNodeDelete = function() {
  let retval = this;
  if ( !this.left && !this.right) return this;
  if ( this.balfac() < 2 && this.balfac() > -2 ) return this;
  let y = (safeHeight( this.left ) > safeHeight(this.right)) ? this.left : this.right;
  let x = (safeHeight( y.left )    > safeHeight(y.right)) ? y.left : y.right;
  if ( y == this.left && x == y.left ) {
    retval = this.rotateRight();
  } else if( y == this.left && x == y.right ) {
    this.left  = y.rotateLeft()
    retval     = this.rotateRight();
  } else if( y == this.right && x == y.right ) {
    retval     = this.rotateLeft();
  } else if( y == this.right && x == y.left ) {
    this.right = y.rotateRight()
    retval     = this.rotateLeft();
  }
  return retval;
}
/****************************************************
graphics
*/

function drawAnimation() {
  if (insertnodes < values.length) {
    at = at.insert( values[insertnodes] );
    insertnodes += 1;
    assert("lost a node inserting", countNodes( at, 0 ) == insertnodes )
  } else if (insertnodes == values.length && deletenodes < values.length) {
    at = at.deleteNode( values[deletenodes]);
    assert(`lost nodes deleting ${values[deletenodes]}`,
            countNodes( at, 0 ) == (values.length - deletenodes) );
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

/****************************************************
 Tests
*/
function createValues() {
  values = []
  for ( let i = 0; i < size; i += 1 ) {
	 	values[i] = Math.round( Math.random() * 100 );
	}
  at = new AvlTreeNode(values[0]);
  insertnodes = 1;
  deletenodes = 1;
}

function countNodes( node, count ) {
  if (!node) return 0;
  if (count > size) throw "Error in structure";
  return countNodes( node.left, count+1 ) + countNodes( node.right, count+1 ) + 1;
}

function assert( description ,test ) {
  if ( !test ) throw `${description} ${values}`;
}
