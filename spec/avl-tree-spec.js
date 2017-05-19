const AvlTreeNode = require('../avl-tree.js');

function newTree() {
	let avlt = newTreeFromValues([0,2,-2,4]);
	expect(avlt.right !== undefined).toBe(true);
	expect(avlt.right.value === 2).toBe(true);
	expect(avlt.left !== undefined).toBe(true);
	expect(avlt.left.value === -2).toBe(true);
	expect(avlt.right !== undefined).toBe(true);
	expect(avlt.right.value === 2).toBe(true);
	expect(avlt.left !== undefined).toBe(true);
	expect(avlt.left.value === -2).toBe(true);
	expect(avlt.right !== undefined).toBe(true);
	expect(avlt.right.value === 2).toBe(true);
	expect(avlt.right.right !== undefined).toBe(true);
	expect(avlt.right.right.value === 4).toBe(true);
	return avlt;
}

function newTreeFromValues( values ) {
	let avlt = undefined;
	values.forEach( v => {
		if(!avlt) {
			avlt = new AvlTreeNode(v, undefined);
		} else {
			avlt = avlt.insert(v);
		}
	});
	return avlt;
}

function inorderList( avlt ) {
	let vallist = '';
  avlt.inorderValue(function(val) {
  	vallist += ` ${val}`;
  });
	return vallist;
}

describe ("Avl-Tree", function() {
  it( "should have a working default comparator", function() {
		let avlt = new AvlTreeNode(0, undefined);
		expect(avlt.comp(-1) == -1).toBe(true);
		expect(avlt.comp(0) == 0).toBe(true);
		expect(avlt.comp(1) == 1).toBe(true);
  });
	it( "should store values in sorted order", function() {
		let avlt = newTree();
		let vallist = '';
	  avlt.inorderValue(function(val) {
	  	vallist += ` ${val}`;
	  });
		expect( vallist == " -2 0 2 4").toBe(true);
	});
	it( "should have a working find method", function() {
		let avlt = newTree();
		expect(avlt.findNode(4).value == 4).toBe(true);
		expect(avlt.findNode(-2).value == -2).toBe(true);
		expect(avlt.findNode(0).value == 0).toBe(true);
		expect(avlt.findNode(2).value == 2).toBe(true);
	});
	it( "should have a working removeNode method", function() {
		let avlt     = newTree();
		inorderList(avlt);
		let toDelete = avlt.findNode(2);
		toDelete.removeNode();
		inorderList(avlt);
		expect(avlt.findNode(2)).not.toBeDefined();
		toDelete = avlt.findNode(-2);
		toDelete.removeNode();
		inorderList(avlt);
		expect(avlt.findNode(-2)).not.toBeDefined();
		toDelete = avlt.findNode(0);
		avlt = toDelete.removeNode(); // 0 ist root
		inorderList(avlt);
		expect(avlt.findNode(0)).not.toBeDefined();
		toDelete = avlt.findNode(4);
		avlt = toDelete.removeNode(); // 4 is now root
		expect(avlt).not.toBeDefined();
	});	
	it( "should have a working deleteValue method", function() {
		let avlt = newTree();
		avlt = avlt.deleteValue(2);
		let vallist = inorderList(avlt);
		expect( vallist == " -2 0 4").toBe(true);
	});
	it( "should have a working removeLeft method, removing the left most node", function() {
		let avlt = newTreeFromValues([831, 972, 988, 467]);
		let removed = avlt.removeLeftmost();
		expect(removed.value == 467).toBe(true);
		expect(avlt.left.left).not.toBeDefined();
	});
	it( "should should return 988 in this case", function() {
		let avlt = newTreeFromValues([831, 972, 988, 467]);
		let removed = avlt.right.removeLeftmost(); // rightmost is 988, which has no kids
		expect(removed.value == 988).toBe(true);
	});
});
