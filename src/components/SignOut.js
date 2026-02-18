/**File: ./src/components/SignOut.js
 * Description: Facilitate user log out of the web application.
 * Start Date  End Date     Dev   Version  Description
 * 2023/12/10               ITA   1.00     Genesis.
 * 2024/10/10               ITA   1.02     Remove sign-out dispatch action here. They are automatically handled by the top-most CurrentUserState component.
 * 2026/02/17  2026/02/17   ITA   1.03     On sign out, a sign out dispatch function is called to clear the currentUser global state.
 */
import { signOut } from 'firebase/auth';
import { auth } from '../config/appConfig.js';
import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { ActionFunctions, useGlobalStateContext } from '../hooks/GlobalStateProvider.js';

function SignOut() {
  const { dispatchSignOut } = useGlobalStateContext();

  useEffect(() => {
    signOut(auth);
    dispatchSignOut();
  }, [])
  
  return (
    <Navigate to='/signin'/>
  );
}

export default SignOut;
