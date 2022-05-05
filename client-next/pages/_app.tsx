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

  // we have to call individual data fetching functions of each page from this component and pass data down as props to those components
  let individualPageProps = {};
  if (appContext.Component.getInitialProps) {
    // NOTE: this step kind of works like magic because behind the scenes
    // When you call appContext.Component.getInitialProps, the result of this function call populates individualPageProps.pageProps
    // despite never making this function call equal to individualPageProps.pageProps
    individualPageProps = await appContext.Component.getInitialProps(
      appContext.ctx
    );
  }
  // This is state management at app level
  const appState = await fetchData<AuthApiReturnData>(
    apiUrl,
    "GET",
    undefined,
    req?.headers.cookie
  );

  // We are doing below to combine app level state with individual page props/state
  // pageProps is the only property through which we can pass data to components.
  // we can not add properties to appProps, it is a type inside typedefination file of nextjs
  appProps.pageProps = { ...individualPageProps, ...appState };

  return { ...appProps };
};

export default MyApp;
