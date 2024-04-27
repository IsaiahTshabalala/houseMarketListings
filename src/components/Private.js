/**
 * File: ./src/components/Private.js
 * Purpose: For wrapping a set of related routes for which a sign in is required.
 * ------------------------------------------------------------------------------------------------
 * Date        Dev  Description
 * 2023/07/23  ITA  Genesis.
 */

import { Navigate, Outlet } from 'react-router-dom';
import { isSignedIn } from '../config/appConfig.js';

function Private() {
  
  return ( 
        <div>
        {isSignedIn()?
            <>
                <Outlet/>
            </>
            :
            <>
                <Navigate to='/signin'/>
            </>
        }
        </div>
    );
}

export default Private;
