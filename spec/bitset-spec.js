const BitSet = require('../bitset.js');

describe("BitSet", function() {
  it("should store small values", function() {
    let b = new BitSet();
    b.insert(4);
    b.insert(8);
    b.insert(7);
    expect(b.asList().includes(4)).toBe(true);
    expect(b.asList().includes(7)).toBe(true);
    expect(b.asList().includes(8)).toBe(true);
  });
  it("should store big values", function() {
    let b = new BitSet();
    b.insert(4300);
    b.insert(80000000);
    b.insert(77882828282);
    expect(b.asList().includes(4300)).toBe(true);
    expect(b.asList().includes(80000000)).toBe(true);
    expect(b.asList().includes(77882828282)).toBe(true);
  });
  it("should allow deletion", function() {
    let b = new BitSet();
    b.insert(6);
    b.insert(3);
    expect(b.asList().includes(3)).toBe(true);
    expect(b.asList().includes(6)).toBe(true);
    b.delete(3);
    expect(b.asList().includes(3)).toBe(false);
    expect(b.asList().includes(6)).toBe(true);
  });
  it("should allow intersection of two sets", function() {
    let b = new BitSet();
    let c = new BitSet();
    b.insert(3);
    b.insert(6);
    c.insert(6);
    c.insert(9);
    b = b.intersection(c);
    expect(b.asList().includes(6)).toBe(true);
    expect(b.asList().includes(3)).toBe(false);
    c = c.intersection(b);
    expect(b.asList().includes(6)).toBe(true);
    expect(b.asList().includes(9)).toBe(false);
  });
  it("should implement the union of two sets", function() {
    let b = new BitSet();
    let c = new BitSet();
    b.insert(3);
    b.insert(6);
    c.insert(6);
    c.insert(9);
    b = b.union(c);
    expect(b.asList().includes(6)).toBe(true);
    expect(b.asList().includes(3)).toBe(true);
    expect(b.asList().includes(9)).toBe(true);
    c = c.union(b);
    expect(c.asList().includes(6)).toBe(true);
    expect(c.asList().includes(3)).toBe(true);
    expect(c.asList().includes(9)).toBe(true);
  });
  it("should implement the difference of two sets", function() {
    let b = new BitSet();
    let c = new BitSet();
    b.insert(3);
    b.insert(6);
    c.insert(6);
    c.insert(9);
    b = b.difference(c);
    expect(b.asList().includes(3)).toBe(true);
    expect(b.asList().includes(6)).toBe(false);
    expect(b.asList().includes(9)).toBe(false);
  });
  it("should return size 1 when having entry 0", function() {
    let b = new BitSet();
    b.insert(0);
    expect(b.size() == 1).toBe(true);
  });
  it("should return size 4 when having 4 entries", function() {
    let b = new BitSet();
    expect(b.size() == 0).toBe(true);
    b.insert(3);
    b.insert(5);
    b.insert(23);
    b.insert(23452);
    expect(b.size() == 4).toBe(true);
  });
  it("should return size x when having x entries", function() {
    let b = new BitSet();
    let no = Math.round(Math.random() * 1000);
    for(let i = 0; i < no; i++) {
      b.insert(i);
    }
    expect(b.size() == no).toBe(true);
  });
  it("should return size x -1 when having two equal values where inserted", function() {
    let b = new BitSet();
    expect(b.size() == 0).toBe(true);
    b.insert(3);
    b.insert(3);
    b.insert(23);
    b.insert(23);
    expect(b.size() == 2).toBe(true);
  });
});
