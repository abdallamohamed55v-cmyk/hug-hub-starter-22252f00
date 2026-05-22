// k6 spike test — sudden surge from 100 → 10k VUs (viral moment / DDoS-like burst).
import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "30s", target: 100 },
    { duration: "30s", target: 10000 },
    { duration: "1m", target: 10000 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.10"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:4173";

export default function () {
  const res = http.get(`${BASE_URL}/`);
  check(res, { "responded": (r) => r.status > 0 });
  sleep(0.2);
}
