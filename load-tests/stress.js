// k6 stress test — ramp up until breakpoint, find when the app degrades.
import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "2m", target: 500 },
    { duration: "3m", target: 1500 },
    { duration: "3m", target: 3000 },
    { duration: "3m", target: 5000 },
    { duration: "2m", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<2000"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:4173";

export default function () {
  const res = http.get(`${BASE_URL}/`);
  check(res, { "ok-ish": (r) => r.status < 500 });
  sleep(0.5);
}
