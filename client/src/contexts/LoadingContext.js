import React, { createContext, useState, useContext } from 'react';

const LoadingContext = createContext();

export const useLoading = () => useContext(LoadingContext);

export const LoadingProvider = ({ children }) => {
  // State to track if the initial booking configuration data has been loaded at least once
  const [initialBookingConfigLoaded, setInitialBookingConfigLoaded] = useState(false);

  const value = {
    initialBookingConfigLoaded,
    setInitialBookingConfigLoaded // Function to update the state
  };

  return (
    <LoadingContext.Provider value={value}>
      {children}
    </LoadingContext.Provider>
  );
};

// Default export for convenience if needed elsewhere, though named exports are common
export default LoadingContext; 