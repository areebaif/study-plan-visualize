import type {
  NextPage,
  GetServerSideProps,
  GetServerSidePropsContext,
} from "next";

import { AuthApiReturnData } from "../types/types";
import { fetchData } from "../api/fetchData";

const Home: NextPage<{ data: AuthApiReturnData }> = ({ data }) => {
  console.log("hello", data);

  return data.currentUser ? <h1>signed in</h1> : <h1>signed out</h1>;
};

export const getServerSideProps: GetServerSideProps = async (
  context: GetServerSidePropsContext
) => {
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
    req.headers.cookie
  );

  // Pass data to the page via props
  return { props: { data: response } };
};
export default Home;
