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
