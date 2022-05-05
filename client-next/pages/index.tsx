import type { NextPage } from "next";

import { AuthApiReturnData } from "../types/types";
import { fetchData } from "../api/fetchData";

const Home: NextPage<{ pageProps: AuthApiReturnData }> = ({ pageProps }) => {
  return pageProps?.currentUser ? <h1>signed in</h1> : <h1>signed out</h1>;
};

Home.getInitialProps = async (context) => {
  const { req } = context;
  const apiUrl =
    // cross namespace communication in kubernetes requires this syntax to reach a pod in another namespace.
    // We are trying to reach ingress-nginx-controller service in ingress-nginx namespace from our next.js service pod which is defined in default namespace.
    // ingress controller service will direct our request to auth-service
    "http://ingress-nginx-controller.ingress-nginx.svc.cluster.local/api/users/currentuser";

  const response = await fetchData<AuthApiReturnData>(
    apiUrl,
    "GET",
    undefined,
    req?.headers.cookie
  );
  // Pass data to the page via props
  console.log("indexpage", response);
  return { pageProps: { ...response } };
};
export default Home;
