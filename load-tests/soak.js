// k6 soak test — 1000 VUs for 1 hour to catch memory leaks & resource exhaustion.
import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "5m", target: 1000 },
    { duration: "55m", target: 1000 },
    { duration: "5m", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<800"],
  },
};

const BASE_URL = __ENV.BASE_URL || "http://localhost:4173";

export default function () {
  http.get(`${BASE_URL}/`);
  sleep(1);
}
