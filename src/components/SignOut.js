import { signOut } from 'firebase/auth';
import { auth } from '../config/appConfig.js';
import { useContext, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { userContext } from '../hooks/UserProvider';

function SignOut() {
  const { userDispatch } = useContext(userContext);

  useEffect(() => {
    signOut(auth);
    userDispatch({type: 'SIGN_USER_OUT'});
  }, [])
  
  return (
    <Navigate to='/signin'/>
  );
}

export default SignOut;
