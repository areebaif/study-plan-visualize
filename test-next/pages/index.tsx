import type { NextPage } from "next";

import { AuthApiReturnData } from "../types/types";
import { fetchData } from "../api/fetchData";
import { serverBaseURL } from "../api/constant";

const Home: NextPage<{ pageProps: AuthApiReturnData }> = ({ pageProps }) => {
  return pageProps?.currentUser ? <h1>signed in</h1> : <h1>signed out</h1>;
};

Home.getInitialProps = async (context) => {
  const { req } = context;
  const api = "/api/users/currentuser";
  // getInitialProps might execute on server on browser depending on how you navigate to the page
  const url = typeof window === "undefined" ? serverBaseURL.concat(api) : api;
  const response = await fetchData<AuthApiReturnData>(
    url,
    "GET",
    undefined,
    req?.headers.cookie
  );
  // Pass data to the page via props
  return { pageProps: { ...response } };
};
export default Home;
