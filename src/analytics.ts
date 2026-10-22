// Vercel Web Analytics: page views only, no cookies. Skipped on localhost so dev and tests stay offline.
import { inject } from "@vercel/analytics";

if (!["localhost", "127.0.0.1"].includes(location.hostname)) inject();
