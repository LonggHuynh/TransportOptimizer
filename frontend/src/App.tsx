import React from 'react';
import Main from './pages/Main';
import { ToastContainer } from 'react-toastify';

import 'react-toastify/dist/ReactToastify.css';


const App = () => {
    return (
        <>
            <ToastContainer position="top-center" hideProgressBar theme="dark" icon={false}  />
            <Main />
        </>

    );
};

export default App;
