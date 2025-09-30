import * as React from 'react';
import * as SecureStore from 'expo-secure-store';

// Single, defensive AuthContext implementation.
const AuthContext = React.createContext(null);

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [user, setUser] = React.useState(null);

  React.useEffect(() => {
    let mounted = true;

    const checkAuthStatus = async () => {
      try {
        const token = await SecureStore.getItemAsync('authToken');
        const userData = await SecureStore.getItemAsync('userData');

        if (token) {
          try {
            const res = await fetch('https://gfit-dev.gdinexus.com:8412/api/Member/profile', {
              method: 'GET',
              headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
            });
            if (res.ok) {
              const serverUser = await res.json();
              if (!mounted) return;
              await SecureStore.setItemAsync('userData', JSON.stringify(serverUser));
              setUser(serverUser);
              setIsAuthenticated(true);
            } else if (userData) {
              if (!mounted) return;
              setUser(JSON.parse(userData));
              setIsAuthenticated(true);
            }
          } catch (e) {
            console.log('Error fetching profile during auth check:', e);
            if (userData && mounted) {
              setUser(JSON.parse(userData));
              setIsAuthenticated(true);
            }
          }
        }
      } catch (error) {
        console.log('Error checking auth status:', error);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    checkAuthStatus();
    return () => {
      mounted = false;
    };
  }, []);

  const login = async (userData, token) => {
    try {
      await SecureStore.setItemAsync('authToken', token);
      await SecureStore.setItemAsync('userData', JSON.stringify(userData));

      try {
        const res = await fetch('https://gfit-dev.gdinexus.com:8412/api/Member/profile', {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const serverUser = await res.json();
          await SecureStore.setItemAsync('userData', JSON.stringify(serverUser));
          setUser(serverUser);
        } else {
          setUser(userData);
        }
      } catch (e) {
        console.log('Error fetching profile on login:', e);
        setUser(userData);
      }

      setIsAuthenticated(true);
    } catch (error) {
      console.log('Error saving auth data:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await SecureStore.deleteItemAsync('authToken');
      await SecureStore.deleteItemAsync('userData');
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.log('Error during logout:', error);
    }
  };

  const updateUserProfile = async (updatedData) => {
    try {
      const newUserData = { ...user, ...updatedData };
      await SecureStore.setItemAsync('userData', JSON.stringify(newUserData));
      setUser(newUserData);
    } catch (error) {
      console.log('Error updating user profile:', error);
      throw error;
    }
  };

  const value = React.useMemo(() => ({
    isAuthenticated,
    isLoading,
    user,
    login,
    logout,
    updateUserProfile,
  }), [isAuthenticated, isLoading, user]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
