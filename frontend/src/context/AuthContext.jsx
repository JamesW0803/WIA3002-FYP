import { useState, useEffect, createContext, useContext } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [ user, setUser ] = useState(JSON.parse(localStorage.getItem("user")) || null);

    return (
        <AuthContext.Provider value = {{
            user,
            setUser,
        }}>
            { children }
        </AuthContext.Provider>
    )
}

export const useAuth = () => {
    return useContext(AuthContext);
}