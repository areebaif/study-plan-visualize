import App from "next/app";
import { AppProps, AppInitialProps, AppContext } from "next/app";
import { AuthApiReturnData } from "../types/types";
import { fetchData } from "../api/fetchData";

const MyApp = ({ Component, pageProps }: AppProps) => {
  console.log("inside app", pageProps);
  return (
    <div>
      <h1>header</h1>
      <Component {...pageProps} />
    </div>
  );
};

MyApp.getInitialProps = async (appContext: AppContext) => {
  const { req } = appContext.ctx;
  const apiUrl =
    // cross namespace communication in kubernetes requires this syntax to reach a pod in another namespace.
    // We are trying to reach ingress-nginx-controller service in ingress-nginx namespace from our next.js service pod which is defined in default namespace.
    "http://ingress-nginx-controller.ingress-nginx.svc.cluster.local/api/users/currentuser";

  const appProps: AppInitialProps = { pageProps: {} };
  // await App.getInitialProps(appContext) fills individual pageProps.
  // so if we are in homepage. Homepage getInitialProps will be called and this will fill appProps.pageProps
  // which is the same pageprops you see above.
  const individualPageProps = await App.getInitialProps(appContext);
  console.log("ind", individualPageProps);
  // This is statemanagement at app level
  const appState = await fetchData<AuthApiReturnData>(
    apiUrl,
    "GET",
    undefined,
    req?.headers.cookie
  );

  // We are doing below to combine app level state with individual page props/state
  appProps.pageProps = { ...individualPageProps, ...appState };

  return { ...appProps };
};

export default MyApp;
