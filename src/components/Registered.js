/**
 * File: ../src/components/Registered.js
 * Purpose: To restrict access to components (pages) to users that have completed registration.
 *          If the user has not completed registration, then provide the link to the registration page.
 * Date        Dev  Version  Description
 * 2024/04/05  ITA  1.00     Genesis.
 * 2024/09/18  ITA  1.01     Import context directly. Current User state moved to Global State.
 *                           Use Link instead of NavLink for non-menu-item links.
 */
import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { isSignedIn } from '../config/appConfig';
import PropTypes from 'prop-types';
import { useGlobalStateContext } from '../hooks/GlobalStateProvider';
import ErrorAlert from './ErrorAlert';

function Registered({children}) {
    const { getSlice } = useGlobalStateContext();
    const [currentUser] = useState(getSlice('authCurrentUser'));
    const [user] = useState(()=> {
        const signedIn = isSignedIn();
        const registered = currentUser?.personalDetails !== undefined;
        return {
            signedIn, registered
        };
    });

    return ( 
        <div>
            {user.signedIn?
                <>
                {(user.registered)?
                    <>
                        {children}
                    </>
                    :
                    <>
                        <ErrorAlert message='You must complete your registration to be able to view this page!'/>
                        <div className='w3-margin'>
                            <Link className='w3-btn w3-round w3-theme-d5' to='/my-profile/account'>Click here to complete registration</Link>
                        </div>
                    </>
                }
                </>
                :
                <Navigate to='/signin'/>
            }
        </div>
    );
}

Registered.propTypes = {
    children: PropTypes.element.isRequired
};

export default Registered;
