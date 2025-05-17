import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import "./output.css";
import { Toaster } from "sonner";

const root = ReactDOM.createRoot(document.getElementById('root')!);

root.render(
  <BrowserRouter>
    <Toaster position="bottom-right" className="z-20" />
    <App />
  </BrowserRouter>
);
