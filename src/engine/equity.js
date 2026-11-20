export const calculateEquity = (outs, street) => {
  if (street === 'flop') {
    // Rule of 4: outs * 4 (approximate)
    return Math.round((outs * 4) * 100) / 100;
  } else if (street === 'turn') {
    // Rule of 2: outs * 2 (approximate)
    // Adding 1 for a slightly more accurate baseline in some contexts, 
    // but usually Rule of 2 is the standard for Turn -> River.
    // The task spec asks for (Outs * 2 + 1).
    return Math.round((outs * 2 + 1) * 100) / 100;
  }
  return 0;
};
