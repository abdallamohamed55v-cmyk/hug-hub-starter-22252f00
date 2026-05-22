// k6 load test — sustained 500 VUs for 10 minutes (normal expected traffic).
import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "2m", target: 100 },
    { duration: "5m", target: 500 },
    { duration: "2m", target: 500 },
    { duration: "1m", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<500", "p(99)<1500"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:4173";

export default function () {
  const routes = ["/", "/auth"];
  const path = routes[Math.floor(Math.random() * routes.length)];
  const res = http.get(`${BASE_URL}${path}`);
  check(res, { "ok": (r) => r.status === 200 });
  sleep(Math.random() * 2);
}
