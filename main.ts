// export function add(a: number, b: number): number {
//   return a + b;
// }

// // Learn more at https://docs.deno.com/runtime/manual/examples/module_metadata#concepts
// if (import.meta.main) {
//   console.log("Add 2 + 3 =", add(2, 3));
// }
Deno.serve((_req) => {
  return new Response(JSON.stringify(Deno.env.toObject(), null, 2), {
    headers: { "Content-Type": "application/json" },
  });
});
