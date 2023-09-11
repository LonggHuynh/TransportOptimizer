import React from 'react';
import Main from './pages/Main';

import { positions, Provider } from 'react-alert';
import AlertTemplate from 'react-alert-template-basic';

const options = {
    timeout: 5000,
    position: positions.TOP_CENTER,
};

const App = () => {
    return (
        <Provider template={AlertTemplate} {...options}>
            <Main />
        </Provider>
    );
};

export default App;
