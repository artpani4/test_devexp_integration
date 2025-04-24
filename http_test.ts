const BASE_URL = "http://art.localhost:4000";

const tests = [
  { label: "GET request", method: "GET" },
  { label: "POST request with body", method: "POST", body: "ping POST" },
  { label: "PUT request with body", method: "PUT", body: "ping PUT" },
  { label: "PATCH request with body", method: "PATCH", body: "ping PATCH" },
  { label: "DELETE request", method: "DELETE" },
  { label: "OPTIONS request", method: "OPTIONS" },
  { label: "HEAD request", method: "HEAD" },
  { label: "Invalid URL", method: "GET", url: BASE_URL + "/non-existent" },
  { label: "Empty body POST", method: "POST", body: "" },
  {
    label: "No Content-Type",
    method: "POST",
    body: "no content-type",
    noHeaders: true,
  },
];

function makeRequest({
  label,
  method,
  body,
  url = BASE_URL,
  noHeaders = false,
}: {
  label: string;
  method: string;
  body?: string;
  url?: string;
  noHeaders?: boolean;
}) {
  const headers = noHeaders
    ? undefined
    : { "content-type": "text/plain" } as Record<string, string>;
  return fetch(url, {
    method,
    headers,
    body: ["GET", "DELETE", "OPTIONS", "HEAD"].includes(method)
      ? undefined
      : body,
  })
    .then(async (res) => {
      const text = method === "HEAD" ? "" : await res.text();
      console.log(`✅ ${label.padEnd(30)} ➜ ${res.status} — ${text}`);
    })
    .catch((err) => {
      console.error(`❌ ${label.padEnd(30)} ➜ ERROR — ${err}`);
    });
}

// await makeRequest({
//   label: "POST request with body",
//   method: "POST",
//   body: "ping POST",
// });
console.log("▶ Sequential HTTP requests...");
for (const test of tests) {
  await makeRequest(test);
}

console.log("\n▶ Parallel HTTP requests...");
await Promise.all(tests.map(makeRequest));
