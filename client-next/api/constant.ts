export const host = process.env.NODE_ENV === "development" ? "localhost" : "";

// cross namespace communication in kubernetes requires this syntax to reach a pod in another namespace.
// Some requests might be issued on server since we are using server side rendering
// We are trying to reach ingress-nginx-controller service in ingress-nginx namespace from our next.js service pod which is defined in default namespace.
export const serverBaseURL =
  "http://ingress-nginx-controller.ingress-nginx.svc.cluster.local";
