import "@/styles/globals.css";
import { Bounce, ToastContainer } from "react-toastify";

export default function App({ Component, pageProps }) {
  return <><ToastContainer
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
  /><Component {...pageProps} /></>;
}
