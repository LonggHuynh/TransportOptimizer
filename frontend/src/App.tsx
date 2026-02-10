import React from 'react';
import Main from './pages/Main';
import { ToastContainer } from 'react-toastify';

import 'react-toastify/dist/ReactToastify.css';

const App = () => {
    return (
        <>
            <ToastContainer />
            <Main />
        </>
    );
};

export default App;
