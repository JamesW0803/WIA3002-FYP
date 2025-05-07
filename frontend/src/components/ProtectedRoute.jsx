import { useAuth } from "../context/AuthContext";
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ( {children , allowedRoles } ) => {
    const { user } = useAuth();

    if( !user ) {
        return <Navigate to="/" replace />
    }
    
    if( allowedRoles && !allowedRoles.includes(user.role)){
        return <Navigate to="/unauthorized" replace />
    }

    return children;

}

export default ProtectedRoute;