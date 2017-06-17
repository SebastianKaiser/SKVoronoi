// bitset implementation
// constructor
let BitSet = function() {
  this.words = new Array();
  this.max   = Math.MIN_SAFE_INTEGER;
}

if (typeof module !== 'undefined'){
	module.exports = BitSet;
}

// insert element
BitSet.prototype.insert = function(value) {
  let wordno  = Math.trunc(value / 32);
  let bitno   = value % 32;
  if(!this.words[wordno]) {
    this.words[wordno] = 0;
  }
  this.words[wordno] = this.words[wordno] | 1 << bitno;
}

// delete element
BitSet.prototype.delete = function(value) {
  let wordno  = Math.trunc(value / 32);
  let bitno   = value % 32;
  if(!this.words[wordno] || !(this.words[wordno] && 1 << bitno) ) {
    return 0;
  }
  this.words[wordno] = this.words[wordno] &~ (1 << bitno);
}

// union
BitSet.prototype.union = function(other) {
  let retval = new BitSet();
  for (let i in other.words) {
    if(this.words[i]) {
      retval.words[i] = this.words[i] | other.words[i];
    } else {
      retval.words[i] = other.words[i];
    }
  }
  return retval;
}

// intersection
BitSet.prototype.intersection = function(other) {
  let retval = new BitSet();
  for (let i in other.words) {
    if(this.words[i]) {
      retval.words[i] = this.words[i] & other.words[i];
    }
  }
  return retval;
}

// difference
BitSet.prototype.difference = function(other) {
  let retval = new BitSet();
  for (let i in other.words) {
    if(this.words[i]) {
      retval.words[i] = this.words[i] &~ other.words[i];
      if(retval.words[i] == 0) {
        retval.words[i] = undefined;
      }
    }
  }
  return retval;
}

// enumerate
BitSet.prototype.asList = function() {
  let retval = [];
  for(let i in this.words) {
    let offset = i * 32
    for(let j=0; j < 32; j++) {
      if (this.words[i] && (this.words[i] & (1 << j))) {
        retval.push(offset + j);
      }
    }
  }
  return retval;
}

BitSet.prototype.size = function() {
  return this.words.reduce((acc, val) => acc  + calcHammingWeight(val), 0);
}

const m1  = 0x55555555; //binary: 0101...
const m2  = 0x33333333; //binary: 00110011..
const m4  = 0x0f0f0f0f; //binary:  4 zeros,  4 ones ...
const h01 = 0x01010101; //the sum of 256 to the power of 0,1,2,3...
// directly lifted from wikipedia
function calcHammingWeight(word) {
  let x  = word;
  x     -= (x >> 1) & m1;              //put count of each 2 bits into those 2 bits
  x      = (x & m2) + ((x >> 2) & m2); //put count of each 4 bits into those 4 bits
  x      = (x + (x >> 4)) & m4;        //put count of each 8 bits into those 8 bits
  return (x * h01) >> 24;          //returns left 8 bits of x + (x<<8) + (x<<16) + (x<<24) + ...   x -=
}
