import React from 'react'
import MainContainer from './pages/MainContainer';

import { positions, Provider } from "react-alert";
import AlertTemplate from "react-alert-template-basic";

const options = {
  timeout: 5000,
  position: positions.TOP_CENTER
};
const App = () => {
  return (
    <Provider template={AlertTemplate} {...options}>
      <MainContainer />
    </Provider >
  )
}

export default App