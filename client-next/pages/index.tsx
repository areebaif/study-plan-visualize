import type {
  NextPage,
  GetServerSideProps,
  GetServerSidePropsContext,
} from "next";
import { AuthApiReturnData, AuthDbRow } from "../types/types";

export async function fetchData<T>(
  url: string,
  method: string,
  body?: string,
  cookie?: string
) {
  const isCookie = cookie ? cookie : "";
  const response = await fetch(url, {
    method: method,
    body: body,
    headers: {
      "Content-Type": "application/json",
      cookie: isCookie,
    },
    credentials: "same-origin",
  });
  const contentType = response.headers.get("content-type");
  if (!contentType || !contentType.includes("application/json")) {
    throw new TypeError("something went wrong with the backend request");
  }
  const responseObject: T = await response.json();
  return responseObject;
}

const Home: NextPage<{ data: AuthApiReturnData }> = ({ data }) => {
  console.log("hello", data);

  return <h1>Landing Page</h1>;
};

export const getServerSideProps: GetServerSideProps = async (
  context: GetServerSidePropsContext
) => {
  const { req } = context;
  const headers = req.headers;
  console.log(req.headers.cookie);

  const apiUrl =
    // cross namespace communication in kubernetes requires this syntax to reach a pod in another namespace.
    // We are trying to reach ingress-nginx-controller service in ingress-nginx namespace from our next.js service pod which is defined in default namespace.
    // ingress controller service will direct our request to auth-service
    "http://ingress-nginx-controller.ingress-nginx.svc.cluster.local/api/users/currentuser";

  const response = await fetchData<AuthApiReturnData>(
    apiUrl,
    "GET",
    undefined,
    req.headers.cookie
  );
  console.log("response", response);

  console.log("I was executed");
  // Pass data to the page via props
  return { props: { data: response } };
};
export default Home;
