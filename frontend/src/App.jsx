import Router from "./routes";
import { Toaster } from "react-hot-toast";

const App = ()=> {
    return(
        <>
         <Toaster position="top-center" reverseOrder={false} />
         <Router />
        </>
    )
}

export default App;