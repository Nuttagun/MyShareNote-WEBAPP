import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AuthForm from './page/authFrom';
import Home from './page/home';
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/auth" element={<AuthForm />} />
      </Routes>
    </Router>
  );
}

export default App;
