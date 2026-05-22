// k6 smoke test — 1 VU, 1 minute. Sanity check that the app responds.
// Run:  k6 run -e BASE_URL=https://your-app.com load-tests/smoke.js
import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: 1,
  duration: "1m",
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<1000"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:4173";

export default function () {
  const res = http.get(`${BASE_URL}/`);
  check(res, { "status 200": (r) => r.status === 200 });
  sleep(1);
}
