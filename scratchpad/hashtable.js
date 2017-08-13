let Brumpf = function(x, y) {
  return {
    x: x,
    y: y,
    toString: function() {
      return `{${this.x}, ${this.y}}`
    }
  };
}

let a = Brumpf(1, 2);
let b = Brumpf(2, 1);
console.log(a, b);

let z = {};
z[a] = "umpf";
z[b] = "fpmu"



console.log(z);
