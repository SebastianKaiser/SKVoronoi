const SIZE_CANVAS_X = 800;
const SIZE_CANVAS_Y = 800;

let ctx = undefined;

let size        = 1 << 4;
let at          = undefined;
let insertnodes = 1;
let deletenodes = 1;
let timerId     = undefined;

window.onload = function() {
 	init();
 	y = 0;
  timerId = undefined;
};

document.getElementById("pause").onclick = function() {
  if( timerId ) {
    pause()
  } else {
    timerId = window.setInterval( drawAnimation, 3 );
  }
}

document.getElementById("step").onclick = function() {
  drawAnimation();
  if(!timerId) {
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
    $('#info').text(`inserting ${values[insertnodes]}`);
    at = at.insert( values[insertnodes] );
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, SIZE_CANVAS_X, SIZE_CANVAS_Y);
    drawTree(at, {x: 300, y: 30}, 150 );
    at.testSanity()
    insertnodes += 1;
    assert("lost a node inserting", countNodes( at, 0 ) == insertnodes );
  } else if (insertnodes == values.length && deletenodes < values.length - 1) {
    $('#info').text(`deleting ${values[deletenodes]}`);
    at = at.deleteValue(values[deletenodes]);
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, SIZE_CANVAS_X, SIZE_CANVAS_Y);
    drawTree(at, {x: 300, y: 30}, 150 );
    at.testSanity()
    deletenodes += 1;
  } else {
    createValues();
  }
}

/****************************************************
* Tests
*/
function createValues() {
  values = [];
  // values = [62,54,2,14,18,50,92,26];
  // values = [27, 55, 41, 38, 75, 49, 97, 11];
  // values = [54,80,50,40,1,59,73,90,99,80,25,35,90,70,78,63];
	// values = [831, 972, 988, 467];
  // values = [342, 478, 858, 817]
	// values = [ 447, 116, 811, 332]
	// values = [212, 108, 456, 497];
  // values = [974, 685, 896, 774, 348, 681, 927, 512]
  // values = [578, 430, 715, 846, 118, 17, 317, 506]
  // values = [570, 483, 795, 321, 405, 886, 419, 920]
  // values = [87, 557, 291, 5, 211, 554, 892, 266, 757, 766, 60, 257, 86, 985, 34, 101];
  // values = [788, 467, 238, 977, 96, 206, 519, 354, 812, 621, 771, 100, 469, 385, 963, 506];
  // values = [867, 869, 657, 703, 512, 198, 684, 574, 652, 268, 53, 897, 580, 180, 992, 339];
  // values = [74, 439, 493, 307, 564, 762, 588, 51, 131, 993, 460, 657, 647, 727, 236, 503]
  values = [27, 720, 258, 276, 543, 81, 864, 347, 722, 889, 383, 65, 382, 551, 461, 758]; 
  let keys = [];
	let MAX_VAL = 1000;
  if ( values.length == 0 ) {
    for ( let i = 0; i < size; i += 1 ) {
     	values[i] = Math.round( Math.random() * MAX_VAL );
    	while (keys.hasOwnProperty(values[i])) {
    	 	values[i] = Math.round( Math.random() * MAX_VAL );
    	}
    	keys[values[i]] = true;
  	}
  }
  console.log(values);
  at = new AvlTreeNode(values[0]);
  insertnodes = 1;
  deletenodes = 0;
	// console.log(values);
}

function depthTest(node) {
	if(!node) return 0;
	return 1 + Math.max(depthTest(node.left), depthTest(node.right));
}

function countNodes( node, count ) {
  if (!node) return 0;
  if (count > size) throw "Error in structure";
  return countNodes( node.left, count + 1 ) + countNodes( node.right, count + 1 ) + 1;
}

function assert( description, test ) {
  if ( !test ) {
		throw `${description} ${values}`;
	}
}
