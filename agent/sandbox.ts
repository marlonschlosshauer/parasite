import { defineSandbox } from "eve/sandbox";
import { vercel } from "eve/sandbox/vercel";

export default defineSandbox({
  backend: vercel({
    networkPolicy: {
      allow: [
        "github.com",
        "*.github.com",
        "*.githubusercontent.com",
        "registry.npmjs.org",
      ],
      subnets: { deny: ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"] },
    },
  }),
});
