/**File: ./src/components/SignOut.js
 * Description: Facilitate user log out of the web application.
 * Date        Dev   Version  Description
 * 2023/12/10  ITA   1.00     Genesis.
 * 2024/10/10  ITA   1.02     Remove sign-out dispatch action here. They are automatically handled by the top-most CurrentUserState component.
 */
import { signOut } from 'firebase/auth';
import { auth } from '../config/appConfig.js';
import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';

function SignOut() {

  useEffect(() => {
    signOut(auth);
  }, [])
  
  return (
    <Navigate to='/signin'/>
  );
}

export default SignOut;
