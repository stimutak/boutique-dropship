import { useSelector } from 'react-redux';

const AuthDebug = () => {
  const auth = useSelector(state => state.auth);
  
  return (
    <div style={{ 
      position: 'fixed', 
      bottom: 20, 
      right: 20, 
      background: 'rgba(0,0,0,0.8)', 
      color: 'white', 
      padding: '10px',
      fontSize: '12px',
      maxWidth: '300px',
      borderRadius: '5px',
      zIndex: 9999
    }}>
      <h4 style={{ margin: '0 0 10px 0' }}>Auth State Debug</h4>
      <pre style={{ margin: 0 }}>
        {JSON.stringify({
          isAuthenticated: auth.isAuthenticated,
          isLoading: auth.isLoading,
          user: auth.user ? {
            email: auth.user.email,
            isAdmin: auth.user.isAdmin,
            firstName: auth.user.firstName
          } : null,
          token: auth.token ? 'EXISTS' : 'NULL'
        }, null, 2)}
      </pre>
    </div>
  );
};

export default AuthDebug;