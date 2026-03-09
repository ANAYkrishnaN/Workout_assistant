import "@/styles/globals.css";
import { Bounce, ToastContainer } from "react-toastify";
import { LoadingProvider } from "@/context/LoadingContext";
import GlobalLoader from "@/components/ui/GlobalLoader";

export default function App({ Component, pageProps }) {
  return (
    <LoadingProvider>
      <GlobalLoader />
      <ToastContainer
    position="top-right"
    autoClose={5000}
    hideProgressBar={false}
    newestOnTop={false}
    closeOnClick={false}
    rtl={false}
    pauseOnFocusLoss
    draggable
    pauseOnHover
    theme="light"
    transition={Bounce}
  />
      <Component {...pageProps} />
    </LoadingProvider>
  );
}
