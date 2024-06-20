/**
 * File: ../src/components/Registered.js
 * Purpose: To restrict access to components (pages) to users that have completed registration.
 *          If the user has not completed registration, then provide the link to the registration page.
 * Date        Dev  Version  Description
 * 2024/04/05  ITA  1.00     Genesis.
 */
import { useContext, useState } from 'react';
import { Navigate, NavLink } from 'react-router-dom';
import { isSignedIn } from '../config/appConfig.js';
import PropTypes from 'prop-types';
import { userContext } from '../hooks/UserProvider.js';
import ErrorAlert from './ErrorAlert.js';

function Registered({children}) {
    const { currentUser } = useContext(userContext);
    const [user, setUser] = useState(()=> {
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
                            <NavLink className='w3-btn w3-round w3-theme-d5' to='/my-profile/account'>Click here to complete registration</NavLink>
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
